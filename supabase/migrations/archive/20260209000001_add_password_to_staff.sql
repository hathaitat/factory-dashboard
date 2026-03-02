-- Migration to add password column to staff_members table
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing users with a default password (optional, but good for testing)
-- UPDATE public.staff_members SET password = 'password123' WHERE password IS NULL;
