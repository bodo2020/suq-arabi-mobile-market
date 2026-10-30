# Marko AI — Shared Gateway v1 (2026-10-30)

Both Super Marko customer and Super Business retail invoke one authenticated Supabase Edge Function, `marko-ai-engine`, on the same configured marketpos project.

- Customer: `{ mode: "customer_shopping", message }` → existing `customer-smart-ideas` contract (`slug`, `search_query`, `people`, `budget`). Existing daily quota, published-group validation and catalog-only navigation remain in the downstream function.
- Business: `{ mode: "business_admin", branch_id, conversation_id, message }` → existing `ai-gateway` contract (`reply`, `conversation_id`, `message_id`, audit, provider fallback). Existing staff-branch access control and read-only tools remain in the downstream function.
- Gateway: independently validates authenticated Supabase user JWT, enforces fixed allowlisted routes and field whitelist, and forwards only the caller's JWT with the project's non-privileged anon key. No provider keys, service-role tokens or arbitrary tools exposed to clients.
- Backwards compatibility: both older edge endpoints remain deployed and callable. No migration, new payments, pricing overrides, automatic cart changes or data cross-tenant permissions.
- Dependency: deploy the new edge function with `verify_jwt=true` **before releasing frontend updates**. If the frontend updates deploy before the gateway, AI requests will fail gracefully but shopping and POS paths remain available.
- Operational limit: a unified *entry point* does not itself merge the model prompts, learning data or product knowledge; those require the next verified product-intelligence phase.
- Verify with authenticated customer and staff accounts, forbidden business branch, invalid JWT, bad mode, customer quota reached, Gemini unavailable, Groq fallback, and regressions for old clients.
