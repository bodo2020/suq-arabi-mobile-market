# Marko Recommendation Engine V2 — Phase 1 (2026-10-30)

## Scope and boundaries

This PR implements the **customer product-detail recommendation foundation**, not a trained AI model, purchasing automation, or a Supabase migration.

- The existing authenticated `marko-ai-engine` gateway remains the shared Marko AI entry point.
- The product-detail rail runs a fast, deterministic V2 ranker on catalog-authorized product records.
- Relationships are typed `complement`, `similar`, or `discover` rather than a single "you may like" label.
- The algorithm handles Egyptian Arabic spelling variants such as لبن/حليب; it does not confuse concept synonyms with replacement products.
- The live cart excludes already-added product IDs from suggestions, without mutating the cart.
- Candidate filtering rejects products with zero or invalid price/quantity, mismatched explicit owned branch, mismatched marketplace branch and mismatched merchant.
- Candidate sources remain `getBranchCatalog` and `getMarketplaceStoreCatalog`; the AI never invents a product, stock, prices, merchant or listing.
- Product-detail recommendations remain lazy-loaded after the main product content, respecting the existing swipe/navigation behavior.

## Integration into the existing Marko AI Engine

The shared `marko-ai-engine` currently routes `customer_shopping` to `customer-smart-ideas` and `business_admin` to `ai-gateway`. This phase intentionally leaves those deployed routes, authentication, quota, and existing business functions untouched.

The V2 ranker optionally accepts `learnedScores: { [candidateProductId]: number }` where each number is clamped to [0, 1] and contributes at most 25 points. **No learned score service is enabled or called in this phase.** When enabled later, only trusted, authorized product IDs from the catalog may be ranked; learned output can never override product/source/stock constraints.

For Phase 2, add a dedicated, authenticated, allowlisted gateway route for recommendation signals, with:
- Branch, merchant and customer identity derived and verified on the server, not trusted from request body.
- Aggregated order co-occurrence and optional repeat-purchase signals, subject to consent, privacy controls, tenant isolation and minimum support.
- Immutable model/version and experiment identifiers, cache keys scoped to branch, merchant, catalog version and customer segment.
- An explicit fallback to the deterministic V2 ranker whenever inference is unavailable. Do not call Gemini/Groq on every product-detail page load.
- No cross-merchant sharing of customer-level sales; aggregate comparisons only where policies permit.

## Why not train a neural recommender immediately?

Our current catalog and transactional data volume have not been validated for production-quality collaborative filtering. Begin with explainable relationships and historical evaluation, then introduce learned scoring if it wins against the baseline on **chronologically separated holdout orders**. Treat product stockouts and test transactions carefully; avoid training on future events.

## Analytics and success gates (not yet implemented)

`data-recommendation-kind` and `data-recommendation-product-id` are UI hooks for subsequent first-party impression/click/add-to-cart attribution. They do **not** persist analytics yet.

Before a production rollout:
1. Validate all customer branch/account paths, especially marketplace, bulk and weighted products, on mobile and desktop.
2. Run `npm run test:recommendations`, existing gateway tests and the production build.
3. Connect first-party, consent-aware impression/click/add-to-cart and completed-order attribution using real (non-demo) orders.
4. Run a randomized A/B experiment vs. the current recommender; primary metric is completed order conversion / incremental gross margin. Guardrails include relevance complaints, latency, stock errors and privacy.
5. Roll out behind a remotely controlled feature flag, first to internal QA, then a small customer cohort.
6. Keep a fast rollback to the prior recommender. Do not deploy or merge this draft PR without QA approval.

## Merchant procurement is a related but separate decision service

Super Business's `suggestedPurchaseQuantity` in `src/pages/InventoryManagement.tsx` currently targets min/max stock. A future **Merchant Demand Intelligence** service will forecast demand per branch/product, include lead time, review interval, on-order and reserved quantities, pack size, wastage and safety stock; output must be a merchant-reviewable **draft**, never an automatic supplier purchase. It will reuse the same product identity and analytics layer but a separate decision policy.

## Manual QA checklist

- Milk/لبن pages show cereal and biscuits as complements; other milk variants appear as similar.
- Pasta pages prioritize tomato sauce and cheese as complements.
- Add a suggested product to cart and confirm it disappears from suggestions.
- Switch delivery address / store and ensure there are no products from the previous store.
- Marketplace product suggestions stay inside the same marketplace branch and merchant.
- Zero-stock and invalid-price products never appear.
- Mobile swipe gestures, loading skeleton, weighted purchase controls and bulk variant navigation remain intact.

## Phase 2 companion staged in backend PR #171

Companion: https://github.com/bodo2020/market-maadaoui-sells/pull/171

- A strictly allowlisted `customer_recommendations` mode in the **existing** shared Marko AI gateway can return anonymous, branch-scoped co-purchase scores.
- The client has `src/lib/productRecommendationSignals.ts`, gated by **`VITE_MARKO_COPURCHASE_V1 === 'true'`**. It remains **OFF by default** in existing release builds.
- Scores are asynchronously fetched **after** the product detail becomes visible; the regular catalog recommendations render without awaiting AI inference.
- Every learned candidate ID is resolved through the existing authenticated/address-scoped `get_customer_branch_products_by_ids` catalog RPC. No AI-supplied product names, availability, price or merchant are trusted.
- Marketplace recommendation rails keep deterministic same-merchant candidate restrictions; co-purchase scoring is **not enabled** for marketplace.
- Data quality gate: 365-day receipt data in the linked marketpos project is currently too sparse for any reliable minimum-support pair. An empty response is expected and handled without errors.
- Do not turn the flag ON until migration, new Edge function, gateway deploy, isolated branch tests and user-flow QA are all approved. Keep feature disabled during initial code merge.

## Recommendation learning events (staged)

- `src/lib/productRecommendationAnalytics.ts` sends best-effort, authenticated events through the existing Marko AI Engine.
- The rail records an `impression` only after it becomes visible, a `click` on recommendation-card interaction, and `add_to_cart` when a recommended product is added to the cart.
- Events are disabled for marketplace/partner listings and require a current delivery branch plus a signed-in session; no personal identifiers, price or cart contents are sent.
- Session identifier is a random UUID stored only in sessionStorage. Backend PR #171 validates the branch and both product IDs and stores only pair/event/session/time metadata.
- Analytics never blocks navigation, product detail or cart behavior.
