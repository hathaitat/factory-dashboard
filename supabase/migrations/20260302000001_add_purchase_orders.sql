-- Migration to create purchase_orders and purchase_order_items tables

-- 1. Create Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT UNIQUE NOT NULL,
    customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'Pending',
    file_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Purchase Order Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(15, 3) DEFAULT 1,
    unit TEXT,
    price_per_unit NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- 3. Alter Invoices Table to link to PO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'purchase_order_id') THEN
        ALTER TABLE public.invoices ADD COLUMN purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- 4. Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Allow all for development)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Allow all for purchase_orders') THEN
        CREATE POLICY "Allow all for purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'Allow all for purchase_order_items') THEN
        CREATE POLICY "Allow all for purchase_order_items" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;
