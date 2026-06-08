/**
 * Factory Dashboard - Automated Server-Side Pagination UAT Bot Test Script
 * 
 * Usage:
 * 1. Start Vite dev server (http://localhost:5173)
 * 2. Run this script:
 *    node scripts/uat/general/pagination_bot_test.js
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
const SCREENSHOT_DIR = './tests/screenshots/pagination';

async function runPaginationTest() {
    console.log('🤖 Starting Server-Side Pagination Automated UAT Test...');

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

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

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

        // --- Step 2: Navigate to Customer List ---
        // Customers usually have a lot of items, so it's a good place to test pagination
        console.log('\n📌 Step 2: Navigating to Customers List page...');
        await page.goto(`${BASE_URL}/dashboard/customers`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_load.png') });

        // --- Step 3: Verify Pagination Info ---
        console.log('\n📊 Step 3: Verifying Pagination UI elements...');
        // Wait for the pagination summary text to appear (e.g., แสดง 1-50 จาก 100 รายการ)
        await page.waitForSelector('.pagination-summary', { timeout: 5000 });
        const summaryText = await page.textContent('.pagination-summary');
        console.log(`Pagination Info: ${summaryText.trim()}`);
        
        if (!summaryText.includes('แสดง 1-')) {
            throw new Error('Pagination did not start at item 1 as expected.');
        }

        // Check if there are enough items to test pagination by looking at the "Next" button
        const nextButtonDisabled = await page.$eval('button[title="ถัดไป"]', btn => btn.disabled).catch(() => true);
        
        // --- Step 4: Test Changing Items Per Page ---
        console.log('\n⚙️ Step 4: Changing items per page from 50 to 25...');
        await page.selectOption('.pagination-select', '25');
        await page.waitForTimeout(1500); // Wait for API fetch
        
        const summaryTextAfterSizeChange = await page.textContent('.pagination-summary');
        console.log(`Pagination Info (after change): ${summaryTextAfterSizeChange.trim()}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_page_size_changed.png') });
        
        if (!summaryTextAfterSizeChange.includes('แสดง 1-')) {
            throw new Error('Pagination did not reset to item 1 correctly after changing items per page.');
        }

        // Evaluate Next Button again
        const nextBtnDisabledNow = await page.$eval('button[title="ถัดไป"]', btn => btn.disabled).catch(() => true);

        // --- Step 5: Test Next Page Navigation ---
        if (!nextBtnDisabledNow) {
            console.log('\n➡️ Step 5: Clicking "Next Page"...');
            await page.click('button[title="ถัดไป"]');
            await page.waitForTimeout(1500); // Wait for API fetch
            
            const summaryTextPage2 = await page.textContent('.pagination-summary');
            console.log(`Pagination Info (Page 2): ${summaryTextPage2.trim()}`);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_page_2.png') });

            if (!summaryTextPage2.includes('แสดง 26-')) {
                throw new Error('Pagination did not move to item 26 correctly when clicking Next.');
            }
        } else {
            console.log('\n⚠️ Skipping Step 5 (Next Page) because there are fewer than 25 items in the database.');
        }

        // --- Step 6: Test Search/Filter Pagination Reset ---
        console.log('\n🔍 Step 6: Testing Search Filter (Ensuring it resets to Page 1)...');
        await page.fill('input[placeholder="ค้นหาลูกค้า..."]', 'บริษัท');
        await page.waitForTimeout(1500); // Wait for API fetch after typing
        
        const summaryExists = await page.$('.pagination-summary').catch(() => null);
        if (summaryExists) {
            const summaryTextSearch = await page.textContent('.pagination-summary');
            console.log(`Pagination Info (After Search): ${summaryTextSearch.trim()}`);
            if (!summaryTextSearch.includes('แสดง 1-')) {
                throw new Error('Search filter did not reset pagination back to Page 1!');
            }
        } else {
            console.log('Pagination UI hidden because search result is empty. This is expected.');
        }

        console.log('\n✅ Pagination UI & Server-Side Logic Tests Passed!');

        // --- Step 7: Logout ---
        console.log('\n🚪 Step 7: Logging out...');
        await page.click('text=ออกจากระบบ');
        await page.waitForURL(`${BASE_URL}/login`);
        console.log('🚪 Logged out successfully.');

        console.log('\n🎉 ALL PAGINATION UAT TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ Pagination UAT Test failed:', error);
    } finally {
        await browser.close();
        console.log('\n🏁 Bot testing finished and browser closed.');
    }
}

runPaginationTest();
