import { supabase } from './supabaseClient';
import { settingService } from './settingService';
import { documentNumberHelper } from '../utils/documentNumbering';

export const quotationService = {
    // Get all quotations with customer details
    getQuotations: async () => {
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select(`
                    *,
                    customer:customers(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(qt => ({
                id: qt.id,
                quotationNo: qt.quotation_no,
                date: qt.date,
                customerId: qt.customer_id,
                customerName: qt.customer?.name || qt.customer_snapshot?.name || 'Unknown',
                customerSnapshot: qt.customer_snapshot,
                attnName: qt.attn_name,
                validityDays: qt.validity_days,
                paymentCondition: qt.payment_condition,
                deliveryTime: qt.delivery_time,
                subtotal: Number(qt.subtotal),
                discount: Number(qt.discount),
                vatRate: Number(qt.vat_rate),
                vatAmount: Number(qt.vat_amount),
                grandTotal: Number(qt.grand_total),
                status: qt.status,
                costCalculation: qt.cost_calculation || {},
                createdAt: qt.created_at
            }));
        } catch (error) {
            console.error('Error fetching quotations:', error);
            return [];
        }
    },

    // Get single quotation with items
    getQuotationById: async (id) => {
        try {
            const { data: qt, error: qtError } = await supabase
                .from('quotations')
                .select(`
                    *,
                    customer:customers(*)
                `)
                .eq('id', id)
                .single();

            if (qtError) throw qtError;

            const { data: items, error: itemsError } = await supabase
                .from('quotation_items')
                .select('*')
                .eq('quotation_id', id)
                .order('sort_order', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                id: qt.id,
                quotationNo: qt.quotation_no,
                date: qt.date,
                customerId: qt.customer_id,
                customer: qt.customer ? {
                    id: qt.customer.id,
                    code: qt.customer.code,
                    name: qt.customer.name,
                    taxId: qt.customer.tax_id,
                    branch: qt.customer.branch,
                    phone: qt.customer.phone,
                    fax: qt.customer.fax,
                    address: qt.customer.address,
                    creditTerm: qt.customer.credit_term
                } : qt.customer_snapshot,
                customerSnapshot: qt.customer_snapshot,
                attnName: qt.attn_name,
                validityDays: qt.validity_days,
                paymentCondition: qt.payment_condition,
                deliveryTime: qt.delivery_time,
                subtotal: Number(qt.subtotal),
                discount: Number(qt.discount),
                vatRate: Number(qt.vat_rate),
                vatAmount: Number(qt.vat_amount),
                grandTotal: Number(qt.grand_total),
                bahtText: qt.baht_text,
                notes: qt.notes,
                status: qt.status,
                costCalculation: qt.cost_calculation || {},
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
            console.error('Error fetching quotation:', error);
            return null;
        }
    },

    // Create Quotation with Items
    createQuotation: async (quotationData, items) => {
        try {
            // 1. Insert Quotation
            const dbQt = {
                quotation_no: quotationData.quotationNo,
                date: quotationData.date,
                customer_id: quotationData.customerId || null,
                attn_name: quotationData.attnName,
                validity_days: quotationData.validityDays,
                payment_condition: quotationData.paymentCondition,
                delivery_time: quotationData.deliveryTime,
                subtotal: quotationData.subtotal,
                discount: quotationData.discount,
                vat_rate: quotationData.vatRate,
                vat_amount: quotationData.vatAmount,
                grand_total: quotationData.grandTotal,
                baht_text: quotationData.bahtText,
                notes: quotationData.notes,
                status: quotationData.status || 'Draft',
                cost_calculation: quotationData.costCalculation || {},
                customer_snapshot: quotationData.customerSnapshot || null
            };

            const { data: qt, error: qtError } = await supabase
                .from('quotations')
                .insert([dbQt])
                .select()
                .single();

            if (qtError) throw qtError;

            // 2. Insert Items
            if (items && items.length > 0) {
                const dbItems = items.map((item, index) => ({
                    quotation_id: qt.id,
                    product_name: item.productName,
                    quantity: item.quantity,
                    unit: item.unit,
                    price_per_unit: item.pricePerUnit,
                    amount: item.amount,
                    sort_order: index
                }));

                const { error: itemsError } = await supabase
                    .from('quotation_items')
                    .insert(dbItems);

                if (itemsError) throw itemsError;
            }

            // 3. Update Last Number
            // Since sequence relies on looking up the latest dynamically, we do not need to update a sequence table.

            return qt;
        } catch (error) {
            console.error('Error creating quotation:', error);
            if (error.code === '23505') {
                throw new Error('เลขที่ใบเสนอราคานี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
            }
            throw error;
        }
    },

    // Update Quotation with Items
    updateQuotation: async (id, quotationData, items) => {
        try {
            // 1. Update main record
            const dbQt = {
                date: quotationData.date,
                customer_id: quotationData.customerId || null,
                attn_name: quotationData.attnName,
                validity_days: quotationData.validityDays,
                payment_condition: quotationData.paymentCondition,
                delivery_time: quotationData.deliveryTime,
                subtotal: quotationData.subtotal,
                discount: quotationData.discount,
                vat_rate: quotationData.vatRate,
                vat_amount: quotationData.vatAmount,
                grand_total: quotationData.grandTotal,
                baht_text: quotationData.bahtText,
                notes: quotationData.notes,
                status: quotationData.status,
                cost_calculation: quotationData.costCalculation || {},
                customer_snapshot: quotationData.customerSnapshot || null,
                updated_at: new Date().toISOString()
            };

            const { error: qtError } = await supabase
                .from('quotations')
                .update(dbQt)
                .eq('id', id);

            if (qtError) throw qtError;

            // 2. Delete existing items
            const { error: delError } = await supabase
                .from('quotation_items')
                .delete()
                .eq('quotation_id', id);

            if (delError) throw delError;

            // 3. Insert new items
            if (items && items.length > 0) {
                const dbItems = items.map((item, index) => ({
                    quotation_id: id,
                    product_name: item.productName,
                    quantity: item.quantity,
                    unit: item.unit,
                    price_per_unit: item.pricePerUnit,
                    amount: item.amount,
                    sort_order: index
                }));

                const { error: insError } = await supabase
                    .from('quotation_items')
                    .insert(dbItems);

                if (insError) throw insError;
            }

            return true;
        } catch (error) {
            console.error('Error updating quotation:', error);
            if (error.code === '23505') {
                throw new Error('เลขที่ใบเสนอราคานี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
            }
            throw error;
        }
    },

    // Change Quotation Status
    updateStatus: async (id, status) => {
        try {
            const { error } = await supabase
                .from('quotations')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating quotation status:', error);
            throw error;
        }
    },

    // Delete Quotation
    deleteQuotation: async (id) => {
        try {
            const { error } = await supabase
                .from('quotations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting quotation:', error);
            throw error;
        }
    },

    // Get Next Quotation Number
    getNextQuotationNumber: async (date = new Date()) => {
        try {
            const formats = await settingService.getSetting('document_formats');
            const formatStr = formats?.quotation_format || 'QT{YY}{MM}{RUN}';

            const dateFormatted = documentNumberHelper.applyDateFormats(formatStr, date);
            const searchPrefix = documentNumberHelper.getSearchPrefix(dateFormatted);
            const searchSuffix = documentNumberHelper.getSearchSuffix(dateFormatted);

            const { data, error } = await supabase
                .from('quotations')
                .select('quotation_no, created_at')
                .like('quotation_no', `${searchPrefix}%${searchSuffix}`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            let maxSeq = 0;
            let latestNo = null;

            if (data && data.length > 0) {
                let activeRunLength = -1;

                for (let qt of data) {
                    const runStr = documentNumberHelper.extractRunNumber(qt.quotation_no, formatStr, date);
                    if (/^\d+$/.test(runStr)) {
                        if (activeRunLength === -1) {
                            activeRunLength = runStr.length;
                        }

                        if (runStr.length === activeRunLength) {
                            const num = parseInt(runStr, 10);
                            if (!isNaN(num) && num > maxSeq) {
                                maxSeq = num;
                                latestNo = qt.quotation_no;
                            }
                        }
                    }
                }
            }

            const { length } = documentNumberHelper.getRunTokenInfo(formatStr);
            const nextRun = documentNumberHelper.getNextRunNumberString(latestNo, searchPrefix, searchSuffix, length);
            return documentNumberHelper.replaceRunToken(dateFormatted, nextRun);

        } catch (error) {
            console.error('Error generating next quotation no:', error);
            const fallbackFormats = await settingService.getSetting('document_formats');
            const fallbackFormatStr = fallbackFormats?.quotation_format || 'QT{YY}{MM}{RUN}';
            return documentNumberHelper.getPreviewUrl(fallbackFormatStr);
        }
    }
};
