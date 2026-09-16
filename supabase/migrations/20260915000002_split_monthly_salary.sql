-- แยก "เงินเดือน" ของพนักงานรายเดือน ออกจาก "ค่าแรงรายวัน" ของพนักงานรายวัน
--
-- เหตุผล/ความจำเป็น:
-- เดิมมีคอลัมน์เก็บค่าจ้างช่องเดียวคือ daily_wage ฟอร์มพนักงานจึงบังคับให้กรอก
-- เงินเดือนของพนักงานรายเดือนลงไปในช่อง "ค่าแรงรายวัน" แล้วแต่ละหน้าตีความคนละแบบ
--   - โมดัลเงินเดือน คิด daily_wage x จำนวนวันทำงาน  -> เงินเดือน 20,000 กลายเป็น 260,000
--   - รายงานสรุป    คิดย้อนกลับเป็น daily_wage x 30   -> เงินเดือน 20,000 กลายเป็น 600,000
-- การเดาความหมายจากคอลัมน์เดียวคือต้นเหตุ จึงต้องแยกคอลัมน์ให้ชัดเจน
-- พนักงานรายเดือน: ใช้ monthly_salary (งวดครึ่งเดือนได้ monthly_salary / 2)
-- พนักงานรายวัน/ฝึกงาน: ใช้ daily_wage ตามเดิม

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;

ALTER TABLE public.payroll_entries
    ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.employees.monthly_salary IS
    'เงินเดือน (บาท/เดือน) ใช้กับพนักงานประเภทรายเดือนเท่านั้น รายวันให้ใช้ daily_wage';
COMMENT ON COLUMN public.employees.daily_wage IS
    'ค่าแรงรายวัน (บาท/วัน) ใช้กับพนักงานรายวัน/ฝึกงานเท่านั้น รายเดือนให้ใช้ monthly_salary';
COMMENT ON COLUMN public.payroll_entries.monthly_salary IS
    'เงินเดือนที่ใช้คิดงวดนี้ (สแนปช็อตจากพนักงาน) ฐานเงินงวด = monthly_salary / 2';

-- ย้ายค่าที่เคยถูกกรอกผิดช่องของพนักงานรายเดือน มาไว้ที่ monthly_salary
-- ไม่ล้าง daily_wage ทิ้ง เพื่อให้ยังย้อนดูค่าเดิมได้
UPDATE public.employees
SET monthly_salary = daily_wage
WHERE employment_type IN ('รายเดือน', 'Full-time')
  AND COALESCE(monthly_salary, 0) = 0
  AND COALESCE(daily_wage, 0) > 0;

-- รายการเงินเดือนที่บันทึกไว้แล้วของพนักงานรายเดือน ย้ายตามด้วย
-- ไม่งั้นงวดเก่าจะคิดฐานเป็น 0 เพราะโค้ดใหม่อ่านจาก monthly_salary
UPDATE public.payroll_entries pe
SET monthly_salary = pe.daily_wage
FROM public.employees e
WHERE e.id = pe.employee_id
  AND e.employment_type IN ('รายเดือน', 'Full-time')
  AND COALESCE(pe.monthly_salary, 0) = 0
  AND COALESCE(pe.daily_wage, 0) > 0;

NOTIFY pgrst, 'reload schema';
