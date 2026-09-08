drop function if exists public.reconcile_customer_checkout_attempt(uuid);
create function public.reconcile_customer_checkout_attempt(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
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
end $$;
revoke all on function public.reconcile_customer_checkout_attempt(uuid) from public,anon;
grant execute on function public.reconcile_customer_checkout_attempt(uuid) to authenticated;
