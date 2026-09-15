import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Edit2, Printer } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import PageHeader from '../components/PageHeader';
import PayrollEntryModal from '../components/PayrollEntryModal';
import { usePermissions } from '../hooks/usePermissions';
import { calculatePayroll } from '../utils/payrollCalc';

const PayrollPeriodDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    
    const [period, setPeriod] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedEntry, setSelectedEntry] = useState(null);

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
            setEmployees(employeesData.filter(emp => emp.status === 'Active')); // Only active employees
            setEntries(entriesData);
        } catch (error) {
            console.error('Error loading payroll detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRowClick = (employee) => {
        if (!hasPermission('employees', 'edit')) return;
        const entry = entries.find(e => e.employee_id === employee.id);
        setSelectedEmployee(employee);
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        // Refresh entries
        payrollService.getPayrollEntriesByPeriod(id).then(setEntries);
    };

    const calculateEntryNet = (entry, employee) =>
        entry ? calculatePayroll(entry, employee).netPay : 0;

    // Derived Data
    const processedCount = entries.length;
    const totalEmployees = employees.length;
    const totalNetPay = entries.reduce(
        (sum, entry) => sum + calculateEntryNet(entry, employees.find((emp) => emp.id === entry.employee_id)),
        0
    );

    return (
        <div className="page-container p-6">
            <div className="mb-4">
                <button 
                    onClick={() => navigate('/dashboard/payroll')}
                    className="flex items-center gap-2 text-textMuted hover:text-main bg-transparent border-0 cursor-pointer font-medium transition-colors"
                >
                    <ArrowLeft size={18} />
                    กลับไปหน้ารายชื่องวด
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64 text-textMuted bg-main rounded-2xl shadow-sm border border-border">
                    <div className="text-center">
                        <div className="loading-spinner mx-auto mb-3 w-8 h-8"></div>
                        <p className="font-medium">กำลังโหลดข้อมูลงวดเงินเดือน...</p>
                    </div>
                </div>
            ) : period && (
                <>
                    <div className="bg-main rounded-2xl shadow-sm border border-border p-6 mb-6">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-main m-0 mb-2">{period.name}</h1>
                                <div className="flex items-center gap-4 text-sm text-textMuted">
                                    <span>รอบ: {new Date(period.start_date).toLocaleDateString('th-TH')} - {new Date(period.end_date).toLocaleDateString('th-TH')}</span>
                                    <span>•</span>
                                    <span>วันทำงานเต็ม: {period.working_days || 0} วัน</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-blue-50 px-4 py-3 rounded-xl border border-blue-100 flex flex-col min-w-[120px]">
                                    <span className="text-xs text-blue-600 font-medium mb-1">ความคืบหน้า</span>
                                    <div className="flex items-end gap-2">
                                        <span className="text-xl font-bold text-blue-800">{processedCount}</span>
                                        <span className="text-sm text-blue-600 mb-0.5">/ {totalEmployees} คน</span>
                                    </div>
                                </div>
                                <div className="bg-green-50 px-4 py-3 rounded-xl border border-green-100 flex flex-col min-w-[120px]">
                                    <span className="text-xs text-green-600 font-medium mb-1">ยอดจ่ายสุทธิรวม</span>
                                    <span className="text-xl font-bold text-green-800">
                                        ฿{totalNetPay.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="m-0 font-medium text-main">รายชื่อพนักงาน</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(`/dashboard/payroll/${id}/slips`)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg border-0 hover:bg-green-100 transition-colors shadow-sm font-medium cursor-pointer"
                                >
                                    <Printer size={16} />
                                    พิมพ์สลิปเงินเดือน
                                </button>
                                <button
                                    onClick={() => navigate(`/dashboard/payroll/${id}/report`)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border-0 hover:bg-blue-100 transition-colors shadow-sm font-medium cursor-pointer"
                                >
                                    <Printer size={16} />
                                    ดูรายงานสรุป
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive-wrapper">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-main border-b border-border text-textMuted font-medium text-sm">
                                        <th className="p-4 w-[80px] text-center">จัดการ</th>
                                        <th className="p-4">รหัส</th>
                                        <th className="p-4">ชื่อ - นามสกุล</th>
                                        <th className="p-4">ตำแหน่ง</th>
                                        <th className="p-4">สถานะ</th>
                                        <th className="p-4 text-right">ยอดสุทธิ (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((employee) => {
                                        const entry = entries.find(e => e.employee_id === employee.id);
                                        const netPay = calculateEntryNet(entry, employee);
                                        
                                        return (
                                            <tr 
                                                key={employee.id} 
                                                onClick={() => handleRowClick(employee)}
                                                className="border-b border-border hover:bg-black/5 transition-colors cursor-pointer group"
                                            >
                                                <td className="p-4 text-center">
                                                    <button className="w-8 h-8 rounded-full border-0 bg-transparent text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 flex items-center justify-center cursor-pointer transition-colors mx-auto">
                                                        <Edit2 size={16} />
                                                    </button>
                                                </td>
                                                <td className="p-4 font-medium text-main">
                                                    {employee.code}
                                                </td>
                                                <td className="p-4">
                                                    {employee.full_name}
                                                </td>
                                                <td className="p-4 text-textMuted">
                                                    {employee.position}
                                                </td>
                                                <td className="p-4">
                                                    {entry ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            <CheckCircle size={12} />
                                                            ลงข้อมูลแล้ว
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                            <Clock size={12} />
                                                            รอดำเนินการ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-medium text-main">
                                                    {entry ? netPay.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {employees.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-textMuted">
                                                ไม่พบรายชื่อพนักงาน Active ในระบบ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <PayrollEntryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                employee={selectedEmployee}
                period={period}
                existingEntry={selectedEntry}
            />
        </div>
    );
};

export default PayrollPeriodDetailPage;
