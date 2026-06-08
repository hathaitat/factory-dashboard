import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { companyService } from '../services/companyService';
import { useDialog } from '../contexts/DialogContext';
import { thaiBaht } from '../utils/thaiBaht';
import '../styles/InvoicePrint.css'; // For basic print layout A4

const CertificateReceiptPage = () => {
    const navigate = useNavigate();
    const { showError } = useDialog();
    const [company, setCompany] = useState(null);

    const [formData, setFormData] = useState({
        bookNo: '',
        docNo: '',
        docDate: new Date().toISOString().split('T')[0],
        disburserName: '',
        disburserPosition: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const [items, setItems] = useState([
        { id: 1, date: new Date().toISOString().split('T')[0], description: '', amount: '', remark: '' }
    ]);

    useEffect(() => {
        loadCompany();
    }, []);

    const loadCompany = async () => {
        try {
            const data = await companyService.getCompanyInfo();
            setCompany(data);
        } catch (error) {
            console.error(error);
            showError('ไม่สามารถโหลดข้อมูลบริษัทได้');
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now(), date: formData.docDate, description: '', amount: '', remark: '' }
        ]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const handlePrint = () => {
        window.print();
    };

    const formatDateThai = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatShortDateThai = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit' });
    };


    return (
        <div className="content-container print-container">
            {/* Toolbar - hidden when printing */}
            <div className="page-header glass-panel no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem 2rem' }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>สร้างใบรับรองแทนใบเสร็จรับเงิน</h2>
                        <span style={{ color: 'var(--text-muted)' }}>กรอกข้อมูลเพื่อพิมพ์ (ไม่มีการบันทึกลงฐานข้อมูล)</span>
                    </div>
                </div>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Printer size={18} />
                    พิมพ์เอกสาร
                </button>
            </div>

            {/* Input Form Area - hidden when printing */}
            <div className="form-content no-print">
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>ข้อมูลส่วนหัว</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เล่มที่</label>
                            <input type="text" className="glass-input" name="bookNo" value={formData.bookNo} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="ระบุเล่มที่..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลขที่</label>
                            <input type="text" className="glass-input" name="docNo" value={formData.docNo} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="ระบุเลขที่..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>วันที่พิมพ์</label>
                            <input type="date" className="glass-input" name="docDate" value={formData.docDate} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้เบิกจ่าย</label>
                            <input type="text" className="glass-input" name="disburserName" value={formData.disburserName} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="ชื่อ-นามสกุล..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ตำแหน่ง</label>
                            <input type="text" className="glass-input" name="disburserPosition" value={formData.disburserPosition} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="ตำแหน่งงาน..." />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ตั้งแต่วันที่</label>
                            <input type="date" className="glass-input" name="startDate" value={formData.startDate} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ถึงวันที่</label>
                            <input type="date" className="glass-input" name="endDate" value={formData.endDate} onChange={handleFormChange} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>รายการเบิกจ่าย</h3>
                        <button onClick={addItem} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px' }}>
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500', width: '160px' }}>วันที่</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>รายการ (ชนิด/ชื่อ)</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', width: '200px' }}>จำนวนเงิน (บาท)</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500', width: '250px' }}>หมายเหตุ</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <input type="date" className="glass-input" value={item.date} onChange={(e) => handleItemChange(item.id, 'date', e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <input type="text" className="glass-input" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="ระบุรายการ..." />
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <input type="number" className="glass-input" value={item.amount} onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)} style={{ width: '100%', padding: '0.6rem', textAlign: 'right', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="0.00" />
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <input type="text" className="glass-input" value={item.remark} onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder="หมายเหตุ..." />
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                            <button onClick={() => removeItem(item.id)} className="btn-icon" style={{ color: 'var(--error)', padding: '0.4rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)' }} disabled={items.length <= 1}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border-color)' }}>
                        <div style={{ width: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                <span style={{ color: 'var(--text-muted)' }}>จำนวนเงินรวมทั้งหมด</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>฿ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {totalAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', background: 'var(--bg-main)', borderRadius: '8px', padding: '1rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ตัวอักษร</span>
                                    <span style={{ fontWeight: '500', color: 'var(--primary)' }}>({thaiBaht(totalAmount)})</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Custom Print & Layout Overrides to ensure it fits A4 and does not overflow to a 2nd page */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .cert-paper {
                    padding: 20mm 15mm !important;
                    font-family: "Sarabun", "TH Sarabun New", sans-serif !important;
                    color: #000 !important;
                    background-color: #fff !important;
                    font-size: 11pt !important;
                    line-height: 1.5 !important;
                }
                .cert-title-container {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .cert-title-h1 {
                    font-size: 18pt;
                    font-weight: bold;
                    margin: 0;
                }
                .cert-info-table {
                    width: 100%;
                    margin-bottom: 25px;
                    border-collapse: collapse;
                }
                .cert-info-table td {
                    padding: 16px 0 !important; /* Increased spacing/height between rows */
                    vertical-align: bottom;
                    line-height: 1.6;
                }
                .cert-info-table td.label-bold {
                    font-weight: bold;
                }
                .cert-info-table td.text-right {
                    text-align: right;
                }
                .cert-info-table td.pr-2 {
                    padding-right: 10px !important;
                }
                .cert-info-table td.val-short {
                    border-bottom: 1px dotted #000;
                    text-align: center;
                }
                .cert-info-table td.val-date {
                    border-bottom: 1px dotted #000;
                    text-align: center;
                }
                .cert-info-table td.val-full {
                    border-bottom: 1px dotted #000;
                    text-align: left;
                    padding-left: 10px !important;
                }
                .cert-info-table td.val-mid {
                    border-bottom: 1px dotted #000;
                    text-align: left;
                    padding-left: 10px !important;
                }
                .cert-declaration {
                    margin-bottom: 20px;
                    text-indent: 40px;
                }
                .text-bold {
                    font-weight: bold;
                }
                .mr-2 {
                    margin-right: 10px !important;
                }
                .cert-items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 10px;
                }
                .cert-items-table th {
                    border: 1px solid #000;
                    padding: 8px;
                    font-weight: bold;
                    text-align: center;
                }
                .cert-items-table td {
                    border: 1px solid #000;
                    padding: 8px;
                }
                .cert-items-table td.text-center {
                    text-align: center;
                }
                .cert-items-table td.text-right {
                    text-align: right;
                }
                .cert-items-table td.empty-cell {
                    padding: 14px;
                }
                .cert-summary-baht {
                    margin-bottom: 30px;
                }
                .cert-baht-text-underline {
                    border-bottom: 1px dotted #000;
                    padding-bottom: 2px;
                    min-width: 300px;
                    display: inline-block;
                }
                .cert-signatures-container {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 50px;
                }
                .cert-signature-box {
                    text-align: center;
                    width: 40%;
                }
                .cert-signature-line-row {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }
                .cert-signature-line {
                    border-bottom: 1px dotted #000;
                    width: 150px;
                    display: inline-block;
                }
                .cert-signature-label {
                    margin-top: 10px;
                }
                .w-10 {
                    width: 10% !important;
                }
                .w-15 {
                    width: 15% !important;
                }
                .w-25 {
                    width: 25% !important;
                }
                .w-40 {
                    width: 40% !important;
                }
                .w-45 {
                    width: 45% !important;
                }

                @media print {
                    @page {
                        size: A4;
                        margin: 20mm 15mm 15mm 15mm;
                    }
                    html, body, #root, .dashboard-container, .main-content, .content-scroll, .print-container, .print-only {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        background: white !important;
                        box-shadow: none !important;
                    }
                    .invoice-paper {
                        margin: 0 !important;
                        box-shadow: none !important;
                        padding: 0 !important; /* Margins are managed by @page */
                        width: 100% !important;
                        height: auto !important;
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                        overflow: hidden !important;
                        box-sizing: border-box !important;
                    }
                }
            `}} />

            {/* Print A4 Layout - visible only when printing */}
            <div className="print-only">
                <div className="invoice-paper cert-paper">
                    <div className="cert-title-container">
                        <h1 className="cert-title-h1">ใบรับรองแทนใบเสร็จรับเงิน</h1>
                    </div>

                    <table className="cert-info-table">
                        <tbody>
                            <tr>
                                <td className="label-bold w-10">เล่มที่</td>
                                <td className="val-short w-15">{formData.bookNo}</td>
                                <td className="label-bold text-right pr-2 w-10">เลขที่</td>
                                <td className="val-short w-15">{formData.docNo}</td>
                                <td className="label-bold text-right pr-2 w-10">วันที่</td>
                                <td className="val-date w-40">{formatDateThai(formData.docDate)}</td>
                            </tr>
                            <tr>
                                <td className="label-bold">ชื่อกิจการ</td>
                                <td colSpan={5} className="val-full">{company?.name || ''}</td>
                            </tr>
                            <tr>
                                <td className="label-bold">ข้าพเจ้า</td>
                                <td colSpan={2} className="val-mid">{formData.disburserName}</td>
                                <td className="label-bold text-right pr-2">ตำแหน่ง</td>
                                <td colSpan={2} className="val-mid">{formData.disburserPosition}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="cert-declaration">
                        ขอรับรองว่า รายจ่ายต่อไปนี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับได้ และข้าพเจ้าได้จ่ายไปในงานของทาง
                        <span className="text-bold"> {formData.disburserName || 'ผู้เบิกจ่าย'} </span> โดยแท้
                        ตั้งแต่วันที่ <span className="text-bold">{formatDateThai(formData.startDate)}</span> ถึงวันที่ <span className="text-bold">{formatDateThai(formData.endDate)}</span>
                    </div>

                    <table className="cert-items-table">
                        <thead>
                            <tr>
                                <th className="w-15">วันเดือน ปี</th>
                                <th className="w-45">รายการ (ชนิด/ชื่อ)</th>
                                <th className="w-15">จำนวนเงิน</th>
                                <th className="w-25">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td className="text-center">{formatShortDateThai(item.date)}</td>
                                    <td>{item.description}</td>
                                    <td className="text-right">
                                        {item.amount ? parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td>{item.remark}</td>
                                </tr>
                            ))}
                            {/* Fill empty rows to make it look like a form */}
                            {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td className="empty-cell"></td>
                                    <td className="empty-cell"></td>
                                    <td className="empty-cell"></td>
                                    <td className="empty-cell"></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="text-right">จำนวนเงินรวม</td>
                                <td className="text-right">
                                    {totalAmount > 0 ? totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="cert-summary-baht">
                        <span className="text-bold mr-2">รวมทั้งสิ้น (ตัวอักษร)</span>
                        <span className="cert-baht-text-underline">
                            {totalAmount > 0 ? thaiBaht(totalAmount) : ''}
                        </span>
                    </div>

                    <div className="cert-signatures-container">
                        <div className="cert-signature-box">
                            <div className="cert-signature-line-row">
                                <span className="mr-2">ลงชื่อ</span>
                                <span className="cert-signature-line"></span>
                            </div>
                            <div className="cert-signature-label">(ผู้เบิกจ่าย)</div>
                        </div>
                        <div className="cert-signature-box">
                            <div className="cert-signature-line-row">
                                <span className="mr-2">ลงชื่อ</span>
                                <span className="cert-signature-line"></span>
                            </div>
                            <div className="cert-signature-label">(ผู้อนุมัติ)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateReceiptPage;
