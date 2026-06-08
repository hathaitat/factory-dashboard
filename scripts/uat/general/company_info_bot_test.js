/**
 * Factory Dashboard - Automated Company Info UAT Bot Test Script
 * 
 * วิธีการใช้งาน (Usage):
 * 1. รันเซิร์ฟเวอร์ Vite dev (http://localhost:5173)
 * 2. รันสคริปต์ทดสอบนี้:
 *    node scripts/uat/general/company_info_bot_test.js
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
const USERNAME = 'admin_bell';
const PASSWORD = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots/company_info';

// ข้อมูลสำหรับทดสอบ Full Update
const FULL_NAME = 'บริษัท บอทเทส จำกัด';
const FULL_ADDRESS = '123/45 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพมหานคร 10110';
const FULL_PHONE = '02-111-2222';
const FULL_FAX = '02-111-2223';
const FULL_EMAIL = 'full-update@example.com';
const FULL_TAX_ID = '1234567890123';

// ข้อมูลสำหรับทดสอบ Partial Update
const PARTIAL_PHONE = '02-999-8888';
const PARTIAL_FAX = '02-999-7777';
const PARTIAL_EMAIL = 'partial-update@example.com';

// ชื่อบริษัทสำหรับตรวจสอบเอกสารสำหรับพิมพ์
const DYNAMIC_PRINT_NAME = 'บริษัท ไดนามิกบอทเทส จำกัด';

async function runCompanyInfoTest() {
    console.log('🤖 Starting Company Info Automated UAT Test...');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    // เชื่อมต่อ Supabase
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    console.log('📊 Fetching current company info from database for backup...');
    const { data: originalInfo, error: fetchError } = await supabase
        .from('company_info')
        .select('*')
        .eq('id', 1)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Failed to backup company info:', fetchError);
        return;
    }

    console.log('💾 Backup successful:', originalInfo);

    // ดึง ID ของ Supplier PO หรือ Invoice เพื่อใช้ทดสอบการพิมพ์
    let testPoId = null;
    let testInvoiceId = null;

    try {
        const { data: poList } = await supabase.from('supplier_pos').select('id').limit(1);
        if (poList && poList.length > 0) {
            testPoId = poList[0].id;
            console.log(`Found Test Supplier PO ID: ${testPoId}`);
        }
        const { data: invoiceList } = await supabase.from('invoices').select('id').limit(1);
        if (invoiceList && invoiceList.length > 0) {
            testInvoiceId = invoiceList[0].id;
            console.log(`Found Test Invoice ID: ${testInvoiceId}`);
        }
    } catch (dbErr) {
        console.warn('⚠️ Warning while fetching test document IDs:', dbErr.message);
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

        // --- ขั้นตอนที่ 2: ไปที่หน้าข้อมูลบริษัท ---
        console.log('\n📌 Step 2: Navigating to Company Info page...');
        await page.goto(`${BASE_URL}/dashboard/company-info`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_company_info_page.png') });
        console.log('📸 Company Info page loaded.');

        // --- ขั้นตอนที่ 2.5: ทดสอบการตรวจสอบความถูกต้องของข้อมูล (Form Validation UAT) ---
        console.log('\n🛡️ Step 2.5: Testing form validation logic (SETUP-06-03 to SETUP-06-08)...');
        
        let saveButton = page.locator('button[form="company-info-form"]');
        await expectButtonToExist(saveButton);

        // ตรวจสอบความถูกต้องเมื่อไม่มีข้อมูลโลโก้ (SETUP-06-03)
        console.log('⏳ SETUP-06-03: Testing missing Logo...');
        const deleteLogoBtn = page.locator('button:has-text("ลบโลโก้")');
        if (await deleteLogoBtn.isVisible()) {
            await deleteLogoBtn.click();
            await page.waitForTimeout(500);
        }
        await saveButton.click();
        await page.waitForSelector('text=กรุณาอัปโหลดโลโก้บริษัท', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_logo.png') });
        await page.click('button:has-text("ตกลง")');
        console.log('✅ Logo validation alert verified.');

        // เพื่อทดสอบฟิลด์อื่นต่อ เราต้องอัปโหลดโลโก้จำลองเข้าระบบ
        console.log('📤 Uploading mock logo for subsequent field tests...');
        const logoFilePath = path.join(__dirname, '../../../dist/images/logo-nobg.png');
        await page.setInputFiles('input[type="file"]', logoFilePath);
        await page.waitForSelector('text=อัปโหลดโลโก้สำเร็จ', { timeout: 5000 });
        console.log('✅ Mock logo uploaded.');

        // ตรวจสอบความถูกต้องเมื่อเว้นว่างชื่อบริษัท (SETUP-06-04)
        console.log('⏳ SETUP-06-04: Testing empty Company Name...');
        const originalName = await page.inputValue('input[name="name"]');
        await page.fill('input[name="name"]', '');
        await saveButton.click();
        await page.waitForSelector('text=กรุณากรอกชื่อบริษัท', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_name.png') });
        await page.click('button:has-text("ตกลง")');
        await page.fill('input[name="name"]', originalName || FULL_NAME);
        console.log('✅ Name validation alert verified.');

        // ตรวจสอบความถูกต้องเมื่อเว้นว่างที่อยู่ (SETUP-06-05)
        console.log('⏳ SETUP-06-05: Testing empty Address...');
        const originalAddress = await page.inputValue('textarea[name="address"]');
        await page.fill('textarea[name="address"]', '');
        await saveButton.click();
        await page.waitForSelector('text=กรุณากรอกที่อยู่บริษัท', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_address.png') });
        await page.click('button:has-text("ตกลง")');
        await page.fill('textarea[name="address"]', originalAddress || FULL_ADDRESS);
        console.log('✅ Address validation alert verified.');

        // ตรวจสอบความถูกต้องเมื่อเว้นว่างเบอร์โทรศัพท์ (SETUP-06-06)
        console.log('⏳ SETUP-06-06: Testing empty Phone Number...');
        const originalPhone = await page.inputValue('input[name="phone"]');
        await page.fill('input[name="phone"]', '');
        await saveButton.click();
        await page.waitForSelector('text=กรุณากรอกเบอร์โทรศัพท์', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_phone.png') });
        await page.click('button:has-text("ตกลง")');
        await page.fill('input[name="phone"]', originalPhone || FULL_PHONE);
        console.log('✅ Phone validation alert verified.');

        // ตรวจสอบความถูกต้องเมื่อเว้นว่างอีเมล (SETUP-06-07)
        console.log('⏳ SETUP-06-07: Testing empty Email...');
        const originalEmail = await page.inputValue('input[name="email"]');
        await page.fill('input[name="email"]', '');
        await saveButton.click();
        await page.waitForSelector('text=กรุณากรอกอีเมลบริษัท', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_email.png') });
        await page.click('button:has-text("ตกลง")');
        await page.fill('input[name="email"]', originalEmail || FULL_EMAIL);
        console.log('✅ Email validation alert verified.');

        // ตรวจสอบความถูกต้องเมื่อเว้นว่างเลขประจำตัวผู้เสียภาษี (SETUP-06-08)
        console.log('⏳ SETUP-06-08: Testing empty Tax ID...');
        const originalTaxId = await page.inputValue('input[name="taxId"]');
        await page.fill('input[name="taxId"]', '');
        await saveButton.click();
        await page.waitForSelector('text=กรุณากรอกเลขประจำตัวผู้เสียภาษี', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'val_missing_taxid.png') });
        await page.click('button:has-text("ตกลง")');
        await page.fill('input[name="taxId"]', originalTaxId || FULL_TAX_ID);
        console.log('✅ Tax ID validation alert verified.');

        // --- ขั้นตอนที่ 3: ทดสอบการบันทึกข้อมูลเมื่อเว้นเบอร์แฟกซ์ (SETUP-06-02) ---
        console.log('\n✍️ SETUP-06-02: Testing save with optional Fax field empty...');
        await page.fill('input[name="name"]', FULL_NAME);
        await page.fill('textarea[name="address"]', FULL_ADDRESS);
        await page.fill('input[name="phone"]', FULL_PHONE);
        await page.fill('input[name="fax"]', ''); // ล้างแฟกซ์ออก
        await page.fill('input[name="email"]', FULL_EMAIL);
        await page.fill('input[name="taxId"]', FULL_TAX_ID);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_fax_empty_form.png') });

        console.log('💾 Submitting form without Fax...');
        await saveButton.click();
        console.log('⏳ Waiting for success message...');
        await page.waitForSelector('text=บันทึกข้อมูลเรียบร้อยแล้ว', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_fax_empty_success.png') });
        console.log('✅ Successfully saved with empty Fax (no validation popups).');

        // --- ขั้นตอนที่ 3.1: ทดสอบการอัปเดตทุกฟิลด์ (Full Update - SETUP-06-01) ---
        console.log('\n✍️ SETUP-06-01: Filling ALL company info fields (Full Update)...');
        await page.fill('input[name="fax"]', FULL_FAX); // เติมแฟกซ์กลับไป
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_full_update_form.png') });

        console.log('💾 Submitting form...');
        await saveButton.click();

        console.log('⏳ Waiting for success message...');
        await page.waitForSelector('text=บันทึกข้อมูลเรียบร้อยแล้ว', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_full_update_success.png') });
        console.log('✅ UI shows save success message for Full Update.');

        // ตรวจสอบฐานข้อมูลว่าอัปเดตครบทุกฟิลด์หรือไม่
        console.log('📊 Verifying full update in database...');
        let { data: dbData, error: dbErr1 } = await supabase.from('company_info').select('*').eq('id', 1).single();
        if (dbErr1) throw dbErr1;

        if (dbData.name !== FULL_NAME || dbData.address !== FULL_ADDRESS || 
            dbData.phone !== FULL_PHONE || dbData.fax !== FULL_FAX || 
            dbData.email !== FULL_EMAIL || dbData.tax_id !== FULL_TAX_ID) {
            throw new Error('Database mismatch after Full Update!');
        }
        console.log('✅ Full update database verification passed!');

        // --- ขั้นตอนที่ 4: ทดสอบการอัปเดตบางฟิลด์ (Partial Update) ---
        console.log('\n✍️ Step 4: Updating only some fields (Partial Update)...');
        // รีโหลดหน้าเพื่อให้มั่นใจว่าฟอร์มดึงค่าจาก DB ถูกต้อง
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await page.fill('input[name="phone"]', PARTIAL_PHONE);
        await page.fill('input[name="fax"]', PARTIAL_FAX);
        await page.fill('input[name="email"]', PARTIAL_EMAIL);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_partial_update_form.png') });

        console.log('💾 Submitting form...');
        await saveButton.click();

        console.log('⏳ Waiting for success message...');
        await page.waitForSelector('text=บันทึกข้อมูลเรียบร้อยแล้ว', { timeout: 5000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_partial_update_success.png') });

        // ตรวจสอบฐานข้อมูลว่าอัปเดตเฉพาะฟิลด์ที่เปลี่ยน และฟิลด์อื่นๆ ยังเหมือนเดิม
        console.log('📊 Verifying partial update in database...');
        let { data: dbDataPart, error: dbErr2 } = await supabase.from('company_info').select('*').eq('id', 1).single();
        if (dbErr2) throw dbErr2;

        if (dbDataPart.phone !== PARTIAL_PHONE || dbDataPart.fax !== PARTIAL_FAX || dbDataPart.email !== PARTIAL_EMAIL) {
            throw new Error('Partial update fields did not persist correctly in DB!');
        }
        if (dbDataPart.name !== FULL_NAME || dbDataPart.address !== FULL_ADDRESS || dbDataPart.tax_id !== FULL_TAX_ID) {
            throw new Error('Other fields were incorrectly overwritten during partial update!');
        }
        console.log('✅ Partial update database verification passed!');

        // --- ขั้นตอนที่ 5: ทดสอบการแสดงผลข้อมูลบริษัทแบบไดนามิกบนเอกสารพิมพ์ ---
        console.log('\n🖨️ Step 5: Testing dynamic printing update (Dynamic Print Check)...');
        await page.fill('input[name="name"]', DYNAMIC_PRINT_NAME);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_dynamic_name_filled.png') });
        await saveButton.click();
        await page.waitForSelector('text=บันทึกข้อมูลเรียบร้อยแล้ว', { timeout: 5000 });

        // ทดสอบกับหน้ารายละเอียด/พิมพ์ใบสั่งซื้อผู้ขาย (Supplier PO)
        if (testPoId) {
            const poPrintUrl = `${BASE_URL}/dashboard/supplier-pos/${testPoId}/print`;
            console.log(`🔗 Navigating to Supplier PO Print Preview: ${poPrintUrl}`);
            await page.goto(poPrintUrl);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_po_print_preview.png') });

            // ตรวจสอบว่ามีชื่อใหม่ปรากฏบนหน้าจอพิมพ์หรือไม่
            const bodyText = await page.innerText('body');
            if (!bodyText.includes(DYNAMIC_PRINT_NAME)) {
                throw new Error(`Dynamic company name "${DYNAMIC_PRINT_NAME}" not found in PO print preview!`);
            }
            
            // ตรวจสอบว่าไม่มีข้อมูลชื่อบริษัทแบบ Hardcode (เช่น Multiply Auto Works) ปรากฏอยู่
            if (bodyText.includes('บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด') || bodyText.includes('MULTIPLY AUTO WORKS CO.,LTD.')) {
                throw new Error('Hardcoded company name found in PO print preview! Audit failed.');
            }
            console.log('✅ Supplier PO print preview dynamic check passed!');
        } else {
            console.log('⚠️ Skip Supplier PO print check (No test PO found).');
        }

        // ทดสอบกับหน้ารายละเอียด/พิมพ์ใบกำกับภาษี (Invoice)
        if (testInvoiceId) {
            const invoicePrintUrl = `${BASE_URL}/dashboard/invoices/${testInvoiceId}/print`;
            console.log(`🔗 Navigating to Invoice Print Preview: ${invoicePrintUrl}`);
            await page.goto(invoicePrintUrl);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_invoice_print_preview.png') });

            const bodyText = await page.innerText('body');
            if (!bodyText.includes(DYNAMIC_PRINT_NAME)) {
                throw new Error(`Dynamic company name "${DYNAMIC_PRINT_NAME}" not found in Invoice print preview!`);
            }
            console.log('✅ Invoice print preview dynamic check passed!');
        } else {
            console.log('⚠️ Skip Invoice print check (No test invoice found).');
        }

        // --- ขั้นตอนที่ 6: กู้คืนข้อมูลจริงเพื่อป้องกันข้อมูลขยะค้างในระบบ ---
        console.log('\n🔄 Step 6: Restoring original database info...');
        if (originalInfo) {
            const { error: restoreError } = await supabase
                .from('company_info')
                .update({
                    name: originalInfo.name,
                    address: originalInfo.address,
                    phone: originalInfo.phone,
                    fax: originalInfo.fax,
                    email: originalInfo.email,
                    tax_id: originalInfo.tax_id,
                    updated_at: originalInfo.updated_at
                })
                .eq('id', 1);

            if (restoreError) throw restoreError;
            console.log('✅ Original company info successfully restored.');
        }

        // --- ขั้นตอนที่ 7: ออกจากระบบ ---
        console.log('\n🚪 Step 7: Logging out...');
        await page.goto(`${BASE_URL}/dashboard/company-info`);
        await page.waitForLoadState('networkidle');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');

        console.log('\n🎉 ALL COMPANY INFO UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('❌ Company Info UAT Test failed:', error);
        
        // พยายามกู้คืนข้อมูลแม้ว่าจะเกิดข้อผิดพลาดขึ้น
        console.log('\n🔄 Emergency Restore: Attempting to restore original database info...');
        if (originalInfo) {
            await supabase
                .from('company_info')
                .update({
                    name: originalInfo.name,
                    address: originalInfo.address,
                    phone: originalInfo.phone,
                    fax: originalInfo.fax,
                    email: originalInfo.email,
                    tax_id: originalInfo.tax_id,
                    updated_at: originalInfo.updated_at
                })
                .eq('id', 1);
            console.log('✅ Emergency Restore complete.');
        }
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

async function expectButtonToExist(locator) {
    const isVisible = await locator.isVisible();
    if (!isVisible) {
        throw new Error('Save button is not visible or not found in the Header area!');
    }
}

runCompanyInfoTest();
