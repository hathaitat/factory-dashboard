import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Printer, FileSpreadsheet, Eye, Link as LinkIcon } from 'lucide-react';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { usePermissions } from '../hooks/usePermissions';
import * as XLSX from 'xlsx';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const PurchaseOrderListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions(); // We might use 'invoices' permission or a dedicated 'purchase_orders' one
    const { showConfirm, showAlert, showError } = useDialog();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
        const dataToExport = purchaseOrders.map(po => ({
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

    const filteredPOs = purchaseOrders.filter(po =>
        po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (po.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    // Create an ordered array of keys sorted by the latest PO in each group
    const monthYearGroups = Object.keys(groupedPOs).sort((a, b) => {
        const dateA = Math.max(...groupedPOs[a].map(po => new Date(po.issue_date).getTime()));
        const dateB = Math.max(...groupedPOs[b].map(po => new Date(po.issue_date).getTime()));
        return dateB - dateA;
    });

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบสั่งซื้อ (Purchase Orders)"
                helpContent={HELP_CONTENT.purchaseOrders}
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
                            fontWeight: '500'
                        }}
                    >
                        <Plus size={20} /> เพิ่มใบสั่งซื้อ
                    </button>
                )}
            </PageHeader>

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

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ PO</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>วันที่ออกเอกสาร</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>ความคืบหน้า (ชิ้น)</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>มูลค่าทั้งหมด</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูล...</td>
                            </tr>
                        ) : filteredPOs.length > 0 ? (
                            monthYearGroups.map((group) => (
                                <React.Fragment key={group}>
                                    <tr style={{ background: 'var(--bg-main)' }}>
                                        <td colSpan="8" style={{ padding: '0.8rem 1.5rem', fontWeight: '600', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', borderTop: 'none' }}>
                                            เดือน {group}
                                        </td>
                                    </tr>
                                    {groupedPOs[group].map((po) => (
                                        <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                            <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                {po.po_number}
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem' }}>{po.customers?.name || 'ลูกค้าทั่วไป'}</td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{new Date(po.issue_date).toLocaleDateString('th-TH')}</td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{
                                                    color: new Date(po.due_date) < new Date() && po.status !== 'Completed' ? 'var(--danger)' : 'inherit',
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
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap',
                                                    background: po.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' :
                                                        po.status === 'In Progress' ? 'rgba(59, 130, 246, 0.1)' :
                                                            po.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-hover)',
                                                    color: po.status === 'Pending' ? '#f59e0b' :
                                                        po.status === 'In Progress' ? 'var(--primary)' :
                                                            po.status === 'Completed' ? 'var(--success)' : 'var(--text-muted)'
                                                }}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.3rem', width: 'fit-content', marginLeft: 'auto' }}>
                                                    {po.file_url && (
                                                        <a
                                                            href={po.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="View Document File"
                                                        >
                                                            <Eye size={18} />
                                                        </a>
                                                    )}
                                                    {hasPermission('invoices', 'create') && (
                                                        <button
                                                            onClick={() => navigate('/dashboard/invoices/new', { state: { referencePoId: po.id } })}
                                                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="ออกใบกำกับภาษีเชื่อมโยง PO นี้"
                                                        >
                                                            <LinkIcon size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('invoices', 'edit') && (
                                                        <button
                                                            onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)}
                                                            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('invoices', 'delete') && (
                                                        <button
                                                            onClick={() => handleDelete(po.id, po.po_number)}
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
                                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>ไม่พบรายการใบสั่งซื้อ</td>
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
