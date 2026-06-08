import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env.development') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const testPo = {
        po_number: 'VPO2605001',
        supplier_id: 1, // Let's use any valid supplier id or a fallback. Wait, we can look up a valid supplier first or not set it if it's nullable, but it has REFERENCES suppliers(id). Let's fetch a supplier ID first.
        date: new Date().toISOString().split('T')[0],
        status: 'Draft'
    };

    // Fetch a supplier first
    const { data: suppliers } = await supabase.from('suppliers').select('id').limit(1);
    if (suppliers && suppliers.length > 0) {
        testPo.supplier_id = suppliers[0].id;
    }

    console.log('Inserting test PO:', testPo);
    const { data: poResult, error: poError } = await supabase
        .from('supplier_pos')
        .insert([testPo])
        .select();

    console.log('Insert result:', { poResult, poError });

    const { data: pos, error } = await supabase
        .from('supplier_pos')
        .select('id, po_number, created_at')
        .ilike('po_number', 'VPO%')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log('Query result:', { pos, error });

    if (error) {
        console.error('Error fetching POs:', error);
    } else {
        console.log('Last 20 POs:');
        console.log(pos);
    }
}
check();
