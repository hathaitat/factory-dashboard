import React from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import DatePickerCalendar from './DatePickerCalendar';

/**
 * Reusable filter bar for list pages — polished design with calendar picker
 */
const ListFilter = ({ filters = [], onClear, hasActiveFilters }) => {
    return (
        <div className="mb-4 py-3 px-4 bg-gradient-to-br from-blue-500/[0.04] to-purple-500/[0.04] border border-blue-500/[0.12] rounded-xl flex items-center gap-3 flex-wrap relative">
            {/* Filter icon badge */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-300 ${hasActiveFilters ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-slate-500/10'}`}>
                <Filter size={15} className={hasActiveFilters ? 'text-white' : 'text-textMuted'} />
            </div>

            {filters.map((filter, idx) => {
                if (filter.type === 'date-range') {
                    return (
                        <React.Fragment key={idx}>
                            {filter.options && filter.options.length > 0 && (
                                <div className="flex flex-col gap-[2px] mr-1">
                                    <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">กรองตาม</span>
                                    <div className="relative">
                                        <select
                                            value={filter.value}
                                            onChange={(e) => filter.onChange(e.target.value)}
                                            className="appearance-none bg-blue-500/10 border border-blue-500/30 text-blue-500 py-[0.4rem] pr-8 pl-[0.7rem] rounded-lg text-[0.85rem] outline-none min-w-[120px] cursor-pointer font-medium transition-all duration-200"
                                        >
                                            {filter.options.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-[2px]">
                                <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">จากวันที่</span>
                                <DatePickerCalendar
                                    value={filter.dateFrom}
                                    onChange={filter.onDateFromChange}
                                    placeholder="เลือกวันเริ่ม"
                                />
                            </div>

                            <span className="text-textMuted text-[0.8rem] self-end mb-[6px]">—</span>

                            <div className="flex flex-col gap-[2px]">
                                <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">ถึงวันที่</span>
                                <DatePickerCalendar
                                    value={filter.dateTo}
                                    onChange={filter.onDateToChange}
                                    placeholder="เลือกวันสิ้นสุด"
                                />
                            </div>

                            {/* Divider */}
                            <div className="w-[1px] h-7 bg-border self-end mb-1 opacity-60" />
                        </React.Fragment>
                    );
                }

                if (filter.type === 'select') {
                    const isActive = filter.value !== '' && filter.value !== undefined;
                    return (
                        <div key={idx} className="flex flex-col gap-[2px]">
                            <span className="text-[0.7rem] font-semibold text-textMuted uppercase tracking-[0.5px]">{filter.label}</span>
                            <div className="relative">
                                <select
                                    value={filter.value}
                                    onChange={(e) => filter.onChange(e.target.value)}
                                    disabled={filter.disabled}
                                    className={`appearance-none py-[0.4rem] pr-8 pl-[0.7rem] rounded-lg text-[0.85rem] outline-none min-w-[120px] cursor-pointer transition-all duration-200 ${isActive ? 'bg-blue-500/10 border border-blue-500/30 text-blue-500 font-medium' : 'bg-card border border-border text-textMain font-normal'} ${filter.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {filter.options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isActive ? 'text-blue-500' : 'text-textMuted'} ${filter.disabled ? 'opacity-50' : ''}`} />
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
                    className="flex items-center gap-[0.35rem] py-[0.4rem] px-[0.9rem] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/40 rounded-lg cursor-pointer text-[0.8rem] font-medium whitespace-nowrap transition-all duration-200"
                >
                    <X size={13} /> ล้าง
                </button>
            )}
        </div>
    );
};

export default ListFilter;
