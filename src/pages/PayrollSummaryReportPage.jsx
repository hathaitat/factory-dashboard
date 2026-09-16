import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import { calculatePayroll, isMonthlyEmployee } from '../utils/payrollCalc';

const PayrollSummaryReportPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [period, setPeriod] = useState(null);
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const printRef = useRef(null);
    const [printZoom, setPrintZoom] = useState(1);

    useEffect(() => {
        loadData();
    }, [id]);

    // Scale the report so the full table width lands inside one landscape page.
    // The table is measured with the compact print metrics applied, so the number
    // below matches exactly what the printer lays out.
    const fitForPrint = useCallback(() => {
        const el = printRef.current;
        if (!el) return 1;
        const content = el.querySelector('.print-content');
        if (!content) return 1;

        el.classList.add('print-metrics');
        const contentWidth = Math.max(content.scrollWidth, Math.ceil(content.getBoundingClientRect().width));
        el.classList.remove('print-metrics');

        // A4 landscape is 297mm; the @page margin can end up 5mm or 10mm per side
        // depending on which stylesheet wins, so budget for the narrower case
        // (297 - 20 = 277mm = ~1047px at 96dpi) and keep a little slack.
        const PRINTABLE_WIDTH = 1000;
        if (!contentWidth) return 1;
        // grow up to 1.4x when the table is narrow, so short reports stay readable
        const zoom = Math.max(0.2, Math.min(1.4, PRINTABLE_WIDTH / contentWidth));
        setPrintZoom(Number(zoom.toFixed(4)));
        return zoom;
    }, []);

    // Measure once the table is on screen, so the zoom is ready before any print
    useLayoutEffect(() => {
        if (!isLoading && entries.length > 0) fitForPrint();
    }, [isLoading, entries, fitForPrint]);

    // Covers Ctrl/Cmd+P and the browser's own print entry points too
    useEffect(() => {
        window.addEventListener('beforeprint', fitForPrint);
        return () => window.removeEventListener('beforeprint', fitForPrint);
    }, [fitForPrint]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [periodData, employeesData, entriesData] = await Promise.all([
                payrollService.getPayrollPeriodById(id),
                employeeService.getEmployees(),
                payrollService.getPayrollEntriesByPeriod(id)
            ]);
            
            if (!periodData) {
                navigate('/dashboard/payroll');
                return;
            }
            
            setPeriod(periodData);

            // Map employees to entries
            const fullEntries = employeesData
                .filter(emp => emp.status === 'Active' || entriesData.some(e => e.employee_id === emp.id))
                .map(emp => {
                    const entry = entriesData.find(e => e.employee_id === emp.id);
                    return {
                        employee: emp,
                        entry: entry || null
                    };
                })
                .filter(item => item.entry); // Only show those who have payroll entries for this period

            setEntries(fullEntries);
        } catch (error) {
            console.error('Error loading payroll report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        fitForPrint();
        // let React commit the new zoom before the print dialog snapshots the page
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    };

    const calculateRow = (item) => {
        const { employee, entry } = item;
        const calc = calculatePayroll(entry, employee);

        const isMonthly = isMonthlyEmployee(employee);
        const otStandardHours = calc.ot15Hours + calc.ot16Hours;
        const otStandardAmount = calc.ot15Amount + calc.ot16Amount;

        return {
            // ฐานค่าจ้างสำหรับแสดงในคอลัมน์รายเดือน / รายวัน
            salary1Month: isMonthly ? calc.monthlySalary : 0,
            salaryDaily: isMonthly ? 0 : calc.dailyWage,
            workingDays: calc.actualWorkingDays,
            amountBase: calc.basePay,
            position: calc.positionAllowance,
            otHours: otStandardHours,
            // อัตรา OT ต่อชั่วโมงที่เกิดขึ้นจริง (ถ้ามีทั้ง 1.5 และ 1.6 จะเป็นค่าเฉลี่ยถ่วงน้ำหนัก)
            otRate: otStandardHours > 0 ? otStandardAmount / otStandardHours : 0,
            otStandardAmount,
            ot20Hours: calc.ot20Hours,
            ot20Amount: calc.ot20Amount,
            otTotalAmount: calc.otTotalAmount,
            diligence: calc.diligenceAllowance,
            transport: calc.transportAllowance,
            bonus: calc.bonus,
            skill: calc.skillAllowance,
            shift: calc.shiftAllowance,
            birthday: calc.birthdayAllowance,
            backpay: calc.backPay,
            otherIncome: calc.customIncomeTotal,
            finalTotalIncome: calc.totalIncome,
            repair: calc.repairDeduction,
            ssAmount: calc.socialSecurity,
            companyLoan: calc.companyLoan,
            fund: calc.fundDeduction,
            tax: calc.taxDeduction,
            otherDeductions: calc.otherDeductions,
            totalDeductions: calc.totalDeductions,
            netTotal: calc.netPay,
            // ยอดครึ่งเดือนของพนักงานรายเดือน (พนักงานรายวันคิดตามวันทำงาน จึงไม่มียอดนี้)
            halfMonth: isMonthly ? calc.basePay : 0,
            // คอลัมน์ตามแบบฟอร์มบริษัทที่ยังไม่มีช่องกรอกข้อมูลในระบบ
            contactWork: 0,
            workingDate: calc.actualWorkingDays,
            fridayDays: 0,
            fridayAmount: 0,
            holidayDays: 0,
            holidayAmount: 0
        };
    };

    const formatNum = (num) => {
        if (!num || num === 0) return '-';
        return num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="loading-spinner w-12 h-12"></div>
            </div>
        );
    }

    if (!period) return null;

    const rows = entries.map(calculateRow);
    
    // Calculate Grand Totals
    const totals = rows.reduce((acc, row) => {
        Object.keys(row).forEach(key => {
            acc[key] = (acc[key] || 0) + row[key];
        });
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-white print-root">
            <style>
                {`
                    /* Compact metrics used when printing. The same block is applied
                       for a moment while measuring (.print-metrics) so the measured
                       width equals the printed width.
                       The .print-wrapper prefix is needed to beat the global
                       .report-table rules in index.css, which are !important. */
                    .print-wrapper.print-metrics .report-table,
                    .print-wrapper.print-metrics .report-table th,
                    .print-wrapper.print-metrics .report-table td {
                        font-size: 12px !important;
                        padding: 1px 3px !important;
                        line-height: 1.2 !important;
                        white-space: nowrap !important;
                        min-width: 0 !important;
                    }

                    @media print {
                        @page { size: A4 landscape; margin: 5mm; }
                        /* the page root is min-h-screen (100vh) on screen; on paper that
                           would reserve a whole viewport of height for nothing */
                        .print-root { min-height: 0 !important; }
                        html, body {
                            width: auto !important;
                            height: auto !important;
                            background: #fff;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        /* zoom (not transform) so the page height shrinks with the
                           content and the report stays on a single page */
                        .print-wrapper {
                            zoom: var(--print-zoom, 1);
                            width: 100% !important;
                            max-width: 100% !important;
                            overflow: visible !important;
                            /* Fill exactly one page so the notes can sit at its bottom.
                               Lengths inside a zoomed element are in unzoomed units, so the
                               page height has to be divided by the zoom factor. min-height
                               (not height) lets a long staff list still flow onto page 2. */
                            box-sizing: border-box;
                            min-height: calc(190mm / var(--print-zoom, 1));
                            display: flex;
                            flex-direction: column;
                        }
                        /* Nothing may be wider than the page: the zoom above does the
                           real fitting, and these caps make any leftover overflow wrap
                           instead of being cut off at the paper edge. */
                        .print-scroll {
                            overflow: visible !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            flex: 1 1 auto;
                            display: flex;
                            flex-direction: column;
                            min-height: 0;
                        }
                        .print-content {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            flex: 1 1 auto;
                            display: flex;
                            flex-direction: column;
                            min-height: 0;
                        }
                        /* 98%, not 100%: sub-pixel rounding across 35 columns used to
                           push the last cell past the paper edge and cut its last digit */
                        .print-wrapper .report-table {
                            width: 98% !important;
                            max-width: 98% !important;
                            table-layout: auto !important;
                        }
                        .print-wrapper .report-table th,
                        .print-wrapper .report-table td {
                            font-size: 12px !important;
                            padding: 1px 3px !important;
                            line-height: 1.2 !important;
                            min-width: 0 !important;
                            white-space: normal !important;
                            /* 'anywhere' (unlike break-word) also shrinks the table's
                               intrinsic width, so numbers can never push past the page */
                            overflow-wrap: anywhere !important;
                        }
                        .notes-section { margin-top: auto !important; max-width: 100% !important; }
                        .report-table, .notes-section { break-inside: avoid; page-break-inside: avoid; }
                    }
                `}
            </style>
            {/* Action Bar (Hidden in Print) */}
            <div className="print:hidden p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                <button 
                    onClick={() => navigate(`/dashboard/payroll/${id}`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 bg-transparent border-0 cursor-pointer font-medium transition-colors"
                >
                    <ArrowLeft size={18} />
                    กลับ
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium border-0 cursor-pointer"
                >
                    <Printer size={18} />
                    พิมพ์รายงาน
                </button>
            </div>

            {/* Print Area */}
            <div ref={printRef} style={{ '--print-zoom': printZoom }} className="p-4 sm:p-4 w-full print:p-0 print-wrapper">
                <div className="mb-4 print:mb-2">
                    <h1 className="text-xl font-bold m-0 text-gray-900">รายละเอียดเงินเดือน-ค่าจ้าง</h1>
                    <h2 className="text-lg font-medium m-0 text-gray-700 mt-1">ประจำเดือน {period.name}</h2>
                    <h3 className="text-sm font-medium m-0 text-gray-500 mt-1">
                        รอบวันที่ {new Date(period.start_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} ถึง {new Date(period.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                </div>

                <div className="print-scroll overflow-x-auto w-full print:overflow-visible shadow-sm border border-gray-200 print:shadow-none print:border-none">
                    <div className="print-content min-w-max">
                        <table className="report-table w-full border-collapse border border-gray-400 text-xs text-gray-800 font-sans bg-white">
                            <thead>
                                <tr className="bg-gray-100 text-center font-bold">
                                    <th rowSpan="3" className="border border-gray-400 p-1 w-10">ลำดับ</th>
                                    <th rowSpan="3" className="border border-gray-400 p-1 min-w-[150px] print:min-w-0">ชื่อ-สกุล</th>
                                <th colSpan="4" className="border border-gray-400 p-1">เงินเดือน</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 w-16">วันทำงานจริง</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 w-16">วันที่ทำงาน</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 w-20">จำนวนเงิน</th>
                                <th colSpan="4" className="border border-gray-400 p-1">ค่าจ้าง</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">ค่าตำแหน่ง</th>
                                <th colSpan="3" className="border border-gray-400 p-1">O/T (1.5,1.6)แรง</th>
                                <th colSpan="2" className="border border-gray-400 p-1">O/T(2.0)</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">รวม OT ทั้งหมด</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">เบี้ยขยัน</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">ค่าขนส่ง</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">โบนัส</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">ค่าทักษะ</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">ค่ากะ</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">วันเกิด</th>
                                <th rowSpan="3" className="border border-gray-400 p-1">รายได้อื่นๆ</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 font-bold">รวมรายรับ</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">หักค่าซ่อมเครื่อง</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">หักประกันสังคม<br/>5%</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">หักค่ากู้ยืมบริษัท</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">สะสมกองทุน</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">หักภาษี</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 text-red-600 font-bold">หักอื่นๆ</th>
                                <th rowSpan="3" className="border border-gray-400 p-1 font-bold text-sm">รวมสุทธิ</th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th rowSpan="2" className="border border-gray-400 p-1">1 เดือน</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">ครึ่งเดือน</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">คิดต่อวัน</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">รายวัน</th>
                                <th colSpan="2" className="border border-gray-400 p-1">วันศุกร์ 70%.50%</th>
                                <th colSpan="2" className="border border-gray-400 p-1">วันหยุด(1) และ(2) แรง</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">จำนวนที่ทำOT</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">OT/hr.</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">จำนวนเงิน</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">ชั่วโมง</th>
                                <th rowSpan="2" className="border border-gray-400 p-1">จำนวนเงิน</th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th className="border border-gray-400 p-1">วัน</th>
                                <th className="border border-gray-400 p-1">เป็นเงิน</th>
                                <th className="border border-gray-400 p-1">วัน</th>
                                <th className="border border-gray-400 p-1">เป็นเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((item, index) => {
                                const row = rows[index];
                                return (
                                    <tr key={item.employee.id} className="text-right hover:bg-gray-50">
                                        <td className="border border-gray-400 p-1 text-center font-bold">{index + 1}</td>
                                        <td className="border border-gray-400 p-1 text-left font-bold">{item.employee.full_name}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.salary1Month)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.halfMonth)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.contactWork)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.salaryDaily)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.workingDays)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.workingDate)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.amountBase)}</td>
                                        
                                        <td className="border border-gray-400 p-1">{formatNum(row.fridayDays)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.fridayAmount)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.holidayDays)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.holidayAmount)}</td>
                                        
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.position)}</td>
                                        
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.otHours)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.otRate)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.otStandardAmount)}</td>
                                        <td className="border border-gray-400 p-1 font-bold text-gray-500">{formatNum(row.ot20Hours)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.ot20Amount)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.otTotalAmount)}</td>
                                        
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.diligence)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.transport)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.bonus)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.skill)}</td>
                                        <td className="border border-gray-400 p-1 font-bold">{formatNum(row.shift)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.birthday)}</td>
                                        <td className="border border-gray-400 p-1">{formatNum(row.otherIncome)}</td>
                                        
                                        <td className="border border-gray-400 p-1 font-bold bg-gray-50">{formatNum(row.finalTotalIncome)}</td>
                                        
                                        <td className="border border-gray-400 p-1 text-red-600">{formatNum(row.repair)}</td>
                                        <td className="border border-gray-400 p-1 font-bold text-red-600">{formatNum(row.ssAmount)}</td>
                                        <td className="border border-gray-400 p-1 text-red-600">{formatNum(row.companyLoan)}</td>
                                        <td className="border border-gray-400 p-1 text-red-600">{formatNum(row.fund)}</td>
                                        <td className="border border-gray-400 p-1 text-red-600">{formatNum(row.tax)}</td>
                                        <td className="border border-gray-400 p-1 text-red-600">{formatNum(row.otherDeductions)}</td>
                                        
                                        <td className="border border-gray-400 p-1 font-bold text-sm bg-gray-50">{formatNum(row.netTotal)}</td>
                                    </tr>
                                );
                            })}
                            
                            {/* Grand Totals */}
                            <tr className="bg-gray-100 text-right font-bold text-sm">
                                <td colSpan="2" className="border border-gray-400 p-2 text-center">รวมทั้งหมด</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.salary1Month)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.halfMonth)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.contactWork)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.salaryDaily)}</td>
                                <td className="border border-gray-400 p-1 bg-gray-200 border-none"></td>
                                <td className="border border-gray-400 p-1 bg-gray-200 border-none"></td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.amountBase)}</td>
                                
                                <td className="border border-gray-400 p-1 bg-gray-200 border-none"></td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.fridayAmount)}</td>
                                <td className="border border-gray-400 p-1 bg-gray-200 border-none"></td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.holidayAmount)}</td>
                                
                                <td className="border border-gray-400 p-1">{formatNum(totals.position)}</td>
                                
                                <td className="border border-gray-400 p-1">{formatNum(totals.otHours)}</td>
                                <td className="border border-gray-400 p-1 bg-gray-200 border-none"></td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.otStandardAmount)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.ot20Hours)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.ot20Amount)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.otTotalAmount)}</td>
                                
                                <td className="border border-gray-400 p-1">{formatNum(totals.diligence)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.transport)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.bonus)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.skill)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.shift)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.birthday)}</td>
                                <td className="border border-gray-400 p-1">{formatNum(totals.otherIncome)}</td>
                                
                                <td className="border border-gray-400 p-1 text-base">{formatNum(totals.finalTotalIncome)}</td>
                                
                                <td className="border border-gray-400 p-1 text-red-600">{formatNum(totals.repair)}</td>
                                <td className="border border-gray-400 p-1 font-bold text-red-600">{formatNum(totals.ssAmount)}</td>
                                <td className="border border-gray-400 p-1 text-red-600">{formatNum(totals.companyLoan)}</td>
                                <td className="border border-gray-400 p-1 text-red-600">{formatNum(totals.fund)}</td>
                                <td className="border border-gray-400 p-1 text-red-600">{formatNum(totals.tax)}</td>
                                <td className="border border-gray-400 p-1 text-red-600">{formatNum(totals.otherDeductions)}</td>
                                
                                <td className="border border-gray-400 p-1 text-base">{formatNum(totals.netTotal)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-4 flex justify-between items-end text-sm notes-section">
                        <div className="border border-green-500 p-2 text-xs w-1/2 rounded text-left bg-green-50/30">
                            <div className="font-bold mb-1 text-green-700">หมายเหตุ</div>
                            <ol className="m-0 pl-4 space-y-1 text-gray-700">
                                <li>โอที รายเดือน คูณ 1.6 รายวัน คูณ 1.5</li>
                                <li>เบี้ยขยัน เดือนละ 600 บาท วันละ 300 บาท (ไม่หยุด ขาด ลา มาสาย) คิดเป็นขั้นบันได คือ 200บาท -&gt; 300 บาท</li>
                                <li>ตัดรอบค่าแรง 15 และ ก่อนวันที่ 1 ของเดือนถัดไป เช่น 28 หรือ 30 หรือ 31 ของเดือน</li>
                            </ol>
                        </div>
                        <div className="flex gap-16">
                            <div className="text-center">
                                <div className="mb-8">________________________</div>
                                <div>ผู้จัดทำ</div>
                            </div>
                            <div className="text-center">
                                <div className="mb-8">________________________</div>
                                <div>ทบทวน</div>
                            </div>
                            <div className="text-center">
                                <div className="mb-8">________________________</div>
                                <div>ผู้อนุมัติ</div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollSummaryReportPage;
