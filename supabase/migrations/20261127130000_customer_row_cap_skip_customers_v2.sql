-- Sign-up fix: the row cap on public.customers blocked every new registration.
-- handle_new_user already creates the customer row when the auth user is created, and the app then upserts it
-- (name, phone). The BEFORE INSERT cap saw that existing row and raised CUSTOMER_ROW_LIMIT before the upsert could update it.
-- One customer row per user is already guaranteed by the unique index customers_user_id_key, so customers is skipped here.
-- The other caps (cart 300, favorites 1000, addresses 20, smart lists 50) are unchanged.
create or replace function private.customer_row_cap_v1()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_cap int := tg_argv[0]::int;
  v_count int;
begin
  if v_uid is null or coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if tg_table_name = 'customers' then
    return new;
  end if;
  if tg_table_name in ('cart_items', 'favorites') then
    new.user_id := coalesce(new.user_id, v_uid);
    if new.user_id <> v_uid then
      raise exception using errcode = '42501', message = 'ROW_OWNER_MISMATCH';
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || v_uid::text, 7));
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into v_count using v_uid;
  if v_count >= v_cap then
    raise exception using errcode = '54000', message = 'CUSTOMER_ROW_LIMIT', detail = tg_table_name;
  end if;
  return new;
end;
$$;
