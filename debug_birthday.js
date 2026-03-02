
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ahhosopeejidjzsfxpts.supabase.co';
const supabaseAnonKey = 'sb_publishable_vqvx0LXVlHFE77DEf_e-KQ_S_bNm8DT';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const debugBirthday = async () => {
    // 1. Get Periods
    const { data: periods, error: pError } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('start_date', { ascending: false });

    if (pError) console.error('Error fetching periods:', pError);
    // console.log('Periods:', periods);

    // 2. Get Employee
    const { data: employee, error: eError } = await supabase
        .from('employees')
        .select('*')
        .ilike('full_name', '%Kittidet%')
        .single();

    if (eError) console.error('Error fetching employee:', eError);
    console.log('Employee:', employee);

    if (periods && periods.length > 0 && employee) {
        const dob = new Date(employee.date_of_birth);
        console.log('DOB (ISO):', dob.toISOString());
        console.log('DOB (Local String):', dob.toLocaleString());

        // Check against the first few periods
        periods.slice(0, 3).forEach(p => {
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);

            // Logic check
            const year = start.getFullYear();
            const thisYearBirthday = new Date(year, dob.getMonth(), dob.getDate());
            const d = new Date(thisYearBirthday); d.setHours(0, 0, 0, 0);
            const s = new Date(start); s.setHours(0, 0, 0, 0);
            const e = new Date(end); e.setHours(0, 0, 0, 0);

            console.log(`Checking Period: ${p.label} (${p.start_date} - ${p.end_date})`);
            console.log(`  Target Birthday (This Year): ${d.toISOString()}`);
            console.log(`  Start: ${s.toISOString()}`);
            console.log(`  End:   ${e.toISOString()}`);
            console.log(`  In Range? ${d >= s && d <= e}`);
        });
    } else {
        console.log('No periods or employee found.');
    }
};

debugBirthday();
