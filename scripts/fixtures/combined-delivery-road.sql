CREATE OR REPLACE FUNCTION private.quote_combined_delivery_road_v1(p_hub_branch_id uuid, p_partner_branch_ids uuid[], p_has_owned boolean, p_customer_latitude double precision, p_customer_longitude double precision, p_subtotal numeric, p_route_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  h public.branches%rowtype;
  s private.merchant_delivery_settings_v2%rowtype;
  sp jsonb;
  policy jsonb;
  q private.delivery_road_quotes_v1%rowtype;
  canonical_partner_ids uuid[];
  pc integer:=coalesce(array_length(p_partner_branch_ids,1),0);
  pickups integer:=case when p_has_owned then 1 else 0 end+coalesce(array_length(p_partner_branch_ids,1),0);
  route numeric;
  baseline numeric;
  detour numeric;
  detour_minutes integer;
  distance_fee numeric:=0;
  pickup_fee numeric:=0;
  raw_fee numeric:=0;
  delivery_cost numeric:=0;
  customer_fee numeric:=0;
  merchant_subsidy numeric:=0;
  elmadawy_subsidy numeric:=0;
  stop_fee numeric;
  stop_customer numeric;
  stop_merchant numeric;
  stop_elmadawy numeric;
  free_delivery boolean:=false;
  fee_allocations jsonb:='[]'::jsonb;
  second_id uuid;
begin
  if p_route_quote_id is null then
    raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED';
  end if;

  if pickups not between 1 and 3 or pc>2 then
    raise exception using errcode='22023',message='MULTISTORE_LIMIT_EXCEEDED';
  end if;

  select coalesce(array_agg(x order by x),'{}'::uuid[])
  into canonical_partner_ids
  from (
    select distinct unnest(coalesce(p_partner_branch_ids,'{}'::uuid[])) x
  ) t;

  select * into q
  from private.delivery_road_quotes_v1
  where id=p_route_quote_id;

  if q.id is null or q.expires_at<=now() then
    raise exception using errcode='22023',message='ROAD_QUOTE_EXPIRED';
  end if;

  if q.hub_branch_id is distinct from p_hub_branch_id
     or q.partner_branch_ids is distinct from canonical_partner_ids
     or q.has_owned is distinct from p_has_owned
     or abs(q.customer_latitude-p_customer_latitude)>0.00002
     or abs(q.customer_longitude-p_customer_longitude)>0.00002 then
    raise exception using errcode='22023',message='ROAD_QUOTE_MISMATCH';
  end if;

  select * into h
  from public.branches
  where id=p_hub_branch_id
    and active
    and delivery_enabled
    and latitude is not null
    and longitude is not null;

  if h.id is null then
    raise exception using errcode='22023',message='DELIVERY_HUB_UNAVAILABLE';
  end if;

  policy:=private.get_effective_delivery_policy_v2(h.id,null);

  if pickups>(policy->>'max_pickups')::int
     or pc>(policy->>'max_partner_stores')::int then
    raise exception using errcode='22023',message='MULTISTORE_LIMIT_EXCEEDED';
  end if;

  route:=q.route_distance_km;
  baseline:=q.baseline_distance_km;
  detour:=q.detour_km;
  detour_minutes:=greatest(0,q.route_duration_minutes-q.baseline_duration_minutes);
  second_id:=case when pc=2 then q.ordered_partner_branch_ids[2] else null end;

  if route>(policy->>'max_delivery_km')::numeric then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  if detour>(policy->>'max_detour_km')::numeric
     or detour_minutes>(policy->>'max_detour_minutes')::int then
    raise exception using errcode='22023',message='MULTISTORE_DETOUR_TOO_HIGH';
  end if;

  if pc>0 then
    for s in
      select *
      from private.merchant_delivery_settings_v2
      where branch_id=any(canonical_partner_ids)
      order by branch_id
    loop
      if not s.multi_store_enabled
         or not s.allow_combined_cart
         or s.delivery_mode='store_own' then
        raise exception using errcode='22023',message='STORE_NOT_MULTISTORE_ELIGIBLE';
      end if;

      sp:=private.get_effective_delivery_policy_v2(h.id,s.branch_id);
      if detour>coalesce(s.max_detour_km,(sp->>'max_detour_km')::numeric)
         or detour_minutes>coalesce(s.max_detour_minutes,(sp->>'max_detour_minutes')::int) then
        raise exception using errcode='22023',message='STORE_DETOUR_LIMIT_EXCEEDED';
      end if;
    end loop;

    if (
      select count(*)
      from private.merchant_delivery_settings_v2
      where branch_id=any(canonical_partner_ids)
    )<>pc then
      raise exception using errcode='22023',message='STORE_NOT_MULTISTORE_ELIGIBLE';
    end if;
  end if;

  distance_fee:=greatest(0,route-(policy->>'included_km')::numeric)
    *(policy->>'price_per_km')::numeric;
  raw_fee:=(policy->>'base_fee')::numeric+distance_fee;

  if pc>0 then
    for s in
      select *
      from private.merchant_delivery_settings_v2
      where branch_id=any(canonical_partner_ids)
      order by branch_id
    loop
      sp:=private.get_effective_delivery_policy_v2(h.id,s.branch_id);
      stop_fee:=0;

      if p_has_owned then
        stop_fee:=coalesce((sp->>'extra_pickup_fee')::numeric,0);
      elsif pc=2 and s.branch_id=second_id then
        stop_fee:=coalesce((sp->>'extra_pickup_fee')::numeric,0);
      end if;

      stop_customer:=round(stop_fee*s.customer_share_pct/100.0,2);
      stop_merchant:=round(stop_fee*s.merchant_share_pct/100.0,2);
      stop_elmadawy:=round(greatest(0,stop_fee-stop_customer-stop_merchant),2);

      pickup_fee:=pickup_fee+stop_fee;
      merchant_subsidy:=merchant_subsidy+stop_merchant;
      elmadawy_subsidy:=elmadawy_subsidy+stop_elmadawy;

      fee_allocations:=fee_allocations||jsonb_build_array(jsonb_build_object(
        'branch_id',s.branch_id,
        'extra_pickup_fee',round(stop_fee,2),
        'customer_component',stop_customer,
        'merchant_contribution',stop_merchant,
        'elmadawy_contribution',stop_elmadawy,
        'sponsor_kind',s.fee_sponsor_kind
      ));
    end loop;
  end if;

  delivery_cost:=raw_fee+pickup_fee;
  delivery_cost:=greatest((policy->>'minimum_fee')::numeric,delivery_cost);
  if policy->>'maximum_fee' is not null then
    delivery_cost:=least((policy->>'maximum_fee')::numeric,delivery_cost);
  end if;

  customer_fee:=greatest(0,delivery_cost-merchant_subsidy-elmadawy_subsidy);

  if policy->>'free_delivery_threshold' is not null
     and p_subtotal>=(policy->>'free_delivery_threshold')::numeric then
    free_delivery:=true;
    elmadawy_subsidy:=elmadawy_subsidy+customer_fee;
    customer_fee:=0;
  end if;

  return jsonb_build_object(
    'hub_branch_id',h.id,
    'hub_branch_name',h.name,
    'pickup_count',pickups,
    'partner_store_count',pc,
    'max_pickups',(policy->>'max_pickups')::int,
    'max_partner_stores',(policy->>'max_partner_stores')::int,
    'distance_source','verified_road_route',
    'route_quote_id',q.id,
    'route_quote_expires_at',q.expires_at,
    'route_provider',q.provider,
    'route_degraded',q.degraded,
    'baseline_distance_km',baseline,
    'baseline_route_minutes',q.baseline_duration_minutes,
    'route_distance_km',route,
    'detour_km',detour,
    'detour_minutes',detour_minutes,
    'estimated_route_minutes',q.route_duration_minutes,
    'base_fee',(policy->>'base_fee')::numeric,
    'distance_fee',round(distance_fee,2),
    'extra_pickup_fee',round(pickup_fee,2),
    'delivery_cost',round(delivery_cost,2),
    'customer_delivery_fee',round(customer_fee,2),
    'merchant_delivery_subsidy',round(merchant_subsidy,2),
    'elmadawy_delivery_subsidy',round(elmadawy_subsidy,2),
    'fee_allocations',fee_allocations,
    'free_delivery',free_delivery,
    'policy',policy,
    'stops',q.stops
  );
end;
$function$;
