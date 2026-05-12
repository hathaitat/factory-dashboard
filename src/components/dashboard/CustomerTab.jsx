import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, ExternalLink } from 'lucide-react';
import { customerService } from '../../services/customerService';
import { invoiceService } from '../../services/invoiceService';
import { certificateService } from '../../services/certificateService';
import CustomLineChart from './CustomLineChart';

const CustomerTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        active: 0,
        newThisMonth: 0,
        purchasedThisMonth: 0,
        topCustomers: [],
        expiringCertificates: [],
        rawInvoices: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [customers, topCustomers, expiringCerts, invoices] = await Promise.all([
                    customerService.getCustomers(),
                    invoiceService.getTopCustomers(10),
                    certificateService.getExpiringCertificates(30),
                    invoiceService.getInvoices()
                ]);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const active = (customers || []).filter(c => c.status === 'Active').length;
                const newThisMonth = (customers || []).filter(c => {
                    const d = new Date(c.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                }).length;

                const purchasedInvoices = (invoices || []).filter(inv => {
                    const d = new Date(inv.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && inv.status !== 'Cancelled';
                });

                const purchasedThisMonth = [...new Set(purchasedInvoices.map(inv => inv.customerId || inv.customerName))].length;
                const monthlyPurchasedAmount = purchasedInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);

                setData({
                    total: (customers || []).length,
                    active,
                    newThisMonth,
                    purchasedThisMonth,
                    monthlyPurchasedAmount,
                    topCustomers: topCustomers || [],
                    expiringCertificates: (expiringCerts || []).slice(0, 10),
                    rawInvoices: invoices || []
                });
            } catch (error) {
                console.error('Error loading customer data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลลูกค้า...</div>;
    }

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel cursor-pointer" onClick={() => navigate('/dashboard/customers')}>
                    <div className="kpi-icon-wrapper blue">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลูกค้าทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ราย</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Active</span>
                        <span className="kpi-value">{data.active.toLocaleString()} <span className="unit">ราย</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper yellow">
                        <UserPlus size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลูกค้าใหม่เดือนนี้</span>
                        <span className="kpi-value">{data.newThisMonth.toLocaleString()} <span className="unit">ราย</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper purple">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลูกค้าที่ซื้อเดือนนี้</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.purchasedThisMonth.toLocaleString()} <span className="unit">ราย</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                ฿{data.monthlyPurchasedAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มยอดสั่งซื้อจากลูกค้า (Invoice)"
                metrics={[
                    { id: 'customer_sales', label: 'ยอดสั่งซื้อรวม (มูลค่า)', data: data.rawInvoices, dateField: 'date', valueField: 'grandTotal', color: '#8b5cf6', valuePrefix: '฿' },
                    { id: 'customer_orders', label: 'จำนวนคำสั่งซื้อ (ใบ)', data: data.rawInvoices, dateField: 'date', valueField: null, color: '#3b82f6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="customer_sales"
                enableGroupBy={true}
                groupByData={data.rawInvoices}
                groupByField="customerName"
                groupByDateField="date"
                groupByValueField="grandTotal"
                groupByPrefix="฿"
            />

            <div className="dashboard-grid">
                {/* Top 10 Customers */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={16} /> ลูกค้ายอดสูงสุด Top 10
                        </h3>
                        <button onClick={() => navigate('/dashboard/customers')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', width: '40px' }}>#</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ลูกค้า</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ยอดซื้อรวม</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>จำนวน / ปริมาณ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topCustomers.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: index < 3 ? 'rgba(139, 92, 246, 0.1)' : 'var(--card-hover)', color: index < 3 ? '#8b5cf6' : 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700' }}>{index + 1}</div>
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', fontWeight: '600', color: 'var(--text-main)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500', color: '#8b5cf6' }}>฿{item.totalAmount.toLocaleString()}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.orderCount} ใบ</div>
                                            <div style={{ fontSize: '0.75rem' }}>{item.totalQuantity.toLocaleString()} หน่วย</div>
                                        </td>
                                    </tr>
                                ))}
                                {data.topCustomers.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default CustomerTab;
