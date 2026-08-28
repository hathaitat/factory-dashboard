CREATE TABLE IF NOT EXISTS public.customer_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    forecast_month TEXT NOT NULL, -- e.g., '2026-08'
    quantity NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT,
    updated_by TEXT
);

-- Add unique constraint for upsert
ALTER TABLE public.customer_forecasts 
    ADD CONSTRAINT customer_forecasts_unique_entry UNIQUE (customer_id, product_name, forecast_month);

-- RLS
ALTER TABLE public.customer_forecasts ENABLE ROW LEVEL SECURITY;

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

GRANT ALL ON public.customer_forecasts TO authenticated;
GRANT ALL ON public.customer_forecasts TO service_role;
