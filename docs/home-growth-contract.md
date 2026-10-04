# Super Marko home and Growth

The home renderer uses `get_public_home_page` and the existing five section types. Published ordering, visibility, branch targeting, schedules, audience and server A/B assignment remain authoritative. An empty published section list stays empty; defaults are used only when no configuration/cache is available. Cached branch/time eligibility is checked again on the client.

## Configuration

| Section | `data_source` | `display_config` |
| --- | --- | --- |
| `hero_banners` | `banner_ids` optional; `limit` | Slider; duplicate banners appear once |
| `categories` | `category_ids` optional; `limit` (default 8, max 16) | `layout`: `grid` (four mobile columns) or `horizontal` |
| `featured_products` | `mode`: `catalog`, `offers`, `buy_again`, `nearby_stores`; `limit` (max 24); optional `product_ids`, `category_ids` | `layout`: `horizontal` or `grid`; `dedupe`: defaults true |
| `smart_recommendations` | `limit`; optional explicit `product_ids`, `category_ids` | Horizontal or two-column mobile grid; dedupe |
| `product_collection` | Exact `collection_id` or explicit `all: true`; `limit` per collection | Horizontal or two-column mobile grid; dedupe |

Product sections default to currently available stock. `include_unavailable: true` displays unavailable states. `offers` requires an actual positive offer price below the current regular price. Deduplication follows Growth order, using product plus listing identity; regular and bulk sale units remain distinct inside one module. Set `dedupe: false` for an intentional repeated campaign.

`buy_again` reads the existing owner-scoped purchase-history RPC, considers completed purchases only, and matches exact product/listing IDs against the current address catalogue. It never reuses historical prices or guesses identity from names. Legacy store receipts lacking product IDs cannot appear in this module. The home queries up to 100 recent purchases; the orders screen remains the complete tracking destination.

Nearby stores use the existing location-scoped marketplace RPC and cache by coordinates. Catalogue source priority stays in the existing discovery RPC. The selected address follows the same deliverable/default ordering as branch resolution. Address changes refresh location, catalogue and home configuration.

## Growth and AI

Growth Home Builder exposes source, layout, item count, deduplication and unavailable-product controls. Saving merges known fields into existing `data_source` and `display_config`, preserving extra IDs/metadata from AI, experiments and future clients. No database schema change is needed. Growth AI still analyzes and proposes actions through the existing gateway and human-confirmation flow; this release does not enable automatic publishing.

For the recommended home order, arrange categories → one hero → buy again → offers → use-case collections → nearby stores → catalogue in the Growth draft. Use collections for breakfast, weekly shopping, cleaning and snacks, with actual selected product IDs. Publish through the existing Growth workflow. Existing live campaigns/drafts are not silently overwritten by a frontend release.

The delivery summary uses branch-provided estimates, base fees and Cairo opening hours, with overnight support. It labels estimates as approximate and does not invent a live courier ETA. The current-order shortcut opens `/orders?order_id=…`, including grouped purchases.

## Validation

- `npm run typecheck`, `npm run build`, `npm run test:customer`.
- Fourteen home logic regressions cover empty/hidden content, schedules/branches, real discounts, explicit product IDs, collection selection, deduplication, listing identity, current repurchase prices/stock, honest recommendation fallback and Cairo overnight hours.
- `supabase/tests/customer_home_contract.sql` verifies the public JSON contract and purchase ownership without writes.
- Growth: `npm test` and `npm run build`; three regressions verify AI metadata preservation, exact/all collection selection and normalization.
- Android build uses the existing workflow and release/signing rules. Updating an old installation still requires its original signing key.
