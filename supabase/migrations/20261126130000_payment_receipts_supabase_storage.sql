-- Receipts move from Firebase to Supabase Storage (private bucket, no client policies).
-- Only the upload-payment-receipt and purge-payment-receipts edge functions touch it.
-- The daily purge (45 days) is a pg_cron job that calls purge-payment-receipts with the
-- PURGE_TOKEN secret; the job itself is created in the project, not stored in this file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create index if not exists payment_receipts_created_at_idx on public.payment_receipts (created_at);
