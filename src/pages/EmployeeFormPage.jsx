import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, User, DollarSign, Calendar, MapPin, Phone, Clock, Plus, Trash2, Heart, ChevronDown, ChevronRight } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useDialog } from '../contexts/DialogContext';

const EmployeeFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isEditMode = !!id;
    const { showAlert, showConfirm } = useDialog();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile'); // 'profile' | 'timesheet'
    const [formData, setFormData] = useState({
        code: '',
        full_name: '',
        date_of_birth: '',
        address: '',
        phone: '',
        position: '',
        employment_type: 'Full-time',
        start_date: new Date().toISOString().split('T')[0],
        status: 'Active',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: ''
    });

    // Timesheet State
    const [workLogs, setWorkLogs] = useState([]);
    const [expandedLogs, setExpandedLogs] = useState(new Set()); // Track expanded rows
    const [logForm, setLogForm] = useState({
        work_date: new Date().toISOString().split('T')[0],
        work_days: '1',
        ot_hours: '0',
        note: ''
    });

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);

    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    useEffect(() => {
        if (isEditMode) {
            loadEmployee();
            loadWorkLogs();
        } else {
            generateCode();
        }

        // Set default date to today, or if period is selected, ensure it is within range
        if (periodStart) {
            const start = new Date(periodStart);
            const end = periodEnd ? new Date(periodEnd) : new Date();
            const today = new Date();

            // If today is within range, use today. Else use start of period.
            if (today >= start && today <= end) {
                setLogForm(prev => ({ ...prev, work_date: today.toISOString().split('T')[0] }));
            } else {
                setLogForm(prev => ({ ...prev, work_date: periodStart }));
            }
        }
    }, [id, periodStart, periodEnd]);

    const generateCode = async () => {
        const employees = await employeeService.getEmployees();
        if (employees && employees.length > 0) {
            // Find numeric part and increment
            const codes = employees.map(e => parseInt(e.code.replace(/\D/g, '')) || 0);
            const max = Math.max(...codes);
            setFormData(prev => ({ ...prev, code: `EMP-${String(max + 1).padStart(3, '0')}` }));
        } else {
            setFormData(prev => ({ ...prev, code: 'EMP-001' }));
        }
    };

    const loadEmployee = async () => {
        try {
            const data = await employeeService.getEmployeeById(id);
            if (data) {
                setFormData(data);
            } else {
                await showAlert('ไม่พบข้อมูลพนักงาน');
                navigate('/dashboard/employees');
            }
        } catch (error) {
            console.error('Error:', error);
            navigate('/dashboard/employees');
        } finally {
            setIsLoading(false);
        }
    };

    const loadWorkLogs = async () => {
        if (!id) return;
        const logs = await employeeService.getWorkLogs(id);
        setWorkLogs(logs);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogChange = (e) => {
        const { name, value } = e.target;
        setLogForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditMode) {
                await employeeService.updateEmployee(id, formData);
            } else {
                await employeeService.createEmployee(formData);
            }
            navigate('/dashboard/employees');
        } catch (error) {
            console.error('Error saving employee:', error);
            await showAlert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        try {
            await employeeService.addWorkLog({
                employee_id: id,
                ...logForm
            });
            loadWorkLogs();
            // Reset form but keep date
            setLogForm(prev => ({ ...prev, work_days: '1', ot_hours: '0', note: '' }));
        } catch (error) {
            await showAlert('บันทึกเวลาทำงานไม่สำเร็จ');
        }
    };

    const handleDeleteLog = async (logId) => {
        const confirmed = await showConfirm('ลบรายการนี้?');
        if (confirmed) {
            await employeeService.deleteWorkLog(logId);
            loadWorkLogs();
        }
    };

    const toggleExpand = (logId) => {
        setExpandedLogs(prev => {
            const next = new Set(prev);
            if (next.has(logId)) {
                next.delete(logId);
            } else {
                next.add(logId);
            }
            return next;
        });
    };

    // Group logs by Month and Half-Month
    const groupedLogs = workLogs
        .filter(log => {
            if (!periodStart || !periodEnd) return true;
            return log.work_date >= periodStart && log.work_date <= periodEnd;
        })
        .reduce((acc, log) => {
            const date = new Date(log.work_date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            const day = date.getDate();

            if (!acc[yearMonth]) acc[yearMonth] = { first: [], second: [] };

            if (day <= 15) {
                acc[yearMonth].first.push(log);
            } else {
                acc[yearMonth].second.push(log);
            }
            return acc;
        }, {});

    // Helper to calculate total
    const calculateTotal = (logs) => {
        return logs.reduce((sum, log) => {
            return {
                days: sum.days + parseFloat(log.work_days || 0),
                ot: sum.ot + parseFloat(log.ot_hours || 0)
            };
        }, { days: 0, ot: 0 });
    };

    // Helper to calculate age
    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Helper to calculate work duration
    const calculateWorkDuration = (startDate) => {
        if (!startDate) return '';
        const start = new Date(startDate);
        const today = new Date();

        let years = today.getFullYear() - start.getFullYear();
        let months = today.getMonth() - start.getMonth();
        let days = today.getDate() - start.getDate();

        if (days < 0) {
            months--;
            // Get days in previous month
            const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years} ปี`);
        if (months > 0) parts.push(`${months} เดือน`);
        if (days > 0) parts.push(`${days} วัน`);

        return parts.length > 0 ? parts.join(' ') : 'เริ่มงานวันนี้';
    };

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/employees')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', marginBottom: '1rem' }}
            >
                <ArrowLeft size={18} /> กลับไปหน้ารายชื่อ
            </button>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEditMode ? formData.full_name : 'เพิ่มพนักงานใหม่'}
                    </h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#888' }}>
                        {formData.code} • {formData.position || 'ไม่ระบุตำแหน่ง'}
                    </p>
                </div>
                {isEditMode && (
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setActiveTab('profile')}
                            style={{
                                padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500',
                                background: activeTab === 'profile' ? 'white' : 'transparent',
                                color: activeTab === 'profile' ? '#8b5cf6' : '#6b7280',
                                boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <User size={18} /> ข้อมูลส่วนตัว
                        </button>
                        <button
                            onClick={() => setActiveTab('timesheet')}
                            style={{
                                padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500',
                                background: activeTab === 'timesheet' ? 'white' : 'transparent',
                                color: activeTab === 'timesheet' ? '#8b5cf6' : '#6b7280',
                                boxShadow: activeTab === 'timesheet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <Clock size={18} /> {periodStart ? 'ลงเวลาทำงาน' : 'ประวัติการทำงาน'}
                        </button>
                    </div>
                )}
            </div>

            {/* TAB 1: Profile Form */}
            {activeTab === 'profile' && (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                    {/* ... (Existing Form Content) ... */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                            <User size={20} /> ข้อมูลทั่วไป
                        </h3>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>รหัสพนักงาน</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อ - นามสกุล <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required
                                    className="glass-input"
                                    placeholder="เช่น นายสมชาย ขยันทำงาน"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    วันเดือนปีเกิด
                                    {formData.date_of_birth && (
                                        <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#8b5cf6', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>
                                            อายุ {calculateAge(formData.date_of_birth)} ปี
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    value={formData.date_of_birth || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                                    <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    เบอร์โทรศัพท์
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                ที่อยู่
                            </label>
                            <textarea
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                rows="3"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                            <Heart size={20} /> ผู้ติดต่อฉุกเฉิน
                        </h3>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    name="emergency_contact_name"
                                    value={formData.emergency_contact_name || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ความสัมพันธ์</label>
                                <input
                                    type="text"
                                    name="emergency_contact_relation"
                                    value={formData.emergency_contact_relation || ''}
                                    onChange={handleChange}
                                    placeholder="เช่น บิดา, มารดา, คู่สมรส"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เบอร์โทรศัพท์ฉุกเฉิน</label>
                            <input
                                type="text"
                                name="emergency_contact_phone"
                                value={formData.emergency_contact_phone || ''}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                            <DollarSign size={20} /> ข้อมูลการทำงาน
                        </h3>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ตำแหน่ง</label>
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    placeholder="เช่น พนักงานฝ่ายผลิต"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ประเภทการจ้างงาน</label>
                                <select
                                    name="employment_type"
                                    value={formData.employment_type || 'Full-time'}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">ฝึกงาน (Internship)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ค่าแรงรายวัน (บาท)</label>
                                <input
                                    type="number"
                                    name="daily_wage"
                                    value={formData.daily_wage || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    placeholder="เช่น 350"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เบี้ยขยัน (บาท/งวด)</label>
                                <input
                                    type="number"
                                    name="diligence_allowance"
                                    value={formData.diligence_allowance || ''}
                                    onChange={handleChange}
                                    className="glass-input"
                                    placeholder="เช่น 500"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                            </div> */}
                        </div>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    วันที่เริ่มงาน
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                                {formData.start_date && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#10b981' }}>
                                        ทำงานมาแล้ว: {calculateWorkDuration(formData.start_date)}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>สถานะ</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                >
                                    <option value="Active">ทำงานอยู่ (Active)</option>
                                    <option value="Resigned">ลาออก (Resigned)</option>
                                    <option value="OnLeave">พักงาน (On Leave)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/employees')}
                            style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                padding: '0.8rem 1.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#8b5cf6',
                                color: 'white',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500',
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </form>
            )
            }

            {/* TAB 2: Timesheet */}
            {
                activeTab === 'timesheet' && (
                    <div style={{ display: 'grid', gap: '2rem' }}>
                        {/* Add Log Form */}
                        {/* Add Log Form */}
                        {periodStart && (
                            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>บันทึกเวลาทำงาน</h3>
                                <form onSubmit={handleAddLog} style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#888' }}>วันที่</label>
                                        <input
                                            type="date"
                                            name="work_date"
                                            value={logForm.work_date}
                                            onChange={handleLogChange}
                                            required
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div style={{ width: '100px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#888' }}>จำนวนวัน</label>
                                        <select
                                            name="work_days"
                                            value={logForm.work_days}
                                            onChange={handleLogChange}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                        >
                                            <option value="1">1 วัน</option>
                                            <option value="0.5">0.5 วัน</option>
                                            <option value="0">0 วัน</option>
                                        </select>
                                    </div>
                                    <div style={{ width: '100px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#888' }}>OT (ชม.)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            name="ot_hours"
                                            value={logForm.ot_hours}
                                            onChange={handleLogChange}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 2, minWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: '#888' }}>หมายเหตุ</label>
                                        <input
                                            type="text"
                                            name="note"
                                            value={logForm.note}
                                            onChange={handleLogChange}
                                            placeholder="เช่น มาสาย, ลากิจ"
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: '#10b981',
                                            color: 'white',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                                        }}
                                    >
                                        <Plus size={18} /> เพิ่ม
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Logs List by Month */}
                        {Object.keys(groupedLogs).sort().reverse().map(monthKey => (
                            <div key={monthKey} style={{ display: 'grid', gap: '1rem' }}>
                                <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#4b5563', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                    เดือน {monthKey}
                                </h3>

                                {/* Second Half */}
                                {groupedLogs[monthKey].second.length > 0 && (
                                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div style={{ background: '#f9fafb', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontWeight: '600', color: '#6b7280' }}>งวดวันที่ 16 - สิ้นเดือน</span>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                รวม: <b style={{ color: '#10b981' }}>{calculateTotal(groupedLogs[monthKey].second).days} วัน</b> | OT: <b>{calculateTotal(groupedLogs[monthKey].second).ot} ชม.</b>
                                            </div>
                                        </div>
                                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <th style={{ padding: '0.8rem', textAlign: 'left', color: '#888', fontWeight: '500' }}>วันที่</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'center', color: '#888', fontWeight: '500' }}>วันทำงาน</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'center', color: '#888', fontWeight: '500' }}>OT</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'left', color: '#888', fontWeight: '500' }}>หมายเหตุ</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedLogs[monthKey].second.map(log => (
                                                    <React.Fragment key={log.id}>
                                                        <tr onClick={() => toggleExpand(log.id)} style={{ borderBottom: expandedLogs.has(log.id) ? 'none' : '1px solid var(--border-color)', cursor: 'pointer', background: expandedLogs.has(log.id) ? '#f8fafc' : 'transparent' }}>
                                                            <td style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {expandedLogs.has(log.id) ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                                                {log.work_date}
                                                            </td>
                                                            <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '0.2rem 0.6rem', borderRadius: '10px',
                                                                    background: log.work_days == 1 ? '#d1fae5' : '#fee2e2',
                                                                    color: log.work_days == 1 ? '#047857' : '#b91c1c'
                                                                }}>
                                                                    {log.work_days}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.8rem', textAlign: 'center', color: log.ot_hours > 0 ? '#8b5cf6' : '#ccc' }}>
                                                                {log.ot_hours > 0 ? log.ot_hours : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.8rem', color: '#6b7280' }}>{log.note || '-'}</td>

                                                        </tr>
                                                        {expandedLogs.has(log.id) && (
                                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                                                <td colSpan="5" style={{ padding: '0 1rem 1rem 2.8rem' }}>
                                                                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#4b5563' }}>
                                                                        <div>
                                                                            <span style={{ color: '#9ca3af', marginRight: '8px' }}>เวลาเข้า:</span>
                                                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{log.start_time ? log.start_time.slice(0, 5) : '-'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span style={{ color: '#9ca3af', marginRight: '8px' }}>เวลาออก:</span>
                                                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{log.end_time ? log.end_time.slice(0, 5) : '-'}</span>
                                                                        </div>
                                                                        {Number(log.late_hours) > 0 && (
                                                                            <div style={{ color: '#d97706', fontWeight: '500' }}>
                                                                                สาย: {Math.round(log.late_hours * 60)} นาที
                                                                            </div>
                                                                        )}
                                                                        {log.is_early && (
                                                                            <div style={{ color: '#ea580c', fontWeight: '500' }}>ออกก่อน</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
</div>
                                    </div>
                                )}

                                {/* First Half */}
                                {groupedLogs[monthKey].first.length > 0 && (
                                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div style={{ background: '#f9fafb', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontWeight: '600', color: '#6b7280' }}>งวดวันที่ 1 - 15</span>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                รวม: <b style={{ color: '#10b981' }}>{calculateTotal(groupedLogs[monthKey].first).days} วัน</b> | OT: <b>{calculateTotal(groupedLogs[monthKey].first).ot} ชม.</b>
                                            </div>
                                        </div>
                                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <th style={{ padding: '0.8rem', textAlign: 'left', color: '#888', fontWeight: '500' }}>วันที่</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'center', color: '#888', fontWeight: '500' }}>วันทำงาน</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'center', color: '#888', fontWeight: '500' }}>OT</th>
                                                    <th style={{ padding: '0.8rem', textAlign: 'left', color: '#888', fontWeight: '500' }}>หมายเหตุ</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedLogs[monthKey].first.map(log => (
                                                    <React.Fragment key={log.id}>
                                                        <tr onClick={() => toggleExpand(log.id)} style={{ borderBottom: expandedLogs.has(log.id) ? 'none' : '1px solid var(--border-color)', cursor: 'pointer', background: expandedLogs.has(log.id) ? '#f8fafc' : 'transparent' }}>
                                                            <td style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {expandedLogs.has(log.id) ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                                                {log.work_date}
                                                            </td>
                                                            <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '0.2rem 0.6rem', borderRadius: '10px',
                                                                    background: log.work_days == 1 ? '#d1fae5' : '#fee2e2',
                                                                    color: log.work_days == 1 ? '#047857' : '#b91c1c'
                                                                }}>
                                                                    {log.work_days}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.8rem', textAlign: 'center', color: log.ot_hours > 0 ? '#8b5cf6' : '#ccc' }}>
                                                                {log.ot_hours > 0 ? log.ot_hours : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.8rem', color: '#6b7280' }}>{log.note || '-'}</td>

                                                        </tr>
                                                        {expandedLogs.has(log.id) && (
                                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                                                <td colSpan="5" style={{ padding: '0 1rem 1rem 2.8rem' }}>
                                                                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#4b5563' }}>
                                                                        <div>
                                                                            <span style={{ color: '#9ca3af', marginRight: '8px' }}>เวลาเข้า:</span>
                                                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{log.start_time ? log.start_time.slice(0, 5) : '-'}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span style={{ color: '#9ca3af', marginRight: '8px' }}>เวลาออก:</span>
                                                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{log.end_time ? log.end_time.slice(0, 5) : '-'}</span>
                                                                        </div>
                                                                        {Number(log.late_hours) > 0 && (
                                                                            <div style={{ color: '#d97706', fontWeight: '500' }}>
                                                                                สาย: {Math.round(log.late_hours * 60)} นาที
                                                                            </div>
                                                                        )}
                                                                        {log.is_early && (
                                                                            <div style={{ color: '#ea580c', fontWeight: '500' }}>ออกก่อน</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {workLogs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>ยังไม่มีบันทึกเวลาทำงาน</div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default EmployeeFormPage;
