import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';
import { payrollService } from '../services/payrollService';
import { useAuth } from '../contexts/AuthContext';

const CreatePayrollPeriodModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { showAlert, showError } = useDialog();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        working_days: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.start_date || !formData.end_date || !formData.working_days) {
            showAlert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (formData.start_date > formData.end_date) {
            showAlert('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
            return;
        }

        setIsSaving(true);
        try {
            await payrollService.createPayrollPeriod({
                ...formData,
                created_by: user?.fullName || 'system'
            });
            onSuccess();
            onClose();
            // Reset form
            setFormData({ name: '', start_date: '', end_date: '', working_days: '' });
        } catch (error) {
            console.error('Error creating payroll period:', error);
            showError(`เกิดข้อผิดพลาดในการสร้างงวดเงินเดือน: ${error.message || error.code || 'ไม่ทราบสาเหตุ'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-main w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center shrink-0">
                    <h2 className="m-0 text-xl font-semibold">สร้างงวดเงินเดือนใหม่</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border-0 bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="payroll-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="form-group">
                            <label className="block mb-2 text-textMuted font-medium">ชื่องวด</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="เช่น งวด 1-15 ก.ย. 2569"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="block mb-2 text-textMuted font-medium">วันที่เริ่มต้น</label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="block mb-2 text-textMuted font-medium">วันที่สิ้นสุด</label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="block mb-2 text-textMuted font-medium">จำนวนวันทำงานตามรอบ (วัน)</label>
                            <input
                                type="number"
                                name="working_days"
                                value={formData.working_days}
                                onChange={handleChange}
                                placeholder="เช่น 15, 26, 30"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                                required
                            />
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-border bg-main text-textMuted hover:bg-gray-50 cursor-pointer font-medium transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="payroll-form"
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg border-0 bg-blue-500 text-white flex items-center gap-2 font-medium shadow-md hover:bg-blue-600 transition-colors ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกงวด'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePayrollPeriodModal;
