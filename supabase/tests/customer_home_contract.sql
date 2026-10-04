-- Read-only checks. No page/campaign/order is modified or published.
begin read only;
do $$
declare v_page jsonb; v_uid uuid; v_row jsonb;
begin
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if exists (select 1 from public.get_my_purchase_history(100)) then
    raise exception 'Guest purchase history leaked';
  end if;
  v_page := public.get_public_home_page(null, 'customer-home-readonly-test');
  if v_page is not null and jsonb_typeof(v_page->'sections') <> 'array' then
    raise exception 'Invalid public home section contract';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_page->'sections','[]'::jsonb)) s
    where not (s ? 'data_source' and s ? 'display_config' and s ? 'section_key')) then
    raise exception 'Growth configuration fields missing';
  end if;
  select c.user_id into v_uid from public.customers c
  where c.user_id is not null and exists (select 1 from public.online_orders o where o.customer_id=c.id)
  limit 1;
  if v_uid is not null then
    perform set_config('request.jwt.claim.sub',v_uid::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated')::text,true);
    for v_row in select * from public.get_my_purchase_history(100) loop
      if not (
        exists (select 1 from public.online_orders o join public.customers c on c.id=o.customer_id where o.id=(v_row->>'id')::uuid and c.user_id=v_uid)
        or exists (select 1 from public.sales s join public.customers c on c.id=s.customer_id where s.id=(v_row->>'id')::uuid and c.user_id=v_uid)
        or exists (select 1 from private.order_groups_v1 g join public.customers c on c.id=g.customer_id where g.id=(v_row->>'id')::uuid and c.user_id=v_uid)
      ) then raise exception 'Purchase history ownership mismatch'; end if;
    end loop;
  end if;
end;
$$;
rollback;
