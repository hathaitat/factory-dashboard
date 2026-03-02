-- 1. Add adjustments column to invoices (if missing)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS adjustments JSONB DEFAULT '[]';

-- 2. Ensure customer_products table exists with all required columns
CREATE TABLE IF NOT EXISTS public.customer_products (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure RLS is enabled and policies are set up
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'customer_products' AND policyname = 'Enable all access for all users'
    ) THEN
        CREATE POLICY "Enable all access for all users" ON public.customer_products FOR ALL USING (true);
    END IF;
END
$$;

-- 4. Refresh schema cache (optional but helpful if done via SQL Editor)
-- NOTIFY pgrst, 'reload schema';
