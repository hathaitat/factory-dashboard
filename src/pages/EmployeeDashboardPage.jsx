import { useState, useEffect } from 'react';
import { Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboardPage = () => {
    const navigate = useNavigate();
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [periods, setPeriods] = useState([]);

    useEffect(() => {
        loadData();
        generatePeriods();
    }, []);

    const loadData = async () => {
        const data = await employeeService.getEmployees();
        setEmployees(data);
    };

    const generatePeriods = () => {
        const months = [
            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];

        const generated = [];
        // Generate for 2026 (based on context year)
        const targetYear = 2026;
        for (let m = 2; m >= 0; m--) { // Mar, Feb, Jan
            const monthName = months[m];
            const thaiYear = targetYear + 543;

            // Period 2: 17-End
            const lastDay = new Date(targetYear, m + 1, 0).getDate();
            generated.push({
                id: `${targetYear}-${m}-2`,
                label: `17-${lastDay} ${monthName} ${thaiYear}`,
                range: [17, lastDay],
                month: m,
                year: targetYear,
                startDate: `${targetYear}-${String(m + 1).padStart(2, '0')}-17`,
                endDate: `${targetYear}-${String(m + 1).padStart(2, '0')}-${lastDay}`
            });

            // Period 1: 1-16
            generated.push({
                id: `${targetYear}-${m}-1`,
                label: `1-16 ${monthName} ${thaiYear}`,
                range: [1, 16],
                month: m,
                year: targetYear,
                startDate: `${targetYear}-${String(m + 1).padStart(2, '0')}-01`,
                endDate: `${targetYear}-${String(m + 1).padStart(2, '0')}-16`
            });
        }
        setPeriods(generated);
    };

    return (
        <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
            {!selectedPeriod ? (
                <>
                    <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={28} color="#f43f5e" /> เลือกงวดเวลาทำงาน
                    </h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {periods.map(period => (
                            <div
                                key={period.id}
                                style={{
                                    padding: '1.2rem 1.5rem',
                                    background: '#f43f5e', // Pinkish Red like screenshot
                                    color: 'white',
                                    borderRadius: '4px', // Rectangular look
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'transform 0.1s'
                                }}
                                onClick={() => setSelectedPeriod(period)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span>{period.label}</span>
                                <ChevronRight size={24} color="white" />
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={() => setSelectedPeriod(null)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>รายชื่อพนักงานทั้งหมด</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#f43f5e', fontWeight: '500' }}>งวด: {selectedPeriod.label}</p>
                            </div>
                        </div>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>รหัส</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ชื่อ - นามสกุล</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ตำแหน่ง</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>สถานะ</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{emp.code}</td>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{emp.full_name}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{emp.position || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: emp.status === 'Active' ? '#10b981' : '#ef4444'
                                            }}>
                                                {emp.status === 'Active' ? 'ปกติ' : 'ลาออก'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-main)',
                                                    color: 'var(--text-main)',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    fontSize: '0.9rem'
                                                }}
                                                onClick={() => navigate(`/dashboard/employees/${emp.id}/edit?tab=timesheet&periodStart=${selectedPeriod.startDate}&periodEnd=${selectedPeriod.endDate}`)}
                                            >
                                                <Clock size={16} /> ลงเวลา
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
</div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDashboardPage;
