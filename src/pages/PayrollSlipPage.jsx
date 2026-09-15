import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import { numberToThaiText } from '../utils/bahttext';
import { calculatePayroll } from '../utils/payrollCalc';

const PayrollSlipPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        loadData();
    }, [id]);

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
            setEmployees(employeesData);
            setEntries(entriesData);
        } catch (error) {
            console.error('Error loading payroll slips:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatNum = (num) => {
        if (!num || num === 0) return '-';
        return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 text-textMuted bg-main">
                <div className="text-center">
                    <div className="loading-spinner mx-auto mb-3 w-10 h-10"></div>
                    <p className="font-medium">กำลังโหลดข้อมูลใบจ่ายเงินเดือน...</p>
                </div>
            </div>
        );
    }

    // Prepare data for all active entries
    const slipDataList = entries.map(entry => {
        const emp = employees.find(e => e.id === entry.employee_id);
        if (!emp) return null;
        return { emp, entry, calc: calculatePayroll(entry, emp) };
    }).filter(Boolean);

    // Group slips into pairs (2 per page)
    const slipPages = [];
    for (let i = 0; i < slipDataList.length; i += 2) {
        slipPages.push(slipDataList.slice(i, i + 2));
    }

    return (
        <div className="payroll-slip-page">
            <style type="text/css">
                {`
                /* ===== Screen Preview Styles ===== */
                .payroll-slip-page {
                    padding: 1.5rem;
                    background: var(--bg-main, #f1f5f9);
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                }
                .payroll-slip-page .screen-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding: 0 1rem;
                }
                .slip-page-group {
                    margin-bottom: 2rem;
                }
                .slip-box {
                    background: white;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    border-radius: 8px;
                }
                .slip-tbl {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    color: #1f2937;
                }
                .slip-tbl th, .slip-tbl td {
                    border: 1px solid #9ca3af;
                    padding: 6px 8px;
                    text-align: right;
                }
                .slip-tbl th {
                    text-align: center;
                    font-weight: normal;
                    background: #f9fafb;
                }
                .slip-tbl .hdr {
                    text-align: center;
                    font-weight: bold;
                    background: #f3f4f6;
                    border: 1px solid #9ca3af;
                }

                /* ===== Print Styles ===== */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm;
                    }
                    * { box-sizing: border-box; }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    .payroll-slip-page {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        min-height: auto !important;
                    }
                    .payroll-slip-page .screen-header {
                        display: none !important;
                    }
                    nav, aside, header,
                    .sidebar, .dashboard-sidebar {
                        display: none !important;
                    }

                    .slip-page-group {
                        page-break-after: always;
                        page-break-inside: avoid;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 281mm; /* A4 297mm - 16mm margins */
                        display: flex;
                        flex-direction: column;
                        gap: 4mm;
                    }
                    .slip-page-group:last-child {
                        page-break-after: auto;
                    }

                    .slip-box {
                        flex: 1;
                        margin: 0 !important;
                        padding: 3mm 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        background: white !important;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .slip-box + .slip-box {
                        border-top: 1px dashed #666;
                        padding-top: 4mm !important;
                    }

                    .slip-tbl {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
                        color: #000;
                    }
                    .slip-tbl th, .slip-tbl td {
                        border: 1px solid #000;
                        padding: 4px 6px;
                        text-align: right;
                        line-height: 1.4;
                    }
                    .slip-tbl th {
                        text-align: center;
                        font-weight: normal;
                    }
                    .slip-tbl .hdr {
                        text-align: center;
                        font-weight: bold;
                        border: 1px solid #000;
                    }
                    .txt-l { text-align: left !important; }
                    .txt-c { text-align: center !important; }
                    .fw-b { font-weight: bold !important; }
                    .bd-0 { border: none !important; }
                    .bd-t2 { border-top: 2px solid #000 !important; }
                    .bd-b2 { border-bottom: 2px solid #000 !important; }
                    .bd-l2 { border-left: 2px solid #000 !important; }
                    .bd-r2 { border-right: 2px solid #000 !important; }
                }
                `}
            </style>

            {/* Screen Header (hidden when printing) */}
            <div className="screen-header">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(`/dashboard/payroll/${id}`)}
                        className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 rounded-full text-slate-600 border border-slate-300 transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-[1.4rem] font-bold text-slate-800 m-0">ใบจ่ายเงินเดือนพนักงาน</h1>
                        <p className="text-slate-500 m-0 mt-1 text-sm">{period?.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-sm shadow-sm"
                >
                    <Printer size={18} className="text-slate-600" />
                    <span>พิมพ์ใบจ่ายเงินเดือน</span>
                </button>
            </div>

            {/* Slip Pages - 2 slips per page group */}
            {slipPages.map((pageSlips, pageIndex) => (
                <div key={pageIndex} className="slip-page-group">
                    {pageSlips.map((data) => (
                        <div key={data.emp.id} className="slip-box">
                            <table className="slip-tbl" style={{ border: '2px solid #000' }}>
                                <tbody>
                                    {/* Title Row */}
                                    <tr>
                                        <td colSpan="8" className="hdr bd-0" style={{ fontSize: '14px', padding: '4px 0' }}>
                                            บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="8" className="hdr bd-0" style={{ fontSize: '12px', padding: '2px 0' }}>
                                            ใบจ่ายเงินเดือนพนักงาน
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="8" className="bd-0" style={{ textAlign: 'right', padding: '2px 4px' }}>
                                            ประจำเดือน {period?.name}
                                        </td>
                                    </tr>

                                    {/* Employee Info Row */}
                                    <tr className="bd-t2 bd-b2">
                                        <td colSpan="2" className="txt-l fw-b">ชื่อ: {data.emp.full_name}</td>
                                        <td colSpan="2" className="txt-l fw-b">ตำแหน่ง: {data.emp.position || '-'}</td>
                                        <td colSpan="1" className="txt-l fw-b">ฝ่าย: -</td>
                                        <td colSpan="1" className="txt-l fw-b">ส่วน: -</td>
                                        <td colSpan="2" className="txt-l fw-b">แผนก: -</td>
                                    </tr>

                                    {/* Spacer */}
                                    <tr><td colSpan="8" className="bd-0" style={{ padding: '1px' }}></td></tr>

                                    {/* Income Row 1 Headers */}
                                    <tr>
                                        <th>เงินเดือน</th>
                                        <th>จำนวนวันทำงาน</th>
                                        <th>โบนัส</th>
                                        <th>เบี้ยขยัน</th>
                                        <th>OT.(1.5แรง)</th>
                                        <th>OT.(1.6แรง)</th>
                                        <th>OT.(2แรง)</th>
                                        <th className="bd-0 bd-r2"></th>
                                    </tr>
                                    {/* Income Row 1 Data */}
                                    <tr>
                                        <td>{formatNum(data.calc.basePay)}</td>
                                        <td>{formatNum(data.calc.actualWorkingDays)}</td>
                                        <td>{formatNum(data.calc.bonus)}</td>
                                        <td>{formatNum(data.calc.diligenceAllowance)}</td>
                                        <td>{formatNum(data.calc.ot15Amount)}</td>
                                        <td>{formatNum(data.calc.ot16Amount)}</td>
                                        <td>{formatNum(data.calc.ot20Amount)}</td>
                                        <td className="bd-0 bd-r2"></td>
                                    </tr>

                                    {/* Income Row 2 Headers */}
                                    <tr>
                                        <th>ค่าเดินทาง</th>
                                        <th>ค่าตำแหน่ง</th>
                                        <th>ค่าทักษะ</th>
                                        <th>ค่ากะ</th>
                                        <th>ตกเบิก</th>
                                        <th>วันเกิด</th>
                                        <th>อื่นๆ</th>
                                        <th className="fw-b">รวมรายได้</th>
                                    </tr>
                                    {/* Income Row 2 Data */}
                                    <tr>
                                        <td>{formatNum(data.calc.transportAllowance)}</td>
                                        <td>{formatNum(data.calc.positionAllowance)}</td>
                                        <td>{formatNum(data.calc.skillAllowance)}</td>
                                        <td>{formatNum(data.calc.shiftAllowance)}</td>
                                        <td>{formatNum(data.calc.backPay)}</td>
                                        <td>{formatNum(data.calc.birthdayAllowance)}</td>
                                        <td>{formatNum(data.calc.customIncomeTotal)}</td>
                                        <td className="fw-b">{formatNum(data.calc.totalIncome)}</td>
                                    </tr>

                                    {/* Deductions Row Headers */}
                                    <tr>
                                        <th colSpan="2">หักเงินกู้-ยืม</th>
                                        <th colSpan="2">หักค่าประกันสังคม</th>
                                        <th colSpan="2">หักกองทุนสำรองเลี้ยงชีพ</th>
                                        <th colSpan="2">หักอื่นๆ</th>
                                    </tr>
                                    {/* Deductions Row Data */}
                                    <tr>
                                        <td colSpan="2" className="txt-c">{formatNum(data.calc.companyLoan)}</td>
                                        <td colSpan="2" className="txt-c">{formatNum(data.calc.socialSecurity)}</td>
                                        <td colSpan="2" className="txt-c">{formatNum(data.calc.fundDeduction)}</td>
                                        <td colSpan="2" className="txt-c">
                                            {formatNum(data.calc.taxDeduction + data.calc.repairDeduction + data.calc.otherDeductions)}
                                        </td>
                                    </tr>

                                    {/* Deduction total */}
                                    <tr>
                                        <td colSpan="6" className="bd-0 bd-l2" style={{ borderBottom: '1px solid #9ca3af' }}></td>
                                        <td className="fw-b" style={{ borderLeft: '1px solid #9ca3af' }}>รวมเงินหัก</td>
                                        <td>{formatNum(data.calc.totalDeductions)}</td>
                                    </tr>

                                    {/* Net Pay Summary Row */}
                                    <tr className="bd-t2 bd-b2">
                                        <td colSpan="6" className="txt-c fw-b" style={{ fontSize: '11px', background: '#f3f4f6' }}>
                                            {numberToThaiText(data.calc.netPay)}
                                        </td>
                                        <td className="fw-b txt-c" style={{ background: '#f3f4f6' }}>เงินได้สุทธิ :</td>
                                        <td className="fw-b" style={{ background: '#f3f4f6' }}>{formatNum(data.calc.netPay)}</td>
                                    </tr>

                                    {/* Signature Row */}
                                    <tr>
                                        <td colSpan="4" className="bd-0 bd-l2 bd-b2" style={{ height: '30px' }}></td>
                                        <td colSpan="4" className="bd-0 bd-r2 bd-b2 txt-c" style={{ verticalAlign: 'bottom', paddingBottom: '4px' }}>
                                            ลงชื่อผู้รับเงิน.......................................................................
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default PayrollSlipPage;
