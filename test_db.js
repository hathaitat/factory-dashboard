import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: logs } = await supabase.from('production_daily_logs').select('*').eq('plan_id', '0f0d24bc-5dd9-4d82-8c1a-930b08193077');
  console.log('Logs:', logs);
}
run();
