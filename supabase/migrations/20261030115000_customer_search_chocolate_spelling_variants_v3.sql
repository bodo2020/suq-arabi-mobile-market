-- Additional chocolate spellings and frequent Egyptian search typos.
-- A single concept maps aliases in both directions; products remain unchanged.
-- Keep this database vocabulary aligned with src/lib/searchVocabulary.ts.
insert into public.customer_search_terms_v2 (concept_id, term, country_code)
select 'chocolate', spelling, 'ALL'
from unnest(array[
  'شوكولاتة', 'شوكولاته',
  'شيكولاتة', 'شيكولاته',
  'شكولاتة', 'شكولاته',
  'شوكلاته', 'شوكولا',
  'شوكالته', 'شوكليت',
  'شوكوليت', 'شيكولا',
  'شوكولات', 'chocolate'
]::text[]) as chocolate_variants(spelling)
on conflict (concept_id, term_key, country_code) do nothing;
