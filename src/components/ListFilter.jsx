import React from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import DatePickerCalendar from './DatePickerCalendar';

/**
 * Reusable filter bar for list pages — polished design with calendar picker
 */
const ListFilter = ({ filters = [], onClear, hasActiveFilters }) => {
    return (
        <div
            style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.04) 100%)',
                border: '1px solid rgba(59,130,246,0.12)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                position: 'relative'
            }}
        >
            {/* Filter icon badge */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: hasActiveFilters
                    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                    : 'rgba(100,116,139,0.1)',
                flexShrink: 0,
                transition: 'all 0.3s ease'
            }}>
                <Filter size={15} style={{ color: hasActiveFilters ? '#fff' : 'var(--text-muted)' }} />
            </div>

            {filters.map((filter, idx) => {
                if (filter.type === 'date-range') {
                    return (
                        <React.Fragment key={idx}>
                            {filter.options && filter.options.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>กรองตาม</span>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={filter.value}
                                            onChange={(e) => filter.onChange(e.target.value)}
                                            style={{
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                background: 'rgba(59,130,246,0.08)',
                                                border: '1px solid rgba(59,130,246,0.3)',
                                                color: '#3b82f6',
                                                padding: '0.4rem 2rem 0.4rem 0.7rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                                minWidth: '120px',
                                                cursor: 'pointer',
                                                fontWeight: '500',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {filter.options.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#3b82f6',
                                            pointerEvents: 'none'
                                        }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>จากวันที่</span>
                                <DatePickerCalendar
                                    value={filter.dateFrom}
                                    onChange={filter.onDateFromChange}
                                    placeholder="เลือกวันเริ่ม"
                                />
                            </div>

                            <span style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                                alignSelf: 'flex-end',
                                marginBottom: '6px'
                            }}>—</span>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>ถึงวันที่</span>
                                <DatePickerCalendar
                                    value={filter.dateTo}
                                    onChange={filter.onDateToChange}
                                    placeholder="เลือกวันสิ้นสุด"
                                />
                            </div>

                            {/* Divider */}
                            <div style={{
                                width: '1px',
                                height: '28px',
                                background: 'var(--border-color)',
                                alignSelf: 'flex-end',
                                marginBottom: '4px',
                                opacity: 0.6
                            }} />
                        </React.Fragment>
                    );
                }

                if (filter.type === 'select') {
                    const isActive = filter.value !== '' && filter.value !== undefined;
                    return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>{filter.label}</span>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filter.value}
                                    onChange={(e) => filter.onChange(e.target.value)}
                                    style={{
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
                                        border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-color)',
                                        color: isActive ? '#3b82f6' : 'var(--text-main)',
                                        padding: '0.4rem 2rem 0.4rem 0.7rem',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        minWidth: '120px',
                                        cursor: 'pointer',
                                        fontWeight: isActive ? '500' : '400',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {filter.options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: isActive ? '#3b82f6' : 'var(--text-muted)',
                                    pointerEvents: 'none'
                                }} />
                            </div>
                        </div>
                    );
                }

                return null;
            })}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Clear button */}
            {hasActiveFilters && (
                <button
                    onClick={onClear}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.9rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                >
                    <X size={13} /> ล้าง
                </button>
            )}
        </div>
    );
};

export default ListFilter;
