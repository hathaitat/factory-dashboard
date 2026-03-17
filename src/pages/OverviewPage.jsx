import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, FileText, Clock, ExternalLink } from 'lucide-react';
import { customerService } from '../services/customerService';
import { invoiceService } from '../services/invoiceService';
import { billingNoteService } from '../services/billingNoteService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import '../styles/OverviewPage.css';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

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
    const [duePurchaseOrders, setDuePurchaseOrders] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const [customers, invoices, billingNotes, purchaseOrders, topProducts, topCustomers] = await Promise.all([
                    customerService.getCustomers(),
                    invoiceService.getInvoices(),
                    billingNoteService.getBillingNotes(),
                    purchaseOrderService.getPurchaseOrders(),
                    invoiceService.getTopSellingProducts(5),
                    invoiceService.getTopCustomers(5)
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

                // 3. Monthly Billing Note Amount
                const monthlyBilling = (billingNotes || [])
                    .filter(bn => {
                        const bnDate = new Date(bn.date);
                        return bnDate.getMonth() === currentMonth && bnDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, bn) => sum + (Number(bn.totalAmount) || 0), 0);

                // 4. Pending Invoices
                const pendingInvoices = (invoices || []).filter(inv => inv.status === 'Draft' || inv.status === 'Pending').length;

                // 5. Monthly PO Count
                const monthlyPOCount = (purchaseOrders || []).filter(po => {
                    const poDate = new Date(po.issue_date || po.created_at);
                    return poDate.getMonth() === currentMonth && poDate.getFullYear() === currentYear;
                }).length;

                // 6. Pending Billing by Customer (All Unbilled)
                const pendingByCustomerMap = (invoices || [])
                    .filter(inv => inv.status === 'Draft' || inv.status === 'Pending')
                    .reduce((acc, inv) => {
                        const name = inv.customerName;
                        if (!acc[name]) {
                            acc[name] = { name, total: 0, count: 0 };
                        }
                        acc[name].total += Number(inv.grandTotal) || 0;
                        acc[name].count += 1;
                        return acc;
                    }, {});

                const pendingByCustomer = Object.values(pendingByCustomerMap).sort((a, b) => b.total - a.total);
                const totalPendingAmount = pendingByCustomer.reduce((sum, item) => sum + item.total, 0);

                setMetrics({
                    totalCustomers,
                    monthlySales,
                    monthlyBilling,
                    pendingInvoices,
                    pendingByCustomer,
                    totalPendingAmount,
                    monthlyPOCount,
                    topProducts,
                    topCustomers
                });

                // Recent data (Last 5)
                setRecentInvoices((invoices || []).slice(0, 5));

                // POs due within 3 days or overdue, sorted ascending
                const threeDaysFromNow = new Date();
                threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                threeDaysFromNow.setHours(23, 59, 59, 999);

                const urgentPOs = (purchaseOrders || [])
                    .filter(po => {
                        if (po.status === 'Completed' || po.status === 'Cancelled') return false;
                        if (!po.due_date) return false;
                        const dueDate = new Date(po.due_date);
                        return dueDate <= threeDaysFromNow;
                    })
                    .sort((a, b) => {
                        return new Date(a.due_date) - new Date(b.due_date);
                    })
                    .slice(0, 10);
                setDuePurchaseOrders(urgentPOs);

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
            <PageHeader
                title="ภาพรวมระบบ (Dashboard)"
                helpContent={HELP_CONTENT.overview}
            >
                <div className="status-badge live">
                    <span className="pulse-dot"></span>
                    ข้อมูลอัพเดทล่าสุด
                </div>
            </PageHeader>

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

                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/purchase-orders')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper blue" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เดือนนี้</span>
                        <span className="kpi-value">{metrics.monthlyPOCount.toLocaleString()} <span className="unit">ใบ</span></span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="glass-panel main-chart-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} /> ใบกำกับภาษีล่าสุด
                        </h3>
                        <button onClick={() => navigate('/dashboard/invoices')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--text-main)' }}>฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                </div>

                <div className="glass-panel side-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.05)' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={18} /> ยอดที่ต้องวางบิลทั้งหมด
                            </h3>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f59e0b', marginTop: '0.4rem' }}>
                                ฿{metrics.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <button onClick={() => navigate('/dashboard/invoices')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                            ดูใบกำกับ <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {metrics.pendingByCustomer.map((item, index) => (
                            <div key={index} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', cursor: 'default', transition: 'background 0.2s' }} className="hover-row">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.name}</span>
                                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>฿{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{item.count} รายการค้างวางบิล</span>
                                    <button 
                                        onClick={() => navigate('/dashboard/billing-notes/new', { state: { preselectCustomerName: item.name } })}
                                        style={{ background: 'rgba(245, 158, 11, 0.1)', border: 'none', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        วางบิลเลย
                                    </button>
                                </div>
                            </div>
                        ))}
                        {metrics.pendingByCustomer.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                ไม่มีรายการค้างวางบิลในเดือนนี้
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                {/* PO Due Deliveries */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} /> PO ที่ต้องส่ง (ภายใน 3 วัน)
                        </h3>
                        <button onClick={() => navigate('/dashboard/purchase-orders')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ PO</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ลูกค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>กำหนดส่ง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {duePurchaseOrders.map(po => {
                                    const dueDate = po.due_date ? new Date(po.due_date) : null;
                                    const today = new Date(new Date().setHours(0, 0, 0, 0));
                                    const isOverdue = dueDate && dueDate < today;
                                    const isToday = dueDate && dueDate.toDateString() === today.toDateString();

                                    return (
                                        <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)} className="hover-row">
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#3b82f6' }}>{po.po_number || po.poNumber}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.customers?.name || po.customer?.name}</td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '500', color: isOverdue ? 'var(--error)' : isToday ? 'var(--warning)' : 'var(--text-main)' }}>
                                                {!dueDate ? 'ไม่ระบุ' : isOverdue ? 'เลยกำหนดส่ง' : isToday ? 'วันนี้' : dueDate.toLocaleDateString('th-TH')}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {duePurchaseOrders.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ไม่มีรายการ PO กำหนดส่งสินค้าเร็วๆ นี้</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Selling Products & Customers Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Top Selling Products */}
                    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '240px' }}>
                        <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <DollarSign size={16} /> สินค้าขายดี 5 อันดับแรก
                            </h3>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                            {metrics.topProducts?.map((item, index) => (
                                <div key={index} style={{ padding: '0.7rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem' }} className="hover-row">
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--card-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>{index + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.quantity.toLocaleString()} หน่วย | ฿{item.amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Customers */}
                    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '240px' }}>
                        <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} /> Top 5 ลูกค้าที่มียอดซื้อสูงสุด
                            </h3>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                            {metrics.topCustomers?.map((item, index) => (
                                <div key={index} style={{ padding: '0.7rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem' }} className="hover-row">
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--card-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>{index + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>฿{item.totalAmount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
