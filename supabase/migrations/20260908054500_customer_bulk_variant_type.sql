create or replace function public.get_customer_branch_catalog(
  p_branch_id uuid,
  p_product_id uuid default null::uuid,
  p_main_category_id uuid default null::uuid,
  p_subcategory_id uuid default null::uuid,
  p_company_id uuid default null::uuid,
  p_search text default null::text,
  p_barcode text default null::text,
  p_limit integer default 500
)
returns setof jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_inventory_branch uuid;
  v_pricing_branch uuid;
begin
  if p_branch_id is null then
    raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED';
  end if;

  select s.inventory_branch_id,s.pricing_branch_id
    into v_inventory_branch,v_pricing_branch
  from private.resolve_branch_sources(p_branch_id) s;

  return query
  select
    (to_jsonb(p)
      - 'purchase_price'
      - 'expiry_date'
      - 'shelf_location'
      - 'track_expiry')
    || jsonb_build_object(
      'quantity',i.quantity,
      'price',coalesce(bp.sale_price,p.price),
      'offer_price',case when bp.id is not null then bp.offer_price else p.offer_price end,
      'is_offer',case when bp.id is not null then coalesce(bp.is_offer,false) else coalesce(p.is_offer,false) end,
      'bulk_enabled',case
        when bv.id is not null then coalesce(bv.conversion_factor,0)>0 and i.quantity>=bv.conversion_factor
        else coalesce(p.bulk_enabled,false) and coalesce(p.bulk_quantity,0)>0 and i.quantity>=coalesce(p.bulk_quantity,0)
      end,
      'bulk_quantity',coalesce(bv.conversion_factor,p.bulk_quantity),
      'bulk_price',coalesce(bv.price,p.bulk_price),
      'bulk_barcode',coalesce(bv.barcode,p.bulk_barcode),
      'bulk_name',bv.name,
      'bulk_image_url',bv.image_url,
      'bulk_variant_id',bv.id,
      'bulk_variant_type',bv.variant_type,
      'delivery_branch_id',p_branch_id,
      'inventory_branch_id',v_inventory_branch,
      'pricing_branch_id',v_pricing_branch
    )
  from public.products p
  join public.inventory i
    on i.product_id=p.id
   and i.branch_id=v_inventory_branch
   and i.quantity>0
  left join public.branch_product_pricing bp
    on bp.product_id=p.id
   and bp.branch_id=v_pricing_branch
  left join lateral (
    select pv.id,pv.name,pv.image_url,pv.conversion_factor,pv.price,pv.barcode,pv.variant_type,pv.position,pv.created_at
    from public.product_variants pv
    where pv.parent_product_id=p.id
      and pv.active=true
      and coalesce(pv.conversion_factor,0)>1
    order by
      case when nullif(btrim(coalesce(p.bulk_barcode,'')),'') is not null and pv.barcode=p.bulk_barcode then 0 else 1 end,
      case when coalesce(p.bulk_quantity,0)>0 and pv.conversion_factor=p.bulk_quantity then 0 else 1 end,
      case when pv.variant_type='جملة' then 0 else 1 end,
      pv.position asc nulls last,
      pv.created_at asc nulls last,
      pv.id
    limit 1
  ) bv on true
  where (p_product_id is null or p.id=p_product_id)
    and (p_main_category_id is null or p.main_category_id=p_main_category_id)
    and (p_subcategory_id is null or p.subcategory_id=p_subcategory_id)
    and (p_company_id is null or p.company_id=p_company_id)
    and (
      p_search is null or btrim(p_search)='' or
      p.name ilike '%'||btrim(p_search)||'%' or
      coalesce(bv.name,'') ilike '%'||btrim(p_search)||'%'
    )
    and (
      p_barcode is null or btrim(p_barcode)='' or
      p.barcode=btrim(p_barcode) or
      coalesce(bv.barcode,p.bulk_barcode)=btrim(p_barcode)
    )
  order by p.created_at desc nulls last,p.id
  limit greatest(1,least(coalesce(p_limit,500),1000));
end;
$function$;
