import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const DatePickerCalendar = ({ value, onChange, placeholder = 'เลือกวันที่' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        if (value) return new Date(value + 'T00:00:00');
        return new Date();
    });
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) setViewDate(new Date(value + 'T00:00:00'));
    }, [value]);

    const selectedDate = value ? new Date(value + 'T00:00:00') : null;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];
    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: prevDays - i, current: false, date: null });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        cells.push({ day: d, current: true, date, isToday: date.getTime() === today.getTime() });
    }
    // Next month leading days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, current: false, date: null });
    }

    const handleSelect = (cell) => {
        if (!cell.current) return;
        const d = cell.date;
        const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        onChange(str);
        setIsOpen(false);
    };

    const displayText = selectedDate
        ? `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear() + 543}`
        : placeholder;

    const isSelected = (cell) => {
        if (!selectedDate || !cell.date) return false;
        return cell.date.getTime() === selectedDate.getTime();
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.7rem',
                    background: value ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
                    border: value ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: value ? '#3b82f6' : 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    minWidth: '130px',
                    fontWeight: value ? '500' : '400',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value ? '#3b82f6' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {displayText}
            </button>

            {/* Calendar dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    zIndex: 1000,
                    background: 'var(--card-bg, #1e293b)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
                    padding: '0.8rem',
                    width: '280px',
                    backdropFilter: 'blur(20px)'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.6rem',
                        padding: '0 0.2rem'
                    }}>
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(year, month - 1, 1))}
                            style={{
                                background: 'rgba(100,116,139,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.3rem',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            color: 'var(--text-main)',
                            userSelect: 'none'
                        }}>
                            {MONTHS_TH[month]} {year + 543}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(year, month + 1, 1))}
                            style={{
                                background: 'rgba(100,116,139,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.3rem',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day names */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '4px'
                    }}>
                        {DAYS_TH.map(d => (
                            <div key={d} style={{
                                textAlign: 'center',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                padding: '0.25rem 0',
                                userSelect: 'none'
                            }}>{d}</div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px'
                    }}>
                        {cells.map((cell, i) => {
                            const selected = isSelected(cell);
                            const isToday = cell.isToday && cell.current;
                            return (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => handleSelect(cell)}
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: isToday && !selected ? '1px solid rgba(59,130,246,0.4)' : 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        cursor: cell.current ? 'pointer' : 'default',
                                        background: selected
                                            ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                                            : 'transparent',
                                        color: selected
                                            ? '#fff'
                                            : cell.current
                                                ? 'var(--text-main)'
                                                : 'rgba(100,116,139,0.3)',
                                        fontWeight: selected ? '600' : isToday ? '600' : '400',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (cell.current && !selected) {
                                            e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (cell.current && !selected) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {cell.day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Today shortcut */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => {
                                const t = new Date();
                                const str = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                                onChange(str);
                                setIsOpen(false);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#3b82f6',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '0.2rem 0.8rem'
                            }}
                        >
                            วันนี้
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePickerCalendar;
