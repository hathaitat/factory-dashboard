-- Create Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    type TEXT NOT NULL DEFAULT 'main', -- main, supplier, custom
    supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    address TEXT,
    contact_person TEXT,
    phone TEXT,
    notes TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create Warehouse Inventory Table
CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL, -- material, finished_good
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit TEXT,
    min_stock DECIMAL(15, 2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;

-- Policies for warehouses
CREATE POLICY "Enable read access for all authenticated users" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.warehouses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.warehouses FOR DELETE TO authenticated USING (true);

-- Policies for warehouse_inventory
CREATE POLICY "Enable read access for all authenticated users" ON public.warehouse_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.warehouse_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.warehouse_inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.warehouse_inventory FOR DELETE TO authenticated USING (true);

-- Insert Default Main Warehouse
INSERT INTO public.warehouses (name, code, type, is_default, address) 
VALUES ('คลังหลัก', 'MAIN', 'main', true, 'ที่อยู่คลังหลัก')
ON CONFLICT DO NOTHING;
