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

    if (isLoading) return <div style={{ padding: '2rem' }}>กำลังโหลด...</div>;
    if (!bn || !company) return <div style={{ padding: '2rem' }}>ไม่พบข้อมูล</div>;

    const bahtText = bn.bahtText || ''; // Assuming the service provides it or we calculate it

    return (
        <div className="print-container">
            <div className="no-print" style={{ padding: '1rem', display: 'flex', gap: '1rem', background: '#111', borderBottom: '1px solid #333' }}>
                <button onClick={() => navigate(`/dashboard/billing-notes/${id}`)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #444', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <Printer size={18} /> พิมพ์ใบวางบิล
                </button>
            </div>

            <div className="invoice-paper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ width: '60%' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{company.name}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>{company.address}</div>
                        <div style={{ fontSize: '0.9rem' }}>
                            {company.phone && `Tel. ${company.phone}`} {company.fax && `, Fax. ${company.fax}`}
                            {company.taxId && ` Tax ID: ${company.taxId}`}
                        </div>
                    </div>

                    <div style={{ width: '35%', textAlign: 'center', padding: '2rem 0 0.5rem' }}>
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
                            <span className="value-bold">{bn.customer?.name}</span>
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
                        {[...Array(Math.max(1, 10 - bn.invoices.length))].map((_, i) => (
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
                            <td className="summary-value" style={{ color: 'black', display: 'flex', justifyContent: 'space-between', borderLeft: 'none', padding: '8px' }}>
                                <span className="summary-label-bold" style={{ color: 'black', background: 'transparent' }}>รวมทั้งสิ้น</span>
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
