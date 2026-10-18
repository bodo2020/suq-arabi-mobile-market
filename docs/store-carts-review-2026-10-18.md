# Store baskets and restaurant checkout review — 18 October 2026

## Delivered

- Independent saved baskets for each partner shop and the owned supermarket. Selecting baskets determines checkout; completing checkout subtracts only those purchased lines and quantities.
- Removed the old two-partner restriction from cart persistence and hydration. Dispatch capacity remains two partners plus the owned supermarket per combined order. Other baskets remain saved.
- Listing-aware price/stock mapping prevents the same product in different shops from sharing a quoted price.
- Combined delivery starts at a selected pickup, visits the other selected shop(s), then the customer. The owned hub is a stop only when its products are selected. Both partner pickup orders are compared by road distance.
- Old hub-origin route cache entries are excluded. Provider failure blocks a new quote instead of charging a straight-line estimate as a verified route.
- Restaurant storefront cards, menu rows, preparation times, store basket shortcut and per-store order details use the green/yellow identity. Substitution actions target child order IDs.
- Newly saved pending checkouts include their original road quote ID. A retry goes to the idempotent placement RPC before re-quoting, allowing recovery of an already committed order after a lost response. Server-side price/stock/address validation remains authoritative.

## Deployment

- Applied `20261018010426_independent_store_carts_and_restaurant_identity.sql` to the connected Supabase project.
- Deployed `customer-multistore-route`, version 7.
- Set Market Elmadawy's effective delivery policy to EGP 7/km. Base/included distance/extra-pickup fees remain zero. Other existing range and detour limits were preserved.
- Created missing delivery settings for the five published trial restaurant/vegetable/cosmetics/pharmacy/butcher shops using the existing superadmin RPC. Enabled combined fleet delivery, inherited hub pricing, customer pays 100%. Existing settings, including the stationery shop, were not overwritten.
- No real order, stock reservation, payment or settlement was created during verification.

## Verification

- `node scripts/test-store-carts.mjs`: independent baskets, selection limits, distinct listings, quantities/weights, route permutations, hub inclusion, provider failure, idempotent checkout request replay.
- `node scripts/test-store-carts-db.mjs`: actual cart SQL in PGlite; five store baskets, user isolation, 300-line limit, atomic rejection, road quote/address binding and 6 km × EGP 7 = EGP 42.
- Category section tests, Arabic product search tests and TypeScript passed.
- Actual public API quote with restaurant + vegetables: OSRM 0.649 km, EGP 7/km, EGP 4.54 delivery, EGP 60 products, EGP 64.54 total. Only the two shops and customer were stops.
- Both trial shops resolve to the same road point; the live inter-shop leg was zero. Nonzero inter-shop distances were verified in handler tests, not by moving real shop coordinates.
- Browser review at 390px and desktop widths verified restaurant/menu cards and selecting/deselecting independent baskets. Preview data is a fixture; live price verification used the API separately.
- Production web build and Android debug build verified. Browser warnings about bundle size and Browserslist age are pre-existing.

## Boundaries and follow-up priorities

1. Combined delivery remains limited to two partner shops (plus the owned supermarket), as enforced by the existing dispatch policy and backend. Expanding this requires a matching dispatch change.
2. New partner onboarding should initialize delivery settings explicitly; the five existing trial shops had no settings and could not combine until repaired.
3. A real placed-order journey through preparation, driver collection and settlement was not executed for this change. Quote and local transactional tests do not replace that end-to-end exercise.
4. Pending requests saved by older app versions lack the new original-route field and retain the existing fallback behavior.
5. Cart hydration still removes unavailable listings and caps quantities to current stock. A future improvement is an explicit unavailable-items section with customer acknowledgement.
6. The existing grouped cancellation/refund accounting was not redesigned; totals and partial cancellation require a separate focused test before expanding that flow.

## Security review

Cart replacement keeps `auth.uid()`, expected-user binding, customer ownership, advisory lock, input bounds and security-invoker behavior. Checkout eligibility restrictions remain on the server. No new grants or security-definer entry points were introduced. Catalog APIs intentionally remain public for published shops and retain their existing eligibility filters. Supabase advisors still report the existing broad project warnings; this change does not claim a project-wide security cleanup. See [Supabase function exposure guidance](https://supabase.com/docs/guides/database/database-linter).
