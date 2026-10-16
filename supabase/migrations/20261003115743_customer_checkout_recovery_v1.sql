-- Read-only recovery using the same advisory locks as checkout finalization.
-- No prices, inventory or financial records are changed by this RPC.
create or replace function public.recover_customer_checkout_v1(p_kind text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_customer uuid;
  v_order public.online_orders%rowtype;
  v_group private.order_groups_v1%rowtype;
  v_children jsonb;
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTH_REQUIRED'; end if;
  if p_request_id is null or p_kind is null or p_kind not in ('owned','marketplace','combined') then
    raise exception using errcode='22023', message='INVALID_CHECKOUT_ATTEMPT';
  end if;
  select c.id into v_customer from public.customers c where c.user_id=auth.uid() order by c.created_at desc limit 1;
  if v_customer is null then raise exception using errcode='42501', message='PROFILE_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,
    case p_kind when 'owned' then 3 when 'marketplace' then 9 else 11 end));

  if p_kind='combined' then
    select * into v_group from private.order_groups_v1 g where g.id=p_request_id and g.customer_id=v_customer;
    if not found then return jsonb_build_object('exists',false); end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'order_id',g.order_id,'source_kind',g.source_kind,'branch_id',g.branch_id,
      'merchant_id',g.merchant_id,'subtotal',g.product_subtotal
    ) order by g.created_at,g.order_id),'[]'::jsonb)
    into v_children from private.order_group_orders_v1 g where g.group_id=v_group.id;
    return jsonb_build_object('exists',true,'order',jsonb_build_object(
      'id',v_group.id,'order_group_id',v_group.id,
      'tracking_number','G-'||upper(substr(replace(v_group.id::text,'-',''),1,12)),
      'subtotal',v_group.subtotal,'shipping_cost',v_group.customer_delivery_fee,
      'delivery_cost',v_group.delivery_cost,'total',v_group.total,'amount_due',v_group.total,
      'stores_count',v_group.stores_count,'partner_stores_count',v_group.partner_stores_count,
      'source_kind','combined','orders',v_children
    ));
  end if;

  select * into v_order from public.online_orders o
  where o.id=p_request_id and o.customer_id=v_customer
    and (case when p_kind='marketplace' then o.source_channel='marketplace'
         else coalesce(o.source_channel,'')<>'marketplace' end);
  if not found then return jsonb_build_object('exists',false); end if;
  return jsonb_build_object('exists',true,'order',jsonb_build_object(
    'id',v_order.id,'tracking_number',v_order.tracking_number,'total',v_order.total,
    'loyalty_voucher_amount',coalesce(v_order.loyalty_voucher_amount,0),
    'amount_due',greatest(0,coalesce(v_order.total,0)-coalesce(v_order.loyalty_voucher_amount,0)),
    'merchant_id',v_order.merchant_id,'merchant_name',v_order.shipping_snapshot->>'merchant_name',
    'source_kind',p_kind
  ));
end;
$$;
revoke all on function public.recover_customer_checkout_v1(text,uuid) from public, anon;
grant execute on function public.recover_customer_checkout_v1(text,uuid) to authenticated;
comment on function public.recover_customer_checkout_v1(text,uuid) is 'Owner-scoped read-only reconciliation of owned, marketplace and combined checkout responses.';
