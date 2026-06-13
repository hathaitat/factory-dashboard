-- Add sku column to customer_products table
ALTER TABLE customer_products ADD COLUMN IF NOT EXISTS sku text;
