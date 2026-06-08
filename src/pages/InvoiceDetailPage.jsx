import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, ArrowLeft, FileSpreadsheet, Edit, FileText, Clock, User } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';

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
            ['เลขประจำตัวผู้เสียภาษี', `${invoice.customer?.taxId || ''} สาขา ${invoice.customer?.branch || ''}`, '', 'เครดิต', `${invoice.creditDays} วัน`],
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

    if (isLoading) return <div className="p-8 text-textMuted">กำลังโหลดข้อมูล...</div>;
    if (!invoice) return <div className="p-8 text-red-500">ไม่พบข้อมูลใบกำกับภาษี</div>;

    return (
        <div className="px-4">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/invoices')} className="bg-transparent border border-border text-main rounded-lg cursor-pointer" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>รายละเอียดใบกำกับภาษี</h1>
                    <span className="rounded-full text-sm" style={{ padding: '0.3rem 0.8rem', background: invoice.status === 'Draft' ? 'var(--card-hover)' : (invoice.status === 'Sent' || invoice.status === 'Pending') ? 'rgba(245, 158, 11, 0.1)' : invoice.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : invoice.status === 'Cancelled' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: invoice.status === 'Draft' ? 'var(--text-muted)' : (invoice.status === 'Sent' || invoice.status === 'Pending') ? '#f59e0b' : invoice.status === 'Paid' ? '#10b981' : invoice.status === 'Cancelled' ? '#f87171' : 'var(--primary)', marginLeft: '0.5rem' }}>
                        {invoice.status === 'Draft' ? 'แบบร่าง (Draft)' :
                            (invoice.status === 'Sent' || invoice.status === 'Pending') ? 'ใบวางบิล (Sent)' :
                            invoice.status === 'Paid' ? 'ชำระเงินแล้ว (Paid)' :
                            invoice.status === 'Cancelled' ? 'ยกเลิก (Cancelled)' : invoice.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {hasPermission('billing', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/billing-notes/new', { state: { preselectInvoice: invoice } })}
                            className="glass-panel px-4 py-2.5 text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: '#3b82f6', border: '1px solid #3b82f6' }}
                        >
                            <FileText size={18} /> ออกใบวางบิล
                        </button>
                    )}
                    <button
                        onClick={exportToExcelFormatted}
                        className="glass-panel px-4 py-2.5 text-emerald-500 cursor-pointer rounded-lg flex items-center gap-2" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}
                    >
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                    <button
                        onClick={() => navigate(`/dashboard/invoices/${id}/print`)}
                        className="px-4 py-2.5 text-violet-500 cursor-pointer rounded-lg flex items-center gap-2" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                    >
                        <Printer size={18} /> พิมพ์ใบกำกับ
                    </button>
                    {hasPermission('invoices', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/invoices/${id}/edit`)}
                            className="px-5 py-2.5 border-none cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-panel p-8">
                    {/* Simplified Preview matching Dashboard Theme */}
                    <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h2 className="text-main" style={{ margin: '0 0 0.5rem 0' }}>{company.name}</h2>
                            <p className="m-0 text-textMuted text-sm" style={{ maxWidth: '400px' }}>{company.address}</p>
                            <p className="text-textMuted text-sm" style={{ margin: '0.5rem 0 0 0' }}>เลขประจำตัวผู้เสียภาษี: {company.taxId}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary mb-2">{invoice.invoiceNo}</div>
                            <div className="text-textMuted">วันที่: {new Date(invoice.date).toLocaleDateString('th-TH')}</div>
                        </div>
                    </div>

                    <div className="grid-mobile-stack mb-8 p-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                        <div>
                            <h4 className="text-textMuted" style={{ margin: '0 0 0.8rem 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ข้อมูลลูกค้า</h4>
                            <div className="font-semibold text-main" style={{ marginBottom: '0.3rem' }}>{invoice.customer?.name}</div>
                            <div className="text-textMuted text-sm" style={{ marginBottom: '0.3rem' }}>สาขา: {invoice.customer?.branch || ''} | เลขประจำตัวผู้เสียภาษี: {invoice.customer?.taxId}</div>
                            <div className="text-textMuted text-sm" style={{ marginBottom: '0.3rem' }}>{invoice.customer?.address}</div>
                            <div className="text-textMuted text-sm">TEL: {invoice.customer?.phone} | FAX: {invoice.customer?.fax || '-'}</div>
                        </div>
                        <div>
                            <h4 className="text-textMuted" style={{ margin: '0 0 0.8rem 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ข้อมูลการชำระเงิน</h4>
                            <div className="grid-mobile-stack text-sm" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                                <span className="text-textMuted">PO อ้างอิง:</span> <span className="text-main font-medium">{invoice.referenceNo || '-'}</span>
                                <span className="text-textMuted">เงื่อนไขเครดิต:</span> <span className="text-main font-medium">{parseInt(invoice.creditDays) === 0 ? 'เงินสด' : `${invoice.creditDays} วัน`}</span>
                                <span className="text-textMuted">วันครบกำหนด:</span> <span className="text-main font-medium">{new Date(invoice.dueDate).toLocaleDateString('th-TH')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                        <table className="w-full border-collapse mb-8">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="p-4 text-textMuted font-medium">#</th>
                                    <th className="p-4 text-textMuted font-medium">รายการสินค้า / รายละเอียด</th>
                                    <th className="p-4 text-textMuted font-medium text-center">จำนวน</th>
                                    <th className="p-4 text-textMuted font-medium text-right">ราคา/หน่วย</th>
                                    <th className="p-4 text-textMuted font-medium text-right">จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, idx) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="p-4 text-textMuted" style={{ borderRight: '1px solid var(--border-color)' }}>{idx + 1}</td>
                                        <td className="p-4 text-main font-medium" style={{ borderRight: '1px solid var(--border-color)' }}>{item.productName}</td>
                                        <td className="p-4 text-textMuted text-center" style={{ borderRight: '1px solid var(--border-color)' }}>{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</td>
                                        <td className="p-4 text-textMuted text-right" style={{ borderRight: '1px solid var(--border-color)' }}>฿{item.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-4 text-main text-right font-medium">฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {/* Fill empty rows to maintain consistency */}
                                {[...Array(Math.max(1, 8 - invoice.items.length))].map((_, i) => (
                                    <tr key={`empty-${i}`} className="border-b border-border">
                                        <td className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                        <td className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                        <td className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                        <td className="p-4" style={{ borderRight: '1px solid var(--border-color)' }}>&nbsp;</td>
                                        <td className="p-4">&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {invoice.notes && (
                        <div className="mb-8">
                            <h4 className="text-textMuted text-xs" style={{ margin: '0 0 0.5rem 0' }}>หมายเหตุ</h4>
                            <p className="m-0 text-textMuted" style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6">
                    <h3 className="text-lg text-main" style={{ margin: '0 0 1.5rem 0' }}>สรุปยอดเงิน</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div className="flex justify-between">
                            <span className="text-textMuted">รวมเป็นเงิน</span>
                            <span className="text-textMain">฿{invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {invoice.discount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-textMuted">ส่วนลด</span>
                                <span className="text-error">- ฿{invoice.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="border-b border-border" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem' }}>
                            <span className="text-textMuted">ภาษีมูลค่าเพิ่ม {invoice.vatRate}%</span>
                            <span className="text-textMain">฿{invoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {(invoice.adjustments || []).map((adj, idx) => (
                            <div key={`adj-${idx}`} className="flex justify-between">
                                <span className="text-textMuted">{adj.label}</span>
                                <span style={{ color: Number(adj.amount) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                    {Number(adj.amount) >= 0 ? '+' : ''} ฿{Math.abs(Number(adj.amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}

                        <div className="p-4 rounded-lg" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <span className="text-emerald-500 font-semibold">จำนวนเงินสุทธิ</span>
                            <span className="text-emerald-500 font-bold text-xl">฿{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-center" style={{ marginTop: '0.5rem' }}>
                            <span className="text-sm text-textMuted" style={{ fontStyle: 'italic' }}>({invoice.bahtText})</span>
                        </div>
                    </div>

                    {invoice.customerSnapshot?.deliveredBy && (
                        <div className="text-textMuted text-sm" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <h4 className="text-textMuted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อมูลการจัดส่ง</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-main font-medium">ผู้จัดส่ง: {invoice.customerSnapshot.deliveredBy}</span>
                            </div>
                        </div>
                    )}

                    <div className="text-textMuted text-sm" style={{ marginTop: invoice.customerSnapshot?.deliveredBy ? '1.5rem' : '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <h4 className="text-textMuted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อมูลระบบ</h4>
                        <div className="flex items-center gap-2">
                            <Clock size={14} /> 
                            <span>สร้างเมื่อ: {new Date(invoice.createdAt).toLocaleString('th-TH')}</span>
                        </div>
                        {invoice.createdBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> 
                                <span>สร้างโดย: <span className="text-main font-semibold">{invoice.createdBy}</span></span>
                            </div>
                        )}
                        {invoice.updatedAt && invoice.updatedAt !== invoice.createdAt && (
                            <div className="flex items-center gap-2">
                                <Clock size={14} /> 
                                <span>แก้ไขล่าสุด: {new Date(invoice.updatedAt).toLocaleString('th-TH')}</span>
                            </div>
                        )}
                        {invoice.updatedBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> 
                                <span>แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{invoice.updatedBy}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailPage;
