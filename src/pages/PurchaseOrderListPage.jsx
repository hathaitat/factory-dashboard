import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileSpreadsheet, Eye, Link as LinkIcon, Clock, CheckCircle, Package, AlertTriangle, Calendar } from 'lucide-react';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';

const PurchaseOrderListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions(); // We might use 'invoices' permission or a dedicated 'purchase_orders' one
    const { showConfirm, showAlert, showError } = useDialog();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('issue_date');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadPurchaseOrders();
    }, []);

    const loadPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const data = await purchaseOrderService.getPurchaseOrders();
            setPurchaseOrders(data || []);
        } catch (error) {
            console.error('Error loading POs:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, poNumber) => {
        const confirmed = await showConfirm(`ต้องการลบใบสั่งซื้อเลขที่ ${poNumber} หรือไม่?`);
        if (confirmed) {
            try {
                await purchaseOrderService.deletePurchaseOrder(id);
                setPurchaseOrders(purchaseOrders.filter(po => po.id !== id));
            } catch (error) {
                console.error('Error deleting PO:', error);
                await showAlert('ไม่สามารถลบใบสั่งซื้อได้ อาจมีการผูกกับใบกำกับภาษีแล้ว');
            }
        }
    };

    const exportToExcel = () => {
        const filteredData = purchaseOrders.filter(po => {
            const matchSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

            const targetDate = dateFilterType === 'due_date' ? po.due_date : po.issue_date;
            const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
            const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
            const matchStatus = !statusFilter || po.status === statusFilter;
            return matchSearch && matchDateFrom && matchDateTo && matchStatus;
        });

        const dataToExport = filteredData.map(po => ({
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
    };

    // Export only a specific month's POs
    const exportMonthToExcel = (group, monthPOs) => {
        const dataToExport = monthPOs.map(po => ({
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
        XLSX.writeFile(wb, `PO_${group.replace(/ /g, '_')}.xlsx`);
    };

    const hasActiveFilters = dateFrom || dateTo;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('issue_date'); };

    const filteredPOs = purchaseOrders.filter(po => {
        const matchSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (po.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const targetDate = dateFilterType === 'due_date' ? po.due_date : po.issue_date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        return matchSearch && matchDateFrom && matchDateTo;
    });

    // Grouping by Month/Year of issue_date
    const getMonthYear = (dateString) => {
        const date = new Date(dateString);
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
    };

    const groupedPOs = filteredPOs.reduce((acc, po) => {
        const group = getMonthYear(po.issue_date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(po);
        return acc;
    }, {});

    // Sort items within each group primarily by po_number (DESC)
    Object.keys(groupedPOs).forEach(group => {
        groupedPOs[group].sort((a, b) => {
            return (b.po_number || '').localeCompare(a.po_number || '');
        });
    });

    const monthYearGroups = Object.keys(groupedPOs).sort((a, b) => {
        const dateA = Math.max(...groupedPOs[a].map(po => new Date(po.issue_date).getTime()));
        const dateB = Math.max(...groupedPOs[b].map(po => new Date(po.issue_date).getTime()));
        return dateB - dateA;
    });

    // KPI Calculations
    const kpis = React.useMemo(() => {
        const waiting = purchaseOrders.filter(po => po.status === 'Waiting').length;
        const progressing = purchaseOrders.filter(po => po.status === 'Progressing').length;
        const completed = purchaseOrders.filter(po => po.status === 'Completed').length;
        const overdue = purchaseOrders.filter(po =>
            po.status !== 'Completed' && po.status !== 'Cancelled' &&
            po.due_date && new Date(po.due_date) < new Date()
        ).length;

        return { waiting, progressing, completed, overdue };
    }, [purchaseOrders]);

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบสั่งซื้อ (Purchase Orders)"
                helpContent={HELP_CONTENT.purchaseOrders}
            >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={exportToExcel}
                        className="glass-panel"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            color: 'var(--success)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                        }}
                    >
                        <FileSpreadsheet size={18} /> Export All
                    </button>
                    {hasPermission('invoices', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/purchase-orders/new')}
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
                            <Plus size={20} /> เพิ่มใบสั่งซื้อ
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#f59e0b' }}><Clock size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รอรับออเดอร์</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b' }}>{kpis.waiting}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#3b82f6' }}><Package size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>กำลังผลิต/ส่ง</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{kpis.progressing}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#ef4444' }}><AlertTriangle size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>เกินกำหนดส่ง</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ef4444' }}>{kpis.overdue}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><CheckCircle size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>สำเร็จแล้ว</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.completed}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ PO หรือชื่อลูกค้า..."
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1rem', width: '100%', outline: 'none' }}
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

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ PO</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>วันที่ออกเอกสาร</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>ความคืบหน้า (ชิ้น)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>มูลค่าทั้งหมด</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredPOs.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                                            <td colSpan="8" style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#37477C', borderBottom: '1px solid var(--border-color)', borderTop: 'none', fontSize: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Calendar size={18} color="#3b82f6" />
                                                        <span>{group}</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{groupedPOs[group].length} รายการ</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); exportMonthToExcel(group, groupedPOs[group]); }}
                                                        title={`Export Excel เดือน${group}`}
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
                                        {groupedPOs[group].map((po) => (
                                            <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
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
                                                <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                    {po.po_number}
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem' }}>{po.customers?.name || 'ลูกค้าทั่วไป'}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{new Date(po.issue_date).toLocaleDateString('th-TH')}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        color: new Date(po.due_date) < new Date() && po.status !== 'Completed' ? 'var(--error)' : 'inherit',
                                                        fontWeight: new Date(po.due_date) < new Date() && po.status !== 'Completed' ? '600' : 'normal'
                                                    }}>
                                                        {po.due_date ? new Date(po.due_date).toLocaleDateString('th-TH') : '-'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                                        <span style={{ color: po.total_delivered_quantity >= po.total_po_quantity ? 'var(--success)' : '#3b82f6', fontWeight: '600' }}>
                                                            {po.total_delivered_quantity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                        </span>
                                                        <span style={{ color: 'var(--text-muted)' }}>/</span>
                                                        <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                                                            {po.total_po_quantity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--text-main)' }}>
                                                    ฿{po.total_po_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: po.status === 'Waiting' ? 'rgba(245, 158, 11, 0.08)' :
                                                            po.status === 'Progressing' ? 'rgba(59, 130, 246, 0.08)' :
                                                                po.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' : '#f3f4f6',
                                                        color: po.status === 'Waiting' ? '#d97706' :
                                                            po.status === 'Progressing' ? '#2563eb' :
                                                                po.status === 'Completed' ? '#059669' : '#6b7280',
                                                        border: po.status === 'Waiting' ? '1px solid rgba(245, 158, 11, 0.2)' :
                                                            po.status === 'Progressing' ? '1px solid rgba(59, 130, 246, 0.2)' :
                                                                po.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #e5e7eb'
                                                    }}>
                                                        {po.status === 'Waiting' && <Clock size={14} />}
                                                        {po.status === 'Progressing' && <Package size={14} />}
                                                        {po.status === 'Completed' && <CheckCircle size={14} />}
                                                        {po.status === 'Waiting' ? 'รอดำเนินการ' :
                                                            po.status === 'Progressing' ? 'กำลังผลิต' :
                                                                po.status === 'Completed' ? 'สำเร็จแล้ว' : po.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบรายการใบสั่งซื้อ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderListPage;
