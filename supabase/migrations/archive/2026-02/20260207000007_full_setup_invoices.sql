-- FULL SETUP SQL (Run this if tables are missing)

-- 1. Enable UUID Extension (Required for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    reference_no TEXT,
    credit_days INTEGER DEFAULT 0,
    due_date DATE,
    subtotal NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    vat_rate NUMERIC(15, 2) DEFAULT 7.0,
    vat_amount NUMERIC(15, 2) DEFAULT 0,
    grand_total NUMERIC(15, 2) DEFAULT 0,
    baht_text TEXT,
    notes TEXT,
    adjustments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(15, 3) DEFAULT 1,
    unit TEXT,
    price_per_unit NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- 4. CREATE CUSTOMER PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.customer_products (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    price NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENABLE RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

-- 6. CREATE POLICIES (Development Mode: Allow All)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow all') THEN
        CREATE POLICY "Allow all" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_items' AND policyname = 'Allow all') THEN
        CREATE POLICY "Allow all" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_products' AND policyname = 'Allow all') THEN
        CREATE POLICY "Allow all" ON public.customer_products FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
