-- 1. CREATE QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_snapshot JSONB, -- Stores flat customer data for historical accuracy
    attn_name TEXT,
    validity_days INTEGER DEFAULT 15,
    payment_condition TEXT DEFAULT 'สด',
    delivery_time TEXT DEFAULT 'FOLLOW TO P/O',
    subtotal NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    vat_rate NUMERIC(15, 2) DEFAULT 7.0,
    vat_amount NUMERIC(15, 2) DEFAULT 0,
    grand_total NUMERIC(15, 2) DEFAULT 0,
    baht_text TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Sent, Approved, Rejected, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

-- 2. CREATE QUOTATION ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(15, 3) DEFAULT 1,
    unit TEXT,
    price_per_unit NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- 3. ENABLE RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES (Access to authenticated users only)
DO $$
BEGIN
    -- Quotations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Enable access to authenticated users only') THEN
        CREATE POLICY "Enable access to authenticated users only" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Quotation Items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotation_items' AND policyname = 'Enable access to authenticated users only') THEN
        CREATE POLICY "Enable access to authenticated users only" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
