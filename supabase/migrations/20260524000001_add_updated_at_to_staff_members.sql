-- Add updated_at column to staff_members table
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function if not exists (should already exist but defined here for safety)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update trigger to automatically update updated_at on UPDATE
DROP TRIGGER IF EXISTS update_staff_members_updated_at ON public.staff_members;
CREATE TRIGGER update_staff_members_updated_at
    BEFORE UPDATE ON public.staff_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
