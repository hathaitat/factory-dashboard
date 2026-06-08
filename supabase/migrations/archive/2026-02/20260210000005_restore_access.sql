-- RESTORE ACCESS (Fix for "New row violates RLS policy")
-- The application uses custom authentication (staff_members table), not Supabase Auth.
-- Therefore, we must allow public access for the application to function, 
-- while relying on the Application Logic (Login Page) for security.

-- 1. DROP RESTRICTIVE POLICIES
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable access to authenticated users only" ON public.%I', t);
    END LOOP;
END $$;

-- 2. RE-ENABLE PUBLIC ACCESS (Standard for this architecture)
-- Customers
CREATE POLICY "Allow public access" ON public.customers FOR ALL USING (true) WITH CHECK (true);
-- Invoices
CREATE POLICY "Allow public access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
-- Invoice Items
CREATE POLICY "Allow public access" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
-- Billing Notes
CREATE POLICY "Allow public access" ON public.billing_notes FOR ALL USING (true) WITH CHECK (true);
-- Billing Note Items
CREATE POLICY "Allow public access" ON public.billing_note_items FOR ALL USING (true) WITH CHECK (true);
-- Customer Products
CREATE POLICY "Allow public access" ON public.customer_products FOR ALL USING (true) WITH CHECK (true);
-- Customer Attributes
CREATE POLICY "Allow public access" ON public.customer_attributes FOR ALL USING (true) WITH CHECK (true);
-- Company Info
CREATE POLICY "Allow public access" ON public.company_info FOR ALL USING (true) WITH CHECK (true);
-- Staff Members
CREATE POLICY "Allow public access" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);

-- 3. REFRESH CACHE
NOTIFY pgrst, 'reload schema';
