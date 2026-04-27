/**
 * Executive Dashboard Chart Helpers
 * Smart analytics functions for executive-grade reporting
 */

// Calculate Moving Average
export const calcMovingAverage = (data, key, windowSize = 3) => {
    return data.map((item, index, arr) => {
        if (index < windowSize - 1) return { ...item, [`${key}_ma`]: null };
        let sum = 0;
        for (let i = 0; i < windowSize; i++) sum += (arr[index - i][key] || 0);
        return { ...item, [`${key}_ma`]: sum / windowSize };
    });
};

// Calculate Cumulative (Running Total)
export const calcCumulative = (data, key) => {
    let running = 0;
    return data.map(item => {
        running += (item[key] || 0);
        return { ...item, [`${key}_cum`]: running };
    });
};

// Calculate period-over-period comparison data
export const calcPrevPeriodData = (allSourceData, dateBounds, period, dateField, valueField) => {
    const { startDate, endDate } = dateBounds;
    const duration = endDate - startDate;
    const prevStart = new Date(startDate.getTime() - duration);
    const prevEnd = new Date(startDate.getTime() - 1);

    let prevTotal = 0, currTotal = 0;
    (allSourceData || []).forEach(item => {
        const d = new Date(item[dateField] || item.createdAt || item.created_at || item.work_date);
        const val = valueField ? (Number(item[valueField]) || 0) : 1;
        if (d >= startDate && d <= endDate) currTotal += val;
        if (d >= prevStart && d <= prevEnd) prevTotal += val;
    });

    const change = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : (currTotal > 0 ? 100 : 0);
    return { currTotal, prevTotal, change };
};

// Generate Smart Insights for executives
export const generateInsights = (chartData, configs, period) => {
    const insights = [];
    if (!chartData.length || !configs.length) return insights;

    const periodLabel = { daily: 'วัน', weekly: 'สัปดาห์', monthly: 'เดือน', yearly: 'ปี', custom: 'ช่วง' }[period] || 'ช่วง';

    configs.forEach(config => {
        const values = chartData.map(d => d[config.id] || 0);
        const nonZero = values.filter(v => v > 0);
        if (nonZero.length === 0) return;

        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length;
        const max = Math.max(...values);
        const min = Math.min(...nonZero);
        const maxIdx = values.indexOf(max);
        const minIdx = values.indexOf(min);

        // Trend detection (last 3 vs first 3)
        const firstHalf = values.slice(0, Math.ceil(values.length / 2));
        const secondHalf = values.slice(Math.ceil(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

        if (Math.abs(trendPct) > 5) {
            insights.push({
                type: trendPct > 0 ? 'up' : 'down',
                text: `${config.label} มีแนวโน้ม${trendPct > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(trendPct).toFixed(0)}% ในครึ่งหลังของช่วงเวลา`,
                color: trendPct > 0 ? '#10b981' : '#ef4444'
            });
        }

        // Best period
        if (chartData[maxIdx]) {
            insights.push({
                type: 'best',
                text: `${periodLabel}ที่ดีที่สุด: ${chartData[maxIdx].label} (${config.label})`,
                color: '#3b82f6'
            });
        }

        // Volatility check
        const stdDev = Math.sqrt(nonZero.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / nonZero.length);
        const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
        if (cv > 50) {
            insights.push({
                type: 'warning',
                text: `${config.label} มีความผันผวนสูง (CV: ${cv.toFixed(0)}%) ควรติดตามใกล้ชิด`,
                color: '#f59e0b'
            });
        }
    });

    return insights.slice(0, 4); // Limit to 4 insights
};

// Format value for display
export const formatDisplayValue = (value, prefix = '', suffix = '') => {
    if (!value && value !== 0) return '-';
    
    let formatted = '';
    const absVal = Math.abs(value);
    
    if (absVal >= 1000000) {
        formatted = `${(value / 1000000).toFixed(1)}M`;
    } else if (absVal >= 1000) {
        formatted = `${(value / 1000).toFixed(1)}k`;
    } else {
        formatted = value.toLocaleString(undefined, { 
            minimumFractionDigits: prefix === '฿' ? 2 : 0, 
            maximumFractionDigits: 2 
        });
    }
    
    return `${prefix}${formatted}${suffix}`;
};
