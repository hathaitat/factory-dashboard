-- Grant standard table privileges to anon and authenticated roles
GRANT ALL ON public.quotations TO anon, authenticated;
GRANT ALL ON public.quotation_items TO anon, authenticated;

-- Drop the old overly-restrictive policies
DROP POLICY IF EXISTS "Enable access to authenticated users only" ON public.quotations;
DROP POLICY IF EXISTS "Enable access to authenticated users only" ON public.quotation_items;

-- Create new policies that allow anon access (matching the app's custom auth context)
CREATE POLICY "Enable all access for all users" ON public.quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON public.quotation_items FOR ALL USING (true) WITH CHECK (true);

-- Reload schema again just to be sure
NOTIFY pgrst, 'reload schema';
