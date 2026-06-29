-- Migration: add_delivery_schedule.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'delivery_schedule') THEN
        ALTER TABLE public.purchase_order_items ADD COLUMN delivery_schedule JSONB DEFAULT '[]'::jsonb;
    END IF;
END
$$;
