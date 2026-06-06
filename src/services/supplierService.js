import { supabase } from './supabaseClient';
import { supplierCategoryService } from './supplierCategoryService';
import { settingService } from './settingService';
import { sanitizeSearchTerm } from './sanitize';

const _mapSupplier = (supplier, mapping, catMap) => {
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
        updatedAt: supplier.updated_at,
        createdBy: supplier.created_by,
        updatedBy: supplier.updated_by
    };
};

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
            return suppliersResult.data.map(supplier => _mapSupplier(supplier, mapping, catMap));
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw error;
        }
    },

    // Server-Side Pagination
    getSuppliersPaginated: async ({ page = 1, limit = 50, searchTerm = '', status = '' }) => {
        try {
            let query = supabase.from('suppliers').select('*', { count: 'exact' });

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`name.ilike.%${safe}%,code.ilike.%${safe}%,contact_person.ilike.%${safe}%`);
            }
            if (status) {
                query = query.eq('status', status);
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const [queryResult, categories, mappingData] = await Promise.all([
                query.order('name', { ascending: true }).range(from, to),
                supplierCategoryService.getCategories(),
                settingService.getSetting('supplier_categories_map')
            ]);

            if (queryResult.error) throw queryResult.error;

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name; });
            const mapping = mappingData || {};
            
            const processedData = queryResult.data.map(supplier => _mapSupplier(supplier, mapping, catMap));

            return { data: processedData, total: queryResult.count };
        } catch (error) {
            console.error('Error fetching paginated suppliers:', error);
            return { data: [], total: 0, error };
        }
    },

    exportSuppliers: async ({ searchTerm = '', status = '' }) => {
        try {
            let query = supabase.from('suppliers').select('*');

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`name.ilike.%${safe}%,code.ilike.%${safe}%,contact_person.ilike.%${safe}%`);
            }
            if (status) {
                query = query.eq('status', status);
            }

            const [queryResult, categories, mappingData] = await Promise.all([
                query.order('name', { ascending: true }),
                supplierCategoryService.getCategories(),
                settingService.getSetting('supplier_categories_map')
            ]);

            if (queryResult.error) throw queryResult.error;

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name; });
            const mapping = mappingData || {};
            
            return queryResult.data.map(supplier => _mapSupplier(supplier, mapping, catMap));
        } catch (error) {
            console.error('Error exporting suppliers:', error);
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

            const catMap = {};
            categories.forEach(c => { catMap[c.id] = c.name; });

            return _mapSupplier(data, mapping, catMap);
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
                notes: supplierData.notes,
                created_by: supplierData.createdBy || null,
                updated_by: supplierData.updatedBy || null
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
                updated_at: new Date().toISOString(),
                updated_by: supplierData.updatedBy || null
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
