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
            const lowStock = flatInventory.filter(item => item.quantity < 0 || (item.min_stock > 0 && item.quantity <= item.min_stock));
            
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
                <div className="glass-panel kpi-card cursor-pointer" onClick={() => navigate('/dashboard/warehouses')}>
                    <div className="kpi-icon-wrapper blue">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนรายการสินค้า</span>
                        <span className="kpi-value">{stats.totalItems.toLocaleString()} <span className="unit">รายการ</span></span>
                    </div>
                </div>

                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper red">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">สินค้าใกล้หมด (Low Stock)</span>
                        <span className={`kpi-value ${stats.lowStockItems.length > 0 ? 'text-red-500' : ''}`}>
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
                <div className="glass-panel overflow-hidden flex flex-col">
                    <div className={`panel-header px-6 py-4 border-b border-border flex justify-between items-center ${stats.lowStockItems.length > 0 ? 'bg-red-500/5' : ''}`}>
                        <h3 className="m-0 text-base text-red-500 flex items-center gap-2">
                            <AlertTriangle size={16} /> รายการสินค้าที่ต้องสั่งเพิ่ม
                        </h3>
                        <button onClick={() => navigate('/dashboard/warehouses')} className="bg-transparent border-none text-textMuted cursor-pointer text-sm flex items-center gap-1 hover:text-textMain">
                            ไปที่คลัง <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="overflow-y-auto max-h-[400px]">
                        {stats.lowStockItems.length > 0 ? (
                            stats.lowStockItems.map((item, index) => (
                                <div key={index} className="hover-row px-6 py-4 border-b border-border">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold text-textMain">{item.product_name}</div>
                                            <div className="text-sm text-textMuted">SKU: {item.sku || '-'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-500">{item.quantity.toLocaleString()} {item.unit}</div>
                                            <div className="text-xs text-textMuted">Min: {item.min_stock.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-emerald-500 flex flex-col items-center">
                                <Package size={40} className="opacity-20 mb-4" />
                                <div>สต็อกสินค้าทุกรายการอยู่ในระดับปกติ</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warehouse List Summary */}
                <div className="glass-panel overflow-hidden flex flex-col">
                    <div className="panel-header px-6 py-4 border-b border-border">
                        <h3 className="m-0 text-base text-primary flex items-center gap-2">
                            <Package size={16} /> สรุปแยกรายคลัง
                        </h3>
                    </div>
                    <div className="p-4">
                        {warehouses.map(wh => (
                            <div 
                                key={wh.id} 
                                onClick={() => navigate(`/dashboard/warehouses/${wh.id}`)}
                                className="hover-row p-4 rounded-xl bg-bgMain mb-3 cursor-pointer border border-border"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-textMain">{wh.code ? `[${wh.code}] ` : ''}{wh.name}</div>
                                        <div className="text-sm text-textMuted">{wh.is_default ? 'คลังสินค้าหลัก' : wh.supplier?.name || 'คลังย่อย'}</div>
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
