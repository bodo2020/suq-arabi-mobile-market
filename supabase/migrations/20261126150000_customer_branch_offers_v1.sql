-- The offers page used the general catalog, which returns only the newest 1000 in-stock
-- products. Branches with thousands of products dropped every older discounted item, so the
-- page said "no offers". This returns only the discounted, in-stock products of the
-- delivering branch, priced exactly like the catalog (branch price row first, then product).

create or replace function public.get_customer_branch_offers_v1(p_branch_id uuid)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pricing_branch uuid;
begin
  -- Same availability rule as get_customer_branch_catalog (raises DELIVERY_UNAVAILABLE).
  perform 1 from public.get_customer_branch_catalog(p_branch_id, null, null, null, null, null, null, 1);

  select s.pricing_branch_id into v_pricing_branch from private.resolve_branch_sources(p_branch_id) s;

  return query
  select c
  from (
    select p.id
    from public.products p
    left join public.branch_product_pricing bp on bp.product_id = p.id and bp.branch_id = v_pricing_branch
    where p.catalog_scope = 'elmadawy'
      and p.owner_merchant_id is null
      and p.archived_at is null
      and coalesce(case when bp.id is not null then bp.offer_price else p.offer_price end, 0) > 0
  ) candidates
  cross join lateral public.get_customer_branch_catalog_core_v1(p_branch_id, candidates.id) c
  where coalesce((c->>'quantity')::numeric, 0) > 0
    and (c->>'offer_price')::numeric < (c->>'price')::numeric
  limit 1000;
end;
$$;

revoke all on function public.get_customer_branch_offers_v1(uuid) from public;
grant execute on function public.get_customer_branch_offers_v1(uuid) to anon, authenticated;
