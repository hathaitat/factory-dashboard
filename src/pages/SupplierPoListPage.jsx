import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileSpreadsheet, Eye, Printer, FileText, Clock, XCircle, Calendar, ShoppingCart, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import XLSX from 'xlsx-js-style';

const SupplierPoListPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();
    const [pos, setPos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        loadPos();
    }, []);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

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
                showError(error.message || 'ไม่สามารถลบใบสั่งซื้อได้');
            }
        }
    };

    const handleCancel = async (id, poNumber) => {
        const confirmed = await showConfirm(`ยืนยันการยกเลิกใบสั่งซื้อเลขที่ ${poNumber}? \n(ระบบจะตรวจสอบสต็อกและหักสินค้าออกจากคลังคืน)`);
        if (confirmed) {
            try {
                setIsLoading(true);
                await supplierPoService.cancelSupplierPo(id);
                await showAlert('ยกเลิกใบสั่งซื้อและปรับปรุงสต็อกเรียบร้อยแล้ว');
                loadPos();
            } catch (error) {
                console.error('Error cancelling:', error);
                showError(error.message || 'ไม่สามารถยกเลิกใบสั่งซื้อได้');
            } finally {
                setIsLoading(false);
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

    const exportMonthToExcel = (group, monthPOs) => {
        const dataToExport = monthPOs.map(po => ({
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
        XLSX.writeFile(wb, `VendorPO_${group.replace(/ /g, '_')}.xlsx`);
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

    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); };

    const filteredPos = pos.filter(po => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchSearch = (po.po_number || '').toLowerCase().includes(lowerSearch) ||
            (po.suppliers?.name || '').toLowerCase().includes(lowerSearch) ||
            (po.supplier_po_items || []).some(item =>
                (item.description || '').toLowerCase().includes(lowerSearch)
            );

        const targetDate = dateFilterType === 'delivery_date' ? po.delivery_date : po.date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        return matchSearch && matchDateFrom && matchDateTo;
    });

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
        groupedPOs[group].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    const monthYearGroups = Object.keys(groupedPOs).sort((a, b) => {
        const dateA = Math.max(...groupedPOs[a].map(po => new Date(po.date).getTime()));
        const dateB = Math.max(...groupedPOs[b].map(po => new Date(po.date).getTime()));
        return dateB - dateA;
    });

    const kpis = React.useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const completed = pos.filter(p => p.status === 'Completed').length;
        const partial = pos.filter(p => p.status === 'Partial').length;
        const draft = pos.filter(p => p.status === 'Draft').length;
        const cancelled = pos.filter(p => p.status === 'Cancelled').length;

        const overdue = pos.filter(p =>
            (p.status === 'Draft' || p.status === 'Partial') &&
            p.delivery_date &&
            new Date(p.delivery_date) < now
        ).length;

        return { completed, partial, draft, cancelled, overdue };
    }, [pos]);

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader title="ใบสั่งซื้อผู้ขาย (Vendor PO)" subtitle="จัดการการจัดซื้อวัตถุดิบและอุปกรณ์">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={exportToExcel} className="glass-panel" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', color: 'var(--success)', cursor: 'pointer', borderRadius: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
                        <FileSpreadsheet size={18} /> Export All
                    </button>
                    {hasPermission('supplier_pos', 'create') && (
                        <button onClick={() => navigate('/dashboard/supplier-pos/create')} style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                            <Plus size={20} /> สร้างใบสั่งซื้อใหม่
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', border: '1px solid rgba(107, 114, 128, 0.1)', background: 'white' }}>
                    <div style={{ background: 'rgba(107, 114, 128, 0.1)', padding: '0.8rem', borderRadius: '12px', color: '#6b7280' }}><FileText size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ฉบับร่าง (Draft)</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#6b7280', lineHeight: 1 }}>{kpis.draft}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'white' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.8rem', borderRadius: '12px', color: '#f59e0b' }}><Clock size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>รับบางส่วน (Partial)</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', lineHeight: 1 }}>{kpis.partial}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'white' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px', color: '#10b981' }}><ShoppingCart size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>รับครบแล้ว (Completed)</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>{kpis.completed}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', border: '1px solid rgba(239, 68, 68, 0.1)', background: 'white' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: '#ef4444' }}><XCircle size={24} /></div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ยกเลิก (Cancelled)</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>{kpis.cancelled}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} className="text-textMuted" />
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
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!(dateFrom || dateTo)}
            />

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ width: '40px' }}></th>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ PO</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ขาย (Vendor)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>วันที่สั่งซื้อ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานที่จัดส่ง</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>ยอดเงินสุทธิ</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>การรับสินค้า</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredPos.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                                            <td colSpan="10" style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#37477C', borderBottom: '1px solid var(--border-color)', borderTop: 'none', fontSize: '1rem' }}>
                                                <div className="flex justify-between items-center">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Calendar size={18} color="#3b82f6" />
                                                        <span>เดือน {group}</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{groupedPOs[group].length} รายการ</span>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); exportMonthToExcel(group, groupedPOs[group]); }} title={`Export Excel เดือน${group}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'white', color: 'var(--success)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                        <FileSpreadsheet size={14} /> ส่งออก Excel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {groupedPOs[group].map((po) => {
                                            const status = getStatusConfig(po.status);
                                            const isExpanded = expandedRows.has(po.id);
                                            return (
                                                <React.Fragment key={po.id}>
                                                    <tr
                                                        style={{ borderBottom: '1px solid var(--border-color)', background: isExpanded ? 'rgba(59, 130, 246, 0.02)' : 'var(--card-bg)', cursor: 'pointer' }}
                                                        onClick={() => toggleRow(po.id)}
                                                    >
                                                        <td className="text-center">
                                                            {isExpanded ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
                                                        </td>
                                                        <td className="actions-column">
                                                            <div className="table-actions">
                                                                <button onClick={(e) => { e.stopPropagation(); window.open(`/dashboard/supplier-pos/${po.id}`, '_blank'); }} className="action-view" title="ดูรายละเอียด"><Eye size={18} /></button>
                                                                {hasPermission('supplier_pos', 'edit') && (po.status === 'Draft' || po.status === 'Partial') && (
                                                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}/edit`); }} className="action-edit" title="แก้ไข"><Edit size={18} /></button>
                                                                )}
                                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/create?duplicate=${po.id}`); }} className="action-edit" style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.05)' }} title="คัดลอกรายการ"><Copy size={18} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); window.open(`/dashboard/supplier-pos/${po.id}/print`, '_blank'); }} className="action-print" title="พิมพ์เอกสาร"><Printer size={18} /></button>
                                                                {hasPermission('supplier_pos', 'delete') && (po.status === 'Draft') && (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(po.id, po.po_number); }} className="action-delete" title="ลบ"><Trash2 size={18} /></button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/supplier-pos/${po.id}`); }} style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontFamily: 'monospace' }}>{po.po_number}</td>
                                                        <td style={{ padding: '1.2rem 1.5rem' }}>{po.suppliers?.name || '-'}</td>
                                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{po.date ? new Date(po.date).toLocaleDateString('th-TH') : '-'}</td>
                                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>{po.warehouses?.name || '-'}</td>
                                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                            <span style={{ color: po.delivery_date && new Date(po.delivery_date) < new Date() && po.status !== 'Completed' ? 'var(--error)' : 'inherit' }}>
                                                                {po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                                                            ฿{po.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            {(() => {
                                                                const totalQty = po.supplier_po_items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
                                                                const receivedQty = po.supplier_po_items?.reduce((sum, item) => sum + Number(item.received_quantity || 0), 0) || 0;
                                                                const percent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

                                                                return (
                                                                    <div style={{ fontSize: '1rem', fontWeight: '700', color: percent === 100 ? '#10b981' : (percent > 0 ? '#f59e0b' : 'var(--text-muted)') }}>
                                                                        {receivedQty.toLocaleString()} / {totalQty.toLocaleString()}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <span style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', background: status.bg, color: status.color, border: `1px solid ${status.color}22`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {status.icon} {status.text}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr style={{ background: 'rgba(59, 130, 246, 0.01)' }}>
                                                            <td></td>
                                                            <td colSpan="9" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                                                <div className="glass-panel mt-3" style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                                                                <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>รายการสินค้า</th>
                                                                                <th style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>จำนวน</th>
                                                                                <th style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>ราคา/หน่วย</th>
                                                                                <th style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>จำนวนเงิน</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {po.supplier_po_items?.map((item, idx) => (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                                                    <td style={{ padding: '0.5rem' }}>
                                                                                        <div className="font-medium">{item.description}</div>
                                                                                        {item.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.note}</div>}
                                                                                    </td>
                                                                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.quantity.toLocaleString()} {item.unit}</td>
                                                                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>฿{(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>฿{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                                        })}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                        <div>ไม่พบรายการใบสั่งซื้อผู้ขาย</div>
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
