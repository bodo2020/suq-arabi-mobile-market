alter table public.favorites
  add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;

alter table public.favorites
  drop constraint if exists favorites_user_id_product_id_key;

drop index if exists public.favorites_user_product_base_uq;
drop index if exists public.favorites_user_variant_uq;

create unique index favorites_user_product_base_uq
  on public.favorites(user_id, product_id)
  where user_id is not null and variant_id is null;

create unique index favorites_user_variant_uq
  on public.favorites(user_id, variant_id)
  where user_id is not null and variant_id is not null;

create index if not exists favorites_customer_variant_idx
  on public.favorites(customer_id, variant_id);

create or replace function public.set_customer_favorite_unit(
  p_product_id uuid,
  p_variant_id uuid,
  p_favorite boolean
)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_customer uuid;
begin
  if auth.uid() is null then
    raise exception using errcode='42501', message='AUTH_REQUIRED';
  end if;
  if p_product_id is null or p_favorite is null then
    raise exception using errcode='22023', message='INVALID_FAVORITE';
  end if;

  select c.id into v_customer
  from public.customers c
  where c.user_id=auth.uid();

  if v_customer is null then
    raise exception using errcode='22023', message='PROFILE_REQUIRED';
  end if;

  if not exists(select 1 from public.products p where p.id=p_product_id) then
    raise exception using errcode='22023', message='PRODUCT_UNAVAILABLE';
  end if;

  if p_variant_id is not null and not exists(
    select 1
    from public.product_variants pv
    where pv.id=p_variant_id
      and pv.parent_product_id=p_product_id
  ) then
    raise exception using errcode='22023', message='VARIANT_MISMATCH';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_customer::text || ':' || p_product_id::text || ':' || coalesce(p_variant_id::text,'base'),
      0
    )
  );

  if p_favorite then
    if not exists(
      select 1 from public.favorites f
      where f.product_id=p_product_id
        and f.variant_id is not distinct from p_variant_id
        and (f.customer_id=v_customer or f.user_id=auth.uid())
    ) then
      insert into public.favorites(customer_id,user_id,product_id,variant_id)
      values(v_customer,auth.uid(),p_product_id,p_variant_id);
    end if;
  else
    delete from public.favorites f
    where f.product_id=p_product_id
      and f.variant_id is not distinct from p_variant_id
      and (f.customer_id=v_customer or f.user_id=auth.uid());
  end if;
end;
$function$;

revoke all on function public.set_customer_favorite_unit(uuid,uuid,boolean) from public;
revoke all on function public.set_customer_favorite_unit(uuid,uuid,boolean) from anon;
grant execute on function public.set_customer_favorite_unit(uuid,uuid,boolean) to authenticated;

create or replace function public.get_customer_branch_catalog(
  p_branch_id uuid,
  p_product_id uuid default null,
  p_main_category_id uuid default null,
  p_subcategory_id uuid default null,
  p_company_id uuid default null,
  p_search text default null,
  p_barcode text default null,
  p_limit integer default 500
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path=''
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
    select
      pv.id,
      pv.name,
      pv.image_url,
      pv.conversion_factor,
      pv.price,
      pv.barcode,
      pv.variant_type,
      pv.position,
      pv.created_at
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