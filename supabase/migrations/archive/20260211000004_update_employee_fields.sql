-- Update employees table fields
-- 1. Remove id_card column
ALTER TABLE public.employees DROP COLUMN IF EXISTS id_card;

-- 2. Add date_of_birth
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 3. Add Emergency Contact fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
