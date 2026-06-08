-- Add delivery_warehouse_id to supplier_pos table
ALTER TABLE public.supplier_pos
ADD COLUMN IF NOT EXISTS delivery_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
