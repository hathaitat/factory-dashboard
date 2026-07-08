import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileSpreadsheet, Eye, Link as LinkIcon, Clock, CheckCircle, Package, AlertTriangle, Calendar } from 'lucide-react';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const PurchaseOrderListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions(); // We might use 'invoices' permission or a dedicated 'purchase_orders' one
    const { showConfirm, showAlert, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('due_date');
    const [statusFilter, setStatusFilter] = useState('');
    const [kpis, setKpis] = useState({ waiting: 0, progressing: 0, completed: 0, overdue: 0 });

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
    } = useServerPagination(purchaseOrderService.getPurchaseOrdersPaginated, { searchTerm: '', status: '', dateFrom: '', dateTo: '', dateFilterType: 'due_date' }, 50);

    useEffect(() => {
        const loadKPIs = async () => {
            const stats = await purchaseOrderService.getPurchaseOrderStats();
            setKpis({
                waiting: stats.waiting || 0,
                progressing: stats.progressing || 0,
                completed: stats.completed || 0,
                overdue: stats.overdue || 0
            });
        };
        loadKPIs();
    }, [refresh]);

    const hasActiveFilters = !!(statusFilter || dateFrom || dateTo);
    const clearFilters = () => {
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        updateFilters({ status: '', dateFrom: '', dateTo: '', dateFilterType: 'due_date' });
    };

    // Debounce filters
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, status: statusFilter, dateFrom, dateTo, dateFilterType });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, dateFrom, dateTo, dateFilterType, updateFilters]);

    const handleDelete = async (id, poNumber) => {
        const confirmed = await showConfirm(`ต้องการลบใบสั่งซื้อเลขที่ ${poNumber} หรือไม่?`);
        if (confirmed) {
            try {
                await purchaseOrderService.deletePurchaseOrder(id);
                refresh();
            } catch (error) {
                console.error('Error deleting PO:', error);
                await showAlert('ไม่สามารถลบใบสั่งซื้อได้ อาจมีการผูกกับใบกำกับภาษีแล้ว');
            }
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const exportData = await purchaseOrderService.exportPurchaseOrders({
                searchTerm,
                status: statusFilter,
                dateFrom,
                dateTo,
                dateFilterType
            });

            const dataToExport = exportData.map(po => ({
                'เลขที่ใบสั่งซื้อ (PO)': po.po_number,
                'วันที่ออกเอกสาร': po.issue_date,
                'วันกำหนดส่ง': po.due_date,
                'ลูกค้า': po.customers?.name || 'ลูกค้าทั่วไป',
                'สถานะ': po.status,
                'หมายเหตุ': po.notes || ''
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Purchase_Orders');
            XLSX.writeFile(wb, 'Purchase_Orders_Export.xlsx');
            await showAlert(`ส่งออก Excel เรียบร้อย (${dataToExport.length} ใบ)`);
        } catch (error) {
            console.error('Export error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="px-4">
            <PageHeader
                title="รายการใบสั่งซื้อ"
                helpContent={HELP_CONTENT.purchaseOrders}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        className="glass-panel px-4 py-2.5 text-emerald-500 cursor-pointer rounded-lg font-medium text-sm flex items-center gap-2 bg-white border border-slate-200"
                    >
                        <FileSpreadsheet size={18} /> Export All
                    </button>
                    {hasPermission('invoices', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/purchase-orders/new')}
                            className="px-5 py-2.5 border-none text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25" style={{ background: '#3b82f6' }}
                        >
                            <Plus size={20} /> เพิ่มใบสั่งซื้อ
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-amber-500" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><Clock size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รอรับออเดอร์</div>
                        <div className="text-xl font-bold text-amber-500">{kpis.waiting}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-blue-500/10 bg-blue-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-blue-500 bg-blue-500/10"><Package size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">กำลังผลิต/ส่ง</div>
                        <div className="text-xl font-bold text-blue-500">{kpis.progressing}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-red-500" style={{ background: 'rgba(239, 68, 68, 0.1)' }}><AlertTriangle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">เกินกำหนดส่ง</div>
                        <div className="text-xl font-bold text-red-500">{kpis.overdue}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-emerald-500/10 bg-emerald-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><CheckCircle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">สำเร็จแล้ว</div>
                        <div className="text-xl font-bold text-emerald-500">{kpis.completed}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 mb-6 border border-border flex items-center gap-4 bg-cardBg">
                <Search size={20} className="text-textMuted" />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ PO หรือชื่อลูกค้า..."
                    className="bg-transparent border-none text-main text-base w-full outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                            { value: 'issue_date', label: 'วันที่ออกเอกสาร' },
                            { value: 'due_date', label: 'วันกำหนดส่ง' }
                        ]
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
            />

            <div className="glass-panel overflow-x-auto p-0">
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">เลขที่ PO</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ชื่อลูกค้า</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">วันที่ออกเอกสาร</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">กำหนดส่ง</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">ความคืบหน้า (ชิ้น)</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">มูลค่าทั้งหมด</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((po) => (
                                    <tr key={po.id} className="border-b border-border bg-cardBg" style={{ transition: 'background 0.2s' }}>
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                {po.file_url && (
                                                    <a
                                                        className="action-download"
                                                        href={po.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View Document File"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                )}
                                                {hasPermission('invoices', 'create') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate('/dashboard/invoices/new', { state: { referencePoId: po.id } })}
                                                        title="ออกใบกำกับภาษีเชื่อมโยง PO นี้"
                                                    >
                                                        <LinkIcon size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('invoices', 'edit') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)}
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('invoices', 'delete') && (
                                                    <button
                                                        className="action-delete"
                                                        onClick={() => handleDelete(po.id, po.po_number)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-semibold text-blue-500 text-lg font-mono">
                                            {po.po_number}
                                        </td>
                                        <td className="px-6 py-5">
                                            {po.customer_id ? (
                                                <Link
                                                    to={`/dashboard/customers/${po.customer_id}`}
                                                    className="text-blue-500 font-medium no-underline"
                                                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {po.customers?.name || 'ลูกค้าทั่วไป'}
                                                </Link>
                                            ) : (
                                                po.customers?.name || 'ลูกค้าทั่วไป'
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">{new Date(po.issue_date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-5 text-center">
                                            {po.is_multi_due_date ? (
                                                <span className="text-amber-500 font-semibold px-2 py-1 rounded-md" style={{ background: 'rgba(245, 158, 11, 0.1)', fontSize: '0.85rem' }}>
                                                    Multi Dates
                                                </span>
                                            ) : (
                                                <span style={{
                                                    color: new Date(po.due_date) < new Date() && po.status !== 'Completed' ? 'var(--error)' : 'inherit',
                                                    fontWeight: new Date(po.due_date) < new Date() && po.status !== 'Completed' ? '600' : 'normal'
                                                }}>
                                                    {po.due_date ? new Date(po.due_date).toLocaleDateString('th-TH') : '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="text-[0.95rem]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                                <span className="font-semibold" style={{ color: po.total_delivered_quantity >= po.total_po_quantity ? 'var(--success)' : '#3b82f6' }}>
                                                    {po.total_delivered_quantity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                </span>
                                                <span className="text-textMuted">/</span>
                                                <span className="font-medium text-main">
                                                    {po.total_po_quantity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right font-medium text-main">
                                            ฿{po.total_po_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="rounded-full text-xs font-semibold px-3 py-1.5 whitespace-nowrap inline-flex gap-1" style={{ alignItems: 'center', background: po.status === 'Waiting' ? 'rgba(245, 158, 11, 0.08)' : po.status === 'Progressing' ? 'rgba(59, 130, 246, 0.08)' : po.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' : po.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.08)' : '#f3f4f6', color: po.status === 'Waiting' ? '#d97706' : po.status === 'Progressing' ? '#2563eb' : po.status === 'Completed' ? '#059669' : po.status === 'Cancelled' ? '#dc2626' : '#6b7280', border: po.status === 'Waiting' ? '1px solid rgba(245, 158, 11, 0.2)' : po.status === 'Progressing' ? '1px solid rgba(59, 130, 246, 0.2)' : po.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.2)' : po.status === 'Cancelled' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #e5e7eb' }}>
                                                {po.status === 'Waiting' && <Clock size={14} />}
                                                {po.status === 'Progressing' && <Package size={14} />}
                                                {po.status === 'Completed' && <CheckCircle size={14} />}
                                                {po.status === 'Cancelled' && <AlertTriangle size={14} />}
                                                {po.status === 'Waiting' ? 'รอดำเนินการ (Waiting)' :
                                                    po.status === 'Progressing' ? 'กำลังดำเนินการ (Progressing)' :
                                                        po.status === 'Completed' ? 'ส่งมอบครบแล้ว (Completed)' :
                                                            po.status === 'Cancelled' ? 'ยกเลิก (Cancelled)' : po.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-textMuted">ไม่พบรายการใบสั่งซื้อ</td>
                                </tr>
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

export default PurchaseOrderListPage;
