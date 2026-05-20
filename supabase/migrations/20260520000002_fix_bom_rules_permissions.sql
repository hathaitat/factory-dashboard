-- Fix permissions and policies for inventory_bom_rules to support public (anon) access
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.inventory_bom_rules;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_bom_rules;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory_bom_rules;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.inventory_bom_rules;

CREATE POLICY "Allow public access" ON public.inventory_bom_rules FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
