import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPO() {
    console.log('Starting test PO creation...');

    try {
        // 1. Check or create the customer
        let customerId;
        const { data: existingCustomers, error: customerSearchError } = await supabase
            .from('customers')
            .select('id')
            .ilike('name', '%บริษัท จี.ไอ.เอฟ. เอ็นจิเนียริ่ง%') // Main company on header
            .limit(1);

        if (customerSearchError) throw customerSearchError;

        if (existingCustomers && existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;
            console.log('Found existing customer ID:', customerId);
        } else {
            console.log('Customer not found, creating new customer...');
            const { data: newCustomer, error: insertCustomerError } = await supabase
                .from('customers')
                .insert({
                    code: 'CUST-TEST-001',
                    name: 'บริษัท จี.ไอ.เอฟ. เอ็นจิเนียริ่ง จำกัด',
                    tax_id: '0105535027242',
                    address: '434/1-2 ซอยวัดไผ่เงิน ถนนจันทน์ แขวงบางโคล่ เขตบางคอแหลม กรุงเทพฯ 10120',
                    phone: '02-6731513-5'
                })
                .select()
                .single();

            if (insertCustomerError) throw insertCustomerError;
            customerId = newCustomer.id;
            console.log('Created new customer with ID:', customerId);
        }

        // 2. Create the Purchase Order
        console.log('Creating Purchase Order...');
        const { data: newPO, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                po_number: '26PO110203018',
                issue_date: '2026-02-03',
                due_date: '2026-03-04',
                customer_id: customerId,
                status: 'Pending',
                notes: 'สถานที่ส่งของ: 420/1 ซอยวัดไผ่เงิน ถนนจันทน์ แขวงบางโคล่\nหมายเหตุ: โปรดระบุเลขประจำตัวผู้เสียภาษี 13 หลัก และสาขาที่เปิดใบกำกับภาษีให้บริษัทฯด้วยทุกครั้ง'
            })
            .select()
            .single();

        if (poError) throw poError;
        console.log('Created PO successfully with ID:', newPO.id);

        // 3. Create PO Items
        console.log('Adding PO items...');
        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert([
                {
                    po_id: newPO.id,
                    product_name: '8-GX3T039F00 / GX3T039F00 ROD',
                    quantity: 10000,
                    unit: 'ชิ้น',
                    price_per_unit: 7.10,
                    amount: 71000,
                    sort_order: 0
                }
            ]);

        if (itemsError) throw itemsError;
        console.log('Added PO items successfully.');

        console.log('\n✅ Test Data Created Successfully!');
        console.log('PO Number:', '26PO110203018');
        console.log('Customer:', 'บริษัท จี.ไอ.เอฟ. เอ็นจิเนียริ่ง จำกัด');

    } catch (error) {
        console.error('Error creating test data:', error);
    }
}

createTestPO();
