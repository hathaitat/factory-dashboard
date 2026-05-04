-- CREATE SUPPLIER PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    price DECIMAL(15, 2) DEFAULT 0
);

-- ENABLE RLS
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- CREATE POLICIES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_products' AND policyname = 'Enable access to authenticated users only') THEN
        CREATE POLICY "Enable access to authenticated users only" ON public.supplier_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
