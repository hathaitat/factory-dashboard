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
                        logoUrl: '',
                        updatedBy: null,
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
                logoUrl: data.logo_url,
                updatedBy: data.updated_by,
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
                logo_url: info.logoUrl,
                updated_by: info.updatedBy || null,
                updated_at: new Date().toISOString()
            };

            // Upsert: update if exists, insert if not (id=1)
            let { data, error } = await supabase
                .from('company_info')
                .upsert({ id: 1, ...dbData })
                .select()
                .single();

            // Graceful fallback if logo_url column does not exist yet (PGRST204 = column not found / PGRST200 / 400 Bad Request)
            if (error && (error.code === 'PGRST204' || error.message?.includes('logo_url'))) {
                console.warn('logo_url column might not exist in company_info table, retrying without it');
                delete dbData.logo_url;
                const retry = await supabase
                    .from('company_info')
                    .upsert({ id: 1, ...dbData })
                    .select()
                    .single();
                
                if (retry.error) throw retry.error;
                data = retry.data;
                data.missingLogoColumn = true;
            } else if (error) {
                throw error;
            }

            return {
                name: data.name,
                address: data.address,
                phone: data.phone,
                fax: data.fax,
                email: data.email,
                taxId: data.tax_id,
                logoUrl: data.logo_url,
                missingLogoColumn: data.missingLogoColumn,
                updatedBy: data.updated_by,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error updating company info:', error);
            throw error;
        }
    },

    // Upload Logo
    uploadLogo: async (file) => {
        try {
            const bucketName = 'certificates'; // Reusing known public bucket
            const fileExt = file.name.split('.').pop();
            const filePath = `company/logo_${Date.now()}.${fileExt}`;
            
            const { error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (error) throw error;
            
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        }
    }
};
