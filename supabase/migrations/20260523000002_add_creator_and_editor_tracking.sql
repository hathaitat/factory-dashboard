-- Add created_by and updated_by columns to various tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.warehouse_inventory ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.warehouse_inventory ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.internal_items ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.internal_items ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.internal_requisitions ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.internal_requisitions ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.billing_notes ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.billing_notes ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.supplier_pos ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE public.supplier_pos ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.customer_products ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.inventory_bom_rules ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.inventory_bom_rules ADD COLUMN IF NOT EXISTS updated_by text;
