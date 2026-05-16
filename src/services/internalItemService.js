import { supabase } from './supabaseClient';

export const internalItemService = {
    // === Categories ===

    getCategories: async () => {
        try {
            const { data, error } = await supabase
                .from('internal_categories')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching internal categories:', error);
            return [];
        }
    },

    createCategory: async (categoryData) => {
        try {
            const { data, error } = await supabase
                .from('internal_categories')
                .insert([categoryData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    },

    updateCategory: async (id, categoryData) => {
        try {
            const { data, error } = await supabase
                .from('internal_categories')
                .update(categoryData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    },

    deleteCategory: async (id) => {
        try {
            // Check if any items are using this category
            const { data: items } = await supabase
                .from('internal_items')
                .select('id')
                .eq('category_id', id)
                .limit(1);

            if (items && items.length > 0) {
                throw new Error('ไม่สามารถลบหมวดหมู่ที่มีสินค้าอยู่ได้ กรุณาย้ายสินค้าออกก่อน');
            }

            const { error } = await supabase
                .from('internal_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    },

    // === Items ===

    getItems: async () => {
        try {
            const { data, error } = await supabase
                .from('internal_items')
                .select(`
                    *,
                    category:internal_categories(id, name, icon, color)
                `)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching internal items:', error);
            return [];
        }
    },

    getItemById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('internal_items')
                .select(`
                    *,
                    category:internal_categories(id, name, icon, color)
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching internal item:', error);
            return null;
        }
    },

    getItemsByCategory: async (categoryId) => {
        try {
            const { data, error } = await supabase
                .from('internal_items')
                .select(`
                    *,
                    category:internal_categories(id, name, icon, color)
                `)
                .eq('category_id', categoryId)
                .eq('status', 'active')
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching items by category:', error);
            return [];
        }
    },

    createItem: async (itemData) => {
        try {
            const { data, error } = await supabase
                .from('internal_items')
                .insert([itemData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating internal item:', error);
            throw error;
        }
    },

    updateItem: async (id, itemData) => {
        try {
            itemData.updated_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('internal_items')
                .update(itemData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating internal item:', error);
            throw error;
        }
    },

    deleteItem: async (id) => {
        try {
            // Check if item is referenced in any requisition
            const { data: refs } = await supabase
                .from('internal_requisition_items')
                .select('id')
                .eq('item_id', id)
                .limit(1);

            if (refs && refs.length > 0) {
                throw new Error('ไม่สามารถลบสินค้าที่มีประวัติการเบิก/สั่งซื้อได้');
            }

            const { error } = await supabase
                .from('internal_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting internal item:', error);
            throw error;
        }
    },

    adjustStock: async (id, quantityChange) => {
        try {
            const { data: item } = await supabase
                .from('internal_items')
                .select('current_stock')
                .eq('id', id)
                .single();

            if (!item) throw new Error('ไม่พบสินค้า');

            const newStock = item.current_stock + quantityChange;
            if (newStock < 0) throw new Error('สต๊อกไม่เพียงพอ');

            const { data, error } = await supabase
                .from('internal_items')
                .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adjusting stock:', error);
            throw error;
        }
    },

    getLowStockItems: async () => {
        try {
            const { data, error } = await supabase
                .from('internal_items')
                .select(`
                    *,
                    category:internal_categories(id, name, icon, color)
                `)
                .eq('status', 'active')
                .filter('current_stock', 'lte', 'min_stock');

            // Supabase doesn't support column-to-column filter easily
            // Fetch all and filter client-side
            const { data: allItems, error: err2 } = await supabase
                .from('internal_items')
                .select(`
                    *,
                    category:internal_categories(id, name, icon, color)
                `)
                .eq('status', 'active');

            if (err2) throw err2;
            return (allItems || []).filter(item => item.current_stock <= item.min_stock && item.min_stock > 0);
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            return [];
        }
    }
};
