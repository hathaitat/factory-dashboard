ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS social_security NUMERIC;

COMMENT ON COLUMN public.employees.social_security IS
'ค่าประกันสังคมแบบระบุยอดคงที่ (เฉพาะรายเดือน) หากระบุไว้จะใช้ยอดนี้แทนการหัก 5%';

NOTIFY pgrst, 'reload schema';
