-- V15 Arabic search: additive RPC; no changes to pricing, catalog, or legacy search functions.
-- Normalize only for matching, never mutate user-visible names or barcodes.
create or replace function public.customer_search_arabic_key_v1(value text)
returns text
language sql immutable parallel safe
set search_path to ''
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(lower(coalesce(value,'')), 'أإآٱىةؤئ', 'اااايهوي'),
      '[ً-ْٰـ]', '', 'g'
    ),
    '[[:punct:][:space:]]+', ' ', 'g'
  ));
$$;

create or replace function public.search_customer_smart_catalog_v1(
  p_branch_id uuid,
  p_search text,
  p_limit integer default 150
)
returns setof jsonb
language plpgsql stable security definer
set search_path to ''
as $function$
declare
  v_inventory_branch uuid;
  v_pricing_branch uuid;
  v_key text;
begin
  if p_branch_id is null then
    raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED';
  end if;
  v_key := public.customer_search_arabic_key_v1(left(coalesce(p_search,''), 120));
  if length(v_key) < 2 then return; end if;

  select s.inventory_branch_id,s.pricing_branch_id
  into v_inventory_branch,v_pricing_branch
  from private.resolve_branch_sources(p_branch_id) s;

  return query
  with ranked as (
    select
      p.id as product_id,
      n.name_key,
      n.variant_key,
      n.maker_key,
      (
        case when coalesce(p.barcode,'') = btrim(p_search)
                  or coalesce(bv.barcode,p.bulk_barcode,'') = btrim(p_search) then 160
             when n.name_key = v_key or n.variant_key = v_key then 120
             when n.name_key like v_key || '%' or n.variant_key like v_key || '%' then 105
             when n.name_key like '%' || v_key || '%' or n.variant_key like '%' || v_key || '%' then 90
             when n.name_key like '%' || replace(v_key,' ','%') || '%'
               or n.variant_key like '%' || replace(v_key,' ','%') || '%' then 80
             when n.maker_key like '%' || v_key || '%' then 62
             else 38 + greatest(
               extensions.similarity(n.name_key,v_key),
               extensions.similarity(n.variant_key,v_key)
             ) * 45
        end
      )::numeric as score
    from public.products p
    left join lateral (
      select pv.name,pv.barcode
      from public.product_variants pv
      where pv.parent_product_id=p.id and pv.active=true
        and coalesce(pv.conversion_factor,0)>1
      order by
        case when nullif(btrim(coalesce(p.bulk_barcode,'')),'') is not null and pv.barcode=p.bulk_barcode then 0 else 1 end,
        case when coalesce(p.bulk_quantity,0)>0 and pv.conversion_factor=p.bulk_quantity then 0 else 1 end,
        pv.position nulls last,pv.id
      limit 1
    ) bv on true
    cross join lateral (
      select
        public.customer_search_arabic_key_v1(p.name) as name_key,
        public.customer_search_arabic_key_v1(coalesce(bv.name,'')) as variant_key,
        public.customer_search_arabic_key_v1(coalesce(p.manufacturer_name,'')) as maker_key
    ) n
    where p.catalog_scope='elmadawy'
      and p.owner_merchant_id is null
      and p.archived_at is null
      and (
        coalesce(p.barcode,'') = btrim(p_search)
        or coalesce(bv.barcode,p.bulk_barcode,'') = btrim(p_search)
        or n.name_key like '%' || v_key || '%'
        or n.variant_key like '%' || v_key || '%'
        or n.name_key like '%' || replace(v_key,' ','%') || '%'
        or n.variant_key like '%' || replace(v_key,' ','%') || '%'
        or n.maker_key like '%' || v_key || '%'
        or (length(v_key)>=4 and greatest(
          extensions.similarity(n.name_key,v_key),
          extensions.similarity(n.variant_key,v_key)
        ) >= 0.3)
      )
    order by score desc, p.id
    limit greatest(1,least(coalesce(p_limit,150),300))
  )
  select
    (to_jsonb(p) - 'purchase_price' - 'expiry_date' - 'shelf_location' - 'track_expiry')
    || pg_catalog.jsonb_build_object(
      'quantity',coalesce(i.quantity,0),
      'price',coalesce(bp.sale_price,p.price),
      'offer_price',case when bp.id is not null then bp.offer_price else p.offer_price end,
      'is_offer',case when bp.id is not null then coalesce(bp.is_offer,false) else coalesce(p.is_offer,false) end,
      'bulk_enabled',case when bv.id is not null then coalesce(bv.conversion_factor,0)>0
        else coalesce(p.bulk_enabled,false) and coalesce(p.bulk_quantity,0)>0 end,
      'bulk_quantity',coalesce(bv.conversion_factor,p.bulk_quantity),
      'bulk_price',coalesce(bv.price,p.bulk_price),
      'bulk_barcode',coalesce(bv.barcode,p.bulk_barcode),
      'bulk_name',bv.name,
      'bulk_image_url',bv.image_url,
      'bulk_variant_id',bv.id,
      'bulk_variant_type',bv.variant_type,
      'delivery_branch_id',p_branch_id,
      'inventory_branch_id',v_inventory_branch,
      'pricing_branch_id',v_pricing_branch,
      'commerce_source','owned',
      'catalog_scope','elmadawy',
      'search_rank',ranked.score
    )
  from ranked
  join public.products p on p.id=ranked.product_id
  left join public.inventory i on i.product_id=p.id and i.branch_id=v_inventory_branch
  left join public.branch_product_pricing bp on bp.product_id=p.id and bp.branch_id=v_pricing_branch
  left join lateral (
    select pv.id,pv.name,pv.image_url,pv.conversion_factor,pv.price,pv.barcode,pv.variant_type
    from public.product_variants pv
    where pv.parent_product_id=p.id and pv.active=true
      and coalesce(pv.conversion_factor,0)>1
    order by
      case when nullif(btrim(coalesce(p.bulk_barcode,'')),'') is not null and pv.barcode=p.bulk_barcode then 0 else 1 end,
      case when coalesce(p.bulk_quantity,0)>0 and pv.conversion_factor=p.bulk_quantity then 0 else 1 end,
      pv.position nulls last,pv.id
    limit 1
  ) bv on true
  order by ranked.score desc, case when coalesce(i.quantity,0)>0 then 0 else 1 end, p.id;
end;
$function$;

revoke all on function public.search_customer_smart_catalog_v1(uuid,text,integer) from public;
grant execute on function public.search_customer_smart_catalog_v1(uuid,text,integer) to anon,authenticated;
revoke all on function public.customer_search_arabic_key_v1(text) from public;
grant execute on function public.customer_search_arabic_key_v1(text) to anon,authenticated;
