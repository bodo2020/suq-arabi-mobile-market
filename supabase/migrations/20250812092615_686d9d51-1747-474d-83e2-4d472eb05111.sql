-- Tighten RLS for sensitive financial tables

-- SALES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow operations on sales without auth" ON public.sales;
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Branch users can view sales" ON public.sales;

CREATE POLICY "Admins manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Branch users view sales for their branch"
ON public.sales
FOR SELECT
TO authenticated
USING (public.has_branch_access(auth.uid(), branch_id));

-- CASH TRANSACTIONS
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.cash_transactions;
DROP POLICY IF EXISTS "Users can insert cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Users can view all cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Admins manage cash_transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Branch users view cash_transactions" ON public.cash_transactions;

CREATE POLICY "Admins manage cash_transactions"
ON public.cash_transactions
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Branch users view cash_transactions"
ON public.cash_transactions
FOR SELECT
TO authenticated
USING (public.has_branch_access(auth.uid(), branch_id));

-- CASH TRACKING
ALTER TABLE public.cash_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow admins to manage cash tracking" ON public.cash_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to view cash tracking" ON public.cash_tracking;
DROP POLICY IF EXISTS "Users can insert cash tracking records" ON public.cash_tracking;
DROP POLICY IF EXISTS "Users can view all cash tracking records" ON public.cash_tracking;
DROP POLICY IF EXISTS "Admins manage cash_tracking" ON public.cash_tracking;
DROP POLICY IF EXISTS "Branch users view cash_tracking" ON public.cash_tracking;

CREATE POLICY "Admins manage cash_tracking"
ON public.cash_tracking
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Branch users view cash_tracking"
ON public.cash_tracking
FOR SELECT
TO authenticated
USING (public.has_branch_access(auth.uid(), branch_id));

-- EXPENSES
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to all users temporarily" ON public.expenses;
DROP POLICY IF EXISTS "Admins manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Branch users view expenses" ON public.expenses;

CREATE POLICY "Admins manage expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Branch users view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (public.has_branch_access(auth.uid(), branch_id));

-- SUPPLIERS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to select suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins view suppliers" ON public.suppliers;

CREATE POLICY "Admins manage suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Admins view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_super_admin());

-- PURCHASE ITEMS
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Users can view purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Admins manage purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Admins view purchase_items" ON public.purchase_items;

CREATE POLICY "Admins manage purchase_items"
ON public.purchase_items
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_super_admin())
WITH CHECK (public.is_admin() OR public.is_super_admin());

CREATE POLICY "Admins view purchase_items"
ON public.purchase_items
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_super_admin());

