-- Add performed_by to inventory_logs if it somehow doesn't exist
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS performed_by TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
