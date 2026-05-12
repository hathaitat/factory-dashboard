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

    // === Inventory Logs & Tracking ===

    getInventoryLogs: async (inventoryId) => {
        try {
            const { data, error } = await supabase
                .from('inventory_logs')
                .select('*')
                .eq('inventory_id', inventoryId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory logs:', error);
            return [];
        }
    },

    getAllInventoryLogs: async (days = 90) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('inventory_logs')
                .select(`
                    *,
                    inventory:warehouse_inventory(
                        product_name,
                        warehouse:warehouses(name)
                    )
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(log => ({
                ...log,
                productName: log.inventory?.product_name || 'ไม่ระบุ',
                warehouseName: log.inventory?.warehouse?.name || 'ไม่ระบุ',
                date: log.created_at
            }));
        } catch (error) {
            console.error('Error fetching all inventory logs:', error);
            return [];
        }
    },

    logMovement: async (logData) => {
        try {
            console.log('Logging movement for:', logData.inventory_id);
            const { error } = await supabase
                .from('inventory_logs')
                .insert([{
                    inventory_id: logData.inventory_id,
                    type: logData.action || logData.type || 'ADJUST',
                    qty: logData.quantity_change || logData.quantity || logData.qty,
                    remark: logData.remark || ''
                }]);

            if (error) {
                console.error('Insert Error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Critical logMovement error:', error);
            throw error;
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

            // Log the initial addition
            await warehouseService.logMovement({
                inventory_id: data.id,
                action: 'IN',
                quantity_change: data.quantity,
                previous_quantity: 0,
                new_quantity: data.quantity,
                source_type: 'manual',
                remark: 'เพิ่มรายการสินค้าใหม่เข้าระบบ'
            });

            return data;
        } catch (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }
    },

    updateInventoryItem: async (id, inventoryData) => {
        try {
            // Get previous quantity for logging
            const { data: prevItem } = await supabase
                .from('warehouse_inventory')
                .select('quantity')
                .eq('id', id)
                .single();

            inventoryData.last_updated = new Date().toISOString();
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .update(inventoryData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Log the change if quantity was updated
            if (prevItem && Number(prevItem.quantity) !== Number(data.quantity)) {
                const diff = Number(data.quantity) - Number(prevItem.quantity);
                await warehouseService.logMovement({
                    inventory_id: data.id,
                    action: diff > 0 ? 'IN' : 'OUT',
                    quantity_change: Math.abs(diff),
                    previous_quantity: prevItem.quantity,
                    new_quantity: data.quantity,
                    source_type: 'manual',
                    remark: 'ปรับปรุงข้อมูลสินค้า (Manual Update)'
                });
            }

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
    },

    getInventoryItemById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .select(`
                    *,
                    warehouse:warehouses(name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory item:', error);
            return null;
        }
    }
};
