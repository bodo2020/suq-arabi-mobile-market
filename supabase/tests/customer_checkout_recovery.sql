-- Read-only checks against existing orders. No test orders or financial writes.
begin;
do $$
declare
  r record;
  recovered jsonb;
  other_user uuid;
  tested integer := 0;
begin
  if has_function_privilege('anon','public.recover_customer_checkout_v1(text,uuid)','execute') then
    raise exception 'Anonymous execute must be denied';
  end if;
  if not has_function_privilege('authenticated','public.recover_customer_checkout_v1(text,uuid)','execute') then
    raise exception 'Authenticated execute missing';
  end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.recover_customer_checkout_v1('owned',gen_random_uuid());
    raise exception 'Unauthenticated caller was accepted';
  exception when insufficient_privilege then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;

  for r in
    select distinct on (kind) * from (
      select case when o.source_channel='marketplace' then 'marketplace' else 'owned' end kind,
        o.id request_id,c.user_id,o.created_at
      from public.online_orders o join public.customers c on c.id=o.customer_id
      where c.user_id is not null and c.id=(select c2.id from public.customers c2 where c2.user_id=c.user_id order by c2.created_at desc limit 1)
      union all
      select 'combined',g.id,c.user_id,g.created_at
      from private.order_groups_v1 g join public.customers c on c.id=g.customer_id
      where c.user_id is not null and c.id=(select c2.id from public.customers c2 where c2.user_id=c.user_id order by c2.created_at desc limit 1)
    ) attempts order by kind,created_at desc
  loop
    perform set_config('request.jwt.claim.sub',r.user_id::text,true);
    recovered := public.recover_customer_checkout_v1(r.kind,r.request_id);
    if recovered->>'exists' <> 'true' or recovered->'order'->>'id' <> r.request_id::text then
      raise exception 'Owner recovery failed for %',r.kind;
    end if;
    if public.recover_customer_checkout_v1(r.kind,gen_random_uuid())->>'exists' <> 'false' then
      raise exception 'Unknown request should not exist';
    end if;
    select user_id into other_user from public.customers where user_id is not null and user_id<>r.user_id limit 1;
    if other_user is not null then
      perform set_config('request.jwt.claim.sub',other_user::text,true);
      if public.recover_customer_checkout_v1(r.kind,r.request_id)->>'exists' <> 'false' then
        raise exception 'Cross-customer access for %',r.kind;
      end if;
    end if;
    tested := tested+1;
  end loop;
  if tested=0 then raise exception 'No existing orders available for owner tests'; end if;
end;
$$;
select 'PASS: permissions, anonymous rejection, owner recovery, unknown IDs, customer isolation' as result;
rollback;
