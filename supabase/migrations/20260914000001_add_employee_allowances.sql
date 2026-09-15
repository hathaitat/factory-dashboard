-- Add position_allowance and skill_allowance to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS position_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS skill_allowance NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.employees.position_allowance IS 'Position Allowance';
COMMENT ON COLUMN public.employees.skill_allowance IS 'Skill Allowance';
