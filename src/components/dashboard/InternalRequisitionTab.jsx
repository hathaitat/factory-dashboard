import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Clock, ShoppingCart, PackageMinus, TrendingUp, DollarSign } from 'lucide-react';
import { internalItemService } from '../../services/internalItemService';
import { internalRequisitionService } from '../../services/internalRequisitionService';
import { useDialog } from '../../contexts/DialogContext';
import CustomLineChart from './CustomLineChart';

const InternalRequisitionTab = () => {
    const { showError } = useDialog();
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockItems: [],
        recentRequisitions: [],
        rawRequisitions: [],
        totalValue: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [items, lowStock, requisitions, monthlyApprovedValue, categories] = await Promise.all([
                internalItemService.getItems(),
                internalItemService.getLowStockItems(),
                internalRequisitionService.getRequisitions(),
                internalItemService.getMonthlyIssuedValue(),
                internalItemService.getCategories()
            ]);

            const activeItems = items.filter(i => i.status === 'active');
            const totalVal = activeItems.reduce((sum, i) => sum + (i.current_stock * i.unit_price), 0);

            const flatRequisitionItems = [];
            requisitions.forEach(req => {
                if (req.items) {
                    req.items.forEach(item => {
                        const internalItem = items.find(i => i.id === item.item_id);
                        const categoryName = internalItem?.category?.name || 'ทั่วไป';
                        flatRequisitionItems.push({
                            ...item,
                            date: req.date,
                            categoryName: categoryName,
                        });
                    });
                }
            });

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const topRequestedItemsMap = {};
            flatRequisitionItems.forEach(item => {
                const reqDate = new Date(item.date);
                if (reqDate >= thirtyDaysAgo) {
                    if (!topRequestedItemsMap[item.item_name]) {
                        topRequestedItemsMap[item.item_name] = {
                            name: item.item_name,
                            quantity: 0,
                            amount: 0,
                            unit: item.unit
                        };
                    }
                    topRequestedItemsMap[item.item_name].quantity += (Number(item.quantity) || 0);
                    topRequestedItemsMap[item.item_name].amount += (Number(item.amount) || 0);
                }
            });

            const topRequestedItems = Object.values(topRequestedItemsMap)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setStats({
                totalItems: activeItems.length,
                lowStockItems: lowStock,
                recentRequisitions: requisitions.slice(0, 5),
                rawRequisitions: requisitions,
                totalValue: totalVal,
                totalRequisitionsCount: requisitions.length,
                monthlyApprovedValue: monthlyApprovedValue,
                flatRequisitionItems: flatRequisitionItems,
                allCategoryNames: categories ? categories.map(c => c.name) : [],
                topRequestedItems: topRequestedItems
            });
        } catch (err) {
            showError('ไม่สามารถโหลดข้อมูลสถิติได้');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div className="tab-content-container">
            {/* Quick Stats */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Package size={24} />
                    </div>
                    <div>
                        <div className="text-textMuted text-sm">ของใช้ทั้งหมด</div>
                        <div className="text-2xl font-bold text-textMain">{stats.totalItems.toLocaleString()} <span className="text-sm font-normal text-textMuted">รายการ</span></div>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4" style={{ border: stats.lowStockItems.length > 0 ? '1px solid #ef444433' : undefined }}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.lowStockItems.length > 0 ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-green-500/10 text-green-500'}`}>
                        {stats.lowStockItems.length > 0 ? <AlertTriangle size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div>
                        <div className="text-textMuted text-sm">สินค้าใกล้หมด</div>
                        <div className={`text-2xl font-bold ${stats.lowStockItems.length > 0 ? 'text-[#ef4444]' : 'text-textMain'}`}>{stats.lowStockItems.length} <span className="text-sm font-normal text-textMuted">รายการ</span></div>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <div className="text-textMuted text-sm">มูลค่าสต๊อกรวม</div>
                        <div className="text-2xl font-bold text-textMain">฿{stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <div className="text-textMuted text-sm">จำนวนที่เปิดเบิก</div>
                        <div className="text-2xl font-bold text-textMain">{stats.totalRequisitionsCount?.toLocaleString() || 0} <span className="text-sm font-normal text-textMuted">ครั้ง</span></div>
                    </div>
                </div>
                <div className="glass-panel p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6] flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-textMuted text-sm">มูลค่าที่ให้ของไป (เดือนนี้)</div>
                        <div className="text-2xl font-bold text-textMain">฿{stats.monthlyApprovedValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    </div>
                </div>
            </div>

            {/* Trend Chart */}
            <CustomLineChart
                title="แนวโน้มการเบิกและสั่งซื้อของใช้"
                metrics={[
                    { id: 'withdraw_count', label: 'จำนวนการเบิก (ครั้ง)', data: stats.rawRequisitions, dateField: 'date', color: '#f59e0b', yAxisId: 'right', valueSuffix: ' ครั้ง' },
                    { id: 'purchase_amount', label: 'ยอดขอเบิกทั้งหมด (฿)', data: stats.rawRequisitions, dateField: 'date', valueField: 'total_amount', color: '#3b82f6', valuePrefix: '฿' }
                ]}
                defaultMetric="withdraw_count"
                enableGroupBy={true}
                groupByLabel="หมวดหมู่"
                groupByData={stats.flatRequisitionItems || []}
                groupByField="categoryName"
                groupByDateField="date"
                groupByValueField="amount"
                groupByPrefix="฿"
                allGroups={stats.allCategoryNames || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Low Stock Alerts */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#ef4444]/5">
                        <h3 className="text-sm font-bold text-[#ef4444] uppercase tracking-wider flex items-center gap-2 m-0">
                            <AlertTriangle size={16} /> รายการที่ควรสั่งซื้อเพิ่ม
                        </h3>
                    </div>
                    <div className="divide-y divide-border">
                        {stats.lowStockItems.length === 0 ? (
                            <div className="p-8 text-center text-textMuted text-sm">สต๊อกสินค้าทุกรายการยังอยู่ในระดับปกติ</div>
                        ) : stats.lowStockItems.map(item => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div>
                                    <div className="font-medium text-textMain text-sm truncate max-w-[150px]" title={item.name}>{item.name}</div>
                                    <div className="text-xs text-textMuted">{item.category?.name || 'ทั่วไป'}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-[#ef4444]">{item.current_stock} {item.unit}</div>
                                    <div className="text-[10px] text-textMuted">ขั้นต่ำ {item.min_stock} {item.unit}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Requested Items */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#8b5cf6]/5">
                        <h3 className="text-sm font-bold text-[#8b5cf6] uppercase tracking-wider flex items-center gap-2 m-0">
                            <TrendingUp size={16} /> เบิกเยอะสุด (30 วัน)
                        </h3>
                    </div>
                    <div className="divide-y divide-border">
                        {stats.topRequestedItems?.length === 0 ? (
                            <div className="p-8 text-center text-textMuted text-sm">ไม่มีข้อมูลการเบิกในช่วง 30 วันที่ผ่านมา</div>
                        ) : stats.topRequestedItems?.map((item, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold ${idx === 0 ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'bg-cardHover text-textMuted'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-textMain text-sm truncate max-w-[130px]" title={item.name}>{item.name}</div>
                                        <div className="text-[10px] text-textMuted">รวม ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-textMain">{item.quantity.toLocaleString()}</div>
                                    <div className="text-[10px] text-textMuted">{item.unit}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Requisitions */}
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/5">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 m-0">
                            <Clock size={16} /> ประวัติล่าสุด (5 รายการ)
                        </h3>
                    </div>
                    <div className="divide-y divide-border">
                        {stats.recentRequisitions.length === 0 ? (
                            <div className="p-8 text-center text-textMuted text-sm">ยังไม่มีประวัติการเบิก/สั่งซื้อ</div>
                        ) : stats.recentRequisitions.map(req => (
                            <div key={req.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${req.type === 'purchase' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                                        {req.type === 'purchase' ? <ShoppingCart size={16} /> : <PackageMinus size={16} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-textMain text-sm">{req.requisition_number}</div>
                                        <div className="text-[10px] text-textMuted">{new Date(req.date).toLocaleDateString('th-TH')} • {req.requested_by}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-textMain">฿{req.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    <div className={`text-[10px] font-bold uppercase ${req.status === 'Completed' ? 'text-[#10b981]' : 'text-textMuted'}`}>{req.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InternalRequisitionTab;
