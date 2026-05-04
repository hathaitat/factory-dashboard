-- Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public access (since we are using custom auth or internal app)
CREATE POLICY "Allow public access" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default work schedule
INSERT INTO public.settings (key, value, description)
VALUES 
    ('work_schedule', '{"start_time": "08:00", "end_time": "17:00"}', 'Default work schedule configuration')
ON CONFLICT (key) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
