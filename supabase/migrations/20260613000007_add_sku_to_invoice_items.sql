-- Add sku column to invoice_items
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS sku TEXT;
