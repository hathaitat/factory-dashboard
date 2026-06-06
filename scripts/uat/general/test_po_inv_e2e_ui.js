import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const USERNAME = 'admin_bell';
const PASSWORD = 'bellbabl1.';
const SCREENSHOT_DIR = './tests/screenshots/e2e_po_inv';

async function runTest() {
    console.log('🤖 Starting UI Bot Test: PO -> INV -> Stock');
    
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        console.log('🔑 1. Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder="Username"]', USERNAME);
        await page.fill('input[placeholder="Password"]', PASSWORD);
        await page.click('button.login-btn');
        await page.waitForURL(`${BASE_URL}/dashboard`);
        
        console.log('📦 2. Go to Purchase Orders and Create New...');
        await page.goto(`${BASE_URL}/dashboard/purchase-orders/new`);
        await page.waitForLoadState('networkidle');
        
        const poNo = 'UI-PO-' + Date.now();
        await page.fill('input[type="text"]', poNo);
        // Find customer input
        await page.fill('input[placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."]', 'ไทยพารา');
        await page.waitForTimeout(1000);
        await page.click('text=ไทยพารา');
        await page.waitForTimeout(500);

        // Fill item
        await page.fill('input[placeholder="พิมพ์ชื่อสินค้า..."]', 'test 1');
        await page.waitForTimeout(500);
        const qtyInputs = await page.locator('input[type="number"]').all();
        if(qtyInputs.length > 0) {
            await qtyInputs[0].fill('10');
        }
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_po_form.png') });
        await page.click('button:has-text("บันทึก")');
        
        await page.waitForURL(`${BASE_URL}/dashboard/purchase-orders`);
        try { await page.click('button:has-text("ตกลง")', { timeout: 2000 }); } catch(e){}
        console.log('✅ PO Created: ' + poNo);

        console.log('🧾 3. Go to Invoices and Create New...');
        await page.goto(`${BASE_URL}/dashboard/invoices/new`);
        await page.waitForLoadState('networkidle');
        
        const invNo = 'UI-INV-' + Date.now();
        await page.fill('input[type="text"]', invNo);
        
        await page.fill('input[placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."]', 'ไทยพารา');
        await page.waitForTimeout(1500); // give time for customer to trigger fetch
        await page.click('text=ไทยพารา');
        
        // Wait up to 5 seconds for the select option to appear
        console.log('Waiting for PO options to load...');
        await page.waitForTimeout(3000);
        
        // Select PO from dropdown by getting all selects, and finding the one with the PO number
        const selects = await page.locator('select').all();
        let poSelectFound = false;
        for (const select of selects) {
            const optionsText = await select.innerText();
            if (optionsText.includes(poNo)) {
                await select.selectOption({ label: poNo });
                poSelectFound = true;
                break;
            }
        }

        if (!poSelectFound) {
            console.log('Could not find PO in dropdown, attempting to evaluate directly');
            // Try setting it directly if possible, or fail
            throw new Error('PO ' + poNo + ' not found in dropdown options');
        }
        
        await page.waitForTimeout(1000);
        // It might show a confirm dialog asking to load items:
        try { await page.click('button:has-text("ตกลง")', { timeout: 2000 }); } catch(e){}
        try { await page.click('button:has-text("ตกลง")', { timeout: 2000 }); } catch(e){}

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_inv_form.png') });
        
        // Ensure status is 'Issued' (the other select)
        for (const select of selects) {
            const optionsText = await select.innerText();
            if (optionsText.includes('แบบร่าง')) {
                await select.selectOption('Issued');
            }
        }

        await page.click('button:has-text("บันทึก")');
        await page.waitForURL(`${BASE_URL}/dashboard/invoices`);
        try { await page.click('button:has-text("ตกลง")', { timeout: 2000 }); } catch(e){}
        try { await page.click('button:has-text("ตกลง")', { timeout: 2000 }); } catch(e){}
        console.log('✅ Invoice Created: ' + invNo);

        console.log('🏭 4. Checking Warehouse...');
        await page.goto(`${BASE_URL}/dashboard/warehouses`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        // Type in search box to filter for test 1
        await page.fill('input[placeholder="ค้นหาสินค้า..."]', 'test 1');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_warehouse.png') });

        console.log('\n✅ UI Bot Test Passed!');
        
    } catch (err) {
        console.error('❌ Test Failed:', err.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ERROR.png') });
    } finally {
        await browser.close();
    }
}
runTest();
