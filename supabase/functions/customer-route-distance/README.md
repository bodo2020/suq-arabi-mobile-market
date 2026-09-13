# customer-route-distance

Customer/guest-safe delivery distance endpoint.

- Accepts Supabase anon callers and authenticated customer sessions.
- Reads only active delivery branch coordinates/radius server-side.
- Returns driving distance, duration, deliverability and provider.
- Does not expose staff-only access or staff data.
- Keeps the existing `route-distance` function reserved for authenticated staff/delivery workflows.
