import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { supabase } from '../../services/supabaseClient';
import CustomLineChart from './CustomLineChart';

const InvoiceTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        totalAmount: 0,
        totalQuantity: 0,
        monthlyCount: 0,
        monthlySales: 0,
        monthlyQuantity: 0,
        draft: 0,
        pending: 0,
        paid: 0,
        cancelled: 0,
        totalPendingAmount: 0,
        pendingQuantity: 0,
        pendingByCustomer: [],
        recentInvoices: [],
        rawInvoices: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const invoices = await invoiceService.getInvoices();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const { data: allItems } = await supabase.from('invoice_items').select('invoice_id, quantity');
                const itemsMap = (allItems || []).reduce((acc, item) => {
                    if (!acc[item.invoice_id]) acc[item.invoice_id] = 0;
                    acc[item.invoice_id] += Number(item.quantity) || 0;
                    return acc;
                }, {});

                const getTotalQuantity = (list) => list.reduce((sum, inv) => sum + (itemsMap[inv.id] || 0), 0);

                const monthlyList = (invoices || []).filter(inv => {
                    const d = new Date(inv.date || inv.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const monthlyCount = monthlyList.length;
                const monthlySales = monthlyList.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
                const monthlyQuantity = getTotalQuantity(monthlyList);

                const draft = (invoices || []).filter(inv => inv.status === 'Draft').length;
                const pending = (invoices || []).filter(inv => inv.status === 'Pending').length;
                const paid = (invoices || []).filter(inv => inv.status === 'Paid').length;
                const cancelled = (invoices || []).filter(inv => inv.status === 'Cancelled').length;

                // Pending billing by customer
                const pendingByCustomerMap = (invoices || [])
                    .filter(inv => inv.status === 'Draft' || inv.status === 'Pending')
                    .reduce((acc, inv) => {
                        const name = inv.customerName;
                        if (!acc[name]) acc[name] = { name, total: 0, count: 0, unbilledCount: 0, billedCount: 0 };
                        acc[name].total += Number(inv.grandTotal) || 0;
                        acc[name].count += 1;
                        if (inv.status === 'Draft') acc[name].unbilledCount += 1;
                        if (inv.status === 'Pending') acc[name].billedCount += 1;
                        return acc;
                    }, {});

                const pendingByCustomer = Object.values(pendingByCustomerMap).sort((a, b) => b.total - a.total);
                const totalPendingAmount = pendingByCustomer.reduce((sum, item) => sum + item.total, 0);
                
                const pendingList = (invoices || []).filter(inv => inv.status === 'Draft' || inv.status === 'Pending');
                const pendingQuantity = getTotalQuantity(pendingList);

                const nonCancelled = (invoices || []).filter(inv => inv.status !== 'Cancelled');
                const totalAmount = nonCancelled.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
                const totalQuantity = getTotalQuantity(nonCancelled);

                setData({
                    total: (invoices || []).length,
                    totalAmount,
                    totalQuantity,
                    monthlyCount,
                    monthlySales,
                    monthlyQuantity,
                    draft,
                    pending,
                    paid,
                    cancelled,
                    totalPendingAmount,
                    pendingQuantity,
                    pendingByCustomer,
                    recentInvoices: (invoices || []).slice(0, 10),
                    rawInvoices: invoices || []
                });
            } catch (error) {
                console.error('Error loading invoice data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบกำกับภาษี...</div>;
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'Pending': return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
            case 'Cancelled': return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' };
            default: return { background: 'var(--card-hover)', color: 'var(--text-muted)' };
        }
    };

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper blue">
                        <FileText size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Invoice ทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            ฿{data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.totalQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper green">
                        <DollarSign size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดขายเดือนนี้</span>
                        <span className="kpi-value">{data.monthlyCount.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.monthlySales.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.monthlyQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper yellow">
                        <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ค้างวางบิล</span>
                        <span className="kpi-value">{(data.draft + data.pending).toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.pendingQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>สถานะ Invoice ทั้งหมด</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Draft', count: data.draft, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
                        { label: 'Sent', count: data.pending, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                        { label: 'Paid', count: data.paid, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                        { label: 'Cancelled', count: data.cancelled, color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' }
                    ].map(s => (
                        <div key={s.label} style={{ flex: '1 1 120px', padding: '1rem', borderRadius: '10px', background: s.bg, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.count}</div>
                            <div style={{ fontSize: '0.8rem', color: s.color, fontWeight: '500', marginTop: '0.25rem' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <CustomLineChart 
                title="แนวโน้มยอดขาย (Invoice)"
                metrics={[
                    { id: 'sales', label: 'ยอดขาย (มูลค่า)', data: data.rawInvoices, dateField: 'date', valueField: 'grandTotal', color: '#10b981', valuePrefix: '฿' },
                    { id: 'invoice_count', label: 'จำนวนใบกำกับภาษี (ใบ)', data: data.rawInvoices, dateField: 'date', valueField: null, color: '#8b5cf6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="sales"
                enableGroupBy={true}
                groupByData={data.rawInvoices}
                groupByField="customerName"
                groupByDateField="date"
                groupByValueField="grandTotal"
                groupByPrefix="฿"
            />

            <div className="dashboard-grid">
                {/* Recent Invoices */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> Invoice ล่าสุด
                        </h3>
                        <button onClick={() => navigate('/dashboard/invoices')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>เลขที่</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ลูกค้า</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>จำนวนเงิน</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentInvoices.map(inv => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/invoices/${inv.id}`)} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500', color: '#10b981' }}>{inv.invoiceNo}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', color: 'var(--text-main)' }}>{inv.customerName}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', ...getStatusStyle(inv.status) }}>
                                                {inv.status === 'Pending' ? 'Sent' : inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.recentInvoices.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีใบกำกับภาษี</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending by Customer */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.05)' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} /> ยอดค้างวางบิลทั้งหมด
                            </h3>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f59e0b', marginTop: '0.4rem' }}>
                                ฿{data.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.pendingByCustomer.map((item, index) => (
                            <div key={index} style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} className="hover-row">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.name}</span>
                                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>฿{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>รวม {item.count} รายการค้างวางบิล</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {item.billedCount > 0 && <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>สร้างบิลแล้ว {item.billedCount}</span>}
                                            {item.unbilledCount > 0 && <span style={{ color: '#6b7280', background: 'rgba(107, 114, 128, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>ยังไม่สร้าง {item.unbilledCount}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/dashboard/billing-notes/new', { state: { preselectCustomerName: item.name } }); }}
                                        style={{ background: 'rgba(245, 158, 11, 0.1)', border: 'none', color: '#f59e0b', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', height: 'fit-content' }}
                                    >
                                        วางบิลเลย
                                    </button>
                                </div>
                            </div>
                        ))}
                        {data.pendingByCustomer.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={32} />
                                <span>ไม่มีรายการค้างวางบิล 👍</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default InvoiceTab;
