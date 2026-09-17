create or replace function private.preserve_notification_read_state_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.read_at is not null and new.read_at is null then
      new.read_at := old.read_at;
    end if;
    if old.seen_at is not null and new.seen_at is null then
      new.seen_at := old.seen_at;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.preserve_notification_read_state_v2() from public, anon, authenticated;

drop trigger if exists preserve_notification_read_state_v2 on private.notification_events_v2;
create trigger preserve_notification_read_state_v2
before update on private.notification_events_v2
for each row execute function private.preserve_notification_read_state_v2();

create or replace function private.force_customer_in_app_notifications_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.in_app_enabled := true;
  return new;
end;
$$;

revoke all on function private.force_customer_in_app_notifications_v2() from public, anon, authenticated;

update private.notification_preferences_v2
set in_app_enabled = true
where in_app_enabled is distinct from true;

drop trigger if exists force_customer_in_app_notifications_v2 on private.notification_preferences_v2;
create trigger force_customer_in_app_notifications_v2
before insert or update on private.notification_preferences_v2
for each row execute function private.force_customer_in_app_notifications_v2();
