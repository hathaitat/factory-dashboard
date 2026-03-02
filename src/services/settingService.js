import { supabase } from './supabaseClient';

export const settingService = {
    // Get setting by key
    getSetting: async (key) => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('key', key)
                .single();

            if (error) throw error;
            return data?.value || null;
        } catch (error) {
            console.error(`Error fetching setting ${key}:`, error);
            return null;
        }
    },

    // Save setting
    saveSetting: async (key, value, description = '') => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .upsert({
                    key,
                    value,
                    description,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
            throw error;
        }
    }
};
