# Marko AI — Real catalog result preview (Customer phase 1.1)

## UX decision: hybrid answer
Show a short, real-product preview inside Marko's answer **and** provide "View all search results" through the existing search page. A recipe or published smart group continues to navigate to its dedicated detail flow. This is intentionally a **single-turn preview**, not yet a persistent multi-turn chat or a voice assistant.

## Implemented behavior
- Authenticated customer and selected delivery branch are required before spending a model request.
- Marko AI engine interprets a customer message; its output is only a group slug or sanitized search phrase.
- Search phrases go to the existing branch product search function, which combines branch-owned products and address-scoped marketplace discovery.
- The inline preview shows up to four actually returned, in-stock, positively priced products using the existing ProductCard UI (picture, price and user-controlled add-to-cart).
- Customers may open the entire search page to see more candidates, sort, filter or view unavailable stock; no model-generated SKU, picture, price or claimed availability is displayed.
- A branch/address change invalidates previous results and stale asynchronous responses.
- No cart writes, order submissions, checkout or delivery-price changes are made by Marko.

## Known limits and next separate phases
- The current server contract intentionally returns no search phrase for multi-product or ambiguous requests. These still need a product-list plan or a follow-up question before catalog resolution.
- The preview supports typed requests only. Voice input/output, conversational turn memory, restaurant menu ordering and multiple items per utterance require additional work.
- Stock and price can change; the normal add-to-cart and checkout validations remain authoritative.
- No available preview is not proof that wider inventory has zero matches.

## Manual release checks
1. Login, set a delivery address and request a specific item such as "رز ٥ كيلو". Verify images, actual branch prices and product detail navigation.
2. Verify the recommendation cards require an explicit user tap before any cart modification.
3. Try a published recipe ("كشري لستة") and ensure the existing smart-group page still works.
4. Try an ambiguous request, no matching in-stock product, expired quota and provider failure; verify graceful fallback.
5. Switch delivery addresses while a request is in progress and ensure old-branch items are never displayed.
6. Confirm marketplace vs owned products and product-specific add-to-cart restrictions on Android and desktop.
7. Verify search and barcode features are unchanged and new cards remain accessible on mobile.

No database migration or Supabase Edge Function deployment is included in this frontend-only preview change.
