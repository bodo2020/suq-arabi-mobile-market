-- Fix a live checkout failure observed at 2026-10-30 04:11 UTC:
-- HTTP 409 on place_customer_order_with_voucher_v3 and SQLSTATE 23505,
-- unique index order_picker_assignment_offers_one_live_user_v1.
--
-- The automatic picker offer is a best-effort secondary effect of creating an
-- order; a competing/stale picker offer must not abort the entire customer's
-- checkout transaction. The two existing unique constraints remain intact.
-- Reattempting assignment can happen through the existing offer scheduler.
create or replace function private.sync_order_picker_assignment_offer_v1(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_state private.order_fulfillment_state_v1%rowtype;
  v_order public.online_orders%rowtype;
  v_mode text:='shadow';
  v_ttl integer:=90;
  v_candidate record;
  v_offer private.order_picker_assignment_offers_v1%rowtype;
  v_customer_name text;
begin
  select * into v_order from public.online_orders where id=p_order_id;
  select * into v_state from private.order_fulfillment_state_v1 where order_id=p_order_id;
  if v_order.id is null or v_state.order_id is null or v_order.branch_id is null then return; end if;
  v_customer_name:=coalesce(nullif(trim(v_order.customer_snapshot->>'name'),''),'عميل');

  select p.mode,p.offer_ttl_seconds into v_mode,v_ttl
  from private.order_picker_assignment_policy_v1 p where p.branch_id=v_order.branch_id;
  v_mode:=coalesce(v_mode,'shadow');
  v_ttl:=coalesce(v_ttl,90);

  update private.order_picker_assignment_offers_v1
     set status='expired',responded_at=coalesce(responded_at,now()),updated_at=now()
   where order_id=p_order_id and status='offered' and expires_at<=now();

  if v_mode<>'assisted' then
    update private.order_picker_assignment_offers_v1
       set status='cancelled',responded_at=coalesce(responded_at,now()),reason=coalesce(reason,'policy_not_assisted'),updated_at=now()
     where order_id=p_order_id and status='offered';
    return;
  end if;

  if v_state.picker_user_id is not null
     or v_state.fulfillment_state<>'queued'
     or v_order.status::text not in ('confirmed','preparing') then
    update private.order_picker_assignment_offers_v1
       set status='cancelled',responded_at=coalesce(responded_at,now()),reason=coalesce(reason,'order_not_offerable'),updated_at=now()
     where order_id=p_order_id and status='offered';
    return;
  end if;

  select * into v_offer
  from private.order_picker_assignment_offers_v1
  where order_id=p_order_id and status='offered' and expires_at>now()
  limit 1;
  if v_offer.id is not null then return; end if;

  select c.* into v_candidate
  from private.order_picker_candidates_v1(p_order_id) c
  where c.can_accept
    and not exists(
      select 1 from private.order_picker_assignment_offers_v1 live
      where live.offered_user_id=c.user_id and live.status='offered' and live.expires_at>now()
    )
    and not exists(
      select 1 from private.order_picker_assignment_offers_v1 prior
      where prior.order_id=p_order_id and prior.offered_user_id=c.user_id
        and (
          (prior.status='declined' and coalesce(prior.responded_at,prior.updated_at)>now()-interval '10 minutes')
          or (prior.status='expired' and prior.expires_at>now()-interval '2 minutes')
        )
    )
  order by c.score desc,c.idle_minutes desc,c.user_name
  limit 1;

  if v_candidate.user_id is null then return; end if;

  -- Race-safe: an existing offered row might expire without its status being
  -- cleared, or another concurrent order might reserve this picker first.
  -- Keep both unique indexes authoritative, but don't roll back the order.
  insert into private.order_picker_assignment_offers_v1(
    order_id,branch_id,offered_user_id,recommended_score,status,reason,expires_at,metadata
  ) values(
    p_order_id,v_order.branch_id,v_candidate.user_id,v_candidate.score,'offered','smart_assisted',
    now()+make_interval(secs=>v_ttl),
    jsonb_build_object('display_id',coalesce(v_order.tracking_number,left(v_order.id::text,8)),'customer_name',v_customer_name,'items_total',v_state.items_total)
  )
  on conflict do nothing
  returning * into v_offer;

  -- No offer was created: never send a false staff notification.
  if v_offer.id is null then return; end if;

  insert into private.notification_events_v2(
    audience,recipient_user_id,branch_id,event_key,category,severity,title,body,source_kind,source_id,
    action_url,action_label,requires_action,dedupe_key,eligible_channels,status,expires_at,metadata
  ) values(
    'staff',v_candidate.user_id,v_order.branch_id,'picker_assignment_offer','operations','high',
    'طلب تجهيز مقترح لك','لديك طلب تجهيز جديد بانتظار قبولك خلال وقت محدود.',
    'order_picker_assignment_offer',v_offer.id,'/operations/'||p_order_id::text,'فتح الطلب',true,
    'picker_offer:'||v_offer.id::text,array['in_app']::text[],'active',v_offer.expires_at,
    jsonb_build_object('offer_id',v_offer.id,'order_id',p_order_id,'score',v_candidate.score)
  )
  on conflict(recipient_user_id,dedupe_key) do update set
    status='active',read_at=null,resolved_at=null,expires_at=excluded.expires_at,updated_at=now();
end;
$function$;
