import { supabase } from './supabaseClient';

const num = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
};

export const payrollService = {
    // ดึงรายชื่องวดเงินเดือนทั้งหมด
    getPayrollPeriods: async () => {
        try {
            const { data, error } = await supabase
                .from('payroll_periods')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching payroll periods:', error);
            return [];
        }
    },

    // ดึงข้อมูลรายงวด
    getPayrollPeriodById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('payroll_periods')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching payroll period:', error);
            return null;
        }
    },

    // สร้างงวดเงินเดือนใหม่
    createPayrollPeriod: async (periodData) => {
        try {
            const { data, error } = await supabase
                .from('payroll_periods')
                .insert([{
                    name: periodData.name,
                    start_date: periodData.start_date,
                    end_date: periodData.end_date,
                    working_days: periodData.working_days || 0,
                    status: 'draft',
                    created_by: periodData.created_by
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating payroll period:', error);
            throw error;
        }
    },

    // ลบงวดเงินเดือน
    deletePayrollPeriod: async (id) => {
        try {
            const { error } = await supabase
                .from('payroll_periods')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting payroll period:', error);
            return false;
        }
    },

    // ดึงข้อมูลรายการเงินเดือนรายบุคคลในงวดนี้
    getPayrollEntriesByPeriod: async (periodId) => {
        try {
            const { data, error } = await supabase
                .from('payroll_entries')
                .select('*')
                .eq('period_id', periodId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching payroll entries:', error);
            return [];
        }
    },

    // บันทึก/อัปเดต ข้อมูลเงินเดือนรายบุคคล (Upsert)
    upsertPayrollEntry: async (entryData) => {
        // ชื่อฟิลด์ต้องตรงกับคอลัมน์จริงในตาราง payroll_entries
        // และต้องสร้างที่เดียวเท่านั้น ไม่งั้น insert กับ update จะหลุดไม่ตรงกัน
        const payload = {
            daily_wage: num(entryData.daily_wage),
            monthly_salary: num(entryData.monthly_salary),
            position_allowance: num(entryData.position_allowance),
            skill_allowance: num(entryData.skill_allowance),
            actual_working_days: num(entryData.actual_working_days),
            ot_1_5_hours: num(entryData.ot_1_5_hours),
            ot_1_6_hours: num(entryData.ot_1_6_hours),
            ot_2_0_hours: num(entryData.ot_2_0_hours),
            company_loan: num(entryData.company_loan),
            social_security: num(entryData.social_security),
            transport_allowance: num(entryData.transport_allowance),
            bonus: num(entryData.bonus),
            shift_allowance: num(entryData.shift_allowance),
            diligence_allowance: num(entryData.diligence_allowance),
            birthday_allowance: num(entryData.birthday_allowance),
            back_pay: num(entryData.back_pay),
            custom_allowances: Array.isArray(entryData.custom_allowances)
                ? entryData.custom_allowances
                : []
        };

        try {
            const { data: existing, error: checkError } = await supabase
                .from('payroll_entries')
                .select('id')
                .eq('period_id', entryData.period_id)
                .eq('employee_id', entryData.employee_id)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                const { data, error } = await supabase
                    .from('payroll_entries')
                    .update({ ...payload, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabase
                .from('payroll_entries')
                .insert([{
                    ...payload,
                    period_id: entryData.period_id,
                    employee_id: entryData.employee_id
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error upserting payroll entry:', error);
            throw error;
        }
    },

    // ดึงข้อมูลสำหรับรายงาน Attendance Report ตามช่วงวันที่เริ่มต้นและสิ้นสุด
    getAttendanceReportData: async (startDate, endDate) => {
        try {
            // 1. ดึง Periods ในช่วงที่กำหนด
            let query = supabase
                .from('payroll_periods')
                .select('*')
                .order('start_date', { ascending: true });
                
            if (startDate) query = query.gte('start_date', startDate);
            if (endDate) query = query.lte('start_date', endDate);

            const { data: periods, error: periodError } = await query;
            if (periodError) throw periodError;

            if (!periods || periods.length === 0) return { periods: [], entries: [] };

            const periodIds = periods.map(p => p.id);

            // 2. ดึง Entries ที่อยู่ใน Periods เหล่านี้ (พร้อม Pagination ถ้าเกิน 1000 แถว)
            let allEntries = [];
            let hasMore = true;
            let from = 0;
            const BATCH_SIZE = 1000;

            while (hasMore) {
                const { data: entries, error: entryError } = await supabase
                    .from('payroll_entries')
                    .select('*')
                    .in('period_id', periodIds)
                    .order('id', { ascending: true })
                    .range(from, from + BATCH_SIZE - 1);

                if (entryError) throw entryError;

                if (entries && entries.length > 0) {
                    allEntries = [...allEntries, ...entries];
                    if (entries.length < BATCH_SIZE) {
                        hasMore = false;
                    } else {
                        from += BATCH_SIZE;
                    }
                } else {
                    hasMore = false;
                }
            }

            return { periods, entries: allEntries };
        } catch (error) {
            console.error('Error fetching attendance report data:', error);
            throw error;
        }
    }
};
