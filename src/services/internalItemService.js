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
            const { data, error } = await supabase.rpc('adjust_internal_stock', {
                p_id: id,
                p_delta: quantityChange,
                p_allow_negative: false
            });

            if (error) {
                // If the error message from postgres matches our RAISE EXCEPTION
                if (error.message && error.message.includes('Insufficient stock')) {
                    throw new Error('สต๊อกไม่เพียงพอ');
                }
                if (error.message && error.message.includes('Item not found')) {
                    throw new Error('ไม่พบสินค้า');
                }
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('ไม่พบสินค้า');
            }

            // Return a mocked object of what the UI might expect, or fetch the full item if needed
            return { id, current_stock: data[0].new_stock };
        } catch (error) {
            console.error('Error adjusting stock:', error);
            throw error;
        }
    },

    getLowStockItems: async () => {
        try {
            const { data, error } = await supabase
                .from('view_low_stock_internal_items')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            return [];
        }
    },

    // === Item Movement Logs ===

    getItemLogs: async (itemId) => {
        try {
            const { data, error } = await supabase
                .from('internal_item_logs')
                .select('*')
                .eq('item_id', itemId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching item logs:', error);
            return [];
        }
    },

    getMonthlyIssuedValue: async () => {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            
            // Get all OUT transactions for the current month
            const { data, error } = await supabase
                .from('internal_item_logs')
                .select('qty, unit_cost')
                .eq('type', 'OUT')
                .gte('created_at', startOfMonth);
                
            if (error) throw error;
            
            // Calculate total value based on actual qty and unit_cost recorded at the time of withdrawal
            const totalValue = data.reduce((sum, log) => {
                const qty = Number(log.qty) || 0;
                const cost = Number(log.unit_cost) || 0;
                return sum + (qty * cost);
            }, 0);
            
            return totalValue;
        } catch (error) {
            console.error('Error fetching monthly issued value:', error);
            return 0;
        }
    },

    logMovement: async (logData) => {
        try {
            const { data, error } = await supabase
                .from('internal_item_logs')
                .insert([logData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error logging movement:', error);
            throw error;
        }
    },

    adjustStockWithLog: async (itemId, type, qty, unitCost, remark, performedBy, sourceType = 'manual', sourceId = null, referenceNo = null) => {
        try {
            const { error: rpcError } = await supabase.rpc('adjust_internal_stock_with_log', {
                p_id: itemId,
                p_type: type,
                p_qty: parseFloat(qty) || 0,
                p_unit_cost: parseFloat(unitCost) || 0,
                p_remark: remark,
                p_performed_by: performedBy || null,
                p_source_type: sourceType,
                p_source_id: sourceId,
                p_reference_no: referenceNo
            });

            if (rpcError) {
                if (rpcError.message && rpcError.message.includes('Insufficient stock')) {
                    throw new Error('สต๊อกไม่เพียงพอ');
                }
                throw rpcError;
            }

            // MAC (Moving Average Cost) is now calculated inside the RPC automatically
            return { success: true };
        } catch (error) {
            console.error('Error adjusting stock with log:', error);
            throw error;
        }
    }
};
