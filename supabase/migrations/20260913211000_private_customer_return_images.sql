-- Customer return evidence is private data. Keep objects inaccessible through
-- public bucket URLs and authorize reads through storage RLS + short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'returns',
  'returns',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Normalize legacy/public URL values into storage object paths before they are
-- persisted. This keeps older app builds compatible when they still send the
-- value produced by getPublicUrl(), without making the bucket public.
create or replace function private.normalize_return_request_image_refs_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_image text;
  v_path text;
  v_marker text := '/storage/v1/object/public/returns/';
  v_marker_pos integer;
  v_normalized text[] := '{}'::text[];
  v_expected_prefix text;
begin
  if new.images is null then
    new.images := '{}'::text[];
    return new;
  end if;

  if coalesce(array_length(new.images, 1), 0) > 5 then
    raise exception 'too_many_return_images';
  end if;

  v_expected_prefix := new.user_id::text || '/' || new.order_id::text || '/';

  foreach v_image in array new.images
  loop
    v_path := trim(coalesce(v_image, ''));
    if v_path = '' then
      continue;
    end if;

    if v_path ~* '^https?://' then
      v_marker_pos := strpos(v_path, v_marker);
      if v_marker_pos <= 0 then
        raise exception 'invalid_return_image';
      end if;
      v_path := substr(v_path, v_marker_pos + length(v_marker));
      v_path := split_part(v_path, '?', 1);
      v_path := split_part(v_path, '#', 1);
    else
      v_path := regexp_replace(v_path, '^/+', '');
      v_path := regexp_replace(v_path, '^returns/', '');
    end if;

    if left(v_path, length(v_expected_prefix)) <> v_expected_prefix then
      raise exception 'invalid_return_image';
    end if;

    v_normalized := array_append(v_normalized, v_path);
  end loop;

  new.images := v_normalized;
  return new;
end;
$$;

revoke all on function private.normalize_return_request_image_refs_v1() from public, anon, authenticated;

drop trigger if exists normalize_return_request_image_refs_v1 on public.return_requests;
create trigger normalize_return_request_image_refs_v1
before insert or update of images on public.return_requests
for each row execute function private.normalize_return_request_image_refs_v1();

-- Return uploads must belong to the authenticated customer and a delivered
-- order owned by that customer. This prevents the bucket from being used as an
-- arbitrary private file store.
drop policy if exists "Authenticated users upload own return images" on storage.objects;
create policy "Authenticated users upload own return images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'returns'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.online_orders o
    join public.customers c on c.id = o.customer_id
    where o.id::text = (storage.foldername(name))[2]
      and c.user_id = (select auth.uid())
      and o.status::text = 'delivered'
  )
);

-- Customers can create signed URLs only for evidence that is actually attached
-- to one of their own return requests.
drop policy if exists "Customers view own return images" on storage.objects;
create policy "Customers view own return images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'returns'
  and exists (
    select 1
    from public.return_requests rr
    where rr.user_id = (select auth.uid())
      and rr.order_id::text = (storage.foldername(name))[2]
      and rr.user_id::text = (storage.foldername(name))[1]
      and name = any(coalesce(rr.images, '{}'::text[]))
  )
);

-- Authorized return managers can create signed URLs for evidence belonging to
-- return requests they are allowed to manage for the branch.
drop policy if exists "Managers view managed return images" on storage.objects;
create policy "Managers view managed return images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'returns'
  and exists (
    select 1
    from public.return_requests rr
    where rr.user_id::text = (storage.foldername(name))[1]
      and rr.order_id::text = (storage.foldername(name))[2]
      and name = any(coalesce(rr.images, '{}'::text[]))
      and private.can_manage_return_request(rr.id)
  )
);

-- Preserve cleanup after an RPC failure: a customer may delete objects in their
-- own folder even before a return-request row is committed.
drop policy if exists "Authenticated users delete own return images" on storage.objects;
create policy "Authenticated users delete own return images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'returns'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
