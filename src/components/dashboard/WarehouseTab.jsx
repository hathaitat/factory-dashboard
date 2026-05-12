import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, TrendingUp, ArrowRight, ExternalLink, Check, Info } from 'lucide-react';
import { warehouseService } from '../../services/warehouseService';
import CustomLineChart from './CustomLineChart';

const WarehouseTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockItems: [],
        topInventoryItems: [],
        movementLogs: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [whList, movementLogs] = await Promise.all([
                warehouseService.getWarehouses(),
                warehouseService.getAllInventoryLogs(90)
            ]);
            
            setWarehouses(whList);

            // Fetch inventory for all warehouses to aggregate stats
            const allInventory = await Promise.all(
                whList.map(wh => warehouseService.getInventoryByWarehouse(wh.id))
            );

            const flatInventory = allInventory.flat();
            const lowStock = flatInventory.filter(item => item.quantity <= item.min_stock);
            
            // Calculate top 10 items by quantity
            const sortedInventory = [...flatInventory].sort((a, b) => b.quantity - a.quantity);
            const top10 = sortedInventory.slice(0, 10).map(item => ({
                id: item.product_id || item.id,
                name: item.product_name,
                shortName: item.product_name.length > 15 ? item.product_name.substring(0, 15) + '...' : item.product_name,
                quantity: item.quantity,
                unit: item.unit,
                label: item.product_name // for CustomLineChart categoryField
            }));
            
            setStats({
                totalItems: flatInventory.length,
                lowStockItems: lowStock,
                topInventoryItems: top10,
                movementLogs: movementLogs || []
            });
        } catch (error) {
            console.error('Error loading warehouse dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const movementMetrics = [
        { id: 'stock_in', label: 'รับสินค้าเข้า (IN)', data: stats.movementLogs.filter(l => l.type === 'IN'), dateField: 'date', valueField: 'qty', color: '#10b981', valueSuffix: ' ชิ้น' },
        { id: 'stock_out', label: 'จ่ายสินค้าออก (OUT)', data: stats.movementLogs.filter(l => l.type === 'OUT'), dateField: 'date', valueField: 'qty', color: '#ef4444', valueSuffix: ' ชิ้น' }
    ];

    const inventoryMetrics = [
        { id: 'quantity', label: 'จำนวนคงเหลือ', color: '#f59e0b', valueSuffix: ' ชิ้น', chartType: 'line' }
    ];

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลคลังสินค้า...</div>;
    }

    return (
        <div className="tab-content">
            {/* KPI Cards */}
            <div className="kpi-grid mb-6">
                <div className="glass-panel kpi-card" onClick={() => navigate('/dashboard/warehouses')} className="cursor-pointer">
                    <div className="kpi-icon-wrapper blue">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนรายการสินค้า</span>
                        <span className="kpi-value">{stats.totalItems.toLocaleString()} <span className="unit">รายการ</span></span>
                    </div>
                </div>

                <div className="glass-panel kpi-card" style={{ borderLeft: stats.lowStockItems.length > 0 ? '4px solid #ef4444' : undefined }}>
                    <div className="kpi-icon-wrapper red">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">สินค้าใกล้หมด (Low Stock)</span>
                        <span className="kpi-value" style={{ color: stats.lowStockItems.length > 0 ? '#ef4444' : undefined }}>
                            {stats.lowStockItems.length.toLocaleString()} <span className="unit">รายการ</span>
                        </span>
                    </div>
                </div>

                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนคลังสินค้า</span>
                        <span className="kpi-value">{warehouses.length} <span className="unit">แห่ง</span></span>
                    </div>
                </div>
            </div>

            {stats.movementLogs.length > 0 && (
                <CustomLineChart 
                    title="แนวโน้มความเคลื่อนไหวสินค้า (Stock Movement Trends)"
                    metrics={movementMetrics}
                    defaultMetric="stock_in"
                    enableGroupBy={true}
                    groupByLabel="คลังสินค้า"
                    groupByData={stats.movementLogs}
                    groupByField="warehouseName"
                    groupByDateField="date"
                    groupByValueField="qty"
                    className="mt-4"
                />
            )}

            {stats.topInventoryItems.length > 0 && (
                <CustomLineChart 
                    title="10 อันดับสินค้าคงเหลือสูงสุด (Top 10 Inventory Items)"
                    metrics={inventoryMetrics}
                    isCategorical={true}
                    categoricalData={stats.topInventoryItems}
                    categoryField="name"
                    className="mt-4"
                />
            )}

            <div className="dashboard-grid">
                {/* Low Stock Items */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: stats.lowStockItems.length > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> รายการสินค้าที่ต้องสั่งเพิ่ม
                        </h3>
                        <button onClick={() => navigate('/dashboard/warehouses')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                            ไปที่คลัง <ArrowRight size={14} />
                        </button>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                        {stats.lowStockItems.length > 0 ? (
                            stats.lowStockItems.map((item, index) => (
                                <div key={index} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.product_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {item.sku || '-'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div style={{ fontWeight: '700', color: '#ef4444' }}>{item.quantity.toLocaleString()} {item.unit}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min: {item.min_stock.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--success)' }}>
                                <Package size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <div>สต็อกสินค้าทุกรายการอยู่ในระดับปกติ</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warehouse List Summary */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={16} /> สรุปแยกรายคลัง
                        </h3>
                    </div>
                    <div className="p-4">
                        {warehouses.map(wh => (
                            <div 
                                key={wh.id} 
                                onClick={() => navigate(`/dashboard/warehouses/${wh.id}`)}
                                style={{ 
                                    padding: '1rem', 
                                    borderRadius: '12px', 
                                    background: 'var(--bg-main)', 
                                    marginBottom: '0.8rem', 
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-color)'
                                }}
                                className="hover-row"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{wh.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{wh.is_default ? 'คลังสินค้าหลัก' : wh.supplier?.name || 'คลังย่อย'}</div>
                                    </div>
                                    <ExternalLink size={16} className="text-textMuted" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style>{`
                .hover-row:hover { background: var(--card-hover) !important; }
            `}</style>
        </div>
    );
};

export default WarehouseTab;
