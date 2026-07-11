import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  console.log('Fixing plan...');
  const res1 = await supabase.from('production_plans').update({
    product_code: 'CHOPPER-SET',
    target_warehouse_id: '88ad04b7-2b3c-45ab-866c-5b81e414aacf'
  }).eq('id', '0f0d24bc-5dd9-4d82-8c1a-930b08193077');
  console.log('Plan fix:', res1.error ? res1.error : 'Success');

  console.log('Fixing inventory...');
  // We need to fetch current quantity first
  const { data: inv } = await supabase.from('warehouse_inventory').select('quantity').eq('id', '3e78d423-96de-44bf-b03e-7d142bc6117a').single();
  const res2 = await supabase.from('warehouse_inventory').update({
    quantity: (inv.quantity || 0) + 4
  }).eq('id', '3e78d423-96de-44bf-b03e-7d142bc6117a');
  console.log('Inventory fix:', res2.error ? res2.error : 'Success');
}
run();
