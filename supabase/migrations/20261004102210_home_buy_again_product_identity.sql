-- Preserve owner-scoped history and include stable IDs for in-store repurchase.
CREATE OR REPLACE FUNCTION public.get_my_purchase_history(p_limit integer DEFAULT 100)
 RETURNS SETOF jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (
    select c.id customer_id
    from public.customers c
    where c.user_id=auth.uid()
    order by c.created_at desc
    limit 1
  ),
  store_sales as (
    select jsonb_build_object(
      'id',s.id,
      'source_channel','store',
      'status','store_completed',
      'total',s.total,
      'shipping_address',null,
      'shipping_cost',0,
      'payment_method',s.payment_method,
      'payment_status','paid',
      'notes',null,
      'tracking_number',s.invoice_number,
      'delivery_person',null,
      'branch_id',s.branch_id,
      'branch_name',b.name,
      'loyalty_points_earned',coalesce(s.loyalty_points_earned,0),
      'created_at',coalesce(s.date,s.created_at),
      'updated_at',s.updated_at,
      'is_multi_store',false,
      'order_group_id',null,
      'stores_count',1,
      'partner_stores_count',0,
      'group_orders','[]'::jsonb,
      'items',coalesce((
        select jsonb_agg(jsonb_build_object(
          'product_id',coalesce(x.value->'product'->>'id',x.value->>'product_id'),
          'name',coalesce(x.value->'product'->>'name','منتج'),
          'quantity',case when nullif(x.value->>'weight','') is not null then (x.value->>'weight')::numeric else coalesce((x.value->>'quantity')::numeric,1) end,
          'price',coalesce((x.value->>'price')::numeric,0),
          'total',coalesce((x.value->>'total')::numeric,0),
          'image_url',x.value->'product'->'image_urls'->>0,
          'unit_of_measure',case when nullif(x.value->>'weight','') is not null then 'weight' else 'piece' end,
          'is_bulk',coalesce((x.value->>'isBulk')::boolean,false),
          'bulk_quantity',case when coalesce((x.value->>'isBulk')::boolean,false) then nullif(x.value->'product'->>'bulk_quantity','')::numeric else null end
        ) order by x.ordinality)
        from jsonb_array_elements(coalesce(s.items,'[]'::jsonb)) with ordinality as x(value,ordinality)
      ),'[]'::jsonb)
    ) item,
    coalesce(s.date,s.created_at) sort_at
    from public.sales s
    join me on me.customer_id=s.customer_id
    left join public.branches b on b.id=s.branch_id
  ),
  online_single as (
    select jsonb_build_object(
      'id',o.id,
      'source_channel','online',
      'status',o.status,
      'total',o.total,
      'shipping_address',o.shipping_address,
      'shipping_cost',o.shipping_cost,
      'payment_method',o.payment_method,
      'payment_status',o.payment_status,
      'items',coalesce(o.items,'[]'::jsonb),
      'notes',o.notes,
      'tracking_number',o.tracking_number,
      'delivery_person',o.delivery_person,
      'branch_id',o.branch_id,
      'branch_name',b.name,
      'loyalty_points_earned',coalesce(o.loyalty_points_earned,0),
      'created_at',o.created_at,
      'updated_at',o.updated_at,
      'is_multi_store',false,
      'order_group_id',null,
      'stores_count',1,
      'partner_stores_count',0,
      'group_orders','[]'::jsonb
    ) item,
    o.created_at sort_at
    from public.online_orders o
    join me on me.customer_id=o.customer_id
    left join public.branches b on b.id=o.branch_id
    where o.order_group_id is null
  ),
  grouped as (
    select
      g.id,
      g.created_at,
      g.updated_at,
      g.total,
      g.customer_delivery_fee,
      g.payment_method,
      g.payment_status,
      g.hub_branch_id,
      g.stores_count,
      g.partner_stores_count,
      g.metadata,
      g.quote_snapshot,
      hb.name hub_branch_name,
      (
        select case
          when bool_and(o.status::text='cancelled') then 'cancelled'
          when bool_and(o.status::text='delivered') then 'delivered'
          when bool_or(o.status::text='shipped')
               or coalesce((select r.status from private.delivery_routes_v1 r where r.order_group_id=g.id),'') in ('on_the_way','arrived','delivered')
            then 'shipped'
          when bool_and(o.status::text='ready') then 'ready'
          when bool_or(o.status::text in ('preparing','ready')) then 'preparing'
          when bool_and(o.status::text in ('confirmed','ready')) then 'confirmed'
          else 'pending'
        end
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        where go.group_id=g.id
      ) derived_status,
      coalesce(
        (select max(o.shipping_address)
         from private.order_group_orders_v1 go
         join public.online_orders o on o.id=go.order_id
         where go.group_id=g.id),
        g.quote_snapshot->'shipping_snapshot'->>'address'
      ) shipping_address,
      (
        select max(o.delivery_person)
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        where go.group_id=g.id
      ) delivery_person,
      coalesce((
        select sum(coalesce(o.loyalty_points_earned,0))
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        where go.group_id=g.id
      ),0) loyalty_points_earned,
      (
        select max(o.updated_at)
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        where go.group_id=g.id
      ) child_updated_at,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'order_id',o.id,
          'source_kind',go.source_kind,
          'merchant_id',go.merchant_id,
          'merchant_name',m.name,
          'branch_id',go.branch_id,
          'branch_name',b.name,
          'status',o.status,
          'total',o.total,
          'subtotal',go.product_subtotal,
          'pickup_sequence',go.pickup_sequence
        ) order by coalesce(go.pickup_sequence,999),go.created_at)
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        join public.merchants m on m.id=go.merchant_id
        join public.branches b on b.id=go.branch_id
        where go.group_id=g.id
      ),'[]'::jsonb) group_orders,
      coalesce((
        select jsonb_agg(
          item.value || jsonb_build_object(
            'source_kind',go.source_kind,
            'merchant_id',go.merchant_id,
            'merchant_name',m.name,
            'branch_id',go.branch_id,
            'branch_name',b.name
          )
          order by coalesce(go.pickup_sequence,999),go.created_at,item.ordinality
        )
        from private.order_group_orders_v1 go
        join public.online_orders o on o.id=go.order_id
        join public.merchants m on m.id=go.merchant_id
        join public.branches b on b.id=go.branch_id
        cross join lateral jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) with ordinality item(value,ordinality)
        where go.group_id=g.id
      ),'[]'::jsonb) items
    from private.order_groups_v1 g
    join me on me.customer_id=g.customer_id
    join public.branches hb on hb.id=g.hub_branch_id
  ),
  online_groups as (
    select jsonb_build_object(
      'id',g.id,
      'source_channel','online',
      'status',g.derived_status,
      'total',g.total,
      'shipping_address',g.shipping_address,
      'shipping_cost',g.customer_delivery_fee,
      'payment_method',g.payment_method,
      'payment_status',g.payment_status,
      'items',g.items,
      'notes',g.metadata->>'notes',
      'tracking_number','G-'||upper(substr(replace(g.id::text,'-',''),1,12)),
      'delivery_person',g.delivery_person,
      'branch_id',g.hub_branch_id,
      'branch_name',g.hub_branch_name,
      'loyalty_points_earned',g.loyalty_points_earned,
      'created_at',g.created_at,
      'updated_at',greatest(g.updated_at,coalesce(g.child_updated_at,g.updated_at)),
      'is_multi_store',true,
      'order_group_id',g.id,
      'stores_count',g.stores_count,
      'partner_stores_count',g.partner_stores_count,
      'group_orders',g.group_orders
    ) item,
    g.created_at sort_at
    from grouped g
  )
  select item
  from (
    select * from store_sales
    union all
    select * from online_single
    union all
    select * from online_groups
  ) q
  order by sort_at desc
  limit greatest(1,least(coalesce(p_limit,100),500));
$function$
