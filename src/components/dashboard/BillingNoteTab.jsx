import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { billingNoteService } from '../../services/billingNoteService';
import { supabase } from '../../services/supabaseClient';
import CustomLineChart from './CustomLineChart';

const BillingNoteTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        totalAmount: 0,
        totalQuantity: 0,
        monthly: 0,
        monthlyAmount: 0,
        monthlyQuantity: 0,
        draft: 0,
        pending: 0,
        paid: 0,
        paidAmount: 0,
        paidQuantity: 0,
        totalPendingAmount: 0,
        pendingQuantity: 0,
        pendingByCustomer: [],
        recentBillingNotes: [],
        rawBillingNotes: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const billingNotes = await billingNoteService.getBillingNotes();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Fetch items to calculate quantities
                const { data: allBNItems } = await supabase.from('billing_note_items').select('billing_note_id, invoice_id');
                const { data: allInvItems } = await supabase.from('invoice_items').select('invoice_id, quantity');

                const invQuantityMap = (allInvItems || []).reduce((acc, item) => {
                    if (!acc[item.invoice_id]) acc[item.invoice_id] = 0;
                    acc[item.invoice_id] += Number(item.quantity) || 0;
                    return acc;
                }, {});

                const bnQuantityMap = (allBNItems || []).reduce((acc, item) => {
                    if (!acc[item.billing_note_id]) acc[item.billing_note_id] = 0;
                    acc[item.billing_note_id] += invQuantityMap[item.invoice_id] || 0;
                    return acc;
                }, {});

                const getTotalQuantity = (list) => list.reduce((sum, bn) => sum + (bnQuantityMap[bn.id] || 0), 0);

                const monthlyList = (billingNotes || []).filter(bn => {
                    const d = new Date(bn.date || bn.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const monthlyCount = monthlyList.length;
                const monthlyAmount = monthlyList.reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);
                const monthlyQuantity = getTotalQuantity(monthlyList);

                const draft = (billingNotes || []).filter(bn => bn.status === 'Draft').length;
                const pending = (billingNotes || []).filter(bn => bn.status === 'Pending').length;
                const paid = (billingNotes || []).filter(bn => bn.status === 'Paid').length;

                // Pending by customer
                const pendingByCustomerMap = (billingNotes || [])
                    .filter(bn => bn.status === 'Draft' || bn.status === 'Pending')
                    .reduce((acc, bn) => {
                        const name = bn.customerName;
                        if (!acc[name]) acc[name] = { name, total: 0, count: 0, unbilledCount: 0, billedCount: 0 };
                        acc[name].total += Number(bn.totalAmount) || 0;
                        acc[name].count += 1;
                        if (bn.status === 'Draft') acc[name].unbilledCount += 1;
                        if (bn.status === 'Pending') acc[name].billedCount += 1;
                        return acc;
                    }, {});

                const pendingByCustomer = Object.values(pendingByCustomerMap).sort((a, b) => b.total - a.total);
                const totalPendingAmount = pendingByCustomer.reduce((sum, item) => sum + item.total, 0);

                const pendingList = (billingNotes || []).filter(bn => bn.status === 'Draft' || bn.status === 'Pending');
                const pendingQuantity = getTotalQuantity(pendingList);

                const totalAmount = (billingNotes || []).reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);
                const totalQuantity = getTotalQuantity(billingNotes || []);

                const paidList = (billingNotes || []).filter(bn => bn.status === 'Paid');
                const paidAmount = paidList.reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);
                const paidQuantity = getTotalQuantity(paidList);

                setData({
                    total: (billingNotes || []).length,
                    totalAmount,
                    totalQuantity,
                    monthly: monthlyCount,
                    monthlyAmount,
                    monthlyQuantity,
                    draft,
                    pending,
                    paid,
                    paidAmount,
                    paidQuantity,
                    totalPendingAmount,
                    pendingQuantity,
                    pendingByCustomer,
                    recentBillingNotes: (billingNotes || []).slice(0, 5),
                    rawBillingNotes: billingNotes || []
                });
            } catch (error) {
                console.error('Error loading billing note data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบวางบิล...</div>;
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'Pending': return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
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
                        <span className="kpi-label">ใบวางบิลทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            ฿{data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.totalQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper green">
                        <FileText size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">เดือนนี้</span>
                        <span className="kpi-value">{data.monthly.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.monthlyQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper yellow">
                        <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ค้างเก็บเงิน</span>
                        <span className="kpi-value">{(data.draft + data.pending).toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.pendingQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ padding: '1rem 1.5rem' }}>
                    <div className="kpi-icon-wrapper green">
                        <CheckCircle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">เก็บเงินแล้ว (Paid)</span>
                        <span className="kpi-value">{data.paid.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>
                            ฿{data.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} | {data.paidQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown + Total Pending */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>สถานะใบวางบิล</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Draft', count: data.draft, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
                            { label: 'Pending', count: data.pending, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                            { label: 'Paid', count: data.paid, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
                        ].map(s => (
                            <div key={s.label} style={{ flex: '1 1 80px', padding: '1rem', borderRadius: '10px', background: s.bg, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.count}</div>
                                <div style={{ fontSize: '0.8rem', color: s.color, fontWeight: '500', marginTop: '0.25rem' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.5rem' }}>ยอดค้างเก็บเงินทั้งหมด</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#f59e0b' }}>
                        ฿{data.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มใบวางบิล (Billing Note)"
                metrics={[
                    { id: 'billing_amount', label: 'ยอดวางบิล (มูลค่า)', data: data.rawBillingNotes, dateField: 'date', valueField: 'totalAmount', color: '#f59e0b', valuePrefix: '฿' },
                    { id: 'billing_count', label: 'จำนวนใบวางบิล (ใบ)', data: data.rawBillingNotes, dateField: 'date', valueField: null, color: '#8b5cf6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="billing_amount"
                enableGroupBy={true}
                groupByData={data.rawBillingNotes}
                groupByField="customerName"
                groupByDateField="date"
                groupByValueField="totalAmount"
                groupByPrefix="฿"
            />

            <div className="dashboard-grid">
                {/* Recent Billing Notes */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> ใบวางบิลล่าสุด
                        </h3>
                        <button onClick={() => navigate('/dashboard/billing-notes')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>เลขที่</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ลูกค้า</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ยอดรวม</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentBillingNotes.map(bn => (
                                    <tr key={bn.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/billing-notes/${bn.id}`)} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500', color: '#3b82f6' }}>{bn.billingNoteNo}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', color: 'var(--text-main)' }}>{bn.customerName}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', ...getStatusStyle(bn.status) }}>{bn.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {data.recentBillingNotes.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีใบวางบิล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending by Customer */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(245, 158, 11, 0.05)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={16} /> ค้างเก็บเงินแยกตามลูกค้า
                        </h3>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.pendingByCustomer.map((item, index) => (
                            <div key={index} style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover-row">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                        <span style={{ fontWeight: '600', color: '#f59e0b' }}>฿{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รวม {item.count} ใบ</div>
                                        {item.billedCount > 0 && <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>รอเก็บเงิน {item.billedCount}</span>}
                                        {item.unbilledCount > 0 && <span style={{ color: '#6b7280', background: 'rgba(107, 114, 128, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>ยังไม่ส่ง {item.unbilledCount}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {data.pendingByCustomer.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={32} />
                                <span>ไม่มีรายการค้างเก็บเงิน 👍</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default BillingNoteTab;
