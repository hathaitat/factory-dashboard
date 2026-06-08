-- Create Supplier PO tables

CREATE TABLE IF NOT EXISTS public.supplier_pos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL UNIQUE,
    supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    delivery_date DATE,
    credit_term TEXT,
    reference_doc TEXT,
    
    sub_total DECIMAL(15, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 7,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    grand_total DECIMAL(15, 2) DEFAULT 0,
    
    remark TEXT,
    purchased_by TEXT,
    approved_by TEXT,
    
    status TEXT DEFAULT 'Draft', -- Draft, Waiting, Approved, Completed, Cancelled
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.supplier_po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES public.supplier_pos(id) ON DELETE CASCADE,
    item_no INTEGER NOT NULL,
    supplier_product_id BIGINT REFERENCES public.supplier_products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    due_date DATE,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 1,
    unit TEXT,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.supplier_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_po_items ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $$
BEGIN
    -- Policies for supplier_pos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_pos' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.supplier_pos FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_pos' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.supplier_pos FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_pos' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.supplier_pos FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_pos' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.supplier_pos FOR DELETE TO authenticated USING (true);
    END IF;

    -- Policies for supplier_po_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_po_items' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.supplier_po_items FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_po_items' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.supplier_po_items FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_po_items' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.supplier_po_items FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_po_items' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.supplier_po_items FOR DELETE TO authenticated USING (true);
    END IF;
END $$;
