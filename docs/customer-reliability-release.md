# Super Marko customer reliability update

The React/Capacitor customer application keeps the existing application ID, Firebase configuration and branding. Changes are on `codex/super-marko-capacitor` (PR #42).

## Included

- Reconcile owned, marketplace and combined checkout IDs before re-quoting, and after failed placement responses. Unknown results retain their pending ID. Background recovery never discards an absent attempt that may still be in flight.
- Clear the cart only when its current contents still match the submitted attempt.
- Restore marketplace cart entries by exact product IDs instead of the first 500 catalogue records. Lookup failures retain retryable state.
- Keep pending checkout addresses fixed, display the actual pending address, and preserve the checkout destination through address editing/default changes.
- Unregister the current push token before local sign-out, wait for in-flight registration, and retain the token/session when detach fails.
- Allow guest shopping and address selection; require authentication for checkout and personal records.
- Preserve mounted pages when connectivity drops. Restore public catalogue data, allow cached cart changes, and require connectivity and server verification before placing orders.
- Add customer regression tests/typechecking to Android CI, the missing Play-update dependency preparation script, optional stable debug signing, and a manual signed APK/AAB workflow.

## Database dependency and validation

`20261003115743_customer_checkout_recovery_v1.sql` adds a read-only owner-scoped RPC. It is already applied to the customer Supabase project. Apply this migration before deploying this frontend to any other environment.

The function requires `auth.uid()`, resolves the caller's customer, and takes the existing checkout advisory locks. It has no anonymous/public execute grant. It deliberately uses `SECURITY DEFINER` to access private combined order groups. The Supabase advisor flags authenticated definer RPCs generically; owner isolation is enforced and tested here. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter).

Run `supabase/tests/customer_checkout_recovery.sql` for read-only permission/ownership tests against existing orders. It uses a transaction and rolls back session claims; it creates no orders, reservations or financial records. Environments without representative owned/marketplace/combined orders need corresponding fixtures in a test database for full coverage.

Local validation: `npm run test:customer`, `npm run typecheck`, and `npm run build`. Reliability tests cover committed/lost responses, unavailable recovery, all placement entry points, catalogue pagination, cart changes during checkout, push detach failures/races, guest route boundaries, offline cache privacy/expiry, and repeatable Android preparation. Native installation, real push delivery and payment journeys still need device acceptance testing.

## Signed release setup

Use the existing application's original signing identity; a newly generated key cannot update existing installations.

Repository secrets for **Customer Android Release**:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_SERVICES_JSON` (optional when the tracked customer Firebase config exists)

Run the manual workflow with `version_code` greater than every distributed build and the desired `version_name`. It creates signed APK and AAB artifacts and does not publish to Google Play. Signing secrets were not accessible for verification in this session.

For repeatable debug APK updates, optionally provide `ANDROID_DEBUG_KEYSTORE_BASE64`, `ANDROID_DEBUG_KEYSTORE_PASSWORD`, `ANDROID_DEBUG_KEY_ALIAS`, and `ANDROID_DEBUG_KEY_PASSWORD` using the same key as previously installed debug builds. Without these, hosted runners use their ephemeral debug key.

## Still outside this change

Customer checkout RPCs currently support cash and wallet only. Dynamic POS payment methods have staff-only contracts, fees and settlement accounts and cannot safely be exposed by adding frontend options. Marketplace/combined voucher support likewise needs backend redemption, allocation, refund and settlement rules. This change does not claim to implement those financial features.

## Dependency audit remaining before production

On 2026-10-03, `npm audit --omit=dev` reported 28 vulnerable dependency nodes (2 critical, 20 high, 3 moderate, 3 low) in the existing lockfile. This is a dependency report, not proof of exploitability in the bundled application. The critical nodes were `protobufjs` (via Transformers/ONNX) and `tar` (via Capacitor CLI and ONNX tooling). Some recommended fixes require major-version migrations, including Transformers and Tailwind. No forced dependency upgrades were applied in this reliability change. Review these separately and rerun the audit before production release.

References: [protobufjs advisory](https://github.com/advisories/GHSA-xq3m-2v4x-88gg), [tar advisory](https://github.com/advisories/GHSA-23hp-3jrh-7fpw).
