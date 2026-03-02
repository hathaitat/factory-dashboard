import { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { useDialog } from '../contexts/DialogContext';

const LogTimeModal = ({ employee, onClose, onSuccess }) => {
    const { showAlert } = useDialog();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
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
            await employeeService.addWorkLog({
                employee_id: employee.id,
                ...formData
            });
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
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-panel" onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: '400px', padding: '0',
                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>ลงเวลาทำงาน</h3>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {employee.code} - {employee.full_name}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                            วันที่
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input
                                type="date"
                                name="work_date"
                                value={formData.work_date}
                                onChange={handleChange}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                จำนวนวัน
                            </label>
                            <select
                                name="work_days"
                                value={formData.work_days}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            >
                                <option value="1">1 วัน</option>
                                <option value="0.5">0.5 วัน (ครึ่งวัน)</option>
                                <option value="0">0 วัน (หยุด/ลา)</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                OT (ชั่วโมง)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                name="ot_hours"
                                value={formData.ot_hours}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                            หมายเหตุ
                        </label>
                        <input
                            type="text"
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="เช่น มาสาย, ลากิจ, กลับก่อน"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#8b5cf6',
                            color: 'white',
                            fontWeight: '500',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                            fontSize: '1rem',
                            opacity: isSaving ? 0.7 : 1
                        }}
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
