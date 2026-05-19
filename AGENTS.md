# AI Agent Guidelines (AGENTS.md)

เอกสารนี้กำหนดกฎระเบียบและแนวทางการทำงานสำหรับ AI Agent ที่เข้ามาช่วยพัฒนาโปรเจกต์นี้ เพื่อให้โค้ดมีคุณภาพและปลอดภัย

## 🛠 Code Style
- **ใช้ TypeScript เท่านั้น**: ทุกไฟล์ใหม่และไฟล์ที่แก้ไขควรใช้ TypeScript เพื่อความปลอดภัยของ Type
- **ตั้งชื่อ Component**: ใช้ `PascalCase` (เช่น `SupplierCard.tsx`)
- **ตั้งชื่อ Function**: ใช้ `camelCase` (เช่น `calculateTotalAmount()`)
- **Styling**: ใช้ `Tailwind CSS` สำหรับการตกแต่งหน้าจอ
- **Logic Separation**: หลีกเลี่ยงการเขียน Logic ใหญ่ๆ รวมไว้ใน Component เดียว ควรแยกเป็น Hook หรือ Helper Function
- **Reusable Components**: ชิ้นส่วนที่ใช้บ่อยหรือเป็นส่วนมาตรฐาน (Default) **ต้องสร้างเป็น Component กลาง (Shared Component)** ในโฟลเดอร์ `components/` แล้วเรียกใช้งานเสมอ เพื่อลดความซ้ำซ้อนและง่ายต่อการบำรุงรักษา

## 🏗 Project Structure
- **app/**: ใช้สำหรับเก็บ Routes และ Pages ตามมาตรฐาน Next.js App Router
- **components/**: ใช้สำหรับเก็บ UI Components ที่ใช้ซ้ำได้
- **services/**: ใช้สำหรับติดต่อกับ API หรือ Database (เช่น Supabase)
- **hooks/**: ใช้สำหรับ Custom Hooks

## ⛔ Boundaries & Safety
- **Database Schema**: ห้ามแก้ไขโครงสร้าง Database (Table, Column) โดยไม่อธิบายเหตุผลและความจำเป็นอย่างละเอียด
- **File Management**: ห้ามลบไฟล์สำคัญโดยไม่แจ้งและขออนุญาตก่อน
- **Database Data (CRITICAL)**: 
    - **ห้ามรันคำสั่งเพื่อลบข้อมูล (Delete) ใน Database โดยเด็ดขาด**
    - หากจำเป็นต้องแก้ไขข้อมูล (Update) **ต้องสอบถามและขอการยืนยันจาก User ก่อนเสมอ**

## 🔑 Environment & Secrets
- **ห้ามแก้ไขไฟล์ `.env` ทุกประเภทโดยเด็ดขาด** (`.env`, `.env.production`, `.env.development`, ฯลฯ)
- **ห้ามเชื่อมต่อระบบ Development เข้ากับฐานข้อมูล Production โดยเด็ดขาด** เพื่อป้องกันความผิดพลาดต่อข้อมูลจริง
- ห้ามแสดง Supabase Keys, API Keys หรือข้อมูล Credentials ใดๆ ใน Code หรือ Log

## 🎨 UI Patterns
- **ใช้ Rich Aesthetics**: ผู้ใช้งานควรจะ "ว้าว" ตั้งแต่แรกเห็น โดยใช้หลักการออกแบบสมัยใหม่ (เช่น สีสันสดใส, Dark Mode, Glassmorphism, และ Dynamic Animation)
- **ลำดับความสำคัญของความงาม**: ออกแบบให้รู้สึกพรีเมียมและทันสมัย:
    - หลีกเลี่ยงสีพื้นๆ (แดง, น้ำเงิน, เขียว ทั่วไป) ให้ใช้พาเลทสีที่ผ่านการคัดสรรและกลมกลืน (เช่น HSL tailored colors)
    - ใช้ Typography ที่ทันสมัย (เช่น Google Fonts: Inter, Roboto, Outfit) แทน Font เริ่มต้นของเบราว์เซอร์
    - ใช้ Gradients ที่นุ่มนวล และเพิ่ม Micro-animations เพื่อยกระดับประสบการณ์ผู้ใช้งาน
- **Layout Consistency**: โครงสร้างหน้าฟอร์ม (Create/Edit) ต้องมีระยะ Spacing และ Padding ที่สม่ำเสมอ โดยอิงจาก Module ใบกำกับภาษี (Invoice) เป็นหลัก
    - ส่วน Header ต้องมีปุ่ม Action (บันทึก/ยกเลิก) อยู่มุมขวาบนเสมอ
    - ใช้ระบบ Grid 3 คอลัมน์สำหรับข้อมูล Header ทั่วไป
- ใช้ Component ที่มีอยู่แล้ว เช่น `PageHeader`, `ListFilter`, class `glass-panel` แทนการสร้างใหม่
- **ตำแหน่งปุ่มจัดการ**: ปุ่ม Action ในตาราง (ดู/แก้ไข/ลบ) **ต้องอยู่ฝั่งซ้ายสุดของตารางเสมอ**
- ปุ่ม Action ในตารางต้องใช้ class `table-actions`, `action-view`, `action-edit`, `action-delete`
- **ตำแหน่งปุ่ม Save/บันทึก**: ในหน้าฟอร์ม (Create/Edit) ปุ่มบันทึกหลัก **ต้องอยู่ฝั่งขวาบนของหน้าจอ (Header area)** เสมอ เพื่อให้เป็นมาตรฐานเดียวกันทั่วทั้งระบบ
- Dialog/Alert ทั้งหมดต้องใช้ `useDialog()` hook (`showError`, `showConfirm`, `showAlert`) **ห้ามใช้** `window.alert()` หรือ `window.confirm()` โดยเด็ดขาด

## 🔐 Permission System
- ทุกปุ่ม เพิ่ม/แก้ไข/ลบ ต้องครอบด้วย `hasPermission()` จาก `usePermissions()` hook เสมอ
- ตัวอย่าง: `{hasPermission('customers', 'edit') && (<button>แก้ไข</button>)}`

## 🖨 Print Templates
- เอกสารพิมพ์ทั้งหมดต้องพอดีกระดาษ **A4 (210mm x 297mm)**
- ใช้หน่วย `mm` สำหรับ Layout การพิมพ์ ห้ามใช้ `px` หรือ `%`
- ต้องเผื่อขอบกระดาษ (Safe Margin) อย่างน้อย **10-15mm** ทุกด้าน

## 🌏 Language & Localization
- UI ทั้งหมดต้องแสดงเป็น **ภาษาไทย**
- การแสดงวันที่ใช้ปฏิทิน **พ.ศ.** ผ่าน `toLocaleDateString('th-TH')`

## 💰 Number & Currency Formatting
- Format ตัวเลขเงินด้วย `toLocaleString()` พร้อมทศนิยม **2 ตำแหน่ง** เสมอ
- ใช้สัญลักษณ์ `฿` นำหน้าจำนวนเงิน

## 📱 Responsive Design
- ใช้ class `grid-mobile-stack` และ `table-responsive-wrapper` ที่มีอยู่แล้ว
- ห้ามเขียน Media Query ใหม่เอง ถ้ายังไม่จำเป็น

## 📦 Dependencies
- **ห้ามติดตั้ง npm package ใหม่** โดยไม่แจ้งและขออนุญาตก่อน
- ต้องอธิบายเหตุผลว่าทำไมถึงต้องใช้ package นั้น

## 🗄 Supabase Patterns
- ใช้ **Service Layer** (`services/`) เท่านั้นในการคุยกับ Supabase
- **ห้าม** เรียก `supabase.from()` ตรงจาก Component โดยตรง

## ⏳ Loading & Empty States
- ทุกหน้าที่โหลดข้อมูลจาก Supabase ต้องมี **Loading Spinner** ขณะโหลด
- เมื่อไม่มีข้อมูล ต้องแสดง **Empty State** ที่สวยงาม ห้ามปล่อยว่างเปล่า

## 🆕 New Module/Menu Guidelines
- **เพิ่ม Permission**: เมื่อสร้างเมนูหรือโมดูลใหม่ ต้องเพิ่มชื่อโมดูลในระบบ Permission เสมอ (เช่น `internal_items`, `internal_requisitions`)
- **อัปเดต UAT**: เมื่อเพิ่มเมนูหรือฟีเจอร์สำคัญใหม่ ต้องอัปเดตไฟล์ `uat_test_script.md` เพื่อเพิ่มขั้นตอนการทดสอบสำหรับฟีเจอร์นั้นๆ เสมอ
- **Dashboard Integration**: ต้องเพิ่ม Tab หรือข้อมูลสรุปในหน้า Dashboard หลักเพื่อให้ผู้ใช้เห็นภาพรวมของโมดูลใหม่
    - ทุก Tab บน Dashboard ต้องมี **KPI Cards** และ **กราฟแนวโน้ม (Trend Graph)** เสมอ
    - แสดงข้อมูลเชิงวิเคราะห์อื่นๆ ตามความเหมาะสมเพื่อให้ผู้บริหารใช้ตัดสินใจได้ทันที
- **Navigation**: ตรวจสอบว่าเมนูใหม่ถูกจัดกลุ่มใน Sidebar อย่างเหมาะสมและมีการเช็คสิทธิ์การเข้าถึง

## 📝 Changelog
- เมื่อทำฟีเจอร์ใหม่หรือแก้ Bug สำคัญ ต้องอัปเดต `CHANGELOG.md` ทุกครั้ง

---
> AI Agent โปรดอ่านและปฏิบัติตามกฎนี้อย่างเคร่งครัด
