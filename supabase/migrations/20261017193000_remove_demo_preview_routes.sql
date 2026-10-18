-- Demo shops now use the normal marketplace catalog and checkout flow.
drop function if exists public.get_customer_demo_marketplace_catalog_v1(uuid, uuid, text, integer);
drop function if exists public.get_customer_demo_marketplace_stores_v1(uuid, integer);
