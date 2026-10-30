# Super Marko — Microinteractions V1

## Motion principles

- Preserve the original Super Marko shopping-bag SVG. Draw the bag, smile and plus through the existing brand components; never redefine the primary logo.
- Microinteractions communicate confirmed user actions or a genuine data change, not fabricated status updates.
- Keep transitions brief: tap 170 ms, quantity 260 ms, flight 550 ms, emphasis 420 ms.
- Prefer CSS transforms and opacity only. Do not animate layout, delay navigation, cause additional network calls or change order calculations.
- Honor `prefers-reduced-motion: reduce`: disable nonessential movement, leave full icons and content visible.

## Implemented in this PR

1. Product-card first add (regular or weighted): only after `addToCart` returns `added`, dispatch `super-marko:product-added-motion`. If a visible `/cart` link exists, animate the product thumbnail to it; otherwise keep the original `super-marko:cart-added` confirmation unchanged. Marketplace conflicts and refused operations do not animate.
2. Quantity changes: a brief numeric pop in product-card steppers and cart. The initial plus-button-to-stepper replacement enters smoothly.
3. Favorites: a single heart pulse and tiny gold dotted ring when adding. Guest redirect and optimistic server-backed persistence are unchanged.
4. Search: entry transition for suggestions and fetched result grids.
5. Categories: brief tile entry when categories first render, existing taps and routes unchanged.
6. Order timeline: a one-time emphasis on the currently active server-reported step; never advance until the order status actually changes.
7. Order success: one golden halo around the existing official bag/check mark.
8. Empty favorites: one-time bag/heart reveal with a direct link to shopping.
9. Loyalty: a brief count emphasis only when the actual numeric values provided by the loyalty query change.

## QA checklist

- First-add regular and weighted products; verify flight only where a visible cart icon exists. Repeat with guest and signed-in flows. No flight on partner-limit conflicts, invalid stock or failed initialization.
- Increase/decrease quantities repeatedly; values must always come from existing cart context and authoritative quote, not visual animation state.
- Tap a heart as guest, signed-in, when network fails, and while favorites load; check rollback remains authoritative.
- Test catalog cards, search suggestions, category transitions, and small screens (320px, 360px, 390px).
- On order status refresh/realtime, the status animation must correspond exactly to the current order state. Confirm the success halo is transient.
- Turn on Android Remove Animations / Reduce Motion; ensure no flight, pulse, counters, category entrances or empty-favorites motion.
- Run `npm run test:brand-motion`, `npm run test:cart-empty`, `npm run build` and Android build/device QA.

## Non-goals

No changes to Supabase, customer balances, cart math, checkout authorization, OTP, inventory, or order state transitions. Advanced address-map animation and banner-specific promotional effects are deliberately left for separate, risk-isolated UI iterations.
