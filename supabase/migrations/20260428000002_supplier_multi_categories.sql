-- Add category_ids column to store multiple categories as JSON array
-- (e.g. [1, 3, 5])
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS category_ids TEXT DEFAULT '[]';

-- Migrate existing single category_id data to category_ids
UPDATE public.suppliers 
SET category_ids = CASE 
    WHEN category_id IS NOT NULL THEN '[' || category_id || ']'
    ELSE '[]'
END
WHERE category_ids = '[]' OR category_ids IS NULL;
