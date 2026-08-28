-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.customer_forecasts;

-- Recreate policies to ensure they are active
CREATE POLICY "Enable read access for all authenticated users" 
    ON public.customer_forecasts FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" 
    ON public.customer_forecasts FOR INSERT 
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
    ON public.customer_forecasts FOR UPDATE 
    TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" 
    ON public.customer_forecasts FOR DELETE 
    TO authenticated USING (true);

-- Ensure table allows null customer_id explicitly
ALTER TABLE public.customer_forecasts ALTER COLUMN customer_id DROP NOT NULL;
