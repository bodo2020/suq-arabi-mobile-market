-- Secure customer return-request flow.
-- This file mirrors the production Supabase configuration used by the customer app.

create or replace function public.create_customer_return_request(
  p_order_id uuid,
  p_reason text,
  p_items jsonb,
  p_images text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_order_items jsonb;
  v_order_status public.order_status;
  v_item jsonb;
  v_product_id uuid;
  v_requested integer;
  v_purchased integer;
  v_already_requested integer;
  v_item_reason text;
  v_seen_products jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 3 or length(trim(p_reason)) > 1000 then
    raise exception 'invalid_return_reason';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'return_items_required';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_return_items';
  end if;

  if coalesce(array_length(p_images, 1), 0) > 5 then
    raise exception 'too_many_return_images';
  end if;

  select o.items, o.status
    into v_order_items, v_order_status
  from public.online_orders o
  join public.customers c on c.id = o.customer_id
  where o.id = p_order_id
    and c.user_id = v_uid
  for update of o;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order_status <> 'delivered'::public.order_status then
    raise exception 'order_not_delivered';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_requested := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'invalid_return_item';
    end;

    if v_seen_products ? v_product_id::text then
      raise exception 'duplicate_return_product';
    end if;
    v_seen_products := v_seen_products || jsonb_build_object(v_product_id::text, true);

    if v_requested is null or v_requested <= 0 then
      raise exception 'invalid_return_quantity';
    end if;

    select coalesce(sum((ordered_item->>'quantity')::integer), 0)
      into v_purchased
    from jsonb_array_elements(coalesce(v_order_items, '[]'::jsonb)) ordered_item
    where ordered_item->>'product_id' = v_product_id::text;

    if v_purchased <= 0 then
      raise exception 'product_not_in_order';
    end if;

    select coalesce(sum(rri.quantity), 0)
      into v_already_requested
    from public.return_request_items rri
    join public.return_requests rr on rr.id = rri.return_request_id
    where rr.order_id = p_order_id
      and rr.status in ('pending'::public.return_request_status, 'approved'::public.return_request_status)
      and rri.product_id = v_product_id;

    if v_already_requested + v_requested > v_purchased then
      raise exception 'return_quantity_exceeds_order';
    end if;
  end loop;

  insert into public.return_requests (user_id, order_id, reason, images)
  values (v_uid, p_order_id, trim(p_reason), coalesce(p_images, '{}'::text[]))
  returning id into v_request_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_requested := (v_item->>'quantity')::integer;
    v_item_reason := nullif(trim(coalesce(v_item->>'reason', '')), '');

    insert into public.return_request_items (
      return_request_id,
      product_id,
      quantity,
      reason
    ) values (
      v_request_id,
      v_product_id,
      v_requested,
      v_item_reason
    );
  end loop;

  update public.online_orders
  set return_status = 'requested', updated_at = now()
  where id = p_order_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_customer_return_request(uuid, text, jsonb, text[]) from public, anon;
grant execute on function public.create_customer_return_request(uuid, text, jsonb, text[]) to authenticated;

-- Customers must create returns through the validated RPC above.
drop policy if exists "Customers create own return requests" on public.return_requests;
drop policy if exists "Customers create own return request items" on public.return_request_items;

-- Return-image bucket: public asset delivery, authenticated upload/delete only in the user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'returns',
  'returns',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Preserve the existing broad legacy policy for every bucket except customer return images.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Give users access to all files'
  ) then
    execute 'alter policy "Give users access to all files" on storage.objects using (bucket_id <> ''returns'') with check (bucket_id <> ''returns'')';
  end if;
end;
$$;

drop policy if exists "Authenticated users upload own return images" on storage.objects;
create policy "Authenticated users upload own return images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'returns'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Authenticated users delete own return images" on storage.objects;
create policy "Authenticated users delete own return images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'returns'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
