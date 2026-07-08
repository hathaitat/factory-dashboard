import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Calendar, FileEdit, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDeptColorClass } from '../utils/uiUtils';

const ProductionDailyLogListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([]);
    const [dailySummary, setDailySummary] = useState({});

    // Current date string (YYYY-MM-DD)
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
                productionService.getLogSummaryByDate(new Date().toISOString().slice(0, 10))
            ]);
            setLines(linesData || []);
            
            // Map summary data by line_id
            const summaryMap = {};
            if (Array.isArray(summaryData)) {
                summaryData.forEach(item => {
                    summaryMap[item.line_id] = item;
                });
            }
            setDailySummary(summaryMap);
        } catch (error) {
            console.error('Error loading daily logs summary:', error);
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
                title="บันทึกผลผลิตรายวัน"
                subtitle="เลือกแผนกเพื่อบันทึกผลผลิตประจำวัน"
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
                            const summary = dailySummary[line.id] || { log_count: 0, total_good: 0, total_reject: 0 };

                            return (
                                <div key={line.id} className={`rounded-xl p-5 border-2 shadow-md flex flex-col justify-between transition-all cursor-pointer group hover:shadow-lg ${getDeptColorClass(index)}`} onClick={() => navigate(`/dashboard/production/daily-log/edit/${currentMonthStr}/${line.id}`)}>
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
                                                <Calendar size={12} /> ข้อมูลผลผลิตวันนี้ ({new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })})
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">จำนวนรายการบันทึก:</span>
                                                <span className="font-medium">{summary.log_count.toLocaleString()} รายการ</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">ยอดดี:</span>
                                                <span className="font-bold text-emerald-500">{summary.total_good.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">ยอดเสีย:</span>
                                                <span className="font-bold text-red-500">{summary.total_reject.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button className="btn btn-primary w-full shadow-md group-hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4">
                                        <FileEdit size={18} /> บันทึกผลผลิตรายวัน
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

export default ProductionDailyLogListPage;
