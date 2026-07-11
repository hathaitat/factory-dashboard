import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Activity, AlertTriangle, TrendingUp, Settings, Plus, Factory, Calendar, Users, Cpu, Trophy, Wrench, AlertCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDeptColorClass } from '../utils/uiUtils';
import ListFilter from '../components/ListFilter';
import { Package } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

const ProductionDashboardPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showError } = useDialog();
    
    const currentDate = new Date();
    
    // Default to this month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const [dateFrom, setDateFrom] = useState(firstDay.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(lastDay.toISOString().split('T')[0]);
    const [period, setPeriod] = useState('month');
    const [lineId, setLineId] = useState(''); // empty means all lines
    
    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([]);
    const [metrics, setMetrics] = useState({ totalTarget: 0, totalProduced: 0, totalDefect: 0, totalRequisition: 0, yieldRate: 0 });
    const [summaryData, setSummaryData] = useState([]);
    const [departmentMetrics, setDepartmentMetrics] = useState([]);
    
    // Performance Panels State
    const [employeePerf, setEmployeePerf] = useState([]);
    const [machinePerf, setMachinePerf] = useState([]);
    const [productGaps, setProductGaps] = useState([]);

    const canEdit = hasPermission('production', 'edit');
    const canCreate = hasPermission('production', 'create');

    useEffect(() => {
        const fetchLines = async () => {
            try {
                const linesData = await productionService.getLines();
                setLines(linesData);
            } catch (error) {
                showError('ไม่สามารถโหลดข้อมูลแผนกผลิตได้');
            }
        };
        fetchLines();
    }, []);

    useEffect(() => {
        loadData();
    }, [dateFrom, dateTo, lineId]);

    const loadData = async () => {
        setIsLoading(true);
        try {

            const [mets, summary, deptMetrics, empPerf, machPerf] = await Promise.all([
                productionService.getOverallMetrics(dateFrom, dateTo, lineId || null),
                productionService.getProductionSummary(dateFrom, dateTo, lineId || null),
                productionService.getDepartmentDashboardMetrics(dateFrom, dateTo),
                productionService.getEmployeePerformance(dateFrom, dateTo, lineId || null),
                productionService.getMachinePerformance(dateFrom, dateTo, lineId || null)
            ]);

            const gaps = await productionService.getProductGapAnalysis(summary);

            setMetrics(mets);
            setSummaryData(summary);
            setDepartmentMetrics(deptMetrics);
            setEmployeePerf(empPerf);
            setMachinePerf(machPerf);
            setProductGaps(gaps);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('ไม่สามารถโหลดข้อมูล Dashboard ได้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <PageHeader 
                title="ภาพรวมการผลิต" 
                subtitle="สรุปผลการปฏิบัติงาน เทียบเป้าหมายกับผลผลิตจริง" 
            />

            <ListFilter 
                hasActiveFilters={true}
                onClear={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFrom(today);
                    setDateTo(today);
                    setPeriod('day');
                    setLineId('');
                }}
                filters={[
                    {
                        type: 'date-range',
                        value: period,
                        onChange: (val) => {
                            setPeriod(val);
                            const now = new Date();
                            if (val === 'day') {
                                const today = now.toISOString().split('T')[0];
                                setDateFrom(today);
                                setDateTo(today);
                            } else if (val === 'week') {
                                const first = now.getDate() - now.getDay();
                                const last = first + 6;
                                setDateFrom(new Date(now.setDate(first)).toISOString().split('T')[0]);
                                setDateTo(new Date(now.setDate(last)).toISOString().split('T')[0]);
                            } else if (val === 'month') {
                                setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                                setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
                            } else if (val === 'year') {
                                setDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
                                setDateTo(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]);
                            }
                        },
                        options: [
                            { value: 'day', label: 'วันนี้ (Day)' },
                            { value: 'week', label: 'สัปดาห์นี้ (Week)' },
                            { value: 'month', label: 'เดือนนี้ (Month)' },
                            { value: 'year', label: 'ปีนี้ (Year)' }
                        ],
                        dateFrom: dateFrom,
                        onDateFromChange: setDateFrom,
                        dateTo: dateTo,
                        onDateToChange: setDateTo
                    },
                    {
                        type: 'select',
                        label: 'แผนกการผลิต',
                        value: lineId,
                        onChange: setLineId,
                        options: [
                            { value: '', label: 'ทุกแผนกการผลิต' },
                            ...lines.map(l => ({ value: l.id, label: l.name }))
                        ]
                    }
                ]}
            />

            <div className="flex justify-end mb-6 gap-2">
                {canCreate && (
                    <>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/production/plans')}>
                            <Target size={18} className="mr-1" /> จัดการเป้าหมาย
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/production/requisitions/new')}>
                            <Package size={18} className="mr-1" /> เบิกวัตถุดิบ
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard/production/daily-log')}>
                            <Plus size={18} className="mr-1" /> ลงผลผลิต
                        </button>
                    </>
                )}
                {canEdit && (
                    <button className="btn btn-secondary" onClick={() => navigate('/dashboard/production/settings')}>
                        <Settings size={18} className="mr-1" /> ตั้งค่าแผนก
                    </button>
                )}
            </div>

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {/* Department Cards */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-textMain mb-4 flex items-center gap-2">
                            <Factory size={20} className="text-primary" />
                            สรุปรายแผนก
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(lineId ? departmentMetrics.filter(d => d.line_id === lineId) : departmentMetrics).map((dept, index) => {
                                const successRate = dept.total_target > 0 
                                    ? ((dept.total_produced / dept.total_target) * 100).toFixed(1)
                                    : 0;
                                    
                                return (
                                    <div key={dept.line_id} className={`rounded-xl p-5 border-2 shadow-md flex flex-col transition-all group hover:shadow-lg ${getDeptColorClass(index)}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-bold text-textMain text-xl group-hover:text-primary transition-colors">{dept.line_name}</div>
                                                <div className="text-xs text-textMuted mt-1">สรุปข้อมูลประจำช่วงเวลาที่เลือก</div>
                                            </div>
                                            <div className="bg-white/50 p-2 rounded-lg text-primary shadow-sm">
                                                <Factory size={20} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-white/60 rounded-lg p-3 border border-white/50 text-center shadow-sm">
                                                <div className="text-xs text-textMuted mb-1">เป้าหมายผลิต</div>
                                                <div className="font-bold text-textMain">{Number(dept.total_target).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-3 border border-white/50 text-center shadow-sm">
                                                <div className="text-xs text-emerald-600 mb-1">ผลิตได้จริง</div>
                                                <div className="font-bold text-emerald-600">{Number(dept.total_produced).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-3 border border-white/50 text-center shadow-sm">
                                                <div className="text-xs text-textMuted mb-1">เบิกวัตถุดิบ</div>
                                                <div className="font-bold text-orange-500">{Number(dept.total_requisition).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-3 border border-white/50 text-center shadow-sm">
                                                <div className="text-xs text-textMuted mb-1">คืนวัตถุดิบ</div>
                                                <div className="font-bold text-pink-500">{Number(dept.total_return).toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-black/5 text-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="text-textMuted">ความสำเร็จ: <span className="font-semibold text-emerald-600">{successRate}%</span></div>
                                                <div className="text-textMuted">ของเสีย: <span className="font-semibold text-red-500">{Number(dept.total_defect).toLocaleString()}</span></div>
                                            </div>
                                            <div className="flex items-center justify-between bg-white/40 rounded px-2 py-1 shadow-sm">
                                                <div className="flex items-center gap-1.5 text-textMuted text-xs font-medium" title="จำนวนเครื่องจักรที่ใช้งาน">
                                                    <Cpu size={14} className="text-primary/70" /> 
                                                    <span>{dept.machine_count} เครื่อง</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-textMuted text-xs font-medium" title="จำนวนพนักงานที่ปฏิบัติงาน">
                                                    <Users size={14} className="text-primary/70" /> 
                                                    <span>{dept.employee_count} คน</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="kpi-grid mb-6">
                        <div className="glass-panel kpi-card">
                            <div className="kpi-icon-wrapper blue">
                                <Target size={24} />
                            </div>
                            <div className="kpi-content">
                                <span className="kpi-label">เป้าหมายรวมเดือนนี้</span>
                                <span className="kpi-value">{metrics.totalTarget.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="glass-panel kpi-card">
                            <div className="kpi-icon-wrapper orange">
                                <Package size={24} />
                            </div>
                            <div className="kpi-content">
                                <span className="kpi-label">ยอดเบิกวัตถุดิบรวม</span>
                                <span className="kpi-value text-orange-500">{metrics.totalRequisition.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="glass-panel kpi-card">
                            <div className="kpi-icon-wrapper green">
                                <Activity size={24} />
                            </div>
                            <div className="kpi-content">
                                <span className="kpi-label">ผลิตได้จริง</span>
                                <span className="kpi-value text-emerald-500">{metrics.totalProduced.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="glass-panel kpi-card">
                            <div className="kpi-icon-wrapper red">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="kpi-content">
                                <span className="kpi-label">ของเสีย</span>
                                <span className="kpi-value text-red-500">{metrics.totalDefect.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="glass-panel kpi-card">
                            <div className="kpi-icon-wrapper purple">
                                <TrendingUp size={24} />
                            </div>
                            <div className="kpi-content">
                                <span className="kpi-label">เปอร์เซ็นต์ของดี</span>
                                <span className="kpi-value">{metrics.yieldRate}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                        
                        {/* Panel 1: Top Employees */}
                        <div className="glass-panel overflow-hidden flex flex-col h-[400px]">
                            <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50/50 to-transparent flex items-center gap-2">
                                <Trophy className="text-blue-500" size={20} />
                                <h3 className="m-0 font-semibold text-textMain">Top พนักงาน (Yield สูง)</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0">
                                {employeePerf.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-bgMain/50 sticky top-0">
                                            <tr className="text-textMuted">
                                                <th className="py-2 px-4">ชื่อ</th>
                                                <th className="py-2 px-4 text-right">ยอดผลิต</th>
                                                <th className="py-2 px-4 text-right">% ของดี</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employeePerf.map((emp, idx) => (
                                                <tr key={emp.employee_id} className="border-b border-border hover:bg-bgMain/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-textMain flex items-center gap-2">
                                                            {idx < 3 && <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : 'bg-orange-300'}`}>{idx + 1}</span>}
                                                            {emp.employee_name}
                                                        </div>
                                                        <div className="text-xs text-textMuted">{emp.line_name} ({emp.work_days} วัน)</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium">{Number(emp.total_produced).toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            emp.yield_rate >= 95 ? 'bg-emerald-100 text-emerald-700' : 
                                                            emp.yield_rate >= 90 ? 'bg-blue-100 text-blue-700' : 
                                                            'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            {emp.yield_rate}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-textMuted">
                                        <Users className="opacity-20 mb-2" size={32} />
                                        <p>ไม่มีข้อมูลพนักงาน</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panel 2: Machine Performance */}
                        <div className="glass-panel overflow-hidden flex flex-col h-[400px]">
                            <div className="p-4 border-b border-border bg-gradient-to-r from-purple-50/50 to-transparent flex items-center gap-2">
                                <Wrench className="text-purple-500" size={20} />
                                <h3 className="m-0 font-semibold text-textMain">ประสิทธิภาพเครื่องจักร</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0">
                                {machinePerf.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-bgMain/50 sticky top-0">
                                            <tr className="text-textMuted">
                                                <th className="py-2 px-4">เครื่องจักร</th>
                                                <th className="py-2 px-4 text-right">ยอดผลิต</th>
                                                <th className="py-2 px-4 text-right">ของเสีย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {machinePerf.map((mac) => (
                                                <tr key={mac.machine_id} className="border-b border-border hover:bg-bgMain/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-textMain">{mac.machine_name}</div>
                                                        <div className="text-xs text-textMuted">{mac.line_name} ({mac.work_days} วัน)</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium">{Number(mac.total_produced).toLocaleString()}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className={mac.total_defect > 0 ? 'text-red-500' : 'text-textMuted'}>
                                                            {Number(mac.total_defect).toLocaleString()}
                                                        </div>
                                                        {mac.yield_rate > 0 && <div className="text-xs text-emerald-600">{mac.yield_rate}%</div>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-textMuted">
                                        <Cpu className="opacity-20 mb-2" size={32} />
                                        <p>ไม่มีข้อมูลเครื่องจักร</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panel 3: Product Gap Analysis */}
                        <div className="glass-panel overflow-hidden flex flex-col h-[400px]">
                            <div className="p-4 border-b border-border bg-gradient-to-r from-orange-50/50 to-transparent flex items-center gap-2">
                                <AlertCircle className="text-orange-500" size={20} />
                                <h3 className="m-0 font-semibold text-textMain">สินค้าที่ต้อง Follow Up (ขาดเป้า)</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0">
                                {productGaps.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-bgMain/50 sticky top-0">
                                            <tr className="text-textMuted">
                                                <th className="py-2 px-4">สินค้า</th>
                                                <th className="py-2 px-4 text-right">เป้า/ทำได้</th>
                                                <th className="py-2 px-4 text-right">ขาดอีก</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productGaps.map((prod, idx) => (
                                                <tr key={idx} className="border-b border-border hover:bg-bgMain/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-textMain line-clamp-1" title={prod.product_name}>{prod.product_name}</div>
                                                        <div className="text-xs text-textMuted">{prod.line_name}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="text-xs text-textMuted">เป้า: {Number(prod.total_target).toLocaleString()}</div>
                                                        <div className="text-xs font-medium text-emerald-600">ได้: {Number(prod.total_produced).toLocaleString()}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className={`font-bold ${
                                                            prod.percent_success < 50 ? 'text-red-500' :
                                                            prod.percent_success < 90 ? 'text-orange-500' :
                                                            'text-blue-500'
                                                        }`}>
                                                            {Number(prod.gap).toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-textMuted text-right">{prod.percent_success}%</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-textMuted">
                                        <Package className="opacity-20 mb-2" size={32} />
                                        <p>ถึงเป้าหมายทุกรายการ 🚀</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Table */}
                    {summaryData.length > 0 && (
                        <div className="glass-panel overflow-hidden">
                            <div className="p-4 border-b border-border bg-bgMain/50">
                                <h3 className="m-0 font-semibold text-primary">รายละเอียดรายสินค้า</h3>
                            </div>
                            <div className="table-responsive-wrapper overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b-2 border-border text-textMuted text-sm">
                                            <th className="py-3 px-4">แผนก</th>
                                            <th className="py-3 px-4">ชื่อสินค้า / ชิ้นงาน</th>
                                            <th className="py-3 px-4 text-right">เป้าหมายรวม</th>
                                            <th className="py-3 px-4 text-right">ยอดเบิกวัตถุดิบ</th>
                                            <th className="py-3 px-4 text-right">ผลิตได้จริง</th>
                                            <th className="py-3 px-4 text-right">ของเสีย</th>
                                            <th className="py-3 px-4 text-center">% สำเร็จ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryData.map((row, idx) => (
                                            <tr key={idx} className="border-b border-border hover:bg-bgMain transition-colors">
                                                <td className="py-3 px-4 text-textMuted">{row.line_name || '-'}</td>
                                                <td className="py-3 px-4 font-medium">{row.product_name}</td>
                                                <td className="py-3 px-4 text-right">{Number(row.total_target).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-orange-500">{Number(row.total_requisition).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-emerald-500 font-semibold">{Number(row.total_produced).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-red-500">{Number(row.total_defect).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                        row.percent_success >= 90 ? 'bg-green-100 text-green-700' :
                                                        row.percent_success >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {Number(row.percent_success).toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductionDashboardPage;
