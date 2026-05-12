import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Clock, ArrowUpRight, ArrowDownLeft, 
    History, Package, Building2, User, FileText, 
    Calendar, TrendingUp, TrendingDown, Printer 
} from 'lucide-react';
import { warehouseService } from '../services/warehouseService';
import { supabase } from '../services/supabaseClient';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';

const InventoryHistoryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showAlert } = useDialog();

    const [item, setItem] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const itemData = await warehouseService.getInventoryItemById(id);
            if (!itemData) {
                showError('ไม่พบข้อมูลสินค้า');
                navigate('/dashboard/warehouses');
                return;
            }
            setItem(itemData);

            const logsData = await warehouseService.getInventoryLogs(id);
            setLogs(logsData || []);
        } catch (error) {
            console.error('Error loading inventory history:', error);
            showError('ไม่สามารถโหลดข้อมูลประวัติสินค้าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitializeHistory = async () => {
        try {
            setIsLoading(logs.length === 0);
            const initialLog = {
                inventory_id: id,
                type: 'IN',
                qty: item.quantity,
                remark: 'ยอดเริ่มต้น (Initial Balance)',
                created_at: new Date().toISOString()
            };
            
            await warehouseService.logMovement(initialLog);
            showAlert('บันทึกยอดเริ่มต้นเรียบร้อยแล้ว');
            loadData();
        } catch (error) {
            console.error('Error initializing history:', error);
            showError('ไม่สามารถบันทึกประวัติได้: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
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
                        onClick={() => navigate('/dashboard/warehouses')} 
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <PageHeader 
                        title="ประวัติความเคลื่อนไหวสินค้า" 
                        subtitle={`${item.product_name} (${item.sku || 'ไม่มี SKU'})`}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {logs.length === 0 && (
                        <button 
                            onClick={handleInitializeHistory}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0.6rem 1rem' }}
                        >
                            <History size={18} /> บันทึกยอดเริ่มต้น (Initial Balance)
                        </button>
                    )}
                    <button 
                        onClick={() => window.print()} 
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
                    >
                        <Printer size={18} /> พิมพ์ Stock Card
                    </button>
                </div>
            </div>

            {/* Item Info & Stats */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel p-6">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <Building2 size={16} /> คลังสินค้า
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>{item.warehouse?.name || '-'}</div>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <Package size={16} /> จำนวนคงเหลือปัจจุบัน
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {Number(item.quantity).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#10b981', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <TrendingUp size={16} /> รวมการนำเข้า
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                        +{stats.totalIn.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <TrendingDown size={16} /> รวมการนำออก
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                        -{stats.totalOut.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
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
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ก่อนหน้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>ยอดหลังทำรายการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ที่มา/อ้างอิง</th>
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
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                            {Number(log.old_quantity || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600' }}>
                                            {Number(log.balance || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {log.source_type === 'po' ? (
                                                    <>
                                                        <FileText size={14} color="#3b82f6" />
                                                        <span 
                                                            style={{ color: '#3b82f6', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => navigate(`/dashboard/supplier-pos/${log.source_id}`)}
                                                        >
                                                            {log.reference_no || 'ใบสั่งซื้อ'}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User size={14} color="var(--text-muted)" />
                                                        <span>บันทึกด้วยมือ</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '250px' }}>
                                            {log.remark || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <History size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <div>ยังไม่มีประวัติความเคลื่อนไหวสำหรับสินค้านี้</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryHistoryPage;
