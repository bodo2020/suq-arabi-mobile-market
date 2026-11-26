-- Stop a signed-in customer (or a script using one account) from flooding the tables customers can write to.
-- Staff/service calls (no customer JWT) are not limited.

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

  -- Rows written by a customer always belong to that customer (no orphan rows).
  if tg_table_name in ('cart_items', 'favorites') then
    new.user_id := coalesce(new.user_id, v_uid);
    if new.user_id <> v_uid then
      raise exception using errcode = '42501', message = 'ROW_OWNER_MISMATCH';
    end if;
  end if;

  -- One lock per customer and table so parallel inserts cannot slip past the cap.
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || v_uid::text, 7));
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into v_count using v_uid;
  if v_count >= v_cap then
    raise exception using errcode = '54000', message = 'CUSTOMER_ROW_LIMIT', detail = tg_table_name;
  end if;
  return new;
end;
$$;

revoke all on function private.customer_row_cap_v1() from public, anon, authenticated;

drop trigger if exists zz_customer_row_cap_v1 on public.cart_items;
create trigger zz_customer_row_cap_v1 before insert on public.cart_items
  for each row execute function private.customer_row_cap_v1('300');

drop trigger if exists zz_customer_row_cap_v1 on public.favorites;
create trigger zz_customer_row_cap_v1 before insert on public.favorites
  for each row execute function private.customer_row_cap_v1('1000');

drop trigger if exists zz_customer_row_cap_v1 on public.customer_addresses;
create trigger zz_customer_row_cap_v1 before insert on public.customer_addresses
  for each row execute function private.customer_row_cap_v1('20');

drop trigger if exists zz_customer_row_cap_v1 on public.customer_smart_lists;
create trigger zz_customer_row_cap_v1 before insert on public.customer_smart_lists
  for each row execute function private.customer_row_cap_v1('50');

drop trigger if exists zz_customer_row_cap_v1 on public.customers;
create trigger zz_customer_row_cap_v1 before insert on public.customers
  for each row execute function private.customer_row_cap_v1('1');

-- These tables have no API grants today; RLS makes sure a future grant cannot expose them by accident.
alter table public.customer_opportunity_queue_actions enable row level security;
alter table public.customer_tags enable row level security;
alter table public.customer_tag_assignments enable row level security;
alter table public.customer_admin_audit enable row level security;
alter table public.pos_payment_methods enable row level security;
alter table public.pos_sale_payments enable row level security;
