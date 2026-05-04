-- FIX WAREHOUSE PERMISSIONS
-- The app uses custom auth architecture where requests hit Supabase as the 'anon' role
-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.warehouses TO anon, authenticated;
GRANT ALL ON public.warehouse_inventory TO anon, authenticated;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.warehouses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.warehouses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.warehouses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.warehouses;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.warehouse_inventory;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.warehouse_inventory;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.warehouse_inventory;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.warehouse_inventory;

-- Create new policies that allow public access (matching the app's custom auth architecture)
CREATE POLICY "Allow public access" ON public.warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.warehouse_inventory FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
