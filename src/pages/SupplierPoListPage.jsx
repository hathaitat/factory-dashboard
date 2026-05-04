import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileSpreadsheet, Eye, Printer, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import * as XLSX from 'xlsx';

const SupplierPoListPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const [pos, setPos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadPos();
    }, []);

    const loadPos = async () => {
        setIsLoading(true);
        try {
            const data = await supplierPoService.getSupplierPos();
            setPos(data || []);
        } catch (error) {
            console.error('Error loading POs:', error);
            showError('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, poNumber) => {
        const confirmed = await showConfirm(`ต้องการลบใบสั่งซื้อเลขที่ ${poNumber} หรือไม่?`);
        if (confirmed) {
            try {
                await supplierPoService.deleteSupplierPo(id);
                setPos(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                console.error('Error deleting:', error);
                await showAlert('ไม่สามารถลบใบสั่งซื้อได้');
            }
        }
    };

    const exportToExcel = () => {
        const dataToExport = filteredPos.map(po => ({
            'เลขที่ PO': po.po_number,
            'วันที่สั่งซื้อ': po.date,
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
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Draft': return { color: 'var(--text-muted)', bg: 'var(--card-hover)', text: 'ฉบับร่าง' };
            case 'Waiting': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', text: 'รออนุมัติ' };
            case 'Approved': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', text: 'อนุมัติแล้ว' };
            case 'Completed': return { color: 'var(--primary)', bg: 'rgba(59, 130, 246, 0.1)', text: 'ได้รับสินค้าแล้ว' };
            case 'Cancelled': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: 'ยกเลิก' };
            default: return { color: 'var(--text-muted)', bg: 'var(--card-hover)', text: status };
        }
    };

    const hasActiveFilters = dateFrom || dateTo || statusFilter;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); setStatusFilter(''); };

    const filteredPos = pos.filter(po => {
        const matchSearch = (po.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (po.suppliers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const targetDate = dateFilterType === 'delivery_date' ? po.delivery_date : po.date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        const matchStatus = !statusFilter || po.status === statusFilter;
        return matchSearch && matchDateFrom && matchDateTo && matchStatus;
    });

    // Grouping by Month/Year
    const getMonthYear = (dateString) => {
        if (!dateString) return 'ไม่ระบุวันที่';
        const date = new Date(dateString);
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
    };

    const groupedPOs = filteredPos.reduce((acc, po) => {
        const group = getMonthYear(po.date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(po);
        return acc;
    }, {});

    Object.keys(groupedPOs).forEach(group => {
        groupedPOs[group].sort((a, b) => (b.po_number || '').localeCompare(a.po_number || ''));
    });

    const monthYearGroups = Object.keys(groupedPOs).sort((a, b) => {
        const dateA = Math.max(...groupedPOs[a].map(po => new Date(po.date).getTime()));
        const dateB = Math.max(...groupedPOs[b].map(po => new Date(po.date).getTime()));
        return dateB - dateA;
    });

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader title="ใบสั่งซื้อผู้ขาย (Vendor PO)">
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
                <button
                    onClick={() => navigate('/dashboard/supplier-pos/new')}
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
                    <Plus size={20} /> สร้างใบสั่งซื้อ
                </button>
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ PO หรือชื่อผู้ขาย..."
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
                            { value: 'date', label: 'วันที่สั่งซื้อ' },
                            { value: 'delivery_date', label: 'วันกำหนดส่ง' }
                        ]
                    },
                    {
                        type: 'select',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        options: [
                            { value: '', label: 'สถานะทั้งหมด' },
                            { value: 'Draft', label: 'ฉบับร่าง' },
                            { value: 'Waiting', label: 'รออนุมัติ' },
                            { value: 'Approved', label: 'อนุมัติแล้ว' },
                            { value: 'Completed', label: 'ได้รับสินค้าแล้ว' },
                            { value: 'Cancelled', label: 'ยกเลิก' }
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
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ขาย (Vendor)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>วันที่สั่งซื้อ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ยอดเงินสุทธิ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredPos.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'var(--bg-main)' }}>
                                            <td colSpan="7" style={{ padding: '0.8rem 1.5rem', fontWeight: '600', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', borderTop: 'none' }}>
                                                เดือน {group}
                                            </td>
                                        </tr>
                                        {groupedPOs[group].map((po) => {
                                            const status = getStatusConfig(po.status);
                                            return (
                                                <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/dashboard/supplier-pos/${po.id}`)}
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
                                                >
                                                    <td className="actions-column">
                                                        <div className="table-actions">
                                                            <button
                                                                className="action-view"
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}`); }}
                                                                title="ดูรายละเอียด"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button
                                                                className="action-edit"
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}/edit`); }}
                                                                title="แก้ไข"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                className="action-print"
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}/print`); }}
                                                                title="พิมพ์เอกสาร"
                                                            >
                                                                <Printer size={18} />
                                                            </button>
                                                            <button
                                                                className="action-delete"
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(po.id, po.po_number); }}
                                                                title="ลบ"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                        {po.po_number}
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem' }}>{po.suppliers?.name || '-'}</td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{po.date ? new Date(po.date).toLocaleDateString('th-TH') : '-'}</td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                        <span style={{
                                                            color: po.delivery_date && new Date(po.delivery_date) < new Date() && po.status !== 'Completed' ? 'var(--danger)' : 'inherit',
                                                            fontWeight: po.delivery_date && new Date(po.delivery_date) < new Date() && po.status !== 'Completed' ? '600' : 'normal'
                                                        }}>
                                                            {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--text-main)' }}>
                                                        ฿{(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '0.3rem 0.8rem',
                                                            borderRadius: '20px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '500',
                                                            whiteSpace: 'nowrap',
                                                            background: status.bg,
                                                            color: status.color
                                                        }}>
                                                            {status.text}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                                        ไม่พบรายการใบสั่งซื้อผู้ขาย
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierPoListPage;
