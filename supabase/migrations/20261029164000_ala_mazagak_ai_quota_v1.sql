-- Daily authenticated AI quota, atomic under concurrent requests.
-- Only the service role can invoke; do not expose the counter to clients.
create or replace function public.consume_customer_smart_ai_quota_v1(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_used integer;
begin
 if p_user_id is null then return false; end if;
 insert into public.customer_smart_ai_limits(user_id,usage_date,requests)
 values(p_user_id,current_date,1)
 on conflict(user_id,usage_date) do update
 set requests=public.customer_smart_ai_limits.requests+1
 where public.customer_smart_ai_limits.requests<20
 returning requests into v_used;
 return v_used is not null;
end;
$$;
revoke all on function public.consume_customer_smart_ai_quota_v1(uuid) from public,anon,authenticated;
grant execute on function public.consume_customer_smart_ai_quota_v1(uuid) to service_role;
