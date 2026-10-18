-- Independent saved store baskets; retain authenticated identity checks and RLS.
CREATE OR REPLACE FUNCTION public.get_customer_marketplace_store_catalog_v2(p_branch_id uuid, p_product_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 200)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.branches b
    join public.merchants m on m.id=b.merchant_id
    where b.id=p_branch_id
      and b.marketplace_customer_enabled
      and b.active
      and m.status='active'
      and m.merchant_type in ('partner','franchise')
      and m.customer_published_at is not null
  ) then
    raise exception using errcode='22023',message='MARKETPLACE_STORE_UNAVAILABLE';
  end if;

  return query
  select
    (
      to_jsonb(p)
      - 'purchase_price'
      - 'expiry_date'
      - 'shelf_location'
      - 'track_expiry'
      - 'owner_merchant_id'
    )
    || jsonb_build_object(
      'price',bp.sale_price,
      'offer_price',case when coalesce(bp.is_offer,false) then bp.offer_price else null end,
      'is_offer',coalesce(bp.is_offer,false),
      'quantity',private.business_sellable_quantity_v1(ml.branch_id,ml.product_id),
      'availability_mode',case when private.business_manual_order_limit_v1(ml.branch_id,ml.product_id) is null then 'stock' else 'manual' end,
      'max_order_quantity',private.business_manual_order_limit_v1(ml.branch_id,ml.product_id),
      'bulk_enabled',false,
      'bulk_quantity',null,
      'bulk_price',null,
      'bulk_barcode',null,
      'marketplace_listing_id',ml.id,
      'merchant_id',ml.merchant_id,
      'merchant_name',m.name,
      'marketplace_branch_id',b.id,
      'marketplace_branch_name',b.name,
      'preparation_minutes',ml.preparation_minutes,
      'business_profile',m.business_profile,
      'commerce_source','marketplace',
      'catalog_scope','partner',
      'fallback_reason',case
        when nullif(btrim(coalesce(p.barcode,'')),'') is not null
         and exists (
           select 1
           from public.products ep
           where ep.catalog_scope='elmadawy'
             and ep.archived_at is null
             and ep.barcode=p.barcode
         )
        then 'elmadawy_out_of_stock'
        else 'partner_unique_product'
      end
    )
  from public.merchant_listings ml
  join public.merchants m on m.id=ml.merchant_id
  join public.branches b on b.id=ml.branch_id
  join public.products p on p.id=ml.product_id
  join public.branch_product_pricing bp
    on bp.branch_id=ml.branch_id and bp.product_id=ml.product_id
  join public.inventory i
    on i.branch_id=ml.branch_id and i.product_id=ml.product_id
  where ml.branch_id=p_branch_id
    and ml.marketplace_customer_enabled=true
    and ml.status='active'
    and b.marketplace_customer_enabled=true
    and b.active=true
    and m.status='active'
    and m.customer_published_at is not null
    and p.archived_at is null
    and p.catalog_scope='partner'
    and p.owner_merchant_id=ml.merchant_id
    and private.business_sellable_quantity_v1(ml.branch_id,ml.product_id)>0
    and bp.sale_price>=0
    and (p_product_id is null or p.id=p_product_id)
    and (
      p_search is null
      or btrim(p_search)=''
      or p.name ilike '%'||btrim(p_search)||'%'
      or coalesce(p.barcode,'')=btrim(p_search)
    )
    and (
      nullif(btrim(coalesce(p.barcode,'')),'') is null
      or not exists (
        select 1
        from public.products ep
        join public.branches hub on hub.id=b.hub_branch_id
        join public.merchants em
          on em.id=hub.merchant_id
         and em.merchant_type='owned'
         and em.status='active'
        join public.inventory ei
          on ei.branch_id=coalesce(hub.inventory_source_branch_id,hub.id)
         and ei.product_id=ep.id
        where ep.catalog_scope='elmadawy'
          and ep.archived_at is null
          and ep.barcode=p.barcode
          and private.inventory_available_quantity_v1(ei.branch_id,ei.product_id)>0
      )
    )
  order by p.name,ml.created_at
  limit greatest(1,least(coalesce(p_limit,200),500));
end;
$function$;

CREATE OR REPLACE FUNCTION public.replace_customer_cart(p_items jsonb, p_expected_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_customer uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_expected_user_id is distinct from auth.uid() then raise exception 'Session changed' using errcode='42501'; end if;
  select id into strict v_customer from public.customers where user_id=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(v_customer::text,0));
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>300 then
    raise exception 'Invalid cart' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_items) x
    where jsonb_typeof(x)<>'object' or x->>'product_id' is null
      or coalesce(jsonb_typeof(x->'quantity'),'null')<>'number'
      or (x->>'quantity')::numeric<=0 or (x->>'quantity')::numeric<>trunc((x->>'quantity')::numeric)
      or coalesce(jsonb_typeof(x->'metadata'),'null')<>'object'
      or coalesce(x->'metadata'->>'source_kind','owned') not in ('owned','marketplace')
  ) then raise exception 'Invalid cart item' using errcode='22023'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_items) x
    where coalesce(x->'metadata'->>'source_kind','owned')='marketplace'
      and (nullif(x->'metadata'->>'merchant_id','') is null or nullif(x->'metadata'->>'branch_id','') is null or nullif(x->'metadata'->>'listing_id','') is null)
  ) then raise exception 'Marketplace cart source required' using errcode='22023'; end if;

  -- Persist independent baskets. Combined checkout validates hub, pickup limits,
  -- merchant eligibility, prices and stock only for the sources being purchased.
  delete from public.cart_items where customer_id=v_customer or user_id=auth.uid();
  insert into public.cart_items(customer_id,product_id,quantity,metadata)
  select v_customer,(x->>'product_id')::uuid,(x->>'quantity')::integer,
    jsonb_build_object(
      'is_bulk',coalesce((x->'metadata'->>'is_bulk')::boolean,false),
      'unit_of_measure',nullif(x->'metadata'->>'unit_of_measure',''),
      'source_kind',coalesce(x->'metadata'->>'source_kind','owned'),
      'merchant_id',nullif(x->'metadata'->>'merchant_id',''),
      'merchant_name',nullif(x->'metadata'->>'merchant_name',''),
      'branch_id',nullif(x->'metadata'->>'branch_id',''),
      'branch_name',nullif(x->'metadata'->>'branch_name',''),
      'listing_id',nullif(x->'metadata'->>'listing_id','')
    )
  from jsonb_array_elements(p_items) x;
end;
$function$;


-- Public storefront identity uses only customer-facing fields of eligible stores.
CREATE OR REPLACE FUNCTION public.get_customer_marketplace_stores_v1(p_latitude double precision, p_longitude double precision, p_branch_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_latitude is null or p_longitude is null
     or p_latitude<-90 or p_latitude>90
     or p_longitude<-180 or p_longitude>180 then
    raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED';
  end if;

  return query
  select jsonb_build_object(
    'merchant_id',m.id,
    'merchant_name',m.name,
    'merchant_type',m.merchant_type,
    'business_profile',m.business_profile,
    'logo_url',profile.logo_url,
    'business_category',profile.business_category,
    'branch_id',b.id,
    'branch_name',b.name,
    'address',b.address,
    'pickup_address',b.address,
    'pickup_latitude',b.latitude,
    'pickup_longitude',b.longitude,
    'zone_id',null,
    'zone_name','تغطية '||fd.branch_name,
    'coverage_source_branch_id',fd.branch_id,
    'coverage_source_branch_name',fd.branch_name,
    'delivery_fee',coalesce(fd.delivery_fee,0),
    'estimated_time',null,
    'estimated_delivery_minutes',fd.estimated_delivery_minutes,
    'min_order_amount',coalesce(b.min_order_amount,0),
    'distance_km',round(fd.distance_km::numeric,3),
    'available_products',(
      select count(*)
      from public.merchant_listings mlx
      join public.inventory ix
        on ix.branch_id=mlx.branch_id and ix.product_id=mlx.product_id
      where mlx.branch_id=b.id
        and mlx.marketplace_customer_enabled
        and mlx.status='active'
        and private.business_sellable_quantity_v1(ix.branch_id,ix.product_id)>0
    )
  )
  from public.branches b
  join public.merchants m on m.id=b.merchant_id
  left join private.partner_store_profiles_v1 profile on profile.merchant_id=m.id
  join lateral public.find_delivery_branch(p_latitude,p_longitude) fd
    on fd.branch_id=b.hub_branch_id
  where b.marketplace_customer_enabled=true
    and b.active=true
    and b.latitude is not null
    and b.longitude is not null
    and (p_branch_id is null or b.id=p_branch_id)
    and m.merchant_type in ('partner','franchise')
    and m.status='active'
    and m.customer_published_at is not null
    and exists (
      select 1
      from public.merchant_listings ml
      join public.branch_product_pricing bp
        on bp.branch_id=ml.branch_id and bp.product_id=ml.product_id
      join public.inventory i
        on i.branch_id=ml.branch_id and i.product_id=ml.product_id
      where ml.branch_id=b.id
        and ml.marketplace_customer_enabled=true
        and ml.status='active'
        and bp.sale_price>=0
        and private.business_sellable_quantity_v1(i.branch_id,i.product_id)>0
    )
  order by fd.distance_km asc,m.name,b.name
  limit greatest(1,least(coalesce(p_limit,20),50));
end;
$function$;


-- Do not reuse previous hub-origin route quotes after routing changes.
CREATE OR REPLACE FUNCTION public.get_cached_delivery_road_quote_v1(p_hub_branch_id uuid, p_partner_branch_ids uuid[], p_has_owned boolean, p_customer_latitude double precision, p_customer_longitude double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_ids uuid[];
  q private.delivery_road_quotes_v1%rowtype;
begin
  select coalesce(array_agg(x order by x),'{}'::uuid[])
  into v_partner_ids
  from (
    select distinct unnest(coalesce(p_partner_branch_ids,'{}'::uuid[])) x
  ) s;

  select * into q
  from private.delivery_road_quotes_v1 r
  where r.hub_branch_id=p_hub_branch_id
    and r.partner_branch_ids=v_partner_ids
    and r.has_owned=coalesce(p_has_owned,false)
    and abs(r.customer_latitude-p_customer_latitude)<=0.00002
    and abs(r.customer_longitude-p_customer_longitude)<=0.00002
    and r.expires_at>now()+interval '45 seconds'
    and r.metadata->>'route_version'='store-origin-v2'
  order by r.created_at desc
  limit 1;

  if q.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'route_quote_id',q.id,
    'hub_branch_id',q.hub_branch_id,
    'partner_branch_ids',q.partner_branch_ids,
    'ordered_partner_branch_ids',q.ordered_partner_branch_ids,
    'has_owned',q.has_owned,
    'baseline_distance_km',q.baseline_distance_km,
    'baseline_duration_minutes',q.baseline_duration_minutes,
    'route_distance_km',q.route_distance_km,
    'detour_km',q.detour_km,
    'route_duration_minutes',q.route_duration_minutes,
    'provider',q.provider,
    'degraded',q.degraded,
    'stops',q.stops,
    'expires_at',q.expires_at,
    'cached',true
  );
end;
$function$;
