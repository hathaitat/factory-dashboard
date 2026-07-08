import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Activity, Factory, TrendingUp, AlertTriangle } from 'lucide-react';
import { productionService } from '../../services/productionService';
import CustomLineChart from './CustomLineChart';

const ProductionTab = () => {
    const navigate = useNavigate();
    
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState({ totalTarget: 0, totalProduced: 0, totalDefect: 0, yieldRate: 0 });
    const [summaryData, setSummaryData] = useState([]);
    const [linesCount, setLinesCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [mets, summary, linesData] = await Promise.all([
                productionService.getOverallMetrics(firstDay, lastDay, null),
                productionService.getProductionSummary(firstDay, lastDay, null),
                productionService.getLines()
            ]);

            setMetrics(mets);
            setSummaryData(summary);
            setLinesCount(linesData.length);
        } catch (error) {
            console.error('Error loading production overview data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = summaryData.slice(0, 10).map(s => ({
        name: s.product_name,
        target: Number(s.total_target),
        produced: Number(s.total_produced)
    }));

    const chartMetrics = [
        { id: 'target', label: 'เป้าหมาย', color: '#3b82f6', chartType: 'bar' },
        { id: 'produced', label: 'ผลิตได้จริง', color: '#10b981', chartType: 'bar' }
    ];

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลการผลิต...</div>;
    }

    return (
        <div className="tab-content">
            {/* KPI Cards */}
            <div className="kpi-grid mb-6">
                <div className="glass-panel kpi-card cursor-pointer" onClick={() => navigate('/dashboard/production')}>
                    <div className="kpi-icon-wrapper blue">
                        <Target size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">เป้าหมายเดือนนี้</span>
                        <span className="kpi-value">{metrics.totalTarget.toLocaleString()} <span className="unit">ชิ้น</span></span>
                    </div>
                </div>

                <div className="glass-panel kpi-card cursor-pointer" onClick={() => navigate('/dashboard/production')}>
                    <div className="kpi-icon-wrapper green">
                        <Activity size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ผลิตได้จริง</span>
                        <span className="kpi-value text-emerald-500">{metrics.totalProduced.toLocaleString()} <span className="unit">ชิ้น</span></span>
                    </div>
                </div>

                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Yield Rate (ผลสำเร็จ)</span>
                        <span className="kpi-value">{metrics.yieldRate}%</span>
                    </div>
                </div>

                <div className="glass-panel kpi-card cursor-pointer" onClick={() => navigate('/dashboard/production/settings')}>
                    <div className="kpi-icon-wrapper orange">
                        <Factory size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">แผนกการผลิต (Active)</span>
                        <span className="kpi-value">{linesCount} <span className="unit">แผนก</span></span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Section */}
                <div className="glass-panel p-4 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="m-0 font-semibold text-primary">Top 10 ผลผลิตเทียบเป้าหมาย</h3>
                    </div>
                    {chartData.length > 0 ? (
                        <div className="flex-1 min-h-0">
                            <CustomLineChart 
                                title=""
                                metrics={chartMetrics}
                                isCategorical={true}
                                categoricalData={chartData}
                                categoryField="name"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-textMuted">
                            <Activity size={48} className="opacity-20 mb-2" />
                            <p>ไม่มีข้อมูลผลผลิตในเดือนนี้</p>
                        </div>
                    )}
                </div>

                {/* Summary Table */}
                <div className="glass-panel p-4 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                        <h3 className="m-0 font-semibold text-primary">รายการที่ของเสียเยอะ (Top Defects)</h3>
                        <button onClick={() => navigate('/dashboard/production')} className="text-sm text-blue-500 hover:underline">ดูทั้งหมด</button>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 pr-2">
                        {summaryData.filter(s => s.total_defect > 0).length > 0 ? (
                            <div className="space-y-3">
                                {summaryData
                                    .filter(s => s.total_defect > 0)
                                    .sort((a, b) => b.total_defect - a.total_defect)
                                    .slice(0, 5)
                                    .map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-bgMain border border-border hover:border-red-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-textMain">{item.product_name}</div>
                                                    <div className="text-xs text-textMuted">เป้า: {Number(item.total_target).toLocaleString()} | ผลิต: {Number(item.total_produced).toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-red-500 text-lg">{Number(item.total_defect).toLocaleString()}</div>
                                                <div className="text-xs text-textMuted">ชิ้น (เสีย)</div>
                                            </div>
                                        </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-emerald-500 h-full">
                                <Activity size={48} className="opacity-20 mb-2" />
                                <p>ยอดเยี่ยม! ไม่มีรายงานของเสียในเดือนนี้</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionTab;
