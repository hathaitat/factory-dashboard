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
    const [printSize] = useState('9x11'); // Standardized for both A4 and 9x11, optimized for 9x11

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

    if (isLoading) return <div style={{ padding: '2rem' }}>กำลังโหลด...</div>;
    if (!invoice || !company) return <div style={{ padding: '2rem' }}>ไม่พบข้อมูล</div>;

    // Pagination logic: count "lines" instead of just items
    const CHARS_PER_LINE = 55; // Estimated chars in product name column

    const calculateRows = (item) => {
        // Minimum 1 row for the item
        if (!item.productName) return 1;
        // Calculate wrapping rows (total chars divided by chars per line, round up)
        const lines = Math.ceil(item.productName.length / CHARS_PER_LINE);
        return Math.max(1, lines);
    };

    const getRowBudget = () => {
        // Average rows that fit in the items area before footer
        // A4 is taller (11.7in) vs Continuous (11in)
        return printSize === 'A4' ? 22 : 18;
    };

    const paginateItems = (items) => {
        const ROW_BUDGET = getRowBudget();
        const pages = [];
        let currentPageItems = [];
        let currentRows = 0;

        items.forEach((item) => {
            const itemRows = calculateRows(item);
            
            // If adding this item exceeds the budget, start a new page
            if (currentRows + itemRows > ROW_BUDGET && currentPageItems.length > 0) {
                pages.push({ items: currentPageItems, rowCount: currentRows });
                currentPageItems = [item];
                currentRows = itemRows;
            } else {
                currentPageItems.push(item);
                currentRows += itemRows;
            }
        });

        if (currentPageItems.length > 0) {
            pages.push({ items: currentPageItems, rowCount: currentRows });
        }

        return pages.length > 0 ? pages : [{ items: [], rowCount: 0 }];
    };

    const pages = paginateItems(invoice.items);

    return (
        <div className="print-container">
            <div className="no-print" style={{ padding: '1rem', display: 'flex', gap: '1rem', background: '#111', borderBottom: '1px solid #333', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/dashboard/invoices')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #444', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                <button onClick={handlePrint} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <Printer size={18} /> พิมพ์ใบกำกับภาษี
                </button>

                {/* Certificate Print Buttons */}
                {matchingCerts.map((cert) => (
                    <button
                        key={cert.id}
                        onClick={() => window.open(cert.file_url, '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        <Printer size={18} /> ปริ้นท์ Cer: {cert.name}
                    </button>
                ))}
            </div>

            {pages.map((page, pageIdx) => {
                const pageItems = page.items;
                const isFirstPage = pageIdx === 0;
                const isLastPage = pageIdx === pages.length - 1;
                const pageNumber = pageIdx + 1;
                const totalPages = pages.length;

                // Calculate cumulative subtotals for Balance Forward
                const previousPagesItems = pages.slice(0, pageIdx).flatMap(p => p.items);
                const previousPagesSubtotal = previousPagesItems.reduce((sum, item) => sum + item.amount, 0);

                const upToThisPageItems = pages.slice(0, pageIdx + 1).flatMap(p => p.items);
                const currentCumulativeSubtotal = upToThisPageItems.reduce((sum, item) => sum + item.amount, 0);

                return (
                    <div className={`invoice-paper size-${printSize}`} key={pageIdx}>
                        {/* Dynamic style for @page size */}
                        <style>
                            {`@media print { @page { size: ${printSize === 'A4' ? 'A4' : '9in 11in'}; margin: 0; } }`}
                        </style>
                        {/* Page Header (Always Full) */}
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
                                <div className="doc-title">ใบกำกับสินค้า / ใบกำกับภาษี </div>
                                {totalPages > 1 && (
                                    <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                                        หน้าที่ {pageNumber} / {totalPages}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Details (Always Full) */}
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
                                    <th style={{ width: '44%' }}>รหัสสินค้า / รายละเอียด</th>
                                    <th style={{ width: '20%' }}>จำนวน</th>
                                    <th style={{ width: '13%' }}>ราคา / หน่วย</th>
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
                                    const globalIndex = pages.slice(0, pageIdx).reduce((acc, p) => acc + p.items.length, 0) + index;
                                    return (
                                        <tr key={item.id}>
                                            <td style={{ textAlign: 'center' }}>{globalIndex + 1}</td>
                                            <td>{item.productName}</td>
                                            <td style={{ textAlign: 'right' }}>{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                            <td style={{ textAlign: 'right' }}>{item.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

                                {/* Fill empty rows to maintain height (Only on the last page) */}
                                {isLastPage && [...Array(Math.max(1, getRowBudget() - page.rowCount - 3))].map((_, i) => (
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
                                    <div className="sig-line">ในนาม บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด</div>
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
