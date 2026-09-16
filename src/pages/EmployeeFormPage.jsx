import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, User, DollarSign, Calendar, MapPin, Phone, Clock, Plus, Heart, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { userService } from '../services/userService';
import { getLocalDateString } from '../utils/dateUtils';
import { isMonthlyEmployee } from '../utils/payrollCalc';
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

    const [formData, setFormData] = useState({
        code: '',
        full_name: '',
        date_of_birth: '',
        address: '',
        phone: '',
        position: '',
        employment_type: 'รายเดือน',
        daily_wage: '',
        monthly_salary: '',
        start_date: getLocalDateString(),
        status: 'Active',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: ''
    });

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);

    // พนักงานรายเดือนกรอก "เงินเดือน" ส่วนรายวัน/ฝึกงานกรอก "ค่าแรงรายวัน" คนละคอลัมน์กัน
    const isMonthlyType = isMonthlyEmployee(formData);

    useEffect(() => {
        if (isEditMode) {
            loadEmployee();
        } else {
            generateCode();
        }
    }, [id]);

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
                // ล้างช่องค่าจ้างของอีกประเภททิ้ง ไม่ให้เหลือเลขค้างไว้จนหน้าคำนวณหยิบไปใช้ผิด
                daily_wage: isMonthlyType ? 0 : formData.daily_wage,
                monthly_salary: isMonthlyType ? formData.monthly_salary : 0,
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

                        <button
                            type="submit"
                            form="employee-form"
                            disabled={isSaving}
                            className={`px-6 py-2.5 rounded-lg border-none bg-violet-500 text-white flex items-center gap-2 font-medium shadow-[0_4px_12px_rgba(139,92,246,0.3)] ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                </div>
            </div>

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
                                    value={formData.employment_type || 'รายเดือน'}
                                    onChange={handleChange}
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                >
                                    <option value="รายเดือน">รายเดือน</option>
                                    <option value="รายวัน">รายวัน</option>
                                    <option value="ฝึกงาน">ฝึกงาน</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-mobile-stack grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="form-group">
                                {isMonthlyType ? (
                                    <>
                                        <label className="block mb-2 text-textMuted">เงินเดือน (บาท/เดือน)</label>
                                        <input
                                            type="number"
                                            name="monthly_salary"
                                            value={formData.monthly_salary || ''}
                                            onChange={handleChange}
                                            placeholder="เช่น 20000"
                                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                        />
                                        <div className="mt-2 text-sm text-textMuted">
                                            งวดครึ่งเดือนจะได้ ฿{(parseFloat(formData.monthly_salary || 0) / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className="block mb-2 text-textMuted">ค่าแรงรายวัน (บาท)</label>
                                        <input
                                            type="number"
                                            name="daily_wage"
                                            value={formData.daily_wage || ''}
                                            onChange={handleChange}
                                            placeholder="เช่น 350"
                                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                        />
                                    </>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-textMuted">ค่าตำแหน่ง (บาท)</label>
                                <input
                                    type="number"
                                    name="position_allowance"
                                    value={formData.position_allowance || ''}
                                    onChange={handleChange}
                                    placeholder="เช่น 1000"
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 text-textMuted">ค่าทักษะ (บาท)</label>
                                <input
                                    type="number"
                                    name="skill_allowance"
                                    value={formData.skill_allowance || ''}
                                    onChange={handleChange}
                                    placeholder="เช่น 500"
                                    className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                />
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
        </div>
    );
};

export default EmployeeFormPage;
