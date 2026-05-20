import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowUpRight, ArrowDownLeft,
    History, Package, Building2, User, FileText, TrendingUp, TrendingDown, Printer
} from 'lucide-react';
import { warehouseService } from '../services/warehouseService';
import { supplierPoService } from '../services/supplierPoService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import { Plus, Minus, Save, X } from 'lucide-react';

const InventoryHistoryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showAlert } = useDialog();
    const currentUser = userService.getCurrentUser();

    const [item, setItem] = useState(null);
    const [logs, setLogs] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal state for manual adjustment
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustType, setAdjustType] = useState('IN');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustRemark, setAdjustRemark] = useState('');

    // BOM Rules state
    const [bomRules, setBomRules] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [showBomModal, setShowBomModal] = useState(false);
    const [editingBomRule, setEditingBomRule] = useState(null);
    const [newBomRule, setNewBomRule] = useState({ supplier_product_id: '', raw_material_qty: '', finished_product_qty: '' });

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

            const pItems = await supplierPoService.getPendingItems();
            setPendingItems(pItems || []);

            // Load BOM Rules and Products
            const rulesData = await warehouseService.getInventoryBomRules(id);
            setBomRules(rulesData || []);
            
            const { supplierProductService } = await import('../services/supplierProductService');
            const prods = await supplierProductService.getAllProducts();
            setSupplierProducts(prods || []);

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
                previous_quantity: 0,
                new_quantity: item.quantity,
                remark: 'ยอดเริ่มต้น (Initial Balance)',
                performed_by: currentUser?.fullName || 'system',
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

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        if (!adjustQty || Number(adjustQty) <= 0) {
            showError('กรุณาระบุจำนวนที่ถูกต้อง');
            return;
        }

        setIsSaving(true);
        try {
            await warehouseService.adjustStock(id, adjustType, adjustQty, adjustRemark, currentUser?.fullName || 'system');
            showAlert('ปรับยอดสต็อกเรียบร้อยแล้ว');
            setShowAdjustModal(false);
            setAdjustQty('');
            setAdjustRemark('');
            loadData();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            showError('เกิดข้อผิดพลาดในการปรับยอดสต็อก');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveBomRule = async (e) => {
        e.preventDefault();
        if (!newBomRule.supplier_product_id || !newBomRule.raw_material_qty || !newBomRule.finished_product_qty) {
            showError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        setIsSaving(true);
        try {
            await warehouseService.saveInventoryBomRule(
                id, 
                newBomRule.supplier_product_id, 
                newBomRule.raw_material_qty, 
                newBomRule.finished_product_qty
            );
            showAlert('บันทึกการตั้งค่าสูตรการผลิตเรียบร้อยแล้ว');
            setShowBomModal(false);
            setNewBomRule({ supplier_product_id: '', raw_material_qty: '', finished_product_qty: '' });
            
            // Reload rules
            const rulesData = await warehouseService.getInventoryBomRules(id);
            setBomRules(rulesData || []);
        } catch (error) {
            console.error('Error saving BOM rule:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกสูตรการผลิต (ข้อมูลอาจซ้ำซ้อน)');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBomRule = async (ruleId) => {
        const confirmed = await showConfirm('คุณต้องการลบสูตรการผลิตนี้ใช่หรือไม่?');
        if (!confirmed) return;

        try {
            await warehouseService.deleteInventoryBomRule(ruleId);
            showAlert('ลบสูตรการผลิตเรียบร้อยแล้ว');
            const rulesData = await warehouseService.getInventoryBomRules(id);
            setBomRules(rulesData || []);
        } catch (error) {
            console.error('Error deleting BOM rule:', error);
            showError('เกิดข้อผิดพลาดในการลบสูตรการผลิต');
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
                    <button
                        onClick={() => navigate(`/dashboard/supplier-pos/create?subcontract_inventory_id=${item.id}&subcontract_material=${encodeURIComponent(item.product_name)}&subcontract_warehouse=${item.warehouse_id}`)}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderColor: '#8b5cf6', color: '#8b5cf6' }}
                    >
                        <Building2 size={18} /> เปิด PO ผลิต
                    </button>
                    <button
                        onClick={() => setShowAdjustModal(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
                    >
                        <Plus size={18} /> ปรับสต็อก
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
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <Building2 size={16} /> คลังสินค้า
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>{item.warehouse ? `${item.warehouse.code ? `[${item.warehouse.code}] ` : ''}${item.warehouse.name}` : '-'}</div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <Package size={16} /> จำนวนคงเหลือปัจจุบัน
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {Number(item.quantity).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#8b5cf6', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <ArrowUpRight size={16} /> รายการกำลังมา (PO)
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#8b5cf6' }}>
                        {(() => {
                            const coming = pendingItems
                                .filter(p => p.description === item.product_name)
                                .reduce((sum, p) => sum + (Number(p.quantity) - Number(p.received_quantity || 0)), 0);
                            return `+${coming.toLocaleString()}`;
                        })()}
                        <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}> {item.unit}</span>
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
                        <TrendingDown size={16} /> รวมการนำออก
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#ef4444' }}>
                        -{stats.totalOut.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                </div>
            </div>

            {/* BOM Rules Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)' }}>
                        <Building2 size={20} /> ตั้งค่าสูตรการผลิต (BOM Rules)
                    </h3>
                    <button 
                        onClick={() => setShowBomModal(true)} 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        <Plus size={16} /> เพิ่มสูตรการผลิต
                    </button>
                </div>
                
                {bomRules.length > 0 ? (
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>สินค้าที่ผลิตได้ (Finished Product)</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>ใช้วัตถุดิบ ({item.unit})</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>ผลิตได้ (หน่วย)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>อัตราส่วนต่อ 1 ชิ้น</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bomRules.map(rule => (
                                    <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{rule.supplier_products?.name || 'Unknown'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#8b5cf6', fontWeight: '500' }}>{Number(rule.raw_material_qty).toLocaleString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--primary)', fontWeight: '500' }}>{Number(rule.finished_product_qty).toLocaleString()} {rule.supplier_products?.unit || 'PCS'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            {(Number(rule.raw_material_qty) / Number(rule.finished_product_qty)).toFixed(4)} {item.unit}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button onClick={() => handleDeleteBomRule(rule.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                        ยังไม่มีการตั้งค่าสูตรการผลิตสำหรับวัตถุดิบรายการนี้
                    </div>
                )}
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
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                                {log.performed_by || (log.remark?.includes('(โดย ') ? log.remark.split('(โดย ')[1].replace(')', '') : '-')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '250px' }}>
                                            {log.remark?.includes('(โดย ') ? log.remark.split(' (โดย ')[0] : (log.remark || '-')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>ปรับยอดสต็อกด้วยมือ</h3>
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
                                    step="0.01"
                                    required
                                    value={adjustQty}
                                    onChange={e => setAdjustQty(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>หมายเหตุ (ระบุเหตุผลที่ปรับปรุง)</label>
                                <textarea
                                    required
                                    value={adjustRemark}
                                    onChange={e => setAdjustRemark(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', minHeight: '80px' }}
                                    placeholder="เช่น ของเสีย, นับสต็อกผิด, รับของคืน..."
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

            {/* BOM Modal */}
            {showBomModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                                <Building2 size={20} /> เพิ่มการตั้งค่าสูตรการผลิต
                            </h3>
                            <button onClick={() => setShowBomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveBomRule}>
                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>สินค้าที่ผลิตได้ (Finished Product)</label>
                                <select
                                    value={newBomRule.supplier_product_id}
                                    onChange={e => setNewBomRule({ ...newBomRule, supplier_product_id: e.target.value })}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)' }}
                                    required
                                >
                                    <option value="">-- เลือกสินค้า --</option>
                                    {supplierProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} {p.suppliers?.name ? `(${p.suppliers.name})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ใช้วัตถุดิบ ({item.unit})</label>
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        min="0.0001"
                                        value={newBomRule.raw_material_qty}
                                        onChange={e => setNewBomRule({ ...newBomRule, raw_material_qty: e.target.value })}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderColor: '#8b5cf6' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.5rem' }}>
                                    <ArrowLeft size={20} color="#8b5cf6" style={{ transform: 'rotate(180deg)' }} />
                                </div>
                                <div style={{ gridColumn: '2' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ผลิตได้ (หน่วยสินค้า)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0.01"
                                        value={newBomRule.finished_product_qty}
                                        onChange={e => setNewBomRule({ ...newBomRule, finished_product_qty: e.target.value })}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderColor: 'var(--primary)' }}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#8b5cf6', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <div>*</div>
                                <div>
                                    <strong>ตัวอย่าง:</strong> ถ้าการผลิต PIN 200 ตัว ต้องใช้เหล็กนี้ 10 กก.<br/>
                                    ให้ใส่ <code>ใช้วัตถุดิบ: 10</code> และ <code>ผลิตได้: 200</code><br/>
                                    (ระบบจะคำนวณอัตราส่วนต่อ 1 ชิ้นให้อัตโนมัติเวลาเปิด PO)
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกสูตรการผลิต'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryHistoryPage;
