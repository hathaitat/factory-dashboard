import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { billingNoteService } from '../../services/billingNoteService';
import CustomLineChart from './CustomLineChart';

const ReceiptTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        monthlyAmount: 0,
        prevMonthAmount: 0,
        trend: 0,
        recentReceipts: [],
        collectionChartData: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // Receipts are derived from billing notes with status = 'Paid'
                const billingNotes = await billingNoteService.getBillingNotes();
                const paidNotes = (billingNotes || []).filter(bn => bn.status === 'Paid');

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

                const monthlyAmount = paidNotes
                    .filter(bn => {
                        const d = new Date(bn.date || bn.createdAt);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);

                const prevMonthAmount = paidNotes
                    .filter(bn => {
                        const d = new Date(bn.date || bn.createdAt);
                        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
                    })
                    .reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);

                const trend = prevMonthAmount > 0 ? (((monthlyAmount - prevMonthAmount) / prevMonthAmount) * 100).toFixed(1) : 0;

                setData({
                    total: paidNotes.length,
                    monthlyAmount,
                    prevMonthAmount,
                    trend,
                    recentReceipts: paidNotes.slice(0, 10),
                    rawReceipts: paidNotes
                });
            } catch (error) {
                console.error('Error loading receipt data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบเสร็จรับเงิน...</div>;
    }

    const now = new Date();
    const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleDateString('th-TH', { month: 'long' });
    const currentMonthName = now.toLocaleDateString('th-TH', { month: 'long' });

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper blue">
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ใบเสร็จทั้งหมด</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                ยอดสะสม ฿{data.rawReceipts.reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดเก็บเงินเดือนนี้</span>
                        <span className="kpi-value">฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper yellow">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดเก็บเงินเดือนก่อน</span>
                        <span className="kpi-value">฿{data.prevMonthAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Trend Comparison */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    เปรียบเทียบยอดเก็บเงิน: {currentMonthName} vs {prevMonthName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: Number(data.trend) >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {Number(data.trend) >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                        {Number(data.trend) >= 0 ? '+' : ''}{data.trend}%
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentMonthName}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10b981' }}>฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prevMonthName}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#6b7280' }}>฿{data.prevMonthAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>
            </div>

            <CustomLineChart 
                title="แนวโน้มใบเสร็จรับเงิน"
                metrics={[
                    { id: 'receipt_amount', label: 'ยอดเก็บเงิน (มูลค่า)', data: data.rawReceipts, dateField: 'date', valueField: 'totalAmount', color: '#10b981', valuePrefix: '฿' },
                    { id: 'receipt_count', label: 'จำนวนใบเสร็จ (ใบ)', data: data.rawReceipts, dateField: 'date', valueField: null, color: '#8b5cf6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="receipt_amount"
                enableGroupBy={true}
                groupByData={data.rawReceipts}
                groupByField="customerName"
                groupByDateField="date"
                groupByValueField="totalAmount"
                groupByPrefix="฿"
            />

            {/* Recent Receipts */}
            <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '450px' }}>
                <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} /> ใบเสร็จล่าสุด
                    </h3>
                    <button onClick={() => navigate('/dashboard/receipts')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                        ดูทั้งหมด <ExternalLink size={14} />
                    </button>
                </div>
                <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>เลขที่</th>
                                <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ลูกค้า</th>
                                <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ยอดเงิน</th>
                                <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>วันที่</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentReceipts.map(bn => (
                                <tr key={bn.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/receipts/${bn.id}`)} className="hover-row">
                                    <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500', color: '#10b981' }}>{bn.billingNoteNo}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', color: 'var(--text-main)' }}>{bn.customerName}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {new Date(bn.date || bn.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                            {data.recentReceipts.length === 0 && (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีใบเสร็จรับเงิน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default ReceiptTab;
