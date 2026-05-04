import { supabase } from './supabaseClient';
import { supplierCategoryService } from './supplierCategoryService';
import { settingService } from './settingService';

export const supplierService = {
    // Get all suppliers
    getSuppliers: async () => {
        try {
            const [suppliersResult, categories, mappingData] = await Promise.all([
                supabase.from('suppliers').select('*').order('name', { ascending: true }),
                supplierCategoryService.getCategories(),
                settingService.getSetting('supplier_categories_map')
            ]);

            if (suppliersResult.error) throw suppliersResult.error;

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name; });
            const mapping = mappingData || {};
            
            // Transform snake_case to camelCase
            return suppliersResult.data.map(supplier => {
                const categoryIds = mapping[supplier.id] || [];
                
                return {
                    id: supplier.id,
                    code: supplier.code,
                    name: supplier.name,
                    taxId: supplier.tax_id,
                    branch: supplier.branch,
                    address: supplier.address,
                    contactPerson: supplier.contact_person,
                    phone: supplier.phone,
                    email: supplier.email,
                    creditTerm: supplier.credit_term,
                    status: supplier.status,
                    notes: supplier.notes,
                    categoryIds: categoryIds,
                    categoryNames: categoryIds.map(cid => catMap[cid]).filter(Boolean),
                    createdAt: supplier.created_at,
                    updatedAt: supplier.updated_at
                };
            });
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw error;
        }
    },

    // Get supplier by ID
    getSupplierById: async (id) => {
        try {
            const [supplierResult, categories, mappingData] = await Promise.all([
                supabase.from('suppliers').select('*').eq('id', id).single(),
                supplierCategoryService.getCategories(),
                settingService.getSetting('supplier_categories_map')
            ]);

            if (supplierResult.error) throw supplierResult.error;
            const data = supplierResult.data;
            const mapping = mappingData || {};

            // Lookup category names
            const categoryIds = mapping[data.id] || [];
            
            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name; });
            const categoryNames = categoryIds.map(cid => catMap[cid]).filter(Boolean);
            
            return {
                id: data.id,
                code: data.code,
                name: data.name,
                taxId: data.tax_id,
                branch: data.branch,
                address: data.address,
                contactPerson: data.contact_person,
                phone: data.phone,
                email: data.email,
                creditTerm: data.credit_term,
                status: data.status,
                notes: data.notes,
                categoryIds: categoryIds,
                categoryNames: categoryNames,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error fetching supplier:', error);
            throw error;
        }
    },

    // Create supplier
    createSupplier: async (supplierData) => {
        try {
            const dbData = {
                code: supplierData.code,
                name: supplierData.name,
                tax_id: supplierData.taxId,
                branch: supplierData.branch,
                address: supplierData.address,
                contact_person: supplierData.contactPerson,
                phone: supplierData.phone,
                email: supplierData.email,
                credit_term: supplierData.creditTerm,
                status: supplierData.status || 'Active',
                notes: supplierData.notes
            };

            const { data, error } = await supabase
                .from('suppliers')
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;

            if (supplierData.categoryIds && supplierData.categoryIds.length > 0) {
                const mapping = await settingService.getSetting('supplier_categories_map') || {};
                mapping[data.id] = supplierData.categoryIds;
                await settingService.saveSetting('supplier_categories_map', mapping, 'Supplier Categories Mapping');
            }

            return data;
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    },

    // Update supplier
    updateSupplier: async (id, supplierData) => {
        try {
            const dbData = {
                code: supplierData.code,
                name: supplierData.name,
                tax_id: supplierData.taxId,
                branch: supplierData.branch,
                address: supplierData.address,
                contact_person: supplierData.contactPerson,
                phone: supplierData.phone,
                email: supplierData.email,
                credit_term: supplierData.creditTerm,
                status: supplierData.status,
                notes: supplierData.notes,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('suppliers')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const mapping = await settingService.getSetting('supplier_categories_map') || {};
            mapping[id] = supplierData.categoryIds || [];
            await settingService.saveSetting('supplier_categories_map', mapping, 'Supplier Categories Mapping');

            return data;
        } catch (error) {
            console.error('Error updating supplier:', error);
            throw error;
        }
    },

    // Delete supplier
    deleteSupplier: async (id) => {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const mapping = await settingService.getSetting('supplier_categories_map') || {};
            if (mapping[id]) {
                delete mapping[id];
                await settingService.saveSetting('supplier_categories_map', mapping, 'Supplier Categories Mapping');
            }

            return true;
        } catch (error) {
            console.error('Error deleting supplier:', error);
            throw error;
        }
    }
};
