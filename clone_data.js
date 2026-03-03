import { createClient } from '@supabase/supabase-js';

// Configuration
const SRC_URL = 'https://ahhosopeejidjzsfxpts.supabase.co';
const SRC_KEY = 'sb_publishable_vqvx0LXVlHFE77DEf_e-KQ_S_bNm8DT';

const DEST_URL = 'https://vpiwrwplzyymwovitjwj.supabase.co';
const DEST_KEY = 'sb_publishable_oHcE3pkfkLx2zuykxaQHzg_WwaFsW5o';

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

// Tables in order (parents first)
const TABLES = [
    { name: 'settings', conflict: 'key' },
    { name: 'company_info', conflict: 'id' },
    { name: 'staff_members', conflict: 'username' },
    { name: 'customers', conflict: 'id' },
    { name: 'employees', conflict: 'id' },
    { name: 'invoices', conflict: 'id' },
    { name: 'invoice_items', conflict: 'id' },
    { name: 'purchase_orders', conflict: 'id' },
    { name: 'purchase_order_items', conflict: 'id' },
    { name: 'billing_notes', conflict: 'id' },
    { name: 'billing_note_items', conflict: 'id' },
    { name: 'work_logs', conflict: 'id' },
];

// Delete in reverse order (children first)
const DELETE_ORDER = [...TABLES].reverse().map(t => t.name);

async function clearAll() {
    console.log('\n=== CLEARING TEST DATABASE ===\n');
    for (const name of DELETE_ORDER) {
        try {
            // Try numeric id first, then use a broad filter
            let result = await dest.from(name).delete().gte('id', 0);
            if (result.error) {
                result = await dest.from(name).delete().neq('key', '___none___');
            }
            if (result.error) {
                console.warn(`  ⚠ ${name}: ${result.error.message}`);
            } else {
                console.log(`  ✓ ${name} cleared`);
            }
        } catch (e) {
            console.warn(`  ⚠ ${name}: ${e.message}`);
        }
    }
}

async function cloneTable({ name, conflict }) {
    console.log(`\nCloning ${name}...`);

    const { data: records, error } = await src.from(name).select('*');
    if (error) {
        console.error(`  ✗ Fetch: ${error.message}`);
        return;
    }
    if (!records?.length) {
        console.log(`  (empty)`);
        return;
    }

    // Insert one by one to handle any constraint issues
    let ok = 0, fail = 0;
    for (const record of records) {
        const { error: e } = await dest.from(name).upsert(record, {
            onConflict: conflict,
            ignoreDuplicates: false
        });
        if (e) {
            // Try plain insert if upsert fails
            const { error: e2 } = await dest.from(name).insert(record);
            if (e2) {
                fail++;
                if (fail <= 3) console.error(`  ✗ ${e2.message}`);
            } else {
                ok++;
            }
        } else {
            ok++;
        }
    }

    console.log(`  ✓ ${ok}/${records.length} records${fail > 0 ? ` (${fail} failed)` : ''}`);
}

async function run() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  Clone Production → Test (Full Copy)     ║');
    console.log('╚══════════════════════════════════════════╝');

    await clearAll();

    console.log('\n=== CLONING ===');
    for (const table of TABLES) {
        await cloneTable(table);
    }

    console.log('\n✅ Clone complete!');
    console.log('\n⚠ ต้องรัน SQL บน Test DB:');
    console.log("   1. รัน security_fix.sql");
    console.log("   2. UPDATE staff_members SET password = extensions.crypt('Maw2025!', extensions.gen_salt('bf')), failed_login_attempts = 0, lockout_until = NULL WHERE username = 'admin_bell';");
}

run().catch(console.error);
