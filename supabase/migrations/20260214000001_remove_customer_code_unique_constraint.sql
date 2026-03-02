-- Remove unique constraint on customer code
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_code_key;
