create or replace function public.get_customer_branch_runtime(p_branch_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b public.branches%rowtype; s record;
begin
  if p_branch_id is null then
    raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED';
  end if;

  select * into b
  from public.branches
  where id=p_branch_id and active=true and delivery_enabled=true;
  if b.id is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  select * into s from private.resolve_branch_sources(b.id);

  return jsonb_build_object(
    'delivery_branch_id',b.id,
    'branch_name',b.name,
    'branch_code',b.code,
    'inventory_branch_id',s.inventory_branch_id,
    'pricing_branch_id',s.pricing_branch_id,
    'delivery_radius_km',b.delivery_radius_km,
    'delivery_fee',b.delivery_fee,
    'min_order_amount',b.min_order_amount,
    'estimated_delivery_minutes',b.estimated_delivery_minutes,
    'opens_at',b.opens_at,
    'closes_at',b.closes_at,
    'delivery_enabled',b.delivery_enabled,
    'latitude',b.latitude,
    'longitude',b.longitude
  );
end;
$$;

grant execute on function public.get_customer_branch_runtime(uuid) to anon,authenticated;
notify pgrst,'reload schema';
