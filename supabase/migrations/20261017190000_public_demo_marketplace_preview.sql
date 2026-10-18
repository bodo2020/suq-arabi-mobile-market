-- Public, read-only preview of the explicitly seeded demo shops.
-- Normal marketplace publication and checkout flags remain disabled.
create or replace function public.get_customer_demo_marketplace_stores_v1(
  p_branch_id uuid default null,
  p_limit integer default 20
)
returns setof jsonb
language sql
stable security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'merchant_id', m.id,
    'merchant_name', m.name,
    'merchant_type', m.merchant_type,
    'branch_id', b.id,
    'branch_name', b.name,
    'address', b.address,
    'pickup_address', b.address,
    'pickup_latitude', null,
    'pickup_longitude', null,
    'zone_id', null,
    'zone_name', 'متجر تجريبي',
    'coverage_source_branch_id', null,
    'coverage_source_branch_name', null,
    'delivery_fee', 0,
    'estimated_time', null,
    'estimated_delivery_minutes', null,
    'min_order_amount', 0,
    'distance_km', 0,
    'available_products', (
      select count(*)
      from public.merchant_listings ml
      join public.products p on p.id = ml.product_id
      where ml.branch_id = b.id
        and ml.status = 'active'
        and p.archived_at is null
        and p.catalog_scope = 'partner'
        and p.owner_merchant_id = m.id
    ),
    'preview_only', true
  )
  from public.merchants m
  join public.branches b on b.merchant_id = m.id
  where m.metadata->>'demo_seed_key' = 'business-profiles-demo-20261017'
    and m.metadata->>'is_demo' = 'true'
    and m.status = 'active'
    and b.active = true
    and (p_branch_id is null or b.id = p_branch_id)
  order by m.name, b.name
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$;

create or replace function public.get_customer_demo_marketplace_catalog_v1(
  p_branch_id uuid,
  p_product_id uuid default null,
  p_search text default null,
  p_limit integer default 200
)
returns setof jsonb
language sql
stable security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'barcode', p.barcode,
    'barcode_type', p.barcode_type,
    'image_urls', p.image_urls,
    'main_category_id', p.main_category_id,
    'subcategory_id', p.subcategory_id,
    'unit_of_measure', p.unit_of_measure,
    'is_bulk', false,
    'bulk_enabled', false,
    'has_variants', false,
    'price', bp.sale_price,
    'offer_price', case when coalesce(bp.is_offer, false) then bp.offer_price else null end,
    'is_offer', coalesce(bp.is_offer, false),
    'quantity', private.business_sellable_quantity_v1(ml.branch_id, ml.product_id),
    'marketplace_listing_id', ml.id,
    'merchant_id', ml.merchant_id,
    'merchant_name', m.name,
    'marketplace_branch_id', b.id,
    'marketplace_branch_name', b.name,
    'preparation_minutes', ml.preparation_minutes,
    'commerce_source', 'marketplace',
    'catalog_scope', 'partner',
    'preview_only', true
  )
  from public.merchant_listings ml
  join public.merchants m on m.id = ml.merchant_id
  join public.branches b on b.id = ml.branch_id and b.merchant_id = m.id
  join public.products p on p.id = ml.product_id
  join public.branch_product_pricing bp on bp.branch_id = ml.branch_id and bp.product_id = ml.product_id
  where ml.branch_id = p_branch_id
    and m.metadata->>'demo_seed_key' = 'business-profiles-demo-20261017'
    and m.metadata->>'is_demo' = 'true'
    and m.status = 'active'
    and b.active = true
    and ml.status = 'active'
    and p.archived_at is null
    and p.catalog_scope = 'partner'
    and p.owner_merchant_id = m.id
    and bp.sale_price >= 0
    and (p_product_id is null or p.id = p_product_id)
    and (
      nullif(btrim(p_search), '') is null
      or p.name ilike '%' || btrim(p_search) || '%'
      or coalesce(p.barcode, '') = btrim(p_search)
    )
  order by p.name, ml.created_at
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$function$;

revoke all on function public.get_customer_demo_marketplace_stores_v1(uuid, integer) from public;
revoke all on function public.get_customer_demo_marketplace_catalog_v1(uuid, uuid, text, integer) from public;
grant execute on function public.get_customer_demo_marketplace_stores_v1(uuid, integer) to anon, authenticated;
grant execute on function public.get_customer_demo_marketplace_catalog_v1(uuid, uuid, text, integer) to anon, authenticated;
