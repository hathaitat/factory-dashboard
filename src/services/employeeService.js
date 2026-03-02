import { supabase } from './supabaseClient';

export const employeeService = {
    // Get all employees
    getEmployees: async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('code', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching employees:', error);
            return [];
        }
    },

    // Get employee by ID
    getEmployeeById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching employee:', error);
            return null;
        }
    },

    // Create employee
    createEmployee: async (employeeData) => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .insert([employeeData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    },

    // Update employee
    updateEmployee: async (id, employeeData) => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .update(employeeData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    },

    // Delete employee
    deleteEmployee: async (id) => {
        try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            return false;
        }
    },

    // --- Work Logs (Timesheet) ---

    // Get work logs for an employee
    getWorkLogs: async (employeeId) => {
        try {
            const { data, error } = await supabase
                .from('work_logs')
                .select('*')
                .eq('employee_id', employeeId)
                .order('work_date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching work logs:', error);
            return [];
        }
    },

    // Add work log
    addWorkLog: async (logData) => {
        try {
            const { data, error } = await supabase
                .from('work_logs')
                .insert([logData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding work log:', error);
            throw error;
        }
    },

    // Delete work log
    deleteWorkLog: async (id) => {
        try {
            const { error } = await supabase
                .from('work_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting work log:', error);
            return false;
        }
    },

    // Upsert work log (for bulk import)
    upsertWorkLog: async (logData) => {
        // Check if log exists for this employee and date
        const { data: existing, error: fetchError } = await supabase
            .from('work_logs')
            .select('id')
            .eq('employee_id', logData.employee_id)
            .eq('work_date', logData.work_date)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking existing log:', fetchError);
            // optimize: if error is not 406/PGRST116, we might want to throw?
            // But actually .maybeSingle() shouldn't throw 116.
            // If other error, let's try insert anyway or return error?
            // Let's just proceed to insert if check failed? No, safe to throw or return error.
            return { error: fetchError };
        }

        if (existing) {
            const { data, error } = await supabase
                .from('work_logs')
                .update(logData)
                .eq('id', existing.id)
                .select();
            return { data, error };
        } else {
            const { data, error } = await supabase
                .from('work_logs')
                .insert([logData])
                .select();
            return { data, error };
        }
    },

    // Get work logs by period (for summary view)
    getWorkLogsByPeriod: async (startDate, endDate) => {
        const { data, error } = await supabase
            .from('work_logs')
            .select(`
                *,
                employees (
                    id,
                    full_name,
                    code
                )
            `)
            .gte('work_date', startDate)
            .lte('work_date', endDate);

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
        return data;
    },

    deleteWorkLogsByPeriod: async (startDate, endDate) => {
        try {
            const { error } = await supabase
                .from('work_logs')
                .delete()
                .gte('work_date', startDate)
                .lte('work_date', endDate);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting logs by period:', error);
            return false;
        }
    },

    // Calculate potential payroll (client-side calculation for dashboard)
    calculatePayroll: (employees, workDaysMap) => {
        // workDaysMap: { employeeId: days }
        return employees.map(emp => {
            const days = workDaysMap[emp.id] || 0;
            const wage = parseFloat(emp.daily_wage || 0);
            return {
                ...emp,
                workDays: days,
                totalPay: days * wage
            };
        });
    },

    // --- Diligence Overrides ---
    getDiligenceOverrides: async (periodId) => {
        try {
            const { data, error } = await supabase
                .from('employee_period_overrides')
                .select('*')
                .eq('period_id', periodId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching diligence overrides:', error);
            return [];
        }
    },

    upsertDiligenceOverride: async (periodId, employeeId, isForced, amount = null) => {
        try {
            const payload = {
                period_id: periodId,
                employee_id: employeeId,
                is_diligence_forced: isForced,
                updated_at: new Date()
            };

            if (amount !== undefined) {
                payload.diligence_override_amount = amount;
            }

            const { data, error } = await supabase
                .from('employee_period_overrides')
                .upsert(payload, { onConflict: 'period_id, employee_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating diligence override:', error);
            throw error;
        }
    }
};
