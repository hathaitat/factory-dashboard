import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, Calendar, FileText, ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { productionMaterialService } from '../services/productionMaterialService';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDeptColorClass } from '../utils/uiUtils';

const ProductionReturnDepartmentListPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([]);
    const [monthlySummary, setMonthlySummary] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const current = new Date();
            const dateFrom = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().split('T')[0];
            const dateTo = new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().split('T')[0];

            const [linesData, returns] = await Promise.all([
                productionService.getLines(),
                productionMaterialService.getReturns({ dateFrom, dateTo })
            ]);
            
            setLines(linesData || []);
            
            // Map summary data by line_id
            const summaryMap = {};
            if (Array.isArray(returns)) {
                returns.forEach(ret => {
                    const lineId = ret.line_id;
                    if (!summaryMap[lineId]) {
                        summaryMap[lineId] = { ret_count: 0, total_items: 0 };
                    }
                    summaryMap[lineId].ret_count++;
                    summaryMap[lineId].total_items += (ret.items?.length || 0);
                });
            }
            setMonthlySummary(summaryMap);
        } catch (error) {
            console.error('Error loading returns summary:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <button onClick={() => navigate('/dashboard/production')} className="btn btn-secondary mb-4">
                ← กลับหน้าหลักการผลิต
            </button>
            <PageHeader
                title="ประวัติการคืนวัตถุดิบ"
                subtitle="เลือกแผนกเพื่อดูรายการคืนวัตถุดิบจากแผนกกลับเข้าคลัง"
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
                            const summary = monthlySummary[line.id] || { ret_count: 0, total_items: 0 };

                            return (
                                <div key={line.id} className={`rounded-xl p-5 border-2 shadow-md flex flex-col justify-between transition-all cursor-pointer group hover:shadow-lg ${getDeptColorClass(index)}`} onClick={() => navigate(`/dashboard/production/returns/line/${line.id}`)}>
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
                                                <Calendar size={12} /> ข้อมูลใบคืนเดือนนี้ ({new Date().toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })})
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">จำนวนเอกสารใบคืน:</span>
                                                <span className="font-medium">{summary.ret_count.toLocaleString()} ใบ</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-textMuted">จำนวนรายการรวม:</span>
                                                <span className="font-bold text-emerald-500">{summary.total_items.toLocaleString()} รายการ</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button className="btn btn-primary w-full shadow-md group-hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4">
                                        <FileText size={18} /> ดูประวัติการคืน
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

export default ProductionReturnDepartmentListPage;
