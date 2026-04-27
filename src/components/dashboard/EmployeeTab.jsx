import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, AlertCircle, ExternalLink } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import CustomLineChart from './CustomLineChart';

const EmployeeTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        active: 0,
        estimatedPayroll: 0,
        employeeSummary: [],
        noTimesheetEmployees: [],
        rawWorkLogs: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const employees = await employeeService.getEmployees();
                const activeEmployees = (employees || []).filter(e => e.status === 'Active');

                // Get work logs for this month (for summary table)
                const now = new Date();
                const startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
                const endDate = now.toISOString().split('T')[0];

                // Get full year + last year work logs for chart
                const chartStartDate = `${now.getFullYear() - 1}-01-01`;

                const [workLogs, allWorkLogs] = await Promise.all([
                    employeeService.getWorkLogsByPeriod(startDate, endDate),
                    employeeService.getWorkLogsByPeriod(chartStartDate, endDate)
                ]);

                // Calculate work days per employee
                const workDaysMap = {};
                (workLogs || []).forEach(log => {
                    const empId = log.employee_id;
                    if (!workDaysMap[empId]) workDaysMap[empId] = 0;
                    if (log.status === 'present' || log.status === 'overtime') {
                        workDaysMap[empId] += 1;
                    }
                });

                // Build summary
                const employeeSummary = activeEmployees.map(emp => ({
                    id: emp.id,
                    name: emp.full_name,
                    nickname: emp.nickname,
                    code: emp.code,
                    workDays: workDaysMap[emp.id] || 0,
                    dailyWage: Number(emp.daily_wage) || 0,
                    totalPay: (workDaysMap[emp.id] || 0) * (Number(emp.daily_wage) || 0)
                })).sort((a, b) => b.totalPay - a.totalPay);

                const estimatedPayroll = employeeSummary.reduce((sum, emp) => sum + emp.totalPay, 0);
                const totalWorkDays = employeeSummary.reduce((sum, emp) => sum + emp.workDays, 0);

                // Employees with no timesheet entries
                const noTimesheetEmployees = activeEmployees.filter(emp => !workDaysMap[emp.id]);

                // Build chart data — total work days per month
                const presentLogs = (allWorkLogs || [])
                    .filter(log => log.status === 'present' || log.status === 'overtime')
                    .map(log => ({
                        ...log,
                        employeeName: log.employees?.full_name || log.employees?.nickname || 'ไม่ระบุ'
                    }));

                setData({
                    total: (employees || []).length,
                    active: activeEmployees.length,
                    estimatedPayroll,
                    totalWorkDays,
                    employeeSummary,
                    noTimesheetEmployees,
                    rawWorkLogs: presentLogs
                });
            } catch (error) {
                console.error('Error loading employee data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return <div className="tab-loading">กำลังโหลดข้อมูลพนักงาน...</div>;
    }

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper blue">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">พนักงานทั้งหมด</span>
                        <span className="kpi-value">{data.total.toLocaleString()} <span className="unit">คน</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper green">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Active</span>
                        <span className="kpi-value">{data.active.toLocaleString()} <span className="unit">คน</span></span>
                    </div>
                </div>

                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper yellow">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ค่าแรงรวมเดือนนี้ (ประมาณ)</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="kpi-value">฿{data.estimatedPayroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="kpi-sub-value" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                รวม {data.totalWorkDays} วันทำงาน
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <CustomLineChart 
                title="แนวโน้มวันทำงานพนักงาน (Timesheet)"
                metrics={[
                    { id: 'work_days', label: 'จำนวนวันทำงาน (วัน)', data: data.rawWorkLogs, dateField: 'work_date', valueField: null, color: '#3b82f6', valueSuffix: ' วัน' }
                ]}
                defaultMetric="work_days"
                enableGroupBy={true}
                groupByLabel="พนักงาน"
                groupByData={data.rawWorkLogs}
                groupByField="employeeName"
                groupByDateField="work_date"
                groupByValueField={null}
            />

            <div className="dashboard-grid">
                {/* Employee Payroll Summary */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={16} /> สรุปเวลาทำงานเดือนนี้
                        </h3>
                        <button onClick={() => navigate('/dashboard/employees?mode=timesheet')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ชื่อ</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>วันทำงาน</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ค่าแรง/วัน</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'right' }}>ค่าแรงรวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employeeSummary.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{emp.name}</div>
                                            {emp.nickname && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({emp.nickname})</div>}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center', fontWeight: '500', color: emp.workDays > 0 ? '#10b981' : '#ef4444' }}>{emp.workDays} วัน</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>฿{emp.dailyWage.toLocaleString()}</td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500', color: '#3b82f6' }}>฿{emp.totalPay.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {data.employeeSummary.length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลพนักงาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* No Timesheet Employees */}
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: data.noTimesheetEmployees.length > 0 ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} /> ยังไม่ลงเวลาเดือนนี้ ({data.noTimesheetEmployees.length})
                        </h3>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                        {data.noTimesheetEmployees.map(emp => (
                            <div key={emp.id} style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover-row">
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{emp.full_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.code} · {emp.position || 'ไม่ระบุตำแหน่ง'}</div>
                                </div>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: '500' }}>
                                    ไม่มีข้อมูล
                                </span>
                            </div>
                        ))}
                        {data.noTimesheetEmployees.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
                                พนักงานทุกคนมีข้อมูลเวลาทำงานแล้ว 👍
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default EmployeeTab;
