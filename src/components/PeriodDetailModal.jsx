import React from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import EditLogModal from './EditLogModal';
import { employeeService } from '../services/employeeService';
import { useDialog } from '../contexts/DialogContext';

const DiligenceInput = ({ value, isOverridden, onCommit }) => {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        const val = localValue;
        const isForced = (val === '' || val === null || val === undefined) ? null : true;
        const amount = (val === '' || val === null || val === undefined) ? null : Number(val);
        onCommit(isForced, amount);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    return (
        <input
            type="number"
            value={localValue === null || localValue === undefined ? '' : localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()} // Prevent card click if inside one
            style={{
                width: '80px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                textAlign: 'center',
                color: isOverridden ? '#059669' : '#4b5563',
                fontWeight: isOverridden ? 'bold' : 'normal',
                background: isOverridden ? '#ecfdf5' : 'white',
                fontSize: '1.2rem'
            }}
        />
    );
};

const PeriodDetailModal = ({ isOpen, onClose, employee, period, logs, workSchedule, diligenceOverride, onUpdate }) => {
    const { showConfirm, showAlert } = useDialog();
    const [editingLog, setEditingLog] = React.useState(null);

    // If modal is not open, or no employee, return null

    const handleSaveLog = async (newLog) => {
        try {
            // Sanitize payload: remove UI-only fields and joined data
            const logData = {
                id: newLog.id, // Include ID if it exists (for update)
                employee_id: newLog.employee_id,
                work_date: newLog.work_date,
                work_days: newLog.work_days,
                start_time: newLog.start_time,
                end_time: newLog.end_time,
                ot_hours: newLog.ot_hours,
                late_hours: newLog.late_hours,
                is_late: newLog.is_late,
                is_early: newLog.is_early,
                not_scan: newLog.not_scan
            };

            await employeeService.upsertWorkLog(logData);
            setEditingLog(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error saving log:', error);
            await showAlert('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
        }
    };

    const handleDeleteLog = async (emp, date) => {
        const confirmed = await showConfirm('คุณต้องการลบข้อมูลเวลานี้ใช่หรือไม่?');
        if (!confirmed) return;

        try {
            const dateStr = date.toISOString().split('T')[0];
            const log = logs.find(l => l.work_date.split('T')[0] === dateStr);
            console.log('Delete target:', log);

            if (log && log.id) {
                await employeeService.deleteWorkLog(log.id);
            } else {
                // Logic to "delete" if it was just an absent marker or empty? 
                // Actually if no log exists, nothing to delete. 
                // But if user clicks "Delete" on a day with no log, we do nothing.
                // EditLogModal delete button only shows if log exists.
            }
            setEditingLog(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error deleting log:', error);
            await showAlert('ลบข้อมูลไม่สำเร็จ');
        }
    };

    const handleToggleDiligence = async () => {
        let nextState = null;
        // Cycle: Auto (undefined/null) -> Force Paid (true) -> Force No Pay (false) -> Auto ...
        if (diligenceOverride === null || diligenceOverride === undefined) nextState = true;
        else if (diligenceOverride === true) nextState = false;
        else if (diligenceOverride === false) nextState = null;

        try {
            await employeeService.upsertDiligenceOverride(period.id, employee.id, nextState);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            await showAlert('บันทึกการปรับแก้ไม่สำเร็จ');
        }
    };

    // Helper to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper to generate date range
    const generateDateRange = (start, end) => {
        const dates = [];
        let currentDate = new Date(start);
        const endDate = new Date(end);

        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    // Parse Schedule
    let scheduleEndMins = null;
    if (workSchedule && workSchedule.end_time) {
        const [eh, em] = workSchedule.end_time.split(':').map(Number);
        scheduleEndMins = eh * 60 + em;
    }

    // Calculate Summary Stats
    const totalDays = logs.reduce((sum, log) => sum + Number(log.work_days), 0);
    const totalOT = logs.reduce((sum, log) => sum + Number(log.ot_hours), 0);
    const totalLate = logs.reduce((sum, log) => sum + (Number(log.late_hours) || 0), 0);

    // Calculate Absent Days (Exclude Sundays)
    let absentDays = 0;
    const allDates = generateDateRange(period.startDate, period.endDate);

    allDates.forEach(date => {
        const isSunday = date.getDay() === 0;
        if (isSunday) return; // Sunday is never absent

        const dateStr = date.toISOString().split('T')[0];
        const dailyLog = logs.find(l => l.work_date.split('T')[0] === dateStr);

        if (!dailyLog) {
            absentDays++;
        } else if (Number(dailyLog.work_days) === 0) {
            absentDays++;
        }
    });

    const diligenceAmount = (() => {
        if (diligenceOverride === true) return (Number(employee.diligence_allowance) || 0);
        if (diligenceOverride === false) return 0;
        return (absentDays === 0 && totalLate === 0) ? (Number(employee.diligence_allowance) || 0) : 0;
    })();

    const getBirthdayDisplay = () => {
        if (!employee.date_of_birth) return '-';
        const dob = new Date(employee.date_of_birth);
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        // Check year
        const year = start.getFullYear();
        const thisYearBirthday = new Date(year, dob.getMonth(), dob.getDate());
        const d = new Date(thisYearBirthday); d.setHours(0, 0, 0, 0);
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);

        if (d >= s && d <= e) return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

        // Cross year
        if (start.getFullYear() !== end.getFullYear()) {
            const nextYearBirthday = new Date(end.getFullYear(), dob.getMonth(), dob.getDate());
            const d2 = new Date(nextYearBirthday); d2.setHours(0, 0, 0, 0);
            if (d2 >= s && d2 <= e) return d2.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        }
        return '-';
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-panel" style={{
                background: 'white', width: '95%', maxWidth: '1200px',
                padding: '0', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem', background: '#37477C', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{employee.full_name}</h3>
                        <p style={{ margin: '0.2rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            งวด: {period.label}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem',
                    padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    overflowX: 'auto'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>วันทำงาน</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{Number(totalDays).toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>วันขาด</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>{absentDays > 0 ? absentDays : '-'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>OT (ชม.)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{Number(totalOT).toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>สาย (นาที)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>{Math.round(totalLate * 60)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>วันเกิด</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ec4899' }}>{getBirthdayDisplay()}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                            เบี้ยขยัน {diligenceOverride && diligenceOverride.isForced ? '(Lock)' : ''}
                        </div>
                        <DiligenceInput
                            value={diligenceAmount}
                            isOverridden={diligenceOverride && diligenceOverride.amount !== undefined && diligenceOverride.amount !== null}
                            onCommit={async (isForced, amount) => {
                                try {
                                    await employeeService.upsertDiligenceOverride(period.id, employee.id, isForced, amount);
                                    if (onUpdate) onUpdate();
                                } catch (error) {
                                    console.error(error);
                                    await showAlert('บันทึกการปรับแก้ไม่สำเร็จ');
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Horizontal Scrolling Daily List */}
                <div style={{ overflowX: 'auto', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '100%' }}>
                        <thead>
                            {/* Row 1: Dates */}
                            <tr>
                                {allDates.map((date) => (
                                    <th key={date.toISOString()} colSpan="2" style={{
                                        padding: '0.5rem', border: '1px solid #cbd5e1', background: '#f1f5f9',
                                        textAlign: 'center', whiteSpace: 'nowrap', minWidth: '120px',
                                        color: date.getDay() === 0 ? '#ef4444' : '#334155'
                                    }}>
                                        {date.getDate().toString().padStart(2, '0')} ({date.toLocaleDateString('th-TH', { weekday: 'short' })})
                                    </th>
                                ))}
                            </tr>
                            {/* Row 2: In/Out Labels */}
                            <tr>
                                {allDates.map((date) => (
                                    <React.Fragment key={date.toISOString()}>
                                        <th style={{
                                            padding: '0.4rem', border: '1px solid #cbd5e1', background: '#f8fafc',
                                            textAlign: 'center', fontSize: '0.8rem', color: '#64748b', width: '60px'
                                        }}>
                                            เข้า
                                        </th>
                                        <th style={{
                                            padding: '0.4rem', border: '1px solid #cbd5e1', background: '#f8fafc',
                                            textAlign: 'center', fontSize: '0.8rem', color: '#64748b', width: '60px'
                                        }}>
                                            ออก
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row 3: Time Data */}
                            <tr>
                                {allDates.map((date) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isSunday = date.getDay() === 0;
                                    const log = logs.find(l => l.work_date.split('T')[0] === dateStr);

                                    const isAbsent = (!log && !isSunday) || (log && Number(log.work_days) === 0);
                                    const hasLate = log && (Number(log.late_hours) > 0);

                                    let hasEarly = false;
                                    if (log && log.end_time && scheduleEndMins) {
                                        const [h, m] = log.end_time.split(':').map(Number);
                                        const actualEnd = h * 60 + m;
                                        if (actualEnd < scheduleEndMins) hasEarly = true;
                                    }

                                    if (isAbsent) {
                                        return (
                                            <td key={dateStr} colSpan="2"
                                                onClick={() => setEditingLog({ emp: employee, date, log: null })}
                                                style={{
                                                    padding: '0.6rem', border: '1px solid #e2e8f0', textAlign: 'center',
                                                    background: '#fef2f2', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer'
                                                }}>
                                                ขาด
                                            </td>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={dateStr}>
                                            <td
                                                onClick={() => setEditingLog({ emp: employee, date, log })}
                                                style={{
                                                    padding: '0.6rem', border: '1px solid #e2e8f0', textAlign: 'center',
                                                    fontFamily: 'monospace', background: isSunday ? '#f9fafb' : 'white',
                                                    color: hasLate ? '#d97706' : 'inherit',
                                                    fontWeight: hasLate ? 'bold' : 'normal',
                                                    cursor: 'pointer'
                                                }}>
                                                {log?.start_time?.slice(0, 5) || '-'}
                                                {hasLate && <div style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>สาย</div>}
                                            </td>
                                            <td
                                                onClick={() => setEditingLog({ emp: employee, date, log })}
                                                style={{
                                                    padding: '0.6rem', border: '1px solid #e2e8f0', textAlign: 'center',
                                                    fontFamily: 'monospace', background: isSunday ? '#f9fafb' : 'white',
                                                    color: hasEarly ? '#ea580c' : 'inherit',
                                                    fontWeight: hasEarly ? 'bold' : 'normal',
                                                    cursor: 'pointer'
                                                }}>
                                                {log?.end_time?.slice(0, 5) || '-'}
                                                {hasEarly && <div style={{ fontSize: '0.65rem', fontWeight: 'normal' }}>ออกก่อน</div>}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.6rem 1.2rem', borderRadius: '8px',
                            border: '1px solid #cbd5e1', background: 'white',
                            cursor: 'pointer', fontWeight: '500', color: '#334155'
                        }}
                    >
                        ปิด
                    </button>
                </div>
            </div>

            {editingLog && (
                <EditLogModal
                    cell={editingLog}
                    onClose={() => setEditingLog(null)}
                    onSave={handleSaveLog}
                    onDelete={handleDeleteLog}
                />
            )}
        </div>
    );
};

export default PeriodDetailModal;
