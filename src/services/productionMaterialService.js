import { supabase } from './supabaseClient';
import { warehouseService } from './warehouseService';

export const productionMaterialService = {
    // ==========================================
    // 1. Requisitions (เบิกวัตถุดิบ)
    // ==========================================
    
    generateRequisitionNumber: async () => {
        try {
            const prefix = 'PR';
            const now = new Date();
            const year = now.getFullYear() + 543; // พ.ศ.
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const datePrefix = `${prefix}-${year}${month}`;

            const { data, error } = await supabase.rpc('generate_production_doc_number', {
                p_prefix: datePrefix,
                p_table: 'requisition'
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error generating requisition number:', error);
            const fallback = Date.now().toString().slice(-6);
            return `PR-FB-${fallback}`;
        }
    },

    getRequisitions: async (filters = {}) => {
        try {
            let query = supabase
                .from('production_requisitions')
                .select(`
                    *,
                    production_lines(name),
                    warehouses(name),
                    target_plan:production_plans(id, product_name, process),
                    items:production_requisition_items(
                        id, inventory_id, quantity, unit, notes, weight_kg,
                        warehouse_inventory(sku, product_name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (filters.line_id) query = query.eq('line_id', filters.line_id);
            if (filters.dateFrom) query = query.gte('req_date', filters.dateFrom);
            if (filters.dateTo) query = query.lte('req_date', filters.dateTo);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching requisitions:', error);
            throw error;
        }
    },

    getRequisitionById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('production_requisitions')
                .select(`
                    *,
                    items:production_requisition_items(
                        id, inventory_id, quantity, unit, notes, weight_kg,
                        warehouse_inventory(sku, product_name)
                    )
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching requisition by id:', error);
            throw error;
        }
    },

    createRequisition: async (reqData, itemsData, performedBy) => {
        try {
            const { data: reqId, error } = await supabase.rpc('create_production_requisition', {
                p_req_data: reqData,
                p_items_data: itemsData,
                p_performed_by: performedBy
            });

            if (error) throw error;
            
            // Fetch the created header to return
            const { data: header, error: fetchError } = await supabase
                .from('production_requisitions')
                .select('*')
                .eq('id', reqId)
                .single();
                
            if (fetchError) throw fetchError;
            return header;
        } catch (error) {
            console.error('Error creating requisition:', error);
            throw error;
        }
    },

    deleteRequisition: async (id, userEmail) => {
        try {
            const { error } = await supabase.rpc('delete_production_requisition', {
                p_requisition_id: id,
                p_user: userEmail
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting requisition:', error);
            throw error;
        }
    },

    // ==========================================
    // 2. Returns (คืนวัตถุดิบ)
    // ==========================================

    generateReturnNumber: async () => {
        try {
            const prefix = 'RT';
            const now = new Date();
            const year = now.getFullYear() + 543;
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const datePrefix = `${prefix}-${year}${month}`;

            const { data, error } = await supabase.rpc('generate_production_doc_number', {
                p_prefix: datePrefix,
                p_table: 'return'
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error generating return number:', error);
            const fallback = Date.now().toString().slice(-6);
            return `RT-FB-${fallback}`;
        }
    },

    getReturns: async (filters = {}) => {
        try {
            let query = supabase
                .from('production_returns')
                .select(`
                    *,
                    production_lines(name),
                    warehouses(name),
                    items:production_return_items(
                        id, inventory_id, quantity, unit, reason, weight_kg,
                        warehouse_inventory(sku, product_name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (filters.line_id) query = query.eq('line_id', filters.line_id);
            if (filters.dateFrom) query = query.gte('return_date', filters.dateFrom);
            if (filters.dateTo) query = query.lte('return_date', filters.dateTo);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Stock adjust error (return):', error);
            throw error;
        }
    },

    getReturnById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('production_returns')
                .select(`
                    *,
                    production_lines(name),
                    warehouses(name),
                    items:production_return_items(
                        id, inventory_id, quantity, unit, reason, weight_kg,
                        warehouse_inventory(sku, product_name)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching return ${id}:`, error);
            throw error;
        }
    },

    deleteReturn: async (id, userEmail) => {
        try {
            const { error } = await supabase.rpc('delete_production_return', {
                p_return_id: id,
                p_user: userEmail
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting return:', error);
            throw error;
        }
    },

    createReturn: async (returnData, itemsData, performedBy) => {
        try {
            const { data: retId, error } = await supabase.rpc('create_production_return', {
                p_return_data: returnData,
                p_items_data: itemsData,
                p_performed_by: performedBy
            });

            if (error) throw error;
            
            // Fetch the created header to return
            const { data: header, error: fetchError } = await supabase
                .from('production_returns')
                .select('*')
                .eq('id', retId)
                .single();
                
            if (fetchError) throw fetchError;
            return header;
        } catch (error) {
            console.error('Error creating return:', error);
            throw error;
        }
    },

    updateReturn: async (id, returnData, itemsData, performedBy) => {
        try {
            const { error } = await supabase.rpc('update_production_return', {
                p_return_id: id,
                p_return_date: returnData.return_date,
                p_line_id: returnData.line_id,
                p_target_warehouse_id: returnData.target_warehouse_id,
                p_target_plan_id: returnData.target_plan_id || null,
                p_notes: returnData.notes || '',
                p_user: performedBy,
                p_items: itemsData.map(item => ({
                    inventory_id: item.inventory_id,
                    quantity: item.quantity,
                    weight_kg: item.weight_kg || 0,
                    unit: item.unit,
                    reason: item.reason
                }))
            });

            if (error) throw error;
            return { id };
        } catch (error) {
            console.error('Error updating return:', error);
            throw error;
        }
    }
};
