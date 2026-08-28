-- Deduplicate warehouse_inventory by combining quantities for the same warehouse_id and sku
WITH duplicates AS (
    SELECT 
        warehouse_id, 
        sku, 
        MIN(id::text)::uuid as keep_id,
        SUM(quantity) as total_quantity
    FROM public.warehouse_inventory
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY warehouse_id, sku
    HAVING COUNT(*) > 1
)
UPDATE public.warehouse_inventory w
SET quantity = d.total_quantity
FROM duplicates d
WHERE w.id = d.keep_id;

-- Delete the extra rows that were not kept
WITH duplicates AS (
    SELECT 
        warehouse_id, 
        sku, 
        MIN(id::text)::uuid as keep_id
    FROM public.warehouse_inventory
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY warehouse_id, sku
    HAVING COUNT(*) > 1
)
DELETE FROM public.warehouse_inventory w
USING duplicates d
WHERE w.warehouse_id = d.warehouse_id 
  AND w.sku = d.sku 
  AND w.id != d.keep_id;

-- Add a unique constraint to prevent future duplicates (treating empty string as NULL for uniqueness purposes if necessary, but typically we just enforce it on non-null/non-empty)
-- We will use a UNIQUE INDEX that ignores NULLs and empty strings
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_inventory_warehouse_sku_idx 
ON public.warehouse_inventory (warehouse_id, sku) 
WHERE sku IS NOT NULL AND sku != '';
