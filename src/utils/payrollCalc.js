/**
 * สูตรคำนวณเงินเดือนกลาง - ทุกหน้า (modal, รายละเอียดงวด, สลิป, รายงานสรุป)
 * ต้องเรียกใช้ที่นี่ที่เดียว เพื่อไม่ให้ยอดสุทธิต่างกันในแต่ละหน้า
 */

export const HOURS_PER_DAY = 8;
export const OT_MULTIPLIERS = { ot15: 1.5, ot16: 1.6, ot20: 2.0 };

// บริษัทจ่ายเงินเดือนเดือนละ 2 งวด (ครึ่งเดือน) พนักงานรายเดือนจึงได้ เงินเดือน ÷ 2 ต่องวด
// เท่ากันทุกงวด ไม่ผูกกับจำนวนวันในงวดหรือจำนวนวันทำงานจริง
export const PAY_PERIODS_PER_MONTH = 2;
// ฐาน 30 วัน/เดือน ตามมาตรฐานค่าจ้างไทย ใช้แปลงเงินเดือนเป็นอัตราต่อวัน/ต่อชั่วโมงสำหรับคิด OT
export const DAYS_PER_MONTH = 30;

// ประกันสังคม: หัก 5% ของรายรับรวมทั้งงวด (รวม OT และเบี้ยเลี้ยงทุกตัว) ไม่มีเพดาน
export const SSO_RATE = 0.05;

export const BIRTHDAY_ALLOWANCE_DEFAULT = 500;

export const parseNum = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** @param {number} totalIncome รายรับรวมทั้งงวดก่อนหักอะไรทั้งสิ้น */
export const calculateSocialSecurity = (totalIncome) => {
    if (totalIncome <= 0) return 0;
    return round2(totalIncome * SSO_RATE);
};

export const isMonthlyEmployee = (employee) =>
    employee?.employment_type === 'รายเดือน' || employee?.employment_type === 'Full-time';

/**
 * รายการ custom_allowances ที่บันทึกก่อนมีฟิลด์ `type` จะไม่มีข้อมูลว่าเป็นรายรับหรือรายหัก
 * จึงต้องเดาจากชื่อเพื่อความเข้ากันได้ย้อนหลัง รายการใหม่ใช้ `type` ตรงๆ
 */
const LEGACY_DEDUCTION_KEYWORDS = ['หัก', 'ซ่อม', 'กองทุน', 'ภาษี', 'ประกันสังคม'];

export const isDeductionItem = (item) => {
    if (item?.type === 'deduction') return true;
    if (item?.type === 'income') return false;
    const name = String(item?.name ?? '');
    return LEGACY_DEDUCTION_KEYWORDS.some((kw) => name.includes(kw));
};

const sumAmount = (list) => round2(list.reduce((sum, item) => sum + item.amount, 0));

export const splitCustomAllowances = (customAllowances) => {
    const list = Array.isArray(customAllowances) ? customAllowances : [];
    const income = [];
    const deductions = [];

    list.forEach((item) => {
        const name = String(item?.name ?? '').trim();
        const raw = parseNum(item?.amount);
        if (isDeductionItem(item)) {
            // รายการหักอาจถูกกรอกเป็นเลขติดลบ ให้ถือเป็นยอดหักเท่ากัน
            deductions.push({ name, amount: Math.abs(raw) });
        } else {
            income.push({ name, amount: raw });
        }
    });

    return {
        income,
        deductions,
        incomeTotal: sumAmount(income),
        deductionTotal: sumAmount(deductions),
    };
};

const sumByKeyword = (items, keywords) =>
    round2(
        items
            .filter((item) => keywords.some((kw) => item.name.includes(kw)))
            .reduce((sum, item) => sum + item.amount, 0)
    );

/**
 * ฐานค่าจ้างของ 1 รายการ แยกตามประเภทการจ้าง
 * - รายเดือน: ได้ เงินเดือน ÷ 2 เต็มงวด ไม่หักตามวันทำงานจริง (วันขาดจัดการด้วยลาป่วย/ลากิจแยกต่างหาก)
 * - รายวัน/ฝึกงาน: ค่าแรงรายวัน × วันทำงานจริง
 * ดูประเภทจากข้อมูลพนักงานก่อน ถ้าไม่ได้ส่ง employee มาให้ดูจาก monthly_salary ที่บันทึกไว้ในแถวนั้น
 * เพื่อให้สลิปและรายงานคิดยอดได้ตรงกับโมดัลเสมอ
 */
export const calculateBasePay = (entry, employee = null) => {
    const e = entry || {};
    const monthlySalary = parseNum(e.monthly_salary);
    const dailyWage = parseNum(e.daily_wage);
    const actualWorkingDays = parseNum(e.actual_working_days);
    const isMonthly = employee ? isMonthlyEmployee(employee) : monthlySalary > 0;

    // อัตราต่อวันที่ใช้คิด OT: รายเดือนแปลงจากเงินเดือนด้วยฐาน 30 วัน
    const dailyRate = isMonthly ? round2(monthlySalary / DAYS_PER_MONTH) : dailyWage;
    const basePay = isMonthly
        ? round2(monthlySalary / PAY_PERIODS_PER_MONTH)
        : round2(dailyWage * actualWorkingDays);

    return { isMonthly, monthlySalary, dailyWage, dailyRate, actualWorkingDays, basePay };
};

/**
 * คำนวณเงินเดือนของ 1 รายการ
 * @param {object} entry แถวจากตาราง payroll_entries
 * @param {object} [employee] ใช้เฉพาะข้อมูลประกอบรายงาน (ไม่กระทบยอดเงิน)
 */
export const calculatePayroll = (entry, employee = null) => {
    const e = entry || {};

    const { isMonthly, monthlySalary, dailyWage, dailyRate, actualWorkingDays, basePay } =
        calculateBasePay(e, employee);
    const hourlyRate = dailyRate / HOURS_PER_DAY;

    const ot15Hours = parseNum(e.ot_1_5_hours);
    const ot16Hours = parseNum(e.ot_1_6_hours);
    const ot20Hours = parseNum(e.ot_2_0_hours);
    const ot15Amount = round2(ot15Hours * hourlyRate * OT_MULTIPLIERS.ot15);
    const ot16Amount = round2(ot16Hours * hourlyRate * OT_MULTIPLIERS.ot16);
    const ot20Amount = round2(ot20Hours * hourlyRate * OT_MULTIPLIERS.ot20);
    const otTotalAmount = round2(ot15Amount + ot16Amount + ot20Amount);

    const positionAllowance = parseNum(e.position_allowance);
    const skillAllowance = parseNum(e.skill_allowance);
    const diligenceAllowance = parseNum(e.diligence_allowance);
    const birthdayAllowance = parseNum(e.birthday_allowance);
    const transportAllowance = parseNum(e.transport_allowance);
    const shiftAllowance = parseNum(e.shift_allowance);
    const bonus = parseNum(e.bonus);
    const backPay = parseNum(e.back_pay);

    const custom = splitCustomAllowances(e.custom_allowances);

    const totalIncome = round2(
        basePay +
            otTotalAmount +
            positionAllowance +
            skillAllowance +
            diligenceAllowance +
            birthdayAllowance +
            transportAllowance +
            shiftAllowance +
            bonus +
            backPay +
            custom.incomeTotal
    );

    // ประกันสังคมหักก่อนเป็นรายการแรก คิด 5% จากรายรับรวม (หรือใช้ยอด fix จากข้อมูลพนักงาน)
    // แถวที่ไม่ได้ระบุยอดไว้ (null/undefined) ให้คิดจากสูตรอัตโนมัติหรือยอด fix จากพนักงาน
    const socialSecurity =
        e.social_security !== null && e.social_security !== undefined
            ? parseNum(e.social_security)
            : (employee?.social_security !== null && employee?.social_security !== undefined)
                ? parseNum(employee.social_security)
                : calculateSocialSecurity(totalIncome);

    // เงินกู้ยืมบริษัทหักหลังประกันสังคม
    const companyLoan = parseNum(e.company_loan);

    const fundDeduction = sumByKeyword(custom.deductions, ['กองทุน', 'fund']);
    const taxDeduction = sumByKeyword(custom.deductions, ['ภาษี', 'tax']);
    const repairDeduction = sumByKeyword(custom.deductions, ['ซ่อม']);
    const namedDeductionTotal = round2(fundDeduction + taxDeduction + repairDeduction);
    const otherDeductions = round2(custom.deductionTotal - namedDeductionTotal);

    const totalDeductions = round2(socialSecurity + companyLoan + custom.deductionTotal);
    const netPay = round2(totalIncome - totalDeductions);

    return {
        dailyWage,
        monthlySalary,
        // อัตราต่อวันที่ใช้จริงในการคิด OT (รายเดือน = เงินเดือน ÷ 30)
        dailyRate,
        hourlyRate,
        actualWorkingDays,
        basePay,
        ot15Hours,
        ot16Hours,
        ot20Hours,
        ot15Amount,
        ot16Amount,
        ot20Amount,
        otTotalAmount,
        positionAllowance,
        skillAllowance,
        diligenceAllowance,
        birthdayAllowance,
        transportAllowance,
        shiftAllowance,
        bonus,
        backPay,
        customIncome: custom.income,
        customIncomeTotal: custom.incomeTotal,
        customDeductions: custom.deductions,
        customDeductionTotal: custom.deductionTotal,
        totalIncome,
        socialSecurity,
        companyLoan,
        fundDeduction,
        taxDeduction,
        repairDeduction,
        otherDeductions,
        totalDeductions,
        netPay,
        isMonthly,
    };
};

/**
 * หาวันคล้ายวันเกิดของพนักงานที่ตกอยู่ในช่วงงวดนี้
 * ตรวจทั้งปีของวันเริ่มงวดและปีของวันสิ้นงวด เพื่อรองรับงวดที่คร่อมปีใหม่ (เช่น 26 ธ.ค. - 25 ม.ค.)
 * @returns {Date|null} วันคล้ายวันเกิดที่อยู่ในงวด หรือ null ถ้าไม่มี
 */
export const getBirthdayInPeriod = (employee, period) => {
    if (!employee?.date_of_birth || !period?.start_date || !period?.end_date) return null;

    const dob = new Date(employee.date_of_birth);
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    if ([dob, start, end].some((d) => Number.isNaN(d.getTime()))) return null;

    const month = dob.getMonth();
    const day = dob.getDate();

    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        // คนเกิด 29 ก.พ. ในปีที่ไม่ใช่ปีอธิกสุรทิน ให้ถือวันสุดท้ายของเดือน (28 ก.พ.)
        // ไม่ปล่อยให้ JS เลื่อนไปเป็น 1 มี.ค. เอง
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const candidate = new Date(year, month, Math.min(day, lastDayOfMonth));
        if (candidate >= startDay && candidate <= endDay) return candidate;
    }
    return null;
};
