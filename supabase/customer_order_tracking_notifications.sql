-- Customer order tracking + notifications.
-- Safe to re-run: policies/triggers are replaced and notification backfill is deduplicated.

-- Customers may only read status history for orders they own.
drop policy if exists "Allow all users to view order status history" on public.order_status_history;
drop policy if exists customer_order_history_select on public.order_status_history;
create policy customer_order_history_select
on public.order_status_history
for select
to authenticated
using (
  public.is_admin()
  or public.is_super_admin()
  or exists (
    select 1
    from public.online_orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_status_history.order_id
      and c.user_id = auth.uid()
  )
);
revoke select on public.order_status_history from anon;
grant select on public.order_status_history to authenticated;

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.online_orders(id) on delete cascade,
  kind text not null check (kind in ('order_status','payment_status')),
  status text,
  title text not null,
  body text not null,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_user_created_idx
  on public.customer_notifications(user_id, created_at desc);
create index if not exists customer_notifications_user_unread_idx
  on public.customer_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.customer_notifications enable row level security;
drop policy if exists customer_notifications_select_own on public.customer_notifications;
create policy customer_notifications_select_own
on public.customer_notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists customer_notifications_update_own on public.customer_notifications;
create policy customer_notifications_update_own
on public.customer_notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.customer_notifications from anon;
revoke insert, delete, update on public.customer_notifications from authenticated;
grant select on public.customer_notifications to authenticated;
grant update(read_at) on public.customer_notifications to authenticated;

create or replace function private.notify_customer_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_title text;
  v_body text;
  v_status text;
begin
  select c.user_id into v_user_id
  from public.customers c
  where c.id = new.customer_id;
  if v_user_id is null then return new; end if;

  if tg_op = 'INSERT' then
    v_status := new.status::text;
    insert into public.customer_notifications(user_id, order_id, kind, status, title, body, dedupe_key)
    values (
      v_user_id, new.id, 'order_status', v_status,
      'تم استلام طلبك', 'طلبك وصلنا بنجاح وهنبدأ مراجعته دلوقتي.',
      'order:' || new.id::text || ':status:' || v_status
    ) on conflict (dedupe_key) do nothing;
    return new;
  end if;

  if old.status is distinct from new.status then
    v_status := new.status::text;
    select
      case v_status
        when 'pending' then 'تم استلام طلبك'
        when 'confirmed' then 'تم تأكيد طلبك'
        when 'preparing' then 'طلبك بيتجهز'
        when 'ready' then 'طلبك جاهز'
        when 'shipped' then 'طلبك في الطريق'
        when 'delivered' then 'تم تسليم طلبك'
        when 'cancelled' then 'تم إلغاء طلبك'
        else 'تم تحديث حالة طلبك'
      end,
      case v_status
        when 'pending' then 'طلبك وصلنا وبنراجعه دلوقتي.'
        when 'confirmed' then 'أكدنا الطلب وبدأنا تنفيذه.'
        when 'preparing' then 'فريقنا بيجهز منتجاتك دلوقتي.'
        when 'ready' then 'طلبك اتجهز ومستني يخرج للتوصيل.'
        when 'shipped' then 'الطلب خرج للتوصيل وهو في الطريق ليك.'
        when 'delivered' then 'طلبك وصل بنجاح. شكرًا لاختيارك المعداوي ماركت.'
        when 'cancelled' then 'الطلب اتلغى. افتح تفاصيل الطلب لو محتاج تراجع بياناته.'
        else 'حالة طلبك اتحدثت. افتح طلباتي لمتابعة التفاصيل.'
      end
    into v_title, v_body;

    insert into public.customer_notifications(user_id, order_id, kind, status, title, body, dedupe_key)
    values (v_user_id, new.id, 'order_status', v_status, v_title, v_body,
      'order:' || new.id::text || ':status:' || v_status)
    on conflict (dedupe_key) do nothing;
  end if;

  if old.payment_status is distinct from new.payment_status
     and new.payment_status::text in ('paid','failed','refunded') then
    v_status := new.payment_status::text;
    select
      case v_status
        when 'paid' then 'تم تأكيد الدفع'
        when 'failed' then 'تعذر تأكيد الدفع'
        when 'refunded' then 'تم رد المبلغ'
        else 'تم تحديث حالة الدفع'
      end,
      case v_status
        when 'paid' then 'تم تسجيل دفع طلبك بنجاح.'
        when 'failed' then 'تعذر تأكيد الدفع للطلب. راجع طلباتك أو تواصل مع خدمة العملاء.'
        when 'refunded' then 'تم تسجيل رد مبلغ الطلب.'
        else 'حالة دفع طلبك اتحدثت.'
      end
    into v_title, v_body;

    insert into public.customer_notifications(user_id, order_id, kind, status, title, body, dedupe_key)
    values (v_user_id, new.id, 'payment_status', v_status, v_title, v_body,
      'order:' || new.id::text || ':payment:' || v_status)
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;
revoke all on function private.notify_customer_order_event() from public, anon, authenticated;

drop trigger if exists customer_order_notifications_trigger on public.online_orders;
create trigger customer_order_notifications_trigger
after insert or update of status, payment_status on public.online_orders
for each row execute function private.notify_customer_order_event();

-- Realtime publications for instant UI updates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='order_status_history'
  ) then
    alter publication supabase_realtime add table public.order_status_history;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='customer_notifications'
  ) then
    alter publication supabase_realtime add table public.customer_notifications;
  end if;
end $$;

-- Seed only currently active orders so existing customers immediately see their live order.
insert into public.customer_notifications(user_id, order_id, kind, status, title, body, dedupe_key, created_at)
select
  c.user_id,
  o.id,
  'order_status',
  o.status::text,
  case o.status::text
    when 'pending' then 'تم استلام طلبك'
    when 'confirmed' then 'تم تأكيد طلبك'
    when 'preparing' then 'طلبك بيتجهز'
    when 'ready' then 'طلبك جاهز'
    when 'shipped' then 'طلبك في الطريق'
    else 'تم تحديث حالة طلبك'
  end,
  case o.status::text
    when 'pending' then 'طلبك وصلنا وبنراجعه دلوقتي.'
    when 'confirmed' then 'أكدنا الطلب وبدأنا تنفيذه.'
    when 'preparing' then 'فريقنا بيجهز منتجاتك دلوقتي.'
    when 'ready' then 'طلبك اتجهز ومستني يخرج للتوصيل.'
    when 'shipped' then 'الطلب خرج للتوصيل وهو في الطريق ليك.'
    else 'حالة طلبك اتحدثت. افتح طلباتي لمتابعة التفاصيل.'
  end,
  'order:' || o.id::text || ':status:' || o.status::text,
  coalesce(o.updated_at, o.created_at)
from public.online_orders o
join public.customers c on c.id=o.customer_id
where o.status not in ('delivered','cancelled')
  and c.user_id is not null
on conflict (dedupe_key) do nothing;
