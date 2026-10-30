# Marko AI — Customer phase 1 (2026-10-30)

## Deployed foundation
- Reuse authenticated `customer-smart-ideas` Edge Function (Gemini 2.5 Flash Lite), published smart shopping groups and existing per-customer quota. No new API keys are committed.
- Optional model response `search_query` resolves a product-shopping intent into existing branch-aware `/search?q=...`, never into a synthetic product. Existing clients that only read `slug` remain compatible.
- Customer home and search discovery expose the same branded `MarcoAiPrompt`. Suggestions populate the form but do not invoke the provider until submission.
- Group intent opens existing `/ala-mazagak/:slug` UI; the customer decides what to add to cart.
- No schema migration. Checkout, delivery quote, prices, commission, orders and payment are untouched.

## Security and cost
- Edge Function still checks the user's JWT using `auth.getUser`, consumes `consume_customer_smart_ai_quota_v1` and uses server-side `GEMINI_API_KEY`.
- Group slugs are validated against currently published groups. Search terms are stripped of unsupported characters and capped at 64 chars.
- Rate limits, provider errors, malformed responses and ambiguous requests fail safely. Never auto-purchase, estimate shipping, or trust AI-proposed prices.

## Release checklist
1. Review PR and frontend accessibility/RTL.
2. Deploy `customer-smart-ideas` with `verify_jwt=true` to the Supabase project named in `supabase/config.toml` and `src/integrations/supabase/client.ts`.
3. Validate a signed-in customer's group request, single-product request, ambiguous request, quota exceeded, and no-login case. Confirm user sees real catalogue results and correct branch pricing.
4. Verify Android mobile viewport, offline fallback, and standard search/barcode unaffected.
5. Track error rates and API calls before wider rollout.

## Next phases (not included here)
- Product weight/volume extraction with source, confidence and human review in Business.
- Shipment aggregation based on quantities, volume and packaging.
- Vehicle capacity and delivery quote simulations only; no live fee changes until approved and audited.
