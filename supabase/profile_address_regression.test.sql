-- Execute only inside an explicit BEGIN / ROLLBACK transaction.
create temporary table profile_address_fixture as select gen_random_uuid() uid;
grant select on profile_address_fixture to authenticated;
insert into auth.users(id,raw_user_meta_data) select uid,'{}'::jsonb from profile_address_fixture;
select set_config('request.jwt.claim.sub',(select uid::text from profile_address_fixture),true);
set local role authenticated;
do $$ declare v_customer uuid; v_address uuid; begin
  select id into strict v_customer from public.customers where user_id=auth.uid();
  if (select nullif(trim(name),'') from public.customers where id=v_customer) is not null then raise exception 'Fixture should have an empty auto-created name'; end if;
  insert into public.customers(user_id,name,first_name,last_name) values(auth.uid(),'Temporary Profile Test','Temporary','Profile Test')
    on conflict(user_id) do update set name=excluded.name,first_name=excluded.first_name,last_name=excluded.last_name;
  if (select name from public.customers where id=v_customer) <> 'Temporary Profile Test' then raise exception 'Existing profile was not updated'; end if;
  insert into public.customer_addresses(user_id,address,latitude,longitude,is_default)
    values(auth.uid(),'Temporary address details',30.0444,31.2357,true) returning id into v_address;
  if not exists(select 1 from public.customer_addresses where id=v_address and latitude=30.0444 and longitude=31.2357) then raise exception 'Coordinates did not round-trip'; end if;
  update public.customer_addresses set address='Edited details' where id=v_address and user_id=auth.uid();
  if not exists(select 1 from public.customer_addresses where id=v_address and is_default and latitude=30.0444) then raise exception 'Address edit lost default/coordinates'; end if;
end $$;
reset role;
select 'PASS: updating the auto-created profile and preserving address coordinates/default' as result;
