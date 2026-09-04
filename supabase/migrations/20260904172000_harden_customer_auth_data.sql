-- Harden customer-authenticated data after moving phone verification to Supabase Auth.
-- Supports both the current customer_id ownership model and legacy rows keyed
-- directly by auth user_id during the transition.

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

-- Private customer data is never available to anonymous browser sessions.
REVOKE ALL ON TABLE public.customers FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.customer_addresses FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.cart_items FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon;

-- Authenticated clients keep only the DML privileges required by the app.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorites TO authenticated;

-- OTP codes are retired application data. Supabase Auth owns phone OTP.
REVOKE ALL ON TABLE public.verification_codes FROM PUBLIC, anon, authenticated;

-- The old browser-callable helper must stay unreachable even if it still exists.
DO $$
BEGIN
  IF to_regprocedure('public.create_verification_codes_table()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_verification_codes_table()
      FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;

-- Customer profile: owner self-service; staff access uses existing role helpers.
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

-- Addresses are owned directly by auth user id.
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

-- Cart ownership supports current customer_id rows and legacy direct user_id rows.
CREATE POLICY "Customers view own cart items"
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
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
  user_id = (SELECT auth.uid())
  OR EXISTS (
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
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
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
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = cart_items.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Favorites use the same transitional ownership model as cart items.
CREATE POLICY "Customers view own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
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
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Customers update own favorites"
ON public.favorites
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
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
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = favorites.customer_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Ownership lookup and app upsert indexes.
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_key
  ON public.customers(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON public.customer_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_customer_id
  ON public.cart_items(customer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_customer_id
  ON public.favorites(customer_id);
