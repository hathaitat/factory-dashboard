-- Migration: Add billing address to customers

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS billing_attention text,
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS billing_phone text;
