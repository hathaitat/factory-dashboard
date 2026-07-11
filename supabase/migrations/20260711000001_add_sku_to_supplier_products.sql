-- Add SKU column to supplier_products
ALTER TABLE public.supplier_products
ADD COLUMN IF NOT EXISTS sku TEXT;
