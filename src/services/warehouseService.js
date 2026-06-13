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

            const { error: rpcError } = await supabase.rpc('transfer_warehouse_inventory', {
                p_source_id: id,
                p_target_id: targetWarehouseId || null,
                p_performed_by: 'System'
            });

            if (rpcError) throw rpcError;
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
            const { error } = await supabase
                .from('inventory_logs')
                .insert([{
                    inventory_id: logData.inventory_id,
                    type: logData.type ?? logData.action ?? 'ADJUST',
                    qty: logData.qty ?? logData.quantity_change ?? logData.quantity ?? 0,
                    old_quantity: logData.old_quantity ?? logData.previous_quantity ?? 0,
                    balance: logData.balance ?? logData.new_quantity ?? 0,
                    source_type: logData.source_type || 'manual',
                    source_id: logData.source_id || null,
                    reference_no: logData.reference_no || '',
                    remark: logData.remark || '',
                    performed_by: logData.performed_by || ''
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

    adjustStock: async (id, type, qty, remark, performedBy, sourceType = 'manual', sourceId = null, referenceNo = null) => {
        try {
            const change = Number(qty);
            const delta = type === 'IN' ? change : -change;

            // Use RPC for atomic update to prevent race conditions
            const { data, error: rpcError } = await supabase.rpc('adjust_warehouse_stock', {
                p_id: id,
                p_delta: delta,
                p_updated_by: performedBy || null
            });
            
            if (rpcError) {
                console.error('RPC Error adjusting stock:', rpcError);
                throw rpcError;
            }

            if (!data || data.length === 0) {
                throw new Error('ไม่พบข้อมูลสินค้านี้ในระบบ');
            }

            const { old_quantity, new_quantity } = data[0];

            // Log movement
            await warehouseService.logMovement({
                inventory_id: id,
                type: type,
                qty: change,
                old_quantity: old_quantity,
                balance: new_quantity,
                remark: remark,
                performed_by: performedBy,
                source_type: sourceType,
                source_id: sourceId,
                reference_no: referenceNo
            });

            return { id, quantity: new_quantity };
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

    updateInventoryItem: async (id, inventoryData, performedBy = 'System') => {
        try {
            const { data, error } = await supabase.rpc('update_warehouse_inventory_with_log', {
                p_id: id,
                p_inventory_data: inventoryData,
                p_performed_by: performedBy
            });

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
            const { data, error } = await supabase.rpc('batch_deduct_warehouse_stock', {
                p_warehouse_id: warehouseId,
                p_items: items,
                p_performed_by: performedBy || 'System',
                p_invoice_no: invoiceNo || ''
            });

            if (error) throw error;
            return { success: true, warnings: data.warnings || [] };
        } catch (error) {
            console.error('Error deducting stock for invoice:', error);
            throw error;
        }
    },

    returnStockForInvoice: async (warehouseId, items, performedBy, invoiceNo) => {
        try {
            const { data, error } = await supabase.rpc('batch_return_warehouse_stock', {
                p_warehouse_id: warehouseId,
                p_items: items,
                p_performed_by: performedBy || 'System',
                p_invoice_no: invoiceNo || ''
            });

            if (error) throw error;
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
