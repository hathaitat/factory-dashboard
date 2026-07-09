import { supabase } from './supabaseClient';
import { sanitizeSearchTerm } from './sanitize';
import { warehouseService } from './warehouseService';

const normalizeStr = (str) => (str || '').trim().toLowerCase();

// Helper to extract Pieces conversion from note/description
const parsePcsConversion = (note, defaultQty, defaultUnit) => {
    if (!note) return { quantity: defaultQty, unit: defaultUnit };
    
    // Support the new format [CONVERT: 10 แผ่น @ 24 KG/แผ่น]
    const convertMatch = note.match(/\[CONVERT:\s*([\d.]+)\s*([^\s@]+)\s*@\s*([\d.]+)\s*([^\s\/]+)\/\2\]/i);
    if (convertMatch) {
        const weightPerPcs = parseFloat(convertMatch[3]);
        const targetUnit = convertMatch[2];
        if (weightPerPcs > 0 && defaultQty > 0) {
            return {
                quantity: Number((defaultQty / weightPerPcs).toFixed(4)),
                unit: targetUnit
            };
        }
    }
    
    // Fallback to legacy format: [31 PCS @ 24 KG/เส้น]
    const legacyMatch = note.match(/\[([\d.]+)\s*PCS\s*@\s*([\d.]+)\s*KG\/เส้น\]/i);
    if (legacyMatch) {
        const weightPerPcs = parseFloat(legacyMatch[2]);
        if (weightPerPcs > 0 && defaultQty > 0) {
            return {
                quantity: Number((defaultQty / weightPerPcs).toFixed(4)),
                unit: 'เส้น'
            };
        }
    }
    
    return { quantity: defaultQty, unit: defaultUnit };
};

export const supplierPoService = {
    _syncItemsToSupplierProducts: async (supplierId, items) => {
        if (!supplierId || !items || items.length === 0) return;
        try {
            const { data: existingProducts } = await supabase
                .from('supplier_products')
                .select('name')
                .eq('supplier_id', supplierId);
                
            const existingNames = new Set((existingProducts || []).map(p => normalizeStr(p.name)));
            const productsToAdd = [];

            for (const item of items) {
                const itemName = normalizeStr(item.description);
                if (itemName && !existingNames.has(itemName)) {
                    productsToAdd.push({
                        supplier_id: supplierId,
                        name: item.description,
                        unit: item.unit || 'PCS',
                        price: Number(item.unit_price) || 0
                    });
                    existingNames.add(itemName);
                }
            }

            if (productsToAdd.length > 0) {
                await supabase.from('supplier_products').insert(productsToAdd);
            }
        } catch (error) {
            console.error('Error syncing items to supplier products:', error);
        }
    },

    // Get all supplier POs
    getSupplierPos: async () => {
        try {
            const { data, error } = await supabase
                .from('supplier_pos')
                .select(`
                    *,
                    suppliers (id, code, name),
                    warehouses (name, code),
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

    // Server-Side Pagination
    getSupplierPosPaginated: async ({ page = 1, limit = 50, searchTerm = '', dateFrom = '', dateTo = '', dateFilterType = 'date', supplierId = '', supplierProductId = '' }) => {
        try {
            let query = supabase.from('supplier_pos').select(`
                *,
                suppliers (id, code, name),
                warehouses (name, code),
                supplier_po_items (*)
            `, { count: 'exact' });

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`po_number.ilike.%${safe}%,remark.ilike.%${safe}%`);
            }
            
            const targetColumn = dateFilterType === 'delivery_date' ? 'delivery_date' : 'po_date';
            if (dateFrom) {
                query = query.gte(targetColumn, dateFrom);
            }
            if (dateTo) {
                query = query.lte(targetColumn, dateTo);
            }
            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }
            if (supplierProductId) {
                const { data: matchedItems } = await supabase
                    .from('supplier_po_items')
                    .select('po_id')
                    .eq('supplier_product_id', supplierProductId);
                const poIds = (matchedItems || []).map(item => item.po_id);
                if (poIds.length > 0) {
                    query = query.in('id', poIds);
                } else {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Client-side filter for supplier name (PostgREST cannot filter foreign tables in .or())
            let filteredData = data;
            let filteredTotal = count;
            if (searchTerm) {
                const safeLower = (searchTerm || '').trim().toLowerCase();
                if (safeLower) {
                    filteredData = (data || []).filter(po =>
                        (po.po_number || '').toLowerCase().includes(safeLower) ||
                        (po.remark || '').toLowerCase().includes(safeLower) ||
                        (po.suppliers?.name || '').toLowerCase().includes(safeLower) ||
                        (po.suppliers?.code || '').toLowerCase().includes(safeLower)
                    );
                }
            }
            return { data: filteredData, total: filteredTotal };
        } catch (error) {
            console.error('Error fetching paginated supplier POs:', error);
            return { data: [], total: 0, error };
        }
    },

    exportSupplierPos: async ({ searchTerm = '', dateFrom = '', dateTo = '', dateFilterType = 'date', supplierId = '', supplierProductId = '' }) => {
        try {
            let query = supabase.from('supplier_pos').select(`
                *,
                suppliers (id, code, name),
                warehouses (name, code),
                supplier_po_items (*)
            `);

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`po_number.ilike.%${safe}%,remark.ilike.%${safe}%`);
            }
            
            const targetColumn = dateFilterType === 'delivery_date' ? 'delivery_date' : 'po_date';
            if (dateFrom) {
                query = query.gte(targetColumn, dateFrom);
            }
            if (dateTo) {
                query = query.lte(targetColumn, dateTo);
            }
            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }
            if (supplierProductId) {
                const { data: matchedItems } = await supabase
                    .from('supplier_po_items')
                    .select('po_id')
                    .eq('supplier_product_id', supplierProductId);
                const poIds = (matchedItems || []).map(item => item.po_id);
                if (poIds.length > 0) {
                    query = query.in('id', poIds);
                } else {
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error exporting supplier POs:', error);
            throw error;
        }
    },

    getSupplierPoStats: async () => {
        try {
            const { data, error } = await supabase.rpc('get_po_dashboard_stats');
            
            if (error) {
                console.error('RPC Error getting PO stats, falling back...', error);
                throw error;
            }

            return {
                completed: data.completed || 0,
                partial: data.partial || 0,
                draft: data.draft || 0,
                cancelled: data.cancelled || 0,
                overdue: data.overdue || 0
            };
        } catch (error) {
            console.error('Error getting supplier PO stats:', error);
            // Fallback to 0 if RPC fails
            return { completed: 0, partial: 0, draft: 0, cancelled: 0, overdue: 0 };
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
                    warehouses (*),
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

    // Get receiving history for a PO
    getPoReceivingHistory: async (poId) => {
        try {
            const { data, error } = await supabase
                .from('inventory_logs')
                .select(`
                    *,
                    inventory:warehouse_inventory(sku, product_name, unit)
                `)
                .eq('source_type', 'supplier_po')
                .eq('source_id', poId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching PO receiving history:', error);
            return [];
        }
    },

    // Create supplier PO
    createSupplierPo: async (poData) => {
        try {
            const { items, sync_products, receive_remark, ...poDetails } = poData;

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
                const itemsToInsert = items.map((item, index) => {
                    const { raw_material_qty, sku, show_calculator, calc_pcs, calc_weight_per_pcs, calc_unit, ...itemData } = item;
                    return {
                        ...itemData,
                        po_id: poResult.id,
                        item_no: index + 1
                    };
                });

                const { error: itemsError } = await supabase
                    .from('supplier_po_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;

                // Sync new items to supplier's product list
                if (sync_products) {
                    await supplierPoService._syncItemsToSupplierProducts(poDetails.supplier_id, items);
                }

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
                        const rcvItems = items.map(item => {
                            const rcvQtyKg = item.received_quantity !== undefined ? Number(item.received_quantity) : Number(item.quantity);
                            const parsed = parsePcsConversion(item.note, rcvQtyKg, item.unit || 'PCS');
                            return {
                                sku: item.sku || null,
                                productName: item.description,
                                unit: parsed.unit,
                                quantity: parsed.quantity
                            };
                        });

                        if (rcvItems.length > 0) {
                            const { error: rpcError } = await supabase.rpc('batch_receive_po_stock', {
                                p_warehouse_id: targetWarehouseId,
                                p_items: rcvItems,
                                p_performed_by: poDetails.updated_by || poDetails.created_by_name || 'System',
                                p_po_id: poResult.id,
                                p_po_number: poDetails.po_number || poResult.id
                            });

                            if (rpcError) throw rpcError;
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
            const { items, sync_products, receive_remark, ...poDetails } = poData;
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
                    const itemsToInsert = items.map((item, index) => {
                        const { raw_material_qty, sku, show_calculator, calc_pcs, calc_weight_per_pcs, calc_unit, ...itemData } = item;
                        return {
                            ...itemData,
                            po_id: id,
                            item_no: index + 1
                        };
                    });

                    const { error: itemsError } = await supabase
                        .from('supplier_po_items')
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                    
                    // Sync new items to supplier's product list
                    if (sync_products) {
                        await supplierPoService._syncItemsToSupplierProducts(poDetails.supplier_id, items);
                    }

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
                            const { data: supplierProducts } = await supabase
                                .from('supplier_products')
                                .select('id, sku')
                                .eq('supplier_id', poDetails.supplier_id);

                            const diffItems = [];
                            for (const item of items) {
                                const newRcvQty = item.received_quantity !== undefined ? Number(item.received_quantity) : 0;
                                const oldItem = (oldPo?.items || []).find(old => normalizeStr(old.description) === normalizeStr(item.description));
                                const oldRcvQty = oldItem && oldItem.received_quantity !== undefined ? Number(oldItem.received_quantity) : 0;
                                const diffRcvQty = newRcvQty - oldRcvQty;
                                
                                if (diffRcvQty > 0) {
                                    const supplierProduct = supplierProducts?.find(p => p.id === item.supplier_product_id);
                                    const itemSku = item.sku || (supplierProduct ? supplierProduct.sku : null);
                                    const parsed = parsePcsConversion(item.note, diffRcvQty, item.unit || 'PCS');
                                    diffItems.push({
                                        sku: itemSku,
                                        productName: item.description,
                                        unit: parsed.unit,
                                        quantity: parsed.quantity
                                    });
                                }
                            }

                            if (diffItems.length > 0) {
                                const poRef = receive_remark ? `${poDetails.po_number || id} (ใบส่งของ: ${receive_remark})` : (poDetails.po_number || id);
                                const { error: rpcError } = await supabase.rpc('batch_receive_po_stock', {
                                    p_warehouse_id: targetWarehouseId,
                                    p_items: diffItems,
                                    p_performed_by: poDetails.updated_by || poDetails.created_by_name || 'System',
                                    p_po_id: id,
                                    p_po_number: poRef
                                });
                                if (rpcError) throw rpcError;
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
                .select('id, status, po_number')
                .eq('id', id)
                .single();

            if (po?.status === 'Completed' || po?.status === 'Partial') {
                throw new Error('ไม่สามารถลบใบสั่งซื้อที่อยู่ในสถานะรับสินค้าบางส่วนหรือเสร็จสมบูรณ์ได้ กรุณาใช้การยกเลิกแทน');
            }

            // Subcontracting Return Check via RPC
            if (po && po.delivery_warehouse_id) {
                const { error: rpcError } = await supabase.rpc('batch_cancel_po_stock', {
                    p_warehouse_id: po.delivery_warehouse_id,
                    p_items: [],
                    p_performed_by: 'System',
                    p_po_id: po.id,
                    p_po_number: po.po_number || po.id
                });
                if (rpcError) throw rpcError;
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
    cancelSupplierPo: async (id, updatedBy) => {
        try {
            // 1. Get PO details and items
            const { data: po, error: poError } = await supabase
                .from('supplier_pos')
                .select('*, items:supplier_po_items(*)')
                .eq('id', id)
                .single();

            if (poError) throw poError;
            if (po.status === 'Cancelled') throw new Error('ใบสั่งซื้อนี้ถูกยกเลิกไปแล้ว');

            // 2 & 3. Batch cancel received items and subcontract returns via RPC
            const targetWarehouseId = po.delivery_warehouse_id || null;
            if (targetWarehouseId) {
                const itemsToDeduct = (po.items || []).filter(item => Number(item.received_quantity || 0) > 0);
                const cancelItems = itemsToDeduct.map(item => {
                    const parsed = parsePcsConversion(item.note, Number(item.received_quantity || 0), item.unit || 'PCS');
                    return {
                        sku: item.sku || null,
                        productName: item.description,
                        quantity: parsed.quantity,
                        unit: parsed.unit
                    };
                });

                const { error: rpcError } = await supabase.rpc('batch_cancel_po_stock', {
                    p_warehouse_id: targetWarehouseId,
                    p_items: cancelItems,
                    p_performed_by: updatedBy || 'System',
                    p_po_id: po.id,
                    p_po_number: po.po_number || po.id
                });

                if (rpcError) {
                    if (rpcError.message && rpcError.message.includes('ถูกใช้งานไปแล้วจนยอดคงเหลือติดลบ')) {
                        throw new Error(rpcError.message);
                    }
                    throw rpcError;
                }
            }

            const { data, error: finalError } = await supabase
                .from('supplier_pos')
                .update({ 
                    status: 'Cancelled',
                    updated_at: new Date().toISOString(),
                    updated_by: updatedBy || null,
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

    updateStatus: async (id, status, updatedBy) => {
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
                    updated_at: new Date().toISOString(),
                    updated_by: updatedBy || null
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
                        const qtyToAddOriginal = Number(item.quantity) - Number(item.received_quantity || 0);
                        if (qtyToAddOriginal <= 0) continue;
                        
                        const parsed = parsePcsConversion(item.note, qtyToAddOriginal, item.unit || 'PCS');
                        const qtyToAdd = parsed.quantity;
                        const finalUnit = parsed.unit;

                        const existingItem = (currentInventory || []).find(inv => 
                            normalizeStr(inv.product_name) === normalizeStr(item.description)
                        );

                        if (existingItem) {
                            const newQty = Number(existingItem.quantity) + qtyToAdd;
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
                                qty: qtyToAdd,
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
                                    qty: qtyToAdd,
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
                                    quantity: qtyToAdd,
                                    unit: finalUnit,
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
                                    qty: qtyToAdd,
                                    old_quantity: 0,
                                    balance: qtyToAdd,
                                    source_type: 'po',
                                    source_id: id,
                                    reference_no: po.po_number || 'N/A',
                                    remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${po.po_number || id}`
                                }]);

                                if (logError) throw logError;
                            }
                        }
                    }

                    // Update received_quantity in supplier_po_items to match quantity
                    for (const item of po.items) {
                        const { error: itemUpdateError } = await supabase
                            .from('supplier_po_items')
                            .update({ received_quantity: item.quantity })
                            .eq('id', item.id);
                        if (itemUpdateError) throw itemUpdateError;
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
