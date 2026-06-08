import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Printer, FileSpreadsheet, Eye, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const QuotationListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [kpis, setKpis] = useState({ draft: 0, sent: 0, approved: 0, totalValue: 0 });

    const {
        data: paginatedData,
        totalItems,
        totalPages,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        isLoading,
        updateFilters,
        startItem,
        endItem,
        refresh
    } = useServerPagination(quotationService.getQuotationsPaginated, { searchTerm: '', dateFrom: '', dateTo: '' }, 50);

    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, dateFrom, dateTo });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, dateFrom, dateTo, updateFilters]);

    useEffect(() => {
        loadKpis();
    }, []);

    const loadKpis = async () => {
        const stats = await quotationService.getQuotationStats();
        setKpis(stats);
    };

    const handleDelete = async (id, quotationNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบเสนอราคาเลขที่ ${quotationNo} หรือไม่?`);
        if (confirmed) {
            try {
                const success = await quotationService.deleteQuotation(id);
                if (success) {
                    refresh();
                    loadKpis();
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

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const exportData = await quotationService.exportQuotations({
                searchTerm,
                dateFrom,
                dateTo
            });

            const dataToExport = exportData.map(qt => ({
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

    const hasActiveFilters = !!(dateFrom || dateTo);
    const clearFilters = () => { 
        setDateFrom(''); 
        setDateTo(''); 
        setDateFilterType('date'); 
        updateFilters({ dateFrom: '', dateTo: '' });
    };

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
        <div className="px-4">
            <PageHeader
                title="รายการใบเสนอราคา"
                helpContent={HELP_CONTENT?.quotations || "จัดการใบเสนอราคาสำหรับส่งให้ลูกค้าพิจารณา"}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel px-4 py-2.5 text-emerald-500 rounded-lg font-medium text-sm flex items-center gap-2 bg-white border border-slate-200" style={{ cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1 }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'กำลัง Export...' : 'Export All'}
                    </button>
                    {hasPermission('invoices', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/quotations/new')}
                            className="px-5 py-2.5 border-none text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25" style={{ background: '#3b82f6' }}
                        >
                            <Plus size={20} /> สร้างใบเสนอราคา
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel flex items-center gap-4 border border-gray-500/10 bg-gray-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500"><FileText size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">ฉบับร่าง</div>
                        <div className="text-xl font-bold text-gray-500">{kpis.draft}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-blue-500/10 bg-blue-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-blue-500 bg-blue-500/10"><Clock size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">ส่งแล้ว/รอพิจารณา</div>
                        <div className="text-xl font-bold text-blue-500">{kpis.sent}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-emerald-500/10 bg-emerald-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><CheckCircle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">อนุมัติแล้ว</div>
                        <div className="text-xl font-bold text-emerald-500">{kpis.approved}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-blue-500/10 bg-blue-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-blue-500 bg-blue-500/10"><TrendingUp size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">มูลค่าอนุมัติรวม</div>
                        <div className="text-xl font-bold text-blue-500">฿{kpis.totalValue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-4 relative">
                <Search size={18} className="text-textMuted absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    placeholder="ค้นหาเลขที่ใบเสนอราคา หรือชื่อลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-border text-main text-[0.95rem] rounded-xl bg-cardBg" style={{ padding: '0.85rem 1rem 0.85rem 2.8rem' }}
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
            <div className="glass-panel overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-border" style={{ background: 'rgba(0, 0, 0, 0.02)' }}>
                                <th className="actions-column text-textMuted font-semibold text-sm">จัดการ</th>
                                <th className="p-4 text-textMuted font-semibold text-sm">เลขที่ใบเสนอราคา</th>
                                <th className="p-4 text-textMuted font-semibold text-sm">ลูกค้า</th>
                                <th className="p-4 text-textMuted font-semibold text-sm">ยอดรวม (บาท)</th>
                                <th className="p-4 text-textMuted font-semibold text-sm">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-textMuted">
                                        ไม่พบข้อมูลใบเสนอราคา
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((qt) => (
                                    <tr key={qt.id} className="border-b border-border table-row-hover">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <Link
                                                    className="action-view"
                                                    to={`/dashboard/quotations/${qt.id}`}
                                                    target="_blank"
                                                    title="View"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                <Link
                                                    className="action-print"
                                                    to={`/dashboard/quotations/${qt.id}/print`}
                                                    target="_blank"
                                                    title="Print"
                                                >
                                                    <Printer size={18} />
                                                </Link>
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
                                            <div className="font-semibold text-blue-500" style={{ marginBottom: '2px' }}>
                                                {qt.quotationNo}
                                            </div>
                                            <div className="text-xs text-textMuted">
                                                {fmtDate(qt.date)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-main font-medium">
                                                {qt.customer_id ? (
                                                    <Link 
                                                        to={`/dashboard/customers/${qt.customer_id}`} 
                                                        className="text-blue-500 no-underline"
                                                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                    >
                                                        {qt.customerName}
                                                    </Link>
                                                ) : (
                                                    qt.customerName
                                                )}
                                            </div>
                                            {qt.attnName && (
                                                <div className="text-xs text-textMuted" style={{ marginTop: '2px' }}>
                                                    ATTN: {qt.attnName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium">
                                            ฿{fmtNum(qt.grandTotal)}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBlock(qt.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    startItem={startItem}
                    endItem={endItem}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>
        </div>
    );
};

export default QuotationListPage;
