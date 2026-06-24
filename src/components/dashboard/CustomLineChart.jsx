import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Users, Check, ChevronDown, X, Table, FileDigit, Activity, BarChart3, Lightbulb, Layers, Info } from 'lucide-react';
import { calcMovingAverage, calcCumulative, calcPrevPeriodData, generateInsights, formatDisplayValue } from './chartHelpers';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const CustomLineChart = ({
    metrics = [],
    defaultMetric = '',
    title = 'แนวโน้มและสถิติ (Analytics Chart)',
    maxMultiSelect = 100,
    enableGroupBy = false,
    groupByLabel = 'ลูกค้า',
    groupByData = [],
    groupByField = 'customerName',
    groupByDateField = 'date',
    groupByValueField = 'grandTotal',
    groupByPrefix = '฿',
    groupBySuffix = '',
    allGroups = null, // Optional list of all possible group names
    isCategorical = false,
    categoricalData = [],
    categoryField = 'label',
    className = '',
    style = {}
}) => {
    const [activeMetricIds, setActiveMetricIds] = useState([]);
    const [period, setPeriod] = useState('daily');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [isGroupByMode, setIsGroupByMode] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Advanced features toggles
    const [showLabels, setShowLabels] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [showMA, setShowMA] = useState(false);
    const [showCumulative, setShowCumulative] = useState(false);
    const [showInsights, setShowInsights] = useState(true);
    const [showAvgLine, setShowAvgLine] = useState(false);

    useEffect(() => {
        if (!isGroupByMode && metrics.length > 0 && activeMetricIds.length === 0) {
            setActiveMetricIds([defaultMetric || metrics[0].id]);
        }
    }, [metrics, activeMetricIds, defaultMetric, isGroupByMode]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowGroupDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dateBounds = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (period === 'daily') {
            startDate.setDate(now.getDate() - 29); // Last 30 days
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'weekly') {
            startDate.setDate(now.getDate() - (7 * 11)); // Last 12 weeks
            startDate.setHours(0, 0, 0, 0);
            // endDate = end of current week (Saturday)
            const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
            endDate = new Date(now);
            endDate.setDate(now.getDate() + (6 - dayOfWeek));
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            startDate.setMonth(now.getMonth() - 11); // Last 12 months
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            // endDate = last day of current month
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'yearly') {
            startDate.setFullYear(now.getFullYear() - 4); // Last 5 years
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            // endDate = Dec 31 of current year
            endDate = new Date(now.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'custom') {
            startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = customEndDate ? new Date(customEndDate) : new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }
        return { startDate, endDate };
    }, [period, customStartDate, customEndDate]);

    const availableGroups = useMemo(() => {
        if (!enableGroupBy) return [];
        const groupMap = {};

        // Initialize with allGroups if provided
        if (allGroups && Array.isArray(allGroups)) {
            allGroups.forEach(name => {
                if (name) groupMap[name] = 0;
            });
        }

        // Add/Update with groups found in data
        groupByData.forEach(item => {
            const name = item[groupByField];
            if (name) {
                if (!groupMap[name]) groupMap[name] = 0;
                const d = new Date(item[groupByDateField] || item.createdAt || item.created_at || item.work_date);
                if (d >= dateBounds.startDate && d <= dateBounds.endDate) {
                    groupMap[name] += Number(item[groupByValueField]) || (groupByValueField === null ? 1 : 0);
                }
            }
        });

        return Object.keys(groupMap).sort((a, b) => groupMap[b] - groupMap[a]);
    }, [enableGroupBy, groupByData, groupByField, groupByValueField, groupByDateField, dateBounds, allGroups]);

    useEffect(() => {
        if (isGroupByMode && selectedGroups.length === 0 && availableGroups.length > 0) {
            setSelectedGroups(availableGroups.slice(0, Math.min(5, maxMultiSelect)));
        }
    }, [isGroupByMode, availableGroups, selectedGroups, maxMultiSelect]);

    const toggleMetric = (id) => {
        if (activeMetricIds.includes(id)) {
            if (activeMetricIds.length > 1) setActiveMetricIds(activeMetricIds.filter(m => m !== id));
        } else {
            if (activeMetricIds.length < maxMultiSelect) setActiveMetricIds([...activeMetricIds, id]);
        }
    };

    const toggleGroup = (group) => {
        if (selectedGroups.includes(group)) {
            if (selectedGroups.length > 1) setSelectedGroups(selectedGroups.filter(g => g !== group));
        } else {
            if (selectedGroups.length < maxMultiSelect) setSelectedGroups([...selectedGroups, group]);
        }
    };

    const activeConfigs = useMemo(() => {
        if (isGroupByMode) {
            return selectedGroups.map((group, index) => ({
                id: `group_${index}`,
                label: group,
                data: groupByData.filter(item => item[groupByField] === group),
                dateField: groupByDateField,
                valueField: groupByValueField,
                color: COLORS[index % COLORS.length],
                valuePrefix: groupByPrefix,
                valueSuffix: groupBySuffix,
                chartType: 'line',
                yAxisId: 'left'
            }));
        } else {
            return metrics.filter(m => activeMetricIds.includes(m.id)).map(m => ({
                ...m,
                chartType: m.chartType || 'line',
                yAxisId: m.yAxisId || 'left'
            }));
        }
    }, [isGroupByMode, selectedGroups, activeMetricIds, metrics, groupByData, groupByField, groupByDateField, groupByValueField, groupByPrefix, groupBySuffix]);

    const chartDataObj = useMemo(() => {
        if (activeConfigs.length === 0) return { data: [], configs: [] };

        const { startDate, endDate } = dateBounds;
        const isYearly = period === 'yearly';
        const isMonthly = period === 'monthly' || (period === 'custom' && (endDate - startDate) > 90 * 24 * 60 * 60 * 1000);
        const isWeekly = period === 'weekly';

        const finalDataMap = {};

        if (isYearly) {
            let curr = new Date(startDate);
            while (curr <= endDate) {
                const key = `${curr.getFullYear()}`;
                const label = `${curr.getFullYear() + 543}`;
                finalDataMap[key] = { key, label };
                activeConfigs.forEach(c => finalDataMap[key][c.id] = 0);
                curr.setFullYear(curr.getFullYear() + 1);
            }
        } else if (isMonthly) {
            let curr = new Date(startDate);
            curr.setDate(1);
            while (curr <= endDate) {
                const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
                const label = `${thaiMonths[curr.getMonth()]} ${curr.getFullYear() + 543}`;
                finalDataMap[key] = { key, label };
                activeConfigs.forEach(c => finalDataMap[key][c.id] = 0);
                curr.setMonth(curr.getMonth() + 1);
            }
        } else if (isWeekly) {
            let curr = new Date(startDate);
            curr.setDate(curr.getDate() - curr.getDay());
            while (curr <= endDate) {
                const weekEnd = new Date(curr);
                weekEnd.setDate(curr.getDate() + 6);
                const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                const label = `${curr.getDate()}-${weekEnd.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][curr.getMonth()]}`;
                finalDataMap[key] = { key, label, weekEnd };
                activeConfigs.forEach(c => finalDataMap[key][c.id] = 0);
                curr.setDate(curr.getDate() + 7);
            }
        } else {
            let curr = new Date(startDate);
            while (curr <= endDate) {
                const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                const label = `${curr.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][curr.getMonth()]}`;
                finalDataMap[key] = { key, label };
                activeConfigs.forEach(c => finalDataMap[key][c.id] = 0);
                curr.setDate(curr.getDate() + 1);
            }
        }

        activeConfigs.forEach(config => {
            const { id: configId, data: sourceData, dateField, valueField } = config;
            const filteredData = (sourceData || []).filter(item => {
                const d = new Date(item[dateField] || item.createdAt || item.created_at || item.work_date);
                return d >= startDate && d <= endDate;
            });

            filteredData.forEach(item => {
                const d = new Date(item[dateField] || item.createdAt || item.created_at || item.work_date);
                let key = '';
                if (isYearly) key = `${d.getFullYear()}`;
                else if (isMonthly) key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                else if (isWeekly) {
                    const sunday = new Date(d);
                    sunday.setDate(d.getDate() - d.getDay());
                    key = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
                } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                if (finalDataMap[key]) {
                    if (valueField) finalDataMap[key][configId] += Number(item[valueField]) || 0;
                    else finalDataMap[key][configId] += 1;
                }
            });
        });

        const finalData = Object.values(finalDataMap).sort((a, b) => a.key.localeCompare(b.key));
        return { data: finalData, configs: activeConfigs };
    }, [activeConfigs, period, dateBounds]);

    const categoricalChartData = useMemo(() => {
        if (!isCategorical) return { data: [], configs: [] };
        
        // Map categorical data to the internal format
        const finalData = (categoricalData || []).map(item => ({
            ...item,
            key: item[categoryField],
            label: item.shortName || item[categoryField]
        }));

        const configs = activeMetricIds.length > 0 
            ? metrics.filter(m => activeMetricIds.includes(m.id))
            : metrics.slice(0, 1);

        return { data: finalData, configs };
    }, [isCategorical, categoricalData, categoryField, activeMetricIds, metrics]);

    const finalChartObj = isCategorical ? categoricalChartData : chartDataObj;

    const enhancedData = useMemo(() => {
        let data = [...finalChartObj.data];
        finalChartObj.configs.forEach(config => {
            if (showMA && !isCategorical) data = calcMovingAverage(data, config.id, 3);
            if (showCumulative && !isCategorical) data = calcCumulative(data, config.id);
        });
        return data;
    }, [finalChartObj, showMA, showCumulative, isCategorical]);

    const summaryKPIs = useMemo(() => {
        return finalChartObj.configs.map(config => {
            const values = finalChartObj.data.map(d => Number(d[config.id]) || 0);
            const total = values.reduce((a, b) => a + b, 0);
            const avg = values.length > 0 ? total / values.length : 0;
            const nonZero = values.filter(v => v > 0);
            const max = nonZero.length > 0 ? Math.max(...nonZero) : 0;
            const maxIdx = values.indexOf(max);
            const bestLabel = finalChartObj.data[maxIdx]?.label || '-';
            const comparison = isCategorical ? null : calcPrevPeriodData(config.data || [], dateBounds, period, config.dateField || 'date', config.valueField);
            return { ...config, total, avg, max, bestLabel, comparison };
        });
    }, [finalChartObj, dateBounds, period, isCategorical]);

    const insights = useMemo(() => {
        if (isCategorical) {
            if (finalChartObj.data.length === 0) return [];
            const sortedData = [...finalChartObj.data].sort((a, b) => (b[finalChartObj.configs[0]?.id] || 0) - (a[finalChartObj.configs[0]?.id] || 0));
            const top = sortedData[0];
            const config = finalChartObj.configs[0];
            if (!top || !config) return [];
            return [
                { text: `สูงสุด: ${top.label} (${formatDisplayValue(top[config.id], config.valuePrefix, config.valueSuffix)})`, color: config.color || '#3b82f6' }
            ];
        }
        return generateInsights(finalChartObj.data, finalChartObj.configs, period);
    }, [finalChartObj, period, isCategorical]);

    const avgValues = useMemo(() => {
        const map = {};
        finalChartObj.configs.forEach(config => {
            const vals = finalChartObj.data.map(d => d[config.id] || 0);
            map[config.id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        });
        return map;
    }, [finalChartObj]);

    const hasRightAxis = finalChartObj.configs.some(c => c.yAxisId === 'right');
    const leftConfigs = finalChartObj.configs.filter(c => c.yAxisId === 'left');
    const rightConfigs = finalChartObj.configs.filter(c => c.yAxisId === 'right');

    const renderCustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const validPayload = payload.filter(entry => entry.value && entry.value !== 0);
            
            if (validPayload.length === 0) return null;

            return (
                <div style={{ background: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: '0.85rem', minWidth: '200px' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}>{label}</p>
                    {validPayload.map((entry, index) => {
                        const config = finalChartObj.configs.find(c => c.id === entry.dataKey);
                        if (!config) return null;

                        const val = formatDisplayValue(entry.value, config.valuePrefix || '', config.valueSuffix || '');

                        return (
                            <p key={index} style={{ margin: '0.3rem 0', color: entry.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, display: 'inline-block' }}></span>
                                    {config.label}
                                </span>
                                <strong>{val}</strong>
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    const formatYAxis = (v, config) => {
        if (!config) return v;
        return formatDisplayValue(v, config.valuePrefix || '');
    };

    const customLabelFormatter = (value, config) => {
        if (!value || value === 0) return '';
        return formatDisplayValue(value, '', config?.valueSuffix || '');
    };

    if (!metrics || metrics.length === 0) return null;

    return (
        <div className={`glass-panel ${className}`} style={{ padding: '1.5rem', marginBottom: '1.5rem', ...style }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <TrendingUp size={22} style={{ color: finalChartObj.configs[0]?.color || '#3b82f6' }} />
                        {title}
                    </h3>
                </div>

                {/* Metric Filters Row */}
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.2rem' }}>
                    {enableGroupBy && (
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', padding: '0.25rem', marginRight: '0.5rem' }}>
                            <button onClick={() => setIsGroupByMode(false)} style={{ padding: '0.4rem 1rem', borderRadius: '10px', border: 'none', background: !isGroupByMode ? 'white' : 'transparent', color: !isGroupByMode ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: !isGroupByMode ? '700' : '500', boxShadow: !isGroupByMode ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>ยอดรวม</button>
                            <button onClick={() => setIsGroupByMode(true)} style={{ padding: '0.4rem 1rem', borderRadius: '10px', border: 'none', background: isGroupByMode ? 'white' : 'transparent', color: isGroupByMode ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: isGroupByMode ? '700' : '500', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: isGroupByMode ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}><Users size={16} /> แยกตาม{groupByLabel}</button>
                        </div>
                    )}

                    {!isGroupByMode && metrics.length > 1 && metrics.map(m => {
                        const isActive = activeMetricIds.includes(m.id);
                        return (
                            <button 
                                key={m.id} 
                                onClick={() => toggleMetric(m.id)} 
                                style={{ 
                                    padding: '0.5rem 1.2rem', 
                                    borderRadius: '30px', 
                                    border: `1.5px solid ${isActive ? m.color : 'var(--border-color)'}`, 
                                    background: isActive ? `${m.color}10` : 'white', 
                                    color: isActive ? m.color : 'var(--text-muted)', 
                                    fontSize: '0.9rem', 
                                    fontWeight: '600',
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? `0 4px 12px ${m.color}20` : 'none'
                                }}
                            >
                                {isActive && <Check size={16} strokeWidth={3} />}
                                {m.label}
                            </button>
                        );
                    })}

                    {isGroupByMode && (
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <button onClick={() => setShowGroupDropdown(!showGroupDropdown)} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                                เลือก{groupByLabel} ({selectedGroups.length}/{maxMultiSelect}) <ChevronDown size={16} />
                            </button>
                            {showGroupDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.6rem', width: '280px', maxHeight: '350px', overflowY: 'auto', zIndex: 100, boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                                    {availableGroups.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedGroups(availableGroups.slice(0, maxMultiSelect));
                                                }}
                                                style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                เลือกทั้งหมด
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedGroups(availableGroups.slice(0, 1));
                                                }}
                                                style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '500' }}
                                            >
                                                ล้างทั้งหมด
                                            </button>
                                        </div>
                                    )}
                                    {availableGroups.length === 0 ? <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ไม่มีข้อมูล{groupByLabel}</div> : availableGroups.map(group => {
                                        const isSelected = selectedGroups.includes(group);
                                        return (
                                            <div key={group} onClick={() => toggleGroup(group)} style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent', color: isSelected ? '#3b82f6' : 'var(--text-main)', fontSize: '0.85rem', marginBottom: '0.2rem', transition: 'background 0.2s' }}>
                                                <span style={{ fontWeight: isSelected ? '600' : '400' }}>{group}</span>
                                                {isSelected && <Check size={16} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {isGroupByMode && selectedGroups.map((group, index) => {
                        const config = finalChartObj.configs.find(c => c.label === group);
                        const color = config ? config.color : '#888';
                        return (
                            <div key={group} style={{ padding: '0.3rem 0.8rem', borderRadius: '30px', border: `1px solid ${color}`, background: `${color}10`, color: color, fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>{group}</span>
                                <X size={14} className="cursor-pointer" onClick={() => toggleGroup(group)} />
                            </div>
                        );
                    })}
                </div>

                {/* Controls Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '0.3rem', gap: '0.2rem' }}>
                        {[{ key: 'labels', icon: <FileDigit size={16} />, label: 'ตัวเลข', val: showLabels, set: setShowLabels, tooltip: 'แสดงตัวเลขระบุค่าของแต่ละจุดบนกราฟ' },
                        { key: 'table', icon: <Table size={16} />, label: 'ตาราง', val: showTable, set: setShowTable, tooltip: 'แสดงข้อมูลสรุปในรูปแบบตาราง' },
                        ...(!isCategorical ? [
                            { key: 'ma', icon: <Activity size={16} />, label: 'เส้นเฉลี่ยเคลื่อนที่', val: showMA, set: setShowMA, tooltip: 'เส้นเฉลี่ยเคลื่อนที่ (Moving Average) 3 วัน' },
                            { key: 'avg', icon: <BarChart3 size={16} />, label: 'เส้นค่าเฉลี่ย', val: showAvgLine, set: setShowAvgLine, tooltip: 'เส้นค่าเฉลี่ยรวมทั้งช่วงเวลา' },
                            { key: 'cum', icon: <Layers size={16} />, label: 'สะสม', val: showCumulative, set: setShowCumulative, tooltip: 'แสดงยอดรวมสะสมแบบต่อเนื่อง' }
                        ] : []),
                        { key: 'insights', icon: <Lightbulb size={16} />, label: 'วิเคราะห์', val: showInsights, set: setShowInsights, tooltip: 'แสดงข้อสังเกตและข้อมูลเชิงลึก' }
                        ].map(btn => (
                            <div key={btn.key} className="tooltip-container">
                                <button 
                                    onClick={() => btn.set(!btn.val)} 
                                    style={{ 
                                        padding: '0.4rem 0.8rem', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        background: btn.val ? 'white' : 'transparent', 
                                        color: btn.val ? 'var(--text-main)' : 'var(--text-muted)', 
                                        cursor: 'pointer', 
                                        fontSize: '0.8rem', 
                                        fontWeight: btn.val ? '700' : '500',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.3rem',
                                        boxShadow: btn.val ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {btn.icon} {btn.label}
                                </button>
                                <div className="tooltip-box">{btn.tooltip}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        {!isCategorical && (
                            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="glass-input" style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: '600' }}>
                                <option value="daily">รายวัน (30 วันล่าสุด)</option>
                                <option value="weekly">รายสัปดาห์ (12 สัปดาห์ล่าสุด)</option>
                                <option value="monthly">รายเดือน (12 เดือนล่าสุด)</option>
                                <option value="yearly">รายปี (5 ปีล่าสุด)</option>
                                <option value="custom">กำหนดเอง (Custom)</option>
                            </select>
                        )}

                        {!isCategorical && period === 'custom' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="glass-input" style={{ padding: '0.4rem', borderRadius: '8px', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                                <span className="text-textMuted">ถึง</span>
                                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="glass-input" style={{ padding: '0.4rem', borderRadius: '8px', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Smart KPI Summary Cards */}
            {summaryKPIs.length > 0 && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem', 
                    marginBottom: '1.5rem' 
                }}>
                    {summaryKPIs.map(kpi => (
                        <div key={kpi.id} className="tooltip-container" style={{ flex: '1 1 180px', minWidth: '160px' }}>
                            <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, height: '100%' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    {kpi.label} <Info size={10} style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: kpi.color }}>{formatDisplayValue(kpi.total, kpi.valuePrefix)}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เฉลี่ย: {formatDisplayValue(kpi.avg, kpi.valuePrefix)}</span>
                                    {kpi.comparison && kpi.comparison.change !== 0 && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: kpi.comparison.change > 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                            {kpi.comparison.change > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                            {kpi.comparison.change > 0 ? '+' : ''}{kpi.comparison.change.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="tooltip-box">
                                {`แสดงมูลค่ารวมและค่าเฉลี่ยของ ${kpi.label} ในช่วงเวลาที่เลือก`}
                                {kpi.comparison && ` (เปรียบเทียบกับช่วงก่อนหน้า ${kpi.comparison.change > 0 ? '+' : ''}${kpi.comparison.change.toFixed(1)}%)`}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Smart Insights */}
            {showInsights && insights.length > 0 && (
                <div style={{ marginTop: '1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="tooltip-container" style={{ width: 'fit-content', marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600' }}>
                            <Lightbulb size={14} style={{ color: '#f59e0b' }} /> วิเคราะห์ข้อมูลอัจฉริยะ
                            <Info size={12} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        </div>
                        <div className="tooltip-box">ระบบวิเคราะห์ข้อมูลเพื่อหาจุดที่น่าสนใจ เช่น วันที่ยอดสูงสุด จุดเปลี่ยนของข้อมูล และข้อสังเกตเชิงลึก</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {insights.map((ins, i) => (
                            <div key={i} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: `${ins.color}10`, border: `1px solid ${ins.color}25`, fontSize: '0.75rem', color: ins.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Lightbulb size={12} /> {ins.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={enhancedData} margin={{ top: 20, right: 10, left: 0, bottom: isCategorical ? 50 : 5 }}>
                        <defs>
                            {finalChartObj.configs.map(config => (
                                <linearGradient key={`grad-${config.id}`} id={`colorGradient-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} minTickGap={5} interval={0} angle={isCategorical ? -45 : 0} textAnchor={isCategorical ? 'end' : 'middle'} />
                        {leftConfigs.length > 0 && <YAxis yAxisId="left" orientation="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatYAxis(v, leftConfigs[0])} width={55} />}
                        {hasRightAxis && <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatYAxis(v, rightConfigs[0])} width={45} />}
                        <Tooltip content={renderCustomTooltip} />
                        {finalChartObj.configs.map((config) => {
                            if (config.chartType === 'bar') return (<Bar key={config.id} yAxisId={config.yAxisId} dataKey={config.id} name={config.label} fill={config.color} radius={[4, 4, 0, 0]} barSize={30}>{showLabels && <LabelList dataKey={config.id} position="top" fill={config.color} fontSize={10} formatter={(val) => customLabelFormatter(val, config)} />}</Bar>);
                            return (
                                <React.Fragment key={config.id}>
                                    <Area yAxisId={config.yAxisId} type="monotone" dataKey={config.id} stroke="none" fillOpacity={1} fill={`url(#colorGradient-${config.id})`} />
                                    <Line yAxisId={config.yAxisId} type="monotone" dataKey={config.id} name={config.label} stroke={config.color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--card-bg)', stroke: config.color }} activeDot={{ r: 6, strokeWidth: 0, fill: config.color }}>{showLabels && <LabelList dataKey={config.id} position="top" fill={config.color} fontSize={10} formatter={(val) => customLabelFormatter(val, config)} />}</Line>
                                </React.Fragment>
                            );
                        })}
                        {showAvgLine && finalChartObj.configs.map(config => (avgValues[config.id] > 0 && <ReferenceLine key={`avg-${config.id}`} yAxisId={config.yAxisId} y={avgValues[config.id]} stroke={config.color} strokeDasharray="6 4" strokeOpacity={0.6} />))}
                        {showMA && finalChartObj.configs.map(config => <Line key={`ma-${config.id}`} yAxisId={config.yAxisId} type="monotone" dataKey={`${config.id}_ma`} name={`MA(3) ${config.label}`} stroke={config.color} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={true} />)}
                        {showCumulative && finalChartObj.configs.map(config => <Area key={`cum-${config.id}`} yAxisId={config.yAxisId} type="monotone" dataKey={`${config.id}_cum`} name={`สะสม ${config.label}`} stroke={config.color} strokeWidth={1} fillOpacity={0.15} fill={config.color} strokeDasharray="3 2" dot={false} />)}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Interactive Data Table */}
            {showTable && finalChartObj.configs.length > 0 && (
                <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                    <h4 title="ตารางแสดงรายละเอียดข้อมูลแบบแจกแจงรายรายการและช่วงเวลา รวมถึงคำนวณผลรวมและค่าเฉลี่ยให้อัตโนมัติ" style={{ margin: '0 0 0.8rem 0', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Table size={16} style={{ color: '#10b981' }} /> รายละเอียดข้อมูล
                    </h4>
                    <div className="table-responsive-wrapper" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'scroll' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>หัวข้อ / ซีรีส์</th>
                                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', fontWeight: '600', borderRight: '1px solid var(--border-color)' }}>รวม (Total)</th>
                                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontWeight: '600', borderRight: '1px solid var(--border-color)' }}>ค่าเฉลี่ย</th>
                                    {finalChartObj.data.map(d => <th key={d.key} style={{ padding: '0.8rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>{d.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {finalChartObj.configs.map(config => {
                                    let total = 0;
                                    finalChartObj.data.forEach(d => { total += (d[config.id] || 0); });
                                    const avg = finalChartObj.data.length > 0 ? total / finalChartObj.data.length : 0;
                                    const formatVal = (v) => config.valuePrefix === '฿' ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
                                    return (
                                        <tr key={config.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                            <td style={{ padding: '0.8rem 1rem', fontWeight: '500', color: config.color, borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: config.color, display: 'inline-block' }}></span>
                                                {config.label}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '700', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{formatVal(total)}</td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '600', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>{formatVal(avg)}</td>
                                            {finalChartObj.data.map((d, index) => {
                                                const currentVal = d[config.id] || 0;
                                                const prevVal = index > 0 ? (finalChartObj.data[index - 1][config.id] || 0) : 0;
                                                let pctStr = null;
                                                let pctColor = 'var(--text-muted)';
                                                if (!isCategorical && prevVal > 0) {
                                                    const pct = ((currentVal - prevVal) / prevVal) * 100;
                                                    if (pct !== 0) {
                                                        pctColor = pct > 0 ? '#10b981' : '#ef4444';
                                                        pctStr = `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
                                                    }
                                                }
                                                return (
                                                    <td key={d.key} style={{ padding: '0.8rem', textAlign: 'right', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: currentVal !== 0 ? '500' : 'normal' }}>{currentVal !== 0 ? formatVal(currentVal) : <span style={{ color: 'var(--border-color)' }}>-</span>}</div>
                                                        {pctStr && <div style={{ fontSize: '0.7rem', color: pctColor, marginTop: '0.2rem' }}>{pctStr}</div>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tooltip-container {
                    position: relative;
                    display: inline-block;
                }
                .tooltip-box {
                    visibility: hidden;
                    width: 200px;
                    background-color: rgba(17, 24, 39, 0.95);
                    color: #fff;
                    text-align: center;
                    border-radius: 8px;
                    padding: 8px 12px;
                    position: absolute;
                    z-index: 1000;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
                    font-size: 0.75rem;
                    line-height: 1.4;
                    pointer-events: none;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .tooltip-container:hover .tooltip-box {
                    visibility: visible;
                    opacity: 1;
                    transform: translateX(-50%) translateY(-5px);
                }
                .tooltip-box::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(17, 24, 39, 0.95) transparent transparent transparent;
                }
            `}</style>
        </div>
    );
};

export default CustomLineChart;
