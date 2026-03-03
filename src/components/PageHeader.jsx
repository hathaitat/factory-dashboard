import { HelpCircle } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

const PageHeader = ({ title, subtitle, helpContent, children }) => {
    const { showHelp } = useDialog();

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>{title}</h1>
                    {subtitle && (
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>
                    )}
                </div>
                {helpContent && (
                    <button
                        onClick={() => showHelp(
                            typeof helpContent === 'object' ? helpContent.text : helpContent,
                            `❓ วิธีใช้ — ${title}`,
                            typeof helpContent === 'object' ? helpContent.video : null
                        )}
                        title="วิธีใช้งาน"
                        style={{
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#6366f1',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(99, 102, 241, 0.15)';
                            e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(99, 102, 241, 0.08)';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        <HelpCircle size={18} />
                    </button>
                )}
            </div>
            {children && (
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

// Help content for each page
export const HELP_CONTENT = {
    overview: {
        text: `📊 ภาพรวมระบบ (Dashboard)\n\n• ดูจำนวนลูกค้าทั้งหมดในระบบ\n• ดูยอดขายเดือนนี้ (จากใบกำกับภาษี)\n• ดูยอดวางบิลเดือนนี้\n• ดูจำนวนใบกำกับที่รอดำเนินการ\n• ดูตารางใบกำกับภาษีล่าสุด\n• ดูตารางใบวางบิลล่าสุด`,
        video: '/videos/dashboard_tutorial.webp'
    },

    customers: `👥 จัดการลูกค้า\n\n• 🔍 ค้นหา — พิมพ์ชื่อ/อีเมล/ผู้ติดต่อในช่องค้นหา\n• ➕ เพิ่มลูกค้า — กดปุ่ม "เพิ่มลูกค้า" แล้วกรอกข้อมูล\n• 👁️ ดูรายละเอียด — กดไอคอนตาที่แถวนั้น\n• ✏️ แก้ไข — กดไอคอนดินสอ\n• 🗑️ ลบ — กดไอคอนถังขยะ (ต้องยืนยัน)\n• 📊 Export Excel — กดปุ่ม "Export Excel" ดาวน์โหลดข้อมูลทั้งหมด`,

    purchaseOrders: `📋 ใบสั่งซื้อ (PO)\n\n• ➕ สร้าง PO — กดปุ่ม "สร้างใบสั่งซื้อ"\n• เลือกลูกค้าจาก dropdown\n• เพิ่มรายการสินค้า (ชื่อ, จำนวน, ราคาต่อหน่วย)\n• ระบบคำนวณยอดรวมอัตโนมัติ\n• กด "บันทึก" เพื่อบันทึก Draft\n• 👁️ ดู / ✏️ แก้ไข / 🗑️ ลบ ผ่านปุ่มในแต่ละแถว`,

    invoices: `📄 ใบกำกับภาษี\n\n• ➕ สร้างใบกำกับภาษี — กดปุ่ม "สร้างใบกำกับภาษี"\n• เลือกลูกค้า → เพิ่มรายการสินค้า\n• ระบบคำนวณภาษี 7% อัตโนมัติ\n• เลขที่เอกสารสร้างอัตโนมัติ (เช่น IV0007595)\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด\n• สถานะ: Draft → สามารถแก้ไขได้`,

    billingNotes: `📑 ใบวางบิล\n\n• ➕ สร้างใบวางบิล — กดปุ่ม "สร้างใบวางบิล"\n• เลือก Invoice ที่ต้องการรวมวางบิล (เลือกได้หลายใบ)\n• ระบบคำนวณยอดรวมให้อัตโนมัติ\n• กด "บันทึก" → สามารถพิมพ์ได้ทันที\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด`,

    receipts: `🧾 ใบเสร็จรับเงิน\n\n• สร้างจากใบวางบิล\n• 👁️ ดูรายละเอียด — กดที่แถวนั้น\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด\n• ใช้เป็นหลักฐานการรับเงินจากลูกค้า`,

    companyInfo: `🏢 ข้อมูลบริษัท\n\n• แก้ไขชื่อบริษัท, ที่อยู่, เลขประจำตัวผู้เสียภาษี\n• อัปโหลดโลโก้บริษัท\n• ข้อมูลเหล่านี้จะแสดงในเอกสารที่พิมพ์\n• กด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง`,

    users: `🔐 สิทธิ์การใช้งาน\n\n• ➕ เพิ่มผู้ใช้ — กดปุ่ม "เพิ่มผู้ใช้"\n• ตั้งชื่อผู้ใช้, รหัสผ่าน, ชื่อแสดง\n• ✏️ กำหนดสิทธิ์ — ติ๊กเลือกสิทธิ์ตามโมดูล\n  (view/create/edit/delete)\n• สิทธิ์ที่เปิด = เข้าถึงเมนูนั้นได้\n• สิทธิ์ที่ปิด = เมนูจะไม่แสดง`,

    employees: `👷 รายชื่อพนักงาน\n\n• ➕ เพิ่มพนักงาน — กดปุ่ม "เพิ่มพนักงาน"\n• กรอกข้อมูล: ชื่อ, รหัส, ตำแหน่ง, เงินเดือน\n• ✏️ แก้ไข — กดไอคอนดินสอ\n• 📊 นำเข้าเวลาจาก Excel:\n  1. กดปุ่ม "นำเข้าเวลา"\n  2. เลือกไฟล์ Excel (Standard Report)\n  3. ดู Preview → กด "ยืนยัน"\n• 📋 ดูสรุปเวลาทำงาน — กดปุ่ม "ลงเวลาทำงาน"`,

    settings: `⚙️ ตั้งค่าระบบ\n\n• ตั้งค่ารูปแบบเลขเอกสาร\n  เช่น IV{YYYY}{MM}{RUN4} → IV2569030001\n• ตั้งจำนวนหลัก Running Number (3-7 หลัก)\n• กด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง`
};

export default PageHeader;
