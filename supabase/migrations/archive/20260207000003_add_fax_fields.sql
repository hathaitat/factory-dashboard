-- Add fax column to company_info and customers tables
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS fax TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fax TEXT;

-- Notify Supabase to reload schema
NOTIFY pgrst, 'reload schema';
