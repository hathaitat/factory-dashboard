/**
 * Factory Dashboard - Automated User Permissions UAT Bot Test Script
 * 
 * Usage:
 * 1. Start Vite dev server (http://localhost:5173)
 * 2. Run this script:
 *    node scripts/uat/general/user_permissions_bot_test.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env.development') });

const BASE_URL = 'http://localhost:5173';
const USERNAME = 'admin_bell';
const PASSWORD = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots/user_permissions';

async function runUserPermissionsTest() {
    console.log('🤖 Starting User Permissions Automated UAT Test...');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 500 
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    try {
        // --- Step 1: Login ---
        console.log(`\n🔑 Step 1: Logging in at ${BASE_URL}/login...`);
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder="Username"]', USERNAME);
        await page.fill('input[placeholder="Password"]', PASSWORD);
        await page.click('button.login-btn');

        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('🎉 Login Successful!');
        await page.waitForTimeout(1000);

        // --- Step 2: Navigate to User Permissions List (SETUP-08-01) ---
        console.log('\n📌 Step 2: Navigating to User Permissions List page...');
        await page.click('text=ตั้งค่าระบบ');
        await page.waitForTimeout(500);
        await page.click('text=สิทธิ์การใช้งาน');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_listing_page.png') });

        // Validate table headers (SETUP-08-01)
        console.log('✅ Checking table columns (จัดการ, ชื่อ-นามสกุล, Username, เข้าใช้งานล่าสุด)...');
        const headerText = await page.textContent('thead');
        if (!headerText.includes('จัดการ') || !headerText.includes('ชื่อ - นามสกุล') || !headerText.includes('Username') || !headerText.includes('เข้าใช้งานล่าสุด')) {
            throw new Error('Table headers are missing required columns.');
        }

        // --- Step 3: Verify Super Admin No Delete (SETUP-08-03) ---
        console.log('\n🛡️ Step 3: Verifying Super Admin row...');
        // Find row that has 'superadmin' text or SUPERADMIN badge
        const superadminRow = page.locator('tr').filter({ hasText: 'SUPERADMIN' });
        await superadminRow.waitFor();
        const deleteBtnExists = await superadminRow.locator('.action-delete').isVisible().catch(() => false);
        if (deleteBtnExists) {
            throw new Error('Super Admin row should not have a delete button!');
        }
        console.log('✅ Super Admin row has no delete button as expected.');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_superadmin_row.png') });

        // --- Step 4: Create new user (SETUP-08-07, SETUP-08-08) ---
        console.log('\n➕ Step 4: Creating a test user...');
        await page.click('text=เพิ่มผู้ใช้งาน');
        await page.waitForLoadState('networkidle');

        const testUserName = `BotUser_${Date.now()}`;
        await page.fill('input[name="fullName"]', testUserName);
        await page.fill('input[name="username"]', `bot_${Date.now()}`);
        await page.fill('input[name="password"]', 'password123');
        await page.fill('input[name="email"]', 'bot@example.com');

        // Toggle some permissions
        console.log('✅ Toggling permissions...');
        const customerRow = page.locator('tr', { hasText: 'ข้อมูลลูกค้า' });
        await customerRow.locator('td').nth(1).locator('label').click(); // View
        await customerRow.locator('td').nth(2).locator('label').click(); // Create
        
        const inventoryRow = page.locator('tr', { hasText: 'คลังสินค้า' });
        await inventoryRow.locator('td').nth(1).locator('label').click(); // View
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_user_form.png') });

        console.log('💾 Saving user...');
        await page.click('button:has-text("บันทึกข้อมูล")');
        await page.waitForURL('**/dashboard/users');
        console.log(`✅ User ${testUserName} created successfully.`);

        // --- Step 5: View Details via Eye Icon (SETUP-08-04) ---
        console.log('\n👁️ Step 5: Viewing details via Eye Icon...');
        await page.fill('input[placeholder="ค้นหาชื่อ หรือ username..."]', testUserName);
        await page.waitForTimeout(1000);
        
        const userRow = page.locator('tr').filter({ hasText: testUserName });
        await userRow.locator('.action-view').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        console.log('✅ Verifying details page content (SETUP-08-06)...');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_details_eye.png') });
        
        const detailsContent = await page.textContent('body');
        if (!detailsContent.includes('เข้าใช้งานล่าสุด') || !detailsContent.includes('ตารางกำหนดสิทธิ์การเข้าใช้งาน')) {
            throw new Error('Details page is missing required sections.');
        }

        // Check creator info (SETUP-08-09)
        if (detailsContent.includes('สร้างโดย:')) {
            console.log('✅ Creator/Editor info is displayed.');
        }

        console.log('🔙 Going back to list...');
        await page.click('text=ย้อนกลับ');
        await page.waitForLoadState('networkidle');

        // --- Step 6: View Details via Name Link (SETUP-08-05) ---
        console.log('\n🔗 Step 6: Viewing details via Name Link...');
        await page.fill('input[placeholder="ค้นหาชื่อ หรือ username..."]', testUserName);
        await page.waitForTimeout(1000);
        
        const nameLink = page.locator('tr').filter({ hasText: testUserName }).locator(`span:has-text("${testUserName}")`);
        await nameLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        console.log('✅ Successfully navigated to details via Name Link.');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_details_name_link.png') });

        console.log('🔙 Going back to list...');
        await page.click('text=ย้อนกลับ');
        await page.waitForLoadState('networkidle');

        // --- Step 7: Delete Test User ---
        console.log('\n🗑️ Step 7: Deleting test user...');
        await page.fill('input[placeholder="ค้นหาชื่อ หรือ username..."]', testUserName);
        await page.waitForTimeout(1000);
        
        const targetRow = page.locator('tr').filter({ hasText: testUserName });
        await targetRow.locator('.action-delete').click();
        
        await page.waitForSelector('button:has-text("ยืนยัน")');
        await page.click('button:has-text("ยืนยัน")');
        await page.waitForTimeout(1500); // Wait for API
        
        console.log(`✅ Test user ${testUserName} deleted.`);

        // --- Step 8: Logout ---
        console.log('\n🚪 Step 8: Logging out...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');

        console.log('\n🎉 ALL USER PERMISSIONS UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ User Permissions UAT Test failed:', error);
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

runUserPermissionsTest();
