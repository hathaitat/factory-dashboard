-- Restore missing schema elements (consolidated)

-- 1. Add employment_type to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time';
COMMENT ON COLUMN public.employees.employment_type IS 'Employment status: Full-time, Part-time, Internship';

-- 2. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public access for settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- Insert default settings
INSERT INTO public.settings (key, value, description)
VALUES 
    ('work_schedule', '{"start_time": "08:00", "end_time": "17:00"}', 'Default work schedule configuration')
ON CONFLICT (key) DO NOTHING;

-- 3. Update employees table fields
-- Remove id_card column
ALTER TABLE public.employees DROP COLUMN IF EXISTS id_card;

-- Add date_of_birth
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add Emergency Contact fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
