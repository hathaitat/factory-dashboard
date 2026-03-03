import { supabase } from './supabaseClient';
import { settingService } from './settingService';
import { documentNumberHelper } from '../utils/documentNumbering';
import { thaiBaht } from '../utils/thaiBaht';

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

            return data.map(bn => ({
                id: bn.id,
                billingNoteNo: bn.billing_note_no,
                date: bn.date,
                customerId: bn.customer_id,
                customerName: bn.customer?.name || bn.customer_snapshot?.name || 'Unknown',
                totalAmount: Number(bn.total_amount),
                status: bn.status,
                createdAt: bn.created_at
            }));
        } catch (error) {
            console.error('Error fetching billing notes:', error);
            return [];
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
                notes: bnData.notes
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

            // 3. Update Invoice Status to 'Pending'
            if (invoiceIds.length > 0) {
                const { error: updateInvError } = await supabase
                    .from('invoices')
                    .update({ status: 'Pending' })
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
                updated_at: new Date().toISOString()
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

            // 3. Update Invoice Status to 'Pending'
            if (invoiceIds.length > 0) {
                const { error: updateInvError } = await supabase
                    .from('invoices')
                    .update({ status: 'Pending' })
                    .in('id', invoiceIds);
                if (updateInvError) throw updateInvError;
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
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

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
