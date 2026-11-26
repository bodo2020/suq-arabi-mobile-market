-- Wallet payment receipts. The image itself lives in Firebase Storage; this table keeps
-- only the object path and who uploaded it. Only the upload-payment-receipt edge function
-- (service role) writes here; customers never read or write the table directly.

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);

create index if not exists payment_receipts_request_id_idx on public.payment_receipts (request_id);
create index if not exists payment_receipts_user_created_idx on public.payment_receipts (user_id, created_at);

alter table public.payment_receipts enable row level security;
revoke all on public.payment_receipts from anon, authenticated;
