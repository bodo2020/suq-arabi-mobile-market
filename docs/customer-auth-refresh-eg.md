# Customer authentication refresh — Egypt launch

Branch: `feat/customer-auth-refresh-eg-20261030`

## Approved login presentation (bag-first refresh)

- The first phone-entry step uses `AuthLayout variant="welcome"`: original `BrandMark variant="mark"` artwork from `/brand/super-marko-mark.svg`, centered with **no badge or logo tile**.
- Below the bag, show exactly `يا أهلاً بيك في` and the original `BrandWordmark` with the **same tatweel lettering and green/yellow styles as the home header**. Do not type a second plain-text brand name.
- Do not show a second "تسجيل الدخول" heading in the initial phone step. Use one quiet white form surface, label `رقم موبايلك`, left-side locked 🇪🇬 `+20`, and button `يلا نكمل`.
- Switch to `AuthLayout variant="flow"` on password, OTP, recovery, signup and password reset: **small official bag only**, plus concise task heading; no welcome repeated.
- Keep immediate first-digit 0/1 feedback, original full-phone validation, password recovery proof and OTP cooldown unchanged.
- Make the gradient, small-screen spacing, keyboard opening behavior and primary buttons consistent through `src/components/layout/auth.css`.
- On QA, verify no nested header boxes or duplicate brand names, no forced mobile keyboard on initial login, readable 320px/360px/390px layouts and safe-area padding.

## Scope

- One shared branded shell for login, OTP, recovery, registration and password reset.
- Existing `BrandMark` and `BrandWordmark` are preserved.
- One Egypt-only phone field with 🇪🇬 +20 on the **left** of the field, while the screen remains RTL.
- 010 / 011 / 012 / 015, Arabic and Persian digits, +20 and 0020 normalized to E.164.
- Customer auth methods and `customer-auth-route` server source validate Egyptian mobiles.
- Password requirement states, six OTP boxes, SMS autofill, resend cooldown and recovery proof remain intact.
- No DB migration, no auth secrets, no change to the existing account IDs.

## Smoke tests before merge / release

1. On Android WebView and responsive browser, check dial code appears at far **left** of the national phone input and is not clickable. Verify keyboard, safe areas, scroll and accessibility.
2. Existing customer (010..., +201..., and Arabic digits) → password → correct account; incorrect password gets error, not signup.
3. New Egyptian mobile → OTP → confirm → profile/name/password → signed in; verify `returnTo`.
4. Wrong or expired OTP, SMS failure, 429 response, 60s resend and paste/autofill of 6 digits.
5. Forgotten password → OTP → new password + confirmation → global sign out → login with new password. Invalid/stale recovery proof must fail.
6. Change phone → OTP → customer phone updates only after confirmation. Same phone and invalid phone denied.
7. Reject foreign prefixes (+966, +971), bad Egyptian prefixes (014), short and long inputs across each flow; protect against edited `countryCode` query strings.
8. Run `npm run test:egypt-phone`, `node scripts/test-phone-recovery.mjs`, `npx tsc --noEmit`, and `npm run build`. Test on actual Android device before merging.

## Production deployment gates

- The changed `supabase/functions/customer-auth-route/index.ts` is **source only** until deployed separately; verify the production deployment and its API callers.
- Supabase Phone Auth / SMS provider must also be configured for the desired Egyptian country delivery policy. UI validation and a routing function do not restrict direct calls to Supabase Auth. Review OTP delivery, provider allowlists, throttling and spending limits in production.
- Do not merge or deploy until live OTP and password-recovery checks pass on test accounts. No customer data should be altered by QA.
