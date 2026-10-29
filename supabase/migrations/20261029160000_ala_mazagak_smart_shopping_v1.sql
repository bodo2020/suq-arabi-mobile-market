-- Super Marko: published Egyptian recipes + intent-driven shopping groups.
-- Facts (ingredients/servings) are editorially structured; no copied recipe prose or third-party imagery.
create table if not exists public.smart_shopping_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind text not null check (kind in ('recipe','occasion','list')),
  title_ar text not null,
  subtitle_ar text not null default '',
  source_url text,
  base_servings integer not null default 4 check (base_servings between 1 and 30),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.smart_shopping_slots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.smart_shopping_groups(id) on delete cascade,
  label_ar text not null,
  search_terms text[] not null,
  amount numeric(12,2) not null default 1 check(amount>0),
  unit text not null check(unit in ('g','ml','piece','pack')),
  optional boolean not null default false,
  position integer not null default 0,
  unique(group_id,position)
);
create index if not exists idx_smart_shopping_slots_group on public.smart_shopping_slots(group_id,position);
alter table public.smart_shopping_groups enable row level security;
alter table public.smart_shopping_slots enable row level security;
drop policy if exists customer_read_published_groups on public.smart_shopping_groups;
create policy customer_read_published_groups on public.smart_shopping_groups for select to anon,authenticated using(published=true);
drop policy if exists customer_read_published_slots on public.smart_shopping_slots;
create policy customer_read_published_slots on public.smart_shopping_slots for select to anon,authenticated
using (exists(select 1 from public.smart_shopping_groups g where g.id=group_id and g.published=true));
revoke insert,update,delete on public.smart_shopping_groups from anon,authenticated;
revoke insert,update,delete on public.smart_shopping_slots from anon,authenticated;
grant select on public.smart_shopping_groups,public.smart_shopping_slots to anon,authenticated;

-- Customer's editable 'نواقص البيت' list, private to the owner.
create table if not exists public.customer_smart_lists(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 list_key text not null default 'home-shortages',
 entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries)='array'),
 updated_at timestamptz not null default now(),
 unique(user_id,list_key)
);
alter table public.customer_smart_lists enable row level security;
drop policy if exists customer_own_smart_lists on public.customer_smart_lists;
create policy customer_own_smart_lists on public.customer_smart_lists for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.customer_smart_lists to authenticated;

-- Server-only AI budget; the client cannot modify its usage counters.
create table if not exists public.customer_smart_ai_limits(
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_date date not null default current_date,
 requests integer not null default 0,
 primary key(user_id,usage_date)
);
alter table public.customer_smart_ai_limits enable row level security;
revoke all on public.customer_smart_ai_limits from anon,authenticated;

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
      from public.search_customer_smart_catalog_v1(p_branch_id,s.search_terms[1],12) v(item)
      where nullif(v.item->>'id','') is not null
      limit 8
    ) candidate
  ),'[]'::jsonb)
 )
 from public.smart_shopping_groups g
 join public.smart_shopping_slots s on s.group_id=g.id
 where g.slug=p_slug and g.published=true and p_branch_id is not null
 order by s.position;
$$;
revoke all on function public.get_customer_smart_group_bundle_v1(text,uuid) from public;
grant execute on function public.get_customer_smart_group_bundle_v1(text,uuid) to anon,authenticated;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('makarona-beshamel','recipe','مكرونة بشاميل','صينية مظبوطة للّمة','https://www.shamlola.com/recipes/طريقة-عمل-مكرونة-بالبشاميل/',6,1,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مكرونة أقلام',array['مكرونة','مكرونه']::text[],500,'g',false,0
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'لحمة مفرومة',array['لحمة مفرومة','لحم مفروم']::text[],250,'g',false,1
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بشاميل أو دقيق',array['بشاميل','دقيق']::text[],150,'g',false,2
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'لبن',array['لبن','حليب']::text[],750,'ml',false,3
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بصل',array['بصل']::text[],1,'piece',false,4
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'سمنة',array['سمنة','سمن']::text[],60,'g',false,5
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'فلفل أسود',array['فلفل اسود']::text[],5,'g',true,6
from public.smart_shopping_groups where slug='makarona-beshamel'
on conflict(group_id,position) do nothing;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('egyptian-koshary','recipe','كشري مصري','كشري البيت على أصوله','https://www.shamlola.com/recipes/طريقة-عمل-الكشري-المصري/',6,2,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'رز',array['ارز','رز']::text[],400,'g',false,0
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'عدس بجبة',array['عدس بجبة','عدس']::text[],300,'g',false,1
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مكرونة',array['مكرونة']::text[],400,'g',false,2
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'حمص',array['حمص']::text[],200,'g',false,3
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'صلصة طماطم',array['صلصة']::text[],300,'g',false,4
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بصل',array['بصل']::text[],3,'piece',false,5
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'ثوم',array['ثوم']::text[],5,'piece',false,6
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'خل',array['خل']::text[],40,'ml',true,7
from public.smart_shopping_groups where slug='egyptian-koshary'
on conflict(group_id,position) do nothing;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('egyptian-molokhia','recipe','ملوخية بالطشة','الطشة اللي تفتح النفس','https://suhtayn.com/ar/dish/molokhia/eg',6,3,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'ملوخية',array['ملوخية']::text[],500,'g',false,0
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'شوربة أو مرقة',array['مرقة','شوربة']::text[],1500,'ml',false,1
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'ثوم',array['ثوم']::text[],8,'piece',false,2
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'كزبرة ناشفة',array['كزبرة']::text[],20,'g',false,3
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'سمنة',array['سمنة','سمن']::text[],45,'g',false,4
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'ملح',array['ملح']::text[],5,'g',true,5
from public.smart_shopping_groups where slug='egyptian-molokhia'
on conflict(group_id,position) do nothing;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('egyptian-hawawshi','recipe','حواوشي بيتي','ريحته هتلمّ البيت كله','https://www.almasryalyoum.com/news/details/4228641',4,4,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'لحمة مفرومة',array['لحمة مفرومة','لحم مفروم']::text[],500,'g',false,0
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'عيش بلدي',array['عيش بلدي','خبز بلدي']::text[],4,'piece',false,1
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بصل',array['بصل']::text[],1,'piece',false,2
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'فلفل أخضر',array['فلفل اخضر']::text[],1,'piece',false,3
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'ثوم',array['ثوم']::text[],2,'piece',false,4
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بهارات',array['بهارات']::text[],12,'g',false,5
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بقدونس',array['بقدونس']::text[],25,'g',true,6
from public.smart_shopping_groups where slug='egyptian-hawawshi'
on conflict(group_id,position) do nothing;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('match-night','occasion','قعدة ماتش','سناكس وعصاير للّمة',null,4,5,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'شيبسي وسناكس',array['شيبسي','شيبس']::text[],4,'pack',false,0
from public.smart_shopping_groups where slug='match-night'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'عصاير أو مشروبات',array['عصير','مشروب']::text[],4,'pack',false,1
from public.smart_shopping_groups where slug='match-night'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'فشار',array['فشار','ذرة فشار']::text[],2,'pack',false,2
from public.smart_shopping_groups where slug='match-night'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'بسكويت وحاجة حلوة',array['بسكويت']::text[],2,'pack',true,3
from public.smart_shopping_groups where slug='match-night'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مكسرات',array['مكسرات']::text[],1,'pack',true,4
from public.smart_shopping_groups where slug='match-night'
on conflict(group_id,position) do nothing;

insert into public.smart_shopping_groups(slug,kind,title_ar,subtitle_ar,source_url,base_servings,position,published)
values('home-shortages','list','نواقص البيت','كمّل اللي ناقص عندك',null,1,6,true)
on conflict(slug) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'رز',array['رز','ارز']::text[],1,'pack',false,0
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'سكر',array['سكر']::text[],1,'pack',false,1
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'زيت',array['زيت']::text[],1,'pack',false,2
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'شاي',array['شاي']::text[],1,'pack',false,3
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مكرونة',array['مكرونة']::text[],1,'pack',false,4
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مسحوق',array['مسحوق']::text[],1,'pack',true,5
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
insert into public.smart_shopping_slots(group_id,label_ar,search_terms,amount,unit,optional,position)
select id,'مناديل',array['مناديل']::text[],1,'pack',true,6
from public.smart_shopping_groups where slug='home-shortages'
on conflict(group_id,position) do nothing;
