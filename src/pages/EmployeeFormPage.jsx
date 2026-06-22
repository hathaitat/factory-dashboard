import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, User, DollarSign, Calendar, MapPin, Phone, Clock, Plus, Heart, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { userService } from '../services/userService';
import { getLocalDateString } from '../utils/dateUtils';
import { useDialog } from '../contexts/DialogContext';
import * as XLSX from 'xlsx-js-style';
import LastUpdated from '../components/LastUpdated';
import { useAuth } from '../contexts/AuthContext';

const EmployeeFormPage = () => {
    const { user } = useAuth();
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
        start_date: getLocalDateString(),
        status: 'Active',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: ''
    });

    // Timesheet State
    const [workLogs, setWorkLogs] = useState([]);
    const [expandedLogs, setExpandedLogs] = useState(new Set()); // Track expanded rows
    const [logForm, setLogForm] = useState({
        work_date: getLocalDateString(),
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
                setLogForm(prev => ({ ...prev, work_date: getLocalDateString(today) }));
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
            const currentUser = user;
            const payload = {
                ...formData,
                createdBy: isEditMode ? undefined : (currentUser?.fullName || currentUser?.username || 'Unknown'),
                updatedBy: currentUser?.fullName || currentUser?.username || 'Unknown'
            };
            if (isEditMode) {
                await employeeService.updateEmployee(id, payload);
            } else {
                await employeeService.createEmployee(payload);
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

    // Group logs by Month and Half-Month - Memoized
    const groupedLogs = React.useMemo(() => {
        return workLogs
            .filter(log => {
                if (!periodStart || !periodEnd) return true;
                return log.work_date >= periodStart && log.work_date <= periodEnd;
            })
            .reduce((acc, log) => {
                const date = new Date(log.work_date);
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const day = date.getDate();

                if (!acc[yearMonth]) acc[yearMonth] = { first: [], second: [] };

                if (day <= 15) {
                    acc[yearMonth].first.push(log);
                } else {
                    acc[yearMonth].second.push(log);
                }
                return acc;
            }, {});
    }, [workLogs, periodStart, periodEnd]);

    // Helper to calculate total - Memoized per list
    const getTotals = (logs) => {
        return logs.reduce((sum, log) => ({
            days: sum.days + parseFloat(log.work_days || 0),
            ot: sum.ot + parseFloat(log.ot_hours || 0)
        }), { days: 0, ot: 0 });
    };

    const exportTimesheetToExcel = (monthKey, logs, title) => {
        const wb = XLSX.utils.book_new();
        const data = logs.map(log => ({
            'วันที่': log.work_date,
            'วันทำงาน': log.work_days,
            'OT (ชม.)': log.ot_hours,
            'เข้างาน': log.start_time?.slice(0, 5) || '-',
            'ออกงาน': log.end_time?.slice(0, 5) || '-',
            'หมายเหตุ': log.note || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
        XLSX.writeFile(wb, `Timesheet_${formData.full_name}_${monthKey}_${title}.xlsx`);
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

    if (isLoading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="px-4 pb-8 max-w-5xl mx-auto">
            <button
                onClick={() => navigate('/dashboard/employees')}
                className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-muted mb-4 p-2 rounded-lg transition-all duration-200"
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
                <ArrowLeft size={18} /> กลับไปหน้ารายชื่อ
            </button>

            <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="m-[0] text-3xl font-semibold">
                        {isEditMode ? formData.full_name : 'เพิ่มพนักงานใหม่'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {formData.code} • {formData.position || 'ไม่ระบุตำแหน่ง'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {isEditMode && (
                        <div className="bg-gray-100 p-2 rounded-lg flex gap-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-4 py-2 border-none rounded-md cursor-pointer font-medium flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-violet-500 shadow-sm' : 'bg-transparent text-gray-500'}`}
                            >
                                <User size={18} /> ข้อมูลส่วนตัว
                            </button>
                            <button
                                onClick={() => setActiveTab('timesheet')}
                                className={`px-4 py-2 border-none rounded-md cursor-pointer font-medium flex items-center gap-2 ${activeTab === 'timesheet' ? 'bg-white text-violet-500 shadow-sm' : 'bg-transparent text-gray-500'}`}
                            >
                                <Clock size={18} /> {periodStart ? 'ลงเวลาทำงาน' : 'ประวัติการทำงาน'}
                            </button>
                        </div>
                    )}
                    {activeTab === 'profile' && (
                        <button
                            type="submit"
                            form="employee-form"
                            disabled={isSaving}
                            className={`px-6 py-2.5 rounded-lg border-none bg-violet-500 text-white flex items-center gap-2 font-medium shadow-[0_4px_12px_rgba(139,92,246,0.3)] ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    )}
                </div>
            </div>

            {/* TAB 1: Profile Form */}
            {activeTab === 'profile' && (
                <form id="employee-form" onSubmit={handleSubmit} className="grid gap-8">
                    {/* ... (Existing Form Content) ... */}
                    <div className="glass-panel p-8">
                        <h3 className="mt-[0] mb-6 flex items-center gap-2 text-violet-500">
                            <User size={20} /> ข้อมูลทั่วไป
                        </h3>

                        <div className="grid-mobile-stack grid grid-cols-[1fr_2fr] gap-6 mb-6">
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">รหัสพนักงาน</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    required

                                    placeholder="เช่น นายสมชาย ขยันทำงาน"
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                        </div>

                        <div className="grid-mobile-stack grid grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">
                                    <Calendar size={14} className="inline mr-1" />
                                    วันเดือนปีเกิด
                                    {formData.date_of_birth && (
                                        <span className="ml-2 text-sm text-violet-500 bg-gray-100 p-[2px 8px] rounded-xl">
                                            อายุ {calculateAge(formData.date_of_birth)} ปี
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    value={formData.date_of_birth || ''}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">
                                    <Phone size={14} className="inline mr-1" />
                                    เบอร์โทรศัพท์
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                        </div>

                        <div className="form-group mb-6">
                            <label className="block mb-2 text-gray-500">
                                <MapPin size={14} className="inline mr-1" />
                                ที่อยู่
                            </label>
                            <textarea
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                rows="3"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main resize-y"
                            />
                        </div>
                    </div>

                    <div className="glass-panel p-8">
                        <h3 className="mt-[0] mb-6 flex items-center gap-2 text-red-500">
                            <Heart size={20} /> ผู้ติดต่อฉุกเฉิน
                        </h3>

                        <div className="grid-mobile-stack grid grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">ชื่อผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    name="emergency_contact_name"
                                    value={formData.emergency_contact_name || ''}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">ความสัมพันธ์</label>
                                <input
                                    type="text"
                                    name="emergency_contact_relation"
                                    value={formData.emergency_contact_relation || ''}
                                    onChange={handleChange}
                                    placeholder="เช่น บิดา, มารดา, คู่สมรส"
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block mb-2 text-gray-500">เบอร์โทรศัพท์ฉุกเฉิน</label>
                            <input
                                type="text"
                                name="emergency_contact_phone"
                                value={formData.emergency_contact_phone || ''}
                                onChange={handleChange}
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                        </div>
                    </div>

                    <div className="glass-panel p-8">
                        <h3 className="mt-[0] mb-6 flex items-center gap-2 text-emerald-500">
                            <DollarSign size={20} /> ข้อมูลการทำงาน
                        </h3>

                        <div className="grid-mobile-stack grid grid-cols-2 gap-6 mb-6">
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">ตำแหน่ง</label>
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position || ''}
                                    onChange={handleChange}
                                    placeholder="เช่น พนักงานฝ่ายผลิต"
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">ประเภทการจ้างงาน</label>
                                <select
                                    name="employment_type"
                                    value={formData.employment_type || 'Full-time'}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">ฝึกงาน (Internship)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-mobile-stack grid grid-cols-2 gap-6 mb-6">
                            <div className="grid-mobile-stack grid grid-cols-2 gap-6 mb-6">
                                <div className="form-group">
                                    <label className="block mb-2 text-textMuted">ค่าแรงรายวัน (บาท)</label>
                                    <input
                                        type="number"
                                        name="daily_wage"
                                        value={formData.daily_wage || ''}
                                        onChange={handleChange}
                                        placeholder="เช่น 350"
                                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="block mb-2 text-textMuted">เบี้ยขยัน (บาท/งวด)</label>
                                    <input
                                        type="number"
                                        name="diligence_allowance"
                                        value={formData.diligence_allowance || ''}
                                        onChange={handleChange}
                                        placeholder="เช่น 500"
                                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid-mobile-stack grid grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">
                                    <Calendar size={14} className="inline mr-1" />
                                    วันที่เริ่มงาน
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                                {formData.start_date && (
                                    <div className="mt-2 text-sm text-emerald-500">
                                        ทำงานมาแล้ว: {calculateWorkDuration(formData.start_date)}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-gray-500">สถานะ</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                >
                                    <option value="Active">ทำงานอยู่ (Active)</option>
                                    <option value="Resigned">ลาออก (Resigned)</option>
                                    <option value="OnLeave">พักงาน (On Leave)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="glass-panel p-5 text-[0.85rem] text-textMuted flex flex-col gap-2 mt-4">
                            {formData.created_at && (
                                <div>สร้างเมื่อ: {new Date(formData.created_at).toLocaleDateString('th-TH')}</div>
                            )}
                            {formData.created_by && (
                                <div className="flex items-center gap-2">
                                    <User size={14} /> สร้างโดย: <span className="text-textMain font-semibold">{formData.created_by}</span>
                                </div>
                            )}
                            <LastUpdated updatedBy={formData.updated_by} updatedAt={formData.updated_at} />
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/employees')}
                            className="px-6 py-3 rounded-lg border border-border bg-transparent text-muted cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`px-6 py-3 rounded-lg border-none bg-violet-500 text-white flex items-center gap-2 font-medium shadow-[0_4px_12px_rgba(139,92,246,0.3)] ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                    <div className="grid gap-8">
                        {/* Add Log Form */}
                        {/* Add Log Form */}
                        {periodStart && (
                            <div className="glass-panel p-6 bg-card">
                                <h3 className="mt-[0] mb-4 text-lg">บันทึกเวลาทำงาน</h3>
                                <form onSubmit={handleAddLog} className="flex gap-4 items-end flex-wrap">
                                    <div className="min-w-[150px]">
                                        <label className="block text-sm mb-1 text-gray-500">วันที่</label>
                                        <input
                                            type="date"
                                            name="work_date"
                                            value={logForm.work_date}
                                            onChange={handleLogChange}
                                            required
                                            className="glass-input w-full p-2.5 bg-main border border-border rounded-md"
                                        />
                                    </div>
                                    <div className="w-[100px]">
                                        <label className="block text-sm mb-1 text-gray-500">จำนวนวัน</label>
                                        <select
                                            name="work_days"
                                            value={logForm.work_days}
                                            onChange={handleLogChange}
                                            className="glass-input w-full p-2.5 bg-main border border-border rounded-md"
                                        >
                                            <option value="1">1 วัน</option>
                                            <option value="0.5">0.5 วัน</option>
                                            <option value="0">0 วัน</option>
                                        </select>
                                    </div>
                                    <div className="w-[100px]">
                                        <label className="block text-sm mb-1 text-gray-500">OT (ชม.)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            name="ot_hours"
                                            value={logForm.ot_hours}
                                            onChange={handleLogChange}
                                            className="glass-input w-full p-2.5 bg-main border border-border rounded-md"
                                        />
                                    </div>
                                    <div className="min-w-[200px]">
                                        <label className="block text-sm mb-1 text-gray-500">หมายเหตุ</label>
                                        <input
                                            type="text"
                                            name="note"
                                            value={logForm.note}
                                            onChange={handleLogChange}
                                            placeholder="เช่น มาสาย, ลากิจ"
                                            className="glass-input w-full p-2.5 bg-main border border-border rounded-md"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="p-[0.6rem 1.2rem] rounded-md border-none bg-emerald-500 text-white font-medium cursor-pointer flex items-center gap-1"
                                    >
                                        <Plus size={18} /> เพิ่ม
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Logs List by Month */}
                        {Object.keys(groupedLogs).sort().reverse().map(monthKey => (
                            <div key={monthKey} className="grid gap-4">
                                <h3 className="m-[1rem 0 0.5rem 0] text-[#4b5563] border-b border-border">
                                    เดือน {monthKey}
                                </h3>

                                {/* Second Half */}
                                {groupedLogs[monthKey].second.length > 0 && (
                                    <div className="glass-panel p-0 border border-violet-500/10">
                                        <div className="bg-[rgba(139, 92, 246, 0.05)] p-[1rem 1.5rem] flex justify-between items-center border-b border-border">
                                            <div className="flex items-center gap-[0.75rem]">
                                                <span className="text-main">งวดวันที่ 16 - สิ้นเดือน</span>
                                                <button
                                                    onClick={() => exportTimesheetToExcel(monthKey, groupedLogs[monthKey].second, '16-end')}
                                                    className="p-1 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 cursor-pointer flex"
                                                    title="Export Excel งวดนี้"
                                                >
                                                    <FileSpreadsheet size={14} />
                                                </button>
                                            </div>
                                            <div className="text-[0.95rem]">
                                                รวม: <b className="text-emerald-500">{getTotals(groupedLogs[monthKey].second).days} วัน</b> | OT: <b className="text-violet-500">{getTotals(groupedLogs[monthKey].second).ot} ชม.</b>
                                            </div>
                                        </div>
                                        <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                                            <table className="w-full text-[0.95rem]">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="p-3 text-left text-gray-500 font-medium">วันที่</th>
                                                        <th className="p-3 text-center text-gray-500 font-medium">วันทำงาน</th>
                                                        <th className="p-3 text-center text-gray-500 font-medium">OT</th>
                                                        <th className="p-3 text-left text-gray-500 font-medium">หมายเหตุ</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {groupedLogs[monthKey].second.map(log => (
                                                        <React.Fragment key={log.id}>
                                                            <tr onClick={() => toggleExpand(log.id)} className={`cursor-pointer ${expandedLogs.has(log.id) ? 'border-b-0 bg-slate-50' : 'border-b border-border bg-transparent'}`}>
                                                                <td className="p-3 flex items-center gap-[8px]">
                                                                    {expandedLogs.has(log.id) ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                                                    {log.work_date}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-full ${log.work_days == 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {log.work_days}
                                                                    </span>
                                                                </td>
                                                                <td className={`p-3 text-center ${log.ot_hours > 0 ? 'text-violet-500' : 'text-gray-300'}`}>
                                                                    {log.ot_hours > 0 ? log.ot_hours : '-'}
                                                                </td>
                                                                <td className="p-3 text-gray-500">{log.note || '-'}</td>

                                                            </tr>
                                                            {expandedLogs.has(log.id) && (
                                                                <tr className="bg-[#f8fafc] border-b border-border">
                                                                    <td colSpan="5" className="p-[0 1rem 1rem 2.8rem]">
                                                                        <div className="flex gap-8 text-[0.95rem] text-[#4b5563]">
                                                                            <div>
                                                                                <span className="text-[#9ca3af] mr-[8px]">เวลาเข้า:</span>
                                                                                <span className="font-mono font-medium">{log.start_time ? log.start_time.slice(0, 5) : '-'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[#9ca3af] mr-[8px]">เวลาออก:</span>
                                                                                <span className="font-mono font-medium">{log.end_time ? log.end_time.slice(0, 5) : '-'}</span>
                                                                            </div>
                                                                            {Number(log.late_hours) > 0 && (
                                                                                <div className="text-[#d97706] font-medium">
                                                                                    สาย: {Math.round(log.late_hours * 60)} นาที
                                                                                </div>
                                                                            )}
                                                                            {log.is_early && (
                                                                                <div className="text-[#ea580c] font-medium">ออกก่อน</div>
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
                                    <div className="glass-panel p-0 border border-violet-500/10">
                                        <div className="bg-[rgba(139, 92, 246, 0.05)] p-[1rem 1.5rem] flex justify-between items-center border-b border-border">
                                            <div className="flex items-center gap-[0.75rem]">
                                                <span className="text-main">งวดวันที่ 1 - 15</span>
                                                <button
                                                    onClick={() => exportTimesheetToExcel(monthKey, groupedLogs[monthKey].first, '01-15')}
                                                    className="p-1 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 cursor-pointer flex"
                                                    title="Export Excel งวดนี้"
                                                >
                                                    <FileSpreadsheet size={14} />
                                                </button>
                                            </div>
                                            <div className="text-[0.95rem]">
                                                รวม: <b className="text-emerald-500">{getTotals(groupedLogs[monthKey].first).days} วัน</b> | OT: <b className="text-violet-500">{getTotals(groupedLogs[monthKey].first).ot} ชม.</b>
                                            </div>
                                        </div>
                                        <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                                            <table className="w-full text-[0.95rem]">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="p-3 text-left text-gray-500 font-medium">วันที่</th>
                                                        <th className="p-3 text-center text-gray-500 font-medium">วันทำงาน</th>
                                                        <th className="p-3 text-center text-gray-500 font-medium">OT</th>
                                                        <th className="p-3 text-left text-gray-500 font-medium">หมายเหตุ</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {groupedLogs[monthKey].first.map(log => (
                                                        <React.Fragment key={log.id}>
                                                            <tr onClick={() => toggleExpand(log.id)} className={`cursor-pointer ${expandedLogs.has(log.id) ? 'border-b-0 bg-slate-50' : 'border-b border-border bg-transparent'}`}>
                                                                <td className="p-3 flex items-center gap-[8px]">
                                                                    {expandedLogs.has(log.id) ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                                                    {log.work_date}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-full ${log.work_days == 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {log.work_days}
                                                                    </span>
                                                                </td>
                                                                <td className={`p-3 text-center ${log.ot_hours > 0 ? 'text-violet-500' : 'text-gray-300'}`}>
                                                                    {log.ot_hours > 0 ? log.ot_hours : '-'}
                                                                </td>
                                                                <td className="p-3 text-gray-500">{log.note || '-'}</td>

                                                            </tr>
                                                            {expandedLogs.has(log.id) && (
                                                                <tr className="bg-[#f8fafc] border-b border-border">
                                                                    <td colSpan="5" className="p-[0 1rem 1rem 2.8rem]">
                                                                        <div className="flex gap-8 text-[0.95rem] text-[#4b5563]">
                                                                            <div>
                                                                                <span className="text-[#9ca3af] mr-[8px]">เวลาเข้า:</span>
                                                                                <span className="font-mono font-medium">{log.start_time ? log.start_time.slice(0, 5) : '-'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[#9ca3af] mr-[8px]">เวลาออก:</span>
                                                                                <span className="font-mono font-medium">{log.end_time ? log.end_time.slice(0, 5) : '-'}</span>
                                                                            </div>
                                                                            {Number(log.late_hours) > 0 && (
                                                                                <div className="text-[#d97706] font-medium">
                                                                                    สาย: {Math.round(log.late_hours * 60)} นาที
                                                                                </div>
                                                                            )}
                                                                            {log.is_early && (
                                                                                <div className="text-[#ea580c] font-medium">ออกก่อน</div>
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
                            <div className="text-center p-8 text-[#ccc]">ยังไม่มีบันทึกเวลาทำงาน</div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default EmployeeFormPage;
