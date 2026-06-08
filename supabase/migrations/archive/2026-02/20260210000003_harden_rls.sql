-- HARDEN RLS POLICIES (Switch from Public to Authenticated Only)

-- 1. Function to drop existing "Allow all" policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for invoices" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for invoice_items" ON public.%I', t);
    END LOOP;
END $$;

-- 2. Create Authenticated-Only Policies
CREATE POLICY "Enable access to authenticated users only" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.billing_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.billing_note_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.customer_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.customer_attributes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable access to authenticated users only" ON public.company_info FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Staff Members (More restrictive? For now, authenticated users can read/write. Ideally should be Admin only for write)
CREATE POLICY "Enable access to authenticated users only" ON public.staff_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
