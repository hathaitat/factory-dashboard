import { supabase } from './supabaseClient';

export const purchaseOrderService = {
    // Get all purchase orders
    async getPurchaseOrders() {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                customers (
                name,
                code
                ),
                purchase_order_items (
                    quantity,
                    amount
                ),
                invoices (
                    id,
                    status,
                    invoice_items(
                        quantity
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate totals for each PO
        return data.map(po => {
            // Total PO quantity & Amount
            const totalPOQuantity = po.purchase_order_items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
            const totalPOAmount = po.purchase_order_items?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;

            // Total delivered quantity from non-cancelled invoices
            let totalDeliveredQuantity = 0;
            if (po.invoices && po.invoices.length > 0) {
                const validInvoices = po.invoices.filter(inv => inv.status !== 'Cancelled');
                validInvoices.forEach(inv => {
                    if (inv.invoice_items) {
                        totalDeliveredQuantity += inv.invoice_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                    }
                });
            }

            return {
                ...po,
                total_po_quantity: totalPOQuantity,
                total_po_amount: totalPOAmount,
                total_delivered_quantity: totalDeliveredQuantity
            };
        });
    },

    // Get single purchase order by ID
    async getPurchaseOrderById(id) {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
        *,
        customers (
          name,
          code,
          address,
          tax_id
        ),
        purchase_order_items (*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        // Sort items
        if (data && data.purchase_order_items) {
            data.purchase_order_items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        }
        return data;
    },

    // Get purchase orders by customer ID
    async getPurchaseOrdersByCustomer(customerId) {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('customer_id', customerId)
            .order('issue_date', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Get upcoming deliveries (POs due today or soon)
    async getUpcomingDeliveries() {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
        id, po_number, due_date, status,
        customers (name)
      `)
            .not('status', 'eq', 'Completed')
            .not('status', 'eq', 'Cancelled')
            .lte('due_date', today)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data;
    },

    // Create a new purchase order
    async createPurchaseOrder(poData, items) {
        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert([poData])
            .select()
            .single();

        if (poError) throw poError;

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item, index) => ({
                ...item,
                po_id: po.id,
                sort_order: index
            }));

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return po;
    },

    // Update existing purchase order
    async updatePurchaseOrder(id, poData, items) {
        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .update(poData)
            .eq('id', id)
            .select()
            .single();

        if (poError) throw poError;

        if (items) {
            // Delete existing items
            const { error: deleteError } = await supabase
                .from('purchase_order_items')
                .delete()
                .eq('po_id', id);

            if (deleteError) throw deleteError;

            // Insert new items
            if (items.length > 0) {
                const itemsToInsert = items.map((item, index) => ({
                    ...item,
                    po_id: id,
                    sort_order: index
                }));

                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }
        }

        return po;
    },

    // Delete purchase order
    async deletePurchaseOrder(id) {
        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // Upload PO document file
    async uploadFile(file, poId) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${poId}-${Math.random()}.${fileExt}`;
        const filePath = `po-documents/${fileName}`;

        // Ensure bucket exists in your Supabase admin panel, or create if needed
        // for this example, we assume a bucket named 'documents'
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (error) throw error;

        // Get public url
        const { data: publicURLData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        return publicURLData.publicUrl;
    },

    // Recalculate and update PO status based on linked Invoices
    async updatePurchaseOrderStatus(poId) {
        if (!poId) return;

        try {
            // 1. Get PO items
            const { data: poItems, error: poItemsError } = await supabase
                .from('purchase_order_items')
                .select('product_name, quantity')
                .eq('po_id', poId);

            if (poItemsError) throw poItemsError;
            if (!poItems || poItems.length === 0) return;

            // 2. Get all non-cancelled invoices linked to this PO
            const { data: invoices, error: invError } = await supabase
                .from('invoices')
                .select('id, status')
                .eq('purchase_order_id', poId)
                .neq('status', 'Cancelled');

            if (invError) throw invError;

            let totalInvoicedQuantity = 0;
            let totalPOQuantity = poItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

            if (invoices && invoices.length > 0) {
                const invoiceIds = invoices.map(inv => inv.id);
                // 3. Get invoice items for these invoices
                const { data: invItems, error: invItemsError } = await supabase
                    .from('invoice_items')
                    .select('quantity')
                    .in('invoice_id', invoiceIds);

                if (invItemsError) throw invItemsError;

                if (invItems) {
                    totalInvoicedQuantity = invItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
                }
            }

            // 4. Determine new status
            let newStatus = 'Pending';
            if (totalInvoicedQuantity > 0) {
                if (totalInvoicedQuantity >= totalPOQuantity) {
                    newStatus = 'Completed';
                } else {
                    newStatus = 'In Progress';
                }
            }

            // 5. Update PO status
            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({ status: newStatus })
                .eq('id', poId);

            if (updateError) throw updateError;

            return newStatus;
        } catch (error) {
            console.error('Error updating PO status:', error);
            return null; // Don't throw to avoid breaking invoice flow
        }
    }
};
