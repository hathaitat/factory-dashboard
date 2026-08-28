-- The app uses custom auth (not Supabase Auth), so all requests come via anon role.
-- We need to grant anon role access to customer_forecasts table.

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.customer_forecasts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.customer_forecasts;

-- Recreate policies for both authenticated and anon roles (app uses custom auth via localStorage)
CREATE POLICY "Enable read for all" 
    ON public.customer_forecasts FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert for all" 
    ON public.customer_forecasts FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Enable update for all" 
    ON public.customer_forecasts FOR UPDATE 
    USING (true);

CREATE POLICY "Enable delete for all" 
    ON public.customer_forecasts FOR DELETE 
    USING (true);

-- Grant access to anon role as well
GRANT ALL ON public.customer_forecasts TO anon;
