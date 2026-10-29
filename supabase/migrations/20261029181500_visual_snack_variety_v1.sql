-- Prefer genuine, in-stock catalog product photos for visual mix-and-match.
-- No synthetic photos or third-party decorative images.
create or replace function public.get_customer_smart_group_bundle_v1(p_slug text,p_branch_id uuid)
returns setof jsonb language sql stable security definer set search_path=''
as $$
 select pg_catalog.jsonb_build_object(
  'slot_id',s.id,'label',s.label_ar,'amount',s.amount,'unit',s.unit,
  'optional',s.optional,'position',s.position,
  'products',coalesce((
    select pg_catalog.jsonb_agg(candidate.item order by candidate.photo_rank asc, (candidate.item->>'search_rank')::numeric desc)
    from (
      select v.item,
        case when g.kind='occasion' and jsonb_array_length(coalesce(v.item->'image_urls','[]'::jsonb))>0
          then 0 when g.kind='occasion' then 1 else 0 end as photo_rank
      from public.search_customer_smart_catalog_v1(p_branch_id,s.search_terms[1],50) v(item)
      where nullif(v.item->>'id','') is not null
        and coalesce((v.item->>'quantity')::numeric,0)>0
        and (cardinality(s.required_terms)=0 or exists (
          select 1 from unnest(s.required_terms) req
          where public.customer_search_arabic_key_v1(v.item->>'name')
            like '%' || public.customer_search_arabic_key_v1(req) || '%'
        ))
        and not exists (
          select 1 from unnest(s.excluded_terms) bad
          where public.customer_search_arabic_key_v1(v.item->>'name')
            like '%' || public.customer_search_arabic_key_v1(bad) || '%'
        )
      order by photo_rank asc, (v.item->>'search_rank')::numeric desc
      limit 12
    ) candidate
  ),'[]'::jsonb)
 )
 from public.smart_shopping_groups g
 join public.smart_shopping_slots s on s.group_id=g.id
 where g.slug=p_slug and g.published=true and p_branch_id is not null
 order by s.position;
$$;
-- Popcorn is an optional addition; a four-person party can be four
-- different snacks and four different drinks without forced popcorn.
update public.smart_shopping_slots s set optional=true
from public.smart_shopping_groups g
where s.group_id=g.id and g.slug='match-night' and s.label_ar='فشار';
