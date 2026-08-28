-- Disable RLS for customer_forecasts (this app uses custom auth, not Supabase Auth)
ALTER TABLE public.customer_forecasts DISABLE ROW LEVEL SECURITY;
