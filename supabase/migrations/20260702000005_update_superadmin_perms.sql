UPDATE public.staff_members
SET permissions = '{
  "overview": {"view": true, "create": true, "edit": true, "delete": true},
  "customers": {"view": true, "create": true, "edit": true, "delete": true},
  "suppliers": {"view": true, "create": true, "edit": true, "delete": true},
  "supplier_pos": {"view": true, "create": true, "edit": true, "delete": true},
  "warehouses": {"view": true, "create": true, "edit": true, "delete": true},
  "certificates": {"view": true, "create": true, "edit": true, "delete": true},
  "purchase_orders": {"view": true, "create": true, "edit": true, "delete": true},
  "quotations": {"view": true, "create": true, "edit": true, "delete": true},
  "invoices": {"view": true, "create": true, "edit": true, "delete": true},
  "billing": {"view": true, "create": true, "edit": true, "delete": true},
  "certificate_receipts": {"view": true, "create": true, "edit": true, "delete": true},
  "envelopes": {"view": true, "create": true, "edit": true, "delete": true},
  "employees": {"view": true, "create": true, "edit": true, "delete": true},
  "company": {"view": true, "create": true, "edit": true, "delete": true},
  "users": {"view": true, "create": true, "edit": true, "delete": true},
  "settings": {"view": true, "create": true, "edit": true, "delete": true},
  "production": {"view": true, "create": true, "edit": true, "delete": true},
  "internal_items": {"view": true, "create": true, "edit": true, "delete": true},
  "internal_requisitions": {"view": true, "create": true, "edit": true, "delete": true},
  "alerts": {"view": true, "create": true, "edit": true, "delete": true}
}'::jsonb
WHERE username = 'superadmin';
