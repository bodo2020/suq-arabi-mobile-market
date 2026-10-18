-- Preserve customer-selected meal configurations as non-payable cart drafts.
-- This metadata is display-only. Price, availability and option rules MUST be
-- revalidated by a future payable restaurant quote/place RPC.
create or replace function public.replace_customer_cart(p_items jsonb, p_expected_user_id uuid)
returns void language plpgsql set search_path='' as $cart$
declare
  v_customer uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_expected_user_id is distinct from auth.uid() then raise exception 'Session changed' using errcode='42501'; end if;
  select id into strict v_customer from public.customers where user_id=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(v_customer::text,0));
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>300 then
    raise exception 'Invalid cart' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where jsonb_typeof(x)<>'object' or x->>'product_id' is null
      or coalesce(jsonb_typeof(x->'quantity'),'null')<>'number'
      or (x->>'quantity')::numeric<=0 or (x->>'quantity')::numeric<>trunc((x->>'quantity')::numeric)
      or coalesce(jsonb_typeof(x->'metadata'),'null')<>'object'
      or coalesce(x->'metadata'->>'source_kind','owned') not in ('owned','marketplace')
  ) then raise exception 'Invalid cart item' using errcode='22023'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where coalesce(x->'metadata'->>'source_kind','owned')='marketplace'
      and (nullif(x->'metadata'->>'merchant_id','') is null
        or nullif(x->'metadata'->>'branch_id','') is null
        or nullif(x->'metadata'->>'listing_id','') is null)
  ) then raise exception 'Marketplace cart source required' using errcode='22023'; end if;

  -- Reject half-configured rows rather than silently converting them into
  -- an ordinary product on the next app launch. A client-provided delta is
  -- NEVER a chargeable price; it exists solely for draft display.
  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where (
      nullif(x->'metadata'->>'restaurant_modifier_selection_key','') is not null
      or x->'metadata'->'restaurant_modifier_picks' is not null
        and x->'metadata'->'restaurant_modifier_picks'<>'null'::jsonb
    ) and (
      coalesce(x->'metadata'->>'source_kind','owned')<>'marketplace'
      or coalesce(x->'metadata'->>'restaurant_modifier_selection_key','') !~ '^[0-9a-f]{32}$'
      or jsonb_typeof(x->'metadata'->'restaurant_modifier_picks') is distinct from 'array'
      or jsonb_typeof(x->'metadata'->'restaurant_modifier_snapshot') is distinct from 'array'
      or jsonb_typeof(x->'metadata'->'restaurant_modifier_unit_delta') is distinct from 'number'
      or length((x->'metadata')::text)>16000
      or case when jsonb_typeof(x->'metadata'->'restaurant_modifier_picks')='array'
        then jsonb_array_length(x->'metadata'->'restaurant_modifier_picks')>100 else true end
      or case when jsonb_typeof(x->'metadata'->'restaurant_modifier_snapshot')='array'
        then jsonb_array_length(x->'metadata'->'restaurant_modifier_snapshot')>100 else true end
    )
  ) then raise exception 'Invalid restaurant cart draft' using errcode='22023'; end if;

  delete from public.cart_items where customer_id=v_customer or user_id=auth.uid();
  insert into public.cart_items(customer_id,product_id,quantity,metadata)
  select v_customer,(x->>'product_id')::uuid,(x->>'quantity')::integer,
    jsonb_build_object(
      'is_bulk',coalesce((x->'metadata'->>'is_bulk')::boolean,false),
      'unit_of_measure',nullif(x->'metadata'->>'unit_of_measure',''),
      'source_kind',coalesce(x->'metadata'->>'source_kind','owned'),
      'merchant_id',nullif(x->'metadata'->>'merchant_id',''),
      'merchant_name',nullif(x->'metadata'->>'merchant_name',''),
      'branch_id',nullif(x->'metadata'->>'branch_id',''),
      'branch_name',nullif(x->'metadata'->>'branch_name',''),
      'listing_id',nullif(x->'metadata'->>'listing_id',''),
      'restaurant_modifier_picks',x->'metadata'->'restaurant_modifier_picks',
      'restaurant_modifier_selection_key',nullif(x->'metadata'->>'restaurant_modifier_selection_key',''),
      'restaurant_modifier_snapshot',x->'metadata'->'restaurant_modifier_snapshot',
      'restaurant_modifier_unit_delta',x->'metadata'->'restaurant_modifier_unit_delta'
    )
  from jsonb_array_elements(p_items) x;
end;
$cart$;

revoke all on function public.replace_customer_cart(jsonb,uuid) from public,anon;
grant execute on function public.replace_customer_cart(jsonb,uuid) to authenticated;
