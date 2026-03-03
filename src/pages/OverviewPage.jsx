import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, FileText, Clock, ExternalLink } from 'lucide-react';
import { customerService } from '../services/customerService';
import { invoiceService } from '../services/invoiceService';
import { billingNoteService } from '../services/billingNoteService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import '../styles/OverviewPage.css';

const OverviewPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalCustomers: 0,
        monthlySales: 0,
        monthlyBilling: 0,
        pendingInvoices: 0
    });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [recentBillingNotes, setRecentBillingNotes] = useState([]);
    const [duePurchaseOrders, setDuePurchaseOrders] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const [customers, invoices, billingNotes, purchaseOrders] = await Promise.all([
                    customerService.getCustomers(),
                    invoiceService.getInvoices(),
                    billingNoteService.getBillingNotes(),
                    purchaseOrderService.getPurchaseOrders()
                ]);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // 1. Total Customers
                const totalCustomers = (customers || []).length;

                // 2. Monthly Sales (Invoices this month)
                const monthlySales = (invoices || [])
                    .filter(inv => {
                        const invDate = new Date(inv.date || inv.createdAt);
                        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);

                // 3. Monthly Billing (Billing Notes this month)
                const monthlyBilling = (billingNotes || [])
                    .filter(bn => {
                        const bnDate = new Date(bn.date);
                        return bnDate.getMonth() === currentMonth && bnDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);

                // 4. Pending Invoices
                const pendingInvoices = (invoices || []).filter(inv => inv.status === 'Draft' || inv.status === 'Pending').length;

                setMetrics({
                    totalCustomers,
                    monthlySales,
                    monthlyBilling,
                    pendingInvoices
                });

                // Recent data (Last 5)
                setRecentInvoices((invoices || []).slice(0, 5));
                setRecentBillingNotes((billingNotes || []).slice(0, 5));

                // Due Purchase Orders
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const threeDaysFromNow = new Date(today);
                threeDaysFromNow.setDate(today.getDate() + 3);

                const upcomingPOs = (purchaseOrders || [])
                    .filter(po => {
                        if (po.status === 'Completed' || po.status === 'Cancelled') return false;
                        if (!po.dueDate) return false;
                        const dueDate = new Date(po.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate <= threeDaysFromNow;
                    })
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5);
                setDuePurchaseOrders(upcomingPOs);

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (isLoading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูลภาพรวม...</div>;
    }

    return (
        <div className="overview-container">
            <div className="overview-header">
                <h2 className="page-title">ภาพรวมระบบ (Dashboard)</h2>
                <div className="status-badge live">
                    <span className="pulse-dot"></span>
                    ข้อมูลอัพเดทล่าสุด
                </div>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/customers')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper blue">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลูกค้าทั้งหมด</span>
                        <span className="kpi-value">{metrics.totalCustomers.toLocaleString()} <span className="unit">ราย</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/invoices')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper green">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดขายเดือนนี้</span>
                        <span className="kpi-value">฿{metrics.monthlySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/billing-notes')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper yellow">
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดวางบิลเดือนนี้</span>
                        <span className="kpi-value">฿{metrics.monthlyBilling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/invoices')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper red">
                        <Clock size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ใบกำกับที่รอดำเนินการ</span>
                        <span className="kpi-value alert" style={{ color: metrics.pendingInvoices > 0 ? '#f87171' : 'var(--text-main)' }}>
                            {metrics.pendingInvoices} <span className="unit">รายการ</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="glass-panel main-chart-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} /> ใบกำกับภาษีล่าสุด
                        </h3>
                        <button onClick={() => navigate('/dashboard/invoices')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ลูกค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงิน</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map(inv => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => navigate(`/dashboard/invoices/${inv.id}`)} className="hover-row">
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#10b981' }}>{inv.invoiceNo}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{inv.customerName}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--text-main)' }}>฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                background: inv.status === 'Draft' ? 'var(--card-hover)' : 'rgba(16, 185, 129, 0.1)',
                                                color: inv.status === 'Draft' ? 'var(--text-muted)' : 'var(--success)'
                                            }}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลใบกำกับภาษี</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel side-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} /> ใบวางบิลล่าสุด
                        </h3>
                        <button onClick={() => navigate('/dashboard/billing-notes')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {recentBillingNotes.map(bn => (
                            <div key={bn.id} onClick={() => navigate(`/dashboard/billing-notes/${bn.id}`)} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', color: '#3b82f6' }}>{bn.billingNoteNo}</span>
                                    <span style={{ fontWeight: '500', color: 'var(--success)' }}>฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{bn.customerName}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{new Date(bn.date).toLocaleDateString('th-TH')}</span>
                                </div>
                            </div>
                        ))}
                        {recentBillingNotes.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                ยังไม่มีข้อมูลใบวางบิล
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PO Due Deliveries */}
            <div className="glass-panel" style={{ marginTop: '1.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} /> ใบสั่งซื้อ (PO) กำหนดส่งสินค้า
                    </h3>
                    <button onClick={() => navigate('/dashboard/purchase-orders')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                        ดูทั้งหมด <ExternalLink size={14} />
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ PO</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ลูกค้า</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {duePurchaseOrders.map(po => {
                                const dueDate = new Date(po.dueDate);
                                const isOverdue = dueDate < new Date(new Date().setHours(0, 0, 0, 0));
                                const isToday = dueDate.getTime() === new Date(new Date().setHours(0, 0, 0, 0)).getTime();

                                return (
                                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)} className="hover-row">
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#3b82f6' }}>{po.poNumber}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{po.customer?.name}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '500', color: isOverdue ? 'var(--error)' : isToday ? 'var(--warning)' : 'var(--text-main)' }}>
                                            {isOverdue ? 'เลยกำหนดส่ง' : isToday ? 'กำหนดส่งวันนี้' : dueDate.toLocaleDateString('th-TH')}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                background: po.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: po.status === 'Pending' ? '#f59e0b' : 'var(--primary)'
                                            }}>
                                                {po.status}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {duePurchaseOrders.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ไม่มีรายการ PO กำหนดส่งสินค้าเร็วๆ นี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Adding a small inline style for hover effect since we can't easily edit the CSS file right now */}
            <style>{`
                .hover-row:hover {
                    background: var(--bg-main) !important;
                }
            `}</style>
        </div>
    );
};

export default OverviewPage;
