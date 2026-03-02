
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ahhosopeejidjzsfxpts.supabase.co';
const supabaseAnonKey = 'sb_publishable_vqvx0LXVlHFE77DEf_e-KQ_S_bNm8DT';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const verifyOverride = async () => {
    // 1. Get a period
    const { data: periods } = await supabase.from('payroll_periods').select('id').limit(1);
    if (!periods || periods.length === 0) { console.log('No periods found'); return; }
    const periodId = periods[0].id;

    // 2. Get an employee
    const { data: employees } = await supabase.from('employees').select('id').limit(1);
    if (!employees || employees.length === 0) { console.log('No employees found'); return; }
    const employeeId = employees[0].id;

    console.log(`Testing with Period: ${periodId}, Employee: ${employeeId}`);

    // 3. Upsert Override -> Force Pay with Amount 888
    console.log('Setting Override to TRUE with Amount 888...');
    const payload1 = {
        period_id: periodId,
        employee_id: employeeId,
        is_diligence_forced: true,
        diligence_override_amount: 888
    };

    const { data: d1, error: e1 } = await supabase
        .from('employee_period_overrides')
        .upsert(payload1, { onConflict: 'period_id, employee_id' })
        .select()
        .single();

    if (e1) { console.error('Error 1:', e1); return; }
    console.log('Result 1:', d1.is_diligence_forced, 'Amount:', d1.diligence_override_amount);

    // 4. Upsert Override -> Force Pay with Amount 0
    console.log('Setting Override to TRUE with Amount 0...');
    const payload2 = {
        period_id: periodId,
        employee_id: employeeId,
        is_diligence_forced: true,
        diligence_override_amount: 0
    };

    const { data: d2, error: e2 } = await supabase
        .from('employee_period_overrides')
        .upsert(payload2, { onConflict: 'period_id, employee_id' })
        .select()
        .single();

    if (e2) { console.error('Error 2:', e2); return; }
    console.log('Result 2:', d2.is_diligence_forced, 'Amount:', d2.diligence_override_amount);

    // 5. Clean up / Revert to Auto
    console.log('Setting Override to NULL (Auto)...');
    const payload3 = {
        period_id: periodId,
        employee_id: employeeId,
        is_diligence_forced: null,
        diligence_override_amount: null
    };

    const { data: d3, error: e3 } = await supabase
        .from('employee_period_overrides')
        .upsert(payload3, { onConflict: 'period_id, employee_id' })
        .select()
        .single();

    if (e3) { console.error('Error 3:', e3); return; }
    console.log('Result 3:', d3.is_diligence_forced, 'Amount:', d3.diligence_override_amount);

    console.log('Verification Complete.');
};

verifyOverride();
