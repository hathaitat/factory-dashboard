/**
 * E2E Bot Test: Subcontract PO Cancel & Stock Return
 * 
 * ทดสอบ Flow:
 * 1. คลัง ICE → เหล็กเหลี่ยม → จดยอดตั้งต้น
 * 2. เปิด PO ผลิต → เลือก ICE, main, พรุ่งนี้, PIN 200
 * 3. บันทึก → ยกเลิก PO → ตรวจสอบ stock คืน
 * 
 * วิธีรัน: node scripts/uat/purchasing/test_subcontract_cancel_e2e_bot.js
 */

import { chromium } from 'playwright';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env.development') });

const BASE_URL = 'http://localhost:5173';
const ADMIN_USER = 'admin_bell';
const ADMIN_PASS = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots/subcontract_cancel';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
    console.log(`   📸 Screenshot: ${name}.png`);
}

/** Click "ตกลง" หรือ "ยืนยัน" ใน custom dialog ถ้ามี */
async function dismissDialog(page, buttonText = 'ตกลง', timeout = 3000) {
    try {
        const btn = page.locator(`button:has-text("${buttonText}")`).first();
        if (await btn.isVisible({ timeout })) {
            await btn.click();
            await sleep(500);
            return true;
        }
    } catch { /* dialog not present, continue */ }
    return false;
}

async function runTest() {
    console.log('🤖 ====================================');
    console.log('🤖 E2E Test: ยกเลิก PO จ้างผลิต + คืน Stock');
    console.log('🤖 ====================================\n');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: false, slowMo: 150 });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    let createdPoId = null; // Track PO ID for direct navigation

    try {
        // =============================================
        // STEP 1: Login
        // =============================================
        console.log('🔑 Step 1: เข้าสู่ระบบ...');
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder="Username"]', ADMIN_USER);
        await page.fill('input[placeholder="Password"]', ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('   ✅ เข้าสู่ระบบสำเร็จ');

        // =============================================
        // STEP 2: ไปที่คลังสินค้า → คลัง ICE
        // =============================================
        console.log('\n📦 Step 2: เข้าคลัง ICE...');
        await page.goto(`${BASE_URL}/dashboard/warehouses`);
        await page.waitForLoadState('networkidle');
        await sleep(1000);
        await page.click('button:has-text("คลัง ICE")');
        await page.waitForLoadState('networkidle');
        await sleep(500);
        await screenshot(page, '01_warehouse_ice');
        console.log('   ✅ เข้าคลัง ICE สำเร็จ');

        // =============================================
        // STEP 3: คลิก "เหล็กเหลี่ยม" → ดูประวัติ
        // =============================================
        console.log('\n📦 Step 3: เข้าดู "เหล็กเหลี่ยม"...');
        // Use the clickable product name link (blue text) instead of action-view
        const materialName = page.locator('div[title="คลิกเพื่อดูรายละเอียด"]').filter({ hasText: /^เหล็กเหลี่ยม$/ });
        await materialName.click();
        await page.waitForLoadState('networkidle');
        await sleep(1000);

        // จดยอดตั้งต้น - อ่านจาก glass-panel ที่มีข้อความ "จำนวนคงเหลือปัจจุบัน"
        const qtyPanel = page.locator('.glass-panel').filter({ hasText: 'จำนวนคงเหลือปัจจุบัน' });
        const qtyDiv = qtyPanel.locator('div').filter({ hasText: /^\d/ }).first();
        const initialQtyText = await qtyDiv.innerText();
        const initialQty = parseFloat(initialQtyText.replace(/,/g, ''));
        console.log(`   📊 ยอดคงเหลือตั้งต้น: ${initialQty}`);
        await screenshot(page, '02_material_initial');

        // =============================================
        // STEP 4: กดปุ่ม "เปิด PO ผลิต"
        // =============================================
        console.log('\n📝 Step 4: กด "เปิด PO ผลิต"...');
        await page.click('button:has-text("เปิด PO ผลิต")');
        await page.waitForLoadState('networkidle');
        await sleep(1500);
        console.log('   ✅ เปิดหน้าฟอร์ม PO สำเร็จ');

        // =============================================
        // STEP 5: กรอกข้อมูลฟอร์ม PO
        // =============================================
        console.log('\n📝 Step 5: กรอกข้อมูลฟอร์ม...');

        // 5.1 เลือกผู้ขาย: ICE
        console.log('   - เลือกผู้ขาย: ICE');
        await page.selectOption('select[name="supplier_id"]', { label: 'ICE' });
        await page.waitForLoadState('networkidle');
        await sleep(1500); // Wait for supplier products to load!

        // 5.2 เลือกสถานที่ส่ง: main
        console.log('   - เลือกสถานที่ส่ง: main');
        const warehouseSelect = page.locator('select[name="delivery_warehouse_id"]');
        const mainOption = await warehouseSelect.locator('option').filter({ hasText: 'main' }).first();
        const mainValue = await mainOption.getAttribute('value');
        await warehouseSelect.selectOption(mainValue);
        await sleep(300);

        // 5.3 กำหนดส่งสินค้า: พรุ่งนี้
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        console.log(`   - กำหนดส่งสินค้า: ${dateStr}`);
        await page.fill('input[name="delivery_date"]', dateStr);
        await sleep(300);

        // 5.4 กรอกผู้อนุมัติ
        console.log('   - กรอกผู้อนุมัติ: Bot Tester');
        await page.fill('input[name="approved_by"]', 'Bot Tester');
        await sleep(300);

        await screenshot(page, '03_po_form_header');

        // =============================================
        // STEP 6: เลือกรายการสินค้า PIN จำนวน 200
        // =============================================
        console.log('\n📝 Step 6: เลือกสินค้า PIN จำนวน 200...');
        
        // Use the first row's description input (datalist input)
        const descInput = page.locator('table tbody tr').first().locator('input[list]').first();
        
        // Clear and type PIN - use keyboard type to trigger onChange properly
        await descInput.click();
        await descInput.fill('');
        await descInput.type('PIN', { delay: 100 }); // Type char by char to trigger change
        await sleep(500);
        
        // Force trigger the change event to match product from datalist
        await descInput.dispatchEvent('change');
        await sleep(500);
        
        // Verify the unit was auto-filled (should be 'pcs' if product matched)
        const unitInput = page.locator('table tbody tr').first().locator('input').nth(2); // Unit field
        const unitValue = await unitInput.inputValue().catch(() => '');
        console.log(`   - หน่วย: ${unitValue}`);

        // กรอกจำนวน 200
        const qtyInput = page.locator('table tbody tr').first().locator('input[type="number"]').first();
        await qtyInput.click();
        await qtyInput.fill('200');
        await page.keyboard.press('Tab');
        await sleep(1500); // Wait for BOM calculation
        
        await screenshot(page, '04_po_form_items');
        console.log('   ✅ กรอกรายการสินค้าเรียบร้อย');

        // =============================================
        // STEP 7: กดบันทึก PO
        // =============================================
        console.log('\n💾 Step 7: กด "บันทึกใบสั่งซื้อ"...');
        
        // Click the first "บันทึกใบสั่งซื้อ" button (there are 2: top header + bottom form)
        const saveBtn = page.locator('button:has-text("บันทึกใบสั่งซื้อ")').first();
        await saveBtn.scrollIntoViewIfNeeded();
        await saveBtn.click();
        
        // Wait for success dialog
        await sleep(3000);
        await screenshot(page, '05_save_dialog');
        
        // Dismiss "บันทึกข้อมูลสำเร็จ" dialog
        await dismissDialog(page, 'ตกลง', 5000);
        
        // Wait for redirect to PO list
        await page.waitForURL(/\/dashboard\/supplier-pos$/, { timeout: 15000 });
        await page.waitForLoadState('networkidle');
        await sleep(1000);
        
        // Grab the PO ID from the first row's action-view link href
        const firstViewLink = page.locator('a.action-view').first();
        const href = await firstViewLink.getAttribute('href');
        createdPoId = href?.split('/supplier-pos/')[1] || null;
        console.log(`   ✅ บันทึก PO สำเร็จ (ID: ${createdPoId})`);
        await screenshot(page, '06_po_list');

        // =============================================
        // STEP 8: เช็คสต็อกหลังสร้าง PO
        // =============================================
        console.log('\n📦 Step 8: ตรวจยอดหลังสร้าง PO...');
        await page.goto(`${BASE_URL}/dashboard/warehouses`);
        await page.waitForLoadState('networkidle');
        await sleep(500);
        await page.click('button:has-text("คลัง ICE")');
        await page.waitForLoadState('networkidle');
        await sleep(500);
        
        const materialName2 = page.locator('div[title="คลิกเพื่อดูรายละเอียด"]').filter({ hasText: /^เหล็กเหลี่ยม$/ });
        await materialName2.click();
        await page.waitForLoadState('networkidle');
        await sleep(1000);

        const qtyPanel2 = page.locator('.glass-panel').filter({ hasText: 'จำนวนคงเหลือปัจจุบัน' });
        const afterCreateQtyText = await qtyPanel2.locator('div').filter({ hasText: /^\d/ }).first().innerText();
        const afterCreateQty = parseFloat(afterCreateQtyText.replace(/,/g, ''));
        const deducted = initialQty - afterCreateQty;
        console.log(`   📊 ยอดหลังสร้าง PO: ${afterCreateQty} (ถูกหัก: ${deducted})`);
        await screenshot(page, '07_stock_after_create');

        // =============================================
        // STEP 9: ไปยกเลิก PO ใบนั้น
        // =============================================
        console.log('\n❌ Step 9: ยกเลิก PO...');
        
        // Navigate directly to PO detail page (avoid target="_blank" issue)
        if (createdPoId) {
            await page.goto(`${BASE_URL}/dashboard/supplier-pos/${createdPoId}`);
        } else {
            // Fallback: go to PO list and click po_number cell
            await page.goto(`${BASE_URL}/dashboard/supplier-pos`);
            await page.waitForLoadState('networkidle');
            await sleep(1000);
            // Click PO number in first row (which navigates to detail)
            const poNumberCell = page.locator('td').filter({ hasText: /^(VPO|3333|xxxxx)/ }).first();
            await poNumberCell.click();
        }
        await page.waitForLoadState('networkidle');
        await sleep(1000);
        await screenshot(page, '08_po_detail');

        // กดปุ่มยกเลิก (ปุ่มสีแดงที่มีข้อความ "ยกเลิกรายการ" หรือ "ยกเลิกใบสั่งซื้อ")
        console.log('   กดปุ่ม "ยกเลิกรายการ"...');
        const cancelBtn = page.locator('button:has-text("ยกเลิก")').first();
        await cancelBtn.scrollIntoViewIfNeeded();
        await cancelBtn.click();
        await sleep(1000);
        await screenshot(page, '09_confirm_dialog');

        // กด "ยืนยัน" ใน custom dialog
        console.log('   กด "ยืนยัน" ใน dialog...');
        await dismissDialog(page, 'ยืนยัน', 5000);
        await sleep(3000); // Wait for cancellation API to complete

        // Dismiss success alert
        await dismissDialog(page, 'ตกลง', 5000);
        await screenshot(page, '10_po_cancelled');
        console.log('   ✅ ยกเลิก PO สำเร็จ');

        // =============================================
        // STEP 10: ตรวจยอดสต็อกสุดท้าย
        // =============================================
        console.log('\n📦 Step 10: ตรวจยอดสุดท้าย...');
        await page.goto(`${BASE_URL}/dashboard/warehouses`);
        await page.waitForLoadState('networkidle');
        await sleep(500);
        await page.click('button:has-text("คลัง ICE")');
        await page.waitForLoadState('networkidle');
        await sleep(500);
        
        const materialName3 = page.locator('div[title="คลิกเพื่อดูรายละเอียด"]').filter({ hasText: /^เหล็กเหลี่ยม$/ });
        await materialName3.click();
        await page.waitForLoadState('networkidle');
        await sleep(1000);

        const qtyPanel3 = page.locator('.glass-panel').filter({ hasText: 'จำนวนคงเหลือปัจจุบัน' });
        const finalQtyText = await qtyPanel3.locator('div').filter({ hasText: /^\d/ }).first().innerText();
        const finalQty = parseFloat(finalQtyText.replace(/,/g, ''));
        console.log(`   📊 ยอดสุดท้าย: ${finalQty}`);
        await screenshot(page, '11_stock_final');

        // =============================================
        // RESULT
        // =============================================
        console.log('\n====================================');
        console.log(`   ยอดตั้งต้น (ก่อนสร้าง PO): ${initialQty}`);
        console.log(`   ยอดหลังสร้าง PO:           ${afterCreateQty} (ถูกหัก ${deducted})`);
        console.log(`   ยอดหลังยกเลิก PO:          ${finalQty}`);
        console.log('====================================');
        
        if (finalQty === initialQty) {
            console.log('🎉 ✅ TEST PASSED! สต็อกคืนครบถ้วน!');
        } else if (deducted === 0) {
            console.log('⚠️  WARN: สต็อกไม่ถูกหัก (BOM อาจไม่ trigger) - ตรวจสอบ datalist');
        } else {
            console.log(`❌ TEST FAILED! ยอดไม่ตรง (ต่างกัน ${finalQty - initialQty})`);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        await screenshot(page, 'error_screenshot').catch(() => {});
    } finally {
        console.log('\n📸 Screenshots saved to:', SCREENSHOT_DIR);
        await sleep(3000);
        await browser.close();
        console.log('🏁 จบการทดสอบ');
    }
}

runTest();
