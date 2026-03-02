# คู่มือการนำขึ้น Hostinger (Deployment Guide)

เนื่องจากโปรเจกต์นี้เป็น **Vite + React**, การนำขึ้น Hostinger แบบ Web Hosting ปกติจะต้องทำการ Built เป็นไฟล์ Static ก่อนครับ

## 1. ขั้นตอนการ Build (ทำที่เครื่องเรา)
รันคำสั่งนี้ใน Terminal:
```bash
npm run build
```
*ระบบจะสร้างโฟลเดอร์ชื่อ `dist/` ออกมา ซึ่งในนั้นคือไฟล์ทั้งหมดที่ต้องเอาขึ้น Hostinger ครับ*

## 2. ขั้นตอนการ Upload ไปยัง Hostinger
1. เข้าไปที่ **Hostinger Control Panel (hPanel)**
2. ไปที่ **File Manager** ของโดเมนที่ต้องการ
3. เข้าไปที่โฟลเดอร์ `public_html`
4. **Upload** ไฟล์และโฟลเดอร์ทั้งหมดที่อยู่ในโฟลเดอร์ `dist/` (ไม่ใช่ตัวโฟลเดอร์ dist เองนะครับ ให้เอาไฟล์ข้างใน) ไปวางใน `public_html`

## 3. การตั้งค่าสำหรับ React Router (สำคัญมาก)
เพื่อให้ URL ของหน้าต่างๆ (เช่น `/dashboard/invoices`) ทำงานได้โดยไม่ติด Error 404 เมื่อกด Refresh ให้สร้างไฟล์ชื่อ **`.htaccess`** ไว้ใน `public_html` บน Hostinger โดยมีเนื้อหาดังนี้ครับ:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 4. การจัดการ Environment Variables
ตรวจสอบให้มั่นใจว่าใน Hostinger ของคุณมีค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ที่ถูกต้อง (ปกติ Vite จะฝังค่าจากไฟล์ `.env` ลงไปในตอน Build ให้เลยครับ)

## 5. การอัปเดตเวอร์ชันใหม่ (Re-deploy)
หากมีการแก้ไขโค้ดและต้องการอัปเดตบน Hostinger ให้ทำดังนี้ครับ:
1. รัน `npm run build` ในเครื่องอีกครั้ง
2. เข้าไปที่ File Manager ใน Hostinger
3. **ลบ** ไฟล์และโฟลเดอร์เดิมใน `public_html` ออก (ยกเว้นไฟล์ `.htaccess` ถ้าคุณไม่ได้แก้ไขอะไรในนั้น แต่ลบแล้วลงใหม่ก็ไม่มีปัญหาครับ)
4. อัปโหลดไฟล์ในโฟลเดอร์ `dist/` ชุด **ล่าสุด** ขึ้นไปวางแทนที่ครับ

---
**หมายเหต**: ถ้าคุณใช้ **Hostinger Website Builder** (ระบบลากวาง) มันจะไม่สามารถเอาโค้ด React นี้ไปใส่โดยตรงได้ครับ คุณต้องสลับไปใช้ **Web Hosting** หรือ **Cloud Hosting** ปกติแทนครับ
