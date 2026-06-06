/**
 * Factory Dashboard - Automated System Settings UAT Bot Test Script
 * 
 * วิธีการใช้งาน (Usage):
 * 1. รันเซิร์ฟเวอร์ Vite dev (http://localhost:5173)
 * 2. รันสคริปต์ทดสอบนี้:
 *    node scripts/uat/general/settings_bot_test.js
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
const SCREENSHOT_DIR = './tests/screenshots/settings';

async function runSettingsTest() {
    console.log('🤖 Starting System Settings Automated UAT Test...');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshot directory at: ${SCREENSHOT_DIR}`);
    }

    // เชื่อมต่อ Supabase เพื่อ backup ข้อมูลการตั้งค่า
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    console.log('📊 Backing up existing settings from DB...');
    
    const [scheduleBackup, formatsBackup, distWhBackup] = await Promise.all([
        supabase.from('settings').select('*').eq('key', 'work_schedule').maybeSingle(),
        supabase.from('settings').select('*').eq('key', 'document_formats').maybeSingle(),
        supabase.from('settings').select('*').eq('key', 'default_distribution_warehouse_id').maybeSingle()
    ]);

    console.log('💾 Settings backup completed.');

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
        await page.click('button.login-btn');

        await page.waitForURL(`${BASE_URL}/dashboard`);
        console.log('🎉 Login Successful!');
        await page.waitForTimeout(1000);

        // --- ขั้นตอนที่ 2: ไปที่หน้าตั้งค่าระบบ ---
        console.log('\n📌 Step 2: Navigating to Settings page...');
        await page.goto(`${BASE_URL}/dashboard/settings`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_settings_page.png') });

        // --- ขั้นตอนที่ 3: ตรวจสอบดอกจัน Required บนฟิลด์สำคัญ ---
        console.log('\n🛡️ Step 3: Verifying Required (*) visual indicators...');
        const requiredIndicatorsCount = await page.locator('span:has-text("*")').count();
        console.log(`Required indicators found: ${requiredIndicatorsCount}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_required_fields_check.png') });

        // --- ขั้นตอนที่ 4: อัปเดตรูปแบบเลขที่เอกสาร (SETUP-18) ---
        console.log('\n✍️ Step 4: Updating document formats (Invoice, Billing Note, Receipt)...');
        await page.fill('input[name="invoice_format"]', 'IV{YY}{MM}{RUN4}');
        await page.fill('input[name="billing_note_format"]', 'BN{YY}{MM}{RUN4}');
        await page.fill('input[name="receipt_format"]', 'RE{YY}{MM}{RUN4}');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_document_formats_filled.png') });

        // บันทึกการตั้งค่ารวม
        console.log('💾 Saving settings configuration...');
        await page.click('button:has-text("บันทึกการตั้งค่า")');
        await page.waitForSelector('text=บันทึกการตั้งค่าเรียบร้อยแล้ว', { timeout: 5000 });
        console.log('✅ Document formats settings saved successfully.');

        // --- ขั้นตอนที่ 5: การตัดสต็อกอัตโนมัติ (SETUP-19) ---
        console.log('\n📦 Step 5: Testing Default Distribution Warehouse settings...');
        const whSelect = page.locator('select:has-text("คลัง")').first();
        if (await whSelect.count() > 0) {
            // เลือกคลังแรกที่มีในตัวเลือก
            await whSelect.selectOption({ index: 1 });
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_distribution_warehouse_selected.png') });
            await page.click('button:has-text("บันทึกการตั้งค่า")');
            await page.waitForSelector('text=บันทึกการตั้งค่าเรียบร้อยแล้ว', { timeout: 5000 });
            console.log('✅ Default distribution warehouse saved.');
        }

        // --- ขั้นตอนที่ 6: จัดการคลังสินค้า - เพิ่มคลังของเราเอง (SETUP-20-03) ---
        console.log('\n🏗️ Step 6: Testing Warehouse Management - Add Custom Warehouse...');
        await page.click('button:has-text("เพิ่มคลังใหม่")');
        await page.waitForSelector('#warehouse-form', { timeout: 3000 });

        // กรอกฟิลด์
        const whName = `คลังบอททดสอบ ${Date.now()}`;
        const whCode = `WH-BOT-${Math.floor(Math.random() * 1000)}`;
        
        // ใช้ selector ที่เจาะจงผ่านคลาส .form-group เพื่อป้องกัน Strict Mode Violation
        await page.locator('.form-group:has-text("ชื่อคลัง") input').fill(whName);
        await page.locator('.form-group:has-text("รหัสคลัง") input').fill(whCode);
        await page.locator('#warehouse-form textarea').fill('ที่อยู่คลังทดสอบอัตโนมัติ UAT');
        await page.locator('.form-group:has-text("ชื่อผู้ติดต่อ") input').fill('บอทผู้ดูแล');
        await page.locator('.form-group:has-text("เบอร์โทรศัพท์") input').fill('099-999-9999');
        await page.locator('.form-group:has-text("หมายเหตุ") input').fill('หมายเหตุบอท');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_warehouse_modal_filled.png') });

        await page.click('button:has-text("บันทึกคลังสินค้า")');
        // รอ toast หรือตารางอัปเดต
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_warehouse_created.png') });

        // ตรวจสอบในตารางว่ามีคลังนี้ปรากฏจริง
        const bodyText = await page.innerText('body');
        if (!bodyText.includes(whName) || !bodyText.includes(whCode)) {
            throw new Error('Created custom warehouse not found in list!');
        }
        console.log('✅ Custom warehouse created successfully.');

        // --- ขั้นตอนที่ 7: จัดการคลังสินค้า - ลบคลังและโอนย้าย (SETUP-20-06) ---
        console.log('\n🗑️ Step 7: Testing Warehouse Deletion & Transfer...');
        
        // 1. ดึง ID ของคลังสินค้าที่เพิ่งสร้างจาก Supabase
        const { data: newWh, error: getWhErr } = await supabase
            .from('warehouses')
            .select('id')
            .eq('code', whCode)
            .single();
        if (getWhErr) throw getWhErr;

        // 2. สร้างสินค้าจำลองค้างไว้ในคลังบอททดสอบ เพื่อกระตุ้น Delete & Transfer Modal
        console.log('💾 Injecting mock inventory item to trigger transfer dialog on delete...');
        const { data: mockInv, error: insertInvErr } = await supabase
            .from('warehouse_inventory')
            .insert([{
                warehouse_id: newWh.id,
                sku: `SKU-BOT-${Date.now()}`,
                product_name: 'สินค้าจำลอง UAT Transfer',
                product_type: 'finished',
                quantity: 50,
                unit: 'กล่อง',
                min_stock: 0,
                last_updated: new Date().toISOString()
            }])
            .select()
            .single();
        if (insertInvErr) throw insertInvErr;
        console.log('✅ Mock inventory item injected.');

        // รีโหลดหน้าเพื่อให้เห็นสินค้าและพร้อมทดสอบการลบ
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 3. กดลบคลังสินค้าที่สร้าง
        console.log(`Clicking Delete on warehouse: ${whName}...`);
        // ค้นหาแถวที่มีชื่อคลัง และหาปุ่มลบ (Trash2) ในแถวนั้น
        // หรือใช้วิธีลบด้วยคลิกบนปุ่มถังขยะในแถวของ whName
        const rowLocator = page.locator(`tr:has-text("${whName}")`);
        await rowLocator.locator('button').nth(1).click(); // ปุ่มแรกแก้ไข (Edit2) ปุ่มสองลบ (Trash2)
        
        // 4. รอตรวจดู Delete & Transfer Modal ขึ้นมา
        await page.waitForSelector('text=ยืนยันการลบคลังสินค้า', { timeout: 3000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_transfer_modal_open.png') });
        console.log('✅ Delete & Transfer Modal opened.');

        // 5. เลือกคลังสินค้าเป้าหมายโอนย้าย
        const targetWhSelect = page.locator('select:has-text("เลือกคลังสินค้าเป้าหมาย")');
        await targetWhSelect.selectOption({ index: 1 }); // เลือกคลังแรกที่มี (ซึ่งจะเป็นคลัง Default)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_transfer_target_selected.png') });

        // 6. กดยืนยันโอนย้ายและลบ
        await page.click('button:has-text("โอนย้ายและลบ")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_warehouse_deleted.png') });

        // ตรวจสอบว่าคลังถูกลบออกไปจากหน้ารายการแล้ว
        const bodyTextAfterDelete = await page.innerText('body');
        if (bodyTextAfterDelete.includes(whName)) {
            throw new Error('Warehouse was not removed from UI list after deletion!');
        }
        console.log('✅ Custom warehouse deleted from UI list.');

        // 7. ตรวจสอบใน DB ว่าสินค้าถูกโอนย้ายไปยังคลังปลายทางจริงหรือไม่
        console.log('📊 Verifying inventory item transfer in database...');
        const { data: transferredInv, error: checkTransferredErr } = await supabase
            .from('warehouse_inventory')
            .select('*')
            .eq('sku', mockInv.sku)
            .single();
        if (checkTransferredErr) throw checkTransferredErr;

        if (transferredInv.warehouse_id === newWh.id) {
            throw new Error('Inventory item warehouse_id was not updated to transfer target!');
        }
        console.log(`✅ Database verified: Item transferred to warehouse ID ${transferredInv.warehouse_id} (previously ${newWh.id})`);

        // ลบสินค้าจำลองออกจากคลังปลายทางเพื่อรักษาความสะอาดข้อมูล
        await supabase.from('warehouse_inventory').delete().eq('id', transferredInv.id);
        console.log('🧹 Cleaned up mock inventory item from DB.');

        // --- ขั้นตอนที่ 8: ประเภทผู้ขาย - เพิ่มและลบ (SETUP-21) ---
        console.log('\n🏷️ Step 8: Testing Supplier Categories (Add & Delete Scenarios)...');
        const mockCategoryName = `ประเภทบอท_${Date.now()}`;
        await page.fill('input[placeholder="เช่น บริการ, วัตถุดิบ..."]', mockCategoryName);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_category_name_filled.png') });
        
        // เจาะจงปุ่มเพิ่มในส่วนประเภทผู้ขาย ป้องกันการสับสนกับปุ่ม "เพิ่มคลังใหม่"
        await page.locator('.glass-panel:has-text("ประเภทผู้ขาย") button:has-text("เพิ่ม")').click();
        await page.waitForTimeout(1000);

        // ตรวจสอบว่ามี badge ของหมวดหมู่ขึ้นมาจริง
        const bodyTextCats = await page.innerText('body');
        if (!bodyTextCats.includes(mockCategoryName)) {
            throw new Error('New supplier category badge not found in list!');
        }
        console.log('✅ Supplier category added successfully.');

        // กดลบหมวดหมู่ที่สร้าง
        console.log(`Clicking Delete (X) on category badge: ${mockCategoryName}...`);
        await page.locator(`xpath=//div[contains(text(), "${mockCategoryName}")]/button`).click(); // คลิกปุ่มกากบาท X
        await page.waitForTimeout(1000);

        // รอ Popup ยืนยัน และเช็คข้อความใน dialog (UAT SETUP-21-02)
        await page.waitForSelector('text=คุณแน่ใจหรือไม่ว่าต้องการลบประเภทนี้? (ผู้ขายที่เคยใช้ประเภทนี้จะยังคงอยู่จนกว่าจะมีการแก้ไขข้อมูลผู้ขาย)', { timeout: 3000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_delete_category_confirm.png') });
        
        // กดยืนยันเพื่อทำการลบ
        await page.click('button:has-text("ยืนยัน")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_category_deleted.png') });

        // ตรวจสอบว่าหมวดหมู่หายไป
        const bodyTextCatsAfter = await page.innerText('body');
        if (bodyTextCatsAfter.includes(mockCategoryName)) {
            throw new Error('Supplier category badge was not removed after deletion!');
        }
        console.log('✅ Supplier category deleted successfully.');

        // --- ขั้นตอนที่ 9: กู้คืนข้อมูลการตั้งค่าเดิม ---
        console.log('\n🔄 Step 9: Restoring original settings to database...');
        await restoreOriginalSettings(supabase, scheduleBackup.data, formatsBackup.data, distWhBackup.data);
        console.log('✅ Settings successfully restored.');

        // --- ขั้นตอนที่ 10: ออกจากระบบ ---
        console.log('\n🚪 Step 10: Logging out...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');

        console.log('\n🎉 ALL SYSTEM SETTINGS UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('❌ System Settings UAT Test failed:', error);
        
        // พยายามกู้คืนข้อมูลแม้ว่าจะเกิดข้อผิดพลาดขึ้น
        console.log('\n🔄 Emergency Restore: Attempting to restore original settings to database...');
        await restoreOriginalSettings(supabase, scheduleBackup?.data, formatsBackup?.data, distWhBackup?.data);
        console.log('✅ Emergency Restore complete.');
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

async function restoreOriginalSettings(supabase, schedule, formats, distWhId) {
    const promises = [];
    if (schedule) {
        promises.push(supabase.from('settings').update({ value: schedule.value, updated_at: schedule.updated_at }).eq('key', 'work_schedule'));
    }
    if (formats) {
        promises.push(supabase.from('settings').update({ value: formats.value, updated_at: formats.updated_at }).eq('key', 'document_formats'));
    }
    if (distWhId) {
        promises.push(supabase.from('settings').update({ value: distWhId.value, updated_at: distWhId.updated_at }).eq('key', 'default_distribution_warehouse_id'));
    }
    if (promises.length > 0) {
        await Promise.all(promises);
    }
}

runSettingsTest();
