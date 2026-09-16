import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calculator, Gift, Plus, Trash2 } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { payrollService } from '../services/payrollService';
import {
    calculatePayroll,
    getBirthdayInPeriod,
    isMonthlyEmployee,
    isDeductionItem,
    parseNum,
    BIRTHDAY_ALLOWANCE_DEFAULT,
    DAYS_PER_MONTH,
    PAY_PERIODS_PER_MONTH
} from '../utils/payrollCalc';

const EMPTY_FORM = {
    actual_working_days: 0,
    daily_wage: 0,
    monthly_salary: 0,
    position_allowance: 0,
    skill_allowance: 0,
    ot_1_5_hours: 0,
    ot_1_6_hours: 0,
    ot_2_0_hours: 0,
    company_loan: 0,
    social_security: 0,
    transport_allowance: 0,
    bonus: 0,
    shift_allowance: 0,
    back_pay: 0,
    diligence_allowance: 0,
    birthday_allowance: 0,
    custom_allowances: []
};

// รายการย่อยที่บันทึกไว้ก่อนมีฟิลด์ type ต้องเติม type ให้ชัดเจนก่อนแสดงผล
const normalizeCustomAllowances = (list) =>
    (Array.isArray(list) ? list : []).map((item) => ({
        name: item?.name ?? '',
        amount: item?.amount ?? 0,
        type: item?.type === 'deduction' || item?.type === 'income'
            ? item.type
            : (isDeductionItem(item) ? 'deduction' : 'income')
    }));

const PayrollEntryModal = ({ isOpen, onClose, onSuccess, employee, period, existingEntry }) => {
    const { showError } = useDialog();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    // true = ให้ระบบคำนวณประกันสังคม 5% ของรายรับรวมให้อัตโนมัติ
    const [ssoAuto, setSsoAuto] = useState(true);

    const isMonthly = isMonthlyEmployee(employee);
    // วันคล้ายวันเกิดที่ตกอยู่ในงวดนี้ (null = ไม่มี หรือยังไม่ได้บันทึกวันเกิดพนักงาน)
    const birthdayDate = useMemo(
        () => getBirthdayInPeriod(employee, period),
        [employee, period]
    );
    const birthdayText = birthdayDate
        ? birthdayDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const missingDateOfBirth = Boolean(employee) && !employee.date_of_birth;

    useEffect(() => {
        if (!isOpen || !employee || !period) return;

        if (existingEntry) {
            setFormData({
                actual_working_days: existingEntry.actual_working_days ?? 0,
                daily_wage: existingEntry.daily_wage ?? 0,
                monthly_salary: existingEntry.monthly_salary ?? 0,
                position_allowance: existingEntry.position_allowance ?? 0,
                skill_allowance: existingEntry.skill_allowance ?? 0,
                ot_1_5_hours: existingEntry.ot_1_5_hours ?? 0,
                ot_1_6_hours: existingEntry.ot_1_6_hours ?? 0,
                ot_2_0_hours: existingEntry.ot_2_0_hours ?? 0,
                company_loan: existingEntry.company_loan ?? 0,
                social_security: existingEntry.social_security ?? 0,
                transport_allowance: existingEntry.transport_allowance ?? 0,
                bonus: existingEntry.bonus ?? 0,
                shift_allowance: existingEntry.shift_allowance ?? 0,
                back_pay: existingEntry.back_pay ?? 0,
                diligence_allowance: existingEntry.diligence_allowance ?? 0,
                birthday_allowance: existingEntry.birthday_allowance ?? 0,
                custom_allowances: normalizeCustomAllowances(existingEntry.custom_allowances)
            });
            // เปิดโหมดอัตโนมัติไว้ ถ้ายอดที่บันทึกไว้ยังเท่ากับ 5% ของรายรับรวมพอดี
            // ไม่งั้นพอมาแก้เบี้ยเลี้ยงทีหลัง ยอดประกันสังคมจะค้างอยู่ที่ของเดิม
            const autoSso = calculatePayroll({ ...existingEntry, social_security: null }, employee).socialSecurity;
            const savedSso = existingEntry.social_security;
            setSsoAuto(
                savedSso === null || savedSso === undefined || Math.abs(parseNum(savedSso) - autoSso) < 0.01
            );
        } else {
            setFormData({
                ...EMPTY_FORM,
                actual_working_days: period.working_days ?? 0,
                daily_wage: employee.daily_wage ?? 0,
                monthly_salary: employee.monthly_salary ?? 0,
                position_allowance: employee.position_allowance ?? 0,
                skill_allowance: employee.skill_allowance ?? 0,
                // เติมค่าวันเกิดให้อัตโนมัติเฉพาะตอนสร้างรายการใหม่
                birthday_allowance: getBirthdayInPeriod(employee, period) ? BIRTHDAY_ALLOWANCE_DEFAULT : 0
            });
            setSsoAuto(true);
        }
    }, [isOpen, employee, period, existingEntry]);

    // ค่าที่ใช้คำนวณ: โหมดอัตโนมัติส่ง null ให้สูตรกลางคิด 5% จากรายรับรวมเอง
    // (คิดเองที่นี่ไม่ได้ เพราะต้องรู้รายรับรวมก่อน ซึ่งเป็นผลลัพธ์ของสูตรกลาง)
    const entryForCalc = useMemo(() => ({
        ...formData,
        social_security: ssoAuto ? null : parseNum(formData.social_security)
    }), [formData, ssoAuto]);

    const totals = useMemo(
        () => calculatePayroll(entryForCalc, employee),
        [entryForCalc, employee]
    );

    if (!isOpen || !employee || !period) return null;

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSsoChange = (e) => {
        setSsoAuto(false);
        setFormData((prev) => ({ ...prev, social_security: e.target.value }));
    };

    const handleAddCustomAllowance = () => {
        setFormData((prev) => ({
            ...prev,
            custom_allowances: [...prev.custom_allowances, { name: '', amount: 0, type: 'income' }]
        }));
    };

    const handleCustomAllowanceChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            custom_allowances: prev.custom_allowances.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleRemoveCustomAllowance = (index) => {
        setFormData((prev) => ({
            ...prev,
            custom_allowances: prev.custom_allowances.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await payrollService.upsertPayrollEntry({
                ...formData,
                // ช่อง OT ที่ไม่ได้แสดงตามประเภทพนักงาน ต้องไม่ถูกบันทึกค้างไว้เป็นเงินผี
                // ช่องค่าจ้างของอีกประเภทต้องไม่ถูกบันทึกค้าง ไม่งั้นสลิป/รายงานจะเดาประเภทผิด
                daily_wage: isMonthly ? 0 : formData.daily_wage,
                monthly_salary: isMonthly ? formData.monthly_salary : 0,
                ot_1_5_hours: isMonthly ? 0 : formData.ot_1_5_hours,
                ot_1_6_hours: isMonthly ? formData.ot_1_6_hours : 0,
                social_security: totals.socialSecurity,
                custom_allowances: formData.custom_allowances
                    .filter((item) => String(item.name).trim() !== '' || parseNum(item.amount) !== 0)
                    .map((item) => ({
                        name: String(item.name).trim(),
                        amount: parseNum(item.amount),
                        type: item.type === 'deduction' ? 'deduction' : 'income'
                    })),
                period_id: period.id,
                employee_id: employee.id
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving payroll entry:', error);
            // ต้องโชว์ข้อความจริงจากฐานข้อมูล ไม่งั้นปัญหาอย่าง "ไม่มีคอลัมน์นี้"
            // จะถูกกลบจนหาสาเหตุไม่เจอ
            showError(`เกิดข้อผิดพลาดในการบันทึกข้อมูลเงินเดือน: ${error.message || error.code || 'ไม่ทราบสาเหตุ'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const money = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inputClass = 'glass-input w-full p-2 bg-main border border-border rounded-lg text-main';
    const labelClass = 'block mb-2 text-sm text-textMuted font-medium';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-main w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="m-0 text-xl font-semibold">
                            จัดการเงินเดือน: {employee.full_name} ({employee.code})
                        </h2>
                        <p className="m-0 mt-1 text-sm text-textMuted">{period.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border-0 bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {birthdayDate && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                            <Gift className="text-orange-500 shrink-0" size={24} />
                            <div className="flex-1">
                                <h4 className="m-0 text-orange-800 font-semibold">พนักงานมีวันเกิดในงวดนี้</h4>
                                <p className="m-0 mt-1 text-orange-700 text-sm">
                                    ตรงกับ<strong> {birthdayText}</strong>
                                    {parseNum(formData.birthday_allowance) > 0
                                        ? ` — ใส่ค่าวันเกิด ฿${parseNum(formData.birthday_allowance).toLocaleString()} ไว้แล้ว แก้ไขได้ที่ช่อง "ค่าวันเกิด"`
                                        : ' — ยังไม่ได้ใส่ค่าวันเกิดในรายการนี้'}
                                </p>
                            </div>
                            {parseNum(formData.birthday_allowance) !== BIRTHDAY_ALLOWANCE_DEFAULT && (
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, birthday_allowance: BIRTHDAY_ALLOWANCE_DEFAULT }))}
                                    className="shrink-0 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg border-0 hover:bg-orange-200 cursor-pointer font-medium transition-colors"
                                >
                                    ใส่ ฿{BIRTHDAY_ALLOWANCE_DEFAULT}
                                </button>
                            )}
                        </div>
                    )}

                    {missingDateOfBirth && (
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            ยังไม่ได้บันทึกวันเกิดของพนักงานคนนี้ ระบบจึงตรวจค่าวันเกิดให้อัตโนมัติไม่ได้
                        </div>
                    )}

                    <form id="payroll-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div>
                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 border-b border-border pb-2">
                                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                                ข้อมูลหลัก
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {isMonthly ? (
                                    <div className="form-group">
                                        <label className={labelClass}>เงินเดือน (บาท/เดือน)</label>
                                        <input type="number" name="monthly_salary" value={formData.monthly_salary} onChange={handleChange} min="0" step="0.01" className={inputClass} required />
                                        <p className="m-0 mt-1 text-xs text-textMuted">
                                            อัตราต่อวัน ฿{money(totals.dailyRate)} (เงินเดือน ÷ {DAYS_PER_MONTH}) ใช้คิด OT
                                        </p>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label className={labelClass}>ค่าแรงรายวัน (บาท)</label>
                                        <input type="number" name="daily_wage" value={formData.daily_wage} onChange={handleChange} min="0" step="0.01" className={inputClass} required />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className={labelClass}>วันทำงานจริง (วัน)</label>
                                    <input type="number" name="actual_working_days" value={formData.actual_working_days} onChange={handleChange} min="0" step="0.5" className={inputClass} required />
                                    {isMonthly && (
                                        <p className="m-0 mt-1 text-xs text-textMuted">
                                            บันทึกไว้เป็นข้อมูลเท่านั้น ไม่มีผลต่อยอดเงิน
                                        </p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>{isMonthly ? 'เงินเดือนงวดนี้' : 'ค่าแรงรวม'}</label>
                                    <div className="p-2 rounded-lg bg-black/5 border border-border font-semibold">
                                        ฿{money(totals.basePay)}
                                    </div>
                                    <p className="m-0 mt-1 text-xs text-textMuted">
                                        {isMonthly
                                            ? `เงินเดือน ÷ ${PAY_PERIODS_PER_MONTH} (จ่ายเต็มครึ่งเดือน)`
                                            : 'ค่าแรงรายวัน × วันทำงานจริง'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                                <h3 className="text-lg font-medium flex items-center gap-2 m-0">
                                    <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                                    รายได้อื่นๆ
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleAddCustomAllowance}
                                    className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg border-0 hover:bg-green-100 flex items-center gap-1 cursor-pointer font-medium"
                                >
                                    <Plus size={16} />
                                    เพิ่มรายการย่อย
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="form-group">
                                    <label className={labelClass}>ค่าตำแหน่ง</label>
                                    <input type="number" name="position_allowance" value={formData.position_allowance} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>ค่าทักษะ</label>
                                    <input type="number" name="skill_allowance" value={formData.skill_allowance} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>ค่าขนส่ง</label>
                                    <input type="number" name="transport_allowance" value={formData.transport_allowance} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>ค่ากะ</label>
                                    <input type="number" name="shift_allowance" value={formData.shift_allowance} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>โบนัส</label>
                                    <input type="number" name="bonus" value={formData.bonus} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>ตกเบิก</label>
                                    <input type="number" name="back_pay" value={formData.back_pay} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={labelClass}>เบี้ยขยัน</label>
                                    <input type="number" name="diligence_allowance" value={formData.diligence_allowance} onChange={handleChange} step="0.01" className={inputClass} />
                                </div>
                                <div className="form-group">
                                    <label className={`${labelClass} ${birthdayDate ? 'text-orange-600' : 'text-textMuted'} flex items-center gap-1`}>
                                        {birthdayDate && <Gift size={14} />}
                                        ค่าวันเกิด
                                    </label>
                                    <input
                                        type="number"
                                        name="birthday_allowance"
                                        value={formData.birthday_allowance}
                                        onChange={handleChange}
                                        step="0.01"
                                        className={`${inputClass} ${birthdayDate ? 'border-orange-300 bg-orange-50/40' : ''}`}
                                    />
                                    {birthdayDate && (
                                        <p className="m-0 mt-1 text-xs text-orange-600">
                                            วันเกิด {birthdayDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {formData.custom_allowances.length > 0 && (
                                <div className="mt-4 flex flex-col gap-3">
                                    {formData.custom_allowances.map((allowance, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <select
                                                value={allowance.type}
                                                onChange={(e) => handleCustomAllowanceChange(index, 'type', e.target.value)}
                                                className={`${inputClass} w-32 shrink-0`}
                                            >
                                                <option value="income">รายได้</option>
                                                <option value="deduction">รายการหัก</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="ชื่อรายการ (เช่น ค่าอาหาร)"
                                                value={allowance.name}
                                                onChange={(e) => handleCustomAllowanceChange(index, 'name', e.target.value)}
                                                className={`${inputClass} flex-1`}
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="จำนวนเงิน"
                                                value={allowance.amount}
                                                onChange={(e) => handleCustomAllowanceChange(index, 'amount', e.target.value)}
                                                step="0.01"
                                                className={`${inputClass} w-1/4`}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCustomAllowance(index)}
                                                className="w-10 h-10 shrink-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 border-0 flex items-center justify-center cursor-pointer transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 border-b border-border pb-2">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
                                    ล่วงเวลา (OT)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {isMonthly ? (
                                        <div className="form-group">
                                            <label className={labelClass}>OT 1.6 (ชั่วโมง)</label>
                                            <input type="number" name="ot_1_6_hours" value={formData.ot_1_6_hours} onChange={handleChange} min="0" step="0.5" className={inputClass} />
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label className={labelClass}>OT 1.5 (ชั่วโมง)</label>
                                            <input type="number" name="ot_1_5_hours" value={formData.ot_1_5_hours} onChange={handleChange} min="0" step="0.5" className={inputClass} />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className={labelClass}>OT 2.0 (ชั่วโมง)</label>
                                        <input type="number" name="ot_2_0_hours" value={formData.ot_2_0_hours} onChange={handleChange} min="0" step="0.5" className={inputClass} />
                                    </div>
                                </div>
                                <p className="m-0 mt-3 text-xs text-textMuted">
                                    คิดจากค่าแรงรายชั่วโมง ฿{money(totals.hourlyRate)} · รวม OT ฿{money(totals.otTotalAmount)}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 border-b border-border pb-2">
                                    <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                                    รายการหัก
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className={labelClass}>ประกันสังคม</label>
                                        <input
                                            type="number"
                                            name="social_security"
                                            value={ssoAuto ? totals.socialSecurity : formData.social_security}
                                            onChange={handleSsoChange}
                                            step="0.01"
                                            className={inputClass}
                                        />
                                        <label className="flex items-center gap-2 mt-2 text-xs text-textMuted cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={ssoAuto}
                                                onChange={(e) => setSsoAuto(e.target.checked)}
                                                className="cursor-pointer"
                                            />
                                            คำนวณอัตโนมัติ 5% ของรายรับรวม
                                        </label>
                                        {ssoAuto && (
                                            <p className="m-0 mt-1 text-xs text-textMuted">
                                                5% ของรายรับรวม ฿{money(totals.totalIncome)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className={labelClass}>เงินกู้ยืมบริษัท</label>
                                        <input type="number" name="company_loan" value={formData.company_loan} onChange={handleChange} step="0.01" className={inputClass} />
                                        <p className="m-0 mt-1 text-xs text-textMuted">หักหลังประกันสังคม</p>
                                    </div>
                                </div>
                                {totals.customDeductionTotal > 0 && (
                                    <p className="m-0 mt-3 text-xs text-textMuted">
                                        รายการหักย่อยเพิ่มเติม ฿{money(totals.customDeductionTotal)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-border shrink-0 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-textMuted">
                            <Calculator size={18} />
                            <span>สรุปยอด:</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-textMuted">รายรับรวม</span>
                                <span className="font-semibold text-green-600">฿{money(totals.totalIncome)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-textMuted">หักรวม</span>
                                <span className="font-semibold text-red-600">฿{money(totals.totalDeductions)}</span>
                            </div>
                            <div className="flex flex-col pl-4 border-l border-gray-300">
                                <span className="text-xs text-gray-500 font-medium">รับสุทธิ</span>
                                <span className="text-xl font-bold text-blue-600">฿{money(totals.netPay)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-border bg-main text-textMuted hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            form="payroll-entry-form"
                            disabled={isSaving}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg border-0 bg-blue-500 text-white flex items-center justify-center gap-2 font-medium shadow-md hover:bg-blue-600 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollEntryModal;
