import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, CheckCircle, ExternalLink, XCircle } from 'lucide-react';
import { supplierPoService } from '../../services/supplierPoService';
import CustomLineChart from './CustomLineChart';

const SupplierPoTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        totalAmount: 0,
        totalCount: 0,
        pendingAmount: 0,
        pendingCount: 0,
        completedCount: 0,
        rawPOs: [],
        topItems: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const purchaseOrders = await supplierPoService.getSupplierPos();
                
                const posWithNames = (purchaseOrders || []).map(po => ({
                    ...po,
                    supplierName: po.suppliers?.name || 'ไม่ระบุ'
                }));

                const nonCancelled = posWithNames.filter(po => po.status !== 'Cancelled');
                const totalAmount = nonCancelled.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);
                
                const pendingPOs = posWithNames.filter(po => po.status === 'Draft' || po.status === 'Partial');
                const pendingAmount = pendingPOs.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);
                
                const completedPOs = posWithNames.filter(po => po.status === 'Completed');

                const allItems = {};
                posWithNames.forEach(po => {
                    if (po.status !== 'Cancelled' && po.supplier_po_items) {
                        po.supplier_po_items.forEach(item => {
                            if (!item.description) return;
                            const key = item.description;
                            if (!allItems[key]) {
                                allItems[key] = {
                                    name: item.description,
                                    quantity: 0,
                                    amount: 0,
                                    unit: item.unit || 'หน่วย'
                                };
                            }
                            allItems[key].quantity += (Number(item.quantity) || 0);
                            allItems[key].amount += ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
                        });
                    }
                });

                const topItems = Object.values(allItems)
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                setData({
                    totalCount: posWithNames.length,
                    totalAmount,
                    pendingCount: pendingPOs.length,
                    pendingAmount,
                    completedCount: completedPOs.length,
                    rawPOs: posWithNames,
                    topItems
                });
            } catch (error) {
                console.error('Error loading Supplier PO data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลใบสั่งซื้อผู้ขาย...</div>;
    }

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper blue">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Vendor PO ทั้งหมด</span>
                        <span className="kpi-value">{data.totalCount.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-textMuted mt-1">
                            มูลค่ารวม ฿{data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper orange">
                        <Clock size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">รอรับสินค้า (Draft/Partial)</span>
                        <span className="kpi-value">{data.pendingCount.toLocaleString()} <span className="unit">ใบ</span></span>
                        <div className="text-xs text-textMuted mt-1">
                            มูลค่า ฿{data.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel px-6 py-4">
                    <div className="kpi-icon-wrapper green">
                        <CheckCircle size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">รับครบแล้ว (Completed)</span>
                        <span className="kpi-value">{data.completedCount.toLocaleString()} <span className="unit">ใบ</span></span>
                    </div>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มยอดสั่งซื้อจากผู้ขาย (Vendor POs)"
                metrics={[
                    { id: 'po_amount', label: 'ยอดสั่งซื้อ (มูลค่า)', data: data.rawPOs, dateField: 'date', valueField: 'grand_total', color: '#8b5cf6', valuePrefix: '฿' },
                    { id: 'po_count', label: 'จำนวนคำสั่งซื้อ (ใบ)', data: data.rawPOs, dateField: 'date', valueField: null, color: '#ec4899', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="po_amount"
                enableGroupBy={true}
                groupByData={data.rawPOs}
                groupByField="supplierName"
                groupByDateField="date"
                groupByValueField="grand_total"
                groupByPrefix="฿"
            />
            
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShoppingCart size={16} /> ใบสั่งซื้อล่าสุด
                        </h3>
                        <button
                            onClick={() => navigate('/dashboard/supplier-pos')}
                            className="btn-text"
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                        >
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>เลขที่ PO</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ผู้ขาย</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ยอดเงินสุทธิ</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rawPOs.slice(0, 10).map(po => (
                                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/supplier-pos/${po.id}`)}>
                                            {po.po_number}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>{po.supplierName}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>
                                            ฿{(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                padding: '4px 10px', 
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                display: 'inline-block',
                                                whiteSpace: 'nowrap',
                                                background: 
                                                    po.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                                    po.status === 'Partial' ? 'rgba(245, 158, 11, 0.1)' : 
                                                    po.status === 'Draft' ? 'rgba(107, 114, 128, 0.1)' :
                                                    'rgba(239, 68, 68, 0.1)',
                                                color: 
                                                    po.status === 'Completed' ? '#10b981' : 
                                                    po.status === 'Partial' ? '#f59e0b' : 
                                                    po.status === 'Draft' ? '#6b7280' :
                                                    '#ef4444'
                                            }}>
                                                {po.status === 'Partial' ? 'รับบางส่วน' : 
                                                 po.status === 'Draft' ? 'ฉบับร่าง' : 
                                                 po.status === 'Completed' ? 'รับครบแล้ว' : 
                                                 po.status === 'Cancelled' ? 'ยกเลิก' : po.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#ec4899', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShoppingCart size={16} /> สินค้าที่สั่งซื้อเยอะที่สุด (ตามมูลค่า)
                        </h3>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ชื่อสินค้า</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>จำนวนรวม</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>มูลค่ารวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topItems.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500' }}>
                                            {item.name}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right' }}>
                                            {item.quantity.toLocaleString()} <span className="text-textMuted text-xs">{item.unit}</span>
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--secondary)' }}>
                                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {data.topItems.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            ไม่มีข้อมูลการสั่งซื้อ
                                        </td>
                                    </tr>
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

export default SupplierPoTab;
