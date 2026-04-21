-- Add document-specific note columns to customers table
ALTER TABLE customers 
ADD COLUMN po_note TEXT,
ADD COLUMN invoice_note TEXT,
ADD COLUMN billing_note_note TEXT,
ADD COLUMN receipt_note TEXT;

COMMENT ON COLUMN customers.po_note IS 'หมายเหตุสำหรับใบสั่งซื้อ (PO)';
COMMENT ON COLUMN customers.invoice_note IS 'หมายเหตุสำหรับใบกำกับภาษี (Invoice)';
COMMENT ON COLUMN customers.billing_note_note IS 'หมายเหตุสำหรับใบวางบิล (Billing Note)';
COMMENT ON COLUMN customers.receipt_note IS 'หมายเหตุสำหรับใบเสร็จรับเงิน (Receipt)';
