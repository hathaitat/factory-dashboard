import { supabase } from './supabaseClient';

export const attributeService = {
    // Get attributes for a specific customer
    getAttributesByCustomerId: async (customerId) => {
        try {
            const { data, error } = await supabase
                .from('customer_attributes')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map(attr => ({
                id: attr.id,
                customerId: attr.customer_id,
                name: attr.attribute_name,
                value: attr.attribute_value,
                createdAt: attr.created_at
            }));
        } catch (error) {
            console.error('Error fetching attributes:', error);
            return [];
        }
    },

    // Create a new attribute for a customer
    createAttribute: async (attributeData) => {
        try {
            const dbData = {
                customer_id: attributeData.customerId,
                attribute_name: attributeData.name,
                attribute_value: attributeData.value
            };

            const { data, error } = await supabase
                .from('customer_attributes')
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                customerId: data.customer_id,
                name: data.attribute_name,
                value: data.attribute_value,
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error creating attribute:', error);
            throw error;
        }
    },

    // Delete an attribute
    deleteAttribute: async (id) => {
        try {
            const { error } = await supabase
                .from('customer_attributes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting attribute:', error);
            return false;
        }
    }
};
