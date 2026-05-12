import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { companyService } from '../services/companyService';
import { settingService } from '../services/settingService';
import '../styles/InvoicePrint.css';

const ReceiptPrintTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bn, setBN] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formats, setFormats] = useState(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        const [bnData, compData, formatsSettings] = await Promise.all([
            billingNoteService.getBillingNoteById(id),
            companyService.getCompanyInfo(),
            settingService.getSetting('document_formats')
        ]);
        setBN(bnData);
        setCompany(compData);
        setFormats(formatsSettings || { billing_note_prefix: 'BN', receipt_prefix: 'RE' });
        setIsLoading(false);
    };

    const calculateDueDate = (date, creditDays) => {
        if (!date) return '-';
        if (!creditDays) return new Date(date).toLocaleDateString('th-TH');

        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + parseInt(creditDays));
        return dueDate.toLocaleDateString('th-TH');
    };

    const getReceiptNumber = () => {
        if (!bn || !bn.billingNoteNo || !formats) return '-';
        const rePrefix = formats.receipt_prefix || 'RV';
        const bnPrefix = formats.billing_note_prefix || 'BI';

        if (bn.billingNoteNo.startsWith(bnPrefix)) {
            return bn.billingNoteNo.replace(bnPrefix, rePrefix);
        }
        return bn.billingNoteNo.replace(/^[a-zA-Z]+/, rePrefix);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div className="p-8">กำลังโหลด...</div>;
    if (!bn || !company) return <div className="p-8">ไม่พบข้อมูล</div>;

    return (
        <div className="print-container">
            <div className="no-print" style={{ 
                padding: '0.8rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center',
                gap: '1rem',
                background: '#111', 
                color: 'white', 
                position: 'sticky', 
                top: 0, 
                zIndex: 100,
                borderBottom: '1px solid #333'
            }}>
                <button 
                    onClick={() => navigate(`/dashboard/billing-notes/${id}`)} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                
                <button 
                    onClick={handlePrint} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: '#3b82f6', border: 'none', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Printer size={18} /> พิมพ์ใบเสร็จรับเงิน
                </button>
            </div>

            <div className="invoice-paper" style={{ border: 'none', boxShadow: 'none' }}>
                {/* Header - Top Right "Copy" or similar if needed, user image shows "สำเนา" but usually we opt for original first. User said "template like this", probably the structure. I'll assume "Original" or "Receipt". */}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', marginTop: '1rem' }}>
                    {/* Left: Company Info */}
                    <div style={{ width: '65%' }}>
                        <div style={{ fontSize: '1.26rem', fontWeight: 'bold', lineHeight: '1.8' }}>{company.name}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>{company.address}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                            {[
                                company.phone && `Tel. ${company.phone}`,
                                company.fax && `Fax. ${company.fax}`,
                                company.taxId && `Tax ID: ${company.taxId}`
                            ].filter(Boolean).join(' | ')}
                        </div>
                    </div>

                    {/* Right: Doc Title Box */}
                    <div style={{ width: '35%', textAlign: 'center', padding: '1.5rem 0 1rem' }}>
                        <div style={{
                            border: '1px solid #000',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                        }}>
                            ใบเสร็จรับเงิน<br />
                            <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>Receipt</span>
                        </div>
                        <div style={{ marginTop: '5px', fontSize: '0.8rem', textAlign: 'right' }}>
                            เลขประจำตัวผู้เสียภาษี {company.taxId}
                        </div>
                    </div>
                </div>

                {/* Customer & Document Info Boxes */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    {/* Customer Info Box */}
                    <div style={{
                        flex: 2,
                        border: '1px solid #000',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ lineHeight: '1.8' }}>
                            <strong style={{ width: '50px', display: 'inline-block' }}>ลูกค้า</strong> {bn.customer?.name} {bn.customer?.branch && `(${bn.customer.branch})`}
                        </div>
                        <div style={{ marginLeft: '50px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                            {bn.customer?.address}
                        </div>
                        <div style={{ marginLeft: '50px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                            {bn.customer?.phone && `TEL: ${bn.customer.phone}`}  <br />  {bn.customer?.taxId && `เลขประจำตัวผู้เสียภาษี: ${bn.customer.taxId}`}
                        </div>
                    </div>

                    {/* Document Meta Box */}
                    <div style={{
                        flex: 1,
                        border: '1px solid #000',
                        borderRadius: '8px',
                        padding: '10px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', lineHeight: '1.8' }}>
                            <span>เลขที่ (No.)</span>
                            <strong>{getReceiptNumber()}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span>วันที่ (Date)</span>
                            <span>{new Date(bn.date).toLocaleDateString('th-TH')}</span>
                        </div>
                        {/* Reference to BN if needed, but image shows Invoice refs in table */}
                    </div>
                </div>

                {/* Main Items Table */}
                <div style={{ border: '1px solid #000', marginBottom: '5px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #000', height: '30px' }}>
                                <th style={{ borderRight: '1px solid #000', width: '8%', textAlign: 'center' }}>ลำดับ</th>
                                <th style={{ borderRight: '1px solid #000', width: '25%', textAlign: 'center' }}>เลขที่ใบกำกับ</th>
                                <th style={{ borderRight: '1px solid #000', width: '15%', textAlign: 'center' }}>ลงวันที่</th>
                                <th style={{ borderRight: '1px solid #000', width: '20%', textAlign: 'center' }}>ครบกำหนด</th>
                                <th className="text-center">จำนวนเงินเรียกเก็บ</th>
                            </tr>
                        </thead>
                        <tbody style={{ lineHeight: '1.8' }}>
                            {bn.invoices.map((inv, index) => (
                                <tr key={inv.id} style={{ height: '24px' }}>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>{index + 1}</td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>{inv.invoiceNo}</td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>
                                        {inv.dueDate
                                            ? new Date(inv.dueDate).toLocaleDateString('th-TH')
                                            : calculateDueDate(inv.date, inv.creditDays)}
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '5px' }}>
                                        {inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {/* Fill empty rows to maintain height */}
                            {[...Array(Math.max(1, 12 - bn.invoices.length))].map((_, i) => (
                                <tr key={`empty-${i}`} style={{ height: '24px' }}>
                                    <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                    <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                    <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                    <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                    <td>&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ lineHeight: '1.8' }}>
                            <tr style={{ borderTop: '1px solid #000', height: '30px' }}>
                                <td colSpan="3" style={{ borderRight: '1px solid #000', textAlign: 'center', background: '#f5f5f5', fontSize: '0.9rem' }}>
                                    ({bn.bahtText || '-'})
                                </td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center', fontWeight: 'bold' }}>
                                    รวมเป็นเงิน
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '5px', fontWeight: 'bold' }}>
                                    {bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    {/* "รวมเป็นเงิน" label row not strictly in table structure of image, but "Baht text" is on left, Amount on right. The image has a specific row for this. I used tfoot which is close. 
                        Let's adjust tfoot to match image: Left big cell for text, Right cell for "รวมเป็นเงิน" label + value? No, image has "รวมเป็นเงิน" label in the footer row description? 
                        The image shows: [ Baht Text ................. ] [ รวมเป็นเงิน ] [ 13,268.00 ]
                    */}
                </div>

                {/* Adjusting the footer total row to match image better if possible, but the table above is standard. 
                    Let's redraw the footer part specifically outside the table or as a specific row? 
                    Actually, the image shows the footer row as PART of the table structure.
                    Col 1-4 merged: Text
                    Col 5 split? No, Col 4 is Due Date.
                    The Text spans across columns.
                    Let's refine the footer row in the table above:
                    <tr style={{ borderTop: '1px solid #000' }}>
                        <td colSpan="3" style={{ borderRight: '1px solid #000', paddingLeft: '10px' }}>{bn.bahtText}</td>
                        <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>รวมเป็นเงิน</td>
                        <td style={{ textAlign: 'right', paddingRight: '5px' }}>{total}</td>
                    </tr>
                    I will update the table footer in the code block.
                */}

                {/* Payment Section */}
                <div style={{ border: '1px solid #000', marginBottom: '15px', padding: '10px 15px' }}>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '10px', paddingTop: '10px' }}>
                        <div className="font-bold">ชำระโดย</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '15px', height: '15px', border: '1px solid #000' }}></div> สด
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '15px', height: '15px', border: '1px solid #000' }}></div> เช็คธนาคาร ..............................................................................
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', paddingTop: '10px' }}>
                        <div style={{ opacity: 0 }}>ชำระโดย</div> {/* Spacer */}
                        <div>สาขา .......................................... เลขที่ .......................................... ลงวันที่ ..........................................</div>
                    </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingTop: '40px' }}>
                    {/* Left Sig */}
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ marginBottom: '5px' }}>ลงชื่อ ........................................................... ผู้รับเงิน</div>

                    </div>

                    {/* Right Sig */}
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ marginBottom: '5px' }}>ลงชื่อ .................................................... ผู้รับมอบอำนาจ</div>

                    </div>
                </div>

                {/* Legal Note */}
                <div style={{ fontSize: '0.8rem', textAlign: 'left', marginTop: '20px', lineHeight: '1.8' }}>
                    หมายเหตุ : โปรดจ่ายเช็คขีดคร่อมในนาม {company.name} เท่านั้น <br />
                    ใบเสร็จนี้จะสมบูรณ์เมื่อผู้รับเงิน และผู้รับมอบอำนาจลงนามร่วมกัน และเช็คของท่านผ่านการเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว
                </div>

                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white; -webkit-print-color-adjust: exact; }
                        .print-container { padding: 0; }
                        .invoice-paper { padding: 0; }
                        * { color: black !important; border-color: black !important; }
                    }
                    .invoice-paper {
                        max-width: 800px;
                        margin: 20px auto;
                        padding: 24mm 10mm;
                        background: white;
                        font-family: "Sarabun", sans-serif;
                       font-size: 0.85rem;
                       font-weight: 600;
                    }
                    table th {
                        background-color: #f0f0f0; /* Light gray for screen, white for print usually or keep gray */
                    }
                    @media print {
                         table th { background-color: transparent !important; }
                    }
                `}</style>
            </div>
        </div >
    );
};

export default ReceiptPrintTemplate;
