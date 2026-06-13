import { supabase } from './supabaseClient';
import { internalItemService } from './internalItemService';

export const internalRequisitionService = {

    getRequisitions: async () => {
        try {
            const { data, error } = await supabase
                .from('internal_requisitions')
                .select(`
                    *,
                    items:internal_requisition_items(
                        id, item_id, item_name, quantity, unit, unit_price, amount, approved_quantity
                    )
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching requisitions:', error);
            return [];
        }
    },

    getRequisitionById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('internal_requisitions')
                .select(`
                    *,
                    items:internal_requisition_items(
                        id, item_id, item_name, quantity, unit, unit_price, amount, approved_quantity
                    )
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching requisition:', error);
            return null;
        }
    },

    generateRequisitionNumber: async (type = 'purchase') => {
        try {
            const prefix = type === 'purchase' ? 'PUR' : 'WDR';
            const now = new Date();
            const year = now.getFullYear() + 543; // พ.ศ.
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const datePrefix = `${prefix}-${year}${month}`;

            const { data, error } = await supabase.rpc('generate_requisition_number', {
                p_prefix: datePrefix
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error generating requisition number:', error);
            const fallback = Date.now().toString().slice(-6);
            return `REQ-${fallback}`;
        }
    },

    createRequisition: async (requisitionData, items) => {
        try {
            // Insert header
            const { data: req, error: reqError } = await supabase
                .from('internal_requisitions')
                .insert([requisitionData])
                .select()
                .single();

            if (reqError) throw reqError;

            // Insert items
            if (items && items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    requisition_id: req.id,
                    item_id: item.item_id || null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unit_price,
                    amount: item.amount
                }));

                const { error: itemsError } = await supabase
                    .from('internal_requisition_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            return req;
        } catch (error) {
            console.error('Error creating requisition:', error);
            throw error;
        }
    },

    updateRequisition: async (id, requisitionData, items) => {
        try {
            requisitionData.updated_at = new Date().toISOString();

            if (items) {
                const { data: oldItems } = await supabase
                    .from('internal_requisition_items')
                    .select('item_id, item_name, approved_quantity')
                    .eq('requisition_id', id);

                const itemsToInsert = items.map(item => {
                    const oldItem = oldItems?.find(old => 
                        (old.item_id === item.item_id && old.item_id !== null) || 
                        (old.item_name === item.item_name)
                    );
                    
                    return {
                        item_id: item.item_id || null,
                        item_name: item.item_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        unit_price: item.unit_price,
                        amount: item.amount,
                        approved_quantity: oldItem?.approved_quantity || 0
                    };
                });

                const { error: rpcError } = await supabase.rpc('update_requisition_with_items', {
                    p_req_id: id,
                    p_req_data: requisitionData,
                    p_items: itemsToInsert
                });

                if (rpcError) throw rpcError;

                // Auto-update status to Completed if all items are now fully approved
                const allCompleted = itemsToInsert.every(item => (Number(item.approved_quantity) || 0) >= (Number(item.quantity) || 0));
                if (allCompleted && itemsToInsert.length > 0 && requisitionData.status === 'Partial') {
                    await supabase
                        .from('internal_requisitions')
                        .update({ status: 'Completed' })
                        .eq('id', id);
                    requisitionData.status = 'Completed';
                }
                
                return { id, ...requisitionData };
            } else {
                const { data: req, error: reqError } = await supabase
                    .from('internal_requisitions')
                    .update(requisitionData)
                    .eq('id', id)
                    .select()
                    .single();

                if (reqError) throw reqError;
                return req;
            }
        } catch (error) {
            console.error('Error updating requisition:', error);
            throw error;
        }
    },

    deleteRequisition: async (id) => {
        try {
            // Only allow deleting Draft requisitions
            const { data: req } = await supabase
                .from('internal_requisitions')
                .select('status')
                .eq('id', id)
                .single();

            if (req && req.status !== 'Draft') {
                throw new Error('สามารถลบได้เฉพาะใบเบิกที่มีสถานะ Draft เท่านั้น');
            }

            const { error } = await supabase
                .from('internal_requisitions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting requisition:', error);
            throw error;
        }
    },

    approveAndDeductStock: async (id, approvedBy, approvedQuantities = null) => {
        try {
            // 1. Get requisition data with items
            const req = await internalRequisitionService.getRequisitionById(id);
            if (!req) throw new Error('ไม่พบข้อมูลใบเบิก/สั่งซื้อ');
            if (req.status === 'Completed' || req.status === 'Cancelled') {
                throw new Error('รายการนี้เสร็จสมบูรณ์หรือถูกยกเลิกไปแล้ว');
            }

            const itemsToProcess = approvedQuantities ? req.items.filter(item => approvedQuantities[item.id] !== undefined && approvedQuantities[item.id] > 0) : req.items;
            
            if (itemsToProcess.length === 0) {
                throw new Error('ไม่มีรายการที่ระบุจำนวนอนุมัติ');
            }

            // 2. Prepare items for batch RPC
            let allItemsComplete = true;
            const rpcItems = [];

            for (const item of req.items) {
                const currentApproved = Number(item.approved_quantity) || 0;
                const requestedQty = Number(item.quantity) || 0;
                let newApprovedInThisRun = 0;

                if (approvedQuantities && approvedQuantities[item.id]) {
                    newApprovedInThisRun = Number(approvedQuantities[item.id]);
                } else if (!approvedQuantities) {
                    newApprovedInThisRun = requestedQty - currentApproved;
                }

                const finalApprovedQty = currentApproved + newApprovedInThisRun;
                if (finalApprovedQty < requestedQty) {
                    allItemsComplete = false;
                }

                rpcItems.push({
                    item_id: item.item_id || null,
                    req_item_id: item.id,
                    deduct_qty: newApprovedInThisRun,
                    final_approved_qty: finalApprovedQty,
                    unit_price: item.unit_price || null
                });
            }

            const newStatus = allItemsComplete ? 'Completed' : 'Partial';

            // 3. Execute batch RPC
            const { error: rpcError } = await supabase.rpc('batch_approve_requisition_items', {
                p_req_id: id,
                p_items: rpcItems,
                p_approved_by: approvedBy || 'System',
                p_requisition_number: req.requisition_number,
                p_new_status: newStatus
            });

            if (rpcError) throw rpcError;

            return { id, status: newStatus };
        } catch (error) {
            console.error('Error in approveAndDeductStock:', error);
            throw error;
        }
    },

    updateStatus: async (id, status, updatedBy) => {
        try {
            const { data, error } = await supabase
                .from('internal_requisitions')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                    updated_by: updatedBy || null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    },

    getPendingApprovalCount: async () => {
        try {
            const { count, error } = await supabase
                .from('internal_requisitions')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'Draft');
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error fetching pending count:', error);
            return 0;
        }
    },

    getRecentPendingRequisitions: async (limit = 5) => {
        try {
            const { data, error } = await supabase
                .from('internal_requisitions')
                .select(`
                    id, requisition_number, requested_by, date, created_at,
                    items:internal_requisition_items(count)
                `)
                .eq('status', 'Draft')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching recent pending:', error);
            return [];
        }
    }
};
