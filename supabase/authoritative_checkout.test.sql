-- Execute the entire file inside BEGIN / ROLLBACK. No fixtures may be committed.
create temporary table checkout_fixture as select gen_random_uuid() u1,gen_random_uuid() u2,
  gen_random_uuid() admin_id,gen_random_uuid() product,gen_random_uuid() weight_product,
  gen_random_uuid() address,gen_random_uuid() foreign_address,gen_random_uuid() request_id;
grant select on checkout_fixture to authenticated,anon;
insert into auth.users(id,raw_user_meta_data) select u1,'{"name":"Checkout fixture"}'::jsonb from checkout_fixture;
insert into auth.users(id,raw_user_meta_data) select u2,'{"name":"Other fixture"}'::jsonb from checkout_fixture;
insert into auth.users(id,raw_user_meta_data) select admin_id,'{"name":"Admin fixture"}'::jsonb from checkout_fixture;
insert into public.users(id,name,username,password,role)
select admin_id,'Checkout fixture admin',admin_id::text,'unused-test-only','admin' from checkout_fixture;
insert into public.products(id,name,price,purchase_price,quantity,bulk_enabled,bulk_quantity,bulk_price,is_offer,offer_price)
select product,'Checkout temporary product',10,5,0,true,6,50,false,1 from checkout_fixture;
insert into public.products(id,name,price,purchase_price,quantity,barcode_type)
select weight_product,'Checkout temporary weight',40,20,0,'scale' from checkout_fixture;
update public.inventory set quantity=20 where product_id in(select product from checkout_fixture union all select weight_product from checkout_fixture);
insert into public.customer_addresses(id,user_id,address,latitude,longitude,neighborhood_id)
select f.address,f.u1,'Checkout temporary address',30.1,31.2,
  (select n.id from public.neighborhoods n join public.delivery_type_pricing d on d.delivery_location_id=n.id
    group by n.id having count(*)=1 limit 1) from checkout_fixture f;
insert into public.customer_addresses(id,user_id,address)
select foreign_address,u2,'Foreign checkout address' from checkout_fixture;
select set_config('request.jwt.claim.sub',(select u1::text from checkout_fixture),true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$ declare f record; payload jsonb; q jsonb; result jsonb; begin
  select * into f from checkout_fixture;
  payload:=jsonb_build_array(jsonb_build_object('product_id',f.product,'quantity',1,'is_bulk',false,'unit_of_measure','piece','price',0,'total',0));
  q:=public.quote_customer_order(payload,f.address);
  if (q->>'subtotal')::numeric<>10 then raise exception 'Client price or inactive offer trusted'; end if;
  begin
    perform public.place_customer_order(f.request_id,payload,f.address,'cash','',q->>'quote_token');
    raise exception 'Rollout guard failed';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.quote_customer_order(payload,f.foreign_address);
    raise exception 'Foreign address accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.online_orders(customer_id,total,items,checkout_version)
    values((q->>'customer_id')::uuid,0,'[]',1);
    raise exception 'Direct checkout marker forgery accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update private.customer_checkout_rollout set enabled=true;
set local role authenticated;
do $$ declare f record; payload jsonb; q jsonb; result jsonb; repeated jsonb; before_stock numeric; begin
  select * into f from checkout_fixture;
  payload:=jsonb_build_array(
    jsonb_build_object('product_id',f.product,'quantity',2,'is_bulk',false,'unit_of_measure','piece'),
    jsonb_build_object('product_id',f.product,'quantity',1,'is_bulk',true,'unit_of_measure','piece'),
    jsonb_build_object('product_id',f.weight_product,'quantity',250,'is_bulk',false,'unit_of_measure','weight'));
  q:=public.quote_customer_order(payload,f.address);
  if (q->>'subtotal')::numeric<>80 then raise exception 'Bulk or weight price incorrect'; end if;
  begin
    perform public.place_customer_order(f.request_id,payload,f.address,'cash','','tampered');
    raise exception 'Changed quote accepted';
  exception when invalid_parameter_value then null; end;
  result:=public.place_customer_order(f.request_id,payload,f.address,'wallet','Fixture note',q->>'quote_token');
  repeated:=public.place_customer_order(f.request_id,payload,f.address,'wallet','Fixture note',q->>'quote_token');
  if result<>repeated then raise exception 'Retry changed result'; end if;
  if (select count(*) from public.online_orders where id=f.request_id)<>1 then raise exception 'Duplicate order'; end if;
  if (select quantity from public.inventory where product_id=f.product and branch_id=(q->>'branch_id')::uuid)<>12 then
    raise exception 'Bulk stock or retry deduction wrong'; end if;
  if (select quantity from public.inventory where product_id=f.weight_product and branch_id=(q->>'branch_id')::uuid)<>19.75 then
    raise exception 'Weight rounded during deduction'; end if;
  if not exists(select 1 from public.online_orders where id=f.request_id and payment_status='pending'
    and customer_snapshot->>'name'='Checkout fixture' and (shipping_snapshot->>'latitude')::numeric=30.1) then
    raise exception 'Payment or immutable snapshot incorrect'; end if;
  begin
    perform public.place_customer_order(f.request_id,payload,f.address,'cash','Changed notes',q->>'quote_token');
    raise exception 'Changed request payload accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.quote_customer_order(jsonb_build_array(jsonb_build_object('product_id',f.product,'quantity',13,'is_bulk',false,'unit_of_measure','piece')),f.address);
    raise exception 'Overselling accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.quote_customer_order(jsonb_build_array(jsonb_build_object('product_id',f.product,'quantity',1,'is_bulk',false,'unit_of_measure','weight')),f.address);
    raise exception 'Client changed stock unit';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select u2::text from checkout_fixture),true);
set local role authenticated;
do $$ declare f record; begin
  select * into f from checkout_fixture;
  if exists(select 1 from public.online_orders where id=f.request_id) then raise exception 'Cross-user order leak'; end if;
  begin
    perform public.place_customer_order(f.request_id,'[]',f.foreign_address,'cash','','');
    raise exception 'Cross-user request reused';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select admin_id::text from checkout_fixture),true);
set local role authenticated;
do $$ declare f record; branch uuid; begin
  select * into f from checkout_fixture;
  select branch_id into branch from public.online_orders where id=f.request_id;
  begin
    update public.online_orders set total=0 where id=f.request_id;
    raise exception 'Committed checkout total editable';
  exception when invalid_parameter_value then null; end;
  update public.online_orders set status='cancelled' where id=f.request_id;
  update public.online_orders set status='cancelled' where id=f.request_id;
  if (select quantity from public.inventory where product_id=f.product and branch_id=branch)<>20 or
    (select quantity from public.inventory where product_id=f.weight_product and branch_id=branch)<>20 then
    raise exception 'Cancellation did not release exact stock once'; end if;
  begin
    update public.online_orders set status='confirmed' where id=f.request_id;
    raise exception 'Cancelled order reopened';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
  begin
    perform public.quote_customer_order('[]',null);
    raise exception 'Anonymous quote allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set constraints all immediate;
select 'PASS: server pricing, inactive offers, bulk, grams, retry, ownership, cancellation, rollout guard' as result;
