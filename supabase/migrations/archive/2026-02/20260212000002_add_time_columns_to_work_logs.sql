-- Add time tracking fields to work_logs
ALTER TABLE public.work_logs 
ADD COLUMN IF NOT EXISTS start_time TEXT, -- '08:00'
ADD COLUMN IF NOT EXISTS end_time TEXT,   -- '17:00'
ADD COLUMN IF NOT EXISTS late_hours NUMERIC(4, 1) DEFAULT 0.0;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
