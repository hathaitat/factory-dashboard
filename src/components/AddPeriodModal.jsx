import React, { useState } from 'react';
import { X, Calendar, FileText, Save } from 'lucide-react';
import { periodService } from '../services/periodService';

const AddPeriodModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        label: '',
        start_date: '',
        end_date: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            if (!formData.label || !formData.start_date || !formData.end_date) {
                throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            await periodService.createPeriod({
                label: formData.label,
                start_date: formData.start_date,
                end_date: formData.end_date
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1300, backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-panel" style={{
                background: 'white', width: '90%', maxWidth: '500px',
                padding: '0', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    padding: '1.2rem 1.5rem', background: '#37477C', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} /> เพิ่มงวดเวลาใหม่
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                    {error && (
                        <div style={{ padding: '0.8rem', marginBottom: '1.5rem', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                ชื่อเรียกงวด (Label)
                            </label>
                            <input
                                type="text"
                                placeholder="เช่น งวด 1-15 มกราคม 2569"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                style={{
                                    width: '100%', padding: '0.8rem', borderRadius: '8px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem'
                                }}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                    วันที่เริ่ม
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    style={{
                                        width: '100%', padding: '0.8rem', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                    วันที่สิ้นสุด
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    style={{
                                        width: '100%', padding: '0.8rem', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                                background: 'white', color: '#64748b', fontWeight: '500', cursor: 'pointer'
                            }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none',
                                background: '#37477C', color: 'white', fontWeight: '500', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกงวดเวลา'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPeriodModal;
