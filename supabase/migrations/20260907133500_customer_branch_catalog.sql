-- Customer catalog is scoped to the delivery branch and its resolved inventory branch.
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
set search_path = ''
as $$
declare
  v_inventory_branch uuid;
  v_independent_pricing boolean;
begin
  if p_branch_id is null then
    raise exception using errcode='22023', message='DELIVERY_ADDRESS_REQUIRED';
  end if;

  select coalesce(b.independent_pricing,false)
    into v_independent_pricing
  from public.branches b
  where b.id = p_branch_id and b.active = true;

  if not found then
    raise exception using errcode='22023', message='DELIVERY_UNAVAILABLE';
  end if;

  v_inventory_branch := private.resolve_inventory_branch(p_branch_id);

  return query
  select
    (to_jsonb(p)
      - 'purchase_price'
      - 'expiry_date'
      - 'shelf_location'
      - 'track_expiry')
    || jsonb_build_object(
      'quantity', i.quantity,
      'price', case when v_independent_pricing and bp.id is not null then bp.sale_price else p.price end,
      'offer_price', case when v_independent_pricing and bp.id is not null then bp.offer_price else p.offer_price end,
      'is_offer', case when v_independent_pricing and bp.id is not null then coalesce(bp.is_offer,false) else coalesce(p.is_offer,false) end,
      'bulk_enabled', coalesce(p.bulk_enabled,false) and coalesce(p.bulk_quantity,0) > 0 and i.quantity >= coalesce(p.bulk_quantity,0),
      'delivery_branch_id', p_branch_id,
      'inventory_branch_id', v_inventory_branch
    )
  from public.products p
  join public.inventory i
    on i.product_id = p.id
   and i.branch_id = v_inventory_branch
   and i.quantity > 0
  left join public.branch_product_pricing bp
    on bp.product_id = p.id
   and bp.branch_id = p_branch_id
  where p.id in (select gbp.product_id from public.get_branch_products(p_branch_id) gbp)
    and (p_product_id is null or p.id = p_product_id)
    and (p_main_category_id is null or p.main_category_id = p_main_category_id)
    and (p_subcategory_id is null or p.subcategory_id = p_subcategory_id)
    and (p_company_id is null or p.company_id = p_company_id)
    and (p_search is null or btrim(p_search) = '' or p.name ilike '%' || btrim(p_search) || '%')
    and (p_barcode is null or btrim(p_barcode) = '' or p.barcode = btrim(p_barcode) or p.bulk_barcode = btrim(p_barcode))
  order by p.created_at desc nulls last, p.id
  limit greatest(1, least(coalesce(p_limit,500), 1000));
end;
$$;

grant execute on function public.get_customer_branch_catalog(uuid,uuid,uuid,uuid,uuid,text,text,integer) to anon, authenticated;

create or replace function public.get_customer_branch_products_by_ids(
  p_branch_id uuid,
  p_product_ids uuid[]
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select item
  from public.get_customer_branch_catalog(
    p_branch_id,
    null,
    null,
    null,
    null,
    null,
    null,
    1000
  ) as item
  where (item->>'id')::uuid = any(coalesce(p_product_ids, '{}'::uuid[]));
$$;

grant execute on function public.get_customer_branch_products_by_ids(uuid,uuid[]) to anon, authenticated;
