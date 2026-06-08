import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { companyService } from '../services/companyService';
import '../styles/InvoicePrint.css';

const BillingNotePrintTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bn, setBN] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        const [bnData, compData] = await Promise.all([
            billingNoteService.getBillingNoteById(id),
            companyService.getCompanyInfo()
        ]);
        setBN(bnData);
        setCompany(compData);
        setIsLoading(false);
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
                    <Printer size={18} /> พิมพ์ใบวางบิล
                </button>
            </div>

            <div className="invoice-paper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', marginTop: '1rem' }}>
                    <div style={{ width: '60%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                            {company.logoUrl && (
                                <img src={company.logoUrl} alt="Company Logo" style={{ height: '90px', maxWidth: '250px', objectFit: 'contain' }} />
                            )}
                            <div>
                                <div style={{ fontSize: '1.26rem', fontWeight: 'bold' }}>{company.name}</div>
                                {company.nameEn && <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '4px' }}>{company.nameEn}</div>}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>{company.address}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            {[
                                company.phone && `Tel. ${company.phone}`,
                                company.fax && `Fax. ${company.fax}`,
                                company.taxId && `Tax ID: ${company.taxId}`
                            ].filter(Boolean).join(' | ')}
                        </div>
                    </div>

                    <div style={{ width: '35%', textAlign: 'center', padding: '3rem 0 0.5rem' }}>
                        <div style={{
                            border: '1px solid #000',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                        }}>
                            ใบวางบิล<br />
                            <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>BILLING NOTE</span>
                        </div>
                    </div>
                </div>

                {/* Customer & Document Info Boxes */}
                <div className="details-section">
                    <div className="customer-info-box">
                        <div className="info-row">
                            <span className="label">ลูกค้า : </span>
                            <span className="value-bold">{bn.customer?.name} {bn.customer?.branch && `(สาขา ${bn.customer.branch})`}</span>
                        </div>
                        <div className="info-row">
                            <span className="value" style={{ fontSize: '0.9rem' }}>{bn.customer?.address}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">เลขประจำตัวผู้เสียภาษี</span>
                            <span className="value">{bn.customer?.taxId} {bn.customer?.branch && `(สาขา ${bn.customer.branch})`}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">โทรศัพท์</span>
                            <span className="value">{bn.customer?.phone}</span>
                        </div>
                    </div>

                    <div className="invoice-meta-box" style={{ paddingLeft: '6rem' }}>
                        <div className="info-row">
                            <span className="label">เลขที่ (No.)</span>
                            <span className="value">{bn.billingNoteNo}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">วันที่ (Date)</span>
                            <span className="value">{new Date(bn.date).toLocaleDateString('th-TH')}</span>
                        </div>
                    </div>
                </div>

                <table className="items-table-print" style={{ marginTop: '1rem', borderTop: '1px solid #000' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '10%', color: 'black', padding: '8px' }}>ลำดับ</th>
                            <th style={{ width: '40%', color: 'black', padding: '8px' }}>เลขที่ใบกำกับภาษี</th>
                            <th style={{ width: '25%', color: 'black', padding: '8px' }}>ลงวันที่</th>
                            <th style={{ width: '25%', color: 'black', padding: '8px' }}>จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody style={{ borderBottom: '1px solid #000' }}>
                        {bn.invoices.map((inv, index) => (
                            <tr key={inv.id}>
                                <td style={{ textAlign: 'center', color: 'black', borderRight: '1px solid #000', padding: '8px' }}>{index + 1}</td>
                                <td style={{ textAlign: 'center', color: 'black', borderRight: '1px solid #000', padding: '8px' }}>{inv.invoiceNo}</td>
                                <td style={{ textAlign: 'center', color: 'black', borderRight: '1px solid #000', padding: '8px' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                <td style={{ textAlign: 'right', color: 'black', padding: '8px' }}>{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                        {/* Fill empty rows */}
                        {[...Array(Math.max(1, 8 - bn.invoices.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="empty-row">
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <td colSpan="3" style={{ borderRight: '1px solid #000', textAlign: 'center', color: 'black', padding: '8px' }}>
                                ({bn.bahtText || '-'})
                            </td>
                            <td className="summary-value" style={{ color: 'black', padding: '8px', textAlign: 'right' }}>
                                <span className="summary-label-bold" style={{ color: 'black', background: 'transparent', float: 'left' }}>รวมทั้งสิ้น (Total)</span>
                                <span className="summary-value-bold" style={{ color: 'black' }}>{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ padding: '10px', border: '1px solid #000', borderTop: 'none', borderBottom: 'none', minHeight: '60px' }}>
                    <strong>หมายเหตุ:</strong><br />
                    {bn.notes || '-'}
                </div>

                <div className="footer-section" style={{ borderTop: 'none' }}>
                    <div className="signature-box" style={{ width: '50%', borderRight: '1px solid #000', padding: '10px' }}>
                        <div className="sig-line" style={{ color: 'black' }}>ผู้วางบิล_______________________________________</div>
                        <div className='sig-line' style={{ marginTop: '2rem', textAlign: 'center', color: 'black' }}>
                            จำนวนบิล: {bn.invoices.length} ฉบับ
                        </div>
                    </div>
                    <div className="signature-box" style={{ width: '50%', padding: '10px' }}>
                        <div className="sig-line" style={{ color: 'black' }}>ผู้รับวางบิล_______________________________________</div>

                        <div className="sig-input">
                            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'black' }}>วันนัดชำระ______________/______________/______________</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print-container { padding: 0; }
                    .invoice-paper { box-shadow: none; border: none; }
                    * { color: black !important; }
                }
            `}</style>
        </div>
    );
};

export default BillingNotePrintTemplate;
