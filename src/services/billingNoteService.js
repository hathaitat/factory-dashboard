import { supabase } from './supabaseClient';
import { settingService } from './settingService';
import { documentNumberHelper } from '../utils/documentNumbering';
import { thaiBaht } from '../utils/thaiBaht';
import { sanitizeSearchTerm } from './sanitize';

// Shared mapper: DB row -> Frontend object
const _mapBillingNote = (bn) => ({
    id: bn.id,
    billingNoteNo: bn.billing_note_no,
    date: bn.date,
    customerId: bn.customer_id,
    customerName: bn.customer?.name || bn.customer_snapshot?.name || 'Unknown',
    totalAmount: Number(bn.total_amount),
    status: bn.status,
    createdAt: bn.created_at,
    createdBy: bn.created_by,
    updatedBy: bn.updated_by
});

export const billingNoteService = {
    // Get all billing notes with customer details
    getBillingNotes: async () => {
        try {
            const { data, error } = await supabase
                .from('billing_notes')
                .select(`
                    *,
                    customer:customers(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(_mapBillingNote);
        } catch (error) {
            console.error('Error fetching billing notes:', error);
            return [];
        }
    },

    // Server-Side Pagination
    getBillingNotesPaginated: async ({ page = 1, limit = 50, searchTerm = '', dateFrom = '', dateTo = '', status = '' }) => {
        try {
            let query = supabase.from('billing_notes').select(`
                *,
                customer:customers(name)
            `, { count: 'exact' });

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`billing_note_no.ilike.%${safe}%,customer_snapshot->name.ilike.%${safe}%`);
            }
            if (dateFrom) {
                query = query.gte('date', dateFrom);
            }
            if (dateTo) {
                query = query.lte('date', dateTo);
            }
            if (status) {
                query = query.eq('status', status);
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const processedData = data.map(_mapBillingNote);

            return { data: processedData, total: count };
        } catch (error) {
            console.error('Error fetching paginated billing notes:', error);
            return { data: [], total: 0, error };
        }
    },

    exportBillingNotes: async ({ searchTerm = '', dateFrom = '', dateTo = '', status = '' }) => {
        try {
            let query = supabase.from('billing_notes').select(`
                *,
                customer:customers(name)
            `);

            if (searchTerm) {
                const safe = sanitizeSearchTerm(searchTerm);
                if (safe) query = query.or(`billing_note_no.ilike.%${safe}%,customer_snapshot->>name.ilike.%${safe}%`);
            }
            if (dateFrom) {
                query = query.gte('date', dateFrom);
            }
            if (dateTo) {
                query = query.lte('date', dateTo);
            }
            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(bn => ({
                id: bn.id,
                billingNoteNo: bn.billing_note_no,
                date: bn.date,
                customerName: bn.customer?.name || bn.customer_snapshot?.name || 'Unknown',
                totalAmount: Number(bn.total_amount),
                status: bn.status
            }));
        } catch (error) {
            console.error('Error exporting billing notes:', error);
            throw error;
        }
    },

    getBillingNoteStats: async () => {
        try {
            const [draftRes, sentRes, paidRes] = await Promise.all([
                supabase.from('billing_notes').select('id', { count: 'exact', head: true }).eq('status', 'Draft'),
                supabase.from('billing_notes').select('id', { count: 'exact', head: true }).eq('status', 'Sent'),
                supabase.from('billing_notes').select('id', { count: 'exact', head: true }).eq('status', 'Paid')
            ]);

            // For totalValue, we still need to sum it up. Ideally, this should be an RPC call.
            // Since we don't know if RPC exists, we use select('total_amount') but we should be aware of payload size.
            const totalValueRes = await supabase.from('billing_notes').select('total_amount').eq('status', 'Paid');

            const draft = draftRes.count || 0;
            const sent = sentRes.count || 0;
            const paid = paidRes.count || 0;
            const totalValue = (totalValueRes.data || []).reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);

            return { draft, sent, paid, totalValue, monthCount: draft + sent + paid, pendingCount: draft + sent, paidCount: paid, totalCount: draft + sent + paid };
        } catch (error) {
            console.error('Error fetching billing note stats:', error);
            return { draft: 0, sent: 0, paid: 0, totalValue: 0, monthCount: 0, pendingCount: 0, paidCount: 0, totalCount: 0 };
        }
    },

    getReceiptStats: async () => {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const startDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`;
            const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
            const endDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            const [totalPaidRes, monthReceiptsRes, totalValueRes] = await Promise.all([
                supabase.from('billing_notes').select('id', { count: 'exact', head: true }).eq('status', 'Paid'),
                supabase.from('billing_notes').select('total_amount').eq('status', 'Paid').gte('date', startDate).lte('date', endDate),
                supabase.from('billing_notes').select('total_amount').eq('status', 'Paid')
            ]);

            const revenueThisMonth = (monthReceiptsRes.data || []).reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
            const totalPaidCount = totalPaidRes.count || 0;
            const totalRevenue = (totalValueRes.data || []).reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);

            return { revenueThisMonth, totalPaidCount, totalRevenue };
        } catch (error) {
            console.error('Error fetching receipt stats:', error);
            return { revenueThisMonth: 0, totalPaidCount: 0, totalRevenue: 0 };
        }
    },

    // Get single billing note with its linked invoices
    getBillingNoteById: async (id) => {
        try {
            const { data: bn, error: bnError } = await supabase
                .from('billing_notes')
                .select(`
                    *,
                    customer:customers(*)
                `)
                .eq('id', id)
                .single();

            if (bnError) throw bnError;

            const { data: items, error: itemsError } = await supabase
                .from('billing_note_items')
                .select(`
                    *,
                    invoice:invoices(
                        *,
                        po:purchase_orders(po_number, status)
                    )
                `)
                .eq('billing_note_id', id)
                .order('sort_order', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                id: bn.id,
                billingNoteNo: bn.billing_note_no,
                date: bn.date,
                customerId: bn.customer_id,
                customer: bn.customer ? {
                    id: bn.customer.id,
                    code: bn.customer.code,
                    name: bn.customer.name,
                    taxId: bn.customer.tax_id,
                    branch: bn.customer.branch,
                    phone: bn.customer.phone,
                    address: bn.customer.address
                } : bn.customer_snapshot,
                customerSnapshot: bn.customer_snapshot,
                totalAmount: Number(bn.total_amount),
                bahtText: bn.baht_text,
                status: bn.status,
                notes: bn.notes,
                createdAt: bn.created_at,
                updatedAt: bn.updated_at,
                createdBy: bn.created_by,
                updatedBy: bn.updated_by,
                invoices: items.map(item => ({
                    id: item.invoice.id,
                    invoiceNo: item.invoice.invoice_no,
                    date: item.invoice.date,
                    dueDate: item.invoice.due_date,
                    creditDays: item.invoice.credit_days,
                    grandTotal: Number(item.invoice.grand_total),
                    poNumber: item.invoice.po?.po_number,
                    poStatus: item.invoice.po?.status
                }))
            };
        } catch (error) {
            console.error('Error fetching billing note:', error);
            return null;
        }
    },

    // Create Billing Note
    createBillingNote: async (bnData, invoiceIds) => {
        try {
            // 1. Insert Billing Note
            const dbBN = {
                billing_note_no: bnData.billingNoteNo,
                date: bnData.date,
                customer_id: bnData.customerId || null,
                customer_snapshot: bnData.customerSnapshot || null,
                total_amount: bnData.totalAmount,
                baht_text: thaiBaht(bnData.totalAmount),
                status: bnData.status || 'Draft',
                notes: bnData.notes,
                created_by: bnData.createdBy || null,
                updated_by: bnData.updatedBy || null
            };

            const { data: bn, error: bnError } = await supabase
                .from('billing_notes')
                .insert([dbBN])
                .select()
                .single();

            if (bnError) throw bnError;

            // 2. Link Invoices
            const dbItems = invoiceIds.map((invoiceId, index) => ({
                billing_note_id: bn.id,
                invoice_id: invoiceId,
                sort_order: index
            }));

            const { error: itemsError } = await supabase
                .from('billing_note_items')
                .insert(dbItems);

            if (itemsError) throw itemsError;

            // 3. Update Invoice Status based on BN status
            if (invoiceIds.length > 0) {
                const invoiceStatus = (bnData.status || 'Draft') === 'Paid' ? 'Paid' : 'Pending';
                const { error: updateInvError } = await supabase
                    .from('invoices')
                    .update({ status: invoiceStatus })
                    .in('id', invoiceIds);
                if (updateInvError) throw updateInvError;
            }

            return bn;
        } catch (error) {
            console.error('Error creating billing note:', error);
            throw error;
        }
    },

    // Update Billing Note
    updateBillingNote: async (id, bnData, invoiceIds) => {
        try {
            // 0. Get old linked invoice IDs before syncing
            const { data: oldItems } = await supabase
                .from('billing_note_items')
                .select('invoice_id')
                .eq('billing_note_id', id);
            const oldInvoiceIds = oldItems?.map(item => item.invoice_id) || [];

            // 1. Update Billing Note
            const dbBN = {
                billing_note_no: bnData.billingNoteNo,
                date: bnData.date,
                customer_id: bnData.customerId || null,
                customer_snapshot: bnData.customerSnapshot || null,
                total_amount: bnData.totalAmount,
                baht_text: thaiBaht(bnData.totalAmount),
                status: bnData.status,
                notes: bnData.notes,
                updated_at: new Date().toISOString(),
                updated_by: bnData.updatedBy || null
            };

            const { error: bnError } = await supabase
                .from('billing_notes')
                .update(dbBN)
                .eq('id', id);

            if (bnError) throw bnError;

            // 2. Sync Linked Invoices
            const { error: delError } = await supabase
                .from('billing_note_items')
                .delete()
                .eq('billing_note_id', id);

            if (delError) throw delError;

            const dbItems = invoiceIds.map((invoiceId, index) => ({
                billing_note_id: id,
                invoice_id: invoiceId,
                sort_order: index
            }));

            const { error: itemsError } = await supabase
                .from('billing_note_items')
                .insert(dbItems);

            if (itemsError) throw itemsError;

            // 3. Update new Invoice Status based on BN status
            if (invoiceIds.length > 0) {
                const invoiceStatus = bnData.status === 'Paid' ? 'Paid' : 'Pending';
                const { error: updateInvError } = await supabase
                    .from('invoices')
                    .update({ status: invoiceStatus })
                    .in('id', invoiceIds);
                if (updateInvError) throw updateInvError;
            }

            // 4. Revert removed invoices back to 'Draft'
            const removedInvoiceIds = oldInvoiceIds.filter(id => !invoiceIds.includes(id));
            if (removedInvoiceIds.length > 0) {
                const { error: revertError } = await supabase
                    .from('invoices')
                    .update({ status: 'Draft' })
                    .in('id', removedInvoiceIds);
                if (revertError) console.error('Error reverting removed invoice status:', revertError);
            }

            return true;
        } catch (error) {
            console.error('Error updating billing note:', error);
            throw error;
        }
    },

    // Delete Billing Note
    deleteBillingNote: async (id) => {
        try {
            // 1. Get invoice IDs linked to this billing note BEFORE deleting
            const { data: linkedItems, error: fetchError } = await supabase
                .from('billing_note_items')
                .select('invoice_id')
                .eq('billing_note_id', id);

            const invoiceIdsToRevert = linkedItems?.map(item => item.invoice_id) || [];

            // 2. Delete the billing note
            const { error } = await supabase
                .from('billing_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // 3. Revert linked invoices status back to Draft
            if (invoiceIdsToRevert.length > 0) {
                const { error: updateInvError } = await supabase
                    .from('invoices')
                    .update({ status: 'Draft' })
                    .in('id', invoiceIdsToRevert);

                if (updateInvError) {
                    console.error('Error reverting invoice status:', updateInvError);
                    // Don't throw here, delete already succeeded
                }
            }

            return true;
        } catch (error) {
            console.error('Error deleting billing note:', error);
            return false;
        }
    },

    // Get available invoices for the selection list
    getAvailableInvoices: async (customerId, month, year) => {
        try {
            // First get all invoices for this customer and month
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            let query = supabase
                .from('invoices')
                .select(`
                    *,
                    po:purchase_orders(po_number, status)
                `)
                .or(`customer_id.eq.${customerId},customer_snapshot->>id.eq.${customerId}`)
                .gte('date', startDate)
                .lte('date', endDate);

            const { data: invoices, error } = await query;
            if (error) throw error;

            // Then filter out invoices already linked to OTHER billing notes
            // (Note: For simplicity in MVP, we'll fetch all linked invoice IDs first)
            const { data: linkedItems, error: linkedError } = await supabase
                .from('billing_note_items')
                .select('invoice_id');

            if (linkedError) throw linkedError;
            const linkedIds = new Set(linkedItems.map(item => item.invoice_id));

            return invoices.filter(inv => !linkedIds.has(inv.id)).map(inv => ({
                id: inv.id,
                invoiceNo: inv.invoice_no,
                date: inv.date,
                grandTotal: Number(inv.grand_total),
                poNumber: inv.po?.po_number,
                poStatus: inv.po?.status
            }));
        } catch (error) {
            console.error('Error fetching available invoices:', error);
            return [];
        }
    },

    // Get next available billing note number
    getNextBillingNoteNo: async () => {
        try {
            const formats = await settingService.getSetting('document_formats');
            // Fallbacks for migration
            const formatStr = formats?.billing_note_format || (formats?.billing_note_prefix ? `${formats.billing_note_prefix}{YY}{MM}{RUN}` : 'BN{YY}{MM}{RUN}');

            const dateFormatted = documentNumberHelper.applyDateFormats(formatStr);
            const searchPrefix = documentNumberHelper.getSearchPrefix(dateFormatted);
            const searchSuffix = documentNumberHelper.getSearchSuffix(dateFormatted);

            const { data, error } = await supabase
                .from('billing_notes')
                .select('billing_note_no, created_at')
                .like('billing_note_no', `${searchPrefix}%${searchSuffix}`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            let maxSeq = 0;
            let latestNo = null;

            if (data && data.length > 0) {
                let activeRunLength = -1;

                for (let bn of data) {
                    const runStr = documentNumberHelper.extractRunNumber(bn.billing_note_no, formatStr);
                    // Ensure it is strictly digits
                    if (/^\d+$/.test(runStr)) {
                        if (activeRunLength === -1) {
                            // Adopt the length of the most recently created valid format
                            activeRunLength = runStr.length;
                        }

                        // Find the max sequence ONLY among matching lengths
                        if (runStr.length === activeRunLength) {
                            const num = parseInt(runStr, 10);
                            if (!isNaN(num) && num > maxSeq) {
                                maxSeq = num;
                                latestNo = bn.billing_note_no;
                            }
                        }
                    }
                }
            }

            const { length } = documentNumberHelper.getRunTokenInfo(formatStr);
            const nextRun = documentNumberHelper.getNextRunNumberString(latestNo, searchPrefix, searchSuffix, length);
            return documentNumberHelper.replaceRunToken(dateFormatted, nextRun);

        } catch (error) {
            console.error('Error getting next BN number:', error);
            const fallbackFormats = await settingService.getSetting('document_formats');
            const fallbackFormatStr = fallbackFormats?.billing_note_format || 'BN{YY}{MM}{RUN}';
            return documentNumberHelper.getPreviewUrl(fallbackFormatStr);
        }
    }
};
