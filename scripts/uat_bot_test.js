/**
 * Factory Dashboard - Automated UAT Bot Test Script
 * 
 * วิธีการใช้งาน (Usage):
 * 1. ติดตั้ง Playwright (ถ้ายังไม่ได้ติดตั้ง):
 *    npm install -D playwright
 * 
 * 2. รันสคริปต์นี้เพื่อทดสอบ (Make sure the Vite dev server is running on http://localhost:5173):
 *    node scripts/uat_bot_test.js
 * 
 * สคริปต์นี้จะทำหน้าที่เป็น Bot เพื่อดำเนินการตาม UAT Test Script โดยมีขั้นตอนดังนี้:
 * - บล็อกอินด้วย admin_bell และเลี่ยงการกรอกช่อง Honeypot (website_url_confirm) เพื่อผ่านระบบดักจับบอท
 * - ตรวจสอบการรีไดเร็กต์มายังหน้า Dashboard
 * - กดขยายเมนู Sidebar และคลิกเข้าสู่หน้าจอที่เกี่ยวข้อง
 * - บันทึกภาพ Screenshot ของแต่ละหน้าจอที่ทดสอบสำเร็จในโฟลเดอร์ `tests/screenshots/`
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// กำหนดค่าต่างๆ สำหรับการทดสอบ
const BASE_URL = 'http://localhost:5173';
const USERNAME = 'admin_bell';
const PASSWORD = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots';

async function runBotTest() {
    console.log('🤖 Starting Automated UAT Bot Test...');

    // ตรวจสอบและสร้างโฟลเดอร์สำหรับเก็บภาพ Screenshot
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    // เปิดเบราว์เซอร์ Chromium
    const browser = await chromium.launch({ 
        headless: false, // เปิดหน้าจอเพื่อให้ผู้ใช้เห็นความเคลื่อนไหว (ตั้งเป็น true ได้หากต้องการรันแบบไร้หน้าจอ)
        slowMo: 1000     // ตั้งเวลาหน่วง 1 วินาทีในแต่ละคำสั่งเพื่อให้สามารถดูได้ทัน
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    try {
        // --- ขั้นตอนที่ 1: เข้าสู่ระบบ (Login Flow) ---
        console.log(`\n🔑 Step 1: Navigating to login page (${BASE_URL}/login)...`);
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        // ตรวจสอบและกรอกฟิลด์ข้อมูลการล็อกอิน
        console.log('✍️ Filling Username and Password...');
        await page.fill('input[placeholder="Username"]', USERNAME);
        await page.fill('input[placeholder="Password"]', PASSWORD);

        // คำเตือนความปลอดภัย: บอทจริงต้องไม่กรอก Honeypot (ฟิลด์ดักจับบอทชื่อ website_url_confirm)
        console.log('🛡️ Bypassing Honeypot check (leaving "website_url_confirm" empty)...');

        // บันทึกภาพก่อนกด Login
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_filled.png') });

        // กดปุ่มเข้าสู่ระบบ
        console.log('🖱️ Clicking "เข้าสู่ระบบ" button...');
        await page.click('button.login-btn');

        // รอการนำทางไปยังหน้า Dashboard
        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('🎉 Login Successful! Redirected to Dashboard.');

        // รอโหลดข้อมูล Dashboard
        await page.waitForTimeout(2000); // หน่วงเวลาเพื่อให้กราฟและตัวเลขโหลดเสร็จ
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_dashboard_loaded.png') });
        console.log('📸 Dashboard Loaded & Saved screenshot.');

        // --- ขั้นตอนที่ 2: ทดสอบหน้าจอต่างๆ ในระบบ (Navigation Flow) ---
        
        // หมวดหมู่ที่ 1: คลังสินค้าและการผลิต (Warehouse & Production)
        console.log('\n📦 Step 2.1: Expanding "คลังสินค้าและการผลิต" group...');
        await page.click('text=คลังสินค้าและการผลิต');
        
        console.log('📌 Navigating to "คลังสินค้า (Warehouse)"...');
        await page.click('text=คลังสินค้า (Warehouse)');
        await page.waitForTimeout(1500); // รอ Spinner หาย
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_warehouse_page.png') });
        console.log('📸 Warehouse Page Loaded.');

        console.log('📌 Navigating to "ของใช้ในโรงงาน"...');
        await page.click('text=ของใช้ในโรงงาน');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_internal_items_page.png') });
        console.log('📸 Internal Items Page Loaded.');

        // หมวดหมู่ที่ 2: คู่ค้าและพนักงาน (Partners & Personnel)
        console.log('\n👥 Step 2.2: Expanding "คู่ค้าและพนักงาน" group...');
        await page.click('text=คู่ค้าและพนักงาน');

        console.log('📌 Navigating to "ลูกค้า (Customers)"...');
        await page.click('text=ลูกค้า (Customers)');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_customers_page.png') });
        console.log('📸 Customers Page Loaded.');

        console.log('📌 Navigating to "รายชื่อพนักงาน"...');
        await page.click('text=รายชื่อพนักงาน');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_employees_page.png') });
        console.log('📸 Employees Page Loaded.');

        // หมวดหมู่ที่ 3: ตั้งค่าระบบ (System Settings)
        console.log('\n⚙️ Step 2.3: Expanding "ตั้งค่าระบบ" group...');
        await page.click('text=ตั้งค่าระบบ');

        console.log('📌 Navigating to "ข้อมูลบริษัท"...');
        await page.click('text=ข้อมูลบริษัท');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_company_info_page.png') });
        console.log('📸 Company Info Page Loaded.');

        console.log('📌 Navigating to "สิทธิ์การใช้งาน"...');
        await page.click('text=สิทธิ์การใช้งาน');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_user_permissions_page.png') });
        console.log('📸 User Permissions Page Loaded.');

        // --- ขั้นตอนที่ 3: ออกจากระบบ (Logout Flow) ---
        console.log('\n🚪 Step 3: Logging out of the system...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');
        
        console.log('\n✅ ALL AUTOMATED UAT TESTS PASSED SUCCESSFULLY! ✅');

    } catch (error) {
        console.error('❌ An error occurred during the UAT Bot Test:', error);
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

runBotTest();
