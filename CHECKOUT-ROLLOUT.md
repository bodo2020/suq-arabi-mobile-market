# Customer checkout preparation — 6 September 2026

## Current state

The new checkout is **not enabled** and these customer UI changes are **not deployed**. The previously published version 7 remains the working preview. This is a prepared and database-tested stage, not a completed production rollout.

Database `marketpos` (`qzvpayjaadbmpayeglon`) received:
- `prepare_authoritative_customer_checkout`
- `qualify_checkout_delivery_price`
- `deny_client_access_to_checkout_rollout`

`supabase/authoritative_checkout.sql` combines their final definitions. The CLI is unavailable, so this is a reproducible SQL source, not an invented migration-history filename.

## Implemented

- Authenticated quote/placement RPCs; privileged implementations live in the private schema and check customer/address ownership explicitly. Public RPCs are security invoker. Anonymous execution is revoked.
- Product price and active product offers, optional branch pricing, bulk price and pack stock multiplier, gram-to-kilogram conversion, shipping tariff and unlimited/unexpired automatic free-delivery offers are computed on the server. Coupons and usage-limited promotions are not part of this flow.
- The customer reviews a quote token; changed price/address/profile data rejects placement and requires another confirmation. Submitted client price/name/total fields are ignored.
- Branch stock is checked, conditionally decremented, and the order is inserted in one transaction. Retries with the same request UUID and payload return the same order. A changed payload or another customer cannot reuse that UUID.
- Inventory and aggregate product quantity columns now retain three decimals. Existing data values were not rewritten; the inventory aggregate trigger retains those decimals.
- Order customer/address/map/product snapshots persist historical details. Checkout-created order commercial fields cannot be changed directly. Cancellation before shipment releases exact stock once, and cancelled checkout orders cannot be reopened. Shipped/delivered orders require the return process.
- Frontend payment shows the server quote, persists the pending request before dispatch, restores unresolved requests after reload, and uses Web Locks for cross-tab request creation when available. Unsupported browsers have only the localStorage/single-tab fallback.
- Wallet instructions appear after order creation and do not mark payment paid. Success reads the persisted order by URL ID under RLS; it no longer invents a successful receipt from route state or promises automatic messages.

## Verification

Executed `supabase/authoritative_checkout.test.sql` in a rollback-only transaction. Passed: rollout stays closed, forged prices/inactive product offers ignored, 6-pack stock multiplier, 250g deduction of exactly 0.250kg, stable retry ID and one deduction, changed token/payload rejection, foreign-address/request denial, client checkout-marker forgery denial, immutable total, cancellation restock once, cancelled-order reopening denial, anonymous denial. Foreign key constraints were checked before rollback.

Confirmed afterward: zero fixture products, zero committed checkout-version-1 orders, rollout still disabled. No real test purchase or stock deduction was committed.

Security advisors identified the intentionally inaccessible rollout table's missing-policy informational notice; an explicit deny policy was added. The broader project's existing advisories are not claimed resolved.

Dependency installation again ended with `network approval was cancelled before a decision was returned`. `build-site.mjs` consequently reports `vite: not found`. No successful frontend build, full TypeScript check, browser QA, or actual two-connection concurrency test is claimed. Database behavior was tested through SQL, not the customer browser.

## Coordinated release work still required

1. Admin compatibility draft: https://github.com/bodo2020/market-maadaoui-sells/pull/9. It skips legacy stock loops in all three identified order completion screens for checkout_version=1 and shows saved customer/address/map information. It preserves older orders. It is not merged or deployed.
2. Move POS/sale/inventory read-modify-write stock paths onto shared atomic branch stock operations. The existing services can overwrite concurrent changes, so the checkout remains disabled. Also verify fractional weights and the return flow end to end; existing admin code rounds some legacy weights.
3. Coordinate catalog/offer/delivery/inventory RLS tightening with those staff changes, and remove `customer_order_insert` so direct client inserts cannot bypass checkout. Current legacy policies still allow direct checkout and permissive catalog mutation; this preparation is not an overall security fix.
4. Resolve legacy financial recording/order-item editing behavior for immutable new orders and exercise staff/customer authorization on actual deployed app versions.
5. Build and test both frontends. Only then deploy compatible versions and enable `private.customer_checkout_rollout`. Do not enable it just to preview the new UI; it would conflict with the currently deployed admin/POS.

Reference: https://supabase.com/docs/guides/database/functions
