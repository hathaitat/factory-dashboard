import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const PO_ID = 'bf4ce3d1-70ba-4638-a57d-f102381e7be5';

async function check() {
    const { data: po } = await supabase.from('supplier_pos').select('delivery_warehouse_id, po_number').eq('id', PO_ID).single();
    console.log('PO Delivery Warehouse ID:', po.delivery_warehouse_id);
    console.log('PO Number:', po.po_number);
}
check();
