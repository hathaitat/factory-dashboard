-- Add branch column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'สำนักงานใหญ่';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
