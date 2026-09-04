-- Harden customer-authenticated data after moving phone verification to Supabase Auth.
-- This migration is intentionally explicit: remove legacy permissive policies,
-- then recreate only self-service and staff-read policies.

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'customers',
        'customer_addresses',
        'cart_items',
        'favorites',
        'verification_codes'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  END LOOP;
END
$$;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- OTP codes are no longer application data. They must never be available to
-- browser clients. Supabase Auth owns the active phone OTP flow.
REVOKE ALL ON TABLE public.verification_codes FROM PUBLIC, anon, authenticated;

-- The old browser-callable helper could create the legacy verification table.
-- Keep the migration safe even if that function has already been removed.
DO $$
BEGIN
  IF to_regprocedure('public.create_verification_codes_table()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_verification_codes_table() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;

-- Customer profile: owner self-service, staff can inspect/manage through the
-- existing server-backed admin role helpers.
CREATE POLICY "Customers view own profile"
ON public.customers
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin()
  OR public.is_super_admin()
);

CREATE POLICY "Customers create own profile"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Customers update own profile"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin()
  OR public.is_super_admin()
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR public.is_admin()
  OR public.is_super_admin()
);

CREATE POLICY "Admins delete customer profiles"
ON public.customers
FOR DELETE
TO authenticated
USING (public.is_admin() OR public.is_super_admin());

-- Customer addresses: the customer owns rows directly by auth user id.
CREATE POLICY "Customers view own addresses"
ON public.customer_addresses
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.is_admin()
  OR public.is_super_admin()
);

CREATE POLICY "Customers create own addresses"
ON public.customer_addresses
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Customers update own addresses"
ON public.customer_addresses
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Customers delete own addresses"
ON public.customer_addresses
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Cart items are keyed by customer_id, so authorization resolves through the
-- authenticated user's own customer profile.
CREATE POLICY "Customers view own cart items"
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
  OR public.is_admin()
  OR public.is_super_admin()
);

CREATE POLICY "Customers create own cart items"
ON public.cart_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Customers update own cart items"
ON public.cart_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Customers delete own cart items"
ON public.cart_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Favorites use the same customer ownership model as cart items.
CREATE POLICY "Customers view own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
  OR public.is_admin()
  OR public.is_super_admin()
);

CREATE POLICY "Customers create own favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Customers delete own favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Indexes used by ownership checks and common customer queries.
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON public.customer_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_customer_id
  ON public.cart_items(customer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_customer_id
  ON public.favorites(customer_id);
