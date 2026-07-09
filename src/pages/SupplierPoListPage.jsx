import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileSpreadsheet, Eye, Printer, FileText, Clock, XCircle, Calendar, ShoppingCart, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';
import XLSX from 'xlsx-js-style';

const SupplierPoListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [supplierId, setSupplierId] = useState('');
    const [supplierProductId, setSupplierProductId] = useState('');
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [suppliers, setSuppliers] = useState([]);

    const [kpis, setKpis] = useState({ completed: 0, partial: 0, draft: 0, cancelled: 0, overdue: 0 });

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
    } = useServerPagination(supplierPoService.getSupplierPosPaginated, { searchTerm: '', dateFrom: '', dateTo: '', dateFilterType: 'date', supplierId: '', supplierProductId: '' }, 50);

    // Debounce filters
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, dateFrom, dateTo, dateFilterType, supplierId, supplierProductId });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, dateFrom, dateTo, dateFilterType, supplierId, supplierProductId, updateFilters]);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    useEffect(() => {
        loadStats();
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const data = await supplierService.getSuppliers();
            setSuppliers(data || []);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    };

    useEffect(() => {
        if (supplierId) {
            loadSupplierProducts(supplierId);
        } else {
            setSupplierProducts([]);
            setSupplierProductId('');
        }
    }, [supplierId]);

    const loadSupplierProducts = async (sid) => {
        try {
            const data = await supplierProductService.getProductsBySupplierId(sid);
            setSupplierProducts(data || []);
        } catch (error) {
            console.error('Error loading supplier products:', error);
        }
    };

    const loadStats = async () => {
        try {
            const stats = await supplierPoService.getSupplierPoStats();
            setKpis(stats);
        } catch (error) {
            console.error('Error loading KPI stats:', error);
        }
    };

    const loadPos = async () => {
        refresh();
    };

    const handleDelete = async (id, poNumber) => {
        const confirmed = await showConfirm(`ต้องการลบใบสั่งซื้อเลขที่ ${poNumber} หรือไม่?`);
        if (confirmed) {
            try {
                await supplierPoService.deleteSupplierPo(id);
                refresh();
                loadStats();
            } catch (error) {
                console.error('Error deleting:', error);
                showError(error.message || 'ไม่สามารถลบใบสั่งซื้อได้');
            }
        }
    };

    const handleCancel = async (id, poNumber) => {
        const confirmed = await showConfirm(`ยืนยันการยกเลิกใบสั่งซื้อเลขที่ ${poNumber}? \n(ระบบจะตรวจสอบสต็อกและหักสินค้าออกจากคลังคืน)`);
        if (confirmed) {
            try {
                await supplierPoService.cancelSupplierPo(id);
                await showAlert('ยกเลิกใบสั่งซื้อและปรับปรุงสต็อกเรียบร้อยแล้ว');
                refresh();
                loadStats();
            } catch (error) {
                console.error('Error cancelling:', error);
                showError(error.message || 'ไม่สามารถยกเลิกใบสั่งซื้อได้');
            }
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const data = await supplierPoService.exportSupplierPos({ searchTerm, dateFrom, dateTo, dateFilterType, supplierId, supplierProductId });
            const dataToExport = data.map(po => ({
                'เลขที่ PO': po.po_number,
                'วันที่สั่งซื้อ': po.date || po.po_date,
                'กำหนดส่ง': po.delivery_date || '-',
                'ผู้ขาย': po.suppliers?.name || '-',
                'ยอดเงินสุทธิ': po.grand_total || 0,
                'สถานะ': po.status,
                'หมายเหตุ': po.remark || ''
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vendor_POs');
            XLSX.writeFile(wb, `Vendor_PO_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
            showError('ไม่สามารถส่งออกข้อมูลได้');
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusConfig = (status) => {
        const styles = {
            Draft: { color: '#6b7280', bg: '#f3f4f6', text: 'ฉบับร่าง', icon: <FileText size={14} /> },
            Partial: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', text: 'รับสินค้าบางส่วน', icon: <Clock size={14} /> },
            Completed: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', text: 'ได้รับสินค้าครบแล้ว', icon: <ShoppingCart size={14} /> },
            Cancelled: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', text: 'ยกเลิก', icon: <XCircle size={14} /> }
        };
        return styles[status] || styles.Draft;
    };

    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); setSupplierId(''); setSupplierProductId(''); };

    const hasActiveFilters = dateFrom || dateTo || supplierId || supplierProductId;

    return (
        <div className="px-4">
            <PageHeader title="ใบสั่งซื้อผู้ขาย (Vendor PO)" subtitle="จัดการการจัดซื้อวัตถุดิบและอุปกรณ์">
                <div className="flex gap-3">
                    <button onClick={exportToExcel} className="glass-panel px-4 py-2.5 bg-white border border-slate-200 text-emerald-500 cursor-pointer rounded-lg font-medium text-sm flex items-center gap-2">
                        <FileSpreadsheet size={18} /> Export All
                    </button>
                    {hasPermission('supplier_pos', 'create') && (
                        <button onClick={() => navigate('/dashboard/supplier-pos/create')} className="px-5 py-2.5 border-none text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                            <Plus size={20} /> สร้างใบสั่งซื้อใหม่
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(107, 114, 128, 0.1)', background: 'rgba(107, 114, 128, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-gray-500" style={{ background: 'rgba(107, 114, 128, 0.1)' }}><FileText size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">ฉบับร่าง (Draft)</div>
                        <div className="text-xl font-bold text-gray-500">{kpis.draft}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-amber-500" style={{ background: 'rgba(245, 158, 11, 0.1)' }}><Clock size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รับบางส่วน (Partial)</div>
                        <div className="text-xl font-bold text-amber-500">{kpis.partial}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-emerald-500" style={{ background: 'rgba(16, 185, 129, 0.1)' }}><ShoppingCart size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รับครบแล้ว (Completed)</div>
                        <div className="text-xl font-bold text-emerald-500">{kpis.completed}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <div className="p-2.5 rounded-xl text-red-500" style={{ background: 'rgba(239, 68, 68, 0.1)' }}><XCircle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">ยกเลิก (Cancelled)</div>
                        <div className="text-xl font-bold text-red-500">{kpis.cancelled}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 mb-6 border border-border flex items-center gap-4" style={{ background: 'var(--card-bg)' }}>
                <Search size={20} className="text-textMuted" />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ PO หรือชื่อผู้ขาย..."
                    className="bg-transparent border-none text-main text-base w-full outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <ListFilter
                filters={[
                    {
                        type: 'select',
                        label: 'ผู้ขาย (Supplier)',
                        value: supplierId,
                        onChange: setSupplierId,
                        options: [
                            { value: '', label: 'ผู้ขายทั้งหมด' },
                            ...suppliers.map(s => ({ value: s.id, label: s.name }))
                        ]
                    },
                    {
                        type: 'select',
                        label: 'รายการสินค้า (Product Item)',
                        value: supplierProductId,
                        onChange: setSupplierProductId,
                        options: [
                            { value: '', label: 'รายการสินค้าทั้งหมด' },
                            ...supplierProducts.map(p => ({ value: p.id, label: p.name }))
                        ],
                        disabled: !supplierId
                    },
                    {
                        type: 'date-range',
                        dateFrom,
                        dateTo,
                        onDateFromChange: setDateFrom,
                        onDateToChange: setDateTo,
                        value: dateFilterType,
                        onChange: setDateFilterType,
                        options: [
                            { value: 'date', label: 'วันที่สั่งซื้อ' },
                            { value: 'delivery_date', label: 'วันกำหนดส่ง' }
                        ]
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!(dateFrom || dateTo)}
            />

            <div className="glass-panel p-0 overflow-x-auto">
                <div className="table-responsive-wrapper">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th style={{ width: '40px' }}></th>
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">เลขที่ PO</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ผู้ขาย (Vendor)</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">วันที่สั่งซื้อ</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">สถานที่จัดส่ง</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">กำหนดส่ง</th>
                                <th className="p-4 text-textMuted font-semibold text-right">ยอดเงินสุทธิ</th>
                                <th className="p-4 text-textMuted font-semibold text-center">การรับสินค้า</th>
                                <th className="p-4 text-textMuted font-semibold text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((po) => {
                                    const status = getStatusConfig(po.status);
                                    const isExpanded = expandedRows.has(po.id);
                                    return (
                                        <React.Fragment key={po.id}>
                                            <tr
                                                className="border-b border-border cursor-pointer" style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.02)' : 'var(--card-bg)' }}
                                                onClick={() => toggleRow(po.id)}
                                            >
                                                <td className="text-center">
                                                    {isExpanded ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
                                                </td>
                                                <td className="actions-column">
                                                    <div className="table-actions">
                                                        <Link to={`/dashboard/supplier-pos/${po.id}`} target="_blank" onClick={(e) => e.stopPropagation()} className="action-view" title="ดูรายละเอียด"><Eye size={18} /></Link>
                                                        {hasPermission('supplier_pos', 'edit') && (po.status === 'Draft' || po.status === 'Partial') && (
                                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}/edit`); }} className="action-edit" title="แก้ไข"><Edit size={18} /></button>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/create?duplicate=${po.id}`); }} className="action-edit" style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.05)' }} title="คัดลอกรายการ"><Copy size={18} /></button>
                                                        <Link to={`/dashboard/supplier-pos/${po.id}/print`} target="_blank" onClick={(e) => e.stopPropagation()} className="action-print" title="พิมพ์เอกสาร"><Printer size={18} /></Link>
                                                        {hasPermission('supplier_pos', 'delete') && (po.status === 'Draft') && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(po.id, po.po_number); }} className="action-delete" title="ลบ"><Trash2 size={18} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}`); }} className="px-6 py-5 font-semibold text-blue-500 text-lg font-mono">{po.po_number}</td>
                                                <td className="px-6 py-5">
                                                    {po.supplier_id ? (
                                                        <Link 
                                                            to={`/dashboard/suppliers/${po.supplier_id}`} 
                                                            className="text-blue-500 no-underline"
                                                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                        >
                                                            {po.suppliers?.name || '-'}
                                                        </Link>
                                                    ) : (
                                                        po.suppliers?.name || '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-center">{po.date ? new Date(po.date).toLocaleDateString('th-TH') : '-'}</td>
                                                <td className="px-6 py-5 text-center">{po.warehouses ? `${po.warehouses.code ? `[${po.warehouses.code}] ` : ''}${po.warehouses.name}` : '-'}</td>
                                                <td className="px-6 py-5 text-center">
                                                    <span style={{ color: po.delivery_date && new Date(po.delivery_date) < new Date() && po.status !== 'Completed' ? 'var(--error)' : 'inherit' }}>
                                                        {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right font-semibold text-emerald-500">
                                                    ฿{po.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 text-center whitespace-nowrap">
                                                    {(() => {
                                                        const totalQty = po.supplier_po_items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
                                                        const receivedQty = po.supplier_po_items?.reduce((sum, item) => sum + Number(item.received_quantity || 0), 0) || 0;
                                                        const percent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

                                                        return (
                                                            <div className="text-base font-bold" style={{ color: percent === 100 ? '#10b981' : (percent > 0 ? '#f59e0b' : 'var(--text-muted)') }}>
                                                                {receivedQty.toLocaleString()} / {totalQty.toLocaleString()}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-center whitespace-nowrap">
                                                    <span style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', background: status.bg, color: status.color, border: `1px solid ${status.color}22`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        {status.icon} {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr style={{ background: 'rgba(59, 130, 246, 0.01)' }}>
                                                    <td></td>
                                                    <td colSpan="9" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                                        <div className="glass-panel mt-3 p-4 bg-white rounded-lg" style={{ border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                                            <table className="w-full border-collapse text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-border text-left">
                                                                        <th className="p-2 text-textMuted">รายการสินค้า</th>
                                                                        <th className="p-2 text-textMuted text-right">จำนวน</th>
                                                                        <th className="p-2 text-textMuted text-right">ราคา/หน่วย</th>
                                                                        <th className="p-2 text-textMuted text-right">จำนวนเงิน</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {po.supplier_po_items?.map((item, idx) => (
                                                                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                                            <td className="p-2">
                                                                                <div className="font-medium">{item.description}</div>
                                                                                {item.note && <div className="text-textMuted" style={{ fontSize: '0.75rem' }}>{item.note}</div>}
                                                                            </td>
                                                                            <td className="p-2 text-right">{item.quantity.toLocaleString()} {item.unit}</td>
                                                                            <td className="p-2 text-right">฿{(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                            <td className="p-2 text-right font-medium">฿{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center text-textMuted" style={{ padding: '5rem' }}>
                                        <FileText size={48} className="mb-4" style={{ opacity: 0.2 }} />
                                        <div>ไม่พบรายการใบสั่งซื้อผู้ขาย</div>
                                    </td>
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

export default SupplierPoListPage;
