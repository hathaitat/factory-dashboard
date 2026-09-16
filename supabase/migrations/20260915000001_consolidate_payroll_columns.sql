-- แก้ปัญหาคอลัมน์ซ้ำใน payroll_entries
-- migration 20260914000010 เผลอสร้าง backpay / company_loan_deduction ซ้ำกับ
-- back_pay / company_loan ที่มีอยู่แล้ว ทำให้โค้ดเขียนลงคอลัมน์หนึ่งแต่อ่านอีกคอลัมน์
-- จึงรวมข้อมูลมาไว้ที่ชื่อเดิมจาก CREATE TABLE แล้วลบคอลัมน์ที่ซ้ำทิ้ง

-- 0) ฐานข้อมูลบางตัว (เช่น dev) ถูกสร้าง payroll_entries ด้วย migration 20260914000010
--    ซึ่งเติมเฉพาะคอลัมน์ชื่อเก่า (backpay / company_loan_deduction) ส่วน CREATE TABLE ใน
--    20260914000005 เป็น IF NOT EXISTS จึงไม่ได้เติมคอลัมน์ที่เหลือให้ตารางที่มีอยู่แล้ว
--    ผลคือคอลัมน์ที่โค้ดเขียนลงไปหายไปหลายตัว ทำให้บันทึกเงินเดือนไม่ผ่าน (HTTP 400)
--    ต้องเติมให้ครบก่อน ไม่งั้นขั้นตอนย้ายข้อมูลข้างล่างจะล้มเพราะไม่มีคอลัมน์ปลายทาง
ALTER TABLE public.payroll_entries
    ADD COLUMN IF NOT EXISTS back_pay NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS company_loan NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS diligence_allowance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ot_1_6_hours NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS birthday_allowance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS custom_allowances JSONB DEFAULT '[]'::jsonb;

-- เบี้ยขยันฝั่งพนักงานก็หายด้วยเหตุเดียวกัน (หน้าส่งออก Excel อ่านคอลัมน์นี้)
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS diligence_allowance NUMERIC DEFAULT 0;

-- 1) ย้ายข้อมูลที่ค้างอยู่ในคอลัมน์ซ้ำกลับมาที่คอลัมน์หลัก (เลือกค่าที่ไม่ใช่ 0/NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payroll_entries' AND column_name = 'backpay'
    ) THEN
        UPDATE public.payroll_entries
        SET back_pay = backpay
        WHERE COALESCE(back_pay, 0) = 0 AND COALESCE(backpay, 0) <> 0;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payroll_entries' AND column_name = 'company_loan_deduction'
    ) THEN
        UPDATE public.payroll_entries
        SET company_loan = company_loan_deduction
        WHERE COALESCE(company_loan, 0) = 0 AND COALESCE(company_loan_deduction, 0) <> 0;
    END IF;
END $$;

-- 2) ลบคอลัมน์ซ้ำและคอลัมน์ที่ไม่มีโค้ดส่วนไหนใช้งาน
ALTER TABLE public.payroll_entries
    DROP COLUMN IF EXISTS backpay,
    DROP COLUMN IF EXISTS company_loan_deduction,
    DROP COLUMN IF EXISTS ot_hours,
    DROP COLUMN IF EXISTS ot_3_0_hours;

-- 3) เก็บยอดหักประกันสังคมเป็นตัวเลขจริง แทนการคำนวณใหม่คนละแบบในแต่ละหน้า
--    ปล่อยให้เป็น NULL ได้ เพื่อให้แถวเก่าย้อนกลับไปใช้สูตร 5% เพดาน 750 ตามเดิม
ALTER TABLE public.payroll_entries
    ADD COLUMN IF NOT EXISTS social_security NUMERIC;

COMMENT ON COLUMN public.payroll_entries.social_security IS
    'ยอดหักประกันสังคมของงวดนี้ (NULL = ยังไม่เคยระบุ ให้คำนวณ 5% เพดาน 750)';

COMMENT ON COLUMN public.payroll_entries.custom_allowances IS
    'รายการย่อย: [{ name, amount, type: "income" | "deduction" }] รายการเก่าที่ไม่มี type จะเดาจากชื่อ';

NOTIFY pgrst, 'reload schema';
