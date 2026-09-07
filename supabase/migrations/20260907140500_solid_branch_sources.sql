alter table public.branches
  add column if not exists inventory_source_branch_id uuid references public.branches(id),
  add column if not exists pricing_source_branch_id uuid references public.branches(id);

update public.branches b
set inventory_source_branch_id = coalesce(
      case when not coalesce(b.independent_inventory,false) and b.parent_branch_id is not null
           then (select coalesce(p.inventory_source_branch_id,p.id) from public.branches p where p.id=b.parent_branch_id)
           else b.id end,
      b.id),
    pricing_source_branch_id = coalesce(
      case when not coalesce(b.independent_pricing,false) and b.parent_branch_id is not null
           then (select coalesce(p.pricing_source_branch_id,p.id) from public.branches p where p.id=b.parent_branch_id)
           else b.id end,
      b.id)
where b.inventory_source_branch_id is null or b.pricing_source_branch_id is null;

create or replace function private.set_branch_source_defaults()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.id is null then new.id := gen_random_uuid(); end if;
  new.inventory_source_branch_id := coalesce(new.inventory_source_branch_id,new.id);
  new.pricing_source_branch_id := coalesce(new.pricing_source_branch_id,new.id);
  return new;
end;
$$;

drop trigger if exists trg_set_branch_source_defaults on public.branches;
create trigger trg_set_branch_source_defaults
before insert on public.branches
for each row execute function private.set_branch_source_defaults();

update public.branches set inventory_source_branch_id=id where inventory_source_branch_id is null;
update public.branches set pricing_source_branch_id=id where pricing_source_branch_id is null;
alter table public.branches alter column inventory_source_branch_id set not null;
alter table public.branches alter column pricing_source_branch_id set not null;

create or replace function private.resolve_branch_sources(p_branch_id uuid)
returns table(delivery_branch_id uuid, inventory_branch_id uuid, pricing_branch_id uuid)
language plpgsql stable security definer set search_path='' as $$
declare v_inventory uuid; v_pricing uuid;
begin
  select b.inventory_source_branch_id,b.pricing_source_branch_id
  into v_inventory,v_pricing
  from public.branches b where b.id=p_branch_id and b.active=true;
  if not found then raise exception using errcode='22023',message='BRANCH_UNAVAILABLE'; end if;
  if not exists(select 1 from public.branches b where b.id=v_inventory and b.active=true) then
    raise exception using errcode='22023',message='INVENTORY_SOURCE_UNAVAILABLE';
  end if;
  if not exists(select 1 from public.branches b where b.id=v_pricing and b.active=true) then
    raise exception using errcode='22023',message='PRICING_SOURCE_UNAVAILABLE';
  end if;
  return query select p_branch_id,v_inventory,v_pricing;
end;
$$;

create or replace function public.get_customer_branch_catalog(
  p_branch_id uuid,
  p_product_id uuid default null,
  p_main_category_id uuid default null,
  p_subcategory_id uuid default null,
  p_company_id uuid default null,
  p_search text default null,
  p_barcode text default null,
  p_limit integer default 500
)
returns setof jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_inventory_branch uuid; v_pricing_branch uuid;
begin
  if p_branch_id is null then raise exception using errcode='22023',message='DELIVERY_ADDRESS_REQUIRED'; end if;
  select s.inventory_branch_id,s.pricing_branch_id into v_inventory_branch,v_pricing_branch
  from private.resolve_branch_sources(p_branch_id) s;

  return query
  select (to_jsonb(p)-'purchase_price'-'expiry_date'-'shelf_location'-'track_expiry')
    || jsonb_build_object(
      'quantity',i.quantity,
      'price',coalesce(bp.sale_price,p.price),
      'offer_price',case when bp.id is not null then bp.offer_price else p.offer_price end,
      'is_offer',case when bp.id is not null then coalesce(bp.is_offer,false) else coalesce(p.is_offer,false) end,
      'bulk_enabled',coalesce(p.bulk_enabled,false) and coalesce(p.bulk_quantity,0)>0 and i.quantity>=coalesce(p.bulk_quantity,0),
      'delivery_branch_id',p_branch_id,
      'inventory_branch_id',v_inventory_branch,
      'pricing_branch_id',v_pricing_branch)
  from public.products p
  join public.inventory i on i.product_id=p.id and i.branch_id=v_inventory_branch and i.quantity>0
  left join public.branch_product_pricing bp on bp.product_id=p.id and bp.branch_id=v_pricing_branch
  where (p_product_id is null or p.id=p_product_id)
    and (p_main_category_id is null or p.main_category_id=p_main_category_id)
    and (p_subcategory_id is null or p.subcategory_id=p_subcategory_id)
    and (p_company_id is null or p.company_id=p_company_id)
    and (p_search is null or btrim(p_search)='' or p.name ilike '%'||btrim(p_search)||'%')
    and (p_barcode is null or btrim(p_barcode)='' or p.barcode=btrim(p_barcode) or p.bulk_barcode=btrim(p_barcode))
  order by p.created_at desc nulls last,p.id
  limit greatest(1,least(coalesce(p_limit,500),1000));
end;
$$;

grant execute on function public.get_customer_branch_catalog(uuid,uuid,uuid,uuid,uuid,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
