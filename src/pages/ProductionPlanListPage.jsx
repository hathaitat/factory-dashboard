import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Factory, Edit2, Calendar, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDeptColorClass } from '../utils/uiUtils';

const ProductionPlanListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([]);
    const [monthSummary, setMonthSummary] = useState({});

    // Current month string (YYYY-MM)
    const currentDate = new Date();
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [linesData, summaryData] = await Promise.all([
                productionService.getLines(),
                productionService.getPlanSummaryByMonth(currentMonthStr)
            ]);
            setLines(linesData);
            
            // Map summary data by line_id
            const summaryMap = {};
            if (Array.isArray(summaryData)) {
                summaryData.forEach(item => {
                    summaryMap[item.line_id] = item;
                });
            }
            setMonthSummary(summaryMap);
        } catch (error) {
            console.error('Error loading plans summary:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <button onClick={() => navigate('/dashboard/production')} className="btn btn-secondary mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> กลับหน้าหลักการผลิต
            </button>
            <PageHeader
                title="เป้าหมายการผลิต"
                subtitle="จัดการเป้าหมายการผลิตรายวัน แยกตามแผนก"
            />

            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <Factory size={20} /> รายชื่อแผนกการผลิต
                    </h3>
                </div>

                {isLoading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lines.map((line, index) => {
                            const summary = monthSummary[line.id] || { item_count: 0, total_target: 0 };
                            const hasPlan = summary.item_count > 0;

                            return (
                                <div key={line.id} className={`rounded-xl p-5 border-2 shadow-md flex flex-col justify-between transition-all cursor-pointer group hover:shadow-lg ${getDeptColorClass(index)}`} onClick={() => navigate(`/dashboard/production/plans/edit/${currentMonthStr}/${line.id}`)}>
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-bold text-textMain text-xl group-hover:text-primary transition-colors">{line.name}</div>
                                                <div className="text-xs text-textMuted mt-1">รหัส: {line.code}</div>
                                            </div>
                                            <div className="bg-white/50 p-2 rounded-lg text-primary shadow-sm">
                                                <Factory size={20} />
                                            </div>
                                        </div>

                                        <div className="bg-white/60 rounded-lg p-3 mb-4 space-y-2 border border-white/50 shadow-sm">
                                            <div className="text-xs font-semibold text-textMuted mb-1 flex items-center gap-1">
                                                <Calendar size={12} /> สรุปเป้าหมายเดือนปัจจุบัน ({new Date().toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })})
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">จำนวนสินค้า:</span>
                                                <span className="font-medium">{summary.item_count.toLocaleString()} รายการ</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">เป้าหมายรวม:</span>
                                                <span className="font-bold text-emerald-500">{summary.total_target.toLocaleString()} หน่วย</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary w-full shadow-md group-hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/dashboard/production/plans/edit/${currentMonthStr}/${line.id}`);
                                        }}
                                    >
                                        {hasPlan ? (
                                            <><Edit2 size={18} /> จัดการเป้าหมายการผลิต</>
                                        ) : (
                                            <><Plus size={18} /> ตั้งเป้าหมายใหม่</>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionPlanListPage;
