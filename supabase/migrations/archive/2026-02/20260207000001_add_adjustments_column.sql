-- Add adjustments column to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS adjustments JSONB DEFAULT '[]';
