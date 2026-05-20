import { supabase } from './supabaseClient';

export const supplierProductService = {
    // Get products for a specific supplier
    getProductsBySupplierId: async (supplierId) => {
        try {
            const { data, error } = await supabase
                .from('supplier_products')
                .select('*')
                .eq('supplier_id', supplierId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map(product => ({
                id: product.id,
                supplierId: product.supplier_id,
                name: product.name,
                unit: product.unit,
                price: Number(product.price),
                createdAt: product.created_at
            }));
        } catch (error) {
            console.error('Error fetching supplier products:', error);
            return [];
        }
    },

    // Get all supplier products (for mapping BOM)
    getAllProducts: async () => {
        try {
            const { data, error } = await supabase
                .from('supplier_products')
                .select(`
                    *,
                    suppliers(name)
                `)
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching all supplier products:', error);
            return [];
        }
    },

    // Create a new product for a supplier
    createProduct: async (productData) => {
        try {
            const dbData = {
                supplier_id: productData.supplierId,
                name: productData.name,
                unit: productData.unit,
                price: productData.price
            };

            const { data, error } = await supabase
                .from('supplier_products')
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                supplierId: data.supplier_id,
                name: data.name,
                unit: data.unit,
                price: Number(data.price),
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error creating supplier product:', error);
            throw error;
        }
    },

    // Update a product
    updateProduct: async (id, productData) => {
        try {
            const dbData = {
                name: productData.name,
                unit: productData.unit,
                price: productData.price
            };

            const { data, error } = await supabase
                .from('supplier_products')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                supplierId: data.supplier_id,
                name: data.name,
                unit: data.unit,
                price: Number(data.price),
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error updating supplier product:', error);
            throw error;
        }
    },

    // Delete a product
    deleteProduct: async (id) => {
        try {
            const { error } = await supabase
                .from('supplier_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting supplier product:', error);
            return false;
        }
    },

    // Get price history for a product from actual POs
    getProductPriceHistory: async (productId, startDate, endDate) => {
        try {
            // Query from supplier_po_items which contains actual purchase prices
            let query = supabase
                .from('supplier_po_items')
                .select(`
                    id,
                    unit_price,
                    supplier_pos!inner (
                        date,
                        po_number
                    )
                `)
                .eq('supplier_product_id', productId)
                .order('supplier_pos(date)', { ascending: true });

            if (startDate) {
                query = query.gte('supplier_pos.date', startDate);
            }
            if (endDate) {
                query = query.lte('supplier_pos.date', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data.map(item => ({
                id: item.id,
                productId: productId,
                price: Number(item.unit_price),
                effectiveDate: item.supplier_pos.date,
                notes: `จาก PO: ${item.supplier_pos.po_number}`,
                createdAt: item.supplier_pos.date
            }));
        } catch (error) {
            console.error('Error fetching product price history from POs:', error);
            return [];
        }
    }
};
