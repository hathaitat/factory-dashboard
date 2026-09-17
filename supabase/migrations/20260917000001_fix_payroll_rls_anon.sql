-- Drop existing restricted policies
DROP POLICY IF EXISTS "Allow all authenticated users to view payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Allow authenticated users to insert payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Allow authenticated users to update payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Allow authenticated users to delete payroll periods" ON public.payroll_periods;

DROP POLICY IF EXISTS "Allow all authenticated users to view payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete payroll entries" ON public.payroll_entries;

-- Create policies for all roles (including anon) since app uses custom auth
DROP POLICY IF EXISTS "Allow public access" ON public.payroll_periods;
DROP POLICY IF EXISTS "Allow public access" ON public.payroll_entries;

CREATE POLICY "Allow public access" ON public.payroll_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.payroll_entries FOR ALL USING (true) WITH CHECK (true);

-- Grant privileges to anon role
GRANT ALL ON public.payroll_periods TO anon, authenticated;
GRANT ALL ON public.payroll_entries TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
