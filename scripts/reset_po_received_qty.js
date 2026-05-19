import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PO_ID = 'bf4ce3d1-70ba-4638-a57d-f102381e7be5';

async function resetPO() {
    console.log(`🤖 Resetting PO ${PO_ID} for UAT testing...`);

    try {
        // 1. Reset supplier_po_items received_quantity to 0
        const { error: itemsError } = await supabase
            .from('supplier_po_items')
            .update({ received_quantity: 0 })
            .eq('po_id', PO_ID);

        if (itemsError) throw itemsError;
        console.log('✅ Reset supplier_po_items received_quantity to 0');

        // 2. Reset supplier_pos status to 'Draft' and total_received_quantity to 0
        const { error: poError } = await supabase
            .from('supplier_pos')
            .update({
                status: 'Draft',
                total_received_quantity: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', PO_ID);

        if (poError) throw poError;
        console.log('✅ Reset supplier_pos status to "Draft" and total_received_quantity to 0');

        console.log('🎉 Reset successful! PO is ready for testing.');
    } catch (error) {
        console.error('❌ Error resetting PO:', error);
        process.exit(1);
    }
}

resetPO();
