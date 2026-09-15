import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase } from 'lucide-react';
import { employeeService } from '../../services/employeeService';

const EmployeeTab = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({
        total: 0,
        active: 0,
        employees: []
    });

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const employees = await employeeService.getEmployees();
                const activeEmployees = (employees || []).filter(e => e.status === 'Active');

                setData({
                    total: (employees || []).length,
                    active: activeEmployees.length,
                    employees: employees || []
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
                        <span className="kpi-label">ทำงานอยู่ (Active)</span>
                        <span className="kpi-value">{data.active.toLocaleString()} <span className="unit">คน</span></span>
                    </div>
                </div>
                
                <div className="kpi-card glass-panel">
                    <div className="kpi-icon-wrapper yellow">
                        <Briefcase size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ลาออก/พักงาน</span>
                        <span className="kpi-value">{(data.total - data.active).toLocaleString()} <span className="unit">คน</span></span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid mt-6">
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={16} /> รายชื่อพนักงาน (ล่าสุด)
                        </h3>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>รหัส</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ชื่อ</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem', textAlign: 'center' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employees.slice(0, 10).map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                        <td style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)' }}>{emp.code}</td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{emp.full_name}</div>
                                            {emp.position && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.position}</div>}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: emp.status === 'Active' ? '#10b981' : '#ef4444', fontWeight: '500' }}>
                                                {emp.status === 'Active' ? 'ทำงานอยู่' : 'ลาออก/พักงาน'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.employees.length === 0 && (
                                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลพนักงาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default EmployeeTab;
