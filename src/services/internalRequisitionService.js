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

    completeRequisition: async (id) => {
        try {
            // Get the requisition with items
            const req = await internalRequisitionService.getRequisitionById(id);
            if (!req) throw new Error('ไม่พบใบเบิก');
            if (req.status === 'Completed') throw new Error('ใบเบิกนี้เสร็จสิ้นแล้ว');

            // Update stock for each item
            for (const item of (req.items || [])) {
                if (item.item_id) {
                    const stockChange = req.type === 'purchase'
                        ? item.quantity   // Purchase = stock IN
                        : -item.quantity; // Withdraw = stock OUT

                    await internalItemService.adjustStock(item.item_id, stockChange);
                }
            }

            // Update status
            const { data, error } = await supabase
                .from('internal_requisitions')
                .update({
                    status: 'Completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error completing requisition:', error);
            throw error;
        }
    },

    updateStatus: async (id, status) => {
        try {
            const { data, error } = await supabase
                .from('internal_requisitions')
                .update({
                    status,
                    updated_at: new Date().toISOString()
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
    }
};
