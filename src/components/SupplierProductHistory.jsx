import { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ArrowLeft, Info } from 'lucide-react';
import { supplierProductService } from '../services/supplierProductService';

const SupplierProductHistory = ({ product, onBack }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0], // 1 year ago
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadHistory();
    }, [product.id, dateRange]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await supplierProductService.getProductPriceHistory(product.id, dateRange.start, dateRange.end);
            setHistory(data);
        } catch (error) {
            console.error('Failed to load price history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (history.length < 2) return null;

        const latest = history[history.length - 1].price;
        const previous = history[history.length - 2].price;
        const diff = latest - previous;
        const percent = (diff / previous) * 100;

        const first = history[0].price;
        const totalDiff = latest - first;
        const totalPercent = (totalDiff / first) * 100;

        return {
            latest,
            previous,
            diff,
            percent,
            totalDiff,
            totalPercent
        };
    }, [history]);

    const chartData = useMemo(() => {
        return history.map(h => ({
            date: new Date(h.effectiveDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }),
            fullDate: new Date(h.effectiveDate).toLocaleDateString('th-TH'),
            price: h.price
        }));
    }, [history]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={onBack}
                        style={{ background: 'var(--card-hover)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>ประวัติราคา: {product.name}</h3>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>หน่วย: {product.unit}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-hover)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <span className="text-textMuted">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                    กำลังโหลดข้อมูลประวัติราคา...
                </div>
            ) : history.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }} className="grid-mobile-stack">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Chart Area */}
                        <div style={{ height: '350px', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                        tickFormatter={(value) => `฿${value.toLocaleString()}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        labelStyle={{ color: 'var(--text-main)', fontWeight: '600', marginBottom: '4px' }}
                                        formatter={(value) => [`฿${value.toLocaleString()}`, 'ราคา']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke="var(--primary)"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPrice)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* History Table */}
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>วันที่เปลี่ยน</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>ราคา (บาท)</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>เปลี่ยนแปลง</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...history].reverse().map((h, idx, arr) => {
                                        const prev = arr[idx + 1];
                                        const diff = prev ? h.price - prev.price : 0;
                                        const percent = prev ? (diff / prev.price) * 100 : 0;

                                        return (
                                            <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)', background: idx === 0 ? 'rgba(var(--primary-rgb), 0.03)' : 'transparent' }}>
                                                <td className="p-4">{new Date(h.effectiveDate).toLocaleDateString('th-TH')}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>฿{h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    {prev ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <span style={{ color: diff > 0 ? 'var(--error)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: '500' }}>
                                                                {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : null}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: diff > 0 ? 'var(--error)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)', opacity: 0.8 }}>
                                                                ({diff > 0 ? '+' : ''}{percent.toFixed(2)}%)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>เริ่มต้น</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h.notes || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Stats Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.2rem', background: 'var(--primary-glow)', border: 'none' }}>
                            <div style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>ราคาปัจจุบัน</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>฿{stats?.latest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>

                        {stats && (
                            <>
                                <div className="glass-panel" style={{ padding: '1.2rem', background: 'var(--card-hover)' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>การเปลี่ยนแปลงล่าสุด</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            padding: '0.4rem',
                                            borderRadius: '8px',
                                            background: stats.diff > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: stats.diff > 0 ? 'var(--error)' : 'var(--success)'
                                        }}>
                                            {stats.diff > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: stats.diff > 0 ? 'var(--error)' : 'var(--success)' }}>
                                                {stats.diff > 0 ? '+' : ''}{stats.diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {stats.diff > 0 ? '+' : ''}{stats.percent.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ padding: '1.2rem', background: 'var(--card-hover)' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>ภาพรวมทั้งปี</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            padding: '0.4rem',
                                            borderRadius: '8px',
                                            background: stats.totalDiff > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: stats.totalDiff > 0 ? 'var(--error)' : 'var(--success)'
                                        }}>
                                            {stats.totalDiff > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: stats.totalDiff > 0 ? 'var(--error)' : 'var(--success)' }}>
                                                {stats.totalDiff > 0 ? '+' : ''}{stats.totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {stats.totalDiff > 0 ? '+' : ''}{stats.totalPercent.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: 'auto', padding: '1rem', borderRadius: '12px', background: 'rgba(55, 71, 124, 0.03)', border: '1px dashed var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                <Info size={16} />
                                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>เกร็ดความรู้</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                ระบบจะบันทึกประวัติราคาโดยอัตโนมัติทุกครั้งที่มีการอัปเดตราคาในหน้าสินค้า เพื่อช่วยให้คุณวิเคราะห์แนวโน้มราคาต้นทุนได้แม่นยำขึ้น
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ยังไม่มีข้อมูลประวัติราคาในช่วงเวลาที่เลือก
                </div>
            )}
        </div>
    );
};

export default SupplierProductHistory;
