import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, AlertTriangle, CheckCircle, ExternalLink, Users } from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { customerService } from '../../services/customerService';
import CustomLineChart from './CustomLineChart';

const POTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        totalAmount: 0,
        totalQuantity: 0,
        monthlyAmount: 0,
        monthlyQuantity: 0,
        pendingAmount: 0,
        pendingQuantity: 0,
        overdueAmount: 0,
        overdueQuantity: 0,
        deliveredQuantity: 0,
        upcomingPOs: [],
        overduePOs: [],
        amountChartData: [],
        countChartData: [],
        allCustomerNames: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [purchaseOrders, customers] = await Promise.all([
                    purchaseOrderService.getPurchaseOrders(),
                    customerService.getCustomers()
                ]);
                const customerNames = (customers || []).map(c => c.name);
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const today = new Date(now.setHours(0, 0, 0, 0));

                const monthly = (purchaseOrders || []).filter(po => {
                    const d = new Date(po.issue_date || po.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const monthlyAmount = monthly.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);

                const waiting = (purchaseOrders || []).filter(po => po.status === 'Waiting').length;
                const inProgress = (purchaseOrders || []).filter(po => po.status === 'Progressing').length;
                const completed = (purchaseOrders || []).filter(po => po.status === 'Completed').length;
                const cancelled = (purchaseOrders || []).filter(po => po.status === 'Cancelled').length;

                // Overdue POs
                const overduePOs = (purchaseOrders || [])
                    .filter(po => {
                        if (po.status === 'Completed' || po.status === 'Cancelled') return false;
                        if (!po.due_date) return false;
                        return new Date(po.due_date) < today;
                    })
                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                    .slice(0, 10);

                // Upcoming POs (within 7 days, not overdue)
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                sevenDaysFromNow.setHours(23, 59, 59, 999);

                const upcomingPOs = (purchaseOrders || [])
                    .filter(po => {
                        if (po.status === 'Completed' || po.status === 'Cancelled') return false;
                        if (!po.due_date) return false;
                        const dueDate = new Date(po.due_date);
                        return dueDate >= today && dueDate <= sevenDaysFromNow;
                    })
                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                    .slice(0, 10);

                const nonCancelled = (purchaseOrders || []).filter(po => po.status !== 'Cancelled');
                const totalAmount = nonCancelled.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);
                const totalQuantity = nonCancelled.reduce((sum, po) => sum + (Number(po.total_po_quantity) || 0), 0);

                const monthlyQuantity = monthly.reduce((sum, po) => sum + (Number(po.total_po_quantity) || 0), 0);

                const pendingPOs = (purchaseOrders || []).filter(po => po.status === 'Waiting' || po.status === 'Progressing');
                const pendingAmount = pendingPOs.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);
                const pendingQuantity = pendingPOs.reduce((sum, po) => sum + (Number(po.total_po_quantity) || 0), 0);

                const overdueList = (purchaseOrders || []).filter(po => {
                    if (po.status === 'Completed' || po.status === 'Cancelled') return false;
                    if (!po.due_date) return false;
                    return new Date(po.due_date) < today;
                });
                const overdueAmount = overdueList.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);
                const overdueQuantity = overdueList.reduce((sum, po) => sum + (Number(po.total_po_quantity) || 0), 0);

                const deliveredQuantity = nonCancelled.reduce((sum, po) => sum + (po.total_delivered_quantity || 0), 0);

                setData({
                    total: (purchaseOrders || []).length,
                    totalAmount,
                    totalQuantity,
                    monthly: monthly.length,
                    monthlyAmount,
                    monthlyQuantity,
                    pending: pendingPOs.length,
                    pendingAmount,
                    pendingQuantity,
                    waiting,
                    inProgress,
                    completed,
                    cancelled,
                    overdue: overdueList.length,
                    overdueAmount,
                    overdueQuantity,
                    deliveredQuantity,
                    upcomingPOs,
                    overduePOs,
                    rawPOs: purchaseOrders || [],
                    allCustomerNames: customerNames
                });
            } catch (error) {
                console.error('Error loading PO data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบสั่งซื้อ...</div>;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'ไม่ระบุ';
        return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const getDaysOverdue = (dateStr) => {
        if (!dateStr) return 0;
        const diff = new Date() - new Date(dateStr);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const getDaysLeft = (dateStr) => {
        if (!dateStr) return 0;
        const diff = new Date(dateStr) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const renderDateBlock = (dateStr, type) => {
        if (!dateStr) return <span className="text-textMuted">ไม่ระบุ</span>;

        const isUpcoming = type === 'upcoming';
        const days = isUpcoming ? getDaysLeft(dateStr) : getDaysOverdue(dateStr);
        const color = isUpcoming ? '#f59e0b' : '#ef4444';
        const bg = isUpcoming ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const text = isUpcoming ? `เหลือ ${days} วัน` : `เลยกำหนด ${days} วัน`;

        const dateParts = formatDate(dateStr).split(' ');
        if (dateParts.length < 3) return <span>{formatDate(dateStr)}</span>;

        const [day, month, year] = dateParts;

        return (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-main)', border: `1px solid ${color}40`, borderRadius: '6px', overflow: 'hidden', minWidth: '75px' }}>
                <div style={{ background: bg, color: color, fontSize: '0.7rem', padding: '0.2rem 0.4rem', width: '100%', textAlign: 'center', fontWeight: '600' }}>
                    {text}
                </div>
                <div style={{ padding: '0.3rem 0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1.2', textAlign: 'center' }}>
                    {day} {month}<br />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{year}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper blue">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO ทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            ฿{data.totalAmount.toLocaleString()} | {data.totalQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper green">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เดือนนี้</span>
                        <span className="kpi-value">{data.monthly.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.monthlyAmount.toLocaleString()} | {data.monthlyQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper yellow">
                        <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO รอดำเนินการ</span>
                        <span className="kpi-value">{data.pending.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.pendingAmount.toLocaleString()} | {data.pendingQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เลยกำหนดส่ง</span>
                        <span className="kpi-value alert">{data.overdue.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.overdueAmount.toLocaleString()} | {data.overdueQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ borderLeft: '4px solid #10b981', padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper green" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">สินค้า สั่ง / ส่งแล้ว</span>
                        <span className="kpi-value" style={{ fontSize: '1.2rem' }}>
                            {data.totalQuantity.toLocaleString()} / <span style={{ color: '#10b981' }}>{data.deliveredQuantity.toLocaleString()}</span>
                            <span className="unit" style={{ marginLeft: '4px' }}>ชิ้น</span>
                        </span>
                        <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.min(100, (data.deliveredQuantity / (data.totalQuantity || 1)) * 100)}%`,
                                height: '100%',
                                background: '#10b981',
                                transition: 'width 0.5s ease'
                            }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>สถานะ PO ทั้งหมด</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Waiting', count: data.waiting, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                        { label: 'Progressing', count: data.inProgress, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                        { label: 'Completed', count: data.completed, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                        { label: 'Cancelled', count: data.cancelled, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
                    ].map(s => (
                        <div key={s.label} style={{ flex: '1 1 120px', padding: '1rem', borderRadius: '10px', background: s.bg, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.count ?? 0}</div>
                            <div style={{ fontSize: '0.8rem', color: s.color, fontWeight: '500', marginTop: '0.25rem' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    ยอดรวม PO เดือนนี้: <strong style={{ color: '#3b82f6' }}>฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มใบสั่งซื้อ (PO)"
                metrics={[
                    { id: 'po_amount', label: 'ยอดสั่งซื้อ (มูลค่า)', data: data.rawPOs, dateField: 'issue_date', valueField: 'grand_total', color: '#3b82f6', valuePrefix: '฿' },
                    { id: 'po_count', label: 'จำนวนใบสั่งซื้อ (ใบ)', data: data.rawPOs, dateField: 'issue_date', valueField: null, color: '#8b5cf6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="po_amount"
                enableGroupBy={true}
                groupByData={data.rawPOs.map(po => ({ ...po, customerName: po.customers?.name || 'ไม่ระบุ' }))}
                groupByField="customerName"
                groupByDateField="issue_date"
                groupByValueField="grand_total"
                groupByPrefix="฿"
                allGroups={data.allCustomerNames}
            />

            <div className="dashboard-grid">
                {/* Upcoming POs - REDESIGNED TO MATCH REFERENCE */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '700' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem', borderRadius: '50%', display: 'flex' }}>
                                <Clock size={18} color="#10b981" />
                            </div>
                            PO ที่ต้องส่ง (ภายใน 7 วัน)
                        </h3>
                        <button onClick={() => navigate('/dashboard/purchase-orders')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>เลขที่ PO</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>ลูกค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>กำหนดส่ง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const attentionRequiredPOs = [...data.overduePOs, ...data.upcomingPOs]
                                        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                                        .slice(0, 10);

                                    return attentionRequiredPOs.map(po => {
                                        const dueDate = new Date(po.due_date);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isOverdue = dueDate < today;

                                        // Format: dd/m/yyyy (BE)
                                        const dateFormatted = `${dueDate.getDate()}/${dueDate.getMonth() + 1}/${dueDate.getFullYear() + 543}`;

                                        return (
                                            <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)} className="po-row-hover">
                                                <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '0.95rem' }}>{po.po_number}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.9rem' }}>{po.customers?.name}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600' }}>
                                                    {isOverdue ? (
                                                        <span style={{ color: '#ef4444' }}>เลยกำหนดส่ง</span>
                                                    ) : (
                                                        <span className="text-textMain">{dateFormatted}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                                {(data.upcomingPOs.length === 0 && data.overduePOs.length === 0) && (
                                    <tr><td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>ไม่มี PO ที่ต้องส่งในขณะนี้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Customers Widget - REPLACING Status Breakdown */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Users size={18} color="#3b82f6" /> ลูกค้าที่มียอดสั่งซื้อสูงสุด
                        </h3>
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        {(() => {
                            const customerTotals = data.rawPOs.reduce((acc, po) => {
                                const name = po.customers?.name || 'ไม่ระบุ';
                                acc[name] = (acc[name] || 0) + (Number(po.grand_total) || 0);
                                return acc;
                            }, {});

                            const topCustomers = Object.entries(customerTotals)
                                .map(([name, total]) => ({ name, total }))
                                .sort((a, b) => b.total - a.total)
                                .slice(0, 5);

                            return topCustomers.map((cust, idx) => (
                                <div key={cust.name} style={{ padding: '1rem 1.5rem', borderBottom: idx === topCustomers.length - 1 ? 'none' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '800', color: idx === 0 ? '#3b82f6' : 'var(--text-muted)' }}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{cust.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>ยอดสั่งซื้อรวม</div>
                                    </div>
                                    <div className="text-right">
                                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>฿{cust.total.toLocaleString()}</div>
                                    </div>
                                </div>
                            ));
                        })()}
                        {data.rawPOs.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>ไม่มีข้อมูลลูกค้า</div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .po-row-hover:hover { background: var(--bg-main) !important; }
            `}</style>
        </div>
    );
};

export default POTab;
