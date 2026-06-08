import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkInventory() {
    const { data: inv, error } = await supabase.from('warehouse_inventory').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Warehouse Inventory:', inv.map(i => ({ name: i.product_name, qty: i.quantity, wh: i.warehouse_id })));
    }
}
checkInventory();
