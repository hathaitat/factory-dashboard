import { supabase } from './supabaseClient';

export const warehouseService = {
    // === Warehouse Management ===

    getWarehouses: async () => {
        try {
            const { data, error } = await supabase
                .from('warehouses')
                .select(`
                    *,
                    supplier:suppliers(name)
                `)
                .order('is_default', { ascending: false })
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            return [];
        }
    },

    getWarehouseById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('warehouses')
                .select(`
                    *,
                    supplier:suppliers(name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching warehouse details:', error);
            return null;
        }
    },

    createWarehouse: async (warehouseData) => {
        try {
            const { data, error } = await supabase
                .from('warehouses')
                .insert([warehouseData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating warehouse:', error);
            throw error;
        }
    },

    updateWarehouse: async (id, warehouseData) => {
        try {
            warehouseData.updated_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('warehouses')
                .update(warehouseData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating warehouse:', error);
            throw error;
        }
    },

    deleteWarehouse: async (id) => {
        try {
            // Check if it's the default warehouse
            const { data: wh } = await supabase.from('warehouses').select('is_default').eq('id', id).single();
            if (wh?.is_default) {
                throw new Error('ไม่สามารถลบคลังหลักได้');
            }

            const { error } = await supabase
                .from('warehouses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            throw error;
        }
    },

    // === Inventory Management ===

    getInventoryByWarehouse: async (warehouseId) => {
        try {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .select('*')
                .eq('warehouse_id', warehouseId)
                .order('product_type', { ascending: true })
                .order('product_name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return [];
        }
    },

    addInventoryItem: async (inventoryData) => {
        try {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .insert([inventoryData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }
    },

    updateInventoryItem: async (id, inventoryData) => {
        try {
            inventoryData.last_updated = new Date().toISOString();
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .update(inventoryData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating inventory item:', error);
            throw error;
        }
    },

    deleteInventoryItem: async (id) => {
        try {
            const { error } = await supabase
                .from('warehouse_inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    }
};
