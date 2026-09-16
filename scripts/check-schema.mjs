/**
 * ตรวจว่าคอลัมน์ที่โค้ดเขียน/อ่าน มีอยู่จริงในฐานข้อมูลหรือไม่
 *
 * ที่มา: ตาราง payroll_entries เคยขาดคอลัมน์ที่ service เขียนลงไป 5 ตัว
 * (back_pay, company_loan, social_security, diligence_allowance, monthly_salary)
 * เพราะ migration ใช้ CREATE TABLE IF NOT EXISTS กับตารางที่ถูกสร้างไว้ก่อนแล้ว
 * คำสั่งจึงข้ามไปเงียบๆ ไม่เติมคอลัมน์ให้ ผลคือหน้าเว็บขึ้น 400 ตอนกดบันทึก
 * และไม่มีใครรู้จนกว่าผู้ใช้จะเจอเอง
 *
 * วิธีใช้: npm run check:schema        (ฐานข้อมูล dev)
 *          npm run check:schema:prod   (ฐานข้อมูล production)
 *
 * เพิ่มคอลัมน์ใหม่ใน service เมื่อไหร่ ต้องมาเพิ่มในรายการข้างล่างนี้ด้วยเสมอ
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// คอลัมน์ที่โค้ดใช้จริง อ้างอิงจาก whitelist ใน src/services/*.js
const REQUIRED_COLUMNS = {
    employees: [
        'id', 'code', 'full_name', 'phone', 'position', 'employment_type',
        'daily_wage', 'monthly_salary', 'position_allowance', 'skill_allowance',
        'diligence_allowance', 'start_date', 'status', 'date_of_birth',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
        'created_at', 'created_by', 'updated_at', 'updated_by'
    ],
    // payroll_periods ไม่มี updated_at ในฐานข้อมูลจริง (ตารางถูกสร้างโดย migration เก่า
    // ตั้งแต่ก่อน 20260914000004) ตอนนี้ไม่มีโค้ดส่วนไหนเขียนคอลัมน์นี้จึงไม่ใส่ไว้
    // ถ้าจะเพิ่มโค้ดที่เขียน updated_at ต้องเขียน migration เติมคอลัมน์ก่อน
    payroll_periods: [
        'id', 'name', 'start_date', 'end_date', 'working_days', 'status',
        'created_at', 'created_by'
    ],
    payroll_entries: [
        'id', 'period_id', 'employee_id',
        'daily_wage', 'monthly_salary', 'actual_working_days',
        'position_allowance', 'skill_allowance', 'transport_allowance', 'shift_allowance',
        'diligence_allowance', 'birthday_allowance', 'bonus', 'back_pay',
        'ot_1_5_hours', 'ot_1_6_hours', 'ot_2_0_hours',
        'company_loan', 'social_security', 'custom_allowances',
        'created_at', 'updated_at'
    ]
};

// คอลัมน์ชื่อเก่าที่เลิกใช้แล้ว ถ้ายังอยู่แปลว่า migration รวมคอลัมน์ยังไม่ได้รัน
const RETIRED_COLUMNS = {
    payroll_entries: ['backpay', 'company_loan_deduction', 'ot_hours', 'ot_3_0_hours']
};

const envName = process.argv[2] || 'development';
const envFile = path.resolve(process.cwd(), `.env.${envName}`);

if (!fs.existsSync(envFile)) {
    console.error(`❌ ไม่พบไฟล์ ${path.basename(envFile)}`);
    process.exit(1);
}

const env = Object.fromEntries(
    fs.readFileSync(envFile, 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error(`❌ ${path.basename(envFile)} ไม่มี VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY`);
    process.exit(1);
}

const supabase = createClient(url, key);
// โชว์แค่ project ref ไม่โชว์คีย์
console.log(`ตรวจ schema: ${envName} (${new URL(url).hostname.split('.')[0]})\n`);

let failed = false;

for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const { error: tableError } = await supabase.from(table).select('*').limit(1);
    if (tableError && tableError.code === 'PGRST205') {
        console.log(`❌ ${table}: ไม่มีตารางนี้ในฐานข้อมูล`);
        failed = true;
        continue;
    }

    const missing = [];
    for (const column of columns) {
        const { error } = await supabase.from(table).select(column).limit(1);
        if (error) missing.push(column);
    }

    const retired = [];
    for (const column of RETIRED_COLUMNS[table] ?? []) {
        const { error } = await supabase.from(table).select(column).limit(1);
        if (!error) retired.push(column);
    }

    if (missing.length === 0 && retired.length === 0) {
        console.log(`✅ ${table}: ครบ ${columns.length} คอลัมน์`);
        continue;
    }

    failed = true;
    if (missing.length) console.log(`❌ ${table}: ขาดคอลัมน์ ${missing.join(', ')}`);
    if (retired.length) console.log(`⚠️  ${table}: ยังมีคอลัมน์ที่เลิกใช้แล้ว ${retired.join(', ')}`);
}

if (failed) {
    console.log('\nฐานข้อมูลไม่ตรงกับโค้ด — หน้าเว็บจะขึ้น error 400 ตอนบันทึก');
    console.log('แก้โดยรัน: npm run migrate');
    console.log('ถ้ารัน migrate แล้วยังไม่หาย แปลว่า migration ใช้ CREATE TABLE IF NOT EXISTS');
    console.log('กับตารางที่มีอยู่แล้ว ต้องเขียน ALTER TABLE ... ADD COLUMN IF NOT EXISTS เพิ่มเอง');
    process.exit(1);
}

console.log('\nฐานข้อมูลตรงกับโค้ดทั้งหมด');
