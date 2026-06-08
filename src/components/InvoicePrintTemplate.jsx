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
    const [matchingCerts, setMatchingCerts] = useState([]);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        // We import certificateService dynamically to avoid circular dependencies if any, or just import at top.
        const { certificateService } = await import('../services/certificateService');

        const [invData, compData, allCerts] = await Promise.all([
            invoiceService.getInvoiceById(id),
            companyService.getCompanyInfo(),
            certificateService.getCertificates()
        ]);

        setInvoice(invData);
        setCompany(compData);

        // Find certificates that match the products in this invoice
        if (invData && invData.items && allCerts) {
            const certs = allCerts.filter(cert => {
                // Check if any product in the certificate matches any product in the invoice
                if (!cert.certificate_products) return false;

                return cert.certificate_products.some(cp => {
                    const certProductName = cp.customer_products?.name;
                    return invData.items.some(item => item.productName === certProductName);
                });
            });
            setMatchingCerts(certs);
        }

        setIsLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div className="p-8">กำลังโหลด...</div>;
    if (!invoice || !company) return <div className="p-8">ไม่พบข้อมูล</div>;

    // Pagination logic
    const MAX_ITEMS_P1 = 12; // Fewer items on P1 due to header/customer info
    const MAX_ITEMS_PN = 18; // More items on subsequent pages

    const paginateItems = (items) => {
        const pages = [];
        let currentItems = [...items];

        // Page 1
        pages.push(currentItems.slice(0, MAX_ITEMS_P1));
        currentItems = currentItems.slice(MAX_ITEMS_P1);

        // Subsequent pages
        while (currentItems.length > 0) {
            pages.push(currentItems.slice(0, MAX_ITEMS_PN));
            currentItems = currentItems.slice(MAX_ITEMS_PN);
        }

        return pages.length > 0 ? pages : [[]];
    };

    const pages = paginateItems(invoice.items);

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
                    onClick={() => navigate('/dashboard/invoices')} 
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
                    <Printer size={18} /> พิมพ์ใบกำกับภาษี
                </button>

                {/* Certificate Print Buttons */}
                {matchingCerts.map((cert) => (
                    <button
                        key={cert.id}
                        onClick={() => window.open(cert.file_url, '_blank')}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.5rem', 
                            background: '#10b981', border: 'none', color: 'white', 
                            padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        <Printer size={18} /> ปริ้นท์ Cer: {cert.name}
                    </button>
                ))}
            </div>

            {pages.map((pageItems, pageIdx) => {
                const isFirstPage = pageIdx === 0;
                const isLastPage = pageIdx === pages.length - 1;
                const pageNumber = pageIdx + 1;
                const totalPages = pages.length;

                // Calculate cumulative subtotals for Balance Forward
                const itemsBeforeThisPage = invoice.items.slice(0, pages.slice(0, pageIdx).reduce((acc, p) => acc + p.length, 0));
                const previousPagesSubtotal = itemsBeforeThisPage.reduce((sum, item) => sum + item.amount, 0);

                const itemsUpToThisPage = invoice.items.slice(0, pages.slice(0, pageIdx + 1).reduce((acc, p) => acc + p.length, 0));
                const currentCumulativeSubtotal = itemsUpToThisPage.reduce((sum, item) => sum + item.amount, 0);

                return (
                    <div className="invoice-paper" key={pageIdx}>
                        {/* Page Header - Full on every page */}
                        <div className="header-section">
                            <div className="company-info-print">
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                                        {company.logoUrl && (
                                            <img src={company.logoUrl} alt="Company Logo" style={{ height: '90px', maxWidth: '250px', objectFit: 'contain' }} />
                                        )}
                                        <div>
                                            <div className="company-name-th">{company.name}</div>
                                            {company.nameEn && <div className="company-name-en" style={{ marginTop: '4px' }}>{company.nameEn}</div>}
                                        </div>
                                    </div>
                                    <div className="company-address-th" style={{ lineHeight: '1.6' }}>{company.address}</div>
                                    <div className="company-contact" style={{ lineHeight: '1.6' }}>
                                        {[
                                            company.phone && `TEL: ${company.phone}`,
                                            company.fax && `FAX: ${company.fax}`,
                                            company.email && `E-mail: ${company.email}`,
                                            company.taxId && `เลขประจำตัวผู้เสียภาษี: ${company.taxId}`
                                        ].filter(Boolean).join(' | ')}
                                    </div>
                                </div>
                            </div>
                            <div className="title-section">
                                <div className="doc-title">ใบกำกับสินค้า / ใบกำกับภาษี</div>
                                <div>{totalPages > 1 ? ` (หน้า ${pageNumber}/${totalPages})` : ''}</div>
                            </div>
                        </div>

                        {/* Customer Details - Full on every page */}
                        <div className="details-section">
                            <div className="customer-info-box">
                                <div className="info-row">
                                    <span className="label">ลูกค้า</span>
                                    <span className="value">{invoice.customer?.code}</span>
                                </div>
                                <div className="info-row">
                                    <span className="value-bold">{invoice.customer?.name} {invoice.customer?.branch && `(สาขา ${invoice.customer.branch})`}</span>
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
                                <div className="info-row" style={{ marginTop: '1.5rem', gap: '2px' }}>
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
                                    <th style={{ width: '44%' }}>รหัสสินค้า / รายละเอียด</th>
                                    <th style={{ width: '18%' }}>จำนวน</th>
                                    <th style={{ width: '15%' }}>ราคา / หน่วย</th>
                                    <th style={{ width: '15%' }}>จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Balance Brought Forward */}
                                {pageIdx > 0 && (
                                    <tr className="balance-forward-row">
                                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>ยอดยกมา (Balance Brought Forward)</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{previousPagesSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                )}

                                {pageItems.map((item, index) => {
                                    // Calculate actual global index
                                    const globalIndex = pageIdx === 0 ? index : MAX_ITEMS_P1 + (pageIdx - 1) * MAX_ITEMS_PN + index;
                                    return (
                                        <tr key={item.id}>
                                            <td className="text-center">{globalIndex + 1}</td>
                                            <td>{item.productName}</td>
                                            <td className="text-right">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                            <td className="text-right">{item.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="text-right">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}

                                {/* Subtotal Carried Forward */}
                                {!isLastPage && (
                                    <tr className="balance-forward-row">
                                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>รวมยอดเงินยกไป (Subtotal Carried Forward)</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{currentCumulativeSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                )}

                                {/* Fill empty rows — always pad to 13 rows total (12 items + 1 empty = baseline) */}
                                {isLastPage && [...Array(Math.max(0, 11 - pageItems.length))].map((_, i) => (
                                    <tr key={`empty-${i}`} className="empty-row">
                                        <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                        <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                        <td>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                            {isLastPage && (
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" rowSpan={4 + (invoice.adjustments?.length || 0)} className="notes-cell" style={{ verticalAlign: 'top', padding: '8px', textAlign: 'left', border: '1px solid #000', borderBottom: 'none' }}>
                                            <strong>หมายเหตุ:</strong> {invoice.notes}
                                        </td>
                                        <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: 'none' }}>รวมเป็นเงิน</td>
                                        <td className="summary-value" style={{ borderLeft: 'none', borderBottom: 'none' }}>{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: 'none' }}>หักส่วนลด</td>
                                        <td className="summary-value" style={{ borderLeft: 'none', borderBottom: 'none' }}>{invoice.discount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: 'none' }}>ยอดหลังหักส่วนลด</td>
                                        <td className="summary-value" style={{ borderLeft: 'none', borderBottom: 'none' }}>{(invoice.subtotal - (invoice.discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: 'none' }}>ภาษีมูลค่าเพิ่ม {invoice.vatRate}%</td>
                                        <td className="summary-value" style={{ borderLeft: 'none', borderBottom: 'none' }}>{invoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>

                                    {(invoice.adjustments || []).map((adj, idx) => (
                                        <tr key={`adj-${idx}`}>
                                            <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: 'none' }}>{adj.label}</td>
                                            <td className="summary-value" style={{ borderLeft: 'none', borderBottom: 'none' }}>{Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}

                                    <tr>
                                        <td colSpan="2" className="baht-text-cell" style={{ fontSize: "0.95rem", borderTop: 'none', borderRight: '1px solid #000' }}>({invoice.bahtText})</td>
                                        <td colSpan="2" className="summary-label-bold" style={{ borderRight: 'none', borderTop: 'none' }}>จำนวนเงินรวมทั้งสิ้น</td>
                                        <td className="summary-value-bold" style={{ borderLeft: 'none', borderTop: 'none' }}>{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>

                        {isLastPage && (
                            <div className="footer-section">
                                <div className="signature-box">
                                    <div className="sig-line">ได้รับสินค้าตามรายการข้างบนนี้ไว้ถูกต้อง</div>
                                    <div className="sig-line">และอยู่ในสภาพเรียบร้อยทุกประการ</div>
                                    <div className="sig-input">
                                        <div>
                                            <span>ผู้รับสินค้า__________________________________________</span>
                                        </div>
                                        <br />
                                        <div style={{ marginTop: '20px' }}>
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
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default InvoicePrintTemplate;
