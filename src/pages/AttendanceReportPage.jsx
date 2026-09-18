import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Printer, Search, FileText } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import { companyService } from '../services/companyService';
import PageHeader from '../components/PageHeader';

const AttendanceReportPage = () => {
    const today = new Date();
    // Default to Dec of previous year to Nov of current year
    const defaultEnd = `${today.getFullYear()}-11`;
    const defaultStart = `${today.getFullYear() - 1}-12`;

    const [startMonth, setStartMonth] = useState(defaultStart);
    const [endMonth, setEndMonth] = useState(defaultEnd);
    const [searchedStartMonth, setSearchedStartMonth] = useState(defaultStart);
    const [searchedEndMonth, setSearchedEndMonth] = useState(defaultEnd);
    
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [company, setCompany] = useState(null);
    const printRef = useRef(null);
    const [printZoom, setPrintZoom] = useState(1);

    const loadData = async () => {
        if (!startMonth || !endMonth) return;
        setIsLoading(true);
        try {
            const startDate = `${startMonth}-01`;
            const endYear = parseInt(endMonth.split('-')[0]);
            const endM = parseInt(endMonth.split('-')[1]);
            const lastDay = new Date(endYear, endM, 0).getDate();
            const endDate = `${endMonth}-${lastDay.toString().padStart(2, '0')}`;

            const [{ periods, entries }, employeesData, companyInfo] = await Promise.all([
                payrollService.getAttendanceReportData(startDate, endDate),
                employeeService.getEmployees(),
                companyService.getCompanyInfo()
            ]);

            setCompany(companyInfo);

            const periodsByMonth = {};
            periods.forEach(p => {
                const pDate = new Date(p.start_date);
                const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
                if (!periodsByMonth[key]) {
                    periodsByMonth[key] = {
                        label: pDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                        periods: []
                    };
                }
                periodsByMonth[key].periods.push(p);
            });

            const monthKeys = Object.keys(periodsByMonth).sort();
            
            monthKeys.forEach(k => {
                periodsByMonth[k].periods.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            });

            const activeEmployees = employeesData.filter(e => e.status === 'Active' || entries.some(ent => ent.employee_id === e.id));
            
            const getTenure = (startDate) => {
                if (!startDate) return '-';
                const start = new Date(startDate);
                const now = new Date();
                let years = now.getFullYear() - start.getFullYear();
                let months = now.getMonth() - start.getMonth();
                if (months < 0) {
                    years--;
                    months += 12;
                }
                if (years === 0 && months === 0) return 'ไม่ถึงเดือน';
                if (years === 0) return `${months} เดือน`;
                return `${years} ปี ${months} เดือน`;
            };

            const dataRows = activeEmployees.map(emp => {
                const empEntries = entries.filter(e => e.employee_id === emp.id);
                
                let totalPct = 0;
                let validCount = 0;
                const periodValues = {};

                periods.forEach(p => {
                    const entry = empEntries.find(e => e.period_id === p.id);
                    let pct = null; // null means no entry/not applicable
                    if (entry && p.working_days > 0) {
                        pct = (Number(entry.actual_working_days || 0) / Number(p.working_days)) * 100;
                        pct = Math.min(100, Math.max(0, pct)); // clamp 0-100
                        totalPct += pct;
                        validCount++;
                    }
                    periodValues[p.id] = pct;
                });

                const avgPct = validCount > 0 ? (totalPct / validCount) : 0;
                
                let score = 0;
                if (validCount > 0) {
                    if (avgPct < 96.5) score = 1;
                    else if (avgPct >= 96.5 && avgPct < 97.5) score = 2;
                    else if (avgPct >= 97.5 && avgPct < 98.5) score = 3;
                    else if (avgPct >= 98.5) score = 4;
                }

                return {
                    employee: emp,
                    tenure: getTenure(emp.start_date),
                    periodValues,
                    avgPct,
                    score,
                    validCount
                };
            });

            // Sort by code, or by name if code doesn't exist
            dataRows.sort((a, b) => {
                const codeA = a.employee.code || '';
                const codeB = b.employee.code || '';
                if (codeA && codeB) return codeA.localeCompare(codeB);
                return (a.employee.full_name || '').localeCompare(b.employee.full_name || '');
            });

            setReportData({
                monthKeys,
                periodsByMonth,
                periods,
                rows: dataRows
            });
            setSearchedStartMonth(startMonth);
            setSearchedEndMonth(endMonth);

        } catch (error) {
            console.error('Error loading attendance report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []); // Initial load

    const fitForPrint = useCallback(() => {
        const el = printRef.current;
        if (!el) return 1;
        const content = el.querySelector('.print-content');
        if (!content) return 1;

        el.classList.add('print-metrics');
        const contentWidth = Math.max(content.scrollWidth, Math.ceil(content.getBoundingClientRect().width));
        const contentHeight = Math.max(el.scrollHeight, Math.ceil(el.getBoundingClientRect().height));
        el.classList.remove('print-metrics');

        const PRINTABLE_WIDTH = 1050;
        const PRINTABLE_HEIGHT = 720; // Use more vertical space
        
        if (!contentWidth || !contentHeight) return 1;
        
        const zoomWidth = Math.max(0.2, Math.min(1.4, PRINTABLE_WIDTH / contentWidth));
        const zoomHeight = Math.max(0.2, Math.min(1.4, PRINTABLE_HEIGHT / contentHeight));
        
        const zoom = Math.min(zoomWidth, zoomHeight);
        setPrintZoom(Number(zoom.toFixed(4)));
        return zoom;
    }, []);

    useLayoutEffect(() => {
        if (!isLoading && reportData?.rows?.length > 0) fitForPrint();
    }, [isLoading, reportData, fitForPrint]);

    const handlePrint = () => {
        fitForPrint();
        setTimeout(() => window.print(), 100);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col print-root">
            <style>
                {`
                    .print-wrapper.print-metrics .report-table,
                    .print-wrapper.print-metrics .report-table th,
                    .print-wrapper.print-metrics .report-table td {
                        font-size: 13px !important;
                        padding: 4px 2px !important;
                        line-height: 1.2 !important;
                        white-space: nowrap !important;
                        min-width: 0 !important;
                    }

                    @media print {
                        .hide-on-print { display: none !important; }
                        @page { size: A4 landscape; margin: 5mm; }
                        .print-root { min-height: 0 !important; background: #fff !important; }
                        html, body {
                            width: auto !important;
                            height: auto !important;
                            background: #fff;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print-wrapper {
                            zoom: var(--print-zoom, 1);
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            overflow: visible !important;
                            box-sizing: border-box;
                            min-height: calc(190mm / var(--print-zoom, 1));
                            display: flex;
                            flex-direction: column;
                        }
                        .print-scroll, .print-content {
                            overflow: visible !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            flex: 1 1 auto;
                        }
                        .print-wrapper .report-table {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            table-layout: auto !important;
                        }
                        .print-wrapper .report-table th,
                        .print-wrapper .report-table td {
                            font-size: 13px !important;
                            padding: 4px 2px !important;
                            line-height: 1.2 !important;
                            white-space: normal !important;
                            overflow-wrap: anywhere !important;
                        }
                        .notes-section { margin-top: auto !important; max-width: 100% !important; }
                        .report-table, .notes-section { break-inside: avoid; page-break-inside: avoid; }
                    }
                `}
            </style>

            <div className="hide-on-print px-4 sm:px-6 py-4 lg:px-8">
                <PageHeader 
                    title="รายงานเวลาทำงาน (% Attendance)"
                    icon={<FileText className="text-blue-500" size={28} />}
                    subtitle="จัดการข้อมูลและพิมพ์สรุปรายงานการมาทำงานของพนักงาน"
                />

                <div className="mb-4 py-3 px-4 bg-gradient-to-br from-blue-500/[0.04] to-purple-500/[0.04] border border-blue-500/[0.12] rounded-xl flex items-center gap-3 flex-wrap relative">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-gradient-to-br from-blue-500 to-purple-500">
                        <Search size={15} className="text-white" />
                    </div>

                    <div className="flex flex-col gap-[2px]">
                        <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">ตั้งแต่เดือน</span>
                        <input 
                            type="month" 
                            value={startMonth} 
                            onChange={e => setStartMonth(e.target.value)}
                            className="glass-input py-[0.4rem] px-[0.7rem] rounded-lg text-[0.85rem] outline-none min-w-[120px] font-medium"
                        />
                    </div>

                    <span className="text-textMuted text-[0.8rem] self-end mb-[6px]">—</span>

                    <div className="flex flex-col gap-[2px]">
                        <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">ถึงเดือน</span>
                        <input 
                            type="month" 
                            value={endMonth} 
                            onChange={e => setEndMonth(e.target.value)}
                            className="glass-input py-[0.4rem] px-[0.7rem] rounded-lg text-[0.85rem] outline-none min-w-[120px] font-medium"
                        />
                    </div>

                    <div className="w-[1px] h-7 bg-gray-300 self-end mb-1 opacity-60 ml-2" />

                    <button 
                        onClick={loadData}
                        className="ml-2 btn-primary flex items-center gap-2 px-4 py-[0.4rem] text-[0.85rem] h-auto"
                    >
                        ค้นหา
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={handlePrint}
                        className="btn-primary flex items-center gap-2 px-4 py-[0.4rem] text-[0.85rem] h-auto bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading || !reportData?.rows?.length}
                    >
                        <Printer size={16} /> พิมพ์รายงาน
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="loading-spinner w-12 h-12"></div>
                </div>
            ) : reportData ? (
                <div ref={printRef} style={{ '--print-zoom': printZoom }} className="p-4 w-full bg-white flex-1 print-wrapper">
                    <div className="mb-4 print:mb-2 text-center relative flex flex-col items-center">
                        {company?.logoUrl && (
                            <img 
                                src={company.logoUrl} 
                                alt="Company Logo" 
                                className="h-12 sm:h-16 mb-2 object-contain" 
                            />
                        )}
                        {company?.name && <h2 className="text-lg font-bold m-0 text-gray-800">{company.name}</h2>}
                        <h1 className={`text-xl font-bold m-0 text-gray-900 ${company?.name ? 'mt-1' : ''}`}>% Attendance รายงานเวลาทำงาน</h1>
                        <h2 className="text-sm font-medium m-0 text-gray-600 mt-1">
                            ประจำช่วงเดือน {searchedStartMonth} ถึง {searchedEndMonth}
                        </h2>
                    </div>

                    <div className="print-scroll overflow-x-auto w-full print:overflow-visible shadow-sm border border-gray-200 print:shadow-none print:border-none">
                        <div className="print-content min-w-max">
                            <table className="report-table w-full border-collapse border border-gray-400 text-xs text-gray-800 font-sans bg-white">
                                <thead>
                                    <tr className="bg-gray-100 text-center font-bold">
                                        <th rowSpan="2" className="border border-gray-400 p-1 w-10">ลำดับ</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1">รหัส</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1 text-left min-w-[120px]">ชื่อ - สกุล</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1">อายุงาน</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1">วันเริ่มงาน</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1">ตำแหน่ง</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1">Line</th>
                                        
                                        {reportData.monthKeys.map(k => (
                                            <th key={k} colSpan={reportData.periodsByMonth[k].periods.length} className="border border-gray-400 p-1">
                                                {reportData.periodsByMonth[k].label}
                                            </th>
                                        ))}
                                        
                                        <th rowSpan="2" className="border border-gray-400 p-1 w-16">% Attendance</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1 w-16">ระดับคะแนน</th>
                                        <th rowSpan="2" className="border border-gray-400 p-1 w-20">ลงลายมือชื่อ</th>
                                    </tr>
                                    <tr className="bg-gray-100 text-center font-bold">
                                        {reportData.monthKeys.map(k => (
                                            reportData.periodsByMonth[k].periods.map((p, idx) => (
                                                <th key={p.id} className="border border-gray-400 p-1 min-w-[30px]">
                                                    W {idx + 1}
                                                </th>
                                            ))
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={10 + reportData.periods.length} className="border border-gray-400 p-4 text-center text-gray-500">
                                                ไม่มีข้อมูลในช่วงเวลาที่เลือก
                                            </td>
                                        </tr>
                                    ) : (
                                        reportData.rows.map((row, index) => (
                                            <tr key={row.employee.id} className="text-center hover:bg-gray-50">
                                                <td className="border border-gray-400 p-1">{index + 1}</td>
                                                <td className="border border-gray-400 p-1">{row.employee.code || '-'}</td>
                                                <td className="border border-gray-400 p-1 text-left">{row.employee.full_name}</td>
                                                <td className="border border-gray-400 p-1 text-[10px] whitespace-nowrap">{row.tenure}</td>
                                                <td className="border border-gray-400 p-1">
                                                    {row.employee.start_date ? new Date(row.employee.start_date).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="border border-gray-400 p-1">{row.employee.position || '-'}</td>
                                                <td className="border border-gray-400 p-1">{row.employee.position || '-'}</td>
                                                
                                                {reportData.monthKeys.map(k => (
                                                    reportData.periodsByMonth[k].periods.map(p => {
                                                        const pct = row.periodValues[p.id];
                                                        return (
                                                            <td key={p.id} className="border border-gray-400 p-1 text-[10px]">
                                                                {pct !== null ? `${Math.round(pct)}%` : '-'}
                                                            </td>
                                                        );
                                                    })
                                                ))}
                                                
                                                <td className="border border-gray-400 p-1 font-bold bg-blue-50/30">
                                                    {row.validCount > 0 ? `${row.avgPct.toFixed(2)}%` : '-'}
                                                </td>
                                                <td className="border border-gray-400 p-1 font-bold text-blue-700 bg-blue-50/50">
                                                    {row.validCount > 0 ? row.score : '-'}
                                                </td>
                                                <td className="border border-gray-400 p-1"></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Remark & Signatures Section */}
                    <div className="mt-4 flex flex-wrap justify-between items-end text-sm notes-section w-full border-t border-gray-200 pt-3 print:border-none print:pt-2 print:mt-2 gap-4">
                        {/* Remark (Left) */}
                        <div className="border border-gray-300 p-2 sm:p-3 text-[10px] sm:text-[11px] w-full max-w-[55%] rounded text-left bg-gray-50/50 flex gap-4 print:gap-3 flex-shrink">
                            <div className="min-w-max">
                                <div className="font-bold mb-1 text-gray-700 underline">ระดับคะแนน</div>
                                <div className="space-y-1 text-gray-600 font-mono">
                                    <div>1 &nbsp;&nbsp;&nbsp;&nbsp; X &lt; 96.5%</div>
                                    <div>2 &nbsp;&nbsp;&nbsp;&nbsp; 96.5 &lt;= X &lt; 97.5</div>
                                    <div>3 &nbsp;&nbsp;&nbsp;&nbsp; 97.5 &lt;= X &lt; 98.5</div>
                                    <div>4 &nbsp;&nbsp;&nbsp;&nbsp; X &gt;= 98.5%</div>
                                </div>
                            </div>
                            <div>
                                <div className="font-bold mb-1 text-gray-700 underline">หมายเหตุ การคำนวณ</div>
                                <div className="text-gray-600 leading-relaxed">
                                    <ul className="list-disc pl-4 m-0 space-y-1">
                                        <li>% Attendance (X) = ค่าเฉลี่ยของการมาทำงานในรอบนั้นๆ</li>
                                        <li>สูตร: ( จำนวนวันทำงานจริง / จำนวนวันทำการของรอบบิล ) × 100</li>
                                        <li>ช่อง Line จะดึงข้อมูลจากตำแหน่ง (Position) มาแสดง</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Signatures (Right) */}
                        <div className="flex gap-4 sm:gap-8 text-center text-[10px] sm:text-[11px] flex-shrink-0 justify-end ml-auto">
                            <div className="flex flex-col items-center">
                                <div className="mb-2 text-left w-full text-gray-700">Report : ..............................................</div>
                                <div className="mb-1 text-left w-full text-gray-700">Date : {new Date().toLocaleDateString('en-GB')}</div>
                            </div>
                            <div className="flex flex-col items-center pt-2">
                                <div className="mb-2 text-gray-700 text-[11px] sm:text-[13px] whitespace-nowrap">ลงชื่อ .....................................................</div>
                                <div className="text-gray-700 mb-1 text-[11px] sm:text-[13px] whitespace-nowrap">( ..................................................... )</div>
                                <div className="text-gray-500">(ผู้จัดการฝ่ายผลิต)</div>
                            </div>
                            <div className="flex flex-col items-center pt-2">
                                <div className="mb-2 text-gray-700 text-[11px] sm:text-[13px] whitespace-nowrap">ลงชื่อ .....................................................</div>
                                <div className="text-gray-700 mb-1 text-[11px] sm:text-[13px] whitespace-nowrap">( ..................................................... )</div>
                                <div className="text-gray-500">(GM FM & OFFICE)</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AttendanceReportPage;
