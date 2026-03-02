import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';

const EditLogModal = ({ cell, onClose, onSave, onDelete }) => {
    const { emp, date, log } = cell;
    const [startTime, setStartTime] = useState(log?.start_time ? log.start_time.slice(0, 5) : '');
    const [endTime, setEndTime] = useState(log?.end_time ? log.end_time.slice(0, 5) : '');
    const [isAbsent, setIsAbsent] = useState(log ? (Number(log.work_days) === 0 && !log.start_time) : false);

    const handleSave = () => {
        let newLog = {
            ...log,
            employee_code: emp.code,
            employee_name: emp.name || emp.full_name, // Handle both naming conventions
            employee_id: emp.id,
            work_date: date.toISOString(),
        };

        if (isAbsent) {
            newLog.start_time = null;
            newLog.end_time = null;
            newLog.work_days = 0;
            newLog.ot_hours = 0;
            newLog.late_hours = 0;
            newLog.is_late = false;
            newLog.is_early = false;
        } else {
            newLog.start_time = startTime ? (startTime.length === 5 ? startTime + ':00' : startTime) : null;
            newLog.end_time = endTime ? (endTime.length === 5 ? endTime + ':00' : endTime) : null;

            if (newLog.start_time && newLog.end_time) {
                newLog.work_days = 1;
            } else if (newLog.start_time || newLog.end_time) {
                newLog.work_days = 0.5;
            } else {
                newLog.work_days = 0;
            }
        }

        onSave(newLog);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex',
            justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(1px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', padding: '1.5rem', borderRadius: '12px',
                width: '320px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }} onClick={e => e.stopPropagation()}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#37477C' }}>
                    แก้ไขข้อมูล: {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </h4>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    {emp.code} - {emp.name || emp.full_name}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isAbsent}
                            onChange={e => setIsAbsent(e.target.checked)}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: '500', color: isAbsent ? '#ef4444' : '#374151' }}>
                            ระบุว่า "ขาดงาน"
                        </span>
                    </label>
                </div>

                {!isAbsent && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#64748b' }}>เวลาเข้า</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', borderRadius: '6px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#64748b' }}>เวลาออก</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', borderRadius: '6px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    {log && onDelete && (
                        <button
                            onClick={() => onDelete(emp, date)}
                            style={{
                                background: '#fee2e2', color: '#ef4444', border: 'none',
                                padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <Trash2 size={16} /> ลบ
                        </button>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: '#f1f5f9', color: '#64748b', border: 'none',
                                padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer'
                            }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                background: '#37477C', color: 'white', border: 'none',
                                padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <Save size={16} /> บันทึก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditLogModal;
