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
import { useAuth } from '../contexts/AuthContext';

const InternalItemHistoryPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showAlert } = useDialog();
    const currentUser = user;

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

    if (isLoading && !item) return <div className="loading-spinner my-12 mx-auto"></div>;
    if (!item) return null;

    // Calculate Summary
    const stats = logs.reduce((acc, log) => {
        if (log.type === 'IN') acc.totalIn += Number(log.qty || 0);
        if (log.type === 'OUT') acc.totalOut += Number(log.qty || 0);
        return acc;
    }, { totalIn: 0, totalOut: 0 });

    return (
        <div className="px-4 pb-8">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/internal-items')}
                        className="bg-transparent border border-border text-main rounded-lg cursor-pointer" style={{ padding: '0.5rem' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <PageHeader
                        title="ประวัติความเคลื่อนไหว"
                        subtitle={`${item.name} (${item.category?.name || 'ไม่ระบุหมวดหมู่'})`}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowAdjustModal(true)}
                        className="btn-primary px-5 py-2.5 flex items-center gap-2"
                    >
                        <Plus size={18} /> ปรับสต๊อก
                    </button>
                    {logs.length === 0 && (
                        <button
                            onClick={handleInitializeHistory}
                            className="btn-secondary text-primary px-4 py-2.5 flex items-center gap-2" style={{ borderColor: 'var(--primary)' }}
                        >
                            <History size={18} /> บันทึกยอดเริ่มต้น
                        </button>
                    )}
                </div>
            </div>

            {/* Item Info & Stats */}
            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4" >
                    <div className="text-textMuted text-sm mb-2 flex items-center gap-3">
                        <Package size={16} /> จำนวนคงเหลือ
                    </div>
                    <div className="text-xl font-bold text-primary">
                        {Number(item.current_stock).toLocaleString()} <span className="text-sm font-normal text-textMuted">{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel p-4" >
                    <div className="text-emerald-500 text-sm mb-2 flex items-center gap-3">
                        <TrendingUp size={16} /> รวมการนำเข้า
                    </div>
                    <div className="text-xl font-bold text-emerald-500">
                        +{stats.totalIn.toLocaleString()} <span className="text-sm font-normal text-textMuted">{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel p-4">
                    <div className="text-red-500 text-sm mb-2 flex items-center gap-3">
                        <TrendingDown size={16} /> รวมการเบิกออก
                    </div>
                    <div className="text-xl font-bold text-red-500">
                        -{stats.totalOut.toLocaleString()} <span className="text-sm font-normal text-textMuted">{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel p-4" >
                    <div className="text-amber-500 text-sm mb-2 flex items-center gap-3">
                        <DollarSign size={16} /> ราคาซื้อล่าสุด
                    </div>
                    <div className="text-xl font-bold text-amber-500">
                        {(() => {
                            const lastPurchase = logs.find(l => l.type === 'IN' && l.unit_cost);
                            return lastPurchase ? `฿${Number(lastPurchase.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
                        })()}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-panel p-0 overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-3" style={{ background: 'rgba(0, 0, 0, 0.01)' }}>
                    <History size={20} color="var(--primary)" />
                    <h3 className="m-0 text-lg font-semibold">ประวัติรายการเข้า-ออก (Stock Card)</h3>
                </div>

                <div className="table-responsive-wrapper">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left" style={{ background: 'var(--bg-main)' }}>
                                <th className="px-6 py-5 text-textMuted font-medium">วันที่/เวลา</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">ประเภท</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">จำนวน</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">ราคา/หน่วย</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">ก่อนหน้า</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">ยอดหลังทำรายการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ที่มา/อ้างอิง</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ผู้ทำรายการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-border" style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                        <td className="px-6 py-5">
                                            <div className="text-[0.95rem] font-medium">{new Date(log.created_at).toLocaleDateString('th-TH')}</div>
                                            <div className="text-xs text-textMuted">{new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {log.type === 'IN' ? (
                                                <span className="text-emerald-500 rounded-full text-xs font-semibold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.8rem' }}>
                                                    <ArrowUpRight size={14} /> เข้า
                                                </span>
                                            ) : (
                                                <span className="text-red-500 rounded-full text-xs font-semibold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.3rem 0.8rem' }}>
                                                    <ArrowDownLeft size={14} /> ออก
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold" style={{ color: log.type === 'IN' ? '#10b981' : '#ef4444' }}>
                                            {log.type === 'IN' ? '+' : '-'}{Number(log.qty || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 text-right" style={{ color: log.unit_cost ? '#f59e0b' : 'var(--text-muted)', fontWeight: log.unit_cost ? '600' : '400' }}>
                                            {log.unit_cost ? `฿${Number(log.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="px-6 py-5 text-right text-textMuted">
                                            {Number(log.previous_stock || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 text-right font-semibold">
                                            {Number(log.new_stock || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {log.source_type === 'requisition' ? (
                                                    <span
                                                        className="text-blue-500 font-semibold cursor-pointer underline text-sm"
                                                        onClick={() => navigate(`/dashboard/internal-requisitions/${log.source_id}`)}
                                                    >
                                                        {log.reference_no || 'ใบสั่งซื้อ'}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-textMuted">ปรับด้วยมือ</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-medium">
                                            {log.performed_by || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-textMuted text-sm" style={{ maxWidth: '250px' }}>
                                            {log.remark || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="p-20 text-center text-textMuted">
                                        <History size={48} className="mb-4" style={{ opacity: 0.1 }} />
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
                    <div className="glass-panel p-8" style={{ width: '90%', maxWidth: '420px', background: 'white' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0">ปรับยอดสต๊อก — {item.name}</h3>
                            <button onClick={() => setShowAdjustModal(false)} className="bg-transparent border-none cursor-pointer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdjustSubmit}>
                            <div className="mb-5">
                                <label className="block text-sm text-textMuted mb-2">ประเภทรายการ</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('IN')}
                                        className="p-3 rounded-lg font-semibold cursor-pointer" style={{ border: '1px solid #10b981', background: adjustType === 'IN' ? '#10b981' : 'white', color: adjustType === 'IN' ? 'white' : '#10b981' }}
                                    >
                                        นำเข้า (+)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('OUT')}
                                        className="p-3 rounded-lg font-semibold cursor-pointer" style={{ border: '1px solid #ef4444', background: adjustType === 'OUT' ? '#ef4444' : 'white', color: adjustType === 'OUT' ? 'white' : '#ef4444' }}
                                    >
                                        เบิกออก (-)
                                    </button>
                                </div>
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm text-textMuted mb-2">จำนวน ({item.unit})</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    required
                                    value={adjustQty}
                                    onChange={e => setAdjustQty(e.target.value)}
                                    className="glass-input w-full p-3 rounded-lg"
                                />
                            </div>
                            {adjustType === 'IN' && (
                                <div className="mb-5">
                                    <label className="block text-sm text-textMuted mb-2">ราคาซื้อต่อหน่วย (บาท) — ไม่บังคับ</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={adjustCost}
                                        onChange={e => setAdjustCost(e.target.value)}
                                        className="glass-input w-full p-3 rounded-lg"
                                        placeholder="เช่น 80.00"
                                    />
                                </div>
                            )}
                            <div className="mb-6">
                                <label className="block text-sm text-textMuted mb-2">หมายเหตุ</label>
                                <textarea
                                    value={adjustRemark}
                                    onChange={e => setAdjustRemark(e.target.value)}
                                    className="glass-input w-full p-3 rounded-lg min-h-[80px]"
                                    placeholder="เช่น ซื้อเพิ่มจากร้าน ABC, เบิกใช้ในงาน XYZ..."
                                />
                            </div>
                            <div className="flex gap-3">
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
