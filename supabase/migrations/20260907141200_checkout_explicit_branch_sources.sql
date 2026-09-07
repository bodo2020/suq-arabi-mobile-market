create or replace function private.customer_checkout_plan(p_items jsonb,p_address_id uuid)
returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  c public.customers%rowtype; a public.customer_addresses%rowtype;
  p public.products%rowtype; b public.branches%rowtype; bp public.branch_product_pricing%rowtype;
  x jsonb; lines jsonb:='[]'; deductions jsonb; shipping jsonb; result jsonb;
  qty numeric; units numeric; price numeric; line_total numeric; subtotal numeric:=0;
  shipping_price numeric; branch uuid; inventory_branch uuid; pricing_branch uuid; branch_distance double precision;
  bulk boolean; weight boolean; free_delivery boolean;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into c from public.customers where user_id=auth.uid();
  if c.id is null or length(trim(coalesce(c.name,'')))<2 then
    raise exception using errcode='22023',message='PROFILE_REQUIRED';
  end if;
  select * into a from public.customer_addresses where id=p_address_id and user_id=auth.uid();
  if a.id is null or length(trim(a.address))=0 then raise exception using errcode='42501',message='ADDRESS_REQUIRED'; end if;
  if a.latitude is null or a.longitude is null then raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception using errcode='22023',message='INVALID_CART'; end if;
  if jsonb_array_length(p_items) not between 1 and 100 then raise exception using errcode='22023',message='INVALID_CART'; end if;

  select r.branch_id,r.distance_km,r.delivery_fee into branch,branch_distance,shipping_price
  from public.find_delivery_branch(a.latitude::double precision,a.longitude::double precision) r limit 1;
  if branch is null then raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE'; end if;

  select * into b from public.branches where id=branch and active and delivery_enabled for share;
  if b.id is null then raise exception using errcode='22023',message='DELIVERY_UNAVAILABLE'; end if;
  select s.inventory_branch_id,s.pricing_branch_id into inventory_branch,pricing_branch
  from private.resolve_branch_sources(b.id) s;
  shipping_price:=coalesce(shipping_price,b.delivery_fee,0);

  for x in select value from jsonb_array_elements(p_items) order by value->>'product_id',value->>'is_bulk' loop
    if jsonb_typeof(x->'quantity') is distinct from 'number' or jsonb_typeof(x->'is_bulk') is distinct from 'boolean' then
      raise exception using errcode='22023',message='INVALID_CART';
    end if;
    qty:=(x->>'quantity')::numeric; bulk:=(x->>'is_bulk')::boolean;
    if qty<>trunc(qty) or qty not between 1 and 100000 then raise exception using errcode='22023',message='INVALID_QUANTITY'; end if;

    select * into p from public.products where id=(x->>'product_id')::uuid for update;
    if p.id is null then raise exception using errcode='22023',message='PRODUCT_UNAVAILABLE'; end if;
    weight:=coalesce(p.barcode_type='scale' or coalesce(p.unit_of_measure,'') in ('weight','kg','كيلوجرام','كجم'),false);
    if coalesce(x->>'unit_of_measure','piece')<>(case when weight then 'weight' else 'piece' end) then
      raise exception using errcode='22023',message='PRODUCT_UNIT_CHANGED';
    end if;

    select * into bp from public.branch_product_pricing
    where branch_id=pricing_branch and product_id=p.id for share;
    price:=case when bp.id is not null
                then case when bp.is_offer and bp.offer_price is not null then bp.offer_price else bp.sale_price end
                else case when p.is_offer and p.offer_price is not null then p.offer_price else p.price end end;

    units:=qty;
    if bulk then
      if weight or not coalesce(p.bulk_enabled,false) or coalesce(p.bulk_quantity,0)<=0 or p.bulk_price is null then
        raise exception using errcode='22023',message='BULK_UNAVAILABLE';
      end if;
      price:=p.bulk_price; units:=qty*p.bulk_quantity;
    elsif weight then units:=qty/1000; end if;

    if coalesce((select i.quantity from public.inventory i where i.branch_id=inventory_branch and i.product_id=p.id),0)<units then
      raise exception using errcode='22023',message='INSUFFICIENT_STOCK',detail=p.id::text;
    end if;
    if price is null or price<0 then raise exception using errcode='22023',message='PRICE_UNAVAILABLE'; end if;

    line_total:=round(price*(case when weight then units else qty end),2);
    subtotal:=subtotal+line_total;
    lines:=lines||jsonb_build_array(jsonb_build_object(
      'product_id',p.id,'name',p.name,'product_name',p.name,
      'barcode',case when bulk then p.bulk_barcode else p.barcode end,
      'image_url',p.image_urls[1],
      'quantity',case when weight then units else qty end,'price',price,'total',line_total,
      'is_bulk',bulk,'bulk_quantity',p.bulk_quantity,
      'unit_of_measure',case when weight then 'weight' else 'piece' end,
      'is_weight_based',weight,'stock_quantity',units));
  end loop;

  select jsonb_agg(jsonb_build_object('product_id',id,'quantity',quantity,'branch_id',inventory_branch) order by id)
  into deductions
  from (select value->>'product_id' id,sum((value->>'stock_quantity')::numeric) quantity
        from jsonb_array_elements(lines) group by 1) s;

  perform 1 from public.special_offers where offer_type='free_delivery' and active for share;
  select exists(select 1 from public.special_offers where offer_type='free_delivery' and active
    and usage_limit is null and coalesce(min_order_amount,0)<=subtotal
    and (expiry_date is null or expiry_date >= (now() at time zone 'Africa/Cairo')::date)) into free_delivery;
  if free_delivery then shipping_price:=0; end if;

  shipping:=jsonb_build_object('address_id',a.id,'address',a.address,'latitude',a.latitude,'longitude',a.longitude,
    'assigned_branch_id',branch,'distance_km',round(branch_distance::numeric,3));

  result:=jsonb_build_object('items',lines,'subtotal',subtotal,'shipping_cost',shipping_price,
    'total',subtotal+shipping_price,'free_delivery',free_delivery,'branch_id',b.id,
    'inventory_branch_id',inventory_branch,'pricing_branch_id',pricing_branch,
    'delivery_location_id',null,'customer_id',c.id,
    'customer_snapshot',jsonb_build_object('name',trim(c.name),'phone',c.phone),
    'shipping_snapshot',shipping,'stock_deductions',deductions);
  return result||jsonb_build_object('quote_token',md5(result::text));
end;
$$;
