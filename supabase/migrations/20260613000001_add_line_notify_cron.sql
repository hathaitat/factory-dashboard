-- Migration to set up pg_cron for LINE notifications

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================================
-- IMPORTANT INSTRUCTIONS FOR SETTING UP THE CRON JOB
-- =====================================================================
-- Since the cron job needs to know your exact Supabase URL and Anon Key,
-- you must manually run the following SQL block in your Supabase Dashboard
-- SQL Editor after replacing the placeholders.
--
-- 1. Replace YOUR_PROJECT_REF with your project reference ID
-- 2. Replace YOUR_ANON_KEY with your project's anon key
-- 3. Note on time: '0 1 * * 1,6' means 01:00 UTC, which is 08:00 AM Thailand time (UTC+7).
--    1 = Monday, 6 = Saturday.
-- =====================================================================

/*
SELECT cron.schedule(
  'line-notify-late-tasks-job',
  '0 1 * * 1,6',
  $$
    SELECT net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/line-notify-late-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);
*/

-- To unschedule later if needed, you can run:
-- SELECT cron.unschedule('line-notify-late-tasks-job');

