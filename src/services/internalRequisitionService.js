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
                        id, item_id, item_name, quantity, unit, unit_price, amount
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
                        id, item_id, item_name, quantity, unit, unit_price, amount
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

            const { data } = await supabase
                .from('internal_requisitions')
                .select('requisition_number')
                .like('requisition_number', `${datePrefix}%`)
                .order('requisition_number', { ascending: false })
                .limit(1);

            let nextNumber = 1;
            if (data && data.length > 0) {
                const lastNum = data[0].requisition_number;
                const lastSeq = parseInt(lastNum.split('-').pop(), 10);
                if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
            }

            return `${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
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

            const { data: req, error: reqError } = await supabase
                .from('internal_requisitions')
                .update(requisitionData)
                .eq('id', id)
                .select()
                .single();

            if (reqError) throw reqError;

            // Replace items: delete old, insert new
            if (items) {
                const { error: delError } = await supabase
                    .from('internal_requisition_items')
                    .delete()
                    .eq('requisition_id', id);

                if (delError) throw delError;

                if (items.length > 0) {
                    const itemsToInsert = items.map(item => ({
                        requisition_id: id,
                        item_id: item.item_id || null,
                        item_name: item.item_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        unit_price: item.unit_price,
                        amount: item.amount
                    }));

                    const { error: insError } = await supabase
                        .from('internal_requisition_items')
                        .insert(itemsToInsert);

                    if (insError) throw insError;
                }
            }

            return req;
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
            if (req.status === 'Completed' || req.status === 'Approved') {
                throw new Error('รายการนี้ถูกอนุมัติหรือตัดสต๊อกไปแล้ว');
            }

            const itemsToProcess = approvedQuantities ? req.items.filter(item => approvedQuantities[item.id] !== undefined) : req.items;
            
            if (itemsToProcess.length === 0) {
                throw new Error('กรุณาเลือกอย่างน้อย 1 รายการเพื่ออนุมัติ');
            }

            let newTotalAmount = 0;

            // 2. Loop through each item and deduct stock
            for (const item of itemsToProcess) {
                const finalQty = approvedQuantities ? approvedQuantities[item.id] : item.quantity;
                const finalAmount = finalQty * (item.unit_price || 0);
                newTotalAmount += finalAmount;
                
                if (item.item_id) {
                    await internalItemService.adjustStockWithLog(
                        item.item_id,
                        'OUT',             // ตัดสต๊อกออกไปใช้
                        finalQty,
                        item.unit_price || null,
                        `เบิกใช้ตามใบสั่งซื้อ ${req.requisition_number}`,
                        approvedBy || 'System',
                        'requisition',
                        req.id,
                        req.requisition_number
                    );
                }

                // Update quantity and amount in the database if it was partially approved
                if (finalQty !== item.quantity) {
                    await supabase.from('internal_requisition_items')
                        .update({ quantity: finalQty, amount: finalAmount })
                        .eq('id', item.id);
                }
            }

            // 2.5 Delete unapproved items if any
            if (approvedQuantities) {
                const unapprovedItemIds = req.items.filter(item => approvedQuantities[item.id] === undefined).map(i => i.id);
                if (unapprovedItemIds.length > 0) {
                    await supabase.from('internal_requisition_items').delete().in('id', unapprovedItemIds);
                }
            }

            // 3. Update requisition status and total_amount
            const { data, error } = await supabase
                .from('internal_requisitions')
                .update({
                    status: 'Completed', // เปลี่ยนเป็นเสร็จสมบูรณ์ทันที
                    total_amount: newTotalAmount,
                    approved_by: approvedBy,
                    updated_at: new Date().toISOString(),
                    updated_by: approvedBy || null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
