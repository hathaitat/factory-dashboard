import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader, FileText, Trash2, Save } from 'lucide-react';
import EditLogModal from './EditLogModal';

const ImportPreviewModal = ({ isOpen, onClose, data, onConfirm, status = 'preview', message = '' }) => {
    if (!isOpen) return null;

    const [localLogs, setLocalLogs] = useState([]);
    const [editingCell, setEditingCell] = useState(null); // { emp, date, log }

    // Initialize localLogs when data changes
    useEffect(() => {
        if (data?.logs) {
            setLocalLogs(data.logs);
        }
    }, [data]);

    const handleSaveEdit = (newLog) => {
        if (!newLog) return;

        // Remove existing log for this emp/date if exists
        const dateStr = newLog.work_date.split('T')[0];
        const filtered = localLogs.filter(l =>
            !(String(l.employee_code) === String(newLog.employee_code) && l.work_date.startsWith(dateStr))
        );

        // Add new log
        setLocalLogs([...filtered, newLog]);
        setEditingCell(null);
    };

    const handleDeleteLog = (emp, date) => {
        const dateStr = date.toISOString().split('T')[0];
        const filtered = localLogs.filter(l =>
            !(String(l.employee_code) === String(emp.code) && l.work_date.startsWith(dateStr))
        );
        setLocalLogs(filtered);
        setEditingCell(null);
    };

    const isProcessing = status === 'processing';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    const renderPreview = () => {
        const currentLogs = localLogs;
        if (!currentLogs || currentLogs.length === 0) return <div>ไม่พบข้อมูล</div>;

        // 1. Get Date Range
        const dates = currentLogs.map(l => new Date(l.work_date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const allDates = [];
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            allDates.push(new Date(d));
        }

        // 2. Group by Employee
        const empMap = {};
        currentLogs.forEach(l => {
            const code = l.employee_code || 'Unknown';
            if (!empMap[code]) {
                empMap[code] = {
                    code: code,
                    name: l.employee_name || 'Unknown',
                    id: l.employee_id,
                    dailyLogs: {}
                };
            }
            const dateStr = l.work_date.split('T')[0];
            empMap[code].dailyLogs[dateStr] = l;
        });

        // Add missing logs for uniqueMissing? The user didn't ask for this explicitly, but uniqueMissing is about "New Employees".
        // They are already in currentLogs if they are in the file.
        // What about 'missing' array prop? It's just a summary.

        const sortedEmps = Object.values(empMap).sort((a, b) => a.code.localeCompare(b.code));
        const missing = data?.missing || [];
        const uniqueMissing = missing ? Array.from(new Map(missing.map(item => [item.code, item])).values()) : [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <div style={{ flex: 1, padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{currentLogs.length}</div>
                        <div style={{ color: '#166534', fontSize: '0.9rem' }}>รายการเวลา</div>
                    </div>
                    <div style={{ flex: 1, padding: '1rem', background: uniqueMissing.length > 0 ? '#fff7ed' : '#f8fafc', borderRadius: '8px', border: uniqueMissing.length > 0 ? '1px solid #ffedd5' : '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: uniqueMissing.length > 0 ? '#f97316' : '#64748b' }}>{uniqueMissing.length}</div>
                        <div style={{ color: uniqueMissing.length > 0 ? '#9a3412' : '#64748b', fontSize: '0.9rem' }}>พนักงานใหม่</div>
                    </div>
                </div>

                {/* Matrix Table */}
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', position: 'relative' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f9fafb' }}>
                            <tr>
                                <th style={{
                                    position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', padding: '0.5rem', minWidth: '150px'
                                }}>
                                    พนักงาน
                                </th>
                                {allDates.map(date => {
                                    const isSunday = date.getDay() === 0;
                                    return (
                                        <th key={date.toISOString()} style={{
                                            borderBottom: '1px solid #e5e7eb', padding: '0.5rem', minWidth: '80px', textAlign: 'center',
                                            background: isSunday ? '#fee2e2' : '#f9fafb', color: isSunday ? '#991b1b' : '#374151'
                                        }}>
                                            {date.toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' })}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEmps.map(emp => (
                                <tr key={emp.code}>
                                    <td style={{
                                        position: 'sticky', left: 0, zIndex: 10, background: 'white',
                                        borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #e5e7eb', padding: '0.5rem', fontWeight: '500'
                                    }}>
                                        <div style={{ color: '#37477C' }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{emp.code}</div>
                                    </td>
                                    {allDates.map(date => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        const log = emp.dailyLogs[dateStr];
                                        const isSunday = date.getDay() === 0;

                                        let content = '-';
                                        let cellStyle = { textAlign: 'center', borderBottom: '1px solid #f3f4f6', padding: '0.5rem', cursor: 'pointer' };

                                        if (log) {
                                            if (Number(log.work_days) === 0 && !log.start_time) {
                                                content = (
                                                    <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        ขาด
                                                    </div>
                                                );
                                                cellStyle.background = '#fef2f2';
                                                cellStyle.border = '1px solid #fecaca';
                                            } else {
                                                const start = log.start_time ? log.start_time.slice(0, 5) : '-';
                                                const end = log.end_time ? log.end_time.slice(0, 5) : '-';

                                                const startStyle = log.is_late ? { color: '#d97706', fontWeight: 'bold' } : {};
                                                const endStyle = log.is_early ? { color: '#ea580c', fontWeight: 'bold' } : {};

                                                content = (
                                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                                                        <span style={startStyle} title={log.is_late ? 'มาสาย' : ''}>{start}</span>
                                                        <span style={{ color: '#9ca3af' }}>-</span>
                                                        <span style={endStyle} title={log.is_early ? 'ออกก่อน' : ''}>{end}</span>
                                                    </div>
                                                );
                                                if (log.ot_hours > 0) cellStyle.background = '#eff6ff';
                                                if (log.is_late || log.is_early) cellStyle.background = '#fffbeb';
                                            }
                                        } else if (isSunday) {
                                            cellStyle.background = '#fcf5f5';
                                        }

                                        return (
                                            <td
                                                key={dateStr}
                                                style={cellStyle}
                                                onClick={() => setEditingCell({ emp, date, log })}
                                                onMouseEnter={(e) => isSunday ? null : e.currentTarget.style.filter = 'brightness(0.95)'}
                                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                            >
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                            background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '1rem'
                        }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => onConfirm(localLogs)}
                        style={{
                            padding: '0.8rem 2rem', borderRadius: '8px', border: 'none',
                            background: '#37477C', color: 'white', cursor: 'pointer', fontSize: '1rem',
                            fontWeight: '500', boxShadow: '0 4px 6px -1px rgba(55, 71, 124, 0.2)'
                        }}
                    >
                        นำเข้าข้อมูล ({currentLogs.length})
                    </button>
                </div>

                {editingCell && (
                    <EditLogModal
                        cell={editingCell}
                        onClose={() => setEditingCell(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDeleteLog}
                    />
                )}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1100, backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-panel" style={{
                background: 'white', width: '90%', maxWidth: '95vw',
                padding: '0', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem', background: '#37477C', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isProcessing && <Loader className="animate-spin" size={24} />}
                        {isSuccess && <CheckCircle size={24} color="#10b981" />}
                        {isError && <AlertCircle size={24} color="#ef4444" />}
                        {!isProcessing && !isSuccess && !isError && <FileText size={24} />}
                        {status === 'preview' ? 'ตรวจสอบข้อมูลนำเข้า' :
                            status === 'processing' ? 'กำลังประมวลผล...' :
                                status === 'success' ? 'นำเข้าข้อมูลสำเร็จ' : 'เกิดข้อผิดพลาด'}
                    </h3>
                    {!isProcessing && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '2rem', height: 'calc(90vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                    {status === 'preview' && renderPreview()}

                    {status === 'processing' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <Loader className="animate-spin" size={48} color="#37477C" style={{ margin: '0 auto' }} />
                            </div>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#37477C' }}>กำลังประมวลผล...</h4>
                            <p style={{ margin: 0, color: '#64748b' }}>กรุณารอสักครู่ ห้ามปิดหน้านี้</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '50%' }}>
                                    <CheckCircle size={48} color="#10b981" />
                                </div>
                            </div>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#166534' }}>นำเข้าข้อมูลเรียบร้อยแล้ว</h4>
                            <p style={{ margin: '0 0 2rem 0', color: '#64748b' }}>{message}</p>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.8rem 2rem', borderRadius: '8px', border: 'none',
                                    background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '1rem',
                                    fontWeight: '500'
                                }}
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '50%' }}>
                                    <AlertCircle size={48} color="#ef4444" />
                                </div>
                            </div>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#991b1b' }}>เกิดข้อผิดพลาด</h4>
                            <p style={{ margin: '0 0 2rem 0', color: '#64748b' }}>{message}</p>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '0.8rem 2rem', borderRadius: '8px', border: 'none',
                                    background: '#64748b', color: 'white', cursor: 'pointer', fontSize: '1rem',
                                    fontWeight: '500'
                                }}
                            >
                                ปิด
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};



export default ImportPreviewModal;
