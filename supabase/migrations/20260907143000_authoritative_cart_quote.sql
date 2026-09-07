create or replace function public.quote_customer_cart(
  p_items jsonb,
  p_latitude double precision,
  p_longitude double precision
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_branch_id uuid;
  v_inventory_branch_id uuid;
  v_pricing_branch_id uuid;
  v_branch_name text;
  v_distance_km double precision;
  v_shipping numeric := 0;
  v_min_order numeric := 0;
  v_free_delivery boolean := false;
  v_subtotal numeric := 0;
  v_lines jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product jsonb;
  v_qty numeric;
  v_stock numeric;
  v_units numeric;
  v_price numeric;
  v_line_total numeric;
  v_bulk boolean;
  v_weight boolean;
  v_bulk_qty numeric;
  v_expected_unit text;
begin
  if p_latitude is null or p_longitude is null then
    raise exception using errcode = '22023', message = 'DELIVERY_UNAVAILABLE';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception using errcode = '22023', message = 'DELIVERY_UNAVAILABLE';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'INVALID_CART';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception using errcode = '22023', message = 'INVALID_CART';
  end if;

  select r.branch_id, r.distance_km, r.delivery_fee
    into v_branch_id, v_distance_km, v_shipping
  from public.find_delivery_branch(p_latitude, p_longitude) r
  limit 1;

  if v_branch_id is null then
    raise exception using errcode = '22023', message = 'DELIVERY_UNAVAILABLE';
  end if;

  select b.name,
         b.inventory_source_branch_id,
         b.pricing_source_branch_id,
         coalesce(b.delivery_fee, 0),
         coalesce(b.min_order_amount, 0)
    into v_branch_name,
         v_inventory_branch_id,
         v_pricing_branch_id,
         v_shipping,
         v_min_order
  from public.branches b
  where b.id = v_branch_id
    and b.active = true
    and b.delivery_enabled = true;

  if not found then
    raise exception using errcode = '22023', message = 'DELIVERY_UNAVAILABLE';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item->'quantity') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'INVALID_CART';
    end if;
    if jsonb_typeof(v_item->'is_bulk') is distinct from 'boolean' then
      raise exception using errcode = '22023', message = 'INVALID_CART';
    end if;

    v_qty := (v_item->>'quantity')::numeric;
    v_bulk := (v_item->>'is_bulk')::boolean;

    if v_qty <= 0 or v_qty > 100000 or v_qty <> trunc(v_qty) then
      raise exception using errcode = '22023', message = 'INVALID_QUANTITY';
    end if;

    v_product := null;
    select c
      into v_product
    from public.get_customer_branch_catalog(
      v_branch_id,
      (v_item->>'product_id')::uuid,
      null,
      null,
      null,
      null,
      null,
      1
    ) c
    limit 1;

    if v_product is null then
      raise exception using errcode = '22023', message = 'PRODUCT_UNAVAILABLE';
    end if;

    v_stock := coalesce((v_product->>'quantity')::numeric, 0);
    v_weight := false;
    if coalesce(v_product->>'barcode_type', '') = 'scale' then
      v_weight := true;
    end if;
    if coalesce(v_product->>'unit_of_measure', '') in ('weight','kg','كيلوجرام','كجم') then
      v_weight := true;
    end if;

    if v_weight then
      v_expected_unit := 'weight';
    else
      v_expected_unit := 'piece';
    end if;

    if coalesce(v_item->>'unit_of_measure', 'piece') <> v_expected_unit then
      raise exception using errcode = '22023', message = 'PRODUCT_UNIT_CHANGED';
    end if;

    if coalesce((v_product->>'is_offer')::boolean, false)
       and v_product->>'offer_price' is not null then
      v_price := (v_product->>'offer_price')::numeric;
    else
      v_price := (v_product->>'price')::numeric;
    end if;

    if v_price is null or v_price < 0 then
      raise exception using errcode = '22023', message = 'PRICE_UNAVAILABLE';
    end if;

    if v_bulk then
      v_bulk_qty := coalesce((v_product->>'bulk_quantity')::numeric, 0);
      if v_weight then
        raise exception using errcode = '22023', message = 'BULK_UNAVAILABLE';
      end if;
      if not coalesce((v_product->>'bulk_enabled')::boolean, false) then
        raise exception using errcode = '22023', message = 'BULK_UNAVAILABLE';
      end if;
      if v_bulk_qty <= 0 or v_product->>'bulk_price' is null then
        raise exception using errcode = '22023', message = 'BULK_UNAVAILABLE';
      end if;
      v_units := v_qty * v_bulk_qty;
      if v_stock < v_units then
        raise exception using errcode = '22023', message = 'INSUFFICIENT_STOCK', detail = v_product->>'id';
      end if;
      v_price := (v_product->>'bulk_price')::numeric;
      v_line_total := round(v_price * v_qty, 2);
    elsif v_weight then
      v_units := v_qty / 1000.0;
      if v_stock < v_units then
        raise exception using errcode = '22023', message = 'INSUFFICIENT_STOCK', detail = v_product->>'id';
      end if;
      v_line_total := round(v_price * v_units, 2);
    else
      v_units := v_qty;
      if v_stock < v_units then
        raise exception using errcode = '22023', message = 'INSUFFICIENT_STOCK', detail = v_product->>'id';
      end if;
      v_line_total := round(v_price * v_qty, 2);
    end if;

    v_subtotal := v_subtotal + v_line_total;
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product->>'id',
        'name', v_product->>'name',
        'quantity', v_qty,
        'is_bulk', v_bulk,
        'unit_of_measure', v_expected_unit,
        'price', v_price,
        'total', v_line_total,
        'available_stock', v_stock,
        'bulk_quantity', case when v_product->>'bulk_quantity' is null then null else (v_product->>'bulk_quantity')::numeric end
      )
    );
  end loop;

  select exists(
    select 1
    from public.special_offers so
    where so.offer_type = 'free_delivery'
      and so.active = true
      and so.usage_limit is null
      and coalesce(so.min_order_amount, 0) <= v_subtotal
      and (so.expiry_date is null or so.expiry_date >= (now() at time zone 'Africa/Cairo')::date)
  ) into v_free_delivery;

  if v_free_delivery then
    v_shipping := 0;
  end if;

  return jsonb_build_object(
    'items', v_lines,
    'subtotal', round(v_subtotal, 2),
    'shipping_cost', round(coalesce(v_shipping, 0), 2),
    'total', round(v_subtotal + coalesce(v_shipping, 0), 2),
    'free_delivery', v_free_delivery,
    'delivery_branch_id', v_branch_id,
    'inventory_branch_id', v_inventory_branch_id,
    'pricing_branch_id', v_pricing_branch_id,
    'branch_name', v_branch_name,
    'distance_km', round(v_distance_km::numeric, 3),
    'min_order_amount', v_min_order,
    'minimum_order_met', v_subtotal >= v_min_order
  );
end;
$function$;

revoke all on function public.quote_customer_cart(jsonb,double precision,double precision) from public;
grant execute on function public.quote_customer_cart(jsonb,double precision,double precision) to anon, authenticated;
