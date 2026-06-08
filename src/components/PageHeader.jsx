import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ title, subtitle, helpContent, children }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    const handleHelpClick = () => {
        // Map helpContent/title to section ID
        let section = 'dashboard';
        const t = (title || '').toLowerCase();
        if (t.includes('ใบสั่งซื้อ') || t.includes('po')) section = 'purchase-orders';
        else if (t.includes('ลูกค้า') || t.includes('customer')) section = 'customer';
        else if (t.includes('กำกับภาษี') || t.includes('invoice')) section = 'invoice';
        else if (t.includes('ภาพรวม') || t.includes('dashboard')) section = 'dashboard';

        navigate(`/dashboard/guide?section=${section}`);
    };

    return (
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="m-0 text-[1.8rem] font-semibold">{title}</h1>
                    {subtitle && (
                        <p className="mt-2 text-textMuted m-0">{subtitle}</p>
                    )}
                </div>
                {helpContent && (
                    <div className="relative">
                        <button
                            onClick={handleHelpClick}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="help-button-prominent w-[42px] h-[42px] rounded-full border-2 border-blue-500 bg-blue-500/10 text-blue-500 cursor-pointer flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 relative shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        >
                            <HelpCircle size={24} />
                            <span className="help-pulse"></span>
                        </button>

                        {/* Custom Tooltip */}
                        <div className={`absolute left-1/2 bottom-[-45px] -translate-x-1/2 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-[100] pointer-events-none bg-[#1e293b] text-white py-[0.6rem] px-4 rounded-lg text-[0.85rem] whitespace-nowrap shadow-[0_10px_20px_rgba(0,0,0,0.2)] font-medium ${isHovered ? 'translate-y-0 opacity-100 visible' : 'translate-y-[10px] opacity-0 invisible'}`}>
                            ดูวิธีใช้งานส่วนนี้ (Help Guide)
                            <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#1e293b]"></div>
                        </div>

                        <style>{`
                            .help-button-prominent:hover {
                                transform: scale(1.1) rotate(10deg);
                                background: #3b82f6 !important;
                                color: white !important;
                                box-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
                            }
                            .help-pulse {
                                position: absolute;
                                top: 0; left: 0; right: 0; bottom: 0;
                                border-radius: 50%;
                                border: 2px solid #3b82f6;
                                animation: help-pulse-anim 2s infinite;
                                pointer-events: none;
                            }
                            @keyframes help-pulse-anim {
                                0% { transform: scale(1); opacity: 0.8; }
                                100% { transform: scale(1.6); opacity: 0; }
                            }
                        `}</style>
                    </div>
                )}
            </div>
            {children && (
                <div className="flex gap-3 flex-wrap">
                    {children}
                </div>
            )}
        </div>
    );
};

// Help content for each page (for legacy or other uses)
export const HELP_CONTENT = {
    overview: {
        text: `📊 ภาพรวมระบบ (Dashboard)\n\n• ดูจำนวนลูกค้าทั้งหมดในระบบ\n• ดูยอดขายเดือนนี้ (จากใบกำกับภาษี)\n• ดูยอดวางบิลเดือนนี้\n• ดูจำนวนใบกำกับที่รอดำเนินการ\n• ดูตารางใบกำกับภาษีล่าสุด\n• ดูตารางใบวางบิลล่าสุด`,
        video: '/videos/dashboard_tutorial.webp'
    },

    customers: `👥 จัดการลูกค้า\n\n• 🔍 ค้นหา — พิมพ์ชื่อ/อีเมล/ผู้ติดต่อในช่องค้นหา\n• ➕ เพิ่มลูกค้า — กดปุ่ม "เพิ่มลูกค้า" แล้วกรอกข้อมูล\n• 👁️ ดูรายละเอียด — กดไอคอนตาที่แถวนั้น\n• ✏️ แก้ไข — กดไอคอนดินสอ\n• 🗑️ ลบ — กดไอคอนถังขยะ (ต้องยืนยัน)\n• 📊 Export Excel — กดปุ่ม "Export Excel" ดาวน์โหลดข้อมูลทั้งหมด`,

    purchaseOrders: `📋 ใบสั่งซื้อ (PO)\n\n• ➕ สร้าง PO — กดปุ่ม "สร้างใบสั่งซื้อ"\n• เลือกลูกค้าจาก dropdown\n• เพิ่มรายการสินค้า (ชื่อ, จำนวน, ราคาต่อหน่วย)\n• ระบบคำนวณยอดรวมอัตโนมัติ\n• กด "บันทึก" เพื่อบันทึก Draft\n• 👁️ ดู / ✏️ แก้ไข / 🗑️ ลบ ผ่านปุ่มในแต่ละแถว`,

    invoices: `📄 ใบกำกับภาษี\n\n• ➕ สร้างใบกำกับภาษี — กดปุ่ม "สร้างใบกำกับภาษี"\n• เลือกลูกค้า → เพิ่มรายการสินค้า\n• 🚚 ผู้จัดส่ง (Optional) — ระบุชื่อคนส่งของได้\n• ระบบคำนวณภาษี 7% อัตโนมัติ\n• เลขที่เอกสารสร้างอัตโนมัติ (เช่น IV0007595)\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด\n• สถานะ: Draft → Sent (เมื่อวางบิล) → Paid`,

    billingNotes: `📑 ใบวางบิล\n\n• ➕ สร้างใบวางบิล — กดปุ่ม "สร้างใบวางบิล"\n• เลือก Invoice ที่ต้องการรวมวางบิล (เลือกได้หลายใบ)\n• ระบบคำนวณยอดรวมให้อัตโนมัติ\n• กด "บันทึก" → สามารถพิมพ์ได้ทันที\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด`,

    receipts: `🧾 ใบเสร็จรับเงิน\n\n• สร้างจากใบวางบิล\n• 👁️ ดูรายละเอียด — กดที่แถวนั้น\n• 🖨️ พิมพ์ — กดปุ่ม "พิมพ์" ในหน้ารายละเอียด\n• ใช้เป็นหลักฐานการรับเงินจากลูกค้า`,

    companyInfo: `🏢 ข้อมูลบริษัท\n\n• แก้ไขชื่อบริษัท, ที่อยู่, เลขประจำตัวผู้เสียภาษี\n• อัปโหลดโลโก้บริษัท\n• ข้อมูลเหล่านี้จะแสดงในเอกสารที่พิมพ์\n• กด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง`,

    users: `🔐 สิทธิ์การใช้งาน\n\n• ➕ เพิ่มผู้ใช้ — กดปุ่ม "เพิ่มผู้ใช้"\n• ตั้งชื่อผู้ใช้, รหัสผ่าน, ชื่อแสดง\n• ✏️ กำหนดสิทธิ์ — ติ๊กเลือกสิทธิ์ตามโมดูล\n  (view/create/edit/delete)\n• สิทธิ์ที่เปิด = เข้าถึงเมนูนั้นได้\n• สิทธิ์ที่ปิด = เมนูจะไม่แสดง`,

    employees: `👷 รายชื่อพนักงาน\n\n• ➕ เพิ่มพนักงาน — กดปุ่ม "เพิ่มพนักงาน"\n• กรอกข้อมูล: ชื่อ, รหัส, ตำแหน่ง, เงินเดือน\n• ✏️ แก้ไข — กดไอคอนดินสอ\n• 📊 นำเข้าเวลาจาก Excel:\n  1. กดปุ่ม "นำเข้าเวลา"\n  2. เลือกไฟล์ Excel (Standard Report)\n  3. ดู Preview → กด "ยืนยัน"\n• 📋 ดูสรุปเวลาทำงาน — กดปุ่ม "ลงเวลาทำงาน"`,

    settings: `⚙️ ตั้งค่าระบบ\n\n• ตั้งค่ารูปแบบเลขเอกสาร\n  เช่น IV{YYYY}{MM}{RUN4} → IV2569030001\n• ตั้งจำนวนหลัก Running Number (3-7 หลัก)\n• กด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง`
};

export default PageHeader;
