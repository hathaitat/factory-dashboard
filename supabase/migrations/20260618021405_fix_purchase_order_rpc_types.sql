-- Fix for update_invoice_with_items casting purchase_order_id to BIGINT when it is actually UUID.

CREATE OR REPLACE FUNCTION update_invoice_with_items(
    p_invoice_id UUID,
    p_invoice_data JSONB,
    p_items JSONB
) RETURNS VOID AS $$
DECLARE
    v_item JSONB;
BEGIN
    UPDATE invoices
    SET 
        invoice_no = p_invoice_data->>'invoice_no',
        date = (p_invoice_data->>'date')::DATE,
        customer_id = (p_invoice_data->>'customer_id')::BIGINT,
        reference_no = p_invoice_data->>'reference_no',
        purchase_order_id = NULLIF(p_invoice_data->>'purchase_order_id', '')::UUID,
        credit_days = (p_invoice_data->>'credit_days')::INTEGER,
        due_date = (p_invoice_data->>'due_date')::DATE,
        subtotal = (p_invoice_data->>'subtotal')::NUMERIC,
        discount = (p_invoice_data->>'discount')::NUMERIC,
        vat_rate = (p_invoice_data->>'vat_rate')::NUMERIC,
        vat_amount = (p_invoice_data->>'vat_amount')::NUMERIC,
        grand_total = (p_invoice_data->>'grand_total')::NUMERIC,
        baht_text = p_invoice_data->>'baht_text',
        notes = p_invoice_data->>'notes',
        adjustments = p_invoice_data->'adjustments',
        status = p_invoice_data->>'status',
        customer_snapshot = p_invoice_data->'customer_snapshot',
        updated_at = (p_invoice_data->>'updated_at')::TIMESTAMPTZ,
        updated_by = p_invoice_data->>'updated_by'
    WHERE id = p_invoice_id;

    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO invoice_items (
            invoice_id, product_name, quantity, unit, price_per_unit, amount, sort_order
        ) VALUES (
            p_invoice_id,
            v_item->>'product_name',
            (v_item->>'quantity')::NUMERIC,
            v_item->>'unit',
            (v_item->>'price_per_unit')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            (v_item->>'sort_order')::INTEGER
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
