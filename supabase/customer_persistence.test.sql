-- Run after customer_persistence.sql inside BEGIN ... ROLLBACK only.
create temporary table persistence_fixture as select gen_random_uuid() u1,gen_random_uuid() u2,
  gen_random_uuid() product,gen_random_uuid() a1,gen_random_uuid() a2;
grant select on persistence_fixture to authenticated,anon;
insert into auth.users(id,raw_user_meta_data) select u1,'{"name":"Persistence test A"}'::jsonb from persistence_fixture;
insert into auth.users(id,raw_user_meta_data) select u2,'{"name":"Persistence test B"}'::jsonb from persistence_fixture;
insert into public.products(id,name,price,purchase_price,quantity) select product,'Temporary persistence fixture',10,5,100 from persistence_fixture;
insert into public.customer_addresses(id,user_id,address,is_default) select a1,u1,'Temporary A',true from persistence_fixture;
insert into public.customer_addresses(id,user_id,address,is_default) select a2,u2,'Temporary B',true from persistence_fixture;
select set_config('request.jwt.claim.sub',(select u1::text from persistence_fixture),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare f record; previous_count integer; begin
  select * into f from persistence_fixture;
  perform public.replace_customer_cart(jsonb_build_array(jsonb_build_object('product_id',f.product,'quantity',2,'metadata','{}'::jsonb),
    jsonb_build_object('product_id',f.product,'quantity',1,'metadata','{"is_bulk":true}'::jsonb)),auth.uid());
  if (select count(*) from public.cart_items where product_id=f.product)<>2 then raise exception 'Variant persistence failed'; end if;
  begin
    perform public.replace_customer_cart(jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid(),'quantity',1,'metadata','{}'::jsonb)),auth.uid());
    raise exception 'Invalid product unexpectedly saved';
  exception when foreign_key_violation then null; end;
  if (select sum(quantity) from public.cart_items where product_id=f.product)<>3 then raise exception 'Failed replacement lost saved cart'; end if;
  begin
    perform public.replace_customer_cart('[{"product_id":null,"quantity":0,"metadata":{}}]'::jsonb,auth.uid());
    raise exception 'Invalid quantity accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.replace_customer_cart('[]'::jsonb,f.u2);
    raise exception 'Stale-session cart write accepted';
  exception when insufficient_privilege then null; end;
  perform public.set_customer_favorite(f.product,true);
  perform public.set_customer_favorite(f.product,true);
  if (select count(*) from public.favorites where product_id=f.product)<>1 then raise exception 'Favorite retry duplicated data'; end if;
  perform public.set_default_customer_address(f.a1);
  begin
    perform public.set_default_customer_address(f.a2);
    raise exception 'Foreign address accepted';
  exception when no_data_found then null; end;
  if not (select is_default from public.customer_addresses where id=f.a1) then raise exception 'Default address lost on failure'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select u2::text from persistence_fixture),true);
set local role authenticated;
do $$ declare f record; begin
  select * into f from persistence_fixture;
  if exists(select 1 from public.cart_items where product_id=f.product) then raise exception 'Cross-user cart leak'; end if;
  if exists(select 1 from public.favorites where product_id=f.product) then raise exception 'Cross-user favorites leak'; end if;
  if exists(select 1 from public.customer_addresses where id=f.a1) then raise exception 'Cross-user address leak'; end if;
end $$;
reset role;
-- Exercise the real routing trigger and check the deferred FK before rollback.
insert into public.online_orders(customer_id,total,shipping_cost,shipping_address,items)
select c.id,10,0,'Temporary test order','[]'::jsonb from public.customers c join persistence_fixture f on c.user_id=f.u1;
set constraints all immediate;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.online_orders where shipping_address='Temporary test order') then raise exception 'Cross-user order leak'; end if;
  update public.online_orders set total=0 where shipping_address='Temporary test order';
  if found then raise exception 'Cross-user order update allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
  if exists(select 1 from public.online_orders where shipping_address='Temporary test order') then raise exception 'Anonymous order leak'; end if;
  begin
    perform public.replace_customer_cart('[]'::jsonb,auth.uid());
    raise exception 'Anonymous cart RPC allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: atomic replacement, variants, retry idempotence, address ownership, customer isolation, anonymous denial' as result;
