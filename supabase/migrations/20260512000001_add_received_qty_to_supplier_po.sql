-- Add received_quantity to supplier_po_items
ALTER TABLE public.supplier_po_items 
ADD COLUMN IF NOT EXISTS received_quantity DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Add total_received_quantity to supplier_pos for easier tracking
ALTER TABLE public.supplier_pos 
ADD COLUMN IF NOT EXISTS total_received_quantity DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Refresh the schema cache so the API recognizes the new columns
NOTIFY pgrst, 'reload schema';
