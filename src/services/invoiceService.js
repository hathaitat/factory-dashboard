import { supabase } from './supabaseClient';
import { settingService } from './settingService';
import { purchaseOrderService } from './purchaseOrderService';
import { documentNumberHelper } from '../utils/documentNumbering';

export const invoiceService = {
    // Get all invoices with customer details
    getInvoices: async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(inv => ({
                id: inv.id,
                invoiceNo: inv.invoice_no,
                date: inv.date,
                customerId: inv.customer_id,
                customerName: inv.customer?.name || inv.customer_snapshot?.name || 'Unknown',
                customerSnapshot: inv.customer_snapshot,
                referenceNo: inv.reference_no,
                purchaseOrderId: inv.purchase_order_id,
                creditDays: inv.credit_days,
                dueDate: inv.due_date,
                subtotal: Number(inv.subtotal),
                discount: Number(inv.discount),
                vatRate: Number(inv.vat_rate),
                vatAmount: Number(inv.vat_amount),
                grandTotal: Number(inv.grand_total),
                status: inv.status,
                adjustments: inv.adjustments || [],
                createdAt: inv.created_at
            }));
        } catch (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
    },

    // Get single invoice with items
    getInvoiceById: async (id) => {
        try {
            const { data: inv, error: invError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*)
                `)
                .eq('id', id)
                .single();

            if (invError) throw invError;

            const { data: items, error: itemsError } = await supabase
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', id)
                .order('sort_order', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                id: inv.id,
                invoiceNo: inv.invoice_no,
                date: inv.date,
                customerId: inv.customer_id,
                customer: inv.customer ? {
                    id: inv.customer.id,
                    code: inv.customer.code,
                    name: inv.customer.name,
                    taxId: inv.customer.tax_id,
                    branch: inv.customer.branch,
                    phone: inv.customer.phone,
                    fax: inv.customer.fax,
                    address: inv.customer.address,
                    creditTerm: inv.customer.credit_term
                } : inv.customer_snapshot,
                customerSnapshot: inv.customer_snapshot,
                referenceNo: inv.reference_no,
                purchaseOrderId: inv.purchase_order_id,
                creditDays: inv.credit_days,
                dueDate: inv.due_date,
                subtotal: Number(inv.subtotal),
                discount: Number(inv.discount),
                vatRate: Number(inv.vat_rate),
                vatAmount: Number(inv.vat_amount),
                grandTotal: Number(inv.grand_total),
                bahtText: inv.baht_text,
                notes: inv.notes,
                adjustments: inv.adjustments || [],
                status: inv.status,
                items: items.map(item => ({
                    id: item.id,
                    productName: item.product_name,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    pricePerUnit: Number(item.price_per_unit),
                    amount: Number(item.amount)
                }))
            };
        } catch (error) {
            console.error('Error fetching invoice:', error);
            return null;
        }
    },

    // Create Invoice with Items
    createInvoice: async (invoiceData, items) => {
        try {
            // 1. Insert Invoice
            const dbInv = {
                invoice_no: invoiceData.invoiceNo,
                date: invoiceData.date,
                customer_id: invoiceData.customerId || null,
                reference_no: invoiceData.referenceNo,
                purchase_order_id: invoiceData.purchaseOrderId || null,
                credit_days: invoiceData.creditDays,
                due_date: invoiceData.dueDate,
                subtotal: invoiceData.subtotal,
                discount: invoiceData.discount,
                vat_rate: invoiceData.vatRate,
                vat_amount: invoiceData.vatAmount,
                grand_total: invoiceData.grandTotal,
                baht_text: invoiceData.bahtText,
                notes: invoiceData.notes,
                adjustments: invoiceData.adjustments || [],
                status: invoiceData.status || 'Draft',
                customer_snapshot: invoiceData.customerSnapshot || null
            };

            const { data: inv, error: invError } = await supabase
                .from('invoices')
                .insert([dbInv])
                .select()
                .single();

            if (invError) throw invError;

            // 2. Insert Items
            const dbItems = items.map((item, index) => ({
                invoice_id: inv.id,
                product_name: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                price_per_unit: item.pricePerUnit,
                amount: item.amount,
                sort_order: index
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(dbItems);

            if (itemsError) throw itemsError;

            // 3. Update PO status if linked
            if (inv.purchase_order_id) {
                await purchaseOrderService.updatePurchaseOrderStatus(inv.purchase_order_id);
            }

            return inv;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    },

    // Update Invoice
    updateInvoice: async (id, invoiceData, items) => {
        try {
            // 0. Get old invoice to check for PO changes
            const { data: oldInv } = await supabase
                .from('invoices')
                .select('purchase_order_id')
                .eq('id', id)
                .single();

            // 1. Update Invoice
            const dbInv = {
                invoice_no: invoiceData.invoiceNo,
                date: invoiceData.date,
                customer_id: invoiceData.customerId || null,
                reference_no: invoiceData.referenceNo,
                purchase_order_id: invoiceData.purchaseOrderId || null,
                credit_days: invoiceData.creditDays,
                due_date: invoiceData.dueDate,
                subtotal: invoiceData.subtotal,
                discount: invoiceData.discount,
                vat_rate: invoiceData.vatRate,
                vat_amount: invoiceData.vatAmount,
                grand_total: invoiceData.grandTotal,
                baht_text: invoiceData.bahtText,
                notes: invoiceData.notes,
                adjustments: invoiceData.adjustments || [],
                status: invoiceData.status,
                customer_snapshot: invoiceData.customerSnapshot || null,
                updated_at: new Date().toISOString()
            };

            const { error: invError } = await supabase
                .from('invoices')
                .update(dbInv)
                .eq('id', id);

            if (invError) throw invError;

            // 2. Sync Items (Delete and Re-insert is simplest for now)
            const { error: delError } = await supabase
                .from('invoice_items')
                .delete()
                .eq('invoice_id', id);

            if (delError) throw delError;

            const dbItems = items.map((item, index) => ({
                invoice_id: id,
                product_name: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                price_per_unit: item.pricePerUnit,
                amount: item.amount,
                sort_order: index
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(dbItems);

            if (itemsError) throw itemsError;

            // 3. Update PO statuses
            if (oldInv && oldInv.purchase_order_id && oldInv.purchase_order_id !== invoiceData.purchaseOrderId) {
                // Update old PO if it changed
                await purchaseOrderService.updatePurchaseOrderStatus(oldInv.purchase_order_id);
            }
            if (invoiceData.purchaseOrderId) {
                // Update new/current PO
                await purchaseOrderService.updatePurchaseOrderStatus(invoiceData.purchaseOrderId);
            }

            return true;
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    },

    // Delete Invoice
    deleteInvoice: async (id) => {
        try {
            // Get invoice to know which PO to update
            const { data: inv } = await supabase
                .from('invoices')
                .select('purchase_order_id')
                .eq('id', id)
                .single();

            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update PO status
            if (inv && inv.purchase_order_id) {
                await purchaseOrderService.updatePurchaseOrderStatus(inv.purchase_order_id);
            }

            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            return false;
        }
    },

    // Get next available invoice number
    getNextInvoiceNo: async () => {
        try {
            const formats = await settingService.getSetting('document_formats');
            // Fallbacks for migration
            const formatStr = formats?.invoice_format || (formats?.invoice_prefix ? `${formats.invoice_prefix}{YY}{MM}{RUN}` : 'IV{YY}{MM}{RUN}');

            const dateFormatted = documentNumberHelper.applyDateFormats(formatStr);
            const searchPrefix = documentNumberHelper.getSearchPrefix(dateFormatted);
            const searchSuffix = documentNumberHelper.getSearchSuffix(dateFormatted);

            const { data, error } = await supabase
                .from('invoices')
                .select('invoice_no, created_at')
                .like('invoice_no', `${searchPrefix}%${searchSuffix}`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            let maxSeq = 0;
            let latestNo = null;

            if (data && data.length > 0) {
                let activeRunLength = -1;

                for (let inv of data) {
                    const runStr = documentNumberHelper.extractRunNumber(inv.invoice_no, formatStr);
                    // Ensure it is strictly digits (e.g. 0007580)
                    if (/^\d+$/.test(runStr)) {
                        if (activeRunLength === -1) {
                            // Adopt the length of the most recently created valid format
                            activeRunLength = runStr.length;
                        }

                        // Find the max sequence ONLY among matching lengths to avoid legacy format collisions
                        if (runStr.length === activeRunLength) {
                            const num = parseInt(runStr, 10);
                            if (!isNaN(num) && num > maxSeq) {
                                maxSeq = num;
                                latestNo = inv.invoice_no;
                            }
                        }
                    }
                }
            }

            const { length } = documentNumberHelper.getRunTokenInfo(formatStr);
            const nextRun = documentNumberHelper.getNextRunNumberString(latestNo, searchPrefix, searchSuffix, length);
            return documentNumberHelper.replaceRunToken(dateFormatted, nextRun);

        } catch (error) {
            console.error('Error generating next invoice no:', error);
            const fallbackFormats = await settingService.getSetting('document_formats');
            const fallbackFormatStr = fallbackFormats?.invoice_format || 'IV{YY}{MM}{RUN}';
            return documentNumberHelper.getPreviewUrl(fallbackFormatStr);
        }
    }
};
