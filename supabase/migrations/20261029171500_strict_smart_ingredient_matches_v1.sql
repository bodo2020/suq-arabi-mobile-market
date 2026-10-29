-- Prevent misleading 'ingredient' matches (spice mix != minced meat,
-- olive green != green pepper). Positive/negative terms are editorial.
alter table public.smart_shopping_slots
 add column if not exists required_terms text[] not null default '{}',
 add column if not exists excluded_terms text[] not null default '{}';

create or replace function public.get_customer_smart_group_bundle_v1(p_slug text,p_branch_id uuid)
returns setof jsonb language sql stable security definer set search_path=''
as $$
 select pg_catalog.jsonb_build_object(
  'slot_id',s.id,'label',s.label_ar,'amount',s.amount,'unit',s.unit,
  'optional',s.optional,'position',s.position,
  'products',coalesce((
    select pg_catalog.jsonb_agg(candidate.item order by (candidate.item->>'search_rank')::numeric desc)
    from (
      select v.item
      from public.search_customer_smart_catalog_v1(p_branch_id,s.search_terms[1],30) v(item)
      where nullif(v.item->>'id','') is not null
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
      limit 8
    ) candidate
  ),'[]'::jsonb)
 )
 from public.smart_shopping_groups g
 join public.smart_shopping_slots s on s.group_id=g.id
 where g.slug=p_slug and g.published=true and p_branch_id is not null
 order by s.position;
$$;
update public.smart_shopping_slots s set
 search_terms=array['لحم مفروم']::text[],
 required_terms=array['لحم مفروم']::text[],
 excluded_terms=array['خلطة','بهارات','لانشون']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='لحمة مفرومة';
update public.smart_shopping_slots s set
 search_terms=array['لحم مفروم']::text[],
 required_terms=array['لحم مفروم']::text[],
 excluded_terms=array['خلطة','بهارات','لانشون']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='لحمة مفرومة';
update public.smart_shopping_slots s set
 search_terms=array['بصل']::text[],
 required_terms=array['بصل']::text[],
 excluded_terms=array['صلصة','صوص','مرقة','بطعم','نكهة','مقرمش']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='بصل';
update public.smart_shopping_slots s set
 search_terms=array['بصل']::text[],
 required_terms=array['بصل']::text[],
 excluded_terms=array['صلصة','صوص','مرقة','بطعم','نكهة','مقرمش']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='بصل';
update public.smart_shopping_slots s set
 search_terms=array['بصل']::text[],
 required_terms=array['بصل']::text[],
 excluded_terms=array['صلصة','صوص','مرقة','بطعم','نكهة','مقرمش']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-koshary' and s.label_ar='بصل';
update public.smart_shopping_slots s set
 search_terms=array['فلفل']::text[],
 required_terms=array['فلفل']::text[],
 excluded_terms=array['زيتون','شيبسي','بطعم','فلفليتا','جبنة','لانشون','تونة','كرانشي','دوريتوس','خلطة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='فلفل أخضر';
update public.smart_shopping_slots s set
 search_terms=array['ملوخية']::text[],
 required_terms=array['ملوخية']::text[],
 excluded_terms=array['خلطة','بهارات']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-molokhia' and s.label_ar='ملوخية';
update public.smart_shopping_slots s set
 search_terms=array['عيش']::text[],
 required_terms=array['عيش']::text[],
 excluded_terms=array['مقرمش','بطعم']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='عيش بلدي';
update public.smart_shopping_slots s set
 search_terms=array['عدس']::text[],
 required_terms=array['عدس']::text[],
 excluded_terms=array['شوربة','خلطة','نكهة','سناكس']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-koshary' and s.label_ar='عدس بجبة';
update public.smart_shopping_slots s set
 search_terms=array['حمص']::text[],
 required_terms=array['حمص']::text[],
 excluded_terms=array['سناكس','بطعم','نكهة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-koshary' and s.label_ar='حمص';
update public.smart_shopping_slots s set
 search_terms=array['لبن']::text[],
 required_terms=array['لبن']::text[],
 excluded_terms=array['شوكولاتة','باللبن','نكهة','بسكويت','حليب بودرة']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='makarona-beshamel' and s.label_ar='لبن';
update public.smart_shopping_slots s set
 search_terms=array['ثوم']::text[],
 required_terms=array['ثوم']::text[],
 excluded_terms=array['مرقة','نكهة','بطعم']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-hawawshi' and s.label_ar='ثوم';
update public.smart_shopping_slots s set
 search_terms=array['ثوم']::text[],
 required_terms=array['ثوم']::text[],
 excluded_terms=array['مرقة','نكهة','بطعم']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='egyptian-molokhia' and s.label_ar='ثوم';
update public.smart_shopping_slots s set
 search_terms=array['زيت']::text[],
 required_terms=array['زيت']::text[],
 excluded_terms=array['كريم','شعر','مساج','معطر','شامبو','زيتون اخضر']::text[]
 from public.smart_shopping_groups g
 where s.group_id=g.id and g.slug='home-shortages' and s.label_ar='زيت';
