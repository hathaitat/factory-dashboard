-- FIX CERTIFICATES PERMISSIONS
-- The app uses custom auth architecture where requests hit Supabase as the 'anon' role
-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.certificates TO anon, authenticated;
GRANT ALL ON public.certificate_products TO anon, authenticated;
GRANT ALL ON public.certificate_customers TO anon, authenticated;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Enable all access for all users" ON public.certificates;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.certificate_products;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.certificate_customers;

-- Create new policies that allow public access (matching the app's custom auth architecture)
CREATE POLICY "Allow public access" ON public.certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.certificate_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.certificate_customers FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
