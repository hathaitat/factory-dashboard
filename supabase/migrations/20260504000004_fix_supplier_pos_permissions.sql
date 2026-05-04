-- FIX SUPPLIER POS PERMISSIONS
-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.supplier_pos TO anon, authenticated;
GRANT ALL ON public.supplier_po_items TO anon, authenticated;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.supplier_pos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.supplier_pos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.supplier_pos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.supplier_pos;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.supplier_po_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.supplier_po_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.supplier_po_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.supplier_po_items;

-- Create new policies that allow public access
CREATE POLICY "Allow public access" ON public.supplier_pos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.supplier_po_items FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
