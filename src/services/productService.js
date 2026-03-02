import { supabase } from './supabaseClient';

export const productService = {
    // Get all products (for export)
    getAllProducts: async () => {
        try {
            const { data, error } = await supabase
                .from('customer_products')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map(product => ({
                id: product.id,
                customerId: product.customer_id,
                name: product.name,
                unit: product.unit,
                price: Number(product.price),
                createdAt: product.created_at
            }));
        } catch (error) {
            console.error('Error fetching all products:', error);
            return [];
        }
    },

    // Get products for a specific customer
    getProductsByCustomerId: async (customerId) => {
        try {
            const { data, error } = await supabase
                .from('customer_products')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map(product => ({
                id: product.id,
                customerId: product.customer_id,
                name: product.name,
                unit: product.unit,
                price: Number(product.price),
                createdAt: product.created_at
            }));
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    },

    // Create a new product for a customer
    createProduct: async (productData) => {
        try {
            const dbData = {
                customer_id: productData.customerId,
                name: productData.name,
                unit: productData.unit,
                price: productData.price
            };

            const { data, error } = await supabase
                .from('customer_products')
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                customerId: data.customer_id,
                name: data.name,
                unit: data.unit,
                price: Number(data.price),
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error creating product:', error);
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
                .from('customer_products')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                customerId: data.customer_id,
                name: data.name,
                unit: data.unit,
                price: Number(data.price),
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    // Delete a product
    deleteProduct: async (id) => {
        try {
            const { error } = await supabase
                .from('customer_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            return false;
        }
    }
};
