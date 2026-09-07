# Customer persistence implementation — 2026-09-05

Current status (6 September): versions through 7 were subsequently cloud-built and published and the user reported the profile/address experience working. The historical unpublished/build-blocked notes below describe their original editing stages. New authoritative checkout preparation is tracked in `CHECKOUT-ROLLOUT.md`; it is database-tested but disabled, and its latest frontend source is not deployed.

Implemented on the retained OTP preview source, based on `07d74ead39cfb4673db383f2689ff1392c1df3c0`.

## Database changes applied

- Atomic cart replacement under caller RLS, per-customer serialization, and an expected-user check against account switching. Failed inserts roll back the cart deletion.
- Idempotent favorites setter and atomic default-address/profile update.
- Coherent ownership checks for both legacy user_id and customer_id cart/favorite rows.
- Customer-only order visibility and insertion; management access retained for admin/super_admin. Public order reads/updates removed.
- Routing-log order FK now checks at transaction commit because the existing routing trigger logs before the order row is inserted.

Applied through Supabase migrations `customer_persistence_and_order_isolation` and `guard_cart_writes_during_account_switch`. `supabase/customer_persistence.sql` contains their combined reproducible definition; the CLI is not installed here.

## Application changes saved, not built or published

- Guest cart persistence, account-scoped pending snapshots, serialized saves, retry feedback, and protection against writes after failed reads or stale account changes.
- Shared favorites cache and no implicit profile creation from favorite controls.
- Default-address errors now propagate, editing retains default status, and address queries invalidate after changes.
- Checkout requires signed-in customer/address/pricing, retains the cart after order failure, shares one cash/wallet submission path, guards repeated clicks and uses a stable request UUID for retries within a mounted checkout. The displayed tracking number is persisted.

## Verification

Executed `supabase/customer_persistence.test.sql` inside an explicit rollback transaction after the live migrations: variant preservation, failed-insert rollback, invalid quantities, stale-session denial, favorite retry idempotence, foreign-address denial, customer isolation, anonymous denial, and real order routing with deferred constraints checked. All passed; temporary auth users were confirmed absent afterward. The new RPCs are security-invoker, executable by authenticated callers and not anon. Supabase advisors reported no notices on the three new functions. `git diff --check` passed.

Dependency installation could not finish: the environment reported “network approval was cancelled before a decision was returned.” No successful application build, TypeScript check, browser QA, or deployment is claimed.

## Remaining release work

- Build and exercise login → guest merge → reload → favorites → addresses → checkout in the application, then publish when requested.
- Checkout totals and stock are still calculated/validated on the client, not an authoritative server checkout. This is not a production-ready commerce release. Product, special-offer and delivery-pricing policies also need a separate coordinated review with the POS/admin app; pre-existing permissive write policies were observed and not changed here.
- Cart snapshots use last successful write across devices, not conflict resolution for simultaneous edits from multiple devices. Retry IDs are stable within the mounted checkout, not across browser reloads.
- First-address creation/deletion flows still need concurrent-operation testing. Existing OTP provider remains deferred.

Reference for the SQL execution model: https://supabase.com/docs/guides/database/functions

## Cart and checkout UX update

- New shared RTL checkout shell with original brand logo and two-step navigation.
- Cart has readable product rows, accessible quantity controls, inline stock warnings, desktop summary and a mobile bottom action bar with safe-area spacing. Shipping is explicitly excluded until an address is chosen.
- Weight editing replaces the current amount rather than adding it again; guests can select weights.
- Stock checks read current product stock instead of the requested quantity stored in add-to-cart payloads.
- Address add/edit preserves a whitelisted checkout return path; delivery pricing is not shown as zero when unavailable.
- Removed repeated timer creation from the existing DOM observer, which previously spawned a new interval for every page mutation.
- Dependency installation was attempted again and stopped with the same cancelled network-approval message. This UI update is saved source only: no completed build or browser verification. No database mutations in this UI update.

## Customer name and Google Maps addresses

Observed the latest order joins a linked customer with an empty name. The Auth trigger auto-creates that empty profile; PhoneVerify checked only existence, and Register skipped writes when the record existed. Fixed completion to upsert the existing name, invalidate the cached profile, route unnamed OTP users to completion, and preserve `/payment` return paths. Checkout checks for a completed name. Existing real customer names were not guessed or overwritten: older records for the verified phone contain both a person name and a market name, so the preferred test-account display name needs user input.

New DeliveryMap uses the existing browser Maps key with the declared Google loader dependency; optional VITE_GOOGLE_MAPS_API_KEY overrides it. Includes explicit geolocation, submitted address search via Geocoder, map-centre pin selection, and manual-address fallback. Cairo is an initial viewport only, never silently saved as customer coordinates. Address CRUD saves and reloads coordinates and retains default status on edit; map location does not infer delivery-pricing region IDs. Legacy AddressRegistration now reuses the same page.

Rollback-only SQL regression passed for updating the auto-created profile and address coordinate/default round trips. Dependency installation again stopped on cancelled network approval. No completed build, live Google key authorization, browser QA, or deployment is claimed for this update.

Google references: https://developers.google.com/maps/documentation/javascript/load-maps-js-api and https://developers.google.com/maps/documentation/javascript/geocoding

## Profile completion and explicit address modes

User explicitly chose the display name عبدالله المعداوي. Updated only the identified customer linked to the tested order, and verified the order/customer join now returns that name.

Added a signed-in profile-completion gate for unnamed accounts (including password login), with auth-route exclusions, safe return paths and completion-cache refresh to prevent redirect loops. The form requests name and shows the verified phone; address remains deferred until needed.

Address editing now has accessible Map / Manual tabs. Manual mode never mounts the Maps component and saves no coordinates; Map mode requires an explicitly selected point. Switching modes preserves draft text. Account address pages hide checkout steps; checkout address pages retain them. Address list distinguishes loading failure from an empty list and offers a guest sign-in action.

Verified the live corrected customer name and checked source diff formatting. These source changes have not been built or browser-tested; the previously reported dependency/network approval blocker remains. No publication is claimed.
