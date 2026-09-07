-- Applied with Supabase's migration tool; kept here because the CLI is unavailable.
-- All RPCs run as the caller and retain table RLS.
drop function if exists public.replace_customer_cart(jsonb);
create or replace function public.replace_customer_cart(p_items jsonb,p_expected_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_customer uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_expected_user_id is distinct from auth.uid() then raise exception 'Session changed' using errcode='42501'; end if;
  select id into strict v_customer from public.customers where user_id=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(v_customer::text, 0));
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Cart must be an array' using errcode='22023';
  end if;
  if jsonb_array_length(p_items)>300 then raise exception 'Cart too large' using errcode='22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where
    jsonb_typeof(x)<>'object' or x->>'product_id' is null or
    coalesce(jsonb_typeof(x->'quantity'),'null')<>'number' or
    (x->>'quantity')::numeric<=0 or (x->>'quantity')::numeric<>trunc((x->>'quantity')::numeric) or
    (x->>'quantity')::numeric>2147483647 or
    coalesce(jsonb_typeof(x->'metadata'),'null')<>'object') then
    raise exception 'Invalid cart item' using errcode='22023';
  end if;
  delete from public.cart_items where customer_id=v_customer or user_id=auth.uid();
  insert into public.cart_items(customer_id,product_id,quantity,metadata)
  select v_customer,(x->>'product_id')::uuid,(x->>'quantity')::integer,
    jsonb_build_object('is_bulk',coalesce((x->'metadata'->>'is_bulk')::boolean,false),
      'unit_of_measure',nullif(x->'metadata'->>'unit_of_measure',''))
  from jsonb_array_elements(p_items) x;
  -- Any failed insert rolls back the preceding delete in the same transaction.
end;
$$;
revoke all on function public.replace_customer_cart(jsonb,uuid) from public,anon;
grant execute on function public.replace_customer_cart(jsonb,uuid) to authenticated;

create or replace function public.set_customer_favorite(p_product_id uuid,p_favorite boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_customer uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_favorite is null then raise exception 'Favorite state required' using errcode='22023'; end if;
  select id into strict v_customer from public.customers where user_id=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(v_customer::text, 0));
  if p_favorite then
    if not exists(select 1 from public.favorites where product_id=p_product_id and (customer_id=v_customer or user_id=auth.uid())) then
      insert into public.favorites(customer_id,user_id,product_id) values(v_customer,auth.uid(),p_product_id);
    end if;
  else
    delete from public.favorites where product_id=p_product_id and (customer_id=v_customer or user_id=auth.uid());
  end if;
end;
$$;
revoke all on function public.set_customer_favorite(uuid,boolean) from public,anon;
grant execute on function public.set_customer_favorite(uuid,boolean) to authenticated;

create or replace function public.set_default_customer_address(p_address_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_address public.customer_addresses;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
  select * into strict v_address from public.customer_addresses where id=p_address_id and user_id=auth.uid();
  update public.customer_addresses set is_default=(id=p_address_id),updated_at=now() where user_id=auth.uid();
  update public.customers set address=v_address.address,governorate_id=v_address.governorate_id,
    city_id=v_address.city_id,area_id=v_address.area_id,neighborhood_id=v_address.neighborhood_id
  where user_id=auth.uid();
end;
$$;
revoke all on function public.set_default_customer_address(uuid) from public,anon;
grant execute on function public.set_default_customer_address(uuid) to authenticated;

-- A row with both ownership columns must belong to the SAME caller through both.
do $$
declare t text; p record; owner_check text;
begin
  foreach t in array array['cart_items','favorites'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    owner_check := format('(user_id is null or user_id=auth.uid()) and (customer_id is null or exists(select 1 from public.customers c where c.id=%I.customer_id and c.user_id=auth.uid())) and (user_id is not null or customer_id is not null)',t);
    execute format('create policy customer_select on public.%I for select to authenticated using ((%s) or public.is_admin() or public.is_super_admin())',t,owner_check);
    execute format('create policy customer_insert on public.%I for insert to authenticated with check (%s)',t,owner_check);
    execute format('create policy customer_update on public.%I for update to authenticated using (%s) with check (%s)',t,owner_check,owner_check);
    execute format('create policy customer_delete on public.%I for delete to authenticated using (%s)',t,owner_check);
  end loop;
end $$;

-- Preserve management access while removing public order reads/updates.
-- Routing logs are created by the existing BEFORE INSERT trigger. Check their
-- order reference at commit, after the new order row exists, instead of inside it.
alter table public.order_routing_log alter constraint order_routing_log_order_id_fkey
  deferrable initially deferred;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='online_orders' loop
    execute format('drop policy %I on public.online_orders',p.policyname);
  end loop;
end $$;
create policy order_management on public.online_orders for all to authenticated
using (public.is_admin() or public.is_super_admin()) with check (public.is_admin() or public.is_super_admin());
create policy customer_order_select on public.online_orders for select to authenticated
using (exists(select 1 from public.customers c where c.id=online_orders.customer_id and c.user_id=auth.uid()));
create policy customer_order_insert on public.online_orders for insert to authenticated
with check (exists(select 1 from public.customers c where c.id=online_orders.customer_id and c.user_id=auth.uid())
  and status='pending' and payment_status='pending' and total>=0 and shipping_cost>=0
  and nullif(trim(shipping_address),'') is not null);
