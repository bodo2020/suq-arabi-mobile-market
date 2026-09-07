-- Enable the authoritative customer checkout path after the customer app was moved
-- from direct online_orders inserts to quote_customer_order/place_customer_order.

update private.customer_checkout_rollout
set enabled = true
where singleton = true;

-- Customers must create orders only through the secure RPC. Admins keep their
-- existing order_management policy for operational workflows.
drop policy if exists customer_order_insert on public.online_orders;

grant execute on function public.quote_customer_order(jsonb, uuid) to authenticated;
grant execute on function public.place_customer_order(uuid, jsonb, uuid, text, text, text) to authenticated;
