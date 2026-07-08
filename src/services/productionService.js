import { supabase } from './supabaseClient';

export const productionService = {
    // ==========================================
    // 1. Production Lines
    // ==========================================
    getLines: async () => {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching production lines:', error);
            throw error;
        }
    },

    createLine: async (payload) => {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating production line:', error);
            throw error;
        }
    },

    updateLine: async (id, payload) => {
        try {
            const { data, error } = await supabase
                .from('production_lines')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating production line:', error);
            throw error;
        }
    },

    deleteLine: async (id) => {
        try {
            const { error } = await supabase
                .from('production_lines')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting production line:', error);
            throw error;
        }
    },

    // ==========================================
    // 2. Production Machines
    // ==========================================
    getMachinesByLine: async (lineId) => {
        try {
            const { data, error } = await supabase
                .from('production_machines')
                .select('*')
                .eq('line_id', lineId)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching machines:', error);
            throw error;
        }
    },
    
    getAllMachines: async () => {
        try {
            const { data, error } = await supabase
                .from('production_machines')
                .select('*, production_lines(name)')
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching all machines:', error);
            throw error;
        }
    },

    createMachine: async (payload) => {
        try {
            const { data, error } = await supabase
                .from('production_machines')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating machine:', error);
            throw error;
        }
    },

    updateMachine: async (id, payload) => {
        try {
            const { data, error } = await supabase
                .from('production_machines')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating machine:', error);
            throw error;
        }
    },

    deleteMachine: async (id) => {
        try {
            const { error } = await supabase
                .from('production_machines')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting machine:', error);
            throw error;
        }
    },

    // Get summary of logs for a date
    getLogSummaryByDate: async (date) => {
        try {
            const { data, error } = await supabase
                .from('production_daily_logs')
                .select('line_id, quantity_produced, quantity_defect')
                .eq('log_date', date);

            if (error) throw error;

            const summary = {};
            data.forEach(item => {
                if (!summary[item.line_id]) {
                    summary[item.line_id] = { total_good: 0, total_reject: 0, log_count: 0 };
                }
                summary[item.line_id].total_good += Number(item.quantity_produced || 0);
                summary[item.line_id].total_reject += Number(item.quantity_defect || 0);
                summary[item.line_id].log_count++;
            });

            return Object.keys(summary).map(lineId => ({
                line_id: lineId,
                ...summary[lineId]
            }));
        } catch (error) {
            console.error('Error fetching log summary:', error);
            return [];
        }
    },

    // ==========================================
    // 3. Production Plans
    // ==========================================
    // Get summary of plans for a month
    getPlanSummaryByMonth: async (month) => {
        try {
            // Group by line_id and plan_month to get count and total target
            const { data, error } = await supabase
                .from('production_plans')
                .select('line_id, target_quantity, production_lines(name, code)')
                .eq('plan_month', month);

            if (error) throw error;

            // Aggregate data manually
            const summary = {};
            data.forEach(item => {
                const lid = item.line_id;
                if (!summary[lid]) {
                    summary[lid] = {
                        line_id: lid,
                        line_name: item.production_lines?.name || 'Unknown',
                        item_count: 0,
                        total_target: 0
                    };
                }
                summary[lid].item_count += 1;
                summary[lid].total_target += Number(item.target_quantity || 0);
            });

            return Object.values(summary);
        } catch (error) {
            console.error('Error fetching plan summary:', error);
            throw error;
        }
    },

    getPlansByMonthAndLine: async (month, lineId) => {
        try {
            let query = supabase
                .from('production_plans')
                .select(`
                    *,
                    requisitions:production_requisitions(items:production_requisition_items(quantity)),
                    returns:production_returns(items:production_return_items(quantity))
                `)
                .eq('plan_month', month);
            
            if (lineId) {
                query = query.eq('line_id', lineId);
            }

            const { data, error } = await query.order('plan_date', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching plans:', error);
            throw error;
        }
    },

    getPlansByDateAndLine: async (date, lineId) => {
        try {
            let query = supabase
                .from('production_plans')
                .select(`
                    *,
                    requisitions:production_requisitions(items:production_requisition_items(quantity)),
                    returns:production_returns(items:production_return_items(quantity))
                `)
                .eq('plan_date', date);
            
            if (lineId) {
                query = query.eq('line_id', lineId);
            }

            const { data, error } = await query.order('product_name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching plans by date:', error);
            throw error;
        }
    },

    createSimplePlan: async (planData) => {
        try {
            const { data, error } = await supabase
                .from('production_plans')
                .insert([planData])
                .select('id')
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating simple plan:', error);
            throw error;
        }
    },

    savePlans: async (plans, month, lineId) => {
        try {
            // Because we want to support full replace for a month/line in the UI,
            // we could either upsert or delete existing and insert new.
            // Upsert with UNIQUE(line_id, plan_date, product_name) is better.
            
            // First, find all existing plan IDs for this month and line that are NOT in the new payload,
            // so we can delete them if the user removed a row.
            const existingPlans = await productionService.getPlansByMonthAndLine(month, lineId);
            
            // Match using natural keys since UI might not send id
            const plansToDelete = existingPlans.filter(existing => {
                const stillExists = plans.some(p => 
                    p.plan_date === existing.plan_date &&
                    p.product_name === existing.product_name &&
                    p.process === existing.process
                );
                return !stillExists;
            });

            if (plansToDelete.length > 0) {
                const idsToDelete = plansToDelete.map(p => p.id);
                const { error: delError } = await supabase
                    .from('production_plans')
                    .delete()
                    .in('id', idsToDelete);
                    
                if (delError) {
                    if (delError.code === '23503') {
                        throw new Error('ไม่สามารถลบเป้าหมายการผลิตบางรายการได้ เนื่องจากมีการถูกอ้างอิงไปแล้ว (เช่น ถูกนำไปใช้ใบเบิกหรือบันทึกผลผลิตแล้ว)');
                    } else {
                        throw delError;
                    }
                }
            }

            if (plans.length > 0) {
                // Upsert remaining plans
                const { error: upsertError } = await supabase
                    .from('production_plans')
                    .upsert(plans, { onConflict: 'line_id, plan_date, product_name, process' });
                
                if (upsertError) throw upsertError;
            }

            return true;
        } catch (error) {
            console.error('Error saving plans:', error);
            throw error;
        }
    },

    // ==========================================
    // 4. Production Daily Logs
    // ==========================================
    
    getLogsByMonthAndLine: async (month, lineId) => {
        try {
            // month is expected to be 'YYYY-MM'
            // Calculate last day of the month
            const [y, m] = month.split('-');
            const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();

            let query = supabase
                .from('production_daily_logs')
                .select('*, production_plans(product_name, process, target_quantity, target_warehouse_id)')
                .gte('log_date', `${month}-01`)
                .lte('log_date', `${month}-${lastDay}`);
            
            if (lineId) {
                query = query.eq('line_id', lineId);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching logs by month:', error);
            throw error;
        }
    },

    saveDailyLogs: async (logs) => {
        try {
            if (!logs || logs.length === 0) return true;
            
            // Call the RPC batch function to save multiple logs
            const { error } = await supabase.rpc('batch_upsert_production_logs', {
                p_logs: logs
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving daily logs:', error);
            throw error;
        }
    },

    deleteDailyLog: async (id) => {
        try {
            const { error } = await supabase.rpc('delete_production_log', {
                p_id: id
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting daily log:', error);
            throw error;
        }
    },

    getDailyWIP: async (date, lineId) => {
        try {
            const { data, error } = await supabase.rpc('get_daily_wip', {
                p_date: date,
                p_line_id: lineId
            });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting daily wip:', error);
            throw error;
        }
    },

    customReturnDailyWIP: async (date, lineId, userEmail, returns) => {
        try {
            const { data, error } = await supabase.rpc('custom_return_daily_wip', {
                p_date: date,
                p_line_id: lineId,
                p_user: userEmail,
                p_returns: returns
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in custom auto return:', error);
            throw error;
        }
    },

    autoReturnDailyWIP: async (date, lineId, userEmail) => {
        try {
            const { data, error } = await supabase.rpc('auto_return_daily_wip', {
                p_date: date,
                p_line_id: lineId,
                p_user: userEmail
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error auto returning daily WIP:', error);
            throw error;
        }
    },

    deleteLog: async (id) => {
        try {
            const { error } = await supabase
                .from('production_daily_logs')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    },

    // ==========================================
    // 5. Dashboard / Analytics (RPC Calls)
    // ==========================================
    getProductionSummary: async (dateFrom, dateTo, lineId = null) => {
        try {
            const { data, error } = await supabase.rpc('get_production_summary_by_date', {
                p_date_from: dateFrom,
                p_date_to: dateTo,
                p_line_id: lineId
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting production summary:', error);
            throw error;
        }
    },

    getDepartmentDashboardMetrics: async (dateFrom, dateTo) => {
        try {
            const { data, error } = await supabase.rpc('get_department_dashboard_metrics', {
                p_date_from: dateFrom,
                p_date_to: dateTo
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting department dashboard metrics:', error);
            throw error;
        }
    },

    getOverallMetrics: async (dateFrom, dateTo, lineId = null) => {
        try {
            const summary = await productionService.getProductionSummary(dateFrom, dateTo, lineId);
            
            let totalTarget = 0;
            let totalProduced = 0;
            let totalDefect = 0;
            let totalRequisition = 0;

            summary.forEach(item => {
                totalTarget += Number(item.total_target || 0);
                totalProduced += Number(item.total_produced || 0);
                totalDefect += Number(item.total_defect || 0);
                totalRequisition += Number(item.total_requisition || 0);
            });

            const yieldRate = totalProduced > 0 
                ? (((totalProduced - totalDefect) / totalProduced) * 100).toFixed(1) 
                : 0;

            return {
                totalTarget,
                totalProduced,
                totalDefect,
                totalRequisition,
                yieldRate: Number(yieldRate)
            };
        } catch (error) {
            console.error('Error getting overall metrics:', error);
            return { totalTarget: 0, totalProduced: 0, totalDefect: 0, totalRequisition: 0, yieldRate: 0 };
        }
    },

    // ==========================================
    // 6. Performance Analysis (for Dashboard)
    // ==========================================
    getEmployeePerformance: async (dateFrom, dateTo, lineId = null) => {
        try {
            let query = supabase
                .from('production_daily_logs')
                .select('employee_id, employee_name, line_id, quantity_produced, quantity_defect, log_date, production_plans(line_id), production_lines:line_id(name)')
                .gte('log_date', dateFrom)
                .lte('log_date', dateTo);
            
            if (lineId) query = query.eq('line_id', lineId);

            const { data, error } = await query;
            if (error) throw error;

            // Group by employee
            const empMap = {};
            (data || []).forEach(row => {
                const eid = row.employee_id || 'unknown';
                if (!empMap[eid]) {
                    empMap[eid] = {
                        employee_id: eid,
                        employee_name: row.employee_name || 'ไม่ระบุ',
                        line_name: row.production_lines?.name || '-',
                        total_produced: 0,
                        total_defect: 0,
                        work_days: new Set()
                    };
                }
                empMap[eid].total_produced += Number(row.quantity_produced || 0);
                empMap[eid].total_defect += Number(row.quantity_defect || 0);
                empMap[eid].work_days.add(row.log_date);
            });

            return Object.values(empMap)
                .map(e => ({
                    ...e,
                    work_days: e.work_days.size,
                    yield_rate: e.total_produced > 0
                        ? Number((((e.total_produced - e.total_defect) / e.total_produced) * 100).toFixed(1))
                        : 0,
                    avg_per_day: e.work_days.size > 0
                        ? Math.round(e.total_produced / e.work_days.size)
                        : 0
                }))
                .sort((a, b) => b.total_produced - a.total_produced)
                .slice(0, 10);
        } catch (error) {
            console.error('Error getting employee performance:', error);
            return [];
        }
    },

    getMachinePerformance: async (dateFrom, dateTo, lineId = null) => {
        try {
            let query = supabase
                .from('production_daily_logs')
                .select('machine_id, machine_name, line_id, quantity_produced, quantity_defect, log_date, production_lines:line_id(name)')
                .gte('log_date', dateFrom)
                .lte('log_date', dateTo)
                .not('machine_id', 'is', null);

            if (lineId) query = query.eq('line_id', lineId);

            const { data, error } = await query;
            if (error) throw error;

            const machMap = {};
            (data || []).forEach(row => {
                const mid = row.machine_id;
                if (!mid) return;
                if (!machMap[mid]) {
                    machMap[mid] = {
                        machine_id: mid,
                        machine_name: row.machine_name || 'ไม่ระบุ',
                        line_name: row.production_lines?.name || '-',
                        total_produced: 0,
                        total_defect: 0,
                        work_days: new Set()
                    };
                }
                machMap[mid].total_produced += Number(row.quantity_produced || 0);
                machMap[mid].total_defect += Number(row.quantity_defect || 0);
                machMap[mid].work_days.add(row.log_date);
            });

            return Object.values(machMap)
                .map(m => ({
                    ...m,
                    work_days: m.work_days.size,
                    yield_rate: m.total_produced > 0
                        ? Number((((m.total_produced - m.total_defect) / m.total_produced) * 100).toFixed(1))
                        : 0,
                    avg_per_day: m.work_days.size > 0
                        ? Math.round(m.total_produced / m.work_days.size)
                        : 0
                }))
                .sort((a, b) => b.total_produced - a.total_produced);
        } catch (error) {
            console.error('Error getting machine performance:', error);
            return [];
        }
    },

    getProductGapAnalysis: async (summaryData) => {
        try {
            return (summaryData || [])
                .filter(row => Number(row.total_target) > 0)
                .map(row => ({
                    ...row,
                    gap: Math.max(0, Number(row.total_target) - Number(row.total_produced)),
                    gap_percent: Number(row.total_target) > 0
                        ? Number((100 - Number(row.percent_success)).toFixed(1))
                        : 0
                }))
                .filter(row => row.gap > 0)
                .sort((a, b) => b.gap - a.gap);
        } catch (error) {
            console.error('Error getting product gap analysis:', error);
            return [];
        }
    }
};
