import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Activity, ShoppingCart, FileDigit, FileSymlink, Receipt,
    LayoutDashboard, FileText, Calendar, Users, Target, Search,
    Plus, Edit, Eye, Trash2, ArrowUpRight, UploadCloud, Printer,
    AlertTriangle, CheckCircle2, AlertCircle, ChevronRight, BookOpen, Layers,
    MousePointer2, Building, FileCheck, Upload, Download, Image, Save,
    User, UserCircle
} from 'lucide-react';

const GuideTab = () => {
    const [searchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const scrollContainerRef = useRef(null);

    const menuItems = [
        { id: 'dashboard', label: '1. Dashboard', icon: <Activity size={16} /> },
        { id: 'purchase-order', label: '2. ใบสั่งซื้อ (PO)', icon: <ShoppingCart size={16} /> },
        { id: 'tax-invoice', label: '3. ใบกำกับภาษี (Invoice)', icon: <FileDigit size={16} /> },
        { id: 'billing-note', label: '4. ใบวางบิล (Billing Note)', icon: <FileSymlink size={16} /> },
        { id: 'receipt', label: '5. ใบเสร็จ (Receipt)', icon: <Receipt size={16} /> },
        { id: 'customer', label: '6. ข้อมูลลูกค้า (Customer)', icon: <Users size={16} /> },
        { id: 'certificate', label: '7. จัดการ Certificate', icon: <FileCheck size={16} /> },
        { id: 'company', label: '8. ข้อมูลบริษัท', icon: <Building size={16} /> }
    ];

    useEffect(() => {
        const sectionId = searchParams.get('section');
        if (sectionId) {
            scrollToSection(sectionId);
        }
    }, [searchParams]);

    const scrollToSection = (id) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    return (
        <div className="guide-master-container" ref={scrollContainerRef}>
            {/* Header Section */}
            <header className="guide-master-header">
                <div className="header-badge">
                    <BookOpen size={16} />
                    <span>Official Documentation v4.5</span>
                </div>
                <h1 className="header-title">คู่มือระบบ <span className="text-gradient">MAW OS</span> แบบเจาะลึก</h1>
                <p className="header-desc">
                    อธิบายการใช้งานทุกเมนูอย่างละเอียด ขั้นตอนการทำงาน (Workflow)
                    หน้าที่ของแต่ละปุ่ม และข้อควรระวังในการปฏิบัติงาน
                </p>

            </header>

            {/* Navigation Bar */}
            <nav className="guide-master-nav">
                <div className="nav-pill-container">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-pill ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(item.id)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="guide-master-body">

                {/* 1. Dashboard */}
                <section id="dashboard" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon indigo"><Activity size={24} /></div>
                        <h2>1. Dashboard & วิเคราะห์ข้อมูล</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            หน้า Dashboard แบ่งข้อมูลออกเป็นแท็บย่อย (Tabs) เพื่อให้คุณสามารถวิเคราะห์สถิติในแต่ละส่วนของธุรกิจได้อย่างชัดเจน นี่คือรายละเอียดข้อมูลที่แสดงในแต่ละแท็บ:
                        </p>

                        <div className="tab-details-list">
                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge indigo"><LayoutDashboard size={14} /> ภาพรวม (Overview)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>KPI Cards:</strong> แสดงยอดขายรวมเดือนนี้, จำนวนลูกค้าทั้งหมด, จำนวนใบสั่งซื้อ (PO) ใหม่ และยอดใบเสนอราคา</li>
                                    <li><strong>Alert Banner:</strong> แจ้งเตือนด่วนกรณีมี Certificate ของลูกค้าที่กำลังจะหมดอายุใน 30 วัน หรือหมดอายุไปแล้ว</li>
                                    <li><strong>Main Analytics Chart:</strong> กราฟเส้นเปรียบเทียบยอดขาย (Invoice), ยอดสั่งซื้อ (PO) และยอดเสนอราคา (Quotation)</li>
                                    <li><strong>Top 5 สินค้าขายดี:</strong> จัดอันดับสินค้าที่ทำยอดขายสูงสุด พร้อมแสดงจำนวนหน่วยที่ขายได้และมูลค่ารวม</li>
                                    <li><strong>Top 5 ลูกค้ารายใหญ่:</strong> จัดอันดับลูกค้าที่มียอดสั่งซื้อสูงสุด เพื่อการดูแลแบบ VIP</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge orange"><ShoppingCart size={14} /> ใบสั่งซื้อ (PO)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปสถิติด่วน (KPI Cards):</strong> แสดงข้อมูลแบบ <strong>"มูลค่ารวม | จำนวนหน่วย"</strong> (เช่น ฿1.5M | 2,500 หน่วย) ครอบคลุมทั้ง PO ทั้งหมด, PO ของเดือนนี้, งานที่รอดำเนินการ และงานที่เลยกำหนดส่ง</li>
                                    <li><strong>สถานะ PO ทั้งหมด:</strong> สรุปจำนวนงานแยกตามสถานะการทำงาน (Waiting, Progressing, Completed, Cancelled) พร้อมยอดรวมมูลค่า PO ของเดือนปัจจุบัน</li>
                                    <li><strong>แนวโน้มใบสั่งซื้อ (PO):</strong> กราฟวิเคราะห์มูลค่าหรือจำนวนคำสั่งซื้อตามช่วงเวลา พร้อมเครื่องมือช่วยวิเคราะห์อัจฉริยะ เช่น เส้นค่าเฉลี่ย, ยอดสะสม และ AI วิเคราะห์ความถี่</li>
                                    <li><strong>PO ที่ต้องส่ง (ภายใน 7 วัน):</strong> ตารางติดตามงานที่ใกล้ถึงกำหนดส่งและงานที่เลยกำหนดส่ง (ตัวหนังสือสีแดง) เพื่อป้องกันการส่งล่าช้า</li>
                                    <li><strong>ลูกค้าที่มียอดสั่งซื้อสูงสุด:</strong> แสดงรายชื่อ 5 อันดับลูกค้าที่มียอดสั่งซื้อรวมสูงที่สุด ช่วยให้ระบุลูกค้ารายสำคัญได้ง่าย</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge blue"><FileDigit size={14} /> ใบกำกับภาษี (Invoice)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปสถิติด่วน (KPI Cards):</strong> แสดงข้อมูลแบบ <strong>"มูลค่ารวม | จำนวนหน่วย"</strong> ของ Invoice ทั้งหมด, ยอดขายเดือนนี้, ยอดที่รอการวางบิล และยอดที่รับชำระแล้ว</li>
                                    <li><strong>สถานะ Invoice ทั้งหมด:</strong> สรุปจำนวนเอกสารแยกตามสถานะทางบัญชี (Draft, Sent/Pending, Paid, Cancelled) เพื่อให้ทราบปริมาณงานในแต่ละขั้นตอน</li>
                                    <li><strong>แนวโน้มยอดขาย (Invoice):</strong> กราฟแสดงการเติบโตของรายได้ตามช่วงเวลา สามารถเลือกดูตามมูลค่าเงินหรือจำนวนใบกำกับภาษี พร้อมระบบวิเคราะห์เทรนด์การขาย</li>
                                    <li><strong>Invoice ล่าสุด:</strong> ตารางแสดงรายการใบกำกับภาษีที่เพิ่งออกล่าสุด พร้อมสถานะการชำระเงินเพื่อให้ติดตามได้ง่าย</li>
                                    <li><strong>ยอดค้างวางบิลทั้งหมด:</strong> แสดงมูลค่าเงินที่ยังไม่ได้เรียกเก็บ พร้อมรายชื่อลูกค้ายอดค้างชำระสูงที่สุดและปุ่มทางลัดสำหรับไปสร้างใบวางบิลได้ทันที</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge purple"><FileSymlink size={14} /> ใบวางบิล (Billing Note)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปสถิติด่วน (KPI Cards):</strong> แสดงข้อมูลแบบ <strong>"มูลค่ารวม | จำนวนหน่วย"</strong> ของใบวางบิลทั้งหมด, บิลเดือนปัจจุบัน, ยอดที่ค้างเก็บเงิน และยอดที่เก็บเงินแล้ว</li>
                                    <li><strong>สถานะใบวางบิล:</strong> สรุปจำนวนเอกสารแยกตามสถานะทางบัญชี (Draft, Pending, Paid) เพื่อให้ทราบปริมาณงานในแต่ละขั้นตอน</li>
                                    <li><strong>ยอดค้างเก็บเงินทั้งหมด:</strong> แสดงมูลค่ารวมของเงินที่วางบิลไปแล้วแต่ยังไม่ได้รับชำระ พร้อมสรุปยอดค้างรายลูกค้าเพื่อความสะดวกในการติดตาม</li>
                                    <li><strong>แนวโน้มใบวางบิล:</strong> กราฟวิเคราะห์ยอดการวางบิลย้อนหลัง ช่วยให้ประเมินปริมาณการเรียกเก็บเงินในแต่ละช่วงเวลา</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge green"><Receipt size={14} /> ใบเสร็จรับเงิน (Receipt)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปยอดเงินสด (KPI Cards):</strong> แสดงยอดเงินที่เก็บได้จริงในเดือนนี้เปรียบเทียบกับเดือนก่อนหน้า เพื่อดูประสิทธิภาพการจัดเก็บรายได้</li>
                                    <li><strong>การเปรียบเทียบผลงาน:</strong> ส่วนแสดงเปอร์เซ็นต์การเติบโตของการเก็บเงินสดเปรียบเทียบระหว่างเดือนปัจจุบันและเดือนที่ผ่านมา (Growth %)</li>
                                    <li><strong>แนวโน้มใบเสร็จรับเงิน:</strong> กราฟกระแสเงินสดที่ได้รับจริง (Cash Flow) ช่วยให้เห็นช่วงเวลาที่มีเงินสดไหลเข้าบริษัทมากที่สุด</li>
                                    <li><strong>รายการล่าสุด:</strong> ตารางแสดงใบเสร็จรับเงินที่เพิ่งออกล่าสุด เพื่อตรวจสอบการรับเงินสดเข้าระบบ</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge red"><Calendar size={14} /> ปฏิทินงาน (Calendar)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>Due Date Tracking:</strong> แสดงวันกำหนดส่งมอบงาน (Due Date) ของ PO ทั้งหมดในรูปแบบปฏิทินรายเดือน</li>
                                    <li><strong>Status Colors:</strong> ใช้สีแยกสถานะงานบนปฏิทิน (เช่น สีเหลือง=รอผลิต, สีเขียว=ส่งแล้ว) เพื่อให้เห็นภาพรวมได้ทันที</li>
                                    <li><strong>Quick Access:</strong> สามารถคลิกที่รายการในปฏิทินเพื่อเปิดดูรายละเอียด PO ใบนั้นได้โดยไม่ต้องเปลี่ยนหน้า</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge blue"><Users size={14} /> ข้อมูลลูกค้า (Customer CRM)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปฐานลูกค้า (KPI Cards):</strong> แสดงจำนวนลูกค้าทั้งหมดในระบบ, จำนวนลูกค้าที่ Active และจำนวนรายชื่อลูกค้าใหม่ในเดือนนี้</li>
                                    <li><strong>แนวโน้มยอดสั่งซื้อ:</strong> กราฟวิเคราะห์ยอดขายแยกตามรายลูกค้า ช่วยให้เห็นพฤติกรรมการซื้อและมูลค่าการสั่งซื้อในช่วงเวลาต่างๆ</li>
                                    <li><strong>Top 10 ลูกค้ายอดสูงสุด:</strong> ตารางจัดอันดับลูกค้ารายใหญ่ พร้อมแสดง <strong>ยอดเงินรวม, จำนวนบิล และปริมาณสินค้าทั้งหมด (Units)</strong> ที่สั่งซื้อ</li>
                                    <li><strong>แจ้งเตือน Certificate:</strong> ส่วนแสดงรายการเอกสารรับรองของลูกค้าที่ใกล้หมดอายุ เพื่อให้ติดตามขอเอกสารใหม่ได้ทันเวลา</li>
                                </ul>
                            </div>

                            <div className="tab-info-card">
                                <div className="tab-info-header">
                                    <div className="tab-badge indigo"><UserCircle size={14} /> ข้อมูลพนักงาน (Employee)</div>
                                </div>
                                <ul className="info-bullets">
                                    <li><strong>สรุปกำลังคน (KPI Cards):</strong> แสดงจำนวนพนักงานทั้งหมด และสถิติ <strong>"ยอดรวมค่าแรง | จำนวนวันทำงานรวม"</strong> ในเดือนปัจจุบัน</li>
                                    <li><strong>แนวโน้มการทำงาน:</strong> กราฟสถิติการลงเวลาทำงาน (Timesheet) ของพนักงานในภาพรวม ช่วยให้เห็นความหนาแน่นของงาน</li>
                                    <li><strong>สรุปเวลาทำงานและค่าแรง:</strong> รายละเอียดรายบุคคลแสดงจำนวนวันที่ทำงานจริง อัตราค่าแรง และยอดรวมค่าแรงสะสมในเดือนนั้นๆ</li>
                                    <li><strong>สถานะการลงเวลา:</strong> ส่วนแจ้งเตือนพนักงานที่ยังไม่ได้ลงเวลาทำงาน เพื่อให้ฝ่ายบุคคลติดตามข้อมูลให้ครบถ้วน</li>
                                </ul>
                            </div>
                            <div className="tab-info-card full-width">
                                <div className="tab-info-header">
                                    <div className="tab-badge indigo"><Activity size={14} /> เจาะลึกการใช้งานกราฟ & เครื่องมือวิเคราะห์</div>
                                </div>
                                <div className="chart-guide-grid">
                                    <div className="chart-guide-item">
                                        <h5><MousePointer2 size={14} /> ตัวเลือกการแสดงผล (Action Buttons)</h5>
                                        <ul className="info-bullets">
                                            <li><strong>ตัวเลข:</strong> แสดงค่าตัวเลขบนจุดยอดของกราฟทุกจุดทันทีโดยไม่ต้องเอาเมาส์ไปชี้</li>
                                            <li><strong>ตาราง:</strong> สลับจากการดูเป็นเส้นกราฟ เป็นตารางสรุปข้อมูลรายวัน/รายเดือน เพื่อการตรวจสอบที่แม่นยำ</li>
                                            <li><strong>เส้นค่าเฉลี่ยเคลื่อนที่:</strong> ใช้เส้น Moving Average เพื่อตัดความผันผวนของข้อมูล ทำให้เห็น "เทรนด์" ที่แท้จริงได้ง่ายขึ้น</li>
                                            <li><strong>เส้นค่าเฉลี่ย:</strong> ขีดเส้นระดับค่าเฉลี่ยรวมของข้อมูลในกราฟ เพื่อเปรียบเทียบว่าวันไหนสูงหรือต่ำกว่ามาตรฐาน</li>
                                            <li><strong>สะสม:</strong> เปลี่ยนกราฟรายวันให้เป็นกราฟยอดรวมสะสมแบบขั้นบันได เพื่อดูความสำเร็จของเป้าหมายรวม</li>
                                            <li><strong>วิเคราะห์:</strong> เปิด/ปิด ระบบ AI Insights ที่จะสรุปประเด็นสำคัญ เช่น วันที่ขายดีที่สุด หรือเทรนด์ขาลง</li>
                                        </ul>
                                    </div>
                                    <div className="chart-guide-item">
                                        <h5><Search size={14} /> ตัวกรองและ Insights อัจฉริยะ</h5>
                                        <ul className="info-bullets">
                                            <li><strong>ปุ่มสลับข้อมูล (Invoices/POs/Quo):</strong> ใช้เลือกประเภทข้อมูลที่ต้องการวิเคราะห์ โดยสีของกราฟจะเปลี่ยนไปตามประเภท</li>
                                            <li><strong>ช่วงเวลา (Dropdown):</strong> กำหนดความละเอียดของข้อมูล (รายวัน, รายสัปดาห์, รายเดือน) หรือช่วงวันที่ต้องการดู</li>
                                            <li><strong>แถบสถานะ (Smart Insights):</strong> กล่องข้อความสีสันต่างๆ (แดง, ฟ้า, ส้ม) ที่ระบบช่วยสรุปให้โดยอัตโนมัติ เช่น "ยอดสั่งซื้อมีแนวโน้มลดลง 100%" หรือ "วันที่ดีที่สุดคือวันที่..." เพื่อให้คุณไม่ต้องคำนวณเอง</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 2. Purchase Order */}
                <section id="purchase-order" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon orange"><ShoppingCart size={24} /></div>
                        <h2>2. ใบสั่งซื้อ (Purchase Order)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            โมดูลใบสั่งซื้อ (PO) คือหัวใจของการควบคุมการผลิตและการขาย ใช้รับคำสั่งซื้อจากลูกค้า ติดตามสถานะการทำงาน และเป็นเอกสารต้นทางสำหรับเปิดบิล
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (PO List Page):</strong> แสดงตาราง PO ทั้งหมด มีช่องค้นหา และสามารถกรองตามสถานะได้</li>
                                <li><strong>หน้าสร้าง/แก้ไข (PO Form Page):</strong> ฟอร์มสำหรับกรอกข้อมูลลูกค้า เพิ่มรายการสินค้า และตั้งราคา</li>
                                <li><strong>หน้ารายละเอียด (PO Detail Page):</strong> แสดงข้อมูลฉบับเต็ม ใช้สำหรับดูไฟล์แนบ และสั่งพิมพ์เอกสาร</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>สร้างเอกสารรับคำสั่งซื้อ</h4>
                                        <p>รับ PO จากลูกค้าเข้าสู่ระบบ กดปุ่ม <code>+ สร้างใบสั่งซื้อใหม่</code> เลือกลูกค้าจากฐานข้อมูล เพิ่มรายการสินค้าที่สั่งซื้อ และที่สำคัญคือต้องระบุ <strong>"กำหนดส่งมอบ" (Due Date)</strong></p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>อัปโหลดหลักฐาน</h4>
                                        <p>ในหน้ารายละเอียด ให้ใช้ปุ่ม <code>อัปโหลด PDF</code> เพื่อแนบไฟล์ PO ตัวจริงที่ได้จากลูกค้า (Customer PO) เก็บไว้เป็นหลักฐานป้องกันการผิดพลาด</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>อัปเดตสถานะงาน</h4>
                                        <p>เมื่อโรงงานเริ่มทำการผลิต ให้เปลี่ยนสถานะจาก <strong>Waiting</strong> เป็น <strong>Progressing</strong> และเมื่อของส่งถึงมือลูกค้า ให้เปลี่ยนเป็น <strong>Delivered</strong></p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">4</div>
                                    <div className="v-step-content">
                                        <h4>แปลงเป็น Invoice (สิ้นสุดงาน)</h4>
                                        <p>เมื่องานส่งมอบเรียบร้อย (Delivered) ให้กดปุ่ม <code>Convert to Invoice</code> เพื่อดึงข้อมูลสินค้าทั้งหมดไปออกใบกำกับภาษีทันทีโดยไม่ต้องพิมพ์ใหม่</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Plus size={14} /> สร้าง PO</span>
                                    <span>เปิดหน้าฟอร์มเพื่อบันทึกคำสั่งซื้อใหม่เข้าระบบ</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag gray"><Eye size={14} /> ดูรายละเอียด</span>
                                    <span>เปิดหน้า Detail Page เพื่อตรวจสอบข้อมูลทั้งหมดและสั่งพิมพ์</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag warning"><Edit size={14} /> แก้ไข</span>
                                    <span>กลับไปแก้ไขข้อมูลสินค้าหรือราคา (ทำได้ตราบใดที่ยังไม่ได้นำไปออก Invoice)</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag dark"><UploadCloud size={14} /> อัปโหลด PDF</span>
                                    <span>ปุ่มสำหรับแนบไฟล์หลักฐาน (PDF/รูปภาพ) เก็บไว้กับ PO ใบนี้</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag success"><ArrowUpRight size={14} /> Convert to Invoice</span>
                                    <span>ปุ่มวิเศษสำหรับย้ายข้อมูลจาก PO ปัจจุบัน ไปสร้างเป็น Invoice ใบใหม่แบบ 1-Click</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag outline">Dropdown สถานะ</span>
                                    <span>กล่องเลือกสถานะงาน: Waiting (สีส้ม), Progressing (สีฟ้า), Delivered (สีเขียว)</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box warning">
                            <div className="alert-icon"><AlertTriangle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งาน PO</h4>
                                <ul>
                                    <li><strong>การใส่วันที่ Due Date:</strong> ห้ามลืมใส่วันกำหนดส่งเด็ดขาด เพราะระบบจะใช้จุดนี้ไปแสดงเตือนใน "ปฏิทินงาน" หากไม่ใส่ งานนั้นจะหายไปจากการติดตามบนปฏิทิน</li>
                                    <li><strong>การแก้ไขหลังแปลงเอกสาร:</strong> หากคุณกด Convert to Invoice ไปแล้ว แล้วกลับมาแก้จำนวนสินค้าใน PO ข้อมูลใน Invoice <strong>จะไม่ถูกอัปเดตตาม</strong> คุณต้องตามไปแก้ไขใน Invoice ด้วยตนเอง</li>
                                    <li><strong>แนบไฟล์เสมอ:</strong> ควรฝึกนิสัยแนบ PDF ต้นฉบับจากลูกค้าเสมอ เพื่อให้แผนกอื่นๆ สามารถตรวจสอบสเปคสินค้าที่ถูกต้องได้ตลอดเวลา</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 3. Tax Invoice */}
                <section id="tax-invoice" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon blue"><FileDigit size={24} /></div>
                        <h2>3. ใบกำกับภาษี (Tax Invoice)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            เอกสารสำคัญทางบัญชีที่ใช้เรียกเก็บเงินลูกค้า ระบบจะคำนวณภาษีมูลค่าเพิ่ม (VAT 7%) ให้อัตโนมัติ และรองรับการพิมพ์บนกระดาษหลายขนาด
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (Invoice List):</strong> จัดการเอกสารทั้งหมด มีการแสดงผลรวมยอดสุทธิ (Grand Total) อย่างชัดเจน</li>
                                <li><strong>หน้าสร้าง/แก้ไข (Invoice Form):</strong> ฟอร์มเพิ่มสินค้า สามารถคำนวณยอดเงินและภาษีแบบ Real-time</li>
                                <li><strong>หน้าพรีวิวและพิมพ์ (Preview/Print Page):</strong> หน้าต่างสำหรับการจัดหน้ากระดาษก่อนสั่งพิมพ์ออกทางพรินเตอร์</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>สร้างเอกสารตั้งเบิก</h4>
                                        <p>วิธีที่ดีที่สุดคือการกด <code>Convert to Invoice</code> มาจากหน้า PO แต่ถ้าเป็นการขายปลีกทั่วไป คุณสามารถเข้าเมนูนี้แล้วกด <code>+ สร้างใบกำกับภาษี</code> เพื่อพิมพ์เองใหม่ทั้งหมดได้เช่นกัน</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>ตรวจสอบข้อมูลและผู้จัดส่ง</h4>
                                        <p>ในหน้ากรอกข้อมูล ให้เช็ค "ราคาสินค้า x จำนวน" ให้ถูกต้อง ระบบจะนำยอดรวมไปคำนวณ VAT 7% ให้เอง และคุณสามารถระบุ <strong>"ผู้จัดส่ง" (Delivered By)</strong> เพื่อบันทึกว่าใครเป็นคนนำสินค้าไปส่ง</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>สั่งพิมพ์เอกสาร</h4>
                                        <p>เข้าหน้ารายละเอียด กดปุ่มเลือกรูปแบบกระดาษ (A4 หรือ 9x11") เพื่อให้ Layout จัดเรียงตรงกับเครื่องปรินท์ จากนั้นสั่งพิมพ์เพื่อจัดส่งให้ลูกค้าพร้อมสินค้า</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">4</div>
                                    <div className="v-step-content">
                                        <h4>รอกระบวนการวางบิล</h4>
                                        <p>เมื่อ Invoice ถูดจัดส่งไปแล้ว สถานะทางการเงินของมันคือ "ค้างชำระ" ซึ่งต้องรอฝ่ายบัญชีนำไปจัดทำ <strong>ใบวางบิล</strong> ในขั้นตอนต่อไป</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Plus size={14} /> สร้างใบกำกับภาษี</span>
                                    <span>สร้างเอกสารเรียกเก็บเงินใบใหม่จากศูนย์ (Manual Entry)</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag warning"><Edit size={14} /> แก้ไข</span>
                                    <span>ปรับปรุงตัวเลขหรือรายการ (ฟอร์มจะล็อคการแก้ไขอัตโนมัติหากนำไปวางบิลแล้ว)</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag dark"><Printer size={14} /> พิมพ์ A4</span>
                                    <span>จัด Layout สำหรับพิมพ์บนกระดาษ A4 มาตรฐาน (Laser / Inkjet)</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag outline"><Printer size={14} /> พิมพ์ 9x11"</span>
                                    <span>จัด Layout พิเศษสำหรับพิมพ์ลงบน <strong>กระดาษต่อเนื่อง (Dot Matrix)</strong> กว้าง 9 นิ้ว ยาว 11 นิ้ว โดยตัดขอบกระดาษออก</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box danger">
                            <div className="alert-icon"><AlertCircle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งาน Invoice</h4>
                                <ul>
                                    <li><strong>ห้ามแก้ไขเลขที่เอกสารมั่ว:</strong> ระบบถูกตั้งค่าให้รันเลขอัตโนมัติ (Auto-running) เพื่อให้สรรพากรตรวจสอบได้ง่าย หากมีการกระโดดของเลขที่ Invoice อาจมีปัญหาตอนปิดงบบัญชีได้ (หากต้องแก้ ให้ไปตั้งค่าใน Setting ก่อน)</li>
                                    <li><strong>การแก้ไขหลังวางบิล:</strong> หากนำ Invoice ไปผูกกับใบวางบิล (Billing Note) แล้ว ระบบจะไม่ยอมให้แก้ไข Invoice นั้นอีก หากพิมพ์ผิด คุณต้องไป <strong>"ยกเลิกใบวางบิล"</strong> ก่อน Invoice ถึงจะปลดล็อคให้แก้ได้</li>
                                    <li><strong>การปัดเศษ:</strong> ระบบใช้หลักการปัดเศษทศนิยม 2 ตำแหน่งตามมาตรฐานบัญชี โปรดระวังกรณีสินค้าราคาต่อหน่วยมีทศนิยมหลายตำแหน่ง</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 4. Billing Note */}
                <section id="billing-note" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon purple"><FileSymlink size={24} /></div>
                        <h2>4. ใบวางบิล (Billing Note)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            ใช้สำหรับรวบรวม Invoice หลายๆ ใบที่ออกให้กับลูกค้าคนเดียวกัน เพื่อสรุปยอดและส่งเอกสารแจ้งเตือนให้ลูกค้าชำระเงินในครั้งเดียว
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (Billing Note List):</strong> แสดงใบวางบิลที่จัดทำแล้วทั้งหมด แสดงยอดรวมสุทธิและวันที่กำหนดชำระ</li>
                                <li><strong>หน้าสร้าง (Create Billing Note):</strong> หน้านี้จะแปลกกว่าหน้าอื่น เพราะจะไม่มีให้พิมพ์ชื่อสินค้า แต่จะเป็น <strong>ตารางให้ติ๊กเลือก Invoice</strong> ที่ค้างชำระอยู่ขึ้นมาผูกรวมกัน</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>เลือกลูกค้าเป้าหมาย</h4>
                                        <p>เข้าหน้าสร้างใบวางบิล เริ่มต้นด้วยการ "เลือกลูกค้า" จาก Dropdown ทันทีที่เลือกเสร็จ ระบบจะค้นหา Invoice ของลูกค้าคนนั้นที่ยังไม่ได้รับเงิน มาโชว์ด้านล่างทั้งหมด</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>ติ๊กเลือก Invoice</h4>
                                        <p>ในตารางด้านล่าง ให้ติ๊กถูก (Checkbox) หน้า Invoice ที่คุณต้องการรวมไว้ในบิลรอบนี้ ระบบจะคำนวณยอดรวม (Grand Total) ให้ที่ด้านล่างจอทันที</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>กำหนดวันนัดชำระเงิน</h4>
                                        <p>ระบุ <strong>"Due Date"</strong> เพื่อบอกลูกค้าว่าบิลรอบนี้ต้องโอนเงินภายในวันที่เท่าไหร่ และใช้สำหรับให้ฝ่ายบัญชีติดตามทวงถาม</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">4</div>
                                    <div className="v-step-content">
                                        <h4>พิมพ์และจัดส่งเอกสาร</h4>
                                        <p>บันทึกแล้วสั่งพิมพ์ใบวางบิล ซึ่งทำหน้าที่เป็น "ใบหน้า" (Cover sheet) แนบไปพร้อมกับ Invoice ต้นฉบับทั้งหมด ส่งให้ลูกค้าเพื่อทำเรื่องเบิกจ่าย</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Plus size={14} /> สร้างใบวางบิล</span>
                                    <span>เปิดหน้าต่างเพื่อรวบรวม Invoice ที่ยังไม่จ่ายเงินเข้าด้วยกัน</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag outline"><CheckCircle2 size={14} /> Checkbox เลือกเอกสาร</span>
                                    <span>ใช้ติ๊กเลือก Invoice แต่ละใบ ระบบจะนำยอดบิลที่ติ๊กมาบวกกันอัตโนมัติ</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag danger"><Trash2 size={14} /> ลบใบวางบิล</span>
                                    <span>ยกเลิกบิลใบนี้ (หากลบ Invoice ที่ถูกผูกไว้จะกลับไปมีสถานะค้างชำระและสามารถนำไปวางบิลใหม่ได้)</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box warning">
                            <div className="alert-icon"><AlertTriangle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งานใบวางบิล</h4>
                                <ul>
                                    <li><strong>การเลือกลูกค้าข้ามบริษัท:</strong> คุณไม่สามารถติ๊กเลือก Invoice ของบริษัท A มาใส่รวมในใบวางบิลของบริษัท B ได้ ระบบจะบล็อคข้อมูลให้แสดงเฉพาะของลูกค้ารายนั้นๆ เท่านั้น</li>
                                    <li><strong>หากวางบิลผิด หรือพิมพ์ยอดใน Invoice ผิด:</strong> จำไว้เสมอว่า ใบวางบิลมีหน้าที่ <strong>"ล็อค"</strong> Invoice ห้ามแก้ไข ดังนั้นหากจะแก้ข้อมูลสินค้า ต้องกด "ลบ" ใบวางบิลใบนี้ทิ้งไปก่อน เพื่อปลดล็อค Invoice นำไปแก้ แล้วค่อยมาสร้างใบวางบิลใหม่</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 5. Receipt */}
                <section id="receipt" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon green"><Receipt size={24} /></div>
                        <h2>5. ใบเสร็จรับเงิน (Receipt)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            ขั้นตอนสุดท้ายของกระบวนการขาย คือการออกหลักฐานเมื่อลูกค้าชำระเงินเรียบร้อยแล้ว การออกเอกสารนี้จะเป็นการสั่งให้ระบบ **ตัดยอดหนี้** ของ Invoice ที่เกี่ยวข้องทันที
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (Receipt List):</strong> ตารางแสดงใบเสร็จทั้งหมดที่ออกไปแล้ว เป็นตัวสะท้อนเงินสดที่เข้ามาจริง (Actual Cash Flow)</li>
                                <li><strong>หน้าสร้าง (Create Receipt):</strong> ฟอร์มรับเงิน โดยให้เลือกอ้างอิงเอกสารก่อนหน้า (Reference) เพื่อดึงยอดเงินมาอัตโนมัติ</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>รับการชำระเงิน</h4>
                                        <p>เมื่อมีเงินโอนเข้าบัญชี หรือได้รับเช็คจากลูกค้า ให้เริ่มเข้ามาที่โมดูลนี้แล้วกดสร้างใบเสร็จรับเงิน</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>เลือกเอกสารอ้างอิง (Reference)</h4>
                                        <p>เลือกว่าลูกค้ารายนี้โอนเงินมาเพื่อจ่ายบิลไหน โดยเลือกระหว่าง: <br />
                                            ก) อ้างอิงจาก <strong>ใบวางบิล (Billing Note)</strong> (ระบบจะตัดหนี้ Invoice ทุกใบที่อยู่ในบิลนั้นทีเดียว) <br />
                                            ข) อ้างอิงจาก <strong>ใบกำกับภาษี (Invoice)</strong> โดยตรง (จ่ายรายใบ)</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>ระบุช่องทางการรับเงิน</h4>
                                        <p>บันทึกวันที่รับเงินจริง และประเภทการชำระ (เช่น โอนเงินเข้าบัญชี, เช็คธนาคาร, เงินสด) เพื่อประโยชน์ในการตรวจสอบยอดเงินฝาก</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">4</div>
                                    <div className="v-step-content">
                                        <h4>ปิดบัญชี (End of Process)</h4>
                                        <p>กดบันทึกเอกสาร ระบบจะทำงานอยู่เบื้องหลัง โดยไปเปลี่ยนสถานะของ Invoice ที่เกี่ยวข้องให้กลายเป็น <strong>"ชำระเงินแล้ว (Paid)"</strong> อัตโนมัติ ถือเป็นการจบกระบวนการงานขาย</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Plus size={14} /> สร้างใบเสร็จ</span>
                                    <span>เปิดหน้าต่างเพื่อบันทึกการรับเงิน</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag outline">กล่องเลือกเอกสารอ้างอิง</span>
                                    <span>ใช้สำหรับค้นหาและเลือกเลขที่ Billing Note หรือ Invoice ที่ลูกค้าโอนเงินมาจ่าย</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag dark"><Printer size={14} /> พิมพ์ใบเสร็จ</span>
                                    <span>พิมพ์เอกสารเพื่อส่งให้ลูกค้าเป็นหลักฐานการชำระเงิน</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box danger">
                            <div className="alert-icon"><AlertCircle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งานใบเสร็จรับเงิน</h4>
                                <ul>
                                    <li><strong>เอกสารสิ้นสุด (End-Point):</strong> ใบเสร็จรับเงินคือจุดสูงสุดของระบบ เมื่อออกใบเสร็จแล้ว เอกสารที่ถูกอ้างอิงทั้งหมด (ทั้งใบวางบิล และ Invoice) จะถูกล็อคสถานะเป็นชำระเงินแล้วอย่างถาวร</li>
                                    <li><strong>ห้ามลบ/แก้ไข โดยไม่จำเป็น:</strong> หากมีการลงยอดผิดแล้วกดบันทึกไปแล้ว การแก้ปัญหาจะต้องเริ่มจาก "ลบ" ใบเสร็จใบนี้ทิ้งไปก่อน สถานะของ Invoice จึงจะเด้งกลับมาเป็น "ค้างชำระ" แล้วจึงเข้าไปทำกระบวนการรับเงินใหม่อีกครั้ง การลบใบเสร็จมีผลกระทบต่อบัญชีอย่างมาก ควรทำด้วยความระมัดระวัง</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 6. Customer CRM */}
                <section id="customer" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon blue"><Users size={24} /></div>
                        <h2>6. ข้อมูลลูกค้า (Customer CRM)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            ระบบจัดเก็บฐานข้อมูลลูกค้าที่เชื่อมโยงกับทุกเอกสารในระบบ (PO, Invoice ฯลฯ) ข้อมูลที่ถูกต้องที่นี่จะทำให้การออกเอกสารรวดเร็วและไม่ผิดพลาด
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (Customer List):</strong> ตารางรายชื่อลูกค้าทั้งหมด พร้อมช่องค้นหาแบบอัจฉริยะ</li>
                                <li><strong>หน้าสร้าง/แก้ไข (Customer Form):</strong> ฟอร์มกรอกข้อมูลบริษัท เลขผู้เสียภาษี และที่อยู่</li>
                                <li><strong>หน้ารายละเอียด (Customer Profile):</strong> หน้าโปรไฟล์ลูกค้าที่สรุปประวัติการสั่งซื้อ (Order History) และหนี้สินที่ค้างชำระทั้งหมดของลูกค้ารายนี้</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>เพิ่มลูกค้าใหม่</h4>
                                        <p>กด <code>+ เพิ่มลูกค้า</code> กรอกชื่อบริษัท และ **ต้องระบุเลขประจำตัวผู้เสียภาษี 13 หลักให้ถูกต้อง** เพื่อประโยชน์ในการทำเอกสารภาษี</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>แยกประเภทที่อยู่</h4>
                                        <p>ในฟอร์มจะมีให้กรอก <strong>ที่อยู่สำนักงานใหญ่ (สำหรับออกบิล)</strong> และ <strong>ที่อยู่จัดส่ง (สำหรับส่งของ)</strong> หากเป็นที่เดียวกัน สามารถก๊อปปี้มาใส่ได้เลย</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>ตรวจสอบประวัติการซื้อ</h4>
                                        <p>เมื่อลูกค้าคนนี้มีการสั่งซื้อไปแล้วสักระยะ คุณสามารถกด <code>ดูรายละเอียด</code> เพื่อเช็คว่าลูกค้าคนนี้เคยซื้ออะไรไปบ้าง และมียอดค้างชำระอยู่เท่าไหร่ได้ในหน้าเดียว</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Plus size={14} /> เพิ่มลูกค้า</span>
                                    <span>สร้างโปรไฟล์ลูกค้าใหม่เข้าระบบ</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag gray"><Eye size={14} /> ดูประวัติ (Profile)</span>
                                    <span>เปิดหน้าต่างสรุปข้อมูลการค้า (ประวัติสั่งซื้อ, ยอดหนี้, ไฟล์ Certificate) ของลูกค้ารายนี้</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag warning"><Edit size={14} /> แก้ไขข้อมูล</span>
                                    <span>ใช้สำหรับอัปเดตเบอร์โทรศัพท์ หรือที่อยู่เมื่อมีการเปลี่ยนแปลง</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag outline"><Search size={14} /> ค้นหาอัจฉริยะ</span>
                                    <span>ช่องค้นหาที่มุมขวาบน พิมพ์แค่ "เลข 13 หลัก" หรือ "ชื่อย่อ" ก็สามารถหาลูกค้าเจอได้ทันที</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box danger">
                            <div className="alert-icon"><AlertCircle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งานฐานข้อมูลลูกค้า</h4>
                                <ul>
                                    <li><strong>การลบข้อมูล (Delete):</strong> ห้ามกดลบลูกค้าที่ <strong>"เคยมีการเปิด PO หรือ Invoice ไปแล้ว"</strong> เด็ดขาด เพราะจะทำให้เอกสารทางบัญชีเหล่านั้นขาดข้อมูลอ้างอิง (Data Orphan) ระบบส่วนใหญ่จะป้องกันไว้ หากเลิกติดต่อแล้ว แนะนำให้เติมคำว่า "(ยกเลิก)" ไว้ท้ายชื่อแทน</li>
                                    <li><strong>การกรอกเลขผู้เสียภาษี:</strong> ตรวจสอบเลข 13 หลักให้ดี หากพิมพ์ผิด Invoice ที่ออกมาจะใช้เคลมภาษีไม่ได้ และต้องมาตามแก้ไขย้อนหลัง</li>
                                    <li><strong>สาขา:</strong> อย่าลืมระบุว่าเป็น สำนักงานใหญ่ หรือ สาขาที่เท่าไหร่</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 7. Certificate */}
                <section id="certificate" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon dark"><FileCheck size={24} /></div>
                        <h2>7. จัดการ Certificate</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            ใช้สำหรับจัดเก็บไฟล์เอกสารรับรองมาตรฐานต่างๆ เช่น ISO, ใบอนุญาตประกอบกิจการ, ภ.พ.20 ของทั้งบริษัทเราเอง และของคู่ค้า พร้อมระบบแจ้งเตือนวันหมดอายุอัตโนมัติ
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้ารายการ (Certificate List):</strong> ตารางแสดงใบ Cert ทั้งหมด พร้อมแถบสีบอกสถานะ (เขียว=ปกติ, แดง=หมดอายุ)</li>
                                <li><strong>หน้าอัปโหลด (Upload Form):</strong> ฟอร์มสำหรับแนบไฟล์ PDF/รูปภาพ และตั้งค่าวันหมดอายุ</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>เตรียมไฟล์และอัปโหลด</h4>
                                        <p>สแกนใบ Certificate เป็นไฟล์ PDF หรือรูปภาพที่อ่านออกชัดเจน กดปุ่ม <code>+ อัปโหลดไฟล์ใหม่</code> แล้วลากไฟล์ลงในกล่อง</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>ระบุความเป็นเจ้าของ</h4>
                                        <p>เลือกว่าใบ Cert นี้เป็นของ <strong>บริษัทเราเอง (Internal)</strong> หรือเป็นของ <strong>ลูกค้า (Customer)</strong> คนไหน เพื่อให้ระบบผูกไฟล์เข้ากับ Profile ของคนนั้น</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>ตั้งค่า "วันหมดอายุ" (สำคัญที่สุด)</h4>
                                        <p>ดูที่เอกสารตัวจริงว่าหมดอายุวันที่เท่าไหร่ แล้วนำมากรอกในช่อง <strong>Expiry Date</strong> (หากไม่มีวันหมดอายุ ให้ข้ามช่องนี้ไป)</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">4</div>
                                    <div className="v-step-content">
                                        <h4>การแจ้งเตือนอัตโนมัติ</h4>
                                        <p>หลังจากบันทึกแล้ว ไม่ต้องทำอะไรเพิ่ม เมื่อถึงช่วง 30 วันก่อนหมดอายุ ระบบจะส่ง Alert แจ้งเตือนสีแดงไปโชว์ในหน้า Dashboard อัตโนมัติ เพื่อให้คุณเตรียมตัวต่ออายุได้ทันเวลา</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Upload size={14} /> อัปโหลดไฟล์ใหม่</span>
                                    <span>เปิดหน้าต่างนำเข้าไฟล์ Certificate เข้าระบบ</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag gray"><Eye size={14} /> / <Download size={14} /> ดูไฟล์/ดาวน์โหลด</span>
                                    <span>คลิกเพื่อเปิดดูไฟล์ PDF หรือดาวน์โหลดกลับลงเครื่องคอมพิวเตอร์</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag danger"><Trash2 size={14} /> ลบไฟล์</span>
                                    <span>ลบใบ Cert ที่ไม่อัปเดตแล้วออกจากระบบ</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box warning">
                            <div className="alert-icon"><AlertTriangle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการใช้งาน Certificate</h4>
                                <ul>
                                    <li><strong>การระบุวันหมดอายุ (Expiry Date):</strong> คือหัวใจของฟีเจอร์นี้ หากคุณลืมใส่วันหมดอายุ ระบบจะถือว่าใบ Cert นี้ใช้ได้ตลอดชีพ และ <strong>จะไม่มีการแจ้งเตือนใดๆ เกิดขึ้นบน Dashboard</strong> เสี่ยงต่อการทำงานขาดตอนเนื่องจากใบอนุญาตขาดอายุ</li>
                                    <li><strong>ประเภทไฟล์:</strong> แนะนำให้อัปโหลดเป็นไฟล์ <strong>.PDF</strong> เสมอ เพราะหากเป็นรูปภาพ (.JPG) เมื่อนำไปพริ้นต์ต่อเพื่อทำเรื่องประมูลงาน ความละเอียดอาจจะลดลงจนอ่านไม่ออก</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="section-divider"></div>

                {/* 8. Company Info */}
                <section id="company" className="guide-section">
                    <div className="section-head">
                        <div className="head-icon dark"><Building size={24} /></div>
                        <h2>8. ข้อมูลบริษัท (Company Info)</h2>
                    </div>
                    <div className="section-content">
                        <p className="section-intro">
                            ส่วนควบคุมข้อมูลพื้นฐานของบริษัทคุณเอง ซึ่งข้อมูลในหน้านี้จะถูกนำไปใช้พิมพ์บนหัวกระดาษของเอกสารทุกชนิด (PO, Invoice, Receipt) โดยอัตโนมัติ
                        </p>

                        <div className="page-structure">
                            <h3><Layers size={18} /> หน้าที่มีในโมดูลนี้</h3>
                            <ul>
                                <li><strong>หน้าตั้งค่าบริษัท (Single Form Page):</strong> เป็นหน้าแบบฟอร์มหน้าเดียวสำหรับอัปเดต โลโก้, ชื่อ, ที่อยู่ และเลขผู้เสียภาษีของบริษัทคุณ</li>
                            </ul>
                        </div>

                        <div className="workflow-container">
                            <h3><CheckCircle2 size={18} /> ขั้นตอนการใช้งานของ User (Workflow)</h3>
                            <div className="workflow-steps-vertical">
                                <div className="v-step">
                                    <div className="v-step-num">1</div>
                                    <div className="v-step-content">
                                        <h4>เตรียมไฟล์โลโก้</h4>
                                        <p>เตรียมไฟล์โลโก้บริษัท (แนะนำเป็นพื้นหลังโปร่งใส .PNG) ขนาดสัดส่วนแนวนอนหรือจัตุรัส กดปุ่ม <code>อัปโหลดโลโก้</code> เพื่อนำรูปเข้าระบบ</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">2</div>
                                    <div className="v-step-content">
                                        <h4>อัปเดตข้อมูลทางการ</h4>
                                        <p>กรอก ชื่อบริษัท, ที่อยู่ (ทั้งภาษาไทยและอังกฤษถ้ามี), เลขประจำตัวผู้เสียภาษี 13 หลัก, และเบอร์โทรศัพท์ ให้ครบถ้วนและถูกต้องที่สุด</p>
                                    </div>
                                </div>
                                <div className="v-step">
                                    <div className="v-step-num">3</div>
                                    <div className="v-step-content">
                                        <h4>บันทึกและตรวจสอบ</h4>
                                        <p>กดปุ่ม <code>บันทึกข้อมูล (Save)</code> จากนั้นลองไปสร้างเอกสาร Invoice หรือ PO ใบใหม่ แล้วกด Print Preview เพื่อดูว่าโลโก้และข้อมูลขึ้นที่หัวกระดาษสวยงามหรือไม่</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="button-dictionary">
                            <h3><MousePointer2 size={18} /> ปุ่มและการทำงาน</h3>
                            <div className="btn-def-grid">
                                <div className="btn-def-item">
                                    <span className="btn-tag outline"><Image size={14} /> อัปโหลดรูปภาพ</span>
                                    <span>เปิดหน้าต่างเลือกไฟล์เพื่ออัปเดตโลโก้ (จำกัดขนาดไฟล์ไม่เกิน 2MB)</span>
                                </div>
                                <div className="btn-def-item">
                                    <span className="btn-tag primary"><Save size={14} /> บันทึกข้อมูล</span>
                                    <span>บันทึกการแก้ไขลงฐานข้อมูล (มีผลบังคับใช้กับเอกสารใหม่ทันที)</span>
                                </div>
                            </div>
                        </div>

                        <div className="alert-box warning">
                            <div className="alert-icon"><AlertTriangle size={24} /></div>
                            <div className="alert-content">
                                <h4>ข้อควรระวังในการตั้งค่าข้อมูลบริษัท</h4>
                                <ul>
                                    <li><strong>ผลกระทบต่อเอกสารเก่า:</strong> หากคุณเปลี่ยนชื่อบริษัท หรือเปลี่ยนที่อยู่ในหน้านี้ ระบบจะนำข้อมูลใหม่ไปใช้กับ <strong>"เอกสารใบใหม่ที่เพิ่งถูกสร้างหลังจากนี้"</strong> เท่านั้น เอกสารเก่าที่เคยสร้างและเซฟเป็น PDF ไปแล้วจะไม่ถูกเปลี่ยนตาม เพื่อคงความถูกต้องทางประวัติบัญชี</li>
                                    <li><strong>ความคมชัดของโลโก้:</strong> หากอัปโหลดโลโก้ที่ขนาดเล็กเกินไป เวลาปริ้นเอกสารออกมาภาพจะแตก แนะนำให้ใช้ภาพความละเอียดสูง (Hi-Res)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style>{`
                /* (Keeping the exact same styling that made it beautiful) */
                .guide-master-container {
                    padding: 2rem 0 6rem;
                    max-width: 1200px;
                    margin: 0 auto;
                    color: var(--text-main);
                    font-family: 'Inter', 'Sarabun', sans-serif;
                }

                /* Header */
                .guide-master-header {
                    text-align: center;
                    margin-bottom: 3.5rem;
                    padding: 0 1.5rem;
                }

                .header-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--primary-glow);
                    color: var(--primary);
                    padding: 0.5rem 1rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }

                .header-title {
                    font-size: 2.8rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }

                .text-gradient {
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .header-desc {
                    color: var(--text-muted);
                    font-size: 1.15rem;
                    max-width: 750px;
                    margin: 0 auto;
                    line-height: 1.6;
                }

                .search-box-wrapper {
                    position: relative;
                    max-width: 500px;
                    margin: 2.5rem auto 0;
                }

                .search-box-wrapper .search-icon {
                    position: absolute;
                    left: 1.25rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }

                .search-box-wrapper input {
                    width: 100%;
                    padding: 1.25rem 1.5rem 1.25rem 3.5rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 100px;
                    font-size: 1rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    transition: all 0.2s ease;
                }

                .search-box-wrapper input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 4px 20px var(--primary-glow);
                }

                /* Navigation Pills */
                .guide-master-nav {
                    position: sticky;
                    top: 1rem;
                    z-index: 50;
                    margin-bottom: 4rem;
                    padding: 0 1rem;
                }

                .nav-pill-container {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 0.75rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    justify-content: center;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.04);
                }

                .nav-pill-container::-webkit-scrollbar { display: none; }

                .nav-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    border: none;
                    border-radius: 100px;
                    background: transparent;
                    color: var(--text-muted);
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }

                .nav-pill:hover {
                    color: var(--text-main);
                    background: var(--bg-main);
                }

                .nav-pill.active {
                    background: var(--primary);
                    color: white;
                    box-shadow: 0 4px 12px var(--primary-glow);
                }

                /* Layout Core */
                .guide-master-body {
                    display: flex;
                    flex-direction: column;
                    gap: 6rem;
                    padding: 0 1.5rem;
                }

                .guide-section {
                    scroll-margin-top: 120px;
                }

                .section-head {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    margin-bottom: 2rem;
                }

                .head-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }

                .head-icon.blue { background: #3b82f6; box-shadow: 0 4px 15px rgba(59,130,246,0.3); }
                .head-icon.indigo { background: #6366f1; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
                .head-icon.orange { background: #f59e0b; box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
                .head-icon.green { background: #10b981; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
                .head-icon.purple { background: #8b5cf6; box-shadow: 0 4px 15px rgba(139,92,246,0.3); }
                .head-icon.dark { background: #334155; box-shadow: 0 4px 15px rgba(51,65,85,0.3); }

                .section-head h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    margin: 0;
                    color: var(--text-main);
                }

                .section-content {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 3rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }

                .section-intro {
                    font-size: 1.15rem;
                    color: var(--text-muted);
                    margin-bottom: 2.5rem;
                    line-height: 1.7;
                    border-left: 4px solid var(--primary);
                    padding-left: 1.5rem;
                }
                
                .section-divider {
                    height: 1px;
                    background: var(--border-color);
                    margin: 2rem 0;
                }

                .page-structure {
                    background: #f8fafc;
                    border: 1px dashed var(--border-color);
                    border-radius: 12px;
                    padding: 1.5rem 2rem;
                    margin-bottom: 2.5rem;
                }
                .page-structure h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.1rem;
                    color: var(--text-main);
                    margin-bottom: 1rem;
                }
                .page-structure ul {
                    padding-left: 1.5rem;
                    margin: 0;
                }
                .page-structure li {
                    font-size: 1rem;
                    color: var(--text-muted);
                    margin-bottom: 0.5rem;
                    line-height: 1.5;
                }
                .page-structure li strong {
                    color: var(--text-main);
                }

                /* Tab Info Cards (Dashboard) */
                .tab-details-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 2rem;
                }

                .tab-info-card {
                    background: var(--bg-main);
                    padding: 2rem;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    transition: all 0.2s;
                }
                .tab-info-card:hover {
                    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }

                .tab-info-card.full-width {
                    grid-column: 1 / -1;
                }

                .chart-guide-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .chart-guide-item h5 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-main);
                    margin-bottom: 1rem;
                    font-size: 1rem;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 0.5rem;
                }

                .tab-info-header { margin-bottom: 1.5rem; }
                .tab-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem 0.8rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .tab-badge.indigo { background: rgba(99,102,241,0.1); color: #6366f1; }
                .tab-badge.orange { background: rgba(245,158,11,0.1); color: #f59e0b; }
                .tab-badge.blue { background: rgba(59,130,246,0.1); color: #3b82f6; }
                .tab-badge.purple { background: rgba(139,92,246,0.1); color: #8b5cf6; }
                .tab-badge.red { background: rgba(239,68,68,0.1); color: #ef4444; }
                .tab-badge.dark { background: rgba(51,65,85,0.1); color: #334155; }

                .info-bullets {
                    padding-left: 1.5rem;
                    list-style-type: none;
                    margin: 0;
                }
                .info-bullets li {
                    position: relative;
                    margin-bottom: 1rem;
                    font-size: 0.95rem;
                    color: var(--text-muted);
                    line-height: 1.6;
                }
                .info-bullets li::before {
                    content: "•";
                    color: var(--primary);
                    font-weight: bold;
                    position: absolute;
                    left: -1.2rem;
                }
                .info-bullets li strong { color: var(--text-main); }

                /* Workflow Steps Vertical */
                .workflow-container h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.25rem;
                    color: var(--text-main);
                    margin-bottom: 1.5rem;
                }
                
                .workflow-steps-vertical {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                    padding-left: 1rem;
                }
                
                .v-step {
                    display: flex;
                    gap: 1.5rem;
                    position: relative;
                }
                
                .v-step:not(:last-child)::before {
                    content: '';
                    position: absolute;
                    left: 19px;
                    top: 40px;
                    bottom: -20px;
                    width: 2px;
                    background: var(--border-color);
                    z-index: 0;
                }

                .v-step-num {
                    width: 40px;
                    height: 40px;
                    min-width: 40px;
                    background: var(--primary);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.1rem;
                    z-index: 1;
                    box-shadow: 0 4px 10px var(--primary-glow);
                }

                .v-step-content {
                    background: var(--bg-main);
                    border: 1px solid var(--border-color);
                    padding: 1.5rem;
                    border-radius: 12px;
                    flex: 1;
                }

                .v-step-content h4 {
                    font-size: 1.1rem;
                    color: var(--text-main);
                    margin-bottom: 0.5rem;
                }
                .v-step-content p {
                    font-size: 1rem;
                    color: var(--text-muted);
                    line-height: 1.6;
                    margin: 0;
                }

                /* Button Dictionary */
                .button-dictionary h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.25rem;
                    color: var(--text-main);
                    margin-bottom: 1.5rem;
                }

                .btn-def-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }

                .btn-def-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    padding: 1.5rem;
                    background: #f8fafc;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                }

                .btn-tag {
                    display: inline-flex;
                    align-items: center;
                    align-self: flex-start;
                    gap: 0.4rem;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    white-space: nowrap;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .btn-tag.primary { background: var(--primary); color: white; }
                .btn-tag.success { background: #10b981; color: white; }
                .btn-tag.warning { background: #f59e0b; color: white; }
                .btn-tag.danger { background: #ef4444; color: white; }
                .btn-tag.dark { background: #334155; color: white; }
                .btn-tag.gray { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; box-shadow: none;}
                .btn-tag.outline { background: transparent; color: var(--text-main); border: 1px solid var(--border-color); box-shadow: none;}

                .btn-def-item span:last-child {
                    font-size: 0.95rem;
                    color: var(--text-muted);
                    line-height: 1.5;
                }

                /* Alert Boxes */
                .alert-box {
                    display: flex;
                    gap: 1.5rem;
                    padding: 2rem;
                    border-radius: 16px;
                }
                
                .alert-box.warning {
                    background: rgba(245, 158, 11, 0.05);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                .alert-box.warning .alert-icon { color: #d97706; }
                .alert-box.warning h4 { color: #b45309; }

                .alert-box.danger {
                    background: rgba(239, 68, 68, 0.05);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .alert-box.danger .alert-icon { color: #dc2626; }
                .alert-box.danger h4 { color: #991b1b; }

                .alert-icon {
                    flex-shrink: 0;
                    padding-top: 0.25rem;
                }

                .alert-content h4 {
                    font-size: 1.2rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                }

                .alert-content ul {
                    margin: 0;
                    padding-left: 1.25rem;
                }

                .alert-content li {
                    font-size: 1rem;
                    color: var(--text-main);
                    margin-bottom: 0.75rem;
                    line-height: 1.6;
                }
                .alert-content li strong {
                    font-weight: 700;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .header-title { font-size: 2.2rem; }
                    .section-content { padding: 1.5rem; }
                    .section-head h2 { font-size: 1.5rem; }
                    .btn-def-grid { grid-template-columns: 1fr; }
                    .alert-box { flex-direction: column; gap: 1rem; padding: 1.5rem; }
                    .alert-icon { padding-top: 0; }
                }
            `}</style>
        </div>
    );
};

export default GuideTab;
