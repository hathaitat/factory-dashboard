-- Add department column to internal_requisitions
ALTER TABLE public.internal_requisitions 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
