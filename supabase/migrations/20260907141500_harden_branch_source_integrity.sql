create or replace function private.validate_branch_source_integrity()
returns trigger language plpgsql security definer set search_path='' as $$
declare inv_active boolean; inv_source uuid; price_active boolean; price_source uuid;
begin
  if new.inventory_source_branch_id is null or new.pricing_source_branch_id is null then
    raise exception using errcode='23514',message='BRANCH_SOURCE_REQUIRED';
  end if;
  if new.inventory_source_branch_id<>new.id then
    select b.active,b.inventory_source_branch_id into inv_active,inv_source from public.branches b where b.id=new.inventory_source_branch_id;
    if not found or inv_active is distinct from true then raise exception using errcode='23514',message='INVENTORY_SOURCE_UNAVAILABLE'; end if;
    if inv_source<>new.inventory_source_branch_id then raise exception using errcode='23514',message='INVENTORY_SOURCE_MUST_BE_CANONICAL'; end if;
  end if;
  if new.pricing_source_branch_id<>new.id then
    select b.active,b.pricing_source_branch_id into price_active,price_source from public.branches b where b.id=new.pricing_source_branch_id;
    if not found or price_active is distinct from true then raise exception using errcode='23514',message='PRICING_SOURCE_UNAVAILABLE'; end if;
    if price_source<>new.pricing_source_branch_id then raise exception using errcode='23514',message='PRICING_SOURCE_MUST_BE_CANONICAL'; end if;
  end if;
  if new.active is distinct from true and old.active is true and exists(
    select 1 from public.branches b where b.id<>new.id and b.active=true
      and (b.inventory_source_branch_id=new.id or b.pricing_source_branch_id=new.id)
  ) then raise exception using errcode='23514',message='BRANCH_SOURCE_IN_USE'; end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_branch_source_integrity on public.branches;
create trigger trg_validate_branch_source_integrity before update on public.branches
for each row execute function private.validate_branch_source_integrity();

create or replace function private.validate_new_branch_source_integrity()
returns trigger language plpgsql security definer set search_path='' as $$
declare inv_active boolean; inv_source uuid; price_active boolean; price_source uuid;
begin
  if new.inventory_source_branch_id is null then new.inventory_source_branch_id:=new.id; end if;
  if new.pricing_source_branch_id is null then new.pricing_source_branch_id:=new.id; end if;
  if new.inventory_source_branch_id<>new.id then
    select b.active,b.inventory_source_branch_id into inv_active,inv_source from public.branches b where b.id=new.inventory_source_branch_id;
    if not found or inv_active is distinct from true or inv_source<>new.inventory_source_branch_id then
      raise exception using errcode='23514',message='INVENTORY_SOURCE_MUST_BE_ACTIVE_CANONICAL'; end if;
  end if;
  if new.pricing_source_branch_id<>new.id then
    select b.active,b.pricing_source_branch_id into price_active,price_source from public.branches b where b.id=new.pricing_source_branch_id;
    if not found or price_active is distinct from true or price_source<>new.pricing_source_branch_id then
      raise exception using errcode='23514',message='PRICING_SOURCE_MUST_BE_ACTIVE_CANONICAL'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_new_branch_source_integrity on public.branches;
create trigger trg_validate_new_branch_source_integrity before insert on public.branches
for each row execute function private.validate_new_branch_source_integrity();
