-- =============================================
-- Internal Requisition System
-- สร้างระบบจัดซื้อของใช้ภายในโรงงาน
-- =============================================

-- 1. หมวดหมู่สินค้า
CREATE TABLE IF NOT EXISTS public.internal_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Package',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. รายการสินค้า/อุปกรณ์
CREATE TABLE IF NOT EXISTS public.internal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.internal_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT DEFAULT 'ชิ้น',
    unit_price DECIMAL(15, 2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ใบเบิก/สั่งซื้อ (Header)
CREATE TABLE IF NOT EXISTS public.internal_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL DEFAULT 'purchase',  -- purchase | withdraw
    requested_by TEXT,
    approved_by TEXT,
    status TEXT DEFAULT 'Draft',  -- Draft, Approved, Completed, Cancelled
    total_amount DECIMAL(15, 2) DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. รายการในใบเบิก (Line Items)
CREATE TABLE IF NOT EXISTS public.internal_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.internal_requisitions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.internal_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.internal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_requisition_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create Policies
-- =============================================
DO $$
BEGIN
    -- internal_categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_categories' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.internal_categories FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_categories' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.internal_categories FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_categories' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.internal_categories FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_categories' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.internal_categories FOR DELETE TO authenticated USING (true);
    END IF;

    -- internal_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_items' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.internal_items FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_items' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.internal_items FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_items' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.internal_items FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_items' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.internal_items FOR DELETE TO authenticated USING (true);
    END IF;

    -- internal_requisitions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisitions' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.internal_requisitions FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisitions' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.internal_requisitions FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisitions' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.internal_requisitions FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisitions' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.internal_requisitions FOR DELETE TO authenticated USING (true);
    END IF;

    -- internal_requisition_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisition_items' AND policyname = 'Enable read access for all authenticated users') THEN
        CREATE POLICY "Enable read access for all authenticated users" ON public.internal_requisition_items FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisition_items' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.internal_requisition_items FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisition_items' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON public.internal_requisition_items FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_requisition_items' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.internal_requisition_items FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- =============================================
-- Seed Data: หมวดหมู่ตั้งต้น
-- =============================================
INSERT INTO public.internal_categories (name, icon, color) VALUES
    ('อุปกรณ์สำนักงาน', 'Paperclip', '#3b82f6'),
    ('เครื่องมือช่าง', 'Wrench', '#f59e0b'),
    ('วัสดุสิ้นเปลือง', 'Package', '#10b981'),
    ('อุปกรณ์ทำความสะอาด', 'Sparkles', '#8b5cf6'),
    ('อุปกรณ์ความปลอดภัย', 'ShieldCheck', '#ef4444')
ON CONFLICT DO NOTHING;
