-- Customer checkout inventory inheritance
-- Applied to Supabase project qzvpayjaadbmpayeglon.
-- Delivery orders stay assigned to the routed child branch, while stock is read/deducted/restored
-- from the nearest ancestor branch that actually owns inventory when independent_inventory=false.

create or replace function private.resolve_inventory_branch(p_branch_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_current uuid := p_branch_id;
  v_parent uuid;
  v_independent boolean;
  v_seen uuid[] := array[]::uuid[];
begin
  if v_current is null then
    raise exception using errcode='22023', message='DELIVERY_UNAVAILABLE';
  end if;

  loop
    if v_current = any(v_seen) then
      raise exception using errcode='22023', message='BRANCH_INVENTORY_CYCLE';
    end if;
    v_seen := array_append(v_seen, v_current);

    select b.parent_branch_id, coalesce(b.independent_inventory,false)
      into v_parent, v_independent
    from public.branches b
    where b.id=v_current and b.active;

    if not found then
      raise exception using errcode='22023', message='DELIVERY_UNAVAILABLE';
    end if;

    if v_independent or v_parent is null then
      return v_current;
    end if;

    v_current := v_parent;
  end loop;
end
$$;

revoke all on function private.resolve_inventory_branch(uuid) from public, anon, authenticated;

create or replace function private.customer_checkout_plan(p_items jsonb, p_address_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  c public.customers%rowtype; a public.customer_addresses%rowtype;
  p public.products%rowtype; b public.branches%rowtype; bp public.branch_product_pricing%rowtype;
  x jsonb; lines jsonb:='[]'; deductions jsonb; shipping jsonb; result jsonb;
  qty numeric; units numeric; price numeric; line_total numeric; subtotal numeric:=0;
  shipping_price numeric; rate_count integer; location_id uuid; branch uuid; inventory_branch uuid;
  bulk boolean; weight boolean; free_delivery boolean;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into c from public.customers where user_id=auth.uid();
  if c.id is null or length(trim(coalesce(c.name,'')))<2 then
    raise exception using errcode='22023',message='PROFILE_REQUIRED';
  end if;
  select * into a from public.customer_addresses where id=p_address_id and user_id=auth.uid();
  if a.id is null or length(trim(a.address))=0 then
    raise exception using errcode='42501',message='ADDRESS_REQUIRED';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode='22023',message='INVALID_CART';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode='22023',message='INVALID_CART';
  end if;

  location_id:=coalesce(a.neighborhood_id,a.area_id,a.city_id,a.governorate_id);
  select r.branch_id into branch from public.get_branch_for_neighborhood(a.neighborhood_id) r;
  if branch is null then
    select id into branch from public.branches where active
    order by (category='main_hub') desc,created_at,id limit 1;
  end if;
  select * into b from public.branches where id=branch and active for share;
  if b.id is null then raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE'; end if;
  inventory_branch:=private.resolve_inventory_branch(b.id);

  perform 1 from public.delivery_type_pricing where delivery_location_id=location_id for share;
  select count(*),min(d.price) into rate_count,shipping_price from public.delivery_type_pricing d
    where d.delivery_location_id=location_id;
  if rate_count<>1 or shipping_price is null or shipping_price<0 then
    raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE';
  end if;

  for x in select value from jsonb_array_elements(p_items) order by value->>'product_id',value->>'is_bulk' loop
    if jsonb_typeof(x->'quantity') is distinct from 'number'
      or jsonb_typeof(x->'is_bulk') is distinct from 'boolean' then
      raise exception using errcode='22023',message='INVALID_CART';
    end if;
    qty:=(x->>'quantity')::numeric; bulk:=(x->>'is_bulk')::boolean;
    if qty<>trunc(qty) or qty not between 1 and 100000 then
      raise exception using errcode='22023',message='INVALID_QUANTITY';
    end if;

    select * into p from public.products where id=(x->>'product_id')::uuid for update;
    if p.id is null then raise exception using errcode='22023',message='PRODUCT_UNAVAILABLE'; end if;
    weight:=p.barcode_type='scale' or coalesce(p.unit_of_measure,'') in ('weight','kg','كيلوجرام','كجم');
    weight:=coalesce(weight,false);
    if coalesce(x->>'unit_of_measure','piece') <> (case when weight then 'weight' else 'piece' end) then
      raise exception using errcode='22023',message='PRODUCT_UNIT_CHANGED';
    end if;

    price:=case when p.is_offer and p.offer_price is not null then p.offer_price else p.price end;
    if b.independent_pricing then
      select * into bp from public.branch_product_pricing where branch_id=b.id and product_id=p.id for share;
      if bp.id is not null then
        price:=case when bp.is_offer and bp.offer_price is not null then bp.offer_price else coalesce(bp.sale_price,price) end;
      end if;
    end if;

    units:=qty;
    if bulk then
      if weight or not coalesce(p.bulk_enabled,false) or coalesce(p.bulk_quantity,0)<=0 or p.bulk_price is null then
        raise exception using errcode='22023',message='BULK_UNAVAILABLE';
      end if;
      price:=p.bulk_price; units:=qty*p.bulk_quantity;
    elsif weight then
      units:=qty/1000;
    end if;

    if price is null or price<0 then raise exception using errcode='22023',message='PRICE_UNAVAILABLE'; end if;
    line_total:=round(price * case when weight then units else qty end,2);
    subtotal:=subtotal+line_total;
    lines:=lines||jsonb_build_array(jsonb_build_object(
      'product_id',p.id,'name',p.name,'product_name',p.name,
      'barcode',case when bulk then p.bulk_barcode else p.barcode end,
      'image_url',p.image_urls[1],
      'quantity',case when weight then units else qty end,
      'price',price,'total',line_total,'is_bulk',bulk,
      'bulk_quantity',p.bulk_quantity,
      'unit_of_measure',case when weight then 'weight' else 'piece' end,
      'is_weight_based',weight,'stock_quantity',units
    ));
  end loop;

  select jsonb_agg(jsonb_build_object(
      'product_id',id,'quantity',quantity,'branch_id',inventory_branch
    ) order by id)
    into deductions
  from (
    select value->>'product_id' id,sum((value->>'stock_quantity')::numeric) quantity
    from jsonb_array_elements(lines)
    group by 1
  ) s;

  for x in select value from jsonb_array_elements(deductions) loop
    if coalesce((select quantity from public.inventory
      where branch_id=inventory_branch and product_id=(x->>'product_id')::uuid),0)
      < (x->>'quantity')::numeric then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=x->>'product_id';
    end if;
  end loop;

  perform 1 from public.special_offers where offer_type='free_delivery' and active for share;
  select exists(
    select 1 from public.special_offers
    where offer_type='free_delivery' and active
      and usage_limit is null
      and coalesce(min_order_amount,0)<=subtotal
      and (expiry_date is null or expiry_date >= (now() at time zone 'Africa/Cairo')::date)
  ) into free_delivery;
  if free_delivery then shipping_price:=0; end if;

  shipping:=jsonb_build_object(
    'address_id',a.id,'address',a.address,'latitude',a.latitude,'longitude',a.longitude,
    'governorate_id',a.governorate_id,'city_id',a.city_id,'area_id',a.area_id,'neighborhood_id',a.neighborhood_id,
    'governorate',(select name from public.governorates where id=a.governorate_id),
    'city',(select name from public.cities where id=a.city_id),
    'area',(select name from public.areas where id=a.area_id),
    'neighborhood',(select name from public.neighborhoods where id=a.neighborhood_id)
  );

  result:=jsonb_build_object(
    'items',lines,'subtotal',subtotal,'shipping_cost',shipping_price,
    'total',subtotal+shipping_price,'free_delivery',free_delivery,
    'branch_id',b.id,'inventory_branch_id',inventory_branch,
    'delivery_location_id',location_id,'customer_id',c.id,
    'customer_snapshot',jsonb_build_object('name',trim(c.name),'phone',c.phone),
    'shipping_snapshot',shipping,'stock_deductions',deductions
  );
  return result||jsonb_build_object('quote_token',md5(result::text));
end
$$;

create or replace function private.place_customer_order(
  p_request_id uuid,p_items jsonb,p_address_id uuid,p_payment_method text,p_notes text,p_quote_token text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  plan jsonb; x jsonb;
  existing public.online_orders%rowtype; created public.online_orders%rowtype;
  fingerprint text; customer uuid; inventory_branch uuid;
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

  plan:=private.customer_checkout_plan(p_items,p_address_id);
  if p_quote_token is distinct from plan->>'quote_token' then
    raise exception using errcode='22023',message='QUOTE_CHANGED';
  end if;

  for x in select value from jsonb_array_elements(plan->'stock_deductions')
    order by value->>'branch_id',value->>'product_id'
  loop
    inventory_branch:=coalesce(
      (x->>'branch_id')::uuid,
      (plan->>'inventory_branch_id')::uuid,
      (plan->>'branch_id')::uuid
    );
    update public.inventory
      set quantity=quantity-(x->>'quantity')::numeric
    where branch_id=inventory_branch
      and product_id=(x->>'product_id')::uuid
      and quantity >= (x->>'quantity')::numeric;
    if not found then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=x->>'product_id';
    end if;
  end loop;

  insert into public.online_orders(
    id,customer_id,items,total,shipping_cost,payment_method,status,payment_status,
    shipping_address,delivery_location_id,branch_id,notes,tracking_number,
    checkout_version,checkout_fingerprint,customer_snapshot,shipping_snapshot,stock_deductions
  ) values(
    p_request_id,customer,plan->'items',(plan->>'total')::numeric,(plan->>'shipping_cost')::numeric,
    p_payment_method,'pending','pending',plan->'shipping_snapshot'->>'address',
    (plan->>'delivery_location_id')::uuid,(plan->>'branch_id')::uuid,coalesce(p_notes,''),
    upper(replace(p_request_id::text,'-','')),1,fingerprint,
    plan->'customer_snapshot',plan->'shipping_snapshot',plan->'stock_deductions'
  ) returning * into created;

  return jsonb_build_object('id',created.id,'tracking_number',created.tracking_number,'total',created.total);
end
$$;

create or replace function private.guard_checkout_order()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  x jsonb;
  inventory_branch uuid;
begin
  if old.checkout_version is distinct from 1 then return coalesce(new,old); end if;
  if auth.uid() is null or not (public.is_admin() or public.is_super_admin()) then
    raise exception using errcode='42501',message='ORDER_MANAGER_REQUIRED';
  end if;
  if tg_op='DELETE' then raise exception using errcode='22023',message='CANCEL_ORDER_INSTEAD'; end if;

  if (to_jsonb(new)-array['status','payment_status','notes','delivery_person','updated_at','return_status'])
     is distinct from (to_jsonb(old)-array['status','payment_status','notes','delivery_person','updated_at','return_status']) then
    raise exception using errcode='22023',message='CHECKOUT_ORDER_IMMUTABLE';
  end if;
  if old.status='cancelled' and new.status<>'cancelled' then
    raise exception using errcode='22023',message='CANCELLED_ORDER_FINAL';
  end if;

  if new.status='cancelled' and old.status<>'cancelled' then
    if old.status in ('shipped','delivered') then
      raise exception using errcode='22023',message='USE_RETURN_PROCESS';
    end if;
    for x in select value from jsonb_array_elements(old.stock_deductions)
      order by value->>'branch_id',value->>'product_id'
    loop
      inventory_branch:=coalesce((x->>'branch_id')::uuid,old.branch_id);
      update public.inventory
        set quantity=quantity+(x->>'quantity')::numeric
      where branch_id=inventory_branch
        and product_id=(x->>'product_id')::uuid;
      if not found then
        raise exception using errcode='22023',message='STOCK_ROW_MISSING';
      end if;
    end loop;
    new.stock_released_at:=now();
  end if;
  return new;
end
$$;
