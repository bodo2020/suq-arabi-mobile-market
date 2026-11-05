-- Snapshot of the live checkout functions (project marketpos), exported 2026-11-05.
--
-- These functions run in production but were created outside this repo's
-- migrations, so checkout pricing, stock and idempotency logic could not be
-- reviewed or reproduced from Git. This file mirrors the live definitions
-- (CREATE OR REPLACE + grants); it is reference/source-of-truth, not a
-- migration. When changing any of these functions, write a migration and
-- refresh this snapshot.
--
-- Entry points used by the app: quote_customer_order_v2,
-- place_customer_order_with_voucher_v3, quote_marketplace_cart_v2,
-- place_marketplace_order_v3, reconcile_customer_checkout_attempt.

CREATE OR REPLACE FUNCTION private.apply_delivery_campaign_v1(p_hub_branch_id uuid, p_partner_branch_ids uuid[], p_subtotal numeric, p_delivery jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_campaign private.delivery_campaigns_v1%rowtype;
  v_customer_fee numeric:=greatest(coalesce((p_delivery->>'customer_delivery_fee')::numeric,0),0);
  v_merchant_subsidy numeric:=greatest(coalesce((p_delivery->>'merchant_delivery_subsidy')::numeric,0),0);
  v_elmadawy_subsidy numeric:=greatest(coalesce((p_delivery->>'elmadawy_delivery_subsidy')::numeric,0),0);
  v_extra_pickup numeric:=greatest(coalesce((p_delivery->>'extra_pickup_fee')::numeric,0),0);
  v_discount numeric:=0;
  v_merchant_amount numeric:=0;
  v_elmadawy_amount numeric:=0;
  v_target_branch_id uuid;
  v_allocations jsonb:=coalesce(p_delivery->'fee_allocations','[]'::jsonb);
begin
  select c.*
  into v_campaign
  from private.delivery_campaigns_v1 c
  where c.active
    and c.hub_branch_id=p_hub_branch_id
    and now()>=c.starts_at
    and now()<c.ends_at
    and coalesce(p_subtotal,0)>=c.minimum_order_amount
    and (
      (c.target_kind='hub' and c.target_id=p_hub_branch_id)
      or
      (c.target_kind='branch' and c.target_id=any(coalesce(p_partner_branch_ids,'{}'::uuid[])))
      or
      (
        c.target_kind='merchant'
        and exists(
          select 1
          from public.branches b
          where b.id=any(coalesce(p_partner_branch_ids,'{}'::uuid[]))
            and b.merchant_id=c.target_id
        )
      )
    )
  order by c.priority desc,c.starts_at desc,c.created_at desc
  limit 1;

  if v_campaign.id is null or v_customer_fee<=0 then
    return p_delivery||jsonb_build_object('delivery_campaign',null);
  end if;

  if v_campaign.campaign_type='free_delivery' then
    v_discount:=v_customer_fee;
  elsif v_campaign.campaign_type='free_extra_pickup' then
    v_discount:=least(v_customer_fee,v_extra_pickup);
  else
    v_discount:=least(v_customer_fee,coalesce(v_campaign.subsidy_amount,0));
  end if;

  v_discount:=greatest(round(v_discount,2),0);
  if v_discount<=0 then
    return p_delivery||jsonb_build_object(
      'delivery_campaign',jsonb_build_object(
        'id',v_campaign.id,
        'name',v_campaign.name,
        'type',v_campaign.campaign_type,
        'discount',0
      )
    );
  end if;

  v_merchant_amount:=round(v_discount*v_campaign.merchant_share_pct/100.0,2);
  v_elmadawy_amount:=greatest(0,round(v_discount-v_merchant_amount,2));

  if v_campaign.target_kind='branch' then
    v_target_branch_id:=v_campaign.target_id;
  elsif v_campaign.target_kind='merchant' then
    select b.id into v_target_branch_id
    from public.branches b
    where b.id=any(coalesce(p_partner_branch_ids,'{}'::uuid[]))
      and b.merchant_id=v_campaign.target_id
    order by b.id
    limit 1;
  end if;

  if v_merchant_amount>0 then
    if v_target_branch_id is null then
      raise exception using errcode='22023',message='MERCHANT_FUNDED_CAMPAIGN_REQUIRES_PARTNER_TARGET';
    end if;

    if exists(
      select 1
      from jsonb_array_elements(v_allocations) a
      where a->>'branch_id'=v_target_branch_id::text
    ) then
      select coalesce(jsonb_agg(
        case
          when a->>'branch_id'=v_target_branch_id::text then
            a||jsonb_build_object(
              'merchant_contribution',
                coalesce((a->>'merchant_contribution')::numeric,0)+v_merchant_amount,
              'campaign_merchant_contribution',v_merchant_amount,
              'campaign_id',v_campaign.id
            )
          else a
        end
      ),'[]'::jsonb)
      into v_allocations
      from jsonb_array_elements(v_allocations) a;
    else
      v_allocations:=v_allocations||jsonb_build_array(jsonb_build_object(
        'branch_id',v_target_branch_id,
        'extra_pickup_fee',0,
        'customer_component',0,
        'merchant_contribution',v_merchant_amount,
        'elmadawy_contribution',0,
        'campaign_merchant_contribution',v_merchant_amount,
        'campaign_id',v_campaign.id
      ));
    end if;
  end if;

  v_customer_fee:=greatest(0,round(v_customer_fee-v_discount,2));
  v_merchant_subsidy:=round(v_merchant_subsidy+v_merchant_amount,2);
  v_elmadawy_subsidy:=round(v_elmadawy_subsidy+v_elmadawy_amount,2);

  return p_delivery||jsonb_build_object(
    'customer_delivery_fee',v_customer_fee,
    'merchant_delivery_subsidy',v_merchant_subsidy,
    'elmadawy_delivery_subsidy',v_elmadawy_subsidy,
    'fee_allocations',v_allocations,
    'free_delivery',v_customer_fee=0,
    'delivery_campaign',jsonb_build_object(
      'id',v_campaign.id,
      'name',v_campaign.name,
      'type',v_campaign.campaign_type,
      'target_kind',v_campaign.target_kind,
      'target_id',v_campaign.target_id,
      'discount',v_discount,
      'merchant_contribution',v_merchant_amount,
      'elmadawy_contribution',v_elmadawy_amount,
      'starts_at',v_campaign.starts_at,
      'ends_at',v_campaign.ends_at
    )
  );
end;
$function$
;
revoke all on function private.apply_delivery_campaign_v1(p_hub_branch_id uuid, p_partner_branch_ids uuid[], p_subtotal numeric, p_delivery jsonb) from public;
grant execute on function private.apply_delivery_campaign_v1(p_hub_branch_id uuid, p_partner_branch_ids uuid[], p_subtotal numeric, p_delivery jsonb) to service_role;

CREATE OR REPLACE FUNCTION private.business_manual_order_limit_v1(p_branch_id uuid, p_product_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when not c.is_available then 0
    when p.barcode_type='scale' or p.unit_of_measure in ('weight','kg','كيلوجرام','كجم') then 100
    else 100000 end::numeric
  from private.business_catalog_controls_v1 c
  join public.branches b on b.id=c.branch_id and b.active
  join public.merchants m on m.id=b.merchant_id and m.merchant_type='partner'
    and m.business_profile in ('lite','restaurant')
  join public.products p on p.id=c.product_id and p.catalog_scope='partner' and p.owner_merchant_id=m.id
  where c.branch_id=p_branch_id and c.product_id=p_product_id and c.availability_mode='manual';
$function$
;
revoke all on function private.business_manual_order_limit_v1(p_branch_id uuid, p_product_id uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.business_sellable_quantity_v1(p_branch_id uuid, p_product_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when exists(select 1 from private.business_catalog_controls_v1 c
    join public.branches b on b.id=c.branch_id
    join public.merchants m on m.id=b.merchant_id and m.business_profile in ('lite','restaurant') and m.merchant_type='partner'
    where c.branch_id=p_branch_id and c.product_id=p_product_id and not c.is_available)
    then 0 else coalesce(private.business_manual_order_limit_v1(p_branch_id,p_product_id),
      private.inventory_available_quantity_v1(p_branch_id,p_product_id)) end;
$function$
;
revoke all on function private.business_sellable_quantity_v1(p_branch_id uuid, p_product_id uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.calculate_delivery_fee_v2(p_policy jsonb, p_distance_km numeric, p_subtotal numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_base numeric:=coalesce((p_policy->>'base_fee')::numeric,0);
  v_included numeric:=coalesce((p_policy->>'included_km')::numeric,0);
  v_per_km numeric:=coalesce((p_policy->>'price_per_km')::numeric,0);
  v_min numeric:=coalesce((p_policy->>'minimum_fee')::numeric,0);
  v_max numeric:=case when p_policy->>'maximum_fee' is null then null else (p_policy->>'maximum_fee')::numeric end;
  v_threshold numeric:=case when p_policy->>'free_delivery_threshold' is null then null else (p_policy->>'free_delivery_threshold')::numeric end;
  v_distance_fee numeric;
  v_cost numeric;
  v_free boolean:=false;
begin
  v_distance_fee:=greatest(0,coalesce(p_distance_km,0)-v_included)*v_per_km;
  v_cost:=greatest(v_min,v_base+v_distance_fee);
  if v_max is not null then v_cost:=least(v_max,v_cost); end if;
  if v_threshold is not null and coalesce(p_subtotal,0)>=v_threshold then v_free:=true; end if;
  return jsonb_build_object(
    'base_fee',round(v_base,2),
    'included_km',v_included,
    'price_per_km',v_per_km,
    'distance_km',round(coalesce(p_distance_km,0),3),
    'distance_fee',round(v_distance_fee,2),
    'delivery_cost',round(v_cost,2),
    'customer_delivery_fee',case when v_free then 0 else round(v_cost,2) end,
    'free_delivery',v_free
  );
end;
$function$
;
revoke all on function private.calculate_delivery_fee_v2(p_policy jsonb, p_distance_km numeric, p_subtotal numeric) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.consume_loyalty_voucher(p_code text, p_customer_id uuid, p_channel text, p_source_type text, p_source_id uuid, p_branch_id uuid, p_requested_amount numeric, p_total numeric, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.loyalty_vouchers%rowtype;
  u public.loyalty_voucher_usages%rowtype;
  v_code text;
  v_amount numeric(12,2);
  v_usage_id uuid;
  v_remaining numeric(12,2);
begin
  if p_customer_id is null then raise exception using errcode='22023',message='CUSTOMER_REQUIRED_FOR_VOUCHER'; end if;
  if p_source_id is null or p_source_type not in ('pos_sale','online_order') or p_channel not in ('pos','app') then
    raise exception using errcode='22023',message='INVALID_VOUCHER_SOURCE';
  end if;
  v_code:=upper(btrim(coalesce(p_code,'')));
  if v_code='' then raise exception using errcode='22023',message='VOUCHER_CODE_REQUIRED'; end if;
  select * into v from public.loyalty_vouchers where upper(voucher_code)=v_code or barcode_token=v_code for update;
  if v.id is null then raise exception using errcode='22023',message='VOUCHER_NOT_FOUND'; end if;
  if v.customer_id<>p_customer_id then raise exception using errcode='22023',message='VOUCHER_CUSTOMER_MISMATCH'; end if;

  select * into u from public.loyalty_voucher_usages where source_type=p_source_type and source_id=p_source_id;
  if u.id is not null then
    if u.voucher_id<>v.id or u.reversed_at is not null then raise exception using errcode='42501',message='REQUEST_CONFLICT'; end if;
    if coalesce(p_requested_amount,0)>0 and abs(round(p_requested_amount,2)-u.amount_egp)>0.009 then raise exception using errcode='42501',message='REQUEST_CONFLICT'; end if;
    select remaining_value_egp into v_remaining from public.loyalty_vouchers where id=v.id;
    return jsonb_build_object('voucher_id',v.id,'voucher_code',v.voucher_code,'amount_egp',u.amount_egp,'remaining_value_egp',v_remaining,'usage_id',u.id,'replayed',true);
  end if;

  if v.status<>'active' or v.remaining_value_egp<=0 or (v.expires_at is not null and v.expires_at<=now()) then
    raise exception using errcode='22023',message='VOUCHER_UNAVAILABLE';
  end if;
  if p_total is null or p_total<=0 then raise exception using errcode='22023',message='INVALID_VOUCHER_TOTAL'; end if;
  v_amount:=case when coalesce(p_requested_amount,0)>0 then round(p_requested_amount,2) else least(v.remaining_value_egp,round(p_total,2)) end;
  if v_amount<=0 or v_amount>v.remaining_value_egp or v_amount>round(p_total,2) then raise exception using errcode='22023',message='INVALID_VOUCHER_AMOUNT'; end if;

  insert into public.loyalty_voucher_usages(voucher_id,customer_id,channel,source_type,source_id,branch_id,amount_egp,created_by,metadata)
  values(v.id,p_customer_id,p_channel,p_source_type,p_source_id,p_branch_id,v_amount,p_created_by,jsonb_build_object('voucher_code',v.voucher_code))
  returning id into v_usage_id;

  update public.loyalty_vouchers
  set remaining_value_egp=round(remaining_value_egp-v_amount,2),
      status=case when round(remaining_value_egp-v_amount,2)<=0 then 'redeemed' else 'active' end,
      last_used_at=now(),updated_at=now()
  where id=v.id and status='active' and remaining_value_egp>=v_amount
  returning remaining_value_egp into v_remaining;
  if not found then raise exception using errcode='40001',message='VOUCHER_BALANCE_CHANGED'; end if;

  return jsonb_build_object('voucher_id',v.id,'voucher_code',v.voucher_code,'amount_egp',v_amount,'remaining_value_egp',v_remaining,'usage_id',v_usage_id,'replayed',false);
end;
$function$
;
revoke all on function private.consume_loyalty_voucher(p_code text, p_customer_id uuid, p_channel text, p_source_type text, p_source_id uuid, p_branch_id uuid, p_requested_amount numeric, p_total numeric, p_created_by uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.customer_checkout_plan(p_items jsonb, p_address_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.customers%rowtype;
  a public.customer_addresses%rowtype;
  p public.products%rowtype;
  b public.branches%rowtype;
  bp public.branch_product_pricing%rowtype;
  bv public.product_variants%rowtype;
  x jsonb;
  lines jsonb := '[]';
  deductions jsonb;
  shipping jsonb;
  result jsonb;
  qty numeric;
  units numeric;
  price numeric;
  line_total numeric;
  subtotal numeric := 0;
  shipping_price numeric;
  branch uuid;
  inventory_branch uuid;
  pricing_branch uuid;
  branch_distance double precision;
  bulk boolean;
  weight boolean;
  free_delivery boolean;
  bulk_qty numeric;
  line_name text;
  line_barcode text;
  line_image text;
  line_variant_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTH_REQUIRED';
  end if;

  select * into c from public.customers where user_id=auth.uid();
  if c.id is null or length(trim(coalesce(c.name,'')))<2 then
    raise exception using errcode='22023',message='PROFILE_REQUIRED';
  end if;

  select * into a from public.customer_addresses where id=p_address_id and user_id=auth.uid();
  if a.id is null or length(trim(a.address))=0 then
    raise exception using errcode='42501',message='ADDRESS_REQUIRED';
  end if;
  if a.latitude is null or a.longitude is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode='22023',message='INVALID_CART';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode='22023',message='INVALID_CART';
  end if;

  select r.branch_id,r.distance_km,r.delivery_fee
    into branch,branch_distance,shipping_price
  from public.find_delivery_branch(a.latitude::double precision,a.longitude::double precision) r
  limit 1;
  if branch is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  select * into b from public.branches where id=branch and active and delivery_enabled for share;
  if b.id is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  select s.inventory_branch_id,s.pricing_branch_id
    into inventory_branch,pricing_branch
  from private.resolve_branch_sources(b.id) s;
  shipping_price := coalesce(shipping_price,b.delivery_fee,0);

  for x in select value from jsonb_array_elements(p_items) order by value->>'product_id',value->>'is_bulk' loop
    if jsonb_typeof(x->'quantity') is distinct from 'number'
       or jsonb_typeof(x->'is_bulk') is distinct from 'boolean' then
      raise exception using errcode='22023',message='INVALID_CART';
    end if;

    qty := (x->>'quantity')::numeric;
    bulk := (x->>'is_bulk')::boolean;
    if qty<>trunc(qty) or qty not between 1 and 100000 then
      raise exception using errcode='22023',message='INVALID_QUANTITY';
    end if;

    select * into p from public.products where id=(x->>'product_id')::uuid for update;
    if p.id is null then
      raise exception using errcode='22023',message='PRODUCT_UNAVAILABLE';
    end if;

    weight := p.barcode_type='scale' or coalesce(p.unit_of_measure,'') in ('weight','kg','كيلوجرام','كجم');
    weight := coalesce(weight,false);
    if coalesce(x->>'unit_of_measure','piece')<>(case when weight then 'weight' else 'piece' end) then
      raise exception using errcode='22023',message='PRODUCT_UNIT_CHANGED';
    end if;

    select * into bp
    from public.branch_product_pricing
    where branch_id=pricing_branch and product_id=p.id
    for share;

    price := case when bp.id is not null
      then case when bp.is_offer and bp.offer_price is not null then bp.offer_price else bp.sale_price end
      else case when p.is_offer and p.offer_price is not null then p.offer_price else p.price end
    end;

    units := qty;
    bulk_qty := null;
    line_name := p.name;
    line_barcode := p.barcode;
    line_image := p.image_urls[1];
    line_variant_id := null;

    if bulk then
      if weight then
        raise exception using errcode='22023',message='BULK_UNAVAILABLE';
      end if;

      bv := null;
      select pv.* into bv
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
      limit 1;

      if bv.id is not null then
        bulk_qty := bv.conversion_factor;
        price := bv.price;
        units := qty * bv.conversion_factor;
        line_name := coalesce(nullif(btrim(bv.name),''),p.name);
        line_barcode := coalesce(nullif(btrim(bv.barcode),''),p.bulk_barcode,p.barcode);
        line_image := coalesce(nullif(btrim(bv.image_url),''),p.image_urls[1]);
        line_variant_id := bv.id;
      else
        if not coalesce(p.bulk_enabled,false)
           or coalesce(p.bulk_quantity,0)<=0
           or p.bulk_price is null then
          raise exception using errcode='22023',message='BULK_UNAVAILABLE';
        end if;
        bulk_qty := p.bulk_quantity;
        price := p.bulk_price;
        units := qty * p.bulk_quantity;
        line_barcode := coalesce(p.bulk_barcode,p.barcode);
      end if;
    elsif weight then
      units := qty/1000;
    end if;

    if private.inventory_available_quantity_v1(inventory_branch,p.id)<units then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=p.id::text;
    end if;
    if price is null or price<0 then
      raise exception using errcode='22023',message='PRICE_UNAVAILABLE';
    end if;

    line_total := round(price*(case when weight then units else qty end),2);
    subtotal := subtotal+line_total;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id',p.id,
      'variant_id',line_variant_id,
      'name',line_name,
      'product_name',line_name,
      'barcode',line_barcode,
      'image_url',line_image,
      'quantity',case when weight then units else qty end,
      'price',price,
      'total',line_total,
      'is_bulk',bulk,
      'bulk_quantity',bulk_qty,
      'unit_of_measure',case when weight then 'weight' else 'piece' end,
      'is_weight_based',weight,
      'stock_quantity',units
    ));
  end loop;

  select jsonb_agg(jsonb_build_object('product_id',id,'quantity',quantity,'branch_id',inventory_branch) order by id)
    into deductions
  from (
    select value->>'product_id' id,sum((value->>'stock_quantity')::numeric) quantity
    from jsonb_array_elements(lines)
    group by 1
  ) s;

  perform 1 from public.special_offers where offer_type='free_delivery' and active for share;
  select exists(
    select 1 from public.special_offers
    where offer_type='free_delivery' and active
      and usage_limit is null
      and coalesce(min_order_amount,0)<=subtotal
      and (expiry_date is null or expiry_date >= (now() at time zone 'Africa/Cairo')::date)
  ) into free_delivery;
  if free_delivery then shipping_price:=0; end if;

  shipping := jsonb_build_object(
    'address_id',a.id,
    'address',a.address,
    'latitude',a.latitude,
    'longitude',a.longitude,
    'assigned_branch_id',branch,
    'distance_km',round(branch_distance::numeric,3)
  );

  result := jsonb_build_object(
    'items',lines,
    'subtotal',subtotal,
    'shipping_cost',shipping_price,
    'total',subtotal+shipping_price,
    'free_delivery',free_delivery,
    'branch_id',b.id,
    'inventory_branch_id',inventory_branch,
    'pricing_branch_id',pricing_branch,
    'delivery_location_id',null,
    'customer_id',c.id,
    'customer_snapshot',jsonb_build_object('name',trim(c.name),'phone',c.phone),
    'shipping_snapshot',shipping,
    'stock_deductions',deductions
  );

  return result || jsonb_build_object('quote_token',md5(result::text));
end;
$function$
;
revoke all on function private.customer_checkout_plan(p_items jsonb, p_address_id uuid) from public;
grant execute on function private.customer_checkout_plan(p_items jsonb, p_address_id uuid) to authenticated;

CREATE OR REPLACE FUNCTION private.customer_checkout_plan_v2(p_items jsonb, p_address_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_base jsonb;
  v_policy jsonb;
  v_price jsonb;
  v_distance numeric;
  v_subtotal numeric;
  v_result jsonb;
  v_route_text text;
  v_route_id uuid;
  v_road jsonb;
  v_lat double precision;
  v_lng double precision;
begin
  v_base:=private.customer_checkout_plan(p_items,p_address_id);
  v_distance:=coalesce((v_base->'shipping_snapshot'->>'distance_km')::numeric,0);
  v_subtotal:=coalesce((v_base->>'subtotal')::numeric,0);
  v_policy:=private.get_effective_delivery_policy_v2((v_base->>'branch_id')::uuid,null);
  v_lat:=nullif(v_base->'shipping_snapshot'->>'latitude','')::double precision;
  v_lng:=nullif(v_base->'shipping_snapshot'->>'longitude','')::double precision;

  v_route_text:=nullif(current_setting('app.single_delivery_route_quote_id',true),'');
  if v_route_text is not null then
    begin
      v_route_id:=v_route_text::uuid;
    exception when invalid_text_representation then
      raise exception using errcode='22023',message='INVALID_ROUTE_QUOTE';
    end;

    v_road:=private.get_single_delivery_road_quote_v1(
      v_route_id,'owned',(v_base->>'branch_id')::uuid,(v_base->>'branch_id')::uuid,
      v_lat,v_lng
    );
    v_distance:=(v_road->>'road_distance_km')::numeric;
  end if;

  if v_distance>coalesce((v_policy->>'max_delivery_km')::numeric,999999) then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  v_price:=private.calculate_delivery_fee_v2(v_policy,v_distance,v_subtotal);

  if v_road is not null then
    v_price:=v_price||jsonb_build_object(
      'distance_source','verified_road_route',
      'route_quote_id',(v_road->>'route_quote_id')::uuid,
      'route_quote_expires_at',(v_road->>'route_quote_expires_at')::timestamptz,
      'route_provider',v_road->>'route_provider',
      'route_degraded',(v_road->>'route_degraded')::boolean,
      'road_duration_minutes',(v_road->>'road_duration_minutes')::integer,
      'straight_distance_km',(v_road->>'straight_distance_km')::numeric
    );
  end if;

  if coalesce((v_base->>'free_delivery')::boolean,false) then
    v_price:=v_price||jsonb_build_object(
      'customer_delivery_fee',0,
      'free_delivery',true,
      'free_delivery_source','special_offer'
    );
  end if;

  v_result:=(v_base-'quote_token')||jsonb_build_object(
    'shipping_cost',(v_price->>'customer_delivery_fee')::numeric,
    'total',round(v_subtotal+(v_price->>'customer_delivery_fee')::numeric,2),
    'free_delivery',(v_price->>'free_delivery')::boolean,
    'delivery_cost',(v_price->>'delivery_cost')::numeric,
    'delivery_pricing',v_price,
    'delivery_policy',v_policy,
    'distance_km',v_distance,
    'road_distance_km',case when v_road is null then null else v_distance end,
    'road_duration_minutes',case when v_road is null then null else (v_road->>'road_duration_minutes')::integer end,
    'distance_source',case when v_road is null then 'estimated_haversine' else 'verified_road_route' end,
    'route_quote_id',case when v_road is null then null else (v_road->>'route_quote_id')::uuid end,
    'route_provider',case when v_road is null then null else v_road->>'route_provider' end,
    'route_degraded',case when v_road is null then null else (v_road->>'route_degraded')::boolean end
  );
  return v_result||jsonb_build_object('quote_token',md5(v_result::text));
end;
$function$
;
revoke all on function private.customer_checkout_plan_v2(p_items jsonb, p_address_id uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.customer_checkout_plan_v3(p_items jsonb, p_address_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_base jsonb;
  v_delivery jsonb;
  v_result jsonb;
begin
  v_base:=private.customer_checkout_plan_v2(p_items,p_address_id);

  v_delivery:=jsonb_build_object(
    'delivery_cost',coalesce((v_base->>'delivery_cost')::numeric,0),
    'customer_delivery_fee',coalesce((v_base->>'shipping_cost')::numeric,0),
    'merchant_delivery_subsidy',0,
    'elmadawy_delivery_subsidy',0,
    'extra_pickup_fee',0,
    'fee_allocations','[]'::jsonb,
    'free_delivery',coalesce((v_base->>'free_delivery')::boolean,false)
  );

  v_delivery:=private.apply_delivery_campaign_v1(
    (v_base->>'branch_id')::uuid,
    '{}'::uuid[],
    coalesce((v_base->>'subtotal')::numeric,0),
    v_delivery
  );

  v_result:=(v_base-'quote_token')||jsonb_build_object(
    'shipping_cost',(v_delivery->>'customer_delivery_fee')::numeric,
    'total',round(
      coalesce((v_base->>'subtotal')::numeric,0)
      +(v_delivery->>'customer_delivery_fee')::numeric,2
    ),
    'free_delivery',(v_delivery->>'customer_delivery_fee')::numeric=0,
    'merchant_delivery_subsidy',(v_delivery->>'merchant_delivery_subsidy')::numeric,
    'elmadawy_delivery_subsidy',(v_delivery->>'elmadawy_delivery_subsidy')::numeric,
    'delivery_campaign',v_delivery->'delivery_campaign'
  );

  return v_result||jsonb_build_object('quote_token',md5(v_result::text));
end;
$function$
;
revoke all on function private.customer_checkout_plan_v3(p_items jsonb, p_address_id uuid) from public;
grant execute on function private.customer_checkout_plan_v3(p_items jsonb, p_address_id uuid) to authenticated;
grant execute on function private.customer_checkout_plan_v3(p_items jsonb, p_address_id uuid) to service_role;

CREATE OR REPLACE FUNCTION private.get_effective_delivery_policy_v2(p_hub_branch_id uuid, p_store_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_hub public.branches%rowtype;
  v_store public.branches%rowtype;
  v_policy private.delivery_policies_v2%rowtype;
  v_policy_id uuid;
begin
  select * into v_hub from public.branches where id=p_hub_branch_id and active;
  if v_hub.id is null then raise exception using errcode='22023',message='DELIVERY_HUB_UNAVAILABLE'; end if;

  if p_store_branch_id is not null then
    select * into v_store from public.branches where id=p_store_branch_id and active;
    if v_store.id is null or v_store.hub_branch_id is distinct from v_hub.id then
      raise exception using errcode='22023',message='STORE_HUB_MISMATCH';
    end if;
    select custom_policy_id into v_policy_id from private.merchant_delivery_settings_v2 where branch_id=v_store.id;
  end if;

  if v_policy_id is null and p_store_branch_id is not null then
    select policy_id into v_policy_id from private.delivery_policy_assignments_v2
    where tenant_id=v_hub.tenant_id and active and scope_kind='branch' and scope_id=p_store_branch_id
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
    order by priority desc,updated_at desc limit 1;
  end if;
  if v_policy_id is null and p_store_branch_id is not null then
    select policy_id into v_policy_id from private.delivery_policy_assignments_v2
    where tenant_id=v_hub.tenant_id and active and scope_kind='merchant' and scope_id=v_store.merchant_id
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
    order by priority desc,updated_at desc limit 1;
  end if;
  if v_policy_id is null then
    select policy_id into v_policy_id from private.delivery_policy_assignments_v2
    where tenant_id=v_hub.tenant_id and active and scope_kind='hub' and scope_id=v_hub.id
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
    order by priority desc,updated_at desc limit 1;
  end if;
  if v_policy_id is null then
    select policy_id into v_policy_id from private.delivery_policy_assignments_v2
    where tenant_id=v_hub.tenant_id and active and scope_kind='global' and scope_id is null
      and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
    order by priority desc,updated_at desc limit 1;
  end if;
  if v_policy_id is not null then
    select * into v_policy from private.delivery_policies_v2 where id=v_policy_id and active;
  end if;

  if v_policy.id is null then
    return jsonb_build_object(
      'policy_id',null,'policy_source','legacy_hub',
      'base_fee',coalesce(v_hub.delivery_fee,0),'included_km',0,'price_per_km',0,
      'minimum_fee',0,'maximum_fee',null,'max_delivery_km',coalesce(v_hub.delivery_radius_km,10),
      'free_delivery_threshold',null,'extra_pickup_fee',0,'max_pickups',3,'max_partner_stores',2,
      'max_detour_km',2,'max_detour_minutes',8
    );
  end if;

  return jsonb_build_object(
    'policy_id',v_policy.id,'policy_name',v_policy.name,'policy_source','effective',
    'base_fee',v_policy.base_fee,'included_km',v_policy.included_km,'price_per_km',v_policy.price_per_km,
    'minimum_fee',v_policy.minimum_fee,'maximum_fee',v_policy.maximum_fee,
    'max_delivery_km',v_policy.max_delivery_km,'free_delivery_threshold',v_policy.free_delivery_threshold,
    'extra_pickup_fee',v_policy.extra_pickup_fee,'max_pickups',v_policy.max_pickups,
    'max_partner_stores',v_policy.max_partner_stores,'max_detour_km',v_policy.max_detour_km,
    'max_detour_minutes',v_policy.max_detour_minutes
  );
end;
$function$
;
revoke all on function private.get_effective_delivery_policy_v2(p_hub_branch_id uuid, p_store_branch_id uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.get_single_delivery_road_quote_v1(p_route_quote_id uuid, p_source_kind text, p_hub_branch_id uuid, p_origin_branch_id uuid, p_customer_latitude double precision, p_customer_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q private.delivery_road_quotes_v1%rowtype;
  v_expected_partners uuid[];
  v_origin public.branches%rowtype;
begin
  if p_route_quote_id is null then
    raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED';
  end if;
  if p_source_kind not in ('owned','marketplace') then
    raise exception using errcode='22023',message='INVALID_COMMERCE_SOURCE';
  end if;

  select * into q
  from private.delivery_road_quotes_v1
  where id=p_route_quote_id;

  if q.id is null or q.expires_at<=now() then
    raise exception using errcode='22023',message='ROAD_QUOTE_EXPIRED';
  end if;

  if q.metadata->>'route_kind' is distinct from 'single'
     or q.metadata->>'source_kind' is distinct from p_source_kind
     or q.metadata->>'origin_branch_id' is distinct from p_origin_branch_id::text
     or q.hub_branch_id is distinct from p_hub_branch_id
     or abs(q.customer_latitude-p_customer_latitude)>0.00002
     or abs(q.customer_longitude-p_customer_longitude)>0.00002 then
    raise exception using errcode='22023',message='ROAD_QUOTE_MISMATCH';
  end if;

  select * into v_origin
  from public.branches
  where id=p_origin_branch_id
    and active
    and latitude is not null
    and longitude is not null;

  if v_origin.id is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  if p_source_kind='owned' then
    if q.has_owned is not true
       or coalesce(cardinality(q.partner_branch_ids),0)<>0
       or p_origin_branch_id is distinct from p_hub_branch_id
       or not coalesce(v_origin.delivery_enabled,false) then
      raise exception using errcode='22023',message='ROAD_QUOTE_MISMATCH';
    end if;
  else
    v_expected_partners:=array[p_origin_branch_id]::uuid[];
    if q.has_owned
       or q.partner_branch_ids is distinct from v_expected_partners
       or q.ordered_partner_branch_ids is distinct from v_expected_partners
       or v_origin.hub_branch_id is distinct from p_hub_branch_id
       or not coalesce(v_origin.marketplace_customer_enabled,false) then
      raise exception using errcode='22023',message='ROAD_QUOTE_MISMATCH';
    end if;
  end if;

  return jsonb_build_object(
    'route_quote_id',q.id,
    'route_quote_expires_at',q.expires_at,
    'distance_source','verified_road_route',
    'route_provider',q.provider,
    'route_degraded',q.degraded,
    'road_distance_km',q.route_distance_km,
    'road_duration_minutes',q.route_duration_minutes,
    'straight_distance_km',q.baseline_distance_km
  );
end;
$function$
;
revoke all on function private.get_single_delivery_road_quote_v1(p_route_quote_id uuid, p_source_kind text, p_hub_branch_id uuid, p_origin_branch_id uuid, p_customer_latitude double precision, p_customer_longitude double precision) from public;
grant execute on function private.get_single_delivery_road_quote_v1(p_route_quote_id uuid, p_source_kind text, p_hub_branch_id uuid, p_origin_branch_id uuid, p_customer_latitude double precision, p_customer_longitude double precision) to service_role;

CREATE OR REPLACE FUNCTION private.haversine_km_v2(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null
  else round((6371.0*2*asin(sqrt(
    power(sin(radians((p_lat2-p_lat1)/2)),2)
    +cos(radians(p_lat1))*cos(radians(p_lat2))*power(sin(radians((p_lng2-p_lng1)/2)),2)
  )))::numeric,3) end;
$function$
;
revoke all on function private.haversine_km_v2(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.marketplace_quote_plan_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_branch public.branches%rowtype;
  v_merchant public.merchants%rowtype;
  v_delivery record;
  v_item jsonb;
  v_row record;
  v_qty numeric;
  v_units numeric;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric:=0;
  v_lines jsonb:='[]'::jsonb;
  v_deductions jsonb;
  v_result jsonb;
  v_weight boolean;
  v_expected_unit text;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode='22023',message='INVALID_CART';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude<-90 or p_latitude>90
     or p_longitude<-180 or p_longitude>180 then
    raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED';
  end if;

  select b.* into v_branch
  from public.branches b
  where b.id=p_branch_id
    and b.marketplace_customer_enabled
    and b.active
    and b.latitude is not null
    and b.longitude is not null;

  if v_branch.id is null then
    raise exception using errcode='22023',message='MARKETPLACE_STORE_UNAVAILABLE';
  end if;

  select m.* into v_merchant
  from public.merchants m
  where m.id=v_branch.merchant_id
    and m.merchant_type in ('partner','franchise')
    and m.status='active'
    and m.customer_published_at is not null;

  if v_merchant.id is null then
    raise exception using errcode='22023',message='MARKETPLACE_STORE_UNAVAILABLE';
  end if;

  -- Fail closed for restaurant orders on every legacy quote/place path,
  -- including child orders created by combined checkout.
  if v_merchant.business_profile='restaurant' then
    perform private.assert_legacy_restaurant_cart_safe_v1(p_items);
  end if;

  select fd.* into v_delivery
  from public.find_delivery_branch(p_latitude,p_longitude) fd
  where fd.branch_id=v_branch.hub_branch_id;

  if v_delivery.branch_id is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
    order by value->>'listing_id'
  loop
    if jsonb_typeof(v_item)<>'object'
       or v_item->>'listing_id' is null
       or jsonb_typeof(v_item->'quantity') is distinct from 'number' then
      raise exception using errcode='22023',message='INVALID_CART';
    end if;

    if coalesce((v_item->>'is_bulk')::boolean,false) then
      raise exception using errcode='22023',message='BULK_UNAVAILABLE';
    end if;

    v_qty:=(v_item->>'quantity')::numeric;
    if v_qty<>trunc(v_qty) or v_qty not between 1 and 100000 then
      raise exception using errcode='22023',message='INVALID_QUANTITY';
    end if;

    select
      ml.id as listing_id,
      ml.product_id,
      ml.preparation_minutes,
      p.name,
      p.barcode,
      p.barcode_type,
      p.unit_of_measure,
      p.image_urls,
      bp.sale_price,
      bp.offer_price,
      bp.is_offer,
      private.business_sellable_quantity_v1(i.branch_id,i.product_id) as stock,
      private.business_manual_order_limit_v1(i.branch_id,i.product_id) is not null as manual_availability
    into v_row
    from public.merchant_listings ml
    join public.products p on p.id=ml.product_id
    join public.branch_product_pricing bp
      on bp.branch_id=ml.branch_id and bp.product_id=ml.product_id
    join public.inventory i
      on i.branch_id=ml.branch_id and i.product_id=ml.product_id
    where ml.id=(v_item->>'listing_id')::uuid
      and p.archived_at is null
      and p.catalog_scope='partner'
      and p.owner_merchant_id=v_merchant.id
      and ml.branch_id=v_branch.id
      and ml.merchant_id=v_merchant.id
      and ml.marketplace_customer_enabled=true
      and ml.status='active';

    if v_row.listing_id is null then
      raise exception using errcode='22023',message='PRODUCT_UNAVAILABLE';
    end if;

    v_weight:=coalesce(v_row.barcode_type='scale',false)
      or coalesce(v_row.unit_of_measure,'') in ('weight','kg','كيلوجرام','كجم');

    v_expected_unit:=case when v_weight then 'weight' else 'piece' end;

    if coalesce(v_item->>'unit_of_measure','piece')<>v_expected_unit then
      raise exception using errcode='22023',message='PRODUCT_UNIT_CHANGED';
    end if;

    v_price:=case
      when coalesce(v_row.is_offer,false) and v_row.offer_price is not null
        then v_row.offer_price
      else v_row.sale_price
    end;

    if v_price is null or v_price<0 then
      raise exception using errcode='22023',message='PRICE_UNAVAILABLE';
    end if;

    v_units:=case when v_weight then v_qty/1000.0 else v_qty end;
    if coalesce(v_row.stock,0)<v_units then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=v_row.product_id::text;
    end if;

    v_line_total:=round(v_price*(case when v_weight then v_units else v_qty end),2);
    v_subtotal:=v_subtotal+v_line_total;

    v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
      'listing_id',v_row.listing_id,
      'product_id',v_row.product_id,
      'name',v_row.name,
      'product_name',v_row.name,
      'barcode',v_row.barcode,
      'image_url',v_row.image_urls[1],
      'requested_quantity',v_qty,
      'quantity',case when v_weight then v_units else v_qty end,
      'unit_of_measure',v_expected_unit,
      'is_weight_based',v_weight,
      'is_bulk',false,
      'price',v_price,
      'total',v_line_total,
      'available_stock',case when v_row.manual_availability then null else v_row.stock end,
      'availability_mode',case when v_row.manual_availability then 'manual' else 'stock' end,
      'stock_quantity',v_units,
      'preparation_minutes',v_row.preparation_minutes
    ));
  end loop;

  select jsonb_agg(
    jsonb_build_object(
      'product_id',product_id,
      'quantity',quantity,
      'branch_id',v_branch.id,
      'availability_mode',availability_mode
    )
    order by product_id
  )
  into v_deductions
  from (
    select
      (value->>'product_id')::uuid as product_id,
      sum((value->>'stock_quantity')::numeric) as quantity,
      value->>'availability_mode' as availability_mode
    from jsonb_array_elements(v_lines)
    group by 1,3
  ) s;

  v_result:=jsonb_build_object(
    'source_kind','marketplace',
    'merchant_id',v_merchant.id,
    'merchant_name',v_merchant.name,
    'branch_id',v_branch.id,
    'branch_name',v_branch.name,
    'pickup_address',v_branch.address,
    'pickup_latitude',v_branch.latitude,
    'pickup_longitude',v_branch.longitude,
    'coverage_source_branch_id',v_delivery.branch_id,
    'coverage_source_branch_name',v_delivery.branch_name,
    'zone_id',null,
    'zone_name','تغطية '||v_delivery.branch_name,
    'items',v_lines,
    'subtotal',round(v_subtotal,2),
    'shipping_cost',round(coalesce(v_delivery.delivery_fee,0),2),
    'total',round(v_subtotal+coalesce(v_delivery.delivery_fee,0),2),
    'free_delivery',coalesce(v_delivery.delivery_fee,0)=0,
    'min_order_amount',coalesce(v_branch.min_order_amount,0),
    'minimum_order_met',v_subtotal>=coalesce(v_branch.min_order_amount,0),
    'estimated_time',null,
    'estimated_delivery_minutes',v_delivery.estimated_delivery_minutes,
    'stock_deductions',coalesce(v_deductions,'[]'::jsonb)
  );

  return v_result||jsonb_build_object('quote_token',md5(v_result::text));
end;
$function$
;
revoke all on function private.marketplace_quote_plan_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.marketplace_quote_plan_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_base jsonb;
  v_branch public.branches%rowtype;
  v_settings private.merchant_delivery_settings_v2%rowtype;
  v_policy jsonb;
  v_price jsonb;
  v_result jsonb;
  v_distance numeric;
  v_cost numeric;
  v_customer numeric;
  v_merchant numeric;
  v_elmadawy numeric;
  v_route_text text;
  v_route_id uuid;
  v_road jsonb;
begin
  v_base:=private.marketplace_quote_plan_v1(p_branch_id,p_items,p_latitude,p_longitude);
  select * into v_branch from public.branches where id=p_branch_id;
  select * into v_settings from private.merchant_delivery_settings_v2 where branch_id=p_branch_id;

  v_policy:=private.get_effective_delivery_policy_v2(v_branch.hub_branch_id,p_branch_id);
  v_distance:=private.haversine_km_v2(v_branch.latitude,v_branch.longitude,p_latitude,p_longitude);

  v_route_text:=nullif(current_setting('app.single_delivery_route_quote_id',true),'');
  if v_route_text is not null then
    begin
      v_route_id:=v_route_text::uuid;
    exception when invalid_text_representation then
      raise exception using errcode='22023',message='INVALID_ROUTE_QUOTE';
    end;

    v_road:=private.get_single_delivery_road_quote_v1(
      v_route_id,'marketplace',v_branch.hub_branch_id,v_branch.id,
      p_latitude,p_longitude
    );
    v_distance:=(v_road->>'road_distance_km')::numeric;
  end if;

  if v_distance>coalesce((v_policy->>'max_delivery_km')::numeric,999999) then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  v_price:=private.calculate_delivery_fee_v2(v_policy,v_distance,(v_base->>'subtotal')::numeric);
  if v_road is not null then
    v_price:=v_price||jsonb_build_object(
      'distance_source','verified_road_route',
      'route_quote_id',(v_road->>'route_quote_id')::uuid,
      'route_quote_expires_at',(v_road->>'route_quote_expires_at')::timestamptz,
      'route_provider',v_road->>'route_provider',
      'route_degraded',(v_road->>'route_degraded')::boolean,
      'road_duration_minutes',(v_road->>'road_duration_minutes')::integer,
      'straight_distance_km',(v_road->>'straight_distance_km')::numeric
    );
  end if;

  v_cost:=(v_price->>'delivery_cost')::numeric;

  if (v_price->>'free_delivery')::boolean then
    v_customer:=0;
    v_merchant:=round(v_cost*coalesce(v_settings.merchant_share_pct,0)/100,2);
    v_elmadawy:=greatest(0,v_cost-v_merchant);
  else
    v_customer:=round(v_cost*coalesce(v_settings.customer_share_pct,100)/100,2);
    v_merchant:=round(v_cost*coalesce(v_settings.merchant_share_pct,0)/100,2);
    v_elmadawy:=greatest(0,round(v_cost-v_customer-v_merchant,2));
  end if;

  v_result:=(v_base-'quote_token')||jsonb_build_object(
    'shipping_cost',v_customer,
    'total',round((v_base->>'subtotal')::numeric+v_customer,2),
    'free_delivery',v_customer=0,
    'delivery_distance_km',v_distance,
    'road_distance_km',case when v_road is null then null else v_distance end,
    'road_duration_minutes',case when v_road is null then null else (v_road->>'road_duration_minutes')::integer end,
    'distance_source',case when v_road is null then 'estimated_haversine' else 'verified_road_route' end,
    'route_quote_id',case when v_road is null then null else (v_road->>'route_quote_id')::uuid end,
    'route_provider',case when v_road is null then null else v_road->>'route_provider' end,
    'route_degraded',case when v_road is null then null else (v_road->>'route_degraded')::boolean end,
    'delivery_cost',v_cost,
    'merchant_delivery_subsidy',v_merchant,
    'elmadawy_delivery_subsidy',v_elmadawy,
    'delivery_pricing',v_price,
    'delivery_policy',v_policy,
    'delivery_mode',coalesce(v_settings.delivery_mode,'elmadawy_fleet')
  );
  return v_result||jsonb_build_object('quote_token',md5(v_result::text));
end;
$function$
;
revoke all on function private.marketplace_quote_plan_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.marketplace_quote_plan_v3(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_base jsonb;
  v_branch public.branches%rowtype;
  v_delivery jsonb;
  v_result jsonb;
begin
  v_base:=private.marketplace_quote_plan_v2(
    p_branch_id,p_items,p_latitude,p_longitude
  );

  select * into v_branch
  from public.branches
  where id=p_branch_id;

  if v_branch.id is null or v_branch.hub_branch_id is null then
    return v_base;
  end if;

  v_delivery:=jsonb_build_object(
    'delivery_cost',coalesce((v_base->>'delivery_cost')::numeric,0),
    'customer_delivery_fee',coalesce((v_base->>'shipping_cost')::numeric,0),
    'merchant_delivery_subsidy',coalesce((v_base->>'merchant_delivery_subsidy')::numeric,0),
    'elmadawy_delivery_subsidy',coalesce((v_base->>'elmadawy_delivery_subsidy')::numeric,0),
    'extra_pickup_fee',0,
    'fee_allocations',jsonb_build_array(jsonb_build_object(
      'branch_id',p_branch_id,
      'merchant_contribution',coalesce((v_base->>'merchant_delivery_subsidy')::numeric,0),
      'elmadawy_contribution',coalesce((v_base->>'elmadawy_delivery_subsidy')::numeric,0),
      'customer_component',coalesce((v_base->>'shipping_cost')::numeric,0),
      'extra_pickup_fee',0
    )),
    'free_delivery',coalesce((v_base->>'free_delivery')::boolean,false)
  );

  v_delivery:=private.apply_delivery_campaign_v1(
    v_branch.hub_branch_id,
    array[p_branch_id],
    coalesce((v_base->>'subtotal')::numeric,0),
    v_delivery
  );

  v_result:=(v_base-'quote_token')||jsonb_build_object(
    'shipping_cost',(v_delivery->>'customer_delivery_fee')::numeric,
    'total',round(
      coalesce((v_base->>'subtotal')::numeric,0)
      +(v_delivery->>'customer_delivery_fee')::numeric,2
    ),
    'free_delivery',(v_delivery->>'customer_delivery_fee')::numeric=0,
    'merchant_delivery_subsidy',(v_delivery->>'merchant_delivery_subsidy')::numeric,
    'elmadawy_delivery_subsidy',(v_delivery->>'elmadawy_delivery_subsidy')::numeric,
    'delivery_campaign',v_delivery->'delivery_campaign',
    'fee_allocations',v_delivery->'fee_allocations'
  );

  return v_result||jsonb_build_object('quote_token',md5(v_result::text));
end;
$function$
;
revoke all on function private.marketplace_quote_plan_v3(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) from public;
grant execute on function private.marketplace_quote_plan_v3(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) to service_role;

CREATE OR REPLACE FUNCTION private.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  plan jsonb;
  x jsonb;
  existing public.online_orders%rowtype;
  created public.online_orders%rowtype;
  fingerprint text;
  customer uuid;
  inventory_branch uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception using errcode='22023',message='REQUEST_REQUIRED'; end if;
  if p_payment_method is null or p_payment_method not in ('cash','wallet') or length(coalesce(p_notes,''))>1000 then
    raise exception using errcode='22023',message='INVALID_ORDER';
  end if;
  select id into customer from public.customers where user_id=auth.uid();
  fingerprint:=md5(jsonb_build_object(
    'items',p_items,'address',p_address_id,'payment',p_payment_method,'notes',coalesce(p_notes,'')
  )::text);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,3));
  select * into existing from public.online_orders where id=p_request_id;
  if existing.id is not null then
    if existing.customer_id is distinct from customer or existing.checkout_fingerprint is distinct from fingerprint then
      raise exception using errcode='42501',message='REQUEST_CONFLICT';
    end if;
    return jsonb_build_object('id',existing.id,'tracking_number',existing.tracking_number,'total',existing.total);
  end if;
  if not coalesce((select enabled from private.customer_checkout_rollout where singleton),false) then
    raise exception using errcode='55000',message='CHECKOUT_NOT_READY';
  end if;

  plan:=private.customer_checkout_plan_v3(p_items,p_address_id);
  if p_quote_token is distinct from plan->>'quote_token' then
    raise exception using errcode='22023',message='QUOTE_CHANGED';
  end if;


  insert into public.online_orders(
    id,customer_id,items,total,shipping_cost,payment_method,status,payment_status,
    shipping_address,delivery_location_id,branch_id,notes,tracking_number,checkout_version,checkout_fingerprint,
    customer_snapshot,shipping_snapshot,stock_deductions,inventory_reservation_version
  )
  values(
    p_request_id,customer,plan->'items',(plan->>'total')::numeric,(plan->>'shipping_cost')::numeric,
    p_payment_method,'pending','pending',plan->'shipping_snapshot'->>'address',
    (plan->>'delivery_location_id')::uuid,(plan->>'branch_id')::uuid,coalesce(p_notes,''),
    upper(replace(p_request_id::text,'-','')),1,fingerprint,plan->'customer_snapshot',
    (plan->'shipping_snapshot')||jsonb_build_object(
      'delivery_pricing',plan->'delivery_pricing',
      'delivery_policy',plan->'delivery_policy'
    ),
    plan->'stock_deductions',1
  ) returning * into created;

  perform private.reserve_order_inventory_v1(
    created.id,plan->'stock_deductions',
    coalesce((plan->>'inventory_branch_id')::uuid,(plan->>'branch_id')::uuid),
    'owned_online'
  );
  return jsonb_build_object('id',created.id,'tracking_number',created.tracking_number,'total',created.total);
end;
$function$
;
revoke all on function private.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) from public;
grant execute on function private.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) to authenticated;

CREATE OR REPLACE FUNCTION private.reserve_order_inventory_v1(p_order_id uuid, p_stock jsonb, p_fallback_branch_id uuid, p_source_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_item jsonb; v_branch uuid; v_product uuid; v_qty numeric; v_on_hand numeric; v_reserved numeric;
  v_count integer:=0; v_total numeric:=0;
begin
  if p_order_id is null or jsonb_typeof(p_stock) is distinct from 'array' then
    raise exception using errcode='22023',message='RESERVATION_INPUT_INVALID'; end if;
  if not exists(select 1 from public.online_orders o where o.id=p_order_id) then
    raise exception using errcode='P0002',message='RESERVATION_ORDER_NOT_FOUND'; end if;

  for v_item in select value from jsonb_array_elements(p_stock)
    order by coalesce(value->>'branch_id',p_fallback_branch_id::text),value->>'product_id'
  loop
    begin
      v_branch:=coalesce(nullif(v_item->>'branch_id','')::uuid,p_fallback_branch_id);
      v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'quantity')::numeric;
    exception when others then raise exception using errcode='22023',message='RESERVATION_INPUT_INVALID'; end;
    if v_branch is null or v_product is null or v_qty<=0 or round(v_qty,3)<>v_qty then
      raise exception using errcode='22023',message='RESERVATION_INPUT_INVALID'; end if;
    if exists(select 1 from private.inventory_reservations_v1 r
      where r.order_id=p_order_id and r.branch_id=v_branch and r.product_id=v_product) then continue; end if;

    select i.quantity into v_on_hand from public.inventory i
    where i.branch_id=v_branch and i.product_id=v_product for update;
    if v_on_hand is null then raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=v_product::text; end if;

    if v_item->>'availability_mode'='manual' then
      -- Lock against an availability toggle until this order is accepted by checkout.
      perform 1 from private.business_catalog_controls_v1
        where branch_id=v_branch and product_id=v_product for share;
      if private.business_manual_order_limit_v1(v_branch,v_product) is null
        or private.business_sellable_quantity_v1(v_branch,v_product)<v_qty then
        raise exception using errcode='22023',message='PRODUCT_UNAVAILABLE',detail=v_product::text;
      end if;
      -- Made-to-order / daily availability is captured on the order, never reserved
      -- or restocked as physical inventory.
      continue;
    end if;

    insert into private.inventory_reservation_balances_v1(branch_id,product_id,reserved_quantity)
    values(v_branch,v_product,0) on conflict(branch_id,product_id) do nothing;
    select b.reserved_quantity into v_reserved from private.inventory_reservation_balances_v1 b
    where b.branch_id=v_branch and b.product_id=v_product for update;

    if greatest(v_on_hand-coalesce(v_reserved,0),0)<v_qty then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=v_product::text; end if;

    update private.inventory_reservation_balances_v1
    set reserved_quantity=reserved_quantity+v_qty,updated_at=now()
    where branch_id=v_branch and product_id=v_product;
    insert into private.inventory_reservations_v1(order_id,branch_id,product_id,quantity,state,source_kind,metadata)
    values(p_order_id,v_branch,v_product,v_qty,'reserved',coalesce(nullif(p_source_kind,''),'online_order'),
      jsonb_build_object('reservation_version',1));
    v_count:=v_count+1; v_total:=v_total+v_qty;
  end loop;

  update private.order_intake_state_v1 set inventory_state='reserved',
    validation=coalesce(validation,'{}'::jsonb)||jsonb_build_object('inventory_reservation_version',1,'reservation_state','reserved'),
    updated_at=now() where order_id=p_order_id;
  return jsonb_build_object('order_id',p_order_id,'state','reserved','lines',v_count,'quantity',v_total);
end $function$
;
revoke all on function private.reserve_order_inventory_v1(p_order_id uuid, p_stock jsonb, p_fallback_branch_id uuid, p_source_kind text) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION private.set_order_substitution_preference_v1(p_order_id uuid, p_policy text, p_customer_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_policy not in ('allow_substitutions','contact_me','remove_item') then
    raise exception using errcode='22023',message='INVALID_SUBSTITUTION_POLICY';
  end if;
  if not exists(select 1 from public.online_orders o where o.id=p_order_id) then
    raise exception using errcode='22023',message='ORDER_NOT_FOUND';
  end if;
  insert into private.order_substitution_preferences_v1(order_id,policy,customer_user_id,snapshot_at)
  values(p_order_id,p_policy,p_customer_user_id,now())
  on conflict(order_id) do update set
    policy=excluded.policy,
    customer_user_id=coalesce(private.order_substitution_preferences_v1.customer_user_id,excluded.customer_user_id),
    metadata=private.order_substitution_preferences_v1.metadata||jsonb_build_object('last_seen_at',now());
end;
$function$
;
revoke all on function private.set_order_substitution_preference_v1(p_order_id uuid, p_policy text, p_customer_user_id uuid) from public;
-- (no API role grants)

CREATE OR REPLACE FUNCTION public.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.place_customer_order(p_request_id,p_items,p_address_id,p_payment_method,p_notes,p_quote_token);
$function$
;
revoke all on function public.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) from public;
grant execute on function public.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) to authenticated;
grant execute on function public.place_customer_order(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) to service_role;

CREATE OR REPLACE FUNCTION public.place_customer_order_with_voucher(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text DEFAULT NULL::text, p_voucher_amount numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer uuid;
  v_existing public.online_orders%rowtype;
  v_result jsonb;
  v_order public.online_orders%rowtype;
  v_use jsonb;
  v_code text:=upper(btrim(coalesce(p_voucher_code,'')));
  v_existing_voucher public.loyalty_vouchers%rowtype;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select id into v_customer from public.customers where user_id=auth.uid() order by created_at desc limit 1;
  if v_customer is null then raise exception using errcode='22023',message='PROFILE_REQUIRED'; end if;

  select * into v_existing from public.online_orders where id=p_request_id;
  if v_existing.id is not null then
    if v_existing.customer_id is distinct from v_customer then raise exception using errcode='42501',message='REQUEST_CONFLICT'; end if;
    if v_code='' and v_existing.loyalty_voucher_id is not null then raise exception using errcode='42501',message='REQUEST_CONFLICT'; end if;
    if v_code<>'' and v_existing.loyalty_voucher_id is null then raise exception using errcode='42501',message='REQUEST_CONFLICT'; end if;
    if v_existing.loyalty_voucher_id is not null then
      select * into v_existing_voucher from public.loyalty_vouchers where id=v_existing.loyalty_voucher_id;
      if v_existing_voucher.id is null or (upper(v_existing_voucher.voucher_code)<>v_code and v_existing_voucher.barcode_token<>v_code) then
        raise exception using errcode='42501',message='REQUEST_CONFLICT';
      end if;
      if coalesce(p_voucher_amount,0)>0 and abs(round(p_voucher_amount,2)-v_existing.loyalty_voucher_amount)>0.009 then
        raise exception using errcode='42501',message='REQUEST_CONFLICT';
      end if;
    end if;
  end if;

  v_result:=private.place_customer_order(p_request_id,p_items,p_address_id,p_payment_method,p_notes,p_quote_token);
  select * into v_order from public.online_orders where id=p_request_id for update;

  if v_code<>'' then
    v_use:=private.consume_loyalty_voucher(v_code,v_customer,'app','online_order',v_order.id,v_order.branch_id,p_voucher_amount,v_order.total,auth.uid());
    update public.online_orders
    set loyalty_voucher_id=(v_use->>'voucher_id')::uuid,
        loyalty_voucher_amount=(v_use->>'amount_egp')::numeric,
        updated_at=now()
    where id=v_order.id;
  end if;

  select * into v_order from public.online_orders where id=p_request_id;
  return to_jsonb(v_order)||jsonb_build_object(
    'amount_due',round(v_order.total-coalesce(v_order.loyalty_voucher_amount,0),2),
    'voucher_remaining_egp',case when v_order.loyalty_voucher_id is null then null else (select remaining_value_egp from public.loyalty_vouchers where id=v_order.loyalty_voucher_id) end
  );
end;
$function$
;
revoke all on function public.place_customer_order_with_voucher(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric) from public;
grant execute on function public.place_customer_order_with_voucher(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric) to authenticated;
grant execute on function public.place_customer_order_with_voucher(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric) to service_role;

CREATE OR REPLACE FUNCTION public.place_customer_order_with_voucher_v2(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_route_quote_id is null then raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED'; end if;
  perform set_config('app.single_delivery_route_quote_id',p_route_quote_id::text,true);
  v_result:=public.place_customer_order_with_voucher(
    p_request_id,p_items,p_address_id,p_payment_method,p_notes,p_quote_token,p_voucher_code,p_voucher_amount
  );
  perform set_config('app.single_delivery_route_quote_id','',true);
  return v_result||jsonb_build_object('road_verified',true);
exception when others then
  perform set_config('app.single_delivery_route_quote_id','',true);
  raise;
end;
$function$
;
revoke all on function public.place_customer_order_with_voucher_v2(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid) from public;
grant execute on function public.place_customer_order_with_voucher_v2(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid) to authenticated;
grant execute on function public.place_customer_order_with_voucher_v2(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid) to service_role;

CREATE OR REPLACE FUNCTION public.place_customer_order_with_voucher_v3(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid, p_substitution_policy text DEFAULT 'contact_me'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_substitution_policy not in ('allow_substitutions','contact_me','remove_item') then
    raise exception using errcode='22023',message='INVALID_SUBSTITUTION_POLICY';
  end if;

  v_result:=public.place_customer_order_with_voucher_v2(
    p_request_id,p_items,p_address_id,p_payment_method,p_notes,p_quote_token,
    p_voucher_code,p_voucher_amount,p_route_quote_id
  );
  perform private.set_order_substitution_preference_v1(
    (v_result->>'id')::uuid,p_substitution_policy,auth.uid()
  );
  return v_result||jsonb_build_object('substitution_policy',p_substitution_policy);
end;
$function$
;
revoke all on function public.place_customer_order_with_voucher_v3(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid, p_substitution_policy text) from public;
grant execute on function public.place_customer_order_with_voucher_v3(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid, p_substitution_policy text) to authenticated;
grant execute on function public.place_customer_order_with_voucher_v3(p_request_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_voucher_code text, p_voucher_amount numeric, p_route_quote_id uuid, p_substitution_policy text) to service_role;

CREATE OR REPLACE FUNCTION public.place_marketplace_order_v1(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer public.customers%rowtype;
  v_address public.customer_addresses%rowtype;
  v_existing public.online_orders%rowtype;
  v_created public.online_orders%rowtype;
  v_plan jsonb;
  v_item jsonb;
  v_fingerprint text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception using errcode='22023',message='REQUEST_REQUIRED'; end if;
  if p_payment_method is null or p_payment_method not in ('cash','wallet') or length(coalesce(p_notes,''))>1000 then
    raise exception using errcode='22023',message='INVALID_ORDER';
  end if;

  select * into v_customer from public.customers where user_id=auth.uid() order by created_at desc limit 1;
  if v_customer.id is null or length(trim(coalesce(v_customer.name,'')))<2 then
    raise exception using errcode='22023',message='PROFILE_REQUIRED';
  end if;
  select * into v_address from public.customer_addresses where id=p_address_id and user_id=auth.uid();
  if v_address.id is null or length(trim(coalesce(v_address.address,'')))=0 then
    raise exception using errcode='42501',message='ADDRESS_REQUIRED';
  end if;
  if v_address.latitude is null or v_address.longitude is null then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  v_fingerprint:=md5(jsonb_build_object(
    'source','marketplace','branch',p_branch_id,'items',p_items,'address',p_address_id,
    'payment',p_payment_method,'notes',coalesce(p_notes,'')
  )::text);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,9));
  select * into v_existing from public.online_orders where id=p_request_id;
  if v_existing.id is not null then
    if v_existing.customer_id is distinct from v_customer.id
       or v_existing.checkout_fingerprint is distinct from v_fingerprint
       or v_existing.source_channel is distinct from 'marketplace' then
      raise exception using errcode='42501',message='REQUEST_CONFLICT';
    end if;
    return jsonb_build_object(
      'id',v_existing.id,'tracking_number',v_existing.tracking_number,'total',v_existing.total,
      'amount_due',v_existing.total,'merchant_id',v_existing.merchant_id
    );
  end if;

  v_plan:=private.marketplace_quote_plan_v3(
    p_branch_id,p_items,v_address.latitude::double precision,v_address.longitude::double precision
  );
  if p_quote_token is distinct from v_plan->>'quote_token' then
    raise exception using errcode='22023',message='QUOTE_CHANGED';
  end if;
  if not coalesce((v_plan->>'minimum_order_met')::boolean,false) then
    raise exception using errcode='22023',message='MIN_ORDER_NOT_MET';
  end if;


  insert into public.online_orders(
    id,customer_id,items,total,shipping_cost,payment_method,status,payment_status,
    shipping_address,delivery_location_id,delivery_zone_id,branch_id,notes,tracking_number,
    checkout_version,checkout_fingerprint,customer_snapshot,shipping_snapshot,stock_deductions,inventory_reservation_version,source_channel
  ) values (
    p_request_id,v_customer.id,v_plan->'items',(v_plan->>'total')::numeric,(v_plan->>'shipping_cost')::numeric,
    p_payment_method,'pending','pending',v_address.address,v_address.neighborhood_id,(v_plan->>'zone_id')::uuid,
    p_branch_id,coalesce(p_notes,''),upper(replace(p_request_id::text,'-','')),9,v_fingerprint,
    jsonb_build_object('name',trim(v_customer.name),'phone',v_customer.phone,'email',v_customer.email),
    jsonb_build_object(
      'address_id',v_address.id,'address',v_address.address,'latitude',v_address.latitude,'longitude',v_address.longitude,
      'assigned_branch_id',p_branch_id,'zone_id',(v_plan->>'zone_id')::uuid,'zone_name',v_plan->>'zone_name',
      'merchant_id',(v_plan->>'merchant_id')::uuid,'merchant_name',v_plan->>'merchant_name',
      'delivery_pricing',v_plan->'delivery_pricing','delivery_policy',v_plan->'delivery_policy',
      'delivery_cost',(v_plan->>'delivery_cost')::numeric,
      'merchant_delivery_subsidy',(v_plan->>'merchant_delivery_subsidy')::numeric,
      'elmadawy_delivery_subsidy',(v_plan->>'elmadawy_delivery_subsidy')::numeric
    ),
    v_plan->'stock_deductions',1,'marketplace'
  ) returning * into v_created;

  perform private.reserve_order_inventory_v1(v_created.id,v_plan->'stock_deductions',p_branch_id,'marketplace');

  return jsonb_build_object(
    'id',v_created.id,'tracking_number',v_created.tracking_number,'total',v_created.total,
    'amount_due',v_created.total,'merchant_id',v_created.merchant_id,
    'merchant_name',v_plan->>'merchant_name','source_kind','marketplace'
  );
end;
$function$
;
revoke all on function public.place_marketplace_order_v1(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) from public;
grant execute on function public.place_marketplace_order_v1(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) to authenticated;
grant execute on function public.place_marketplace_order_v1(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text) to service_role;

CREATE OR REPLACE FUNCTION public.place_marketplace_order_v2(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_route_quote_id is null then raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED'; end if;
  perform set_config('app.single_delivery_route_quote_id',p_route_quote_id::text,true);
  v_result:=public.place_marketplace_order_v1(
    p_request_id,p_branch_id,p_items,p_address_id,p_payment_method,p_notes,p_quote_token
  );
  perform set_config('app.single_delivery_route_quote_id','',true);
  return v_result||jsonb_build_object('road_verified',true);
exception when others then
  perform set_config('app.single_delivery_route_quote_id','',true);
  raise;
end;
$function$
;
revoke all on function public.place_marketplace_order_v2(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid) from public;
grant execute on function public.place_marketplace_order_v2(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid) to authenticated;
grant execute on function public.place_marketplace_order_v2(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid) to service_role;

CREATE OR REPLACE FUNCTION public.place_marketplace_order_v3(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid, p_substitution_policy text DEFAULT 'contact_me'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_substitution_policy not in ('allow_substitutions','contact_me','remove_item') then
    raise exception using errcode='22023',message='INVALID_SUBSTITUTION_POLICY';
  end if;

  v_result:=public.place_marketplace_order_v2(
    p_request_id,p_branch_id,p_items,p_address_id,p_payment_method,p_notes,
    p_quote_token,p_route_quote_id
  );
  perform private.set_order_substitution_preference_v1(
    (v_result->>'id')::uuid,p_substitution_policy,auth.uid()
  );
  return v_result||jsonb_build_object('substitution_policy',p_substitution_policy);
end;
$function$
;
revoke all on function public.place_marketplace_order_v3(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid, p_substitution_policy text) from public;
grant execute on function public.place_marketplace_order_v3(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid, p_substitution_policy text) to authenticated;
grant execute on function public.place_marketplace_order_v3(p_request_id uuid, p_branch_id uuid, p_items jsonb, p_address_id uuid, p_payment_method text, p_notes text, p_quote_token text, p_route_quote_id uuid, p_substitution_policy text) to service_role;

CREATE OR REPLACE FUNCTION public.quote_customer_order(p_items jsonb, p_address_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.customer_checkout_plan_v3(p_items,p_address_id);
$function$
;
revoke all on function public.quote_customer_order(p_items jsonb, p_address_id uuid) from public;
grant execute on function public.quote_customer_order(p_items jsonb, p_address_id uuid) to authenticated;
grant execute on function public.quote_customer_order(p_items jsonb, p_address_id uuid) to service_role;

CREATE OR REPLACE FUNCTION public.quote_customer_order_v2(p_items jsonb, p_address_id uuid, p_route_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if p_route_quote_id is null then raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED'; end if;
  perform set_config('app.single_delivery_route_quote_id',p_route_quote_id::text,true);
  v_result:=public.quote_customer_order(p_items,p_address_id);
  perform set_config('app.single_delivery_route_quote_id','',true);
  return v_result||jsonb_build_object('road_verified',true);
exception when others then
  perform set_config('app.single_delivery_route_quote_id','',true);
  raise;
end;
$function$
;
revoke all on function public.quote_customer_order_v2(p_items jsonb, p_address_id uuid, p_route_quote_id uuid) from public;
grant execute on function public.quote_customer_order_v2(p_items jsonb, p_address_id uuid, p_route_quote_id uuid) to authenticated;
grant execute on function public.quote_customer_order_v2(p_items jsonb, p_address_id uuid, p_route_quote_id uuid) to service_role;

CREATE OR REPLACE FUNCTION public.quote_marketplace_cart_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.marketplace_quote_plan_v3(p_branch_id,p_items,p_latitude,p_longitude);
$function$
;
revoke all on function public.quote_marketplace_cart_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) from public;
grant execute on function public.quote_marketplace_cart_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) to anon;
grant execute on function public.quote_marketplace_cart_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) to authenticated;
grant execute on function public.quote_marketplace_cart_v1(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision) to service_role;

CREATE OR REPLACE FUNCTION public.quote_marketplace_cart_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision, p_route_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if p_route_quote_id is null then raise exception using errcode='22023',message='ROAD_QUOTE_REQUIRED'; end if;
  perform set_config('app.single_delivery_route_quote_id',p_route_quote_id::text,true);
  v_result:=public.quote_marketplace_cart_v1(p_branch_id,p_items,p_latitude,p_longitude);
  perform set_config('app.single_delivery_route_quote_id','',true);
  return v_result||jsonb_build_object('road_verified',true);
exception when others then
  perform set_config('app.single_delivery_route_quote_id','',true);
  raise;
end;
$function$
;
revoke all on function public.quote_marketplace_cart_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision, p_route_quote_id uuid) from public;
grant execute on function public.quote_marketplace_cart_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision, p_route_quote_id uuid) to anon;
grant execute on function public.quote_marketplace_cart_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision, p_route_quote_id uuid) to authenticated;
grant execute on function public.quote_marketplace_cart_v2(p_branch_id uuid, p_items jsonb, p_latitude double precision, p_longitude double precision, p_route_quote_id uuid) to service_role;

CREATE OR REPLACE FUNCTION public.reconcile_customer_checkout_attempt(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer uuid;
  v_order public.online_orders%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTH_REQUIRED';
  end if;

  select c.id into v_customer
  from public.customers c
  where c.user_id=auth.uid();

  if v_customer is null then
    raise exception using errcode='22023',message='PROFILE_REQUIRED';
  end if;

  -- Same lock key used by checkout finalization. If a checkout with this request id
  -- is still in flight, wait for it to finish before deciding whether it exists.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,3));

  select * into v_order
  from public.online_orders o
  where o.id=p_request_id
    and o.customer_id=v_customer;

  if v_order.id is null then
    return jsonb_build_object('exists',false,'request_id',p_request_id);
  end if;

  return jsonb_build_object(
    'exists',true,
    'id',v_order.id,
    'tracking_number',v_order.tracking_number,
    'total',v_order.total,
    'loyalty_voucher_amount',coalesce(v_order.loyalty_voucher_amount,0),
    'amount_due',greatest(0,coalesce(v_order.total,0)-coalesce(v_order.loyalty_voucher_amount,0)),
    'status',v_order.status,
    'payment_status',v_order.payment_status,
    'created_at',v_order.created_at
  );
end $function$
;
revoke all on function public.reconcile_customer_checkout_attempt(p_request_id uuid) from public;
grant execute on function public.reconcile_customer_checkout_attempt(p_request_id uuid) to authenticated;
grant execute on function public.reconcile_customer_checkout_attempt(p_request_id uuid) to service_role;
