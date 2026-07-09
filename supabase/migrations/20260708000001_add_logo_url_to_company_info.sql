-- Migration to add logo_url to company_info
ALTER TABLE public.company_info ADD COLUMN IF NOT EXISTS logo_url text;
