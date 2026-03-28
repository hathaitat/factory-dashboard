import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, FileText, Edit, Trash2, Printer, FileSpreadsheet, Eye } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';

const QuotationListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [quotations, setQuotations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadQuotations();
    }, []);

    const loadQuotations = async () => {
        setIsLoading(true);
        const data = await quotationService.getQuotations();
        setQuotations(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (id, quotationNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบเสนอราคาเลขที่ ${quotationNo} หรือไม่?`);
        if (confirmed) {
            try {
                const success = await quotationService.deleteQuotation(id);
                if (success) {
                    setQuotations(quotations.filter(qt => qt.id !== id));
                } else {
                    await showError('ไม่สามารถลบใบเสนอราคาได้');
                }
            } catch (error) {
                console.error('Delete error', error);
                await showError(error.message || 'ไม่สามารถลบใบเสนอราคาได้');
            }
        }
    };

    const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

    // Grouping by Month/Year of date
    const getMonthYear = (dateString) => {
        if (!dateString) return 'ไม่มีวันที่';
        const date = new Date(dateString);
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const dataToExport = filteredQuotations.map(qt => ({
                'เลขที่ใบเสนอราคา': qt.quotationNo,
                'วันที่': qt.date ? new Date(qt.date).toLocaleDateString('th-TH') : '',
                'ลูกค้า': qt.customerName,
                'ATTN': qt.attnName || '',
                'มูลค่าสุทธิ': qt.grandTotal,
                'สถานะ': qt.status
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
            XLSX.writeFile(wb, 'Quotations_Export.xlsx');

            showAlert('ส่งออกข้อมูล Excel สำเร็จ!');
        } catch (error) {
            console.error('Export Excel failed:', error);
            showError('เกิดข้อผิดพลาดในการส่งออก Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = dateFrom || dateTo || statusFilter;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setDateFilterType('date'); };

    const filteredQuotations = quotations.filter(qt => {
        const matchSearch = qt.quotationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (qt.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const targetDate = qt.date; // Only one date type for quotes
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        const matchStatus = !statusFilter || qt.status === statusFilter;
        return matchSearch && matchDateFrom && matchDateTo && matchStatus;
    });

    const groupedQuotations = filteredQuotations.reduce((acc, qt) => {
        const group = getMonthYear(qt.date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(qt);
        return acc;
    }, {});

    const monthYearGroups = Object.keys(groupedQuotations).sort((a, b) => {
        if (a === 'ไม่มีวันที่') return 1;
        if (b === 'ไม่มีวันที่') return -1;
        const dateA = Math.max(...groupedQuotations[a].map(qt => new Date(qt.date || 0).getTime()));
        const dateB = Math.max(...groupedQuotations[b].map(qt => new Date(qt.date || 0).getTime()));
        return dateB - dateA;
    });

    const getStatusBlock = (status) => {
        switch (status) {
            case 'Draft': return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Draft</span>;
            case 'Sent': return <span style={{ background: '#dbeafe', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Sent</span>;
            case 'Approved': return <span style={{ background: '#dcfce7', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Approved</span>;
            case 'Rejected': return <span style={{ background: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Rejected</span>;
            case 'Cancelled': return <span style={{ background: '#f3f4f6', color: '#9ca3af', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>Cancelled</span>;
            default: return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>{status}</span>;
        }
    };

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบเสนอราคา (Quotations)"
                helpContent={HELP_CONTENT?.quotations || "จัดการใบเสนอราคาสำหรับส่งให้ลูกค้าพิจารณา"}
            >
                <button
                    onClick={exportToExcel}
                    disabled={isExporting}
                    className="glass-panel"
                    style={{
                        padding: '0.6rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        color: 'var(--success)',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        borderRadius: '8px',
                        opacity: isExporting ? 0.7 : 1
                    }}
                >
                    <FileSpreadsheet size={18} /> {isExporting ? 'กำลัง Export...' : 'Export Excel'}
                </button>
                {hasPermission('invoices', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/quotations/new')}
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
                        <Plus size={20} /> สร้างใบเสนอราคา
                    </button>
                )}
            </PageHeader>

            {/* Search and Filter */}
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นหาเลขที่ใบเสนอราคา หรือชื่อลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.8rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem'
                    }}
                />
            </div>

            <ListFilter
                filters={[
                    {
                        type: 'date-range',
                        dateFrom,
                        dateTo,
                        onDateFromChange: setDateFrom,
                        onDateToChange: setDateTo,
                        value: dateFilterType,
                        onChange: setDateFilterType,
                        options: [
                            { value: 'date', label: 'วันที่เอกสาร' }
                        ]
                    },
                    {
                        type: 'select',
                        label: 'สถานะ',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        options: [
                            { value: '', label: 'ทั้งหมด' },
                            { value: 'Draft', label: 'Draft' },
                            { value: 'Sent', label: 'Sent' },
                            { value: 'Approved', label: 'Approved' },
                            { value: 'Rejected', label: 'Rejected' },
                            { value: 'Cancelled', label: 'Cancelled' }
                        ]
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            {/* Table */}
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>เลขที่ใบเสนอราคา</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>ลูกค้า</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>ยอดรวม (บาท)</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>สถานะ</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : monthYearGroups.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        ไม่พบข้อมูลใบเสนอราคา
                                    </td>
                                </tr>
                            ) : (
                                monthYearGroups.map(group => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }}>
                                            <td colSpan="5" style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                {group}
                                            </td>
                                        </tr>
                                        {groupedQuotations[group].map((qt) => (
                                            <tr key={qt.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '2px' }}>
                                                        {qt.quotationNo}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {fmtDate(qt.date)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                                                        {qt.customerName}
                                                    </div>
                                                    {qt.attnName && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            ATTN: {qt.attnName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: '500' }}>
                                                    ฿{fmtNum(qt.grandTotal)}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    {getStatusBlock(qt.status)}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => window.open(`/dashboard/quotations/${qt.id}`, '_blank')}
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(`/dashboard/quotations/${qt.id}/print`, '_blank')}
                                                            style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Print"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/dashboard/quotations/${qt.id}`)}
                                                            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        {hasPermission('invoices', 'delete') && (
                                                            <button 
                                                                onClick={() => handleDelete(qt.id, qt.quotationNo)}
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
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QuotationListPage;
