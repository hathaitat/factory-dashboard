CREATE TABLE IF NOT EXISTS public.inventory_bom_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES public.warehouse_inventory(id) ON DELETE CASCADE,
    supplier_product_id BIGINT REFERENCES public.supplier_products(id) ON DELETE CASCADE,
    raw_material_qty DECIMAL(15, 4) NOT NULL,
    finished_product_qty DECIMAL(15, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(inventory_id, supplier_product_id)
);

ALTER TABLE public.inventory_bom_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.inventory_bom_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.inventory_bom_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.inventory_bom_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.inventory_bom_rules FOR DELETE TO authenticated USING (true);
