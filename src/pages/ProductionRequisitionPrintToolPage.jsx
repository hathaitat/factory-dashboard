import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { companyService } from '../services/companyService';
import { useDialog } from '../contexts/DialogContext';

const ProductionRequisitionPrintToolPage = () => {
    const navigate = useNavigate();
    const { showError } = useDialog();
    const [company, setCompany] = useState(null);

    const [formData, setFormData] = useState({
        docTitle: 'ใบขอเบิกสินค้า',
        docTitleEn: 'Request Inventory',
        copyType: 'ต้นฉบับ / Original',
        department: '',
        requestedBy: '',
        docDate: new Date().toISOString().split('T')[0]
    });

    const [items, setItems] = useState([
        { id: 1, requesterDept: '', remark: '', description: '', qtyRequest: '', qtyReceipt: '', uom: '' }
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
            { id: Date.now(), requesterDept: '', remark: '', description: '', qtyRequest: '', qtyReceipt: '', uom: '' }
        ]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDateThai = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
    };

    return (
        <div className="content-container print-container pb-12">
            {/* Toolbar - hidden when printing */}
            <div className="page-header glass-panel no-print flex justify-between items-center mb-6 p-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn-secondary rounded-full p-2">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-textMain m-0">เครื่องมือพิมพ์ใบเบิกสินค้า / ใบเบิกการผลิต</h2>
                        <span className="text-textMuted">กรอกรายละเอียดเพื่อสั่งพิมพ์เอกสาร (ไม่มีการบันทึกลงฐานข้อมูล)</span>
                    </div>
                </div>
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2 px-6 py-2.5">
                    <Printer size={18} /> พิมพ์เอกสาร
                </button>
            </div>

            {/* Input Form Area - hidden when printing */}
            <div className="form-content no-print space-y-6">
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">ข้อมูลส่วนหัวเอกสาร</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm text-textMuted mb-1">หัวข้อเอกสาร (ภาษาไทย)</label>
                            <input type="text" className="glass-input w-full p-2.5 rounded-lg" name="docTitle" value={formData.docTitle} onChange={handleFormChange} />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">หัวข้อเอกสาร (ภาษาอังกฤษ)</label>
                            <input type="text" className="glass-input w-full p-2.5 rounded-lg" name="docTitleEn" value={formData.docTitleEn} onChange={handleFormChange} />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">ประเภทสำเนา</label>
                            <input type="text" className="glass-input w-full p-2.5 rounded-lg" name="copyType" value={formData.copyType} onChange={handleFormChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div>
                            <label className="block text-sm text-textMuted mb-1">แผนก (Department Code)</label>
                            <input type="text" className="glass-input w-full p-2.5 rounded-lg" name="department" value={formData.department} onChange={handleFormChange} placeholder="ระบุแผนก..." />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">ผู้ประจำแผนก</label>
                            <input type="text" className="glass-input w-full p-2.5 rounded-lg" name="requestedBy" value={formData.requestedBy} onChange={handleFormChange} placeholder="ชื่อผู้ประจำแผนก..." />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">วันที่เอกสาร</label>
                            <input type="date" className="glass-input w-full p-2.5 rounded-lg" name="docDate" value={formData.docDate} onChange={handleFormChange} />
                        </div>
                    </div>

                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">รายการเบิกสินค้า</h3>
                        <button onClick={addItem} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg">
                            <Plus size={16} /> เพิ่มแถว
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="p-3 text-textMuted font-medium w-16 text-center">ลำดับ</th>
                                    <th className="p-3 text-textMuted font-medium w-32">ผู้เบิก/แผนก</th>
                                    <th className="p-3 text-textMuted font-medium w-40">หมายเหตุ (Remark)</th>
                                    <th className="p-3 text-textMuted font-medium">รายการที่ขอเบิก (Description)</th>
                                    <th className="p-3 text-textMuted font-medium w-36 text-right">จำนวนที่เบิกเข้า</th>
                                    <th className="p-3 text-textMuted font-medium w-36 text-right">จำนวนที่เบิกออก</th>
                                    <th className="p-3 text-textMuted font-medium w-28">หน่วยนับ (UOM)</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="p-2 text-center font-medium">{index + 1}</td>
                                        <td className="p-2">
                                            <input type="text" className="glass-input w-full p-2 rounded-md" value={item.requesterDept} onChange={(e) => handleItemChange(item.id, 'requesterDept', e.target.value)} placeholder="ผู้เบิก/แผนก..." />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" className="glass-input w-full p-2 rounded-md" value={item.remark} onChange={(e) => handleItemChange(item.id, 'remark', e.target.value)} />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" className="glass-input w-full p-2 rounded-md" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder="รายละเอียดสินค้า..." />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" className="glass-input w-full p-2 text-right rounded-md" value={item.qtyRequest} onChange={(e) => handleItemChange(item.id, 'qtyRequest', e.target.value)} placeholder="0" />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" className="glass-input w-full p-2 text-right rounded-md" value={item.qtyReceipt} onChange={(e) => handleItemChange(item.id, 'qtyReceipt', e.target.value)} placeholder="0" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" className="glass-input w-full p-2 rounded-md" value={item.uom} onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)} placeholder="เช่น ชิ้น, กก." />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md border-none cursor-pointer" disabled={items.length <= 1}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* --- PRINT LAYOUT --- */}
            <div className="print-only">
                <div className="a4-container">
                    {/* Header */}
                    <div className="print-header">
                        <div className="company-logo-section">
                            {company?.logoUrl && (
                                <img src={company.logoUrl} className="print-logo" alt="logo" />
                            )}
                            <div className="company-text">
                                <div className="company-name">{company?.name || ''}</div>
                                <div className="company-address">{company?.address || ''}</div>
                                <div className="company-contacts">
                                    {[
                                        company?.phone && `โทร: ${company.phone}`,
                                        company?.fax && `แฟกซ์: ${company.fax}`,
                                        company?.taxId && `เลขประจำตัวผู้เสียภาษี: ${company.taxId}`
                                    ].filter(Boolean).join(' ')}
                                </div>
                            </div>
                        </div>
                        <div className="copy-indicator">{formData.copyType}</div>
                    </div>

                    {/* Title */}
                    <div className="print-doc-title">
                        <h2>{formData.docTitle}</h2>
                        {formData.docTitleEn && <span>{formData.docTitleEn}</span>}
                    </div>

                    {/* Doc Details Form Box */}
                    <table className="info-box-table">
                        <tbody>
                            <tr>
                                <td className="w-15 label-cell">Department Code<br/>แผนก</td>
                                <td className="w-35 value-cell">: {formData.department}</td>
                                <td className="w-15 label-cell">ผู้ประจำแผนก</td>
                                <td className="w-35 value-cell">: {formData.requestedBy}</td>
                            </tr>
                            <tr>
                                <td className="label-cell">วันที่ / Date</td>
                                <td colSpan="3" className="value-cell">: {formatDateThai(formData.docDate)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Items Table */}
                    <table className="items-print-table">
                        <thead>
                            <tr>
                                <th style={{ width: '6%' }}>ลำดับ<br/>No.</th>
                                <th style={{ width: '14%' }}>ผู้เบิก/แผนก</th>
                                <th style={{ width: '15%' }}>หมายเหตุ<br/>Remark</th>
                                <th style={{ width: '35%' }}>รายการที่ขอเบิก<br/>Description</th>
                                <th style={{ width: '11%' }}>จำนวนที่เบิกเข้า</th>
                                <th style={{ width: '11%' }}>จำนวนที่เบิกออก</th>
                                <th style={{ width: '8%' }}>หน่วยนับ<br/>UOM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="text-center">{idx + 1}</td>
                                    <td className="text-left">{item.requesterDept}</td>
                                    <td className="text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.remark}</td>
                                    <td className="text-left">{item.description}</td>
                                    <td className="text-right">{item.qtyRequest ? Number(item.qtyRequest).toLocaleString() : ''}</td>
                                    <td className="text-right">{item.qtyReceipt ? Number(item.qtyReceipt).toLocaleString() : ''}</td>
                                    <td className="text-center">{item.uom}</td>
                                </tr>
                            ))}
                            {/* Empty rows to fill A4 size */}
                            {Array.from({ length: Math.max(0, 23 - items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="empty-row">
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Signatures */}
                    <div className="signatures-grid">
                        <div className="signature-box">
                            <div className="sig-title">แผนก</div>
                            <div className="sig-line"></div>
                            <div className="sig-date-line">วันที่ / Date ........./........./.........</div>
                        </div>
                        <div className="signature-box">
                            <div className="sig-title">หัวหน้างาน</div>
                            <div className="sig-line"></div>
                            <div className="sig-date-line">วันที่ / Date ........./........./.........</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS styles override */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .print-only {
                    display: none;
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    
                    @page {
                        size: A4;
                        margin: 10mm 15mm;
                    }

                    body {
                        background: white !important;
                        color: black !important;
                        font-family: "Sarabun", "TH Sarabun New", sans-serif !important;
                        font-size: 10pt !important;
                        line-height: 1.3 !important;
                    }

                    html, body, #root {
                        height: auto !important;
                        min-height: 0 !important;
                    }

                    .a4-container {
                        width: 100% !important;
                        box-sizing: border-box;
                    }

                    .print-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 8px;
                    }

                    .company-logo-section {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }

                    .print-logo {
                        height: 55px;
                        max-width: 120px;
                        object-fit: contain;
                    }

                    .company-text {
                        text-align: left;
                    }

                    .company-name {
                        font-size: 11pt;
                        font-weight: bold;
                    }

                    .company-address {
                        font-size: 8pt;
                        color: #444;
                        margin-top: 2px;
                    }

                    .company-contacts {
                        font-size: 8pt;
                        color: #444;
                    }

                    .copy-indicator {
                        border: 1px solid #777;
                        border-radius: 4px;
                        padding: 3px 8px;
                        font-size: 8pt;
                        font-weight: 500;
                    }

                    .print-doc-title {
                        text-align: center;
                        margin-bottom: 12px;
                    }

                    .print-doc-title h2 {
                        font-size: 16pt;
                        font-weight: bold;
                        margin: 0;
                        letter-spacing: 0.5px;
                    }

                    .print-doc-title span {
                        font-size: 11pt;
                        color: #333;
                        display: block;
                        font-weight: 500;
                    }

                    /* Info box table */
                    .info-box-table {
                        width: 100%;
                        border: 1px solid #000;
                        border-collapse: collapse;
                        font-size: 9pt;
                        margin-bottom: 10px;
                    }

                    .info-box-table td {
                        border: 1px solid #000;
                        padding: 6px 8px;
                        vertical-align: top;
                    }

                    .info-box-table td.label-cell {
                        font-weight: bold;
                        background-color: #fafafa;
                    }

                    .info-box-table td.value-cell {
                        font-weight: normal;
                    }

                    .w-15 { width: 15%; }
                    .w-25 { width: 25%; }
                    .w-35 { width: 35%; }
                    .w-45 { width: 45%; }

                    /* Items print table */
                    .items-print-table {
                        width: 100%;
                        border: 1px solid #000;
                        border-collapse: collapse;
                        font-size: 9pt;
                        margin-bottom: 12px;
                    }

                    .items-print-table th {
                        border: 1px solid #000;
                        background-color: #fafafa;
                        padding: 5px;
                        font-weight: bold;
                        text-align: center;
                        vertical-align: middle;
                    }

                    .items-print-table td {
                        border: 1px solid #000;
                        padding: 6px 8px;
                        vertical-align: middle;
                    }

                    .items-print-table tr.empty-row td {
                        height: 25px; /* height of empty rows */
                    }

                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }

                    /* Terms Box */
                    .terms-conditions-box {
                        border: 1px solid #000;
                        background-color: #e5e7eb !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        padding: 8px 12px;
                        font-size: 8pt;
                        border-radius: 4px;
                        margin-bottom: 15px;
                        line-height: 1.4;
                    }

                    .term-line {
                        font-weight: 500;
                        color: #111;
                    }

                    /* Signatures grid */
                    .signatures-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin-top: 15px;
                    }

                    .signature-box {
                        border: 1px solid #000;
                        padding: 10px 5px;
                        text-align: center;
                        font-size: 8.5pt;
                        border-radius: 4px;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        height: 85px;
                    }

                    .sig-title {
                        font-weight: bold;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 4px;
                        margin-bottom: 5px;
                    }

                    .sig-line {
                        border-bottom: 1px dotted #000;
                        width: 75%;
                        margin: 15px auto 4px auto;
                    }

                    .sig-date-line {
                        font-size: 7.5pt;
                        color: #444;
                    }
                }
                `
            }} />
        </div>
    );
};

export default ProductionRequisitionPrintToolPage;
