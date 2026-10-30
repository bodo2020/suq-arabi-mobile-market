-- Customer search v2: catalog-wide curated alias knowledge base.
-- Public terms have no customer/store data, and are read-only for shoppers.
create table if not exists public.customer_search_terms_v2 (
  id bigint generated always as identity primary key,
  concept_id text not null check (length(concept_id) between 2 and 72),
  term text not null check (length(term) between 2 and 90),
  term_key text generated always as (public.customer_search_arabic_key_v1(term)) stored,
  country_code text not null default 'ALL' check (country_code ~ '^(ALL|[A-Z]{2})$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint customer_search_terms_v2_unique unique(concept_id, term_key, country_code)
);
create index if not exists customer_search_terms_v2_lookup_idx
 on public.customer_search_terms_v2 (term_key, country_code) where active;
create index if not exists customer_search_terms_v2_concept_idx
 on public.customer_search_terms_v2 (concept_id, country_code) where active;
alter table public.customer_search_terms_v2 enable row level security;
drop policy if exists customer_search_terms_v2_read on public.customer_search_terms_v2;
create policy customer_search_terms_v2_read on public.customer_search_terms_v2
 for select to anon, authenticated using (active = true);
revoke all on public.customer_search_terms_v2 from public, anon, authenticated;
grant select(concept_id,term,term_key,country_code,active) on public.customer_search_terms_v2 to anon,authenticated;

-- Expand complete queries, including a synonym inside a multi-word brand/size search.
-- Do not modify barcodes or names; never expand numerical-only queries.
create or replace function public.customer_search_expand_query_v2(
 p_search text, p_country_code text default 'EG', p_limit integer default 5
)
returns table(alternative text)
language sql stable security invoker
set search_path to ''
as $function$
 with q as (
   select public.customer_search_arabic_key_v1(left(coalesce(p_search,''),120)) as key
 ), matched as (
   select distinct src.term_key as source_key, dst.term_key as target_key
   from public.customer_search_terms_v2 src
   join public.customer_search_terms_v2 dst on dst.concept_id=src.concept_id
     and dst.active and dst.country_code in ('ALL',upper(coalesce(p_country_code,'EG')))
   cross join q
   where src.active and src.country_code in ('ALL',upper(coalesce(p_country_code,'EG')))
     and src.term_key<>dst.term_key and length(q.key)>=2
     and position(' '||src.term_key||' ' in ' '||q.key||' ')>0
 ), candidates as (
   select btrim(replace(' '||q.key||' ',' '||m.source_key||' ',' '||m.target_key||' ')) as alternative,
          length(m.source_key) as source_length
   from matched m cross join q
 )
 select c.alternative from candidates c cross join q
 where c.alternative <> q.key and length(c.alternative)>=2
 group by c.alternative
 order by max(c.source_length) desc,c.alternative
 limit greatest(1,least(coalesce(p_limit,5),8));
$function$;
revoke all on function public.customer_search_expand_query_v2(text,text,integer) from public;
grant execute on function public.customer_search_expand_query_v2(text,text,integer) to anon,authenticated;

-- Starting vocabulary, deliberately curated to avoid treating every related good as identical.
with seed(concept_id,terms) as (values
  ('milk', ARRAY['لبن', 'حليب', 'لبن بقري', 'حليب بقري']::text[]),
  ('dates', ARRAY['بلح', 'تمر', 'تمور']::text[]),
  ('rice', ARRAY['رز', 'ارز', 'أرز']::text[]),
  ('yogurt', ARRAY['زبادي', 'يوجرت', 'يوغورت', 'yogurt']::text[]),
  ('potato', ARRAY['بطاطس', 'بطاطا مقلية', 'بطاطس للقلي']::text[]),
  ('tomato', ARRAY['طماطم', 'بندورة']::text[]),
  ('eggplant', ARRAY['باذنجان', 'بتنجان']::text[]),
  ('cucumber', ARRAY['خيار', 'قثاء']::text[]),
  ('greenpepper', ARRAY['فلفل اخضر', 'فلفل رومي']::text[]),
  ('chili', ARRAY['شطة', 'فلفل حار']::text[]),
  ('garlic', ARRAY['ثوم', 'توم']::text[]),
  ('molokhia', ARRAY['ملوخية', 'ملوحيه']::text[]),
  ('sugar', ARRAY['سكر', 'سكر ابيض']::text[]),
  ('oil', ARRAY['زيت طعام', 'زيت اكل', 'زيت طبخ']::text[]),
  ('flour', ARRAY['دقيق', 'طحين']::text[]),
  ('semolina', ARRAY['سميد', 'سيمولينا']::text[]),
  ('lentils', ARRAY['عدس', 'عدس اصفر', 'عدس مجروش']::text[]),
  ('chickpeas', ARRAY['حمص', 'حمص حب']::text[]),
  ('fava', ARRAY['فول', 'فول مدمس', 'فول تدميس']::text[]),
  ('bread', ARRAY['عيش', 'خبز']::text[]),
  ('toast', ARRAY['توست', 'خبز توست']::text[]),
  ('pasta', ARRAY['مكرونة', 'معكرونة', 'باستا', 'pasta']::text[]),
  ('noodles', ARRAY['نودلز', 'اندومي', 'شعيرية سريعة التحضير']::text[]),
  ('butter', ARRAY['زبدة', 'زبده', 'butter']::text[]),
  ('ghee', ARRAY['سمنة', 'سمن', 'سمنه']::text[]),
  ('cheese', ARRAY['جبنة', 'جبن', 'جبنه']::text[]),
  ('cottage_cheese', ARRAY['جبنة قريش', 'جبن قريش']::text[]),
  ('cream_cheese', ARRAY['جبنة كريمي', 'جبنة قابلة للدهن', 'جبنة مثلثات']::text[]),
  ('processed_cheese', ARRAY['جبنة مطبوخة', 'جبن مطبوخ']::text[]),
  ('honey', ARRAY['عسل نحل', 'عسل طبيعي', 'عسل ابيض']::text[]),
  ('jam', ARRAY['مربى', 'مربي']::text[]),
  ('biscuits', ARRAY['بسكوت', 'بسكويت', 'بسكويتات']::text[]),
  ('chips', ARRAY['شيبسي', 'شيبس', 'رقائق بطاطس', 'بطاطس شيبسي']::text[]),
  ('popcorn', ARRAY['فشار', 'بوب كورن', 'popcorn']::text[]),
  ('chocolate', ARRAY['شوكولاتة', 'شيكولاتة', 'شوكولاته', 'chocolate']::text[]),
  ('candy', ARRAY['بونبوني', 'حلويات مص', 'كاندي', 'candy']::text[]),
  ('gum', ARRAY['لبان مضغ', 'علكة', 'علك', 'chewing gum']::text[]),
  ('icecream', ARRAY['ايس كريم', 'آيس كريم', 'بوظة', 'ايسكريم']::text[]),
  ('juice', ARRAY['عصير', 'جوس', 'juice']::text[]),
  ('soda', ARRAY['مشروب غازي', 'صودا']::text[]),
  ('water', ARRAY['مياه شرب', 'ماء شرب', 'مياه معدنية']::text[]),
  ('coffee', ARRAY['قهوة', 'بن', 'قهوه', 'coffee']::text[]),
  ('instant_coffee', ARRAY['قهوة سريعة الذوبان', 'نسكافيه', 'قهوة فورية', 'instant coffee']::text[]),
  ('tea', ARRAY['شاي', 'شاى', 'tea']::text[]),
  ('herbal_tea', ARRAY['يانسون', 'ينسون']::text[]),
  ('cinnamon', ARRAY['قرفة', 'دارسين']::text[]),
  ('cardamom', ARRAY['حبهان', 'هيل']::text[]),
  ('cumin', ARRAY['كمون', 'كراوية الكمون']::text[]),
  ('turmeric', ARRAY['كركم', 'هرد']::text[]),
  ('sesame', ARRAY['سمسم', 'جلجلان']::text[]),
  ('peanuts', ARRAY['فول سوداني', 'سوداني']::text[]),
  ('nuts', ARRAY['مكسرات', 'تسالي مكسرات']::text[]),
  ('raisins', ARRAY['زبيب', 'عنب مجفف']::text[]),
  ('apricots', ARRAY['مشمش مجفف', 'قمر الدين مشمش']::text[]),
  ('canned_tuna', ARRAY['تونة', 'تونا', 'tuna']::text[]),
  ('sausage', ARRAY['سجق', 'سوسيس']::text[]),
  ('luncheon', ARRAY['لانشون', 'لنشون', 'lunchon']::text[]),
  ('chicken', ARRAY['فراخ', 'دجاج', 'فروج']::text[]),
  ('meat', ARRAY['لحمة', 'لحم', 'لحوم']::text[]),
  ('mincemeat', ARRAY['لحمة مفرومة', 'لحم مفروم']::text[]),
  ('fish', ARRAY['سمك', 'اسماك']::text[]),
  ('shrimp', ARRAY['جمبري', 'روبيان', 'قريدس']::text[]),
  ('toothpaste', ARRAY['معجون سنان', 'معجون اسنان', 'معجون للأسنان', 'toothpaste']::text[]),
  ('toothbrush', ARRAY['فرشة سنان', 'فرشاة اسنان', 'فرشة اسنان']::text[]),
  ('tissue', ARRAY['مناديل ورقية', 'مناديل وجه', 'مناديل كلينكس']::text[]),
  ('toiletpaper', ARRAY['مناديل تواليت', 'ورق حمام', 'مناديل حمام', 'ورق تواليت']::text[]),
  ('diapers', ARRAY['حفاضات', 'حفاضات اطفال', 'بامبرزات']::text[]),
  ('babywipes', ARRAY['مناديل مبللة', 'وايبس', 'wet wipes']::text[]),
  ('detergent', ARRAY['مسحوق غسيل', 'بودرة غسيل', 'مسحوق للغسيل']::text[]),
  ('laundry_liquid', ARRAY['جل غسيل', 'سائل غسيل ملابس', 'منظف غسيل سائل']::text[]),
  ('dishsoap', ARRAY['سائل مواعين', 'صابون مواعين', 'سائل اطباق', 'سائل جلي']::text[]),
  ('dishwasher', ARRAY['غسالة اطباق', 'غسالة صحون']::text[]),
  ('degreaser', ARRAY['مزيل دهون', 'منظف دهون', 'منظف بوتاجاز', 'منظف مطبخ']::text[]),
  ('disinfectant', ARRAY['مطهر', 'معقم', 'سائل تطهير']::text[]),
  ('bleach', ARRAY['كلور', 'مبيض ملابس', 'ماء جافيل']::text[]),
  ('floorcleaner', ARRAY['منظف ارضيات', 'مسحوق مسح', 'سائل مسح']::text[]),
  ('airfreshener', ARRAY['معطر جو', 'فريشنر', 'معطر غرف']::text[]),
  ('trashbags', ARRAY['اكياس زبالة', 'اكياس قمامة', 'اكياس نفايات']::text[]),
  ('shampoo', ARRAY['شامبو', 'شامبو شعر', 'shampoo']::text[]),
  ('conditioner', ARRAY['بلسم شعر', 'كونديشنر', 'hair conditioner']::text[]),
  ('bodywash', ARRAY['شاور جل', 'جل استحمام', 'غسول جسم']::text[]),
  ('deodorant', ARRAY['مزيل عرق', 'مضاد تعرق', 'ديودرانت']::text[]),
  ('handwash', ARRAY['صابون ايد', 'غسول يدين', 'صابون سائل لليدين']::text[]),
  ('sanitarypads', ARRAY['فوط صحية', 'فوط نسائية']::text[]),
  ('cotton', ARRAY['قطن طبي', 'قطن ابيض طبي']::text[]),
  ('batteries', ARRAY['بطاريات', 'حجارة بطارية']::text[]),
  ('lightbulb', ARRAY['لمبة', 'مصباح كهربائي', 'لمبات']::text[]),
  ('juhayna', ARRAY['جهينة', 'جهينه', 'juhayna', 'johayna']::text[]),
  ('domty', ARRAY['دومتي', 'دومتى', 'domty']::text[]),
  ('juhayna_milk', ARRAY['حليب جهينة', 'لبن جهينة']::text[]),
  ('pepsi', ARRAY['بيبسي', 'pepsi']::text[]),
  ('coca_cola', ARRAY['كوكاكولا', 'كوكا كولا', 'coca cola', 'coke']::text[]),
  ('nescafe_brand', ARRAY['نسكافيه', 'نسكافية', 'nescafe', 'nescafé']::text[]),
  ('persil', ARRAY['برسيل', 'persil']::text[]),
  ('ariel', ARRAY['اريال', 'أريال', 'ariel']::text[]),
  ('detol', ARRAY['ديتول', 'detol', 'dettol']::text[]),
  ('sunlight', ARRAY['صن لايت', 'صنلايت', 'sunlight']::text[]),
  ('lipton', ARRAY['ليبتون', 'lipton']::text[]),
  ('knorr', ARRAY['كنور', 'knorr']::text[]),
  ('maggi', ARRAY['ماجي', 'maggi']::text[]),
  ('heinz', ARRAY['هاينز', 'heinz']::text[])
)
insert into public.customer_search_terms_v2(concept_id,term,country_code)
select concept_id, unnest(terms), 'ALL' from seed
on conflict(concept_id,term_key,country_code) do nothing;
notify pgrst, 'reload schema';
