import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Printer, FileSpreadsheet, Eye, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar } from 'lucide-react';
import { quotationService } from '../services/quotationService';
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

    // Export only a specific month's quotations
    const exportMonthToExcel = (group, monthQuotations) => {
        const dataToExport = monthQuotations.map(qt => ({
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
        XLSX.writeFile(wb, `Quotation_${group.replace(/ /g, '_')}.xlsx`);
    };

    const hasActiveFilters = dateFrom || dateTo;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); };

    const filteredQuotations = quotations.filter(qt => {
        const matchSearch = qt.quotationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (qt.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

        const targetDate = qt.date; // Only one date type for quotes
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        return matchSearch && matchDateFrom && matchDateTo;
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

    // KPI Calculations
    const kpis = React.useMemo(() => {
        const draft = quotations.filter(q => q.status === 'Draft').length;
        const sent = quotations.filter(q => q.status === 'Sent').length;
        const approved = quotations.filter(q => q.status === 'Approved').length;
        const totalValue = quotations
            .filter(q => q.status === 'Approved')
            .reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);

        return { draft, sent, approved, totalValue };
    }, [quotations]);

    const getStatusBlock = (status) => {
        const styles = {
            Draft: { background: '#f3f4f6', color: '#6b7280', icon: <FileText size={14} /> },
            Sent: { background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', icon: <Clock size={14} /> },
            Approved: { background: 'rgba(16, 185, 129, 0.08)', color: '#059669', icon: <CheckCircle size={14} /> },
            Rejected: { background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', icon: <XCircle size={14} /> },
            Cancelled: { background: '#f3f4f6', color: '#6b7280', icon: <AlertCircle size={14} /> }
        };

        const config = styles[status] || styles.Draft;

        return (
            <span style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: config.background,
                color: config.color,
                border: `1px solid ${config.color}22`
            }}>
                {config.icon}
                {status === 'Draft' ? 'ฉบับร่าง' : 
                 status === 'Sent' ? 'ส่งแล้ว' : 
                 status === 'Approved' ? 'อนุมัติแล้ว' : 
                 status === 'Rejected' ? 'ปฏิเสธ' : 
                 status === 'Cancelled' ? 'ยกเลิก' : status}
            </span>
        );
    };

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบเสนอราคา"
                helpContent={HELP_CONTENT?.quotations || "จัดการใบเสนอราคาสำหรับส่งให้ลูกค้าพิจารณา"}
            >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            color: 'var(--success)',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            opacity: isExporting ? 0.7 : 1
                        }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'กำลัง Export...' : 'Export All'}
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
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                            }}
                        >
                            <Plus size={20} /> สร้างใบเสนอราคา
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(107, 114, 128, 0.1)', background: 'rgba(107, 114, 128, 0.02)' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.7rem', borderRadius: '10px', color: '#6b7280' }}><FileText size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ฉบับร่าง</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#6b7280' }}>{kpis.draft}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#3b82f6' }}><Clock size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ส่งแล้ว/รอพิจารณา</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{kpis.sent}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><CheckCircle size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>อนุมัติแล้ว</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.approved}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#3b82f6' }}><TrendingUp size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>มูลค่าอนุมัติรวม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>฿{kpis.totalValue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

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
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            {/* Table */}
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>จัดการ</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>เลขที่ใบเสนอราคา</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>ลูกค้า</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>ยอดรวม (บาท)</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
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
                                        <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                                            <td colSpan="5" style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#37477C', borderBottom: '1px solid var(--border-color)', borderTop: 'none', fontSize: '1rem' }}>
                                                <div className="flex justify-between items-center">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Calendar size={18} color="#3b82f6" />
                                                        <span>{group}</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{groupedQuotations[group].length} รายการ</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); exportMonthToExcel(group, groupedQuotations[group]); }}
                                                        title={`Export Excel ${group}`}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                            padding: '0.4rem 0.8rem', borderRadius: '6px',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                                            background: 'white',
                                                            color: 'var(--success)', cursor: 'pointer',
                                                            fontSize: '0.8rem', fontWeight: '600',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                                                    >
                                                        <FileSpreadsheet size={14} /> ส่งออก Excel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {groupedQuotations[group].map((qt) => (
                                            <tr key={qt.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                                                <td className="actions-column">
                                                    <div className="table-actions">
                                                        <button
                                                            className="action-view"
                                                            onClick={() => window.open(`/dashboard/quotations/${qt.id}`, '_blank')}
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            className="action-print"
                                                            onClick={() => window.open(`/dashboard/quotations/${qt.id}/print`, '_blank')}
                                                            title="Print"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                        <button
                                                            className="action-edit"
                                                            onClick={() => navigate(`/dashboard/quotations/${qt.id}`)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        {hasPermission('invoices', 'delete') && (
                                                            <button
                                                                className="action-delete"
                                                                onClick={() => handleDelete(qt.id, qt.quotationNo)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '2px' }}>
                                                        {qt.quotationNo}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {fmtDate(qt.date)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
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
                                                <td className="p-4">
                                                    {getStatusBlock(qt.status)}
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
