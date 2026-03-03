import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { companyService } from '../services/companyService';
import '../styles/InvoicePrint.css';

const InvoicePrintTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        const [invData, compData] = await Promise.all([
            invoiceService.getInvoiceById(id),
            companyService.getCompanyInfo()
        ]);
        setInvoice(invData);
        setCompany(compData);
        setIsLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div style={{ padding: '2rem' }}>กำลังโหลด...</div>;
    if (!invoice || !company) return <div style={{ padding: '2rem' }}>ไม่พบข้อมูล</div>;

    return (
        <div className="print-container">
            <div className="no-print" style={{ padding: '1rem', display: 'flex', gap: '1rem', background: '#111', borderBottom: '1px solid #333' }}>
                <button onClick={() => navigate('/dashboard/invoices')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #444', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <Printer size={18} /> พิมพ์ใบกำกับภาษี
                </button>
            </div>

            <div className="invoice-paper">
                <div className="header-section">
                    <div className="company-info-print">
                        <div className="company-name-th">{company.name}</div>
                        <div className="company-address-th">{company.address}</div>
                        <div className="company-contact">
                            {company.phone && `TEL: ${company.phone}`} {company.fax && `FAX: ${company.fax}`}
                        </div>
                        <div className="company-email">E-mail: {company.email}</div>
                        <div className="company-taxid">เลขประจำตัวผู้เสียภาษี: {company.taxId}</div>
                    </div>
                    <div className="title-section">
                        <div className="doc-title">ใบกำกับสินค้า / ใบกำกับภาษี</div>
                    </div>
                </div>

                <div className="details-section">
                    <div className="customer-info-box">
                        <div className="info-row">
                            <span className="label">ลูกค้า</span>
                            <span className="value">{invoice.customer?.code}</span>
                        </div>
                        <div className="info-row">
                            <span className="value-bold">{invoice.customer?.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">เลขประจำตัวผู้เสียภาษี</span>

                            <span className="value">{invoice.customer?.taxId}  {invoice.customer?.branch && <span>สาขา {invoice.customer?.branch}</span>}</span>


                        </div>
                        <div className="info-row">
                            <span className="value">{invoice.customer?.address}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">TEL:</span>
                            <span className="value">{invoice.customer?.phone}</span>
                            <span className="label" style={{ marginLeft: '1.5rem' }}>FAX:</span>
                            <span className="value">{invoice.customer?.fax || '-'}</span>
                        </div>
                        <div className="info-row" style={{ marginTop: '0.5rem' }}>
                            <span className="label">อ้างอิง</span>
                            <span className="value">{invoice.referenceNo}</span>
                        </div>
                    </div>

                    <div className="invoice-meta-box" style={{ paddingLeft: '3rem' }}>
                        <div className="info-row">
                            <span className="label">เลขที่ใบกำกับ&nbsp;&nbsp;</span>
                            <span className="value">{invoice.invoiceNo}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">วันที่&nbsp;&nbsp;</span>
                            <span className="value">{new Date(invoice.date).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="info-row" style={{ marginTop: '1.5rem' }}>
                            <span className="label">เครดิต</span>
                            <span className="value">{parseInt(invoice.creditDays) === 0 ? 'สด' : `${invoice.creditDays} วัน`}</span>
                            <span className="label" style={{ marginLeft: '1rem' }}>ครบกำหนด</span>
                            <span className="value">{new Date(invoice.dueDate).toLocaleDateString('th-TH')}</span>
                        </div>
                    </div>
                </div>

                <table className="items-table-print">
                    <thead>
                        <tr>
                            <th style={{ width: '8%' }}>ลำดับ</th>
                            <th style={{ width: '52%' }}>รหัสสินค้า / รายละเอียด</th>
                            <th style={{ width: '12%' }}>จำนวน</th>
                            <th style={{ width: '13%' }}>ราคา / หน่วย</th>
                            <th style={{ width: '15%' }}>จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                <td>{item.productName}</td>
                                <td style={{ textAlign: 'right' }}>{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })} {item.unit}</td>
                                <td style={{ textAlign: 'right' }}>{item.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'right' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                        {/* Fill empty rows to maintain height and show grid lines */}
                        {[...Array(Math.max(1, 7 - invoice.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="empty-row">
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="2" rowSpan={4 + (invoice.adjustments?.length || 0)} className="notes-cell" style={{ verticalAlign: 'top', padding: '8px', textAlign: 'left', border: '1px solid #000' }}>
                                <strong>หมายเหตุ:</strong> {invoice.notes}
                            </td>
                            <td colSpan="2" className="summary-label">รวมเป็นเงิน</td>
                            <td className="summary-value">{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="summary-label">หักส่วนลด</td>
                            <td className="summary-value">{invoice.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="summary-label">ยอดหลังหักส่วนลด</td>
                            <td className="summary-value">{(invoice.subtotal - (invoice.discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" className="summary-label">ภาษีมูลค่าเพิ่ม {invoice.vatRate}%</td>
                            <td className="summary-value">{invoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>

                        {(invoice.adjustments || []).map((adj, idx) => (
                            <tr key={`adj-${idx}`}>
                                <td colSpan="2" className="summary-label">{adj.label}</td>
                                <td className="summary-value">{Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}

                        <tr>
                            <td colSpan="2" className="baht-text-cell">({invoice.bahtText})</td>
                            <td colSpan="2" className="summary-label-bold">จำนวนเงินรวมทั้งสิ้น</td>
                            <td className="summary-value-bold">{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="footer-section">
                    <div className="signature-box">
                        <div className="sig-line">ได้รับสินค้าตามรายการข้างต้นไว้ถูกต้อง</div>
                        <div className="sig-line">และอยู่ในสภาพเรียบร้อยทุกประการ</div>
                        <div className="sig-input">
                            <div>
                                <span>ผู้รับสินค้า__________________________________________</span>
                            </div>
                            <br />
                            <div>
                                <span>วันที่_____________/_____________/_____________</span>
                            </div>
                            <br />

                        </div>
                    </div>
                    <div className="signature-box">
                        <div className="sig-line">ในนาม {company.name}</div>
                        <div style={{ height: '40px' }}></div>
                        <div className="sig-input">
                            <span>ผู้รับมอบอำนาจ__________________________________________</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrintTemplate;
