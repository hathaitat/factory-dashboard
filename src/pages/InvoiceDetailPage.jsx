import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, ArrowLeft, FileSpreadsheet, Edit, FileText } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import * as XLSX from 'xlsx';

const InvoiceDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const [invoice, setInvoice] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [invData, compData] = await Promise.all([
                invoiceService.getInvoiceById(id),
                companyService.getCompanyInfo()
            ]);
            setInvoice(invData);
            setCompany(compData);
        } catch (error) {
            console.error('Error loading detail data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcelFormatted = () => {
        if (!invoice || !company) return;

        // Create Header Info
        const header = [
            [company.name],
            [company.address],
            [`TEL: ${company.phone} FAX: ${company.fax || '-'}`],
            [`E-mail: ${company.email}`],
            [`เลขประจำตัวผู้เสียภาษี: ${company.taxId}`],
            [],
            ['ใบกำกับสินค้า / ใบกำกับภาษี'],
            []
        ];

        // Customer and Invoice Info
        const metaInfo = [
            ['ลูกค้า', invoice.customer?.code || '', '', 'เลขที่ใบกำกับ', invoice.invoiceNo],
            [invoice.customer?.name || '', '', '', 'วันที่', new Date(invoice.date).toLocaleDateString('th-TH')],
            ['เลขประจำตัวผู้เสียภาษี', `${invoice.customer?.taxId || ''} สาขา ${invoice.customer?.branch || 'สำนักงานใหญ่'}`, '', 'เครดิต', `${invoice.creditDays} วัน`],
            [invoice.customer?.address || '', '', '', 'ครบกำหนด', new Date(invoice.dueDate).toLocaleDateString('th-TH')],
            ['TEL:', invoice.customer?.phone || '', '', 'อ้างอิง (PO)', invoice.referenceNo || ''],
            ['FAX:', invoice.customer?.fax || '-', '', '', ''],
            []
        ];

        // Table Header
        const tableHeader = [
            ['ลำดับ', 'รายการสินค้า / รายละเอียด', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'จำนวนเงิน']
        ];

        // Table Rows
        const tableRows = invoice.items.map((item, index) => [
            index + 1,
            item.productName,
            item.quantity,
            item.unit,
            item.pricePerUnit,
            item.amount
        ]);

        // Blank rows
        const blanks = [[], []];

        // Totals
        const totals = [
            ['', '', '', '', 'รวมเป็นเงิน', invoice.subtotal],
            ['', '', '', '', 'หักส่วนลด', invoice.discount || 0],
            ['', '', '', '', `ภาษีมูลค่าเพิ่ม ${invoice.vatRate}%`, invoice.vatAmount],
            ...(invoice.adjustments || []).map(adj => ['', '', '', '', adj.label, Number(adj.amount)]),
            ['', '', '', '', 'จำนวนเงินรวมทั้งสิ้น', invoice.grandTotal],
            [],
            ['(' + invoice.bahtText + ')']
        ];

        // Combine all data
        const aoa = [...header, ...metaInfo, ...tableHeader, ...tableRows, ...blanks, ...totals];

        // Create workspace and workbook
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Basic column sizing
        const wscols = [
            { wch: 8 },  // Sequence
            { wch: 40 }, // Product Name
            { wch: 10 }, // Qty
            { wch: 10 }, // Unit
            { wch: 15 }, // Price
            { wch: 15 }  // Amount
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

        // Write file
        XLSX.writeFile(wb, `Invoice_${invoice.invoiceNo}.xlsx`);
    };

    if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>;
    if (!invoice) return <div style={{ padding: '2rem', color: 'var(--error)' }}>ไม่พบข้อมูลใบกำกับภาษี</div>;

    return (
        <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard/invoices')} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>รายละเอียดใบกำกับภาษี</h1>
                    <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        background: invoice.status === 'Draft' ? 'var(--card-hover)' : 'rgba(59, 130, 246, 0.1)',
                        color: invoice.status === 'Draft' ? 'var(--text-muted)' : 'var(--primary)',
                        marginLeft: '0.5rem'
                    }}>
                        {invoice.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {hasPermission('billing', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/billing-notes/new', { state: { preselectInvoice: invoice } })}
                            className="glass-panel"
                            style={{
                                padding: '0.6rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: '#3b82f6',
                                border: '1px solid #3b82f6',
                                color: 'white',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600'
                            }}
                        >
                            <FileText size={18} /> ออกใบวางบิล
                        </button>
                    )}
                    <button
                        onClick={exportToExcelFormatted}
                        className="glass-panel"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            cursor: 'pointer',
                            borderRadius: '8px'
                        }}
                    >
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                    <button
                        onClick={() => navigate(`/dashboard/invoices/${id}/print`)}
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.1)',
                            color: '#8b5cf6',
                            cursor: 'pointer',
                            borderRadius: '8px'
                        }}
                    >
                        <Printer size={18} /> พิมพ์ใบกำกับ
                    </button>
                    {hasPermission('invoices', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/invoices/${id}/edit`)}
                            style={{
                                padding: '0.6rem 1.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'var(--primary)',
                                border: 'none',
                                color: 'var(--text-inverse)',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600'
                            }}
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    {/* Simplified Preview matching Dashboard Theme */}
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{company.name}</h2>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>{company.address}</p>
                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลขประจำตัวผู้เสียภาษี: {company.taxId}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>{invoice.invoiceNo}</div>
                            <div style={{ color: 'var(--text-muted)' }}>วันที่: {new Date(invoice.date).toLocaleDateString('th-TH')}</div>
                        </div>
                    </div>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ข้อมูลลูกค้า</h4>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.3rem' }}>{invoice.customer?.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>สาขา: {invoice.customer?.branch || ''} | เลขประจำตัวผู้เสียภาษี: {invoice.customer?.taxId}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{invoice.customer?.address}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>TEL: {invoice.customer?.phone} | FAX: {invoice.customer?.fax || '-'}</div>
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ข้อมูลการชำระเงิน</h4>
                            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>PO อ้างอิง:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{invoice.referenceNo || '-'}</span>
                                <span style={{ color: 'var(--text-muted)' }}>เงื่อนไขเครดิต:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{parseInt(invoice.creditDays) === 0 ? 'เงินสด' : `${invoice.creditDays} วัน`}</span>
                                <span style={{ color: 'var(--text-muted)' }}>วันครบกำหนด:</span> <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{new Date(invoice.dueDate).toLocaleDateString('th-TH')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>#</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>รายการสินค้า / รายละเอียด</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>จำนวน</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ราคา/หน่วย</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>{idx + 1}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '500', borderRight: '1px solid var(--border-color)' }}>{item.productName}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'right', borderRight: '1px solid var(--border-color)' }}>฿{item.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-main)', textAlign: 'right', fontWeight: '500' }}>฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {/* Fill empty rows to maintain consistency */}
                            {[...Array(Math.max(1, 8 - invoice.items.length))].map((_, i) => (
                                <tr key={`empty-${i}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                    <td style={{ padding: '1rem', borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                    <td style={{ padding: '1rem', borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                    <td style={{ padding: '1rem', borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                    <td style={{ padding: '1rem' }}>&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
</div>

                    {invoice.notes && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>หมายเหตุ</h4>
                            <p style={{ margin: 0, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
                        </div>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>สรุปยอดเงิน</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>รวมเป็นเงิน</span>
                            <span style={{ color: 'var(--text-main)' }}>฿{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {invoice.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa' }}>ส่วนลด</span>
                                <span style={{ color: '#f87171' }}>- ฿{invoice.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>ภาษีมูลค่าเพิ่ม {invoice.vatRate}%</span>
                            <span style={{ color: 'var(--text-main)' }}>฿{invoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {(invoice.adjustments || []).map((adj, idx) => (
                            <div key={`adj-${idx}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{adj.label}</span>
                                <span style={{ color: Number(adj.amount) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                    {Number(adj.amount) >= 0 ? '+' : ''} ฿{Math.abs(Number(adj.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px' }}>
                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>จำนวนเงินสุทธิ</span>
                            <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.2rem' }}>฿{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>({invoice.bahtText})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailPage;
