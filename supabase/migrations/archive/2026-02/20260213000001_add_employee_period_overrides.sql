-- Create table for storing manual overrides for period-specific employee settings
CREATE TABLE IF NOT EXISTS public.employee_period_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL, -- References employees.id (which is text/string in this schema)
    is_diligence_forced BOOLEAN, -- TRUE = Force Pay, FALSE = Force No Pay, NULL = Auto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(period_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.employee_period_overrides ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (internal tool)
CREATE POLICY "Allow all access to employee_period_overrides" ON public.employee_period_overrides
    FOR ALL USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_period_overrides_updated_at
    BEFORE UPDATE ON public.employee_period_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
