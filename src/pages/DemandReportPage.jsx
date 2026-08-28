import React, { useState, useEffect, useMemo } from 'react';
import { Package, TrendingUp, AlertTriangle, Search, FileSpreadsheet, Activity, RefreshCw, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { demandReportService } from '../services/demandReportService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';


const DemandReportPage = () => {
    const { showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [monthKeys, setMonthKeys] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isStockExpanded, setIsStockExpanded] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, monthKeys: keys } = await demandReportService.getDemandAnalysisReport();
            setReportData(data);
            setMonthKeys(keys);
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน Demand');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter data
    const filteredData = useMemo(() => {
        return reportData.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            return item.status === statusFilter;
        });
    }, [reportData, searchTerm, statusFilter]);

    // KPI Calculations
    const kpi = useMemo(() => {
        let totalDemand = 0;
        let shortageCount = 0;
        let totalPending = 0;

        reportData.forEach(item => {
            totalDemand += item.averageDemand;
            if (item.status === 'shortage') shortageCount++;
            totalPending += item.pendingCustomerPO;
        });

        return {
            totalProducts: reportData.length,
            shortageCount,
            totalPending,
            avgDemand: totalDemand
        };
    }, [reportData]);

    const formatNumber = (num) => {
        return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    };

    const handleExportCSV = () => {
        if (filteredData.length === 0) {
            showError('ไม่มีข้อมูลสำหรับ Export');
            return;
        }

        // Create CSV Header
        const headers = ['ลำดับ', 'ชื่อสินค้า', ...monthKeys.map(m => `เดือน ${m}`), 'เฉลี่ย/เดือน', 'Forecast (ด.หน้า)', 'ควรที่จะ safty 60%-100%', 'มีอยู่ (FG)', 'มีอยู่ (Raw)', 'มีอยู่ (รวม)', 'ค้างส่งลูกค้า (เดือนนี้)', 'ค้างส่งลูกค้า (ด.หน้า)', 'รอรับ PO ผู้ขาย', 'ยอดรวมที่มี', 'ขาด/ต้องเพิ่ม'];

        // Create CSV Rows
        const rows = filteredData.map((item, index) => {
            const rowData = [
                index + 1,
                `"${item.productName}"`,
                ...monthKeys.map(m => {
                    const h = item.history.find(x => x.month === m);
                    return h ? h.value : 0;
                }),
                item.averageDemand,
                item.customerForecast,
                item.safetyStock,
                item.currentStockFG,
                item.currentStockRaw,
                item.currentStock,
                item.pendingCustomerPO,
                item.pendingCustomerPONextMonth,
                item.pendingSupplierPO,
                item.totalAvailable,
                `${item.totalAvailable - (item.safetyStock + item.pendingCustomerPO)} (${item.status === 'shortage' ? 'ต้องจัดหาเพิ่ม' : item.status === 'low' ? 'ใกล้หมด' : 'เพียงพอ'})`
            ];
            return rowData.join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + '\n' + rows.join('\n');
        const encodedUri = encodeURI(csvContent);

        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Demand_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!hasPermission('warehouses', 'view')) {
        return (
            <div className="p-8 text-center text-error">
                <AlertTriangle className="mx-auto mb-4" size={48} />
                <h2 className="text-2xl font-bold">ไม่มีสิทธิ์เข้าถึง</h2>
                <p>คุณไม่มีสิทธิ์ในการดูรายงานวิเคราะห์ Demand</p>
            </div>
        );
    }

    return (
        <div className="page-container p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-textMain flex items-center gap-3">
                        <Activity className="text-primary" />
                        รายงานวิเคราะห์ Demand Planning
                    </h1>
                    <p className="text-textMuted mt-1">
                        วิเคราะห์ยอดการสั่งซื้อ 4 เดือนย้อนหลัง เพื่อวางแผนการจัดหาสินค้าสำหรับเดือนถัดไป
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="btn btn-secondary flex items-center gap-2"
                        disabled={isLoading}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        รีเฟรช
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-primary flex items-center gap-2"
                        disabled={isLoading || filteredData.length === 0}
                    >
                        <FileSpreadsheet size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="glass-panel p-5 rounded-2xl border border-white/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:bg-blue-500/20"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-textMuted text-sm font-medium mb-1">สินค้าทั้งหมด (รายการ)</p>
                            <h3 className="text-3xl font-bold text-textMain">
                                {isLoading ? '-' : formatNumber(kpi.totalProducts)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Package size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:bg-error/20"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-textMuted text-sm font-medium mb-1">ต้องจัดหาเพิ่ม (รายการ)</p>
                            <h3 className="text-3xl font-bold text-error">
                                {isLoading ? '-' : formatNumber(kpi.shortageCount)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center text-error">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:bg-emerald-500/20"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-textMuted text-sm font-medium mb-1">เฉลี่ย Demand/เดือน (ชิ้น)</p>
                            <h3 className="text-3xl font-bold text-textMain">
                                {isLoading ? '-' : formatNumber(kpi.avgDemand)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-white/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:bg-amber-500/20"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-textMuted text-sm font-medium mb-1">ค้างส่งลูกค้ารวม (ชิ้น)</p>
                            <h3 className="text-3xl font-bold text-amber-500">
                                {isLoading ? '-' : formatNumber(kpi.totalPending)}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Activity size={24} />
                        </div>
                    </div>
                </div>
            </div>



            {/* Table Section */}
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col min-h-[500px] min-w-0 w-full">
                <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5">
                    <h3 className="font-bold text-lg text-textMain">ตารางวิเคราะห์ข้อมูล</h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาสินค้า..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary text-textMain"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary text-textMain"
                        >
                            <option value="all">ทุกสถานะ</option>
                            <option value="shortage">ต้องจัดหาเพิ่ม</option>
                            <option value="low">ใกล้หมด</option>
                            <option value="adequate">เพียงพอ</option>
                        </select>
                    </div>
                </div>

                <div className="table-responsive-wrapper flex-1 min-w-0 min-h-0 overflow-scroll">
                    <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium whitespace-nowrap border border-slate-300 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">สินค้า</th>
                                {isHistoryExpanded && monthKeys.map(m => (
                                    <th key={m} className="p-4 font-medium text-right whitespace-nowrap border border-slate-300 bg-slate-50 text-slate-500" title="ยอดสั่งซื้อย้อนหลัง">{m}</th>
                                ))}
                                <th
                                    className="p-4 font-medium text-right text-emerald-600 whitespace-nowrap border border-slate-300 cursor-pointer hover:bg-emerald-50 transition-colors group"
                                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                                    title="คลิกเพื่อดู/ซ่อน ประวัติ 4 เดือนย้อนหลัง"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        {isHistoryExpanded ? <ChevronRight size={16} className="text-emerald-400 group-hover:text-emerald-600" /> : <ChevronLeft size={16} className="text-emerald-400 group-hover:text-emerald-600" />}
                                        เฉลี่ย/ด.
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-purple-50 text-purple-700 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        Forecast (ด.หน้า)
                                        <Info size={14} className="text-purple-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        ยอดประมาณการสั่งซื้อจากลูกค้าในเดือนหน้า (ถ้ามี)
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-slate-50 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        ควรที่จะ safty 60%-100%
                                        <Info size={14} className="text-slate-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        เป้าหมายสต็อกขั้นต่ำที่ควรมี (ดึงจาก Forecast ถ้าไม่มีใช้ยอดเฉลี่ย 4 เดือนย้อนหลัง)
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                {isStockExpanded && (
                                    <>
                                        <th className="p-4 font-medium text-right whitespace-nowrap bg-blue-50 text-blue-700 border border-slate-300">มีอยู่ (FG)</th>
                                        <th className="p-4 font-medium text-right whitespace-nowrap bg-blue-50 text-blue-700 border border-slate-300">มีอยู่ (Raw)</th>
                                    </>
                                )}
                                <th
                                    className="p-4 font-medium text-right text-indigo-700 whitespace-nowrap bg-indigo-50 border border-slate-300 cursor-pointer hover:bg-indigo-100 transition-colors group"
                                    onClick={() => setIsStockExpanded(!isStockExpanded)}
                                    title="คลิกเพื่อดู/ซ่อน รายละเอียดสต็อก"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        {isStockExpanded ? <ChevronRight size={16} className="text-indigo-400 group-hover:text-indigo-600" /> : <ChevronLeft size={16} className="text-indigo-400 group-hover:text-indigo-600" />}
                                        มีอยู่ (รวม)
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-orange-50 text-orange-700 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        ค้างส่ง (เดือนนี้)
                                        <Info size={14} className="text-orange-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        ยอดสินค้าจาก PO ลูกค้าที่มีกำหนดส่งภายในสิ้นเดือนนี้ และยังไม่ได้ส่งมอบ
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-orange-50/50 text-orange-700 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        ค้างส่ง (ด.หน้า)
                                        <Info size={14} className="text-orange-300" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        ยอดสินค้าจาก PO ลูกค้าที่มีกำหนดส่งในเดือนถัดไป
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-teal-50 text-teal-700 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        รอรับ PO ผู้ขาย
                                        <Info size={14} className="text-teal-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        ยอดสินค้าจาก PO ที่สั่งผู้ขาย (Supplier) ไปแล้วแต่ยังรับของไม่ครบ
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap bg-slate-50 border border-slate-300 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        ยอดรวมที่มี
                                        <Info size={14} className="text-slate-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-56 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        สต็อกรวมทั้งหมด + ยอดรอรับ PO จากผู้ขาย
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                                <th className="p-4 font-medium text-right whitespace-nowrap border border-slate-300 w-32 relative group">
                                    <div className="flex items-center justify-end gap-1">
                                        คงเหลือ/สถานะ
                                        <Info size={14} className="text-slate-400" />
                                    </div>
                                    <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-normal font-normal text-left translate-y-1 group-hover:translate-y-0">
                                        คำนวณจาก:<br/>
                                        <span className="font-bold text-emerald-400">ยอดรวมที่มี</span> - (<span className="font-bold text-slate-300">ควรที่จะ safty</span> + <span className="font-bold text-orange-400">ค้างส่งเดือนนี้</span>)
                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10 + (isHistoryExpanded ? monthKeys.length : 0) + (isStockExpanded ? 2 : 0)} className="p-8 text-center text-textMuted">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                                            กำลังโหลดข้อมูลวิเคราะห์...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={10 + (isHistoryExpanded ? monthKeys.length : 0) + (isStockExpanded ? 2 : 0)} className="p-8 text-center text-textMuted">ไม่พบข้อมูลที่ค้นหา</td>
                                </tr>
                            ) : (
                                filteredData.map((item, index) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 border border-slate-300 sticky left-0 z-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex flex-col min-w-[150px] max-w-[250px]">
                                                <span className="font-bold text-textMain line-clamp-2 whitespace-normal leading-tight" title={item.productName}>
                                                    {item.productName}
                                                </span>
                                                {item.sku && (
                                                    <span className="text-xs text-textMuted mt-1">
                                                        SKU: {item.sku}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {isHistoryExpanded && item.history.map((h, i) => (
                                            <td key={i} className="p-4 text-right text-textMuted border border-slate-300 bg-slate-50/50">
                                                {h.value > 0 ? formatNumber(h.value) : '-'}
                                            </td>
                                        ))}

                                        <td className="p-4 text-right font-bold text-emerald-600 border border-slate-300 bg-emerald-50/30">
                                            {formatNumber(item.averageDemand)}
                                        </td>

                                        <td className="p-4 text-right bg-purple-50/50 text-purple-700 font-medium border border-slate-300">
                                            {item.customerForecast > 0 ? formatNumber(item.customerForecast) : '-'}
                                        </td>

                                        <td className="p-4 text-right bg-slate-50 font-medium text-textMain border border-slate-300">
                                            {formatNumber(item.safetyStock)}
                                        </td>
                                        {isStockExpanded && (
                                            <>
                                                <td className="p-4 text-right bg-blue-50/50 text-blue-700 border border-slate-300">
                                                    {formatNumber(item.currentStockFG)}
                                                </td>
                                                <td className="p-4 text-right bg-blue-50/50 text-blue-700 border border-slate-300">
                                                    {formatNumber(item.currentStockRaw)}
                                                </td>
                                            </>
                                        )}
                                        <td className="p-4 text-right bg-indigo-50/50 text-indigo-700 font-bold border border-slate-300">
                                            {formatNumber(item.currentStock)}
                                        </td>
                                        <td className="p-4 text-right bg-orange-50/50 text-orange-700 font-medium border border-slate-300">
                                            {item.pendingCustomerPO > 0 ? formatNumber(item.pendingCustomerPO) : '-'}
                                        </td>
                                        <td className="p-4 text-right bg-orange-50/30 text-orange-600 font-medium border border-slate-300">
                                            {item.pendingCustomerPONextMonth > 0 ? formatNumber(item.pendingCustomerPONextMonth) : '-'}
                                        </td>
                                        <td className="p-4 text-right bg-teal-50/50 text-teal-700 font-medium border border-slate-300">
                                            {item.pendingSupplierPO > 0 ? formatNumber(item.pendingSupplierPO) : '-'}
                                        </td>
                                        <td className="p-4 text-right bg-slate-50 font-bold border border-slate-300">
                                            {formatNumber(item.totalAvailable)}
                                        </td>

                                        <td className={`p-4 text-right border border-slate-300 ${item.status === 'shortage' ? 'bg-red-50' : ''}`}>
                                            {(() => {
                                                const balance = item.totalAvailable - (item.safetyStock + item.pendingCustomerPO);
                                                const isShortage = balance < 0;
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-bold text-base ${isShortage ? 'text-error' : 'text-emerald-600'}`}>
                                                            {isShortage ? formatNumber(balance) : `+${formatNumber(balance)}`}
                                                        </span>
                                                        <span className={`text-xs mt-1 px-2 py-0.5 rounded-full font-medium ${isShortage
                                                            ? 'bg-error/10 text-error border border-error/20'
                                                            : item.status === 'low'
                                                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                            }`}>
                                                            {isShortage ? 'ต้องจัดหาเพิ่ม' : item.status === 'low' ? 'ใกล้หมด' : 'เพียงพอ'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DemandReportPage;
