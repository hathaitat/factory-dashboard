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
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });

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

    // Register page console and error event handlers
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

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

        // --- ขั้นตอนที่ 2.4: ทดสอบการรับสินค้า PO แบบหลายรอบ (DOC-09: Multi-Step PO Receipt) ---
        console.log('\n📦 Step 2.4: Testing Multi-Step PO Goods Receipt (DOC-09)...');
        
        // รันสคริปต์เพื่อรีเซ็ตข้อมูล PO ก่อนทำการทดสอบ
        console.log('🔄 Resetting PO data in database via script...');
        try {
            execSync('node scripts/reset_po_received_qty.js', { stdio: 'inherit' });
        } catch (e) {
            console.error('⚠️ Could not run reset script via execSync:', e.message);
        }

        const poId = 'bf4ce3d1-70ba-4638-a57d-f102381e7be5';
        const poEditUrl = `${BASE_URL}/dashboard/supplier-pos/${poId}/edit?mode=receive`;
        const poDetailUrl = `${BASE_URL}/dashboard/supplier-pos/${poId}`;

        // ครั้งที่ 1: รายการแรกรับ 80, รายการสองไม่รับ (0)
        console.log('🔄 ครั้งที่ 1: รายการแรกรับ 80, รายการสองรับ 0...');
        await page.goto(poEditUrl);
        await page.waitForTimeout(2000);
        await page.fill('table tbody tr:nth-child(1) td:nth-child(4) input', '80');
        await page.fill('table tbody tr:nth-child(2) td:nth-child(4) input', '0');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_po_receipt_run1.png') });
        await page.click('button:has-text("บันทึก")');
        await page.waitForTimeout(1500); // รอระบบประมวลผลและแสดง Alert สำเร็จ
        await page.click('button:has-text("ตกลง")'); // คลิกตกลงใน Alert สำเร็จ
        await page.waitForURL(`${BASE_URL}/dashboard/supplier-pos`);
        await page.waitForTimeout(1000);
        console.log('✅ ครั้งที่ 1 สำเร็จ!');

        // ครั้งที่ 2: รายการแรกรับเพิ่ม 10 (เป็น 90), รายการสองรับ 80
        console.log('🔄 ครั้งที่ 2: รายการแรกรับเพิ่ม 10 (รวม 90), รายการสองรับ 80...');
        await page.goto(poEditUrl);
        await page.waitForTimeout(2000);
        await page.fill('table tbody tr:nth-child(1) td:nth-child(4) input', '90');
        await page.fill('table tbody tr:nth-child(2) td:nth-child(4) input', '80');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_po_receipt_run2.png') });
        await page.click('button:has-text("บันทึก")');
        await page.waitForTimeout(1500); // รอระบบประมวลผลและแสดง Alert สำเร็จ
        await page.click('button:has-text("ตกลง")'); // คลิกตกลงใน Alert สำเร็จ
        await page.waitForURL(`${BASE_URL}/dashboard/supplier-pos`);
        await page.waitForTimeout(1000);
        console.log('✅ ครั้งที่ 2 สำเร็จ!');

        // ครั้งที่ 3: รายการแรกรับเพิ่ม 15 (ระบบ clamp เป็น 100), รายการสองรับเพิ่ม 20 (รวม 100)
        console.log('🔄 ครั้งที่ 3: รายการแรกรับเพิ่ม 15 (รวม 100), รายการสองรับเพิ่ม 20 (รวม 100)...');
        await page.goto(poEditUrl);
        await page.waitForTimeout(2000);
        await page.fill('table tbody tr:nth-child(1) td:nth-child(4) input', '100');
        await page.fill('table tbody tr:nth-child(2) td:nth-child(4) input', '100');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_po_receipt_run3.png') });
        await page.click('button:has-text("บันทึก")');
        await page.waitForTimeout(1500); // รอระบบประมวลผลและแสดง Alert สำเร็จ
        await page.click('button:has-text("ตกลง")'); // คลิกตกลงใน Alert สำเร็จ
        await page.waitForURL(`${BASE_URL}/dashboard/supplier-pos`);
        await page.waitForTimeout(1000);
        console.log('✅ ครั้งที่ 3 สำเร็จ!');

        // --- ขั้นตอนที่ 2.5: ทดสอบการยกเลิกใบสั่งซื้อและหักสต็อกคืนคลัง (PO Cancellation & Inventory Deduction) ---
        console.log('\n📦 Step 2.5: Testing PO Cancellation & Inventory Deduction...');
        
        // ไปที่หน้า Detail ของ PO เพื่อเตรียมตรวจสอบและกดยกเลิก
        console.log('📌 Going to PO Detail page for cancellation test...');
        await page.goto(poDetailUrl);
        await page.waitForTimeout(2000);

        // 1. ตรวจสอบสต็อกใน Database ก่อนกดยกเลิก
        const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        
        // ดึงข้อมูลสินค้าจาก PO ก่อนเพื่อเอาชื่อรายการ
        const { data: poItems } = await supabase
            .from('supplier_po_items')
            .select('*')
            .eq('po_id', poId);
            
        // ดึงข้อมูลคลังสินค้าปลายทาง
        const { data: poData } = await supabase
            .from('supplier_pos')
            .select('delivery_warehouse_id')
            .eq('id', poId)
            .single();
            
        const warehouseId = poData.delivery_warehouse_id;
        
        console.log('📊 Fetching current warehouse stock before cancellation...');
        const { data: invBefore } = await supabase
            .from('warehouse_inventory')
            .select('*')
            .eq('warehouse_id', warehouseId);
            
        const stockMapBefore = {};
        if (invBefore) {
            invBefore.forEach(inv => {
                stockMapBefore[inv.product_name] = Number(inv.quantity);
            });
        }
        console.log('Stock Before:', stockMapBefore);

        console.log('🖱️ Clicking "ยกเลิกใบสั่งซื้อ (หักสต็อกคืน)" button...');
        await page.click('button:has-text("ยกเลิกใบสั่งซื้อ")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11.5_po_cancel_confirm.png') });
        // ยืนยันใน Confirm Dialog
        await page.click('button:has-text("ยืนยัน")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11.6_po_cancel_after_confirm.png') });
        // คลิก ตกลง ใน Alert แจ้งสำเร็จ
        await page.click('button:has-text("ตกลง")');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_po_cancelled.png') });
        console.log('📸 PO Cancelled Page Saved.');

        // 3. ตรวจสอบสต็อกใน Database หลังกดยกเลิก
        console.log('📊 Fetching warehouse stock after cancellation to verify deduction...');
        const { data: invAfter } = await supabase
            .from('warehouse_inventory')
            .select('*')
            .eq('warehouse_id', warehouseId);
            
        const stockMapAfter = {};
        if (invAfter) {
            invAfter.forEach(inv => {
                stockMapAfter[inv.product_name] = Number(inv.quantity);
            });
        }
        console.log('Stock After:', stockMapAfter);
        
        // ตรวจสอบว่าสินค้าแต่ละรายการใน PO ถูกหักสต็อกออกไปตามจำนวนที่เคยรับจริง (100 ชิ้น)
        for (const item of poItems) {
            const qtyReceived = Number(item.received_quantity || 0);
            const beforeQty = stockMapBefore[item.description] || 0;
            const afterQty = stockMapAfter[item.description] || 0;
            const diff = beforeQty - afterQty;
            
            console.log(`- Product: "${item.description}": Before = ${beforeQty}, After = ${afterQty}, Deducted = ${diff} (Expected deduction = ${qtyReceived})`);
            
            if (diff !== qtyReceived) {
                throw new Error(`Deduction mismatch for "${item.description}"! Expected ${qtyReceived} to be deducted, but got ${diff}`);
            }
        }
        console.log('✅ Stock deduction verified successfully in database!');

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
