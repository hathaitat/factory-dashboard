import { useState, useEffect } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';

const LogTimeModal = ({ employee, onClose, onSuccess }) => {
    const { showAlert } = useDialog();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        work_date: getLocalDateString(),
        work_days: '1',
        ot_hours: '0',
        note: ''
    });

    // Prevent background scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                employee_id: employee.id,
                work_date: formData.work_date,
                work_days: Number(formData.work_days),
                ot_hours: Number(formData.ot_hours),
                note: formData.note,
                not_scan: false, // Manually entered
                // Reset times if using quick log
                start_time: null,
                end_time: null,
                late_hours: 0,
                is_late: false,
                is_early: false
            };

            await employeeService.upsertWorkLog(payload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving log:', error);
            await showAlert('บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] modal-overlay" onClick={onClose}>
            <div className="w-full max-w-[400px] p-0 bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl glass-panel rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div>
                        <h3 className="m-0 text-xl font-semibold">ลงเวลาทำงาน</h3>
                        <p className="mt-1 mb-0 text-gray-500 text-sm">
                            {employee.code} - {employee.full_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block mb-2 text-gray-500 text-sm font-medium">
                            วันที่
                        </label>
                        <div className="relative">
                            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                name="work_date"
                                value={formData.work_date}
                                onChange={handleChange}
                                required
                                className="glass-input w-full py-2.5 pr-2.5 pl-10 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block mb-2 text-gray-500 text-sm font-medium">
                                จำนวนวัน
                            </label>
                            <select
                                name="work_days"
                                value={formData.work_days}
                                onChange={handleChange}
                                className="glass-input w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            >
                                <option value="1">1 วัน</option>
                                <option value="0.5">0.5 วัน (ครึ่งวัน)</option>
                                <option value="0">0 วัน (หยุด/ลา)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block mb-2 text-gray-500 text-sm font-medium">
                                OT (ชั่วโมง)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                name="ot_hours"
                                value={formData.ot_hours}
                                onChange={handleChange}
                                className="glass-input w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-gray-500 text-sm font-medium">
                            หมายเหตุ
                        </label>
                        <input
                            type="text"
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="เช่น มาสาย, ลากิจ, กลับก่อน"
                            className="glass-input w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className={`w-full p-3 rounded-lg border-none bg-purple-500 text-white font-medium flex justify-center items-center gap-2 text-base transition-all hover:bg-purple-600 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer shadow-lg shadow-purple-500/30'}`}
                    >
                        <Save size={20} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกเวลา'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LogTimeModal;
