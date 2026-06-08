-- Ensure permissions for supplier_categories
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.supplier_categories TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.supplier_categories_id_seq TO anon, authenticated;

-- Force refresh RLS
ALTER TABLE public.supplier_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;

-- Re-create policy just in case
DROP POLICY IF EXISTS "Allow public access" ON public.supplier_categories;
CREATE POLICY "Allow public access" ON public.supplier_categories FOR ALL USING (true) WITH CHECK (true);
