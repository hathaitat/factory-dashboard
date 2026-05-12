import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, FileText, ShieldAlert, ShoppingCart, ExternalLink, Package, AlertTriangle } from 'lucide-react';
import { warehouseService } from '../../services/warehouseService';
import { customerService } from '../../services/customerService';
import { invoiceService } from '../../services/invoiceService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { quotationService } from '../../services/quotationService';
import { certificateService } from '../../services/certificateService';
import CustomLineChart from './CustomLineChart';

const OverviewTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        totalCustomers: 0,
        monthlySales: 0,
        monthlyPOCount: 0,
        monthlyQuotationCount: 0,
        topProducts: [],
        topCustomers: [],
        expiringCertificates: [],
        lowStockItems: [],
        totalInventoryItems: 0,
        rawInvoices: [],
        rawPurchaseOrders: [],
        rawQuotations: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [customers, invoices, purchaseOrders, quotations, topProducts, topCustomers, expiringCerts, warehouses] = await Promise.all([
                    customerService.getCustomers(),
                    invoiceService.getInvoices(),
                    purchaseOrderService.getPurchaseOrders(),
                    quotationService.getQuotations(),
                    invoiceService.getTopSellingProducts(5),
                    invoiceService.getTopCustomers(5),
                    certificateService.getExpiringCertificates(30),
                    warehouseService.getWarehouses()
                ]);

                // Aggregate warehouse data
                const allInventory = await Promise.all(
                    (warehouses || []).map(wh => warehouseService.getInventoryByWarehouse(wh.id))
                );
                const flatInventory = allInventory.flat();
                const lowStock = flatInventory.filter(item => item.quantity <= item.min_stock);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const monthlyInvoices = (invoices || []).filter(inv => {
                    const d = new Date(inv.date || inv.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const monthlySales = monthlyInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
                const monthlyInvoiceCount = monthlyInvoices.length;

                const monthlyPOs = (purchaseOrders || []).filter(po => {
                    const d = new Date(po.issue_date || po.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const monthlyPOCount = monthlyPOs.length;
                const monthlyPOAmount = monthlyPOs.reduce((sum, po) => sum + (Number(po.grand_total) || 0), 0);

                const monthlyQuotations = (quotations || []).filter(qt => {
                    const d = new Date(qt.date || qt.createdAt);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                const monthlyQuotationCount = monthlyQuotations.length;
                const monthlyQuotationAmount = monthlyQuotations.reduce((sum, qt) => sum + (Number(qt.grandTotal) || 0), 0);

                setData({
                    totalCustomers: (customers || []).length,
                    monthlySales,
                    monthlyInvoiceCount,
                    monthlyPOCount,
                    monthlyPOAmount,
                    monthlyQuotationCount,
                    monthlyQuotationAmount,
                    topProducts: topProducts || [],
                    topCustomers: topCustomers || [],
                    expiringCertificates: expiringCerts || [],
                    lowStockItems: lowStock || [],
                    totalInventoryItems: flatInventory.length,
                    rawInvoices: invoices || [],
                    rawPurchaseOrders: purchaseOrders || [],
                    rawQuotations: quotations || []
                });
            } catch (error) {
                console.error('Error loading overview:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลภาพรวม...</div>;
    }

    return (
        <div className="tab-content">
            <div className="mb-6">
                {/* Expiring Certificates */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '340px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: data.expiringCertificates.length > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={16} /> Certificate ใกล้หมดอายุ
                        </h3>
                        <button onClick={() => navigate('/dashboard/certificates')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.expiringCertificates.map((cert, index) => {
                            const isExpired = cert.expiry_date && new Date(cert.expiry_date) < new Date();
                            const customers = cert.certificate_customers?.map(cc => cc.customers?.name).filter(Boolean).join(', ');
                            return (
                                <div key={index} style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/certificates/${cert.id}/edit`)} className="hover-row">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>{cert.name}</div>
                                            {customers && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{customers}</div>}
                                        </div>
                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', flexShrink: 0, background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isExpired ? '#ef4444' : '#f59e0b' }}>
                                            {isExpired ? 'หมดอายุแล้ว' : 'ใกล้หมดอายุ'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: isExpired ? '#ef4444' : '#f59e0b', marginTop: '0.3rem' }}>
                                        หมดอายุ: {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ไม่ระบุ'}
                                    </div>
                                </div>
                            );
                        })}
                        {data.expiringCertificates.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
                                ไม่มี Certificate ที่ใกล้หมดอายุ 👍
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="glass-panel mt-4" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '340px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: data.lowStockItems.length > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> สินค้าใกล้หมด/ต้องสั่งเพิ่ม
                        </h3>
                        <button onClick={() => navigate('/dashboard?tab=warehouse')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูคลังสินค้า <ExternalLink size={14} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.lowStockItems.map((item, index) => (
                            <div key={index} style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate('/dashboard/warehouses')} className="hover-row">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>SKU: {item.sku || '-'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.9rem' }}>{item.quantity.toLocaleString()} {item.unit}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min: {item.min_stock}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {data.lowStockItems.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
                                สินค้าในคลังเพียงพอทุกรายการ 👍
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card glass-panel cursor-pointer" onClick={() => navigate('/dashboard/customers')}>
                    <div className="kpi-icon-wrapper blue">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลูกค้าทั้งหมด</span>
                        <span className="kpi-value">{data.totalCustomers.toLocaleString()} <span className="unit">ราย</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard?tab=warehouse')} style={{ cursor: 'pointer', borderLeft: data.lowStockItems.length > 0 ? '4px solid #ef4444' : undefined }}>
                    <div className="kpi-icon-wrapper red">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">รายการสินค้าในคลัง</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.totalInventoryItems.toLocaleString()} <span className="unit">รายการ</span></span>
                            {data.lowStockItems.length > 0 && (
                                <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600', marginTop: '0.2rem' }}>
                                    ใกล้หมด {data.lowStockItems.length} รายการ
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel cursor-pointer" onClick={() => navigate('/dashboard/invoices')}>
                    <div className="kpi-icon-wrapper green">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดขายเดือนนี้</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">฿{data.monthlySales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                รวม {data.monthlyInvoiceCount} ใบกำกับภาษี
                            </span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel cursor-pointer" onClick={() => navigate('/dashboard/purchase-orders')}>
                    <div className="kpi-icon-wrapper blue">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO เดือนนี้</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.monthlyPOCount.toLocaleString()} <span className="unit">ใบ</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                ยอดรวม ฿{data.monthlyPOAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="kpi-card glass-panel cursor-pointer" onClick={() => navigate('/dashboard/quotations')}>
                    <div className="kpi-icon-wrapper yellow">
                        <FileText size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ใบเสนอราคาเดือนนี้</span>
                        <div className="flex flex-col">
                            <span className="kpi-value">{data.monthlyQuotationCount.toLocaleString()} <span className="unit">ใบ</span></span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                ยอดรวม ฿{data.monthlyQuotationAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มและสถิติภาพรวม"
                metrics={[
                    { id: 'sales', label: 'ยอดขาย (Invoices)', data: data.rawInvoices, dateField: 'date', valueField: 'grandTotal', color: '#10b981', valuePrefix: '฿' },
                    { id: 'po_amount', label: 'ยอดสั่งซื้อ (POs)', data: data.rawPurchaseOrders, dateField: 'issue_date', valueField: 'grand_total', color: '#3b82f6', valuePrefix: '฿' },
                    { id: 'quotation_amount', label: 'ยอดเสนอราคา (Quotations)', data: data.rawQuotations, dateField: 'date', valueField: 'grandTotal', color: '#f59e0b', valuePrefix: '฿' }
                ]}
            />

            <div className="dashboard-grid">
                {/* Top Products */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '340px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={16} /> สินค้าขายดี 5 อันดับแรก
                        </h3>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.topProducts.map((item, index) => (
                            <div key={index} style={{ padding: '0.7rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem' }} className="hover-row">
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--card-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>{index + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.quantity.toLocaleString()} หน่วย | ฿{item.amount.toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                        {data.topProducts.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลสินค้า</div>
                        )}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '340px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={16} /> Top 5 ลูกค้าที่มียอดซื้อสูงสุด
                        </h3>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.topCustomers.map((item, index) => (
                            <div key={index} style={{ padding: '0.7rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem' }} className="hover-row">
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--card-hover)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>{index + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>฿{item.totalAmount.toLocaleString()} | {item.totalQuantity?.toLocaleString() || 0} หน่วย</div>
                                </div>
                            </div>
                        ))}
                        {data.topCustomers.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลลูกค้า</div>
                        )}
                    </div>
                </div>
            </div>


            <style>{`
                .hover-row:hover { background: var(--bg-main) !important; }
            `}</style>
        </div>
    );
};

export default OverviewTab;
