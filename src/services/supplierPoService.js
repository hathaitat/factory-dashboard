import { supabase } from './supabaseClient';
import { sanitizeSearchTerm } from './sanitize';
import { warehouseService } from './warehouseService';

const normalizeStr = (str) => (str || '').trim().toLowerCase();

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
    getSupplierPosPaginated: async ({ page = 1, limit = 50, searchTerm = '', dateFrom = '', dateTo = '' }) => {
        try {
            let query = supabase.from('supplier_pos').select(`
                *,
                suppliers (id, code, name),
                warehouses (name, code),
                supplier_po_items (*)
            `, { count: 'exact' });

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`po_number.ilike.%${safe}%,suppliers.name.ilike.%${safe}%`);
            }
            if (dateFrom) {
                query = query.gte('po_date', dateFrom);
            }
            if (dateTo) {
                query = query.lte('po_date', dateTo);
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            return { data, total: count };
        } catch (error) {
            console.error('Error fetching paginated supplier POs:', error);
            return { data: [], total: 0, error };
        }
    },

    exportSupplierPos: async ({ searchTerm = '', dateFrom = '', dateTo = '' }) => {
        try {
            let query = supabase.from('supplier_pos').select(`
                *,
                suppliers (id, code, name),
                warehouses (name, code),
                supplier_po_items (*)
            `);

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`po_number.ilike.%${safe}%,suppliers.name.ilike.%${safe}%`);
            }
            if (dateFrom) {
                query = query.gte('po_date', dateFrom);
            }
            if (dateTo) {
                query = query.lte('po_date', dateTo);
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
            const [completedRes, partialRes, draftRes, cancelledRes] = await Promise.all([
                supabase.from('supplier_pos').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
                supabase.from('supplier_pos').select('id', { count: 'exact', head: true }).eq('status', 'Partial'),
                supabase.from('supplier_pos').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
                supabase.from('supplier_pos').select('id', { count: 'exact', head: true }).eq('status', 'Cancelled')
            ]);
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            // For overdue we still need to fetch items that are draft/partial and have delivery_date
            const { data: overdueData } = await supabase.from('supplier_pos').select('delivery_date').in('status', ['Draft', 'Partial']).not('delivery_date', 'is', null);
            const overdue = (overdueData || []).filter(p => p.delivery_date && new Date(p.delivery_date) < now).length;

            return {
                completed: completedRes.count || 0,
                partial: partialRes.count || 0,
                draft: draftRes.count || 0,
                cancelled: cancelledRes.count || 0,
                overdue
            };
        } catch (error) {
            console.error('Error getting supplier PO stats:', error);
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

    // Create supplier PO
    createSupplierPo: async (poData) => {
        try {
            const { items, sync_products, ...poDetails } = poData;

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
                    const { raw_material_qty, sku, image_url, ...itemData } = item;
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
                        const { data: currentInventory } = await supabase
                            .from('warehouse_inventory')
                            .select('*')
                            .eq('warehouse_id', targetWarehouseId);
                        
                        for (const item of items) {
                            const rcvQty = item.received_quantity !== undefined ? Number(item.received_quantity) : Number(item.quantity);
                            if (rcvQty <= 0) continue;
                            
                            const existingItem = (currentInventory || []).find(inv => normalizeStr(inv.product_name) === normalizeStr(item.description));

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
                                    remark: `รับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || poResult.id}`,
                                    performed_by: poDetails.updated_by || poDetails.created_by_name || 'System'
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
                                        remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || poResult.id}`,
                                        performed_by: poDetails.updated_by || poDetails.created_by_name || 'System'
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
            const { items, sync_products, ...poDetails } = poData;
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
                        const { raw_material_qty, sku, image_url, ...itemData } = item;
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
                            const { data: currentInventory } = await supabase
                                .from('warehouse_inventory')
                                .select('*')
                                .eq('warehouse_id', targetWarehouseId);
                            
                            const { data: supplierProducts } = await supabase
                                .from('supplier_products')
                                .select('id, sku')
                                .eq('supplier_id', poDetails.supplier_id);

                            for (const item of items) {
                                const newRcvQty = item.received_quantity !== undefined ? Number(item.received_quantity) : 0;
                                
                                // Find old received quantity
                                const oldItem = (oldPo?.items || []).find(old => normalizeStr(old.description) === normalizeStr(item.description));
                                const oldRcvQty = oldItem && oldItem.received_quantity !== undefined ? Number(oldItem.received_quantity) : 0;
                                
                                const diffRcvQty = newRcvQty - oldRcvQty;
                                
                                if (diffRcvQty <= 0) continue; // Skip if no new goods received

                                const supplierProduct = supplierProducts?.find(p => p.id === item.supplier_product_id);
                                const itemSku = item.sku || (supplierProduct ? supplierProduct.sku : null);
                                const matchColumn = itemSku ? 'sku' : 'product_name';
                                const matchValue = itemSku || item.description;

                                const existingItems = (currentInventory || []).filter(inv => inv[matchColumn] === matchValue);
                                let existingItem = null;
                                if (existingItems.length > 0) {
                                    existingItem = existingItems.find(inv => normalizeStr(inv.product_name) === normalizeStr(item.description));
                                    if (!existingItem) existingItem = existingItems[0];
                                }

                                if (existingItem) {
                                    const newQty = Number(existingItem.quantity) + diffRcvQty;
                                    await supabase
                                        .from('warehouse_inventory')
                                        .update({ quantity: newQty, last_updated: new Date().toISOString() })
                                        .eq('id', existingItem.id);
                                    
                                    await warehouseService.logMovement({
                                        inventory_id: existingItem.id,
                                        action: 'IN',
                                        quantity_change: diffRcvQty,
                                        previous_quantity: existingItem.quantity,
                                        new_quantity: newQty,
                                        source_type: 'po',
                                        source_id: id,
                                        reference_no: poDetails.po_number || id,
                                        remark: `รับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || id} (เพิ่มเติม)`,
                                        performed_by: poDetails.updated_by || poDetails.created_by_name || 'System'
                                    });
                                } else {
                                    const { data: newItem } = await supabase
                                        .from('warehouse_inventory')
                                        .insert([{
                                            warehouse_id: targetWarehouseId,
                                            sku: itemSku,
                                            product_type: 'material',
                                            product_name: item.description || 'Unknown Item',
                                            quantity: diffRcvQty,
                                            unit: item.unit || 'PCS',
                                            min_stock: 0
                                        }])
                                        .select()
                                        .single();
                                    
                                    if (newItem) {
                                        await warehouseService.logMovement({
                                            inventory_id: newItem.id,
                                            action: 'IN',
                                            quantity_change: diffRcvQty,
                                            previous_quantity: 0,
                                            new_quantity: diffRcvQty,
                                            source_type: 'po',
                                            source_id: id,
                                            reference_no: poDetails.po_number || id,
                                            remark: `เพิ่มรายการใหม่และรับสินค้าจากใบสั่งซื้อเลขที่ ${poDetails.po_number || id} (เพิ่มเติม)`,
                                            performed_by: poDetails.updated_by || poDetails.created_by_name || 'System'
                                        });
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
                .select('id, status, po_number')
                .eq('id', id)
                .single();

            if (po?.status === 'Completed' || po?.status === 'Partial') {
                throw new Error('ไม่สามารถลบใบสั่งซื้อที่อยู่ในสถานะรับสินค้าบางส่วนหรือเสร็จสมบูรณ์ได้ กรุณาใช้การยกเลิกแทน');
            }

            // Subcontracting Return Check (Return stock if it was deducted during PO creation)
            if (po) {
                const searchRemarkPattern1 = `%PO: ${po.po_number})%`;
                const searchRemarkPattern2 = `%PO: ${po.id})%`;
                
                const { data: logs1 } = await supabase
                    .from('inventory_logs')
                    .select('*')
                    .ilike('remark', searchRemarkPattern1);
                    
                const { data: logs2 } = await supabase
                    .from('inventory_logs')
                    .select('*')
                    .ilike('remark', searchRemarkPattern2);
                    
                const allLogs = [...(logs1 || []), ...(logs2 || [])];
                const subcontractLogs = Array.from(new Map(allLogs.map(item => [item.id, item])).values());

                if (subcontractLogs && subcontractLogs.length > 0) {
                    for (const log of subcontractLogs) {
                        const returnRemark = `คืนสต็อกเนื่องจากการลบใบสั่งจ้างผลิต (PO: ${po.po_number || po.id})`;
                        const { data: existingReturn } = await supabase
                            .from('inventory_logs')
                            .select('id')
                            .eq('inventory_id', log.inventory_id)
                            .eq('remark', returnRemark)
                            .maybeSingle();

                        if (!existingReturn) {
                            const { data: currentItem } = await supabase
                                .from('warehouse_inventory')
                                .select('quantity')
                                .eq('id', log.inventory_id)
                                .single();
                                
                            if (currentItem) {
                                const newQty = Number(currentItem.quantity) + Number(log.qty);
                                
                                // Update inventory
                                await supabase
                                    .from('warehouse_inventory')
                                    .update({
                                        quantity: newQty,
                                        last_updated: new Date().toISOString()
                                    })
                                    .eq('id', log.inventory_id);
                                    
                                // Insert IN log
                                await supabase.from('inventory_logs').insert([{
                                    inventory_id: log.inventory_id,
                                    type: 'IN',
                                    qty: Number(log.qty),
                                    old_quantity: Number(currentItem.quantity),
                                    balance: newQty,
                                    source_type: 'po',
                                    source_id: po.id,
                                    reference_no: po.po_number || 'N/A',
                                    remark: returnRemark
                                }]);
                            }
                        }
                    }
                }
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
                            normalizeStr(inv.product_name) === normalizeStr(item.description)
                        );

                        const qtyToDeduct = Number(item.received_quantity || 0);

                        if (!existingItem || Number(existingItem.quantity) < qtyToDeduct) {
                            throw new Error(`สต็อกสินค้า "${item.description}" ไม่เพียงพอสำหรับการยกเลิก (ต้องการหักออก ${qtyToDeduct} แต่มีในคลัง ${existingItem?.quantity || 0})`);
                        }
                    }

                    // Deduction Loop
                    for (const item of itemsToDeduct) {
                        const existingItem = currentInventory.find(inv => normalizeStr(inv.product_name) === normalizeStr(item.description));
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

            // 3. Subcontracting Return Check
            // Find any inventory logs that deducted stock for this subcontract PO
            // Using only English characters to avoid any Thai text encoding issues in PostgREST
            const searchRemarkPattern1 = `%PO: ${po.po_number})%`;
            const searchRemarkPattern2 = `%PO: ${po.id})%`;
            
            const { data: logs1 } = await supabase
                .from('inventory_logs')
                .select('*')
                .ilike('remark', searchRemarkPattern1);
                
            const { data: logs2 } = await supabase
                .from('inventory_logs')
                .select('*')
                .ilike('remark', searchRemarkPattern2);
                
            // Combine and remove duplicates
            const allLogs = [...(logs1 || []), ...(logs2 || [])];
            const subcontractLogs = Array.from(new Map(allLogs.map(item => [item.id, item])).values());
            
            console.log('--- CANCEL PO LOGS ---', { 
                poId: po.id, 
                poNum: po.po_number,
                pattern1: searchRemarkPattern1, 
                pattern2: searchRemarkPattern2, 
                logs1Count: logs1?.length || 0,
                logs2Count: logs2?.length || 0,
                subcontractLogs
            });

            if (subcontractLogs && subcontractLogs.length > 0) {
                // For each deduction, we must RETURN the stock
                for (const log of subcontractLogs) {
                    // Check if it's already returned to avoid double returning
                    const returnRemark = `คืนสต็อกเนื่องจากการยกเลิกใบสั่งจ้างผลิต (PO: ${po.po_number || po.id})`;
                    const { data: existingReturn } = await supabase
                        .from('inventory_logs')
                        .select('id')
                        .eq('inventory_id', log.inventory_id)
                        .eq('remark', returnRemark)
                        .maybeSingle(); // maybeSingle instead of single to handle 0 results without throwing

                    if (!existingReturn) {
                        const { data: currentItem } = await supabase
                            .from('warehouse_inventory')
                            .select('quantity')
                            .eq('id', log.inventory_id)
                            .single();
                            
                        if (currentItem) {
                            const newQty = Number(currentItem.quantity) + Number(log.qty);
                            
                            // Update inventory
                            await supabase
                                .from('warehouse_inventory')
                                .update({
                                    quantity: newQty,
                                    last_updated: new Date().toISOString(),
                                    updated_by: updatedBy || null
                                })
                                .eq('id', log.inventory_id);
                                
                            // Insert IN log
                            const finalRemark = returnRemark + (updatedBy ? ` (โดย ${updatedBy})` : '');
                            await supabase.from('inventory_logs').insert([{
                                inventory_id: log.inventory_id,
                                type: 'IN',
                                qty: Number(log.qty),
                                old_quantity: Number(currentItem.quantity),
                                balance: newQty,
                                source_type: 'po',
                                source_id: po.id,
                                reference_no: po.po_number || 'N/A',
                                remark: finalRemark
                            }]);
                        }
                    }
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
                        const qtyToAdd = Number(item.quantity) - Number(item.received_quantity || 0);
                        if (qtyToAdd <= 0) continue;

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
