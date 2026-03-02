import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const password = await bcrypt.hash('password123', 10);

    const adminUser = {
        full_name: 'Admin User',
        email: 'admin@test.com',
        username: 'admin',
        password,
        permissions: {
            customers: { view: true, create: true, edit: true, delete: true },
            invoices: { view: true, create: true, edit: true, delete: true },
            billing: { view: true, create: true, edit: true, delete: true },
            users: { view: true, create: true, edit: true, delete: true },
            company: { view: true, create: true, edit: true, delete: true },
            production: { view: true, create: true, edit: true, delete: true },
            employees: { view: true, create: true, edit: true, delete: true }
        }
    };

    const restrictedUser = {
        full_name: 'Viewer User',
        email: 'viewer@test.com',
        username: 'viewer',
        password,
        permissions: {
            customers: { view: true, create: false, edit: false, delete: false },
            invoices: { view: true, create: false, edit: false, delete: false },
            employees: { view: true, create: false, edit: false, delete: false }
            // no access to billing, users, company, production
        }
    };

    // check if admin exists
    const { data: existingAdmin } = await supabase.from('staff_members').select('*').eq('username', 'admin').maybeSingle();
    if (!existingAdmin) {
        await supabase.from('staff_members').insert([adminUser]);
        console.log('Created admin user');
    } else {
        await supabase.from('staff_members').update({ permissions: adminUser.permissions, password }).eq('username', 'admin');
        console.log('Updated admin user');
    }

    const { data: existingViewer } = await supabase.from('staff_members').select('*').eq('username', 'viewer').maybeSingle();
    if (!existingViewer) {
        await supabase.from('staff_members').insert([restrictedUser]);
        console.log('Created viewer user');
    } else {
        await supabase.from('staff_members').update({ permissions: restrictedUser.permissions, password }).eq('username', 'viewer');
        console.log('Updated viewer user');
    }
}

main().catch(console.error);
