import { supabase } from './supabaseClient';

export const periodService = {
    // Get all custom periods from payroll_periods table
    getPeriods: async () => {
        try {
            const { data, error } = await supabase
                .from('payroll_periods')
                .select('*')
                .order('start_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching periods:', error);
            return [];
        }
    },

    // Create a new custom period
    createPeriod: async (periodData) => {
        try {
            const { data, error } = await supabase
                .from('payroll_periods')
                .insert([{
                    label: periodData.label,
                    start_date: periodData.start_date,
                    end_date: periodData.end_date
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating period:', error);
            throw error;
        }
    },

    // Delete a custom period
    deletePeriod: async (id) => {
        try {
            // 1. Get period details first to know dates
            const { data: period, error: fetchError } = await supabase
                .from('payroll_periods')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // 2. Delete logs within range
            if (period) {
                const { error: deleteLogsError } = await supabase
                    .from('work_logs')
                    .delete()
                    .gte('work_date', period.start_date)
                    .lte('work_date', period.end_date);

                if (deleteLogsError) {
                    console.error('Error deleting associated logs:', deleteLogsError);
                    // Decide: Should we stop? Or continue deleting the period?
                    // Let's stop to prevent orphaned data state where period is gone but logs remain.
                    throw deleteLogsError;
                }
            }

            // 3. Delete the period itself
            const { error } = await supabase
                .from('payroll_periods')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting period:', error);
            throw error;
        }
    }
};
