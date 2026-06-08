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

    deleteWarehouseAndTransfer: async (id, targetWarehouseId) => {
        try {
            // Check if it's the default warehouse
            const { data: wh } = await supabase.from('warehouses').select('is_default').eq('id', id).single();
            if (wh?.is_default) {
                throw new Error('ไม่สามารถลบคลังหลักได้');
            }

            // 1. Get all inventory in the warehouse to delete
            const { data: sourceInventory, error: fetchSourceErr } = await supabase
                .from('warehouse_inventory')
                .select('*')
                .eq('warehouse_id', id);
            
            if (fetchSourceErr) throw fetchSourceErr;

            if (sourceInventory && sourceInventory.length > 0) {
                // 2. Get all inventory in target warehouse to check duplicates
                const { data: targetInventory, error: fetchTargetErr } = await supabase
                    .from('warehouse_inventory')
                    .select('*')
                    .eq('warehouse_id', targetWarehouseId);
                
                if (fetchTargetErr) throw fetchTargetErr;

                for (const item of sourceInventory) {
                    const match = targetInventory.find(t => 
                        (item.sku && t.sku === item.sku) || 
                        (!item.sku && t.product_name === item.product_name)
                    );

                    if (match) {
                        // Duplicate item: add quantity to target, delete source item
                        const newQty = Number(match.quantity) + Number(item.quantity);
                        
                        // Update target item
                        const { error: updateTargetErr } = await supabase
                            .from('warehouse_inventory')
                            .update({ quantity: newQty, last_updated: new Date().toISOString() })
                            .eq('id', match.id);
                        
                        if (updateTargetErr) throw updateTargetErr;

                        // Log movement in target item
                        if (Number(item.quantity) !== 0) {
                            await warehouseService.logMovement({
                                inventory_id: match.id,
                                action: 'IN',
                                quantity_change: Math.abs(Number(item.quantity)),
                                previous_quantity: match.quantity,
                                new_quantity: newQty,
                                source_type: 'warehouse_transfer',
                                remark: `รับโอนสินค้าจากคลังที่ถูกลบ`
                            });
                        }

                        // Delete source item
                        const { error: deleteSourceErr } = await supabase
                            .from('warehouse_inventory')
                            .delete()
                            .eq('id', item.id);
                        
                        if (deleteSourceErr) throw deleteSourceErr;
                    } else {
                        // Non-duplicate item: simply change warehouse_id to target
                        const { error: transferErr } = await supabase
                            .from('warehouse_inventory')
                            .update({ warehouse_id: targetWarehouseId, last_updated: new Date().toISOString() })
                            .eq('id', item.id);
                        
                        if (transferErr) throw transferErr;

                        // Log movement for transfer
                        if (Number(item.quantity) !== 0) {
                            await warehouseService.logMovement({
                                inventory_id: item.id,
                                action: 'IN',
                                quantity_change: 0,
                                previous_quantity: item.quantity,
                                new_quantity: item.quantity,
                                source_type: 'warehouse_transfer',
                                remark: `โอนย้ายคลังสินค้า (เปลี่ยนคลังเนื่องจากคลังเดิมถูกลบ)`
                            });
                        }
                    }
                }
            }

            // 3. Delete the warehouse
            const { error: deleteWhErr } = await supabase
                .from('warehouses')
                .delete()
                .eq('id', id);

            if (deleteWhErr) throw deleteWhErr;
            return true;
        } catch (error) {
            console.error('Error deleting and transferring warehouse:', error);
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
                .order('last_updated', { ascending: false, nullsFirst: false })
                .order('product_name', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return [];
        }
    },

    getNegativeInventory: async () => {
        try {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .select(`
                    *,
                    warehouse:warehouses(name)
                `)
                .lt('quantity', 0)
                .order('quantity', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching negative inventory:', error);
            return [];
        }
    },

    // === Inventory BOM Rules ===

    getInventoryBomRules: async (inventoryId) => {
        try {
            const { data, error } = await supabase
                .from('inventory_bom_rules')
                .select(`
                    *,
                    supplier_products(name, unit)
                `)
                .eq('inventory_id', inventoryId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory BOM rules:', error);
            return [];
        }
    },

    getAllInventoryBomRules: async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_bom_rules')
                .select('*');
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching all BOM rules:', error);
            return [];
        }
    },

    saveInventoryBomRule: async (inventoryId, supplierProductId, rawQty, finishedQty) => {
        try {
            const payload = {
                inventory_id: inventoryId,
                supplier_product_id: supplierProductId,
                raw_material_qty: rawQty,
                finished_product_qty: finishedQty,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('inventory_bom_rules')
                .upsert(payload, { onConflict: 'inventory_id,supplier_product_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving inventory BOM rule:', error);
            throw error;
        }
    },
    
    deleteInventoryBomRule: async (id) => {
        try {
            const { error } = await supabase
                .from('inventory_bom_rules')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting inventory BOM rule:', error);
            throw error;
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
                        warehouse:warehouses(name, code)
                    )
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(log => ({
                ...log,
                productName: log.inventory?.product_name || 'ไม่ระบุ',
                warehouseName: log.inventory?.warehouse ? `${log.inventory.warehouse.code ? `[${log.inventory.warehouse.code}] ` : ''}${log.inventory.warehouse.name}` : 'ไม่ระบุ',
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
                    old_quantity: logData.previous_quantity || 0,
                    balance: logData.new_quantity || 0,
                    source_type: logData.source_type || 'manual',
                    source_id: logData.source_id || null,
                    reference_no: logData.reference_no || '',
                    remark: logData.remark || '',
                    performed_by: logData.performed_by || ''
                }]);

            if (error) {
                // Fallback to remark if performed_by column doesn't exist
                if (error.code === 'PGRST204' || error.message?.includes('column "performed_by" of relation "inventory_logs" does not exist')) {
                    console.warn('performed_by column missing, falling back to remark');
                    await supabase
                        .from('inventory_logs')
                        .insert([{
                            inventory_id: logData.inventory_id,
                            type: logData.action || logData.type || 'ADJUST',
                            qty: logData.quantity_change || logData.quantity || logData.qty,
                            old_quantity: logData.previous_quantity || 0,
                            balance: logData.new_quantity || 0,
                            source_type: logData.source_type || 'manual',
                            source_id: logData.source_id || null,
                            reference_no: logData.reference_no || '',
                            remark: `${logData.remark}${logData.performed_by ? ` (โดย ${logData.performed_by})` : ''}`
                        }]);
                    return;
                }
                console.error('Insert Error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Critical logMovement error:', error);
            throw error;
        }
    },

    adjustStock: async (id, type, qty, remark, performedBy) => {
        try {
            // Get current quantity
            const { data: item, error: fetchError } = await supabase
                .from('warehouse_inventory')
                .select('quantity')
                .eq('id', id)
                .single();
            
            if (fetchError) throw fetchError;

            const oldQty = Number(item.quantity);
            const change = Number(qty);
            const newQty = type === 'IN' ? oldQty + change : oldQty - change;



            // Update inventory
            const { data: updatedItem, error: updateError } = await supabase
                .from('warehouse_inventory')
                .update({ 
                    quantity: newQty, 
                    last_updated: new Date().toISOString(),
                    updated_by: performedBy || null
                })
                .eq('id', id)
                .select()
                .single();
            
            if (updateError) throw updateError;

            // Log movement
            await warehouseService.logMovement({
                inventory_id: id,
                action: type,
                quantity_change: change,
                previous_quantity: oldQty,
                new_quantity: newQty,
                remark: remark,
                performed_by: performedBy
            });

            return updatedItem;
        } catch (error) {
            console.error('Error adjusting stock:', error);
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
                    warehouse:warehouses(name, code)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching inventory item:', error);
            return null;
        }
    },

    // === Invoice Integration ===

    deductStockForInvoice: async (warehouseId, items, performedBy, invoiceNo) => {
        try {
            const warnings = [];
            for (const item of items) {
                // If product doesn't have SKU, try to deduct by name, otherwise skip or handle differently
                const matchColumn = item.sku ? 'sku' : 'product_name';
                const matchValue = item.sku || item.productName;

                // Find inventory item
                let { data: invItem, error: fetchError } = await supabase
                    .from('warehouse_inventory')
                    .select('*')
                    .eq('warehouse_id', warehouseId)
                    .eq(matchColumn, matchValue)
                    .single();

                if (fetchError && fetchError.code === 'PGRST116') {
                    // Item not found, auto-create it as per requirement 3.2
                    const newInv = {
                        warehouse_id: warehouseId,
                        sku: item.sku || null,
                        product_name: item.productName,
                        product_type: 'finished', // Assume finished product for invoices
                        quantity: 0,
                        unit: item.unit || 'ชิ้น',
                        min_stock: 10,
                        last_updated: new Date().toISOString()
                    };
                    
                    const { data: created, error: createError } = await supabase
                        .from('warehouse_inventory')
                        .insert([newInv])
                        .select()
                        .single();

                    if (createError) throw createError;
                    invItem = created;
                    warnings.push(`สร้างสินค้ารหัส ${item.sku || item.productName} อัตโนมัติในคลังกระจายสินค้า เนื่องจากไม่พบในระบบ`);
                } else if (fetchError) {
                    throw fetchError;
                }

                // Deduct stock
                const oldQty = Number(invItem.quantity);
                const change = Number(item.quantity);
                const newQty = oldQty - change;

                if (newQty < 0) {
                    warnings.push(`สต็อกสินค้า ${item.productName} ติดลบ (ยอดคงเหลือ: ${newQty})`);
                }

                const { error: updateError } = await supabase
                    .from('warehouse_inventory')
                    .update({ 
                        quantity: newQty, 
                        last_updated: new Date().toISOString(),
                        updated_by: performedBy || null
                    })
                    .eq('id', invItem.id);

                if (updateError) throw updateError;

                // Log movement
                await warehouseService.logMovement({
                    inventory_id: invItem.id,
                    action: 'OUT',
                    quantity_change: change,
                    previous_quantity: oldQty,
                    new_quantity: newQty,
                    source_type: 'invoice',
                    reference_no: invoiceNo || '',
                    remark: `ตัดสต็อกสำหรับใบกำกับภาษี ${invoiceNo || ''}`,
                    performed_by: performedBy
                });
            }
            return { success: true, warnings };
        } catch (error) {
            console.error('Error deducting stock for invoice:', error);
            throw error;
        }
    },

    returnStockForInvoice: async (warehouseId, items, performedBy, invoiceNo) => {
        try {
            for (const item of items) {
                const matchColumn = item.sku ? 'sku' : 'product_name';
                const matchValue = item.sku || item.productName;

                // Find inventory item
                const { data: invItem, error: fetchError } = await supabase
                    .from('warehouse_inventory')
                    .select('*')
                    .eq('warehouse_id', warehouseId)
                    .eq(matchColumn, matchValue)
                    .single();

                if (fetchError && fetchError.code === 'PGRST116') {
                    // If not found during return, we probably don't need to return it, or we could create it.
                    // Let's create it just in case, though it's weird to return something that never existed.
                    console.warn(`Product ${matchValue} not found during stock return. Skipping.`);
                    continue;
                } else if (fetchError) {
                    throw fetchError;
                }

                // Return stock
                const oldQty = Number(invItem.quantity);
                const change = Number(item.quantity);
                const newQty = oldQty + change;

                const { error: updateError } = await supabase
                    .from('warehouse_inventory')
                    .update({ 
                        quantity: newQty, 
                        last_updated: new Date().toISOString(),
                        updated_by: performedBy || null
                    })
                    .eq('id', invItem.id);

                if (updateError) throw updateError;

                // Log movement
                await warehouseService.logMovement({
                    inventory_id: invItem.id,
                    action: 'IN',
                    quantity_change: change,
                    previous_quantity: oldQty,
                    new_quantity: newQty,
                    source_type: 'invoice',
                    reference_no: invoiceNo || '',
                    remark: `คืนสต็อกเนื่องจากยกเลิกใบกำกับภาษี ${invoiceNo || ''}`,
                    performed_by: performedBy
                });
            }
            return { success: true };
        } catch (error) {
            console.error('Error returning stock for invoice:', error);
            throw error;
        }
    },

    // === Customer Product Sync ===

    ensureProductInWarehouse: async (warehouseId, sku, productName, unit) => {
        if (!warehouseId) return null;
        try {
            const matchColumn = sku ? 'sku' : 'product_name';
            const matchValue = sku || productName;

            // Check if exists
            const { data: existing, error: checkError } = await supabase
                .from('warehouse_inventory')
                .select('id')
                .eq('warehouse_id', warehouseId)
                .eq(matchColumn, matchValue)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') throw checkError;

            // If not exists, create it
            if (!existing) {
                const newInv = {
                    warehouse_id: warehouseId,
                    sku: sku || null,
                    product_name: productName,
                    product_type: 'finished', // From customer product, assume finished good
                    quantity: 0,
                    unit: unit || 'PCS',
                    min_stock: 0,
                    last_updated: new Date().toISOString()
                };
                
                const { data: created, error: createError } = await supabase
                    .from('warehouse_inventory')
                    .insert([newInv])
                    .select()
                    .single();

                if (createError) throw createError;
                return created;
            }
            return existing;
        } catch (error) {
            console.error('Error ensuring product in warehouse:', error);
            // Log as warning since this will bypass auto stock deduction
            console.warn(`[Stock Warning] Product ${sku || productName} might not have been created in warehouse ${warehouseId}. Auto stock deduction will fail silently for this product.`);
            return null; // Return null so we don't break the main flow
        }
    },

    syncProductUpdateToWarehouse: async (warehouseId, oldData, newData) => {
        if (!warehouseId) return;
        try {
            const matchColumn = oldData.sku ? 'sku' : 'product_name';
            const matchValue = oldData.sku || oldData.name;
            await supabase
                .from('warehouse_inventory')
                .update({ 
                    sku: newData.sku || null,
                    product_name: newData.name
                })
                .eq('warehouse_id', warehouseId)
                .eq(matchColumn, matchValue);
        } catch (error) {
            console.error('Error syncing product update to warehouse:', error);
        }
    },

    syncCustomerProductsToWarehouse: async (warehouseId) => {
        try {
            // 1. Fetch all customer products with customer name
            const { data: products, error: prodError } = await supabase
                .from('customer_products')
                .select(`
                    id, name, sku, unit,
                    customer:customers(name)
                `);
            
            if (prodError) throw prodError;
            if (!products || products.length === 0) return { created: [], skippedCount: 0 };

            // 2. Fetch all inventory in the target warehouse
            const { data: inventory, error: invError } = await supabase
                .from('warehouse_inventory')
                .select('sku, product_name')
                .eq('warehouse_id', warehouseId);

            if (invError) throw invError;
            const invList = inventory || [];

            const createdList = [];
            let skippedCount = 0;
            const insertPayloads = [];

            // 3. Compare and prepare inserts
            for (const prod of products) {
                // Determine if it exists in warehouse
                let exists = false;
                if (prod.sku) {
                    exists = invList.some(inv => inv.sku === prod.sku);
                } else {
                    exists = invList.some(inv => inv.product_name === prod.name);
                }

                if (exists) {
                    skippedCount++;
                } else {
                    // Avoid inserting duplicates from multiple customers in the same batch
                    const alreadyInBatch = insertPayloads.some(p => 
                        (prod.sku && p.sku === prod.sku) || 
                        (!prod.sku && p.product_name === prod.name)
                    );

                    if (!alreadyInBatch) {
                        insertPayloads.push({
                            warehouse_id: warehouseId,
                            sku: prod.sku || null,
                            product_name: prod.name,
                            product_type: 'finished',
                            quantity: 0,
                            unit: prod.unit || 'PCS',
                            min_stock: 0,
                            last_updated: new Date().toISOString()
                        });

                        createdList.push({
                            sku: prod.sku || '-',
                            productName: prod.name,
                            customerName: prod.customer?.name || 'ไม่ระบุ',
                            unit: prod.unit || 'PCS'
                        });
                    } else {
                        skippedCount++; // Skipped because it's duplicate within the new batch
                    }
                }
            }

            // 4. Insert new items
            if (insertPayloads.length > 0) {
                const { error: insertError } = await supabase
                    .from('warehouse_inventory')
                    .insert(insertPayloads);
                if (insertError) throw insertError;
            }

            return { created: createdList, skippedCount };
        } catch (error) {
            console.error('Error syncing customer products to warehouse:', error);
            throw error;
        }
    }
};
