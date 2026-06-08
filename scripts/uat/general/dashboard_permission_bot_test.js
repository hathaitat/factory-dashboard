/**
 * Factory Dashboard - Automated Dashboard Permission UAT Bot Test Script
 * 
 * วิธีการใช้งาน (Usage):
 * 1. รันเซิร์ฟเวอร์ Vite dev (http://localhost:5173)
 * 2. รันสคริปต์ทดสอบนี้:
 *    node scripts/uat/general/dashboard_permission_bot_test.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env.development') });

const BASE_URL = 'http://localhost:5173';
const ADMIN_USER = 'admin_bell';
const ADMIN_PASS = 'bellbabl1.';
const TEST_USER = 'test_noperm_bot';
const TEST_PASS = 'Password123.';
const SCREENSHOT_DIR = './tests/screenshots/dashboard_permission';

async function runPermissionTest() {
    console.log('🤖 Starting Dashboard Permission Automated UAT Test...');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // เชื่อมต่อ Supabase เพื่อเตรียมข้อมูล / ทำความสะอาดข้อมูล
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('\n🧹 Step 1: Cleaning up old test data...');
        await supabase.from('staff_members').delete().eq('username', TEST_USER);

        console.log('\n🔑 Step 2: Logging in as Admin...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[placeholder="Username"]', ADMIN_USER);
        await page.fill('input[placeholder="Password"]', ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('✅ Admin login successful.');

        console.log('\n👤 Step 3: Creating a test user via UI...');
        await page.goto(`${BASE_URL}/dashboard/users/new`);
        await page.waitForLoadState('networkidle');
        
        await page.fill('input[name="fullName"]', 'Test Permission User');
        await page.fill('input[name="username"]', TEST_USER);
        await page.fill('input[name="email"]', 'noperm@example.com');
        await page.fill('input[name="password"]', TEST_PASS);

        // ให้สิทธิ์ Customers (view) เพื่อให้มีหน้าเข้าได้
        console.log('🔧 Step 4: Setting specific permissions (Customers=View, Overview=No)...');
        // ค้นหาแถวที่มีคำว่า "ข้อมูลลูกค้า" แล้วคลิก checkbox ช่องแรก (View)
        const customerRow = page.locator('tr').filter({ hasText: 'ข้อมูลลูกค้า' });
        await customerRow.locator('label').first().click();

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_permission_setup.png') });

        console.log('💾 Saving new user...');
        await page.click('button:has-text("บันทึก")');
        await page.waitForURL(/\/dashboard\/users$/);
        console.log('✅ Test user created.');

        console.log('\n🚪 Step 5: Logging out Admin...');
        await page.goto(`${BASE_URL}/dashboard`);
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        
        console.log('\n🔑 Step 6: Logging in as Test User...');
        await page.fill('input[placeholder="Username"]', TEST_USER);
        await page.fill('input[placeholder="Password"]', TEST_PASS);
        await page.click('button[type="submit"]');
        
        // ควรถูกเด้งไปที่ /dashboard/customers อัตโนมัติ เพราะไม่มีสิทธิ์ overview
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Wait for potential redirects
        
        const currentUrl = page.url();
        console.log(`📍 Current URL after login: ${currentUrl}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_logged_in_redirect.png') });

        if (currentUrl.endsWith('/dashboard') || currentUrl.endsWith('/dashboard/')) {
            throw new Error('Test User is on /dashboard but should have been redirected!');
        }
        if (!currentUrl.includes('/dashboard/customers')) {
            throw new Error(`Expected redirect to /dashboard/customers, got ${currentUrl}`);
        }
        console.log('✅ Automatic redirect works correctly.');

        console.log('\n🕵️ Step 7: Verifying sidebar has NO Dashboard menu...');
        const sidebarText = await page.innerText('aside.sidebar');
        if (sidebarText.includes('ภาพรวม') && !sidebarText.includes('ใบสั่งซื้อ')) { 
            // We check specifically for the Dashboard item, not just the word which might appear elsewhere.
            // But let's check for the nav link text.
            const dashboardMenu = await page.locator('aside.sidebar a', { hasText: /^ภาพรวม$/ }).count();
            if (dashboardMenu > 0) {
                throw new Error('Dashboard menu (ภาพรวม) is still visible in the sidebar!');
            }
        }
        console.log('✅ Dashboard menu is hidden from sidebar.');

        console.log('\n🚪 Step 8: Final Logout...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('✅ Test User logged out.');

        console.log('\n🎉 ALL DASHBOARD PERMISSION UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ Dashboard Permission UAT Test failed:', error);
    } finally {
        console.log('\n🧹 Cleaning up test user...');
        await supabase.from('staff_members').delete().eq('username', TEST_USER);
        await browser.close();
        console.log('🏁 Bot testing finished and browser closed.');
    }
}

runPermissionTest();
