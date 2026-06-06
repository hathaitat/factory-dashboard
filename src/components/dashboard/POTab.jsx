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
        const colorClass = isUpcoming ? 'text-amber-500' : 'text-red-500';
        const bgClass = isUpcoming ? 'bg-amber-500/10' : 'bg-red-500/10';
        const borderClass = isUpcoming ? 'border-amber-500/25' : 'border-red-500/25';
        const text = isUpcoming ? `เหลือ ${days} วัน` : `เลยกำหนด ${days} วัน`;

        const dateParts = formatDate(dateStr).split(' ');
        if (dateParts.length < 3) return <span>{formatDate(dateStr)}</span>;

        const [day, month, year] = dateParts;

        return (
            <div className={`inline-flex flex-col items-center bg-bgMain border ${borderClass} rounded-md overflow-hidden min-w-[75px]`}>
                <div className={`${bgClass} ${colorClass} text-[0.7rem] px-1.5 py-1 w-full text-center font-semibold`}>
                    {text}
                </div>
                <div className="px-1.5 py-1 text-[0.85rem] font-semibold text-textMain leading-tight text-center">
                    {day} {month}<br />
                    <span className="text-[0.7rem] text-textMuted font-normal">{year}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper blue">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO ทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-textMuted mt-1">
                            ฿{data.totalAmount.toLocaleString()} | {data.totalQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper green">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เดือนนี้</span>
                        <span className="kpi-value">{data.monthly.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-emerald-500 font-semibold mt-1">
                            ฿{data.monthlyAmount.toLocaleString()} | {data.monthlyQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper yellow">
                        <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO รอดำเนินการ</span>
                        <span className="kpi-value">{data.pending.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-amber-500 font-semibold mt-1">
                            ฿{data.pendingAmount.toLocaleString()} | {data.pendingQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เลยกำหนดส่ง</span>
                        <span className="kpi-value alert">{data.overdue.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-red-500 font-semibold mt-1">
                            ฿{data.overdueAmount.toLocaleString()} | {data.overdueQuantity.toLocaleString()} หน่วย
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper bg-emerald-500/10 text-emerald-500">
                        <CheckCircle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">สินค้า สั่ง / ส่งแล้ว</span>
                        <span className="kpi-value text-xl">
                            {data.totalQuantity.toLocaleString()} / <span className="text-emerald-500">{data.deliveredQuantity.toLocaleString()}</span>
                            <span className="unit ml-1">ชิ้น</span>
                        </span>
                        <div className="w-full h-1 bg-slate-100 rounded-sm mt-2 overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-[width] duration-500 ease-in-out" style={{
                                width: `${Math.min(100, (data.deliveredQuantity / (data.totalQuantity || 1)) * 100)}%`
                            }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-panel p-6 mb-6">
                <h3 className="m-0 mb-4 text-base text-textMain">สถานะ PO ทั้งหมด</h3>
                <div className="flex gap-4 flex-wrap">
                    {[
                        { label: 'Waiting', count: data.waiting, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
                        { label: 'Progressing', count: data.inProgress, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
                        { label: 'Completed', count: data.completed, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' },
                        { label: 'Cancelled', count: data.cancelled, colorClass: 'text-gray-500', bgClass: 'bg-gray-500/10' }
                    ].map(s => (
                        <div key={s.label} className={`flex-[1_1_120px] p-4 rounded-xl text-center ${s.bgClass}`}>
                            <div className={`text-[1.6rem] font-bold ${s.colorClass}`}>{s.count ?? 0}</div>
                            <div className={`text-sm font-medium mt-1 ${s.colorClass}`}>{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-sm text-textMuted">
                    ยอดรวม PO เดือนนี้: <strong className="text-blue-500">฿{data.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
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
                <div className="glass-panel overflow-hidden flex flex-col min-h-[400px]">
                    <div className="panel-header px-6 py-5 border-b border-border flex justify-between items-center">
                        <h3 className="m-0 text-[1.1rem] text-emerald-500 flex items-center gap-2.5 font-bold">
                            <div className="bg-emerald-500/10 p-1.5 rounded-full flex">
                                <Clock size={18} color="#10b981" />
                            </div>
                            PO ที่ต้องส่ง (ภายใน 7 วัน)
                        </h3>
                        <button onClick={() => navigate('/dashboard/purchase-orders')} className="bg-transparent border-none text-textMuted cursor-pointer flex items-center gap-1.5 text-sm font-medium hover:text-textMain">
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper overflow-y-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-bgMain text-left border-b border-border">
                                    <th className="px-6 py-4 text-textMuted font-semibold text-sm">เลขที่ PO</th>
                                    <th className="px-6 py-4 text-textMuted font-semibold text-sm">ลูกค้า</th>
                                    <th className="px-6 py-4 text-textMuted font-semibold text-sm text-right">กำหนดส่ง</th>
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
                                            <tr key={po.id} onClick={() => navigate(`/dashboard/purchase-orders/${po.id}/edit`)} className="po-row-hover border-b border-border cursor-pointer">
                                                <td className="px-6 py-5 font-semibold text-blue-500 text-[0.95rem]">{po.po_number}</td>
                                                <td className="px-6 py-5 text-textMain font-medium text-sm">{po.customers?.name}</td>
                                                <td className="px-6 py-5 text-right font-semibold">
                                                    {isOverdue ? (
                                                        <span className="text-red-500">เลยกำหนดส่ง</span>
                                                    ) : (
                                                        <span className="text-textMain">{dateFormatted}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                                {(data.upcomingPOs.length === 0 && data.overduePOs.length === 0) && (
                                    <tr><td colSpan="3" className="p-12 text-center text-slate-400">ไม่มี PO ที่ต้องส่งในขณะนี้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Customers Widget - REPLACING Status Breakdown */}
                <div className="glass-panel overflow-hidden flex flex-col min-h-[400px]">
                    <div className="panel-header px-6 py-5 border-b border-border">
                        <h3 className="m-0 text-base text-textMain font-bold flex items-center gap-2">
                            <Users size={18} color="#3b82f6" /> ลูกค้าที่มียอดสั่งซื้อสูงสุด
                        </h3>
                    </div>
                    <div className="py-2">
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
                                <div key={cust.name} className={`px-6 py-4 flex items-center gap-4 ${idx === topCustomers.length - 1 ? '' : 'border-b border-border'}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold ${idx === 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-cardHover text-textMuted'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-textMain whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">{cust.name}</div>
                                        <div className="text-xs text-textMuted font-medium">ยอดสั่งซื้อรวม</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-extrabold text-textMain">฿{cust.total.toLocaleString()}</div>
                                    </div>
                                </div>
                            ));
                        })()}
                        {data.rawPOs.length === 0 && (
                            <div className="p-12 text-center text-slate-400">ไม่มีข้อมูลลูกค้า</div>
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
