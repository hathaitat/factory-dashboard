-- SECURITY UPDATE PACK (Run this to upgrade your existing database)

-- 1. HARDEN RLS POLICIES (Switch from Public to Authenticated Only)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- Drop old "Allow all" policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for invoices" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for invoice_items" ON public.%I', t);
    END LOOP;
END $$;

-- Create Authenticated-Only Policies
CREATE POLICY "Enable access to authenticated users only" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.billing_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.billing_note_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.customer_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.customer_attributes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.company_info FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.staff_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. UPDATE ADMIN PASSWORD TO HASH
-- Updates 'admin' user to use the hashed version of 'admin123'
UPDATE public.staff_members
SET password = '$2b$10$gozKeogcPH4Rht7ocnGHl.ssh5.3.c6KI4HKJgXhdC8RscyOKBvN2'
WHERE username = 'admin';

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
