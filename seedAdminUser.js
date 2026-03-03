import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import fs from 'fs';

// Manually parse .env since dotenv is not installed
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) {
        env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const password = await bcrypt.hash('admin1234', 10);

    const permissions = {
        overview: { view: true },
        customers: { view: true, create: true, edit: true, delete: true },
        invoices: { view: true, create: true, edit: true, delete: true },
        billing: { view: true, create: true, edit: true, delete: true },
        employees: { view: true, create: true, edit: true, delete: true },
        company: { view: true, create: true, edit: true, delete: true },
        users: { view: true, create: true, edit: true, delete: true },
        settings: { view: true },
        production: { view: true, create: true, edit: true, delete: true }
    };

    const newAdmin = {
        full_name: 'Super Admin',
        email: 'superadmin@factory.com',
        username: 'superadmin',
        password,
        permissions
    };

    const { data: existing } = await supabase.from('staff_members').select('*').eq('username', 'superadmin').maybeSingle();

    if (!existing) {
        const { error } = await supabase.from('staff_members').insert([newAdmin]);
        if (error) throw error;
        console.log('Created superadmin user successfully.');
    } else {
        const { error } = await supabase.from('staff_members').update({ permissions, password }).eq('username', 'superadmin');
        if (error) throw error;
        console.log('Updated superadmin user successfully.');
    }
}

main().catch(console.error);
