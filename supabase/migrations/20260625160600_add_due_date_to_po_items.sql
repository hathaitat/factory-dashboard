-- Migration: add_due_date_to_purchase_order_items.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'due_date') THEN
        ALTER TABLE public.purchase_order_items ADD COLUMN due_date DATE;
    END IF;
END
$$;
