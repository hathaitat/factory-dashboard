/**
 * Factory Dashboard - Automated Supplier UAT Bot Test Script
 * 
 * วิธีการใช้งาน (Usage):
 * 1. รันเซิร์ฟเวอร์ Vite dev (http://localhost:5173)
 * 2. รันสคริปต์ทดสอบนี้:
 *    node scripts/uat/supplier_bot_test.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env.development') });

const BASE_URL = 'http://localhost:5173';
const USERNAME = 'admin_bell';
const PASSWORD = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots/supplier';

// สร้างรหัสและชื่อแบบสุ่มเพื่อป้องกันการชนกันของข้อมูลในการทดสอบแต่ละครั้ง
const UNIQUE_SUFFIX = Math.floor(1000 + Math.random() * 9000).toString();
const TEST_CODE = `SUP-${UNIQUE_SUFFIX}`;
const TEST_NAME = `บริษัท ทดสอบจัดส่ง จำกัด (${UNIQUE_SUFFIX})`;

async function runSupplierTest() {
    console.log('🤖 Starting Supplier Automated UAT Test...');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 1000 
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // ติดตั้ง Loggers เพื่อดู Console ของหน้าเว็บ
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        // --- ขั้นตอนที่ 1: เข้าสู่ระบบ ---
        console.log(`\n🔑 Step 1: Logging in at ${BASE_URL}/login...`);
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        await page.fill('input[placeholder="Username"]', USERNAME);
        await page.fill('input[placeholder="Password"]', PASSWORD);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_filled.png') });
        await page.click('button.login-btn');

        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('🎉 Login Successful!');
        await page.waitForTimeout(1500);

        // --- ขั้นตอนที่ 2: ไปที่หน้ารายการ Supplier ---
        console.log('\n📌 Step 2: Navigating to Suppliers List page...');
        await page.goto(`${BASE_URL}/dashboard/suppliers`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_suppliers_list.png') });
        console.log('📸 Suppliers list loaded.');

        // --- ขั้นตอนที่ 3: เปิดหน้าจอ "เพิ่ม Supplier" ---
        console.log('\n➕ Step 3: Clicking "เพิ่ม Supplier" button...');
        await page.click('button:has-text("เพิ่ม Supplier")');
        await page.waitForURL(`${BASE_URL}/dashboard/suppliers/new`);
        await page.waitForTimeout(1000);
        console.log('📸 Add Supplier page loaded.');

        // --- ขั้นตอนที่ 4: กรอกฟอร์มข้อมูลผู้ขาย ---
        console.log(`\n✍️ Step 4: Filling Supplier Form (Code: ${TEST_CODE})...`);
        await page.fill('input[name="code"]', TEST_CODE);
        await page.fill('input[name="name"]', TEST_NAME);
        await page.fill('input[name="taxId"]', '1234567890123');
        await page.fill('input[name="branch"]', 'สำนักงานใหญ่');
        await page.fill('input[name="contactPerson"]', 'คุณสมชาย ทดสอบระบบ');
        await page.fill('input[name="phone"]', '089-999-9999');
        await page.fill('input[name="email"]', 'test-supplier@example.com');
        await page.fill('input[name="creditTerm"]', '30');
        await page.fill('textarea[name="address"]', '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตวัฒนา กรุงเทพฯ 10110');
        await page.fill('textarea[name="notes"]', 'เพิ่มโดยบอททดสอบระบบ Playwright');
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_form_filled.png') });

        // --- ขั้นตอนที่ 5: กดบันทึกข้อมูล ---
        console.log('💾 Step 5: Submitting form...');
        await page.click('button:has-text("บันทึกข้อมูล")');
        await page.waitForTimeout(1500); // รอแสดง Alert สำเร็จ
        await page.click('button:has-text("ตกลง")'); // คลิกตกลงใน Alert สำเร็จ
        await page.waitForURL(`${BASE_URL}/dashboard/suppliers`);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_after_create.png') });
        console.log('✅ Supplier created successfully.');

        // --- ขั้นตอนที่ 6: ค้นหารายการที่เพิ่งสร้าง ---
        console.log(`\n🔍 Step 6: Searching for Supplier by name: ${TEST_NAME}...`);
        await page.fill('input[placeholder="ค้นหา Supplier..."]', TEST_NAME);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_search_result.png') });

        // ตรวจสอบว่าผลลัพธ์การค้นหาถูกต้อง
        const tableContent = await page.textContent('table tbody');
        if (!tableContent.includes(TEST_CODE)) {
            throw new Error(`Test supplier with code "${TEST_CODE}" not found in search results!`);
        }
        console.log('✅ Found created Supplier in the list.');

        // --- ขั้นตอนที่ 7: กดแก้ไข (Edit) ---
        console.log('\n✏️ Step 7: Clicking Edit button...');
        // คลิกปุ่มแก้ไขในบรรทัดแรกที่ค้นพบ
        await page.click('table tbody tr:first-child td.actions-column button.action-edit');
        await page.waitForTimeout(1500);
        console.log('📸 Edit page loaded.');

        // --- ขั้นตอนที่ 8: แก้ไขข้อมูลเครดิตเทอมและหมายเหตุ ---
        console.log('✍️ Step 8: Modifying Credit Term and internal notes...');
        await page.fill('input[name="creditTerm"]', '45');
        await page.fill('textarea[name="notes"]', 'แก้ไขข้อมูลเครดิตเทอมผ่านบอททดสอบระบบ Playwright');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_form_edited.png') });

        // --- ขั้นตอนที่ 9: กดบันทึกการแก้ไข ---
        console.log('💾 Step 9: Saving modified data...');
        await page.click('button:has-text("บันทึกข้อมูล")');
        await page.waitForTimeout(1500); // รอแสดง Alert สำเร็จ
        await page.click('button:has-text("ตกลง")'); // คลิกตกลงใน Alert สำเร็จ
        await page.waitForURL(`${BASE_URL}/dashboard/suppliers`);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_after_edit.png') });
        console.log('✅ Supplier edited successfully.');

        // ค้นหาอีกรอบเพื่อเช็คค่าที่เปลี่ยนไป
        await page.fill('input[placeholder="ค้นหา Supplier..."]', TEST_NAME);
        await page.waitForTimeout(1000);
        const updatedRowContent = await page.textContent('table tbody tr:first-child');
        console.log(`Row Content after update: ${updatedRowContent.trim()}`);
        if (!updatedRowContent.includes('45 วัน')) {
            throw new Error('Credit term was not updated to 45 days in UI list!');
        }
        console.log('✅ Verified updated credit term in list.');

        // --- ขั้นตอนที่ 10: ลบข้อมูล (Delete) ---
        console.log('\n🗑️ Step 10: Deleting test Supplier via UI...');
        await page.click('table tbody tr:first-child td.actions-column button.action-delete');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_delete_confirm_dialog.png') });

        // คลิกยืนยันบน Dialog
        console.log('🖱️ Clicking "ยืนยัน" on delete dialog...');
        await page.click('button:has-text("ยืนยัน")');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_delete_success_dialog.png') });

        // คลิกปุ่มตกลงใน Alert แจ้งลบสำเร็จ
        console.log('🖱️ Clicking "ตกลง" on success alert...');
        await page.click('button:has-text("ตกลง")');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_final_list_cleared.png') });
        console.log('✅ Test Supplier deleted successfully via UI.');

        // --- ขั้นตอนที่ 11: ออกจากระบบ ---
        console.log('\n🚪 Step 11: Logging out...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');

        console.log('\n🎉 ALL SUPPLIER UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('❌ Supplier UAT Test failed:', error);
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

runSupplierTest();
