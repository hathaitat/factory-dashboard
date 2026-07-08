-- Add processes_template to production_lines to store master process configuration for the line
ALTER TABLE public.production_lines 
ADD COLUMN IF NOT EXISTS processes_template JSONB DEFAULT '[]'::jsonb;
