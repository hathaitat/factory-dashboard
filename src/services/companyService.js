import { supabase } from './supabaseClient';

export const companyService = {
    // Get company info (always ID 1)
    getCompanyInfo: async () => {
        try {
            const { data, error } = await supabase
                .from('company_info')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                // If row doesn't exist (e.g. first run), return default empty structure
                if (error.code === 'PGRST116') {
                    return {
                        name: '',
                        address: '',
                        phone: '',
                        fax: '',
                        email: '',
                        taxId: '',
                        updatedAt: null
                    };
                }
                throw error;
            }

            return {
                name: data.name,
                address: data.address,
                phone: data.phone,
                fax: data.fax,
                email: data.email,
                taxId: data.tax_id,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error fetching company info:', error);
            return null;
        }
    },

    // Update company info
    updateCompanyInfo: async (info) => {
        try {
            const dbData = {
                name: info.name,
                address: info.address,
                phone: info.phone,
                fax: info.fax,
                email: info.email,
                tax_id: info.taxId,
                updated_at: new Date().toISOString()
            };

            // Upsert: update if exists, insert if not (id=1)
            const { data, error } = await supabase
                .from('company_info')
                .upsert({ id: 1, ...dbData })
                .select()
                .single();

            if (error) throw error;

            return {
                name: data.name,
                address: data.address,
                phone: data.phone,
                fax: data.fax,
                email: data.email,
                taxId: data.tax_id,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error updating company info:', error);
            throw error;
        }
    }
};
