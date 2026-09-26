create extension if not exists pg_net;

create or replace function private.wake_push_delivery_worker_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'push' and new.state in ('pending','retrying') then
    perform net.http_post(
      url := 'https://qzvpayjaadbmpayeglon.supabase.co/functions/v1/push-delivery-worker',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dnBheWphYWRibXBheWVnbG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDUwMTMsImV4cCI6MjA2MDM4MTAxM30.ti7DYVtr4GdlzCeoUF8zD1lStDQfNuDj3mbsnYWP5H8'
      ),
      body := jsonb_build_object(
        'secret', (select value from private.notification_worker_settings_v2 where key='push_worker_secret'),
        'limit', 50
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wake_push_delivery_worker on private.notification_delivery_queue_v2;
create trigger trg_wake_push_delivery_worker
after insert on private.notification_delivery_queue_v2
for each row execute function private.wake_push_delivery_worker_v1();