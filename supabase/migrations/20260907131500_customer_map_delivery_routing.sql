-- Move customer delivery routing from legacy neighborhood mappings to map coordinates.

alter table public.customer_addresses
  add column if not exists assigned_branch_id uuid references public.branches(id),
  add column if not exists distance_km numeric,
  add column if not exists is_deliverable boolean not null default false;

create or replace function private.assign_customer_address_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  new.assigned_branch_id := null;
  new.distance_km := null;
  new.is_deliverable := false;

  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  select * into r
  from public.find_delivery_branch(new.latitude::double precision, new.longitude::double precision)
  limit 1;

  if r.branch_id is not null then
    new.assigned_branch_id := r.branch_id;
    new.distance_km := round(r.distance_km::numeric, 3);
    new.is_deliverable := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_customer_address_branch on public.customer_addresses;
create trigger trg_assign_customer_address_branch
before insert or update of latitude, longitude on public.customer_addresses
for each row execute function private.assign_customer_address_branch();

update public.customer_addresses
set latitude = latitude, longitude = longitude
where latitude is not null and longitude is not null;

-- Authoritative checkout now chooses the delivery branch from the saved map point.
-- The full production function body is managed in the applied Supabase migration
-- customer_map_delivery_routing. This marker documents the rollout dependency:
-- private.customer_checkout_plan must call public.find_delivery_branch(latitude, longitude)
-- and must not route using get_branch_for_neighborhood().
