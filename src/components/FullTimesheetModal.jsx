import React from 'react';
import { X, FileText, Clock, AlertCircle } from 'lucide-react';

const DiligenceInput = ({ value, isOverridden, onCommit }) => {
    const [localValue, setLocalValue] = React.useState(value);

    // Sync with external value when it changes (and we are not editing potentially?)
    // Actually, simple way: sync when prop changes. 
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        // Commit logic
        const val = localValue;
        const isForced = (val === '' || val === null || val === undefined) ? null : true;
        const amount = (val === '' || val === null || val === undefined) ? null : Number(val);

        // Only commit if different from prop? 
        // Or always commit to be safe?
        // Let's commit.
        onCommit(isForced, amount);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur(); // Trigger blur to save
        }
    };

    return (
        <input
            type="number"
            value={localValue === null || localValue === undefined ? '' : localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
                width: '70px',
                padding: '2px 4px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                textAlign: 'right',
                color: isOverridden ? '#059669' : '#4b5563',
                fontWeight: isOverridden ? 'bold' : 'normal',
                background: isOverridden ? '#ecfdf5' : 'white'
            }}
        />
    );
};

const TimeCell = ({ log, dateStr, empId, scheduleEndMins, onUpdate }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [start, setStart] = React.useState(log?.start_time ? log.start_time.slice(0, 5) : '');
    const [end, setEnd] = React.useState(log?.end_time ? log.end_time.slice(0, 5) : '');

    React.useEffect(() => {
        setStart(log?.start_time ? log.start_time.slice(0, 5) : '');
        setEnd(log?.end_time ? log.end_time.slice(0, 5) : '');
    }, [log]);

    const handleSave = (e) => {
        e.stopPropagation();
        onUpdate(empId, dateStr, start, end);
        setIsEditing(false);
    };

    const isSunday = new Date(dateStr).getDay() === 0;
    const isAbsent = (!log && !isSunday) || (log && Number(log.work_days) === 0 && !log.start_time);
    const isLate = log && (Number(log.late_hours) > 0);

    let isEarly = false;
    if (log && log.end_time && scheduleEndMins) {
        const [h, m] = log.end_time.split(':').map(Number);
        const actualEnd = h * 60 + m;
        if (actualEnd < scheduleEndMins) isEarly = true;
    }

    if (isEditing) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', minWidth: '70px' }}>
                <input
                    type="time"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    style={{ fontSize: '0.7rem', padding: '1px', width: '100%', border: '1px solid #ccc', borderRadius: '2px' }}
                    onClick={e => e.stopPropagation()}
                />
                <input
                    type="time"
                    value={end}
                    onChange={e => setEnd(e.target.value)}
                    style={{ fontSize: '0.7rem', padding: '1px', width: '100%', border: '1px solid #ccc', borderRadius: '2px' }}
                    onClick={e => e.stopPropagation()}
                />
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={handleSave} style={{ fontSize: '0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', padding: '1px 4px' }}>
                        Save
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} style={{ fontSize: '0.6rem', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', padding: '1px 4px' }}>
                        X
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', minHeight: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            {isAbsent ? (
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem' }}>ขาด</span>
            ) : log ? (
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', gap: '2px' }}>
                    <span style={{ color: isLate ? '#d97706' : '#334155', fontWeight: isLate ? '700' : 'normal' }}>
                        {log.start_time?.slice(0, 5) || '-'}
                        {isLate && <span style={{ fontSize: '0.55rem', display: 'block' }}>สาย</span>}
                    </span>
                    <span style={{ color: '#94a3b8' }}>-</span>
                    <span style={{ color: isEarly ? '#ea580c' : '#334155', fontWeight: isEarly ? '700' : 'normal' }}>
                        {log.end_time?.slice(0, 5) || '-'}
                        {isEarly && <span style={{ fontSize: '0.55rem', display: 'block' }}>ออกก่อน</span>}
                    </span>
                </div>
            ) : (
                <span style={{ color: '#cbd5e1' }}>-</span>
            )}
        </div>
    );
};

const FullTimesheetModal = ({ isOpen, onClose, period, employees, logs, stats, workSchedule, overrides, onToggleDiligence, onUpdateLog }) => {
    if (!isOpen || !period) return null;

    const getBirthdayDisplay = (emp) => {
        if (!emp.date_of_birth || !period) return null;

        const dob = new Date(emp.date_of_birth);
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        // Check current year of period start
        const year = start.getFullYear();
        const thisYearBirthday = new Date(year, dob.getMonth(), dob.getDate());

        const d = new Date(thisYearBirthday); d.setHours(0, 0, 0, 0);
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);

        if (d >= s && d <= e) {
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        }

        // Edge case: Period crosses year
        if (start.getFullYear() !== end.getFullYear()) {
            const nextYearBirthday = new Date(end.getFullYear(), dob.getMonth(), dob.getDate());
            const d2 = new Date(nextYearBirthday); d2.setHours(0, 0, 0, 0);
            if (d2 >= s && d2 <= e) {
                return d2.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }
        }
        return null;
    };

    // 1. Generate Date Range from period
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const allDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d));
    }

    // 2. Parse Schedule for late/early logic
    let scheduleStartMins = null;
    let scheduleEndMins = null;
    if (workSchedule) {
        if (workSchedule.start_time) {
            const [sh, sm] = workSchedule.start_time.split(':').map(Number);
            scheduleStartMins = sh * 60 + sm;
        }
        if (workSchedule.end_time) {
            const [eh, em] = workSchedule.end_time.split(':').map(Number);
            scheduleEndMins = eh * 60 + em;
        }
    }

    // 3. Prepare data mapping for quick lookup
    const logMap = {}; // "employeeId_date" -> log
    logs.forEach(l => {
        const dateStr = l.work_date.split('T')[0];
        logMap[`${l.employee_id}_${dateStr}`] = l;
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1200, backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-panel" style={{
                background: 'white', width: '95vw', maxWidth: '1400px', height: '90vh',
                padding: '0', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.2rem 1.5rem', background: '#37477C', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={24} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>ตารางลงเวลางานรวม</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>งวด: {period.label}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Table Area */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                            <tr>
                                <th style={{
                                    position: 'sticky', left: 0, zIndex: 30, background: '#f8fafc',
                                    padding: '0.75rem', borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0',
                                    textAlign: 'left', width: '200px', minWidth: '200px'
                                }}>
                                    รายชื่อพนักงาน
                                </th>
                                <th style={{
                                    position: 'sticky', left: '200px', zIndex: 30,
                                    padding: '0.75rem', background: '#ecfdf5', // Green-50
                                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#065f46' // Green-800
                                }}>วันทำงาน</th>
                                <th style={{
                                    position: 'sticky', left: '280px', zIndex: 30,
                                    padding: '0.75rem', background: '#fef2f2', // Red-50
                                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#991b1b' // Red-800
                                }}>วันขาด</th>
                                <th style={{
                                    position: 'sticky', left: '360px', zIndex: 30,
                                    padding: '0.75rem', background: '#f5f3ff', // Violet-50
                                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#5b21b6' // Violet-800
                                }}>OT (ชม.)</th>
                                <th style={{
                                    position: 'sticky', left: '440px', zIndex: 30,
                                    padding: '0.75rem', background: '#fffbeb', // Amber-50
                                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#92400e' // Amber-800
                                }}>สาย (น.)</th>
                                <th style={{
                                    position: 'sticky', left: '520px', zIndex: 30,
                                    padding: '0.75rem', background: '#fce7f3', // Pink-100
                                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#9d174d' // Pink-800
                                }}>วันเกิด</th>
                                <th style={{
                                    position: 'sticky', left: '600px', zIndex: 30,
                                    padding: '0.75rem', background: '#f0fdf4', // Emerald-50 (Using Teal-ish)
                                    borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0',
                                    minWidth: '80px', textAlign: 'center', color: '#064e3b' // Emerald-800
                                }}>เบี้ยขยัน</th>
                                {allDates.map(date => {
                                    const isSunday = date.getDay() === 0;
                                    return (
                                        <th key={date.toISOString()} style={{
                                            padding: '0.5rem', borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                            background: isSunday ? '#fee2e2' : '#f8fafc',
                                            color: isSunday ? '#991b1b' : '#475569',
                                            textAlign: 'center', minWidth: '90px'
                                        }}>
                                            <div style={{ fontSize: '0.75rem' }}>{date.toLocaleDateString('th-TH', { weekday: 'short' })}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{date.getDate()}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}>
                                    <td style={{
                                        position: 'sticky', left: 0, zIndex: 30, background: 'white',
                                        padding: '0.75rem', borderBottom: '1px solid #e2e8f0', borderRight: '2px solid #e2e8f0',
                                        width: '200px', minWidth: '200px'
                                    }}>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{emp.full_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{emp.code}</div>
                                    </td>
                                    {/* Summary Columns */}
                                    <td style={{
                                        position: 'sticky', left: '200px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#ecfdf5', // Green-50
                                        borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                        color: '#10b981', fontWeight: 'bold'
                                    }}>
                                        {stats && stats[emp.id] ? Number(stats[emp.id].workDays).toFixed(2) : '-'}
                                    </td>
                                    <td style={{
                                        position: 'sticky', left: '280px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#fef2f2', // Red-50
                                        borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                        color: '#ef4444', fontWeight: 'bold'
                                    }}>
                                        {stats && stats[emp.id] ? stats[emp.id].absentDays : '-'}
                                    </td>
                                    <td style={{
                                        position: 'sticky', left: '360px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#f5f3ff', // Violet-50
                                        borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                        color: '#8b5cf6'
                                    }}>
                                        {stats && stats[emp.id] ? Number(stats[emp.id].otHours).toFixed(2) : '-'}
                                    </td>
                                    <td style={{
                                        position: 'sticky', left: '440px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#fffbeb', // Amber-50
                                        borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                        color: '#f59e0b'
                                    }}>
                                        {stats && stats[emp.id] ? Math.round(stats[emp.id].lateHours * 60) : '-'}
                                    </td>
                                    <td style={{
                                        position: 'sticky', left: '520px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#fce7f3', // Pink-100
                                        borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                        color: '#db2777', fontWeight: 'bold'
                                    }}>
                                        {getBirthdayDisplay(emp) || '-'}
                                    </td>
                                    <td style={{
                                        position: 'sticky', left: '600px', zIndex: 10,
                                        padding: '0.5rem', textAlign: 'center',
                                        background: '#f0fdf4', // Emerald-50
                                        borderBottom: '1px solid #e2e8f0', borderRight: '2px solid #e2e8f0',
                                        color: (stats && stats[emp.id]?.diligence > 0) ? '#10b981' : '#ccc', fontWeight: 'bold'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                value={stats && stats[emp.id]?.diligence !== undefined ? stats[emp.id].diligence : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const numVal = val === '' ? null : Number(val);
                                                    // Pass both override status (true if number, null if empty) and the amount
                                                    // Logic: If empty, revert to auto (null). If number, force it (true).
                                                    // But we need to handle "0".

                                                    // If user clears input -> Auto
                                                    // If user types 0 -> Forced 0

                                                    const isForced = val === '' ? null : true;
                                                    const amount = val === '' ? null : Number(val);

                                                    if (onToggleDiligence) onToggleDiligence(emp.id, isForced, amount);
                                                }}
                                                style={{
                                                    width: '60px',
                                                    padding: '2px 4px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #d1d5db',
                                                    textAlign: 'right',
                                                    color: (overrides && overrides[emp.id]?.amount !== undefined && overrides[emp.id]?.amount !== null) ? '#059669' : '#4b5563', // Green if overriden
                                                    fontWeight: (overrides && overrides[emp.id]?.amount !== undefined && overrides[emp.id]?.amount !== null) ? 'bold' : 'normal',
                                                    background: (overrides && overrides[emp.id]?.amount !== undefined && overrides[emp.id]?.amount !== null) ? '#ecfdf5' : 'white'
                                                }}
                                            />
                                        </div>
                                    </td>
                                    {allDates.map(date => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        const isSunday = date.getDay() === 0;
                                        const log = logMap[`${emp.id}_${dateStr}`];

                                        const isAbsent = (!log && !isSunday) || (log && Number(log.work_days) === 0 && !log.start_time);
                                        const isLate = log && (Number(log.late_hours) > 0);

                                        let isEarly = false;
                                        if (log && log.end_time && scheduleEndMins) {
                                            const [h, m] = log.end_time.split(':').map(Number);
                                            const actualEnd = h * 60 + m;
                                            if (actualEnd < scheduleEndMins) isEarly = true;
                                        }

                                        let cellBg = isSunday ? '#fef2f2' : 'white';
                                        if (isAbsent) cellBg = '#fef2f2';
                                        else if (isLate || isEarly) cellBg = '#fffbeb';
                                        else if (log && log.ot_hours > 0) cellBg = '#eff6ff';

                                        return (
                                            <td key={dateStr} style={{
                                                padding: '0', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                                                background: cellBg, textAlign: 'center', verticalAlign: 'middle', height: '100%'
                                            }}>
                                                <div style={{ padding: '0.4rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <TimeCell
                                                        log={log}
                                                        dateStr={dateStr}
                                                        empId={emp.id}
                                                        scheduleEndMins={scheduleEndMins}
                                                        onUpdate={onUpdateLog}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend / Footer */}
                <div style={{
                    padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#fef2f2', border: '1px solid #fecaca' }}></div>
                            <span>ขาด / วันหยุด</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#fffbeb', border: '1px solid #fef3c7' }}></div>
                            <span>สาย / ออกก่อน</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}></div>
                            <span>มี OT</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                            background: 'white', fontWeight: '500', cursor: 'pointer'
                        }}
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FullTimesheetModal;
