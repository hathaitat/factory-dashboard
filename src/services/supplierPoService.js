import { supabase } from './supabaseClient';

export const supplierPoService = {
    // Get all supplier POs
    getSupplierPos: async () => {
        try {
            const { data, error } = await supabase
                .from('supplier_pos')
                .select(`
                    *,
                    suppliers (id, code, name),
                    warehouses (name),
                    supplier_po_items (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching supplier POs:', error);
            throw error;
        }
    },

    // Upload a file to storage
    uploadFile: async (file, filePath) => {
        try {
            // Using 'certificates' bucket which we know exists in this project
            const bucketName = 'certificates';
            
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (error) throw error;
            
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return {
                data,
                publicUrl: urlData.publicUrl
            };
        } catch (error) {
            console.error('Error uploading file:', error);
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
                const { data: lastPo } = await supabase
                    .from('supplier_pos')
                    .select('po_number')
                    .like('po_number', `VPO${datePrefix}%`)
                    .order('po_number', { ascending: false })
                    .limit(1)
                    .single();
                
                let nextCount = 1;
                if (lastPo && lastPo.po_number) {
                    const lastNumberStr = lastPo.po_number.slice(-3); // Get last 3 digits
                    const lastNumber = parseInt(lastNumberStr, 10);
                    if (!isNaN(lastNumber)) {
                        nextCount = lastNumber + 1;
                    }
                }
                
                poDetails.po_number = `VPO${datePrefix}${String(nextCount).padStart(3, '0')}`;
            }

            // Calculate total received quantity
            const totalReceivedQuantity = items ? items.reduce((sum, item) => sum + (Number(item.received_quantity) || 0), 0) : 0;
            poDetails.total_received_quantity = totalReceivedQuantity;

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

                // Automation: Add items to warehouse inventory if created as Completed
                if (poDetails.status === 'Completed') {
                    let targetWarehouseId = poDetails.delivery_warehouse_id || poResult.delivery_warehouse_id;

                    if (!targetWarehouseId) {
                        const { data: defaultWarehouse } = await supabase
                            .from('warehouses')
                            .select('id')
                            .eq('is_default', true)
                            .single();
                        if (defaultWarehouse) targetWarehouseId = defaultWarehouse.id;
                    }

                    if (targetWarehouseId) {
                        const { data: currentInventory } = await supabase
                            .from('warehouse_inventory')
                            .select('*')
                            .eq('warehouse_id', targetWarehouseId);
                        
                        for (const item of items) {
                            const rcvQty = item.received_quantity !== undefined ? Number(item.received_quantity) : Number(item.quantity);
                            if (rcvQty <= 0) continue;
                            
                            const existingItem = (currentInventory || []).find(inv => inv.product_name === item.description);

                            if (existingItem) {
                                const newQty = Number(existingItem.quantity) + rcvQty;
                                await supabase
                                    .from('warehouse_inventory')
                                    .update({ quantity: newQty, last_updated: new Date().toISOString() })
                                    .eq('id', existingItem.id);
                                
                                await supabase.from('inventory_logs').insert([{
                                    inventory_id: existingItem.id,
                                    type: 'IN',
                                    qty: rcvQty,
                                    old_quantity: existingItem.quantity,
                                    balance: newQty,
                                    source_type: 'po',
                                    source_id: poResult.id,
                                    reference_no: poDetails.po_number || poResult.id,
                                    remark: `รับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || poResult.id}`
                                }]);
                            } else {
                                const { data: newItem } = await supabase
                                    .from('warehouse_inventory')
                                    .insert([{
                                        warehouse_id: targetWarehouseId,
                                        product_type: 'material',
                                        product_name: item.description || 'Unknown Item',
                                        quantity: rcvQty,
                                        unit: item.unit || 'PCS',
                                        min_stock: 0
                                    }])
                                    .select()
                                    .single();
                                
                                if (newItem) {
                                    await supabase.from('inventory_logs').insert([{
                                        inventory_id: newItem.id,
                                        type: 'IN',
                                        qty: rcvQty,
                                        old_quantity: 0,
                                        balance: rcvQty,
                                        source_type: 'po',
                                        source_id: poResult.id,
                                        reference_no: poDetails.po_number || poResult.id,
                                        remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || poResult.id}`
                                    }]);
                                }
                            }
                        }
                    }
                }
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

            // Get the old PO to check previous status and previous items for inventory diff calculation
            const { data: oldPo } = await supabase
                .from('supplier_pos')
                .select('*, items:supplier_po_items(*)')
                .eq('id', id)
                .single();

            // Calculate total received quantity
            const totalReceivedQuantity = items ? items.reduce((sum, item) => sum + (Number(item.received_quantity) || 0), 0) : 0;
            poDetails.total_received_quantity = totalReceivedQuantity;

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
                    
                    // Automation: Add NEWLY received items to warehouse inventory
                    if (poDetails.status === 'Completed' || poDetails.status === 'Partial') {
                        let targetWarehouseId = poDetails.delivery_warehouse_id || poResult.delivery_warehouse_id;

                        if (!targetWarehouseId) {
                            const { data: defaultWarehouse } = await supabase
                                .from('warehouses')
                                .select('id')
                                .eq('is_default', true)
                                .single();
                            if (defaultWarehouse) targetWarehouseId = defaultWarehouse.id;
                        }

                        if (targetWarehouseId) {
                            const { data: currentInventory } = await supabase
                                .from('warehouse_inventory')
                                .select('*')
                                .eq('warehouse_id', targetWarehouseId);
                            
                            for (const item of items) {
                                const newRcvQty = item.received_quantity !== undefined ? Number(item.received_quantity) : 0;
                                
                                // Find old received quantity
                                const oldItem = (oldPo?.items || []).find(old => old.description === item.description);
                                const oldRcvQty = oldItem && oldItem.received_quantity !== undefined ? Number(oldItem.received_quantity) : 0;
                                
                                const diffRcvQty = newRcvQty - oldRcvQty;
                                
                                if (diffRcvQty <= 0) continue; // Skip if no new goods received
                                
                                const existingItem = (currentInventory || []).find(inv => inv.product_name === item.description);

                                if (existingItem) {
                                    const newQty = Number(existingItem.quantity) + diffRcvQty;
                                    await supabase
                                        .from('warehouse_inventory')
                                        .update({ quantity: newQty, last_updated: new Date().toISOString() })
                                        .eq('id', existingItem.id);
                                    
                                    await supabase.from('inventory_logs').insert([{
                                        inventory_id: existingItem.id,
                                        type: 'IN',
                                        qty: diffRcvQty,
                                        old_quantity: existingItem.quantity,
                                        balance: newQty,
                                        source_type: 'po',
                                        source_id: id,
                                        reference_no: poDetails.po_number || id,
                                        remark: `รับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || id} (เพิ่มเติม)`
                                    }]);
                                } else {
                                    const { data: newItem } = await supabase
                                        .from('warehouse_inventory')
                                        .insert([{
                                            warehouse_id: targetWarehouseId,
                                            product_type: 'material',
                                            product_name: item.description || 'Unknown Item',
                                            quantity: diffRcvQty,
                                            unit: item.unit || 'PCS',
                                            min_stock: 0
                                        }])
                                        .select()
                                        .single();
                                    
                                    if (newItem) {
                                        await supabase.from('inventory_logs').insert([{
                                            inventory_id: newItem.id,
                                            type: 'IN',
                                            qty: diffRcvQty,
                                            old_quantity: 0,
                                            balance: diffRcvQty,
                                            source_type: 'po',
                                            source_id: id,
                                            reference_no: poDetails.po_number || id,
                                            remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || id}`
                                        }]);
                                    }
                                }
                            }
                        }
                    }
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
            // Check if it's completed first
            const { data: po } = await supabase
                .from('supplier_pos')
                .select('status')
                .eq('id', id)
                .single();

            if (po?.status === 'Completed') {
                throw new Error('ไม่สามารถลบใบสั่งซื้อที่รับสินค้าเข้าคลังแล้วได้ กรุณาใช้การยกเลิกแทน');
            }

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

    // Cancel supplier PO with inventory check
    cancelSupplierPo: async (id) => {
        try {
            // 1. Get PO details and items
            const { data: po, error: poError } = await supabase
                .from('supplier_pos')
                .select('*, items:supplier_po_items(*)')
                .eq('id', id)
                .single();

            if (poError) throw poError;
            if (po.status === 'Cancelled') throw new Error('ใบสั่งซื้อนี้ถูกยกเลิกไปแล้ว');

            // 2. If it has received items (status is Completed or Partial), check if we have enough stock to return
            const hasReceivedItems = (po.status === 'Completed' || po.status === 'Partial') && po.items && po.items.length > 0;
            if (hasReceivedItems) {
                const targetWarehouseId = po.delivery_warehouse_id;
                if (!targetWarehouseId) throw new Error('ไม่พบข้อมูลคลังสินค้าที่จัดส่ง');

                // Get current inventory
                const { data: currentInventory } = await supabase
                    .from('warehouse_inventory')
                    .select('*')
                    .eq('warehouse_id', targetWarehouseId);

                // Filter items that have actually been received (> 0)
                const itemsToDeduct = po.items.filter(item => Number(item.received_quantity || 0) > 0);

                if (itemsToDeduct.length > 0) {
                    // Validation Loop
                    for (const item of itemsToDeduct) {
                        const existingItem = (currentInventory || []).find(inv => 
                            inv.product_name === item.description
                        );

                        const qtyToDeduct = Number(item.received_quantity || 0);

                        if (!existingItem || Number(existingItem.quantity) < qtyToDeduct) {
                            throw new Error(`สต็อกสินค้า "${item.description}" ไม่เพียงพอสำหรับการยกเลิก (ต้องการหักออก ${qtyToDeduct} แต่มีในคลัง ${existingItem?.quantity || 0})`);
                        }
                    }

                    // Deduction Loop
                    for (const item of itemsToDeduct) {
                        const existingItem = currentInventory.find(inv => inv.product_name === item.description);
                        const qtyToDeduct = Number(item.received_quantity || 0);
                        const newQty = Number(existingItem.quantity) - qtyToDeduct;
                        const { error: updateError } = await supabase
                            .from('warehouse_inventory')
                            .update({
                                quantity: newQty,
                                last_updated: new Date().toISOString()
                            })
                            .eq('id', existingItem.id);
                            
                        if (updateError) throw updateError;

                        // Log the cancellation movement
                        await supabase.from('inventory_logs').insert([{
                            inventory_id: existingItem.id,
                            type: 'OUT',
                            qty: qtyToDeduct,
                            old_quantity: existingItem.quantity,
                            balance: newQty,
                            source_type: 'po',
                            source_id: id,
                            reference_no: po.po_number || 'N/A',
                            remark: `หักสต็อกออกเนื่องจากการยกเลิกใบสั่งซื้อเลขที่ ${po.po_number || id}`
                        }]);
                    }
                }
            }

            // 3. Update PO status to Cancelled
            const { data, error: finalError } = await supabase
                .from('supplier_pos')
                .update({ 
                    status: 'Cancelled',
                    updated_at: new Date().toISOString(),
                    remark: (po.remark ? po.remark + ' ' : '') + `(ยกเลิกเมื่อ ${new Date().toLocaleDateString('th-TH')})`
                })
                .eq('id', id)
                .select()
                .single();

            if (finalError) throw finalError;
            return data;
        } catch (error) {
            console.error('Error cancelling supplier PO:', error);
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
            // Note: DB and Frontend use 'Completed' (Uppercase)
            const isNewlyCompleted = status === 'Completed' && po.status !== 'Completed';

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
            if (isNewlyCompleted && po.items && po.items.length > 0) {
                let targetWarehouseId = po.delivery_warehouse_id;

                // Fallback to default warehouse if none specified
                if (!targetWarehouseId) {
                    const { data: defaultWarehouse } = await supabase
                        .from('warehouses')
                        .select('id')
                        .eq('is_default', true)
                        .single();
                    
                    if (defaultWarehouse) {
                        targetWarehouseId = defaultWarehouse.id;
                    }
                }

                if (targetWarehouseId) {
                    const { data: currentInventory, error: invFetchError } = await supabase
                        .from('warehouse_inventory')
                        .select('*')
                        .eq('warehouse_id', targetWarehouseId);
                    
                    if (invFetchError) throw invFetchError;

                    for (const item of po.items) {
                        const existingItem = (currentInventory || []).find(inv => 
                            inv.product_name === item.description
                        );

                        if (existingItem) {
                            const newQty = Number(existingItem.quantity) + Number(item.quantity);
                            const { error: updateError } = await supabase
                                .from('warehouse_inventory')
                                .update({
                                    quantity: newQty,
                                    last_updated: new Date().toISOString()
                                })
                                .eq('id', existingItem.id);
                            
                            if (updateError) throw updateError;
                            
                            // Log the movement
                            const { error: logError } = await supabase.from('inventory_logs').insert([{
                                inventory_id: existingItem.id,
                                type: 'IN',
                                qty: item.quantity,
                                old_quantity: existingItem.quantity,
                                balance: newQty,
                                source_type: 'po',
                                source_id: id,
                                reference_no: po.po_number || 'N/A',
                                remark: `รับสินค้าจากใบสั่งซื้อเลขที่ ${po.po_number || id}`
                            }]);

                            if (logError) {
                                console.error('Error inserting log:', logError);
                                // Try inserting minimal if it failed
                                const { error: retryError } = await supabase.from('inventory_logs').insert([{
                                    inventory_id: existingItem.id,
                                    type: 'IN',
                                    qty: item.quantity,
                                    remark: `รับสินค้า (Retry): ${po.po_number || id}`
                                }]);
                                if (retryError) throw retryError;
                            }
                        } else {
                            const { data: newItem, error: insertError } = await supabase
                                .from('warehouse_inventory')
                                .insert([{
                                    warehouse_id: targetWarehouseId,
                                    product_type: 'material',
                                    product_name: item.description || 'Unknown Item',
                                    quantity: Number(item.quantity) || 0,
                                    unit: item.unit || 'PCS',
                                    min_stock: 0
                                }])
                                .select()
                                .single();
                            
                            if (insertError) throw insertError;
                            
                            if (newItem) {
                                // Log the initial movement
                                const { error: logError } = await supabase.from('inventory_logs').insert([{
                                    inventory_id: newItem.id,
                                    type: 'IN',
                                    qty: item.quantity,
                                    old_quantity: 0,
                                    balance: item.quantity,
                                    source_type: 'po',
                                    source_id: id,
                                    reference_no: po.po_number || 'N/A',
                                    remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${po.po_number || id}`
                                }]);

                                if (logError) throw logError;
                            }
                        }
                    }
                }
            }


            return data;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    },
    
    // Get all pending items (Draft or Partial) across all POs
    getPendingItems: async () => {
        try {
            const { data, error } = await supabase
                .from('supplier_po_items')
                .select('*, supplier_pos!inner(status)')
                .in('supplier_pos.status', ['Draft', 'Partial']);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching pending items:', error);
            throw error;
        }
    }
};
