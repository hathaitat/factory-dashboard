import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowUpRight, ArrowDownLeft,
    History, Package, TrendingUp, TrendingDown,
    Plus, Minus, Save, X, DollarSign
} from 'lucide-react';
import { internalItemService } from '../services/internalItemService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';

const InternalItemHistoryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showAlert } = useDialog();
    const currentUser = userService.getCurrentUser();

    const [item, setItem] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state for manual adjustment
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustType, setAdjustType] = useState('IN');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustCost, setAdjustCost] = useState('');
    const [adjustRemark, setAdjustRemark] = useState('');

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const itemData = await internalItemService.getItemById(id);
            if (!itemData) {
                showError('ไม่พบข้อมูลสินค้า');
                navigate('/dashboard/internal-items');
                return;
            }
            setItem(itemData);

            const logsData = await internalItemService.getItemLogs(id);
            setLogs(logsData || []);
        } catch (error) {
            console.error('Error loading item history:', error);
            showError('ไม่สามารถโหลดข้อมูลประวัติสินค้าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitializeHistory = async () => {
        try {
            setIsLoading(logs.length === 0);
            await internalItemService.logMovement({
                item_id: id,
                type: 'IN',
                qty: item.current_stock,
                previous_stock: 0,
                new_stock: item.current_stock,
                remark: 'ยอดเริ่มต้น (Initial Balance)',
                performed_by: currentUser?.fullName || 'system',
                source_type: 'manual'
            });
            showAlert('บันทึกยอดเริ่มต้นเรียบร้อยแล้ว');
            loadData();
        } catch (error) {
            console.error('Error initializing history:', error);
            showError('ไม่สามารถบันทึกประวัติได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        if (!adjustQty || Number(adjustQty) <= 0) {
            showError('กรุณาระบุจำนวนที่ถูกต้อง');
            return;
        }

        setIsSaving(true);
        try {
            await internalItemService.adjustStockWithLog(
                id,
                adjustType,
                adjustQty,
                adjustCost ? parseFloat(adjustCost) : null,
                adjustRemark || (adjustType === 'IN' ? 'รับเข้าสต๊อก' : 'เบิกออกจากสต๊อก'),
                currentUser?.fullName || 'system',
                'manual'
            );
            showAlert('ปรับยอดสต๊อกเรียบร้อยแล้ว');
            setShowAdjustModal(false);
            setAdjustQty('');
            setAdjustCost('');
            setAdjustRemark('');
            loadData();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            showError(error.message || 'เกิดข้อผิดพลาดในการปรับยอดสต๊อก');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && !item) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!item) return null;

    // Calculate Summary
    const stats = logs.reduce((acc, log) => {
        if (log.type === 'IN') acc.totalIn += Number(log.qty || 0);
        if (log.type === 'OUT') acc.totalOut += Number(log.qty || 0);
        return acc;
    }, { totalIn: 0, totalOut: 0 });

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard/internal-items')}
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <PageHeader
                        title="ประวัติความเคลื่อนไหว"
                        subtitle={`${item.name} (${item.category?.name || 'ไม่ระบุหมวดหมู่'})`}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={() => setShowAdjustModal(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
                    >
                        <Plus size={18} /> ปรับสต๊อก
                    </button>
                    {logs.length === 0 && (
                        <button
                            onClick={handleInitializeHistory}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0.6rem 1rem' }}
                        >
                            <History size={18} /> บันทึกยอดเริ่มต้น
                        </button>
                    )}
                </div>
            </div>

            {/* Item Info & Stats */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <Package size={16} /> จำนวนคงเหลือ
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {Number(item.current_stock).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#10b981', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <TrendingUp size={16} /> รวมการนำเข้า
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#10b981' }}>
                        +{stats.totalIn.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <TrendingDown size={16} /> รวมการเบิกออก
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#ef4444' }}>
                        -{stats.totalOut.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#f59e0b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <DollarSign size={16} /> ราคาซื้อล่าสุด
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#f59e0b' }}>
                        {(() => {
                            const lastPurchase = logs.find(l => l.type === 'IN' && l.unit_cost);
                            return lastPurchase ? `฿${Number(lastPurchase.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
                        })()}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <History size={20} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>ประวัติรายการเข้า-ออก (Stock Card)</h3>
                </div>

                <div className="table-responsive-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)', textAlign: 'left' }}>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่/เวลา</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>ประเภท</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวน</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ราคา/หน่วย</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ก่อนหน้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ยอดหลังทำรายการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ที่มา/อ้างอิง</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ทำรายการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{new Date(log.created_at).toLocaleDateString('th-TH')}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                            {log.type === 'IN' ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                                                }}>
                                                    <ArrowUpRight size={14} /> เข้า
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                                                }}>
                                                    <ArrowDownLeft size={14} /> ออก
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '700', color: log.type === 'IN' ? '#10b981' : '#ef4444' }}>
                                            {log.type === 'IN' ? '+' : '-'}{Number(log.qty || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', color: log.unit_cost ? '#f59e0b' : 'var(--text-muted)', fontWeight: log.unit_cost ? '600' : '400' }}>
                                            {log.unit_cost ? `฿${Number(log.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                            {Number(log.previous_stock || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600' }}>
                                            {Number(log.new_stock || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {log.source_type === 'requisition' ? (
                                                    <span
                                                        style={{ color: '#3b82f6', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
                                                        onClick={() => navigate(`/dashboard/internal-requisitions/${log.source_id}`)}
                                                    >
                                                        {log.reference_no || 'ใบสั่งซื้อ'}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ปรับด้วยมือ</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
                                            {log.performed_by || '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '250px' }}>
                                            {log.remark || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <History size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <div>ยังไม่มีประวัติความเคลื่อนไหวสำหรับสินค้านี้</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Adjustment Modal */}
            {showAdjustModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '420px', padding: '2rem', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>ปรับยอดสต๊อก — {item.name}</h3>
                            <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdjustSubmit}>
                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ประเภทรายการ</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('IN')}
                                        style={{
                                            padding: '0.8rem', borderRadius: '8px', border: '1px solid #10b981',
                                            background: adjustType === 'IN' ? '#10b981' : 'white',
                                            color: adjustType === 'IN' ? 'white' : '#10b981',
                                            fontWeight: '600', cursor: 'pointer'
                                        }}
                                    >
                                        นำเข้า (+)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('OUT')}
                                        style={{
                                            padding: '0.8rem', borderRadius: '8px', border: '1px solid #ef4444',
                                            background: adjustType === 'OUT' ? '#ef4444' : 'white',
                                            color: adjustType === 'OUT' ? 'white' : '#ef4444',
                                            fontWeight: '600', cursor: 'pointer'
                                        }}
                                    >
                                        เบิกออก (-)
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>จำนวน ({item.unit})</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    required
                                    value={adjustQty}
                                    onChange={e => setAdjustQty(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                />
                            </div>
                            {adjustType === 'IN' && (
                                <div style={{ marginBottom: '1.2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ราคาซื้อต่อหน่วย (บาท) — ไม่บังคับ</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={adjustCost}
                                        onChange={e => setAdjustCost(e.target.value)}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                        placeholder="เช่น 80.00"
                                    />
                                </div>
                            )}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>หมายเหตุ</label>
                                <textarea
                                    value={adjustRemark}
                                    onChange={e => setAdjustRemark(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', minHeight: '80px' }}
                                    placeholder="เช่น ซื้อเพิ่มจากร้าน ABC, เบิกใช้ในงาน XYZ..."
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-secondary" style={{ flex: 1 }}>ยกเลิก</button>
                                <button type="submit" disabled={isSaving} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternalItemHistoryPage;
