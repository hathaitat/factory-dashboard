import { supabase } from './supabaseClient';

export const supplierPoService = {
    // Get all supplier POs
    getSupplierPos: async () => {
        try {
            const { data, error } = await supabase
                .from('supplier_pos')
                .select(`
                    *,
                    suppliers (id, code, name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching supplier POs:', error);
            throw error;
        }
    },

    // Get supplier PO by ID
    getSupplierPoById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('supplier_pos')
                .select(`
                    *,
                    suppliers (*),
                    supplier_po_items (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Sort items by item_no
            if (data && data.supplier_po_items) {
                data.supplier_po_items.sort((a, b) => a.item_no - b.item_no);
            }

            return data;
        } catch (error) {
            console.error('Error fetching supplier PO:', error);
            throw error;
        }
    },

    // Create supplier PO
    createSupplierPo: async (poData) => {
        try {
            const { items, ...poDetails } = poData;

            // Ensure we have a PO number
            if (!poDetails.po_number) {
                // Auto generate if empty
                const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
                const countRes = await supabase.from('supplier_pos').select('*', { count: 'exact', head: true });
                const count = (countRes.count || 0) + 1;
                poDetails.po_number = `VPO${datePrefix}${String(count).padStart(3, '0')}`;
            }

            const { data: poResult, error: poError } = await supabase
                .from('supplier_pos')
                .insert([poDetails])
                .select()
                .single();

            if (poError) throw poError;

            if (items && items.length > 0) {
                const itemsToInsert = items.map((item, index) => ({
                    ...item,
                    po_id: poResult.id,
                    item_no: index + 1
                }));

                const { error: itemsError } = await supabase
                    .from('supplier_po_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            return poResult;
        } catch (error) {
            console.error('Error creating supplier PO:', error);
            throw error;
        }
    },

    // Update supplier PO
    updateSupplierPo: async (id, poData) => {
        try {
            const { items, ...poDetails } = poData;
            poDetails.updated_at = new Date().toISOString();

            const { data: poResult, error: poError } = await supabase
                .from('supplier_pos')
                .update(poDetails)
                .eq('id', id)
                .select()
                .single();

            if (poError) throw poError;

            if (items) {
                // Delete existing items
                await supabase
                    .from('supplier_po_items')
                    .delete()
                    .eq('po_id', id);

                // Insert new items
                if (items.length > 0) {
                    const itemsToInsert = items.map((item, index) => ({
                        ...item,
                        po_id: id,
                        item_no: index + 1
                    }));

                    const { error: itemsError } = await supabase
                        .from('supplier_po_items')
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                }
            }

            return poResult;
        } catch (error) {
            console.error('Error updating supplier PO:', error);
            throw error;
        }
    },

    // Delete supplier PO
    deleteSupplierPo: async (id) => {
        try {
            const { error } = await supabase
                .from('supplier_pos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting supplier PO:', error);
            throw error;
        }
    },

    // Update status
    updateStatus: async (id, status) => {
        try {
            // First get the PO with its items to know what to receive
            const { data: po, error: poError } = await supabase
                .from('supplier_pos')
                .select('*, items:supplier_po_items(*)')
                .eq('id', id)
                .single();

            if (poError) throw poError;

            // Only add to inventory if moving to completed and wasn't completed before
            const isNewlyCompleted = status === 'completed' && po.status !== 'completed';

            // Update the status
            const { data, error } = await supabase
                .from('supplier_pos')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Automation: Add items to warehouse inventory
            if (isNewlyCompleted && po.delivery_warehouse_id && po.items && po.items.length > 0) {
                // Fetch current inventory for this warehouse to see if items exist
                const { data: currentInventory } = await supabase
                    .from('warehouse_inventory')
                    .select('*')
                    .eq('warehouse_id', po.delivery_warehouse_id);

                for (const item of po.items) {
                    // Try to find if this item already exists in the warehouse
                    const existingItem = (currentInventory || []).find(inv => 
                        inv.product_name === item.description
                    );

                    if (existingItem) {
                        // Update quantity
                        await supabase
                            .from('warehouse_inventory')
                            .update({
                                quantity: Number(existingItem.quantity) + Number(item.quantity),
                                last_updated: new Date().toISOString()
                            })
                            .eq('id', existingItem.id);
                    } else {
                        // Insert new inventory item
                        await supabase
                            .from('warehouse_inventory')
                            .insert([{
                                warehouse_id: po.delivery_warehouse_id,
                                product_type: 'material', // Assuming PO items are materials
                                product_name: item.description || 'Unknown Item',
                                sku: null,
                                quantity: Number(item.quantity) || 0,
                                unit: item.unit || 'PCS',
                                min_stock: 0
                            }]);
                    }
                }
            }

            return data;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    }
};
