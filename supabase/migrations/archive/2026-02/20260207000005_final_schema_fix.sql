-- 1. FIX INVOICES TABLE
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "adjustments" JSONB DEFAULT '[]'::jsonb;

-- 2. FIX CUSTOMER PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.customer_products (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 4. VERIFICATION (Check if columns now exist)
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE (table_name = 'invoices' AND column_name = 'adjustments')
   OR (table_name = 'customer_products' AND column_name = 'created_at');
