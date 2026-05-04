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
    
    // Get price history for a product
    getProductPriceHistory: async (productId, startDate, endDate) => {
        try {
            let query = supabase
                .from('supplier_product_price_history')
                .select('*')
                .eq('product_id', productId)
                .order('effective_date', { ascending: true });

            if (startDate) {
                query = query.gte('effective_date', startDate);
            }
            if (endDate) {
                query = query.lte('effective_date', endDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data.map(h => ({
                id: h.id,
                productId: h.product_id,
                price: Number(h.price),
                effectiveDate: h.effective_date,
                notes: h.notes,
                createdAt: h.created_at
            }));
        } catch (error) {
            console.error('Error fetching product price history:', error);
            return [];
        }
    }
};
