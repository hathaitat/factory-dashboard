import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, FileText, Edit, Trash2, Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { usePermissions } from '../hooks/usePermissions';
import * as XLSX from 'xlsx';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const InvoiceListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        setIsLoading(true);
        const data = await invoiceService.getInvoices();
        setInvoices(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (id, invoiceNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบกำกับภาษีเลขที่ ${invoiceNo} หรือไม่?`);
        if (confirmed) {
            const success = await invoiceService.deleteInvoice(id);
            if (success) {
                setInvoices(invoices.filter(inv => inv.id !== id));
            } else {
                await showError(error.message || 'ไม่สามารถลบใบกำกับภาษีได้');
            }
        }
    };

    const exportToExcel = () => {
        const dataToExport = invoices.map(inv => ({
            'เลขที่ใบกำกับภาษี': inv.invoiceNo,
            'วันที่': inv.date,
            'ลูกค้า': inv.customerName,
            'เลขอ้างอิง': inv.referenceNo,
            'จำนวนเงินก่อน VAT': inv.subtotal,
            'VAT (7%)': inv.vatAmount,
            'ยอดรวมสุทธิ': inv.grandTotal,
            'สถานะ': inv.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
        XLSX.writeFile(wb, 'Invoice_Export.xlsx');
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping by Month/Year
    const getMonthYear = (dateString) => {
        const date = new Date(dateString);
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
    };

    const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
        const group = getMonthYear(inv.date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(inv);
        return acc;
    }, {});

    // Create an ordered array of keys sorted by the latest invoice in each group
    const monthYearGroups = Object.keys(groupedInvoices).sort((a, b) => {
        const dateA = Math.max(...groupedInvoices[a].map(inv => new Date(inv.date).getTime()));
        const dateB = Math.max(...groupedInvoices[b].map(inv => new Date(inv.date).getTime()));
        return dateB - dateA;
    });

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบกำกับภาษี (Invoices)"
                helpContent={HELP_CONTENT.invoices}
            >
                <button
                    onClick={exportToExcel}
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
                {hasPermission('invoices', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/invoices/new')}
                        style={{
                            padding: '0.6rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#3b82f6',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <Plus size={20} /> ออกใบกำกับภาษี
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่หรือชื่อลูกค้า..."
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1rem', width: '100%', outline: 'none' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบกำกับ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>อ้างอิง(PO)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>เครดิต (วัน)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงินสุทธิ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูล...</td>
                                </tr>
                            ) : filteredInvoices.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'var(--bg-main)' }}>
                                            <td colSpan="8" style={{ padding: '0.8rem 1.5rem', fontWeight: '600', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', borderTop: 'none' }}>
                                                เดือน {group}
                                            </td>
                                        </tr>
                                        {groupedInvoices[group].map((inv) => (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                                <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                    <Link to={`/dashboard/invoices/${inv.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                        {inv.invoiceNo}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem' }}>{inv.customerName}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', color: '#888' }}>{inv.referenceNo || '-'}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{parseInt(inv.creditDays) === 0 ? 'เงินสด' : `${inv.creditDays} วัน`}</td>
                                                <td style={{ padding: '1.2rem 1.5rem' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                                    ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.8rem',
                                                        background: inv.status === 'Draft' ? 'var(--card-hover)' : inv.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                        color: inv.status === 'Draft' ? 'var(--text-muted)' : inv.status === 'Pending' ? '#f59e0b' : 'var(--primary)'
                                                    }}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/dashboard/invoices/${inv.id}/print`)}
                                                            style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Print"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                        {hasPermission('billing', 'create') && (
                                                            <button
                                                                onClick={() => navigate('/dashboard/billing-notes/new', { state: { preselectInvoice: inv } })}
                                                                style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                                title="ออกใบวางบิล"
                                                            >
                                                                <FileText size={18} />
                                                            </button>
                                                        )}
                                                        {hasPermission('invoices', 'edit') && (
                                                            <button
                                                                onClick={() => navigate(`/dashboard/invoices/${inv.id}/edit`)}
                                                                style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                                title="Edit"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        )}
                                                        {hasPermission('invoices', 'delete') && (
                                                            <button
                                                                onClick={() => handleDelete(inv.id, inv.invoiceNo)}
                                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>ไม่พบรายการใบกำกับภาษี</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoiceListPage;
