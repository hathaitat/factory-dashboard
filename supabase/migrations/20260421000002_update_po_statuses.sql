-- Update PO Statuses
UPDATE purchase_orders SET status = 'Waiting' WHERE status = 'Pending';
UPDATE purchase_orders SET status = 'Progressing' WHERE status = 'In Progress';
