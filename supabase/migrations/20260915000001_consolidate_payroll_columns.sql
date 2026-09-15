-- แก้ปัญหาคอลัมน์ซ้ำใน payroll_entries
-- migration 20260914000010 เผลอสร้าง backpay / company_loan_deduction ซ้ำกับ
-- back_pay / company_loan ที่มีอยู่แล้ว ทำให้โค้ดเขียนลงคอลัมน์หนึ่งแต่อ่านอีกคอลัมน์
-- จึงรวมข้อมูลมาไว้ที่ชื่อเดิมจาก CREATE TABLE แล้วลบคอลัมน์ที่ซ้ำทิ้ง

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
