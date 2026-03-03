import { supabase } from './supabaseClient';

// In-memory cache for settings (they rarely change)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const settingService = {
    // Get setting by key (with cache)
    getSetting: async (key) => {
        try {
            // Check cache first
            const cached = cache.get(key);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.value;
            }

            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('key', key)
                .single();

            if (error) throw error;

            const value = data?.value || null;
            // Store in cache
            cache.set(key, { value, timestamp: Date.now() });
            return value;
        } catch (error) {
            console.error(`Error fetching setting ${key}:`, error);
            return null;
        }
    },

    // Save setting (and invalidate cache)
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

            // Update cache with new value
            cache.set(key, { value: data.value, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
            throw error;
        }
    },

    // Clear cache (useful for debugging)
    clearCache: () => {
        cache.clear();
    }
};
