-- FIX SUPPLIER PERMISSIONS
-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.supplier_products TO anon, authenticated;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Enable access to authenticated users only" ON public.suppliers;
DROP POLICY IF EXISTS "Enable access to authenticated users only" ON public.supplier_products;

-- Create new policies that allow public access (matching the app's custom auth architecture)
CREATE POLICY "Allow public access" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.supplier_products FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
