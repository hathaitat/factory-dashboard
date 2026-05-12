import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { quotationService } from '../../services/quotationService';
import CustomLineChart from './CustomLineChart';

const QuotationTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        monthly: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        winRate: 0,
        monthlyAmount: 0,
        recentQuotations: [],
        amountChartData: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const quotations = await quotationService.getQuotations();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const monthly = (quotations || []).filter(qt => {
                    const d = new Date(qt.date || qt.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const monthlyAmount = monthly.reduce((sum, qt) => sum + (Number(qt.grandTotal) || 0), 0);

                const approved = (quotations || []).filter(qt => qt.status === 'Approved').length;
                const rejected = (quotations || []).filter(qt => qt.status === 'Rejected').length;
                const draft = (quotations || []).filter(qt => qt.status === 'Draft').length;
                const sent = (quotations || []).filter(qt => qt.status === 'Sent').length;

                const decided = approved + rejected;
                const winRate = decided > 0 ? ((approved / decided) * 100).toFixed(1) : 0;

                setData({
                    total: (quotations || []).length,
                    monthly: monthly.length,
                    approved,
                    rejected,
                    draft,
                    sent,
                    winRate,
                    monthlyAmount,
                    recentQuotations: (quotations || []).slice(0, 5),
                    rawQuotations: quotations || []
                });
            } catch (error) {
                console.error('Error loading quotation data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบเสนอราคา...</div>;
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Approved': return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'Rejected': return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
            case 'Sent': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
            default: return { background: 'var(--card-hover)', color: 'var(--text-muted)' };
        }
    };

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper blue">
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ใบเสนอราคาทั้งหมด</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                มูลค่ารวม ฿{data.rawQuotations.reduce((sum, qt) => sum + (qt.status !== 'Rejected' ? Number(qt.grandTotal) || 0 : 0), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">เดือนนี้</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.monthly.toLocaleString()} <span className="unit">ใบ</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                ยอดรวม ฿{data.monthlyAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <CheckCircle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Approved</span>
                        <span className="kpi-value">{data.approved.toLocaleString()} <span className="unit">ใบ</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper red">
                        <XCircle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Rejected</span>
                        <span className="kpi-value">{data.rejected.toLocaleString()} <span className="unit">ใบ</span></span>
                    </div>
                </div>
            </div>

            {/* Win Rate + Monthly Total */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <TrendingUp size={18} color="#10b981" />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>อัตราการได้งาน (Win Rate)</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: Number(data.winRate) >= 50 ? '#10b981' : '#f59e0b' }}>
                        {data.winRate}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        จาก {data.approved + data.rejected} ใบที่ตัดสินใจแล้ว
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ยอดรวมใบเสนอราคาเดือนนี้</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                        ฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginTop: '0.8rem' }}>
                        {[
                            { label: 'Draft', count: data.draft, color: '#6b7280' },
                            { label: 'Sent', count: data.sent, color: '#3b82f6' },
                            { label: 'Approved', count: data.approved, color: '#10b981' },
                            { label: 'Rejected', count: data.rejected, color: '#ef4444' }
                        ].map(s => (
                            <div key={s.label} style={{ fontSize: '0.75rem', color: s.color }}>
                                <span className="font-semibold">{s.count}</span> {s.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <CustomLineChart 
                title="แนวโน้มใบเสนอราคา (Quotation)"
                metrics={[
                    { id: 'quotation_amount', label: 'ยอดเสนอราคา (มูลค่า)', data: data.rawQuotations, dateField: 'date', valueField: 'grandTotal', color: '#f59e0b', valuePrefix: '฿' },
                    { id: 'quotation_count', label: 'จำนวนใบเสนอราคา (ใบ)', data: data.rawQuotations, dateField: 'date', valueField: null, color: '#8b5cf6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="quotation_amount"
                enableGroupBy={true}
                groupByData={data.rawQuotations}
                groupByField="customerName"
                groupByDateField="date"
                groupByValueField="grandTotal"
                groupByPrefix="฿"
            />

            {/* Recent Quotations */}
            <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
                <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} /> ใบเสนอราคาล่าสุด
                    </h3>
                    <button onClick={() => navigate('/dashboard/quotations')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
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
                            {data.recentQuotations.map(qt => (
                                <tr key={qt.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/quotations/${qt.id}`)} className="hover-row">
                                    <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500', color: '#3b82f6' }}>{qt.quotationNo}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', color: 'var(--text-main)' }}>{qt.customerName}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>฿{qt.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', ...getStatusStyle(qt.status) }}>{qt.status}</span>
                                    </td>
                                </tr>
                            ))}
                            {data.recentQuotations.length === 0 && (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีใบเสนอราคา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default QuotationTab;
