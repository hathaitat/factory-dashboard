import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, TrendingUp, ArrowRight, ExternalLink } from 'lucide-react';
import { warehouseService } from '../../services/warehouseService';

const WarehouseTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockItems: [],
        totalValue: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const whList = await warehouseService.getWarehouses();
            setWarehouses(whList);

            // Fetch inventory for all warehouses to aggregate stats
            const allInventory = await Promise.all(
                whList.map(wh => warehouseService.getInventoryByWarehouse(wh.id))
            );

            const flatInventory = allInventory.flat();
            const lowStock = flatInventory.filter(item => item.quantity <= item.min_stock);
            
            setStats({
                totalItems: flatInventory.length,
                lowStockItems: lowStock,
                // totalValue calculation could be added if price field exists in warehouse_inventory
            });
        } catch (error) {
            console.error('Error loading warehouse dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลคลังสินค้า...</div>;
    }

    return (
        <div className="tab-content">
            {/* KPI Cards */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card glass-panel" onClick={() => navigate('/dashboard/warehouses')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-icon-wrapper blue">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนรายการสินค้า</span>
                        <span className="kpi-value">{stats.totalItems.toLocaleString()} <span className="unit">รายการ</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel" style={{ borderLeft: stats.lowStockItems.length > 0 ? '4px solid #ef4444' : undefined }}>
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

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนคลังสินค้า</span>
                        <span className="kpi-value">{warehouses.length} <span className="unit">แห่ง</span></span>
                    </div>
                </div>
            </div>

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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.product_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {item.sku || '-'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
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
                    <div style={{ padding: '1rem' }}>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{wh.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{wh.is_default ? 'คลังสินค้าหลัก' : wh.supplier?.name || 'คลังย่อย'}</div>
                                    </div>
                                    <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
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
