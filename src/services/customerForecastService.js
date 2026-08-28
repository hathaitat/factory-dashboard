import { supabase } from './supabaseClient';

export const customerForecastService = {
    // 1. Get forecasts with customer details
    getForecasts: async () => {
        try {
            const { data, error } = await supabase
                .from('customer_forecasts')
                .select(`
                    *,
                    customers:customer_id (
                        name,
                        contact_person
                    )
                `)
                .order('forecast_month', { ascending: true })
                .order('product_name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching customer forecasts:', error);
            throw error;
        }
    },

    // 2. Save or update forecasts (Bulk Upsert)
    // forecasts should be an array of objects: { customer_id, product_name, forecast_month, quantity }
    saveForecasts: async (forecasts) => {
        try {
            const { data, error } = await supabase
                .from('customer_forecasts')
                .upsert(forecasts, {
                    onConflict: 'customer_id,product_name,forecast_month'
                });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error saving customer forecasts:', error);
            throw error;
        }
    },

    // 3. Replace forecasts for specific months
    replaceForecasts: async (customerId, monthKeys, forecasts) => {
        try {
            let query = supabase.from('customer_forecasts').delete().in('forecast_month', monthKeys);
            if (customerId) {
                query = query.eq('customer_id', customerId);
            } else {
                query = query.is('customer_id', null);
            }
            const { error: delErr } = await query;
            
            if (delErr) throw delErr;

            if (forecasts && forecasts.length > 0) {
                const { error: insErr } = await supabase
                    .from('customer_forecasts')
                    .insert(forecasts);
                
                if (insErr) throw insErr;
            }

            return { success: true };
        } catch (error) {
            console.error('Error replacing customer forecasts:', error);
            throw error;
        }
    },

    // 4. Delete a forecast entry
    deleteForecast: async (id) => {
        try {
            const { error } = await supabase
                .from('customer_forecasts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting forecast:', error);
            throw error;
        }
    },

    // 4. Get aggregated forecast quantities by product for a specific month (e.g., for Demand Report)
    getAggregatedForecastForMonth: async (monthStr) => {
        try {
            const { data, error } = await supabase
                .from('customer_forecasts')
                .select('product_name, quantity')
                .eq('forecast_month', monthStr);

            if (error) throw error;

            const forecastMap = {};
            data.forEach(item => {
                forecastMap[item.product_name] = (forecastMap[item.product_name] || 0) + Number(item.quantity || 0);
            });

            return forecastMap;
        } catch (error) {
            console.error('Error fetching aggregated forecast:', error);
            throw error;
        }
    }
};
