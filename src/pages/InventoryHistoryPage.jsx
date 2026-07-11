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
import { Plus, Save, X, Trash2, Calculator } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import { productionService } from '../services/productionService';
import { productionMaterialService } from '../services/productionMaterialService';

const InventoryHistoryPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showAlert, showConfirm } = useDialog();
    const { hasPermission } = usePermissions();
    const currentUser = user;

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
    const [productionLines, setProductionLines] = useState([]);
    const [reqLineId, setReqLineId] = useState('');
    const [reqWeightKg, setReqWeightKg] = useState('');
    
    // New state for Target Items
    const [targetItems, setTargetItems] = useState([]);
    const [reqTargetItemId, setReqTargetItemId] = useState('');

    useEffect(() => {
        const fetchTargetItems = async () => {
            if (!reqLineId) {
                setTargetItems([]);
                setReqTargetItemId('');
                return;
            }
            const line = productionLines.find(l => l.id === reqLineId);
            if (line && line.warehouse_ids && line.warehouse_ids.length > 0) {
                try {
                    const items = await warehouseService.getInventoryItemsByWarehouses(line.warehouse_ids);
                    setTargetItems(items || []);
                } catch (error) {
                    console.error("Error fetching target items:", error);
                }
            } else {
                setTargetItems([]);
                setReqTargetItemId('');
            }
        };
        fetchTargetItems();
    }, [reqLineId, productionLines]);
    const [bomRules, setBomRules] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [showBomModal, setShowBomModal] = useState(false);
    const [newBomRule, setNewBomRule] = useState({ supplier_product_id: '', raw_material_qty: '', finished_product_qty: '', rounding_mode: 'exact' });

    // Move Warehouse state
    const [warehouses, setWarehouses] = useState([]);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetWarehouseId, setTargetWarehouseId] = useState('');

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

            const rulesData = await warehouseService.getInventoryBomRules(id);
            setBomRules(rulesData || []);

            const whs = await warehouseService.getWarehouses();
            setWarehouses(whs || []);

            const { supplierProductService } = await import('../services/supplierProductService');
            const prods = await supplierProductService.getAllProducts();
            setSupplierProducts(prods || []);

            const lines = await productionService.getLines();
            setProductionLines(lines || []);

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
            if (adjustType === 'PROD_REQ') {
                if (!reqLineId) {
                    setIsSaving(false);
                    return showError('กรุณาเลือกแผนกการผลิต');
                }
                const reqData = {
                    req_date: new Date().toISOString().split('T')[0],
                    line_id: reqLineId,
                    source_warehouse_id: item.warehouse_id,
                    status: 'completed',
                    created_by: currentUser?.email
                };
                
                let finalRemark = adjustRemark;
                if (reqTargetItemId) {
                    const tItem = targetItems.find(i => i.id === reqTargetItemId);
                    if (tItem) {
                        finalRemark = finalRemark
                            ? `${finalRemark} (เบิกเพื่อผลิต: ${tItem.product_name})`
                            : `เบิกเพื่อผลิต: ${tItem.product_name}`;
                    }
                }
                
                const itemsData = [{
                    inventory_id: id,
                    quantity: Number(adjustQty),
                    unit: item.unit,
                    weight_kg: reqWeightKg ? Number(reqWeightKg) : null,
                    notes: finalRemark
                }];
                await productionMaterialService.createRequisition(reqData, itemsData, currentUser?.fullName || 'system');
                showAlert('เบิกออกผลิตเรียบร้อยแล้ว');
            } else {
                await warehouseService.adjustStock(id, adjustType, adjustQty, adjustRemark, currentUser?.fullName || 'system');
                showAlert('ปรับยอดสต็อกเรียบร้อยแล้ว');
            }
            setShowAdjustModal(false);
            setAdjustQty('');
            setAdjustRemark('');
            setReqLineId('');
            setReqWeightKg('');
            setReqTargetItemId('');
            loadData();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            showError('เกิดข้อผิดพลาดในการทำรายการ');
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
                newBomRule.finished_product_qty,
                newBomRule.rounding_mode || 'exact'
            );
            showAlert('บันทึกการตั้งค่าสูตรการผลิตเรียบร้อยแล้ว');
            setShowBomModal(false);
            setNewBomRule({ supplier_product_id: '', raw_material_qty: '', finished_product_qty: '', rounding_mode: 'exact' });

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
            showError('เกิดข้อผิดพลาดในการลบสูตร');
        }
    };

    const handleMoveSubmit = async (e) => {
        e.preventDefault();
        if (!targetWarehouseId) {
            showError('กรุณาเลือกคลังสินค้าปลายทาง');
            return;
        }

        const isConfirmed = await showConfirm('คุณต้องการย้ายสินค้าไปยังคลังที่เลือกใช่หรือไม่? (หากปลายทางมีสินค้านี้อยู่แล้ว ระบบจะรวมยอดและลบรายการนี้ทิ้ง)');
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            const result = await warehouseService.moveInventoryItem(id, targetWarehouseId, currentUser?.fullName || 'system');
            showAlert('ย้ายคลังสินค้าสำเร็จ');
            setShowMoveModal(false);
            
            if (result?.action === 'merged') {
                // If it was merged, the original ID was deleted, navigate to the target inventory
                navigate(`/dashboard/inventory/${result.target_inventory_id}`);
            } else {
                // It was just moved, reload the current page
                loadData();
            }
        } catch (error) {
            console.error('Error moving inventory item:', error);
            showError(error.message || 'เกิดข้อผิดพลาดในการย้ายคลัง');
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
                        onClick={() => navigate('/dashboard/warehouses')}
                        className="bg-transparent border border-border text-main rounded-lg cursor-pointer" style={{ padding: '0.5rem' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <PageHeader
                        title="ประวัติความเคลื่อนไหวสินค้า"
                        subtitle={`${item.product_name} (${item.sku || 'ไม่มี SKU'})`}
                        style={{ marginBottom: 0 }}
                    />
                </div>
                <div className="flex flex-wrap justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={() => {
                            if (bomRules.length === 0) {
                                showAlert('กรุณาตั้งค่าสูตรการผลิต (BOM Rules) ด้านล่างก่อนทำการเปิดใบสั่งจ้างผลิต เพื่อให้ระบบคำนวณการตัดสต็อกได้ถูกต้อง');
                                return;
                            }
                            navigate(`/dashboard/supplier-pos/create?subcontract_inventory_id=${item.id}&subcontract_material=${encodeURIComponent(item.product_name)}&subcontract_warehouse=${item.warehouse_id}`);
                        }}
                        className="btn-secondary px-4 py-2 text-violet-500 flex items-center gap-2 whitespace-nowrap" style={{ borderColor: '#8b5cf6' }}
                    >
                        <Building2 size={18} /> เปิด PO ผลิต
                    </button>
                    {hasPermission('warehouses', 'edit') && (
                        <button
                            onClick={() => setShowAdjustModal(true)}
                            className="btn-primary px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={18} /> ปรับสต็อก
                        </button>
                    )}
                    {hasPermission('warehouses', 'edit') && (
                        <button
                            onClick={() => setShowMoveModal(true)}
                            className="btn-secondary px-4 py-2 text-blue-500 flex items-center gap-2 whitespace-nowrap" style={{ borderColor: '#3b82f6' }}
                        >
                            <ArrowUpRight size={18} /> ย้ายคลัง
                        </button>
                    )}
                    {hasPermission('warehouses', 'edit') && logs.length === 0 && (
                        <button
                            onClick={handleInitializeHistory}
                            className="btn-secondary text-primary px-4 py-2 flex items-center gap-2 whitespace-nowrap" style={{ borderColor: 'var(--primary)' }}
                        >
                            <History size={18} /> บันทึกยอดเริ่มต้น
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="btn-secondary px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Printer size={18} /> พิมพ์ Stock Card
                    </button>
                </div>
            </div>

            {/* Item Info & Stats */}
            <div className="grid-mobile-stack mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                <div className="glass-panel p-4">
                    <div className="text-textMuted text-sm mb-2 flex items-center gap-3">
                        <Building2 size={16} /> คลังสินค้า
                    </div>
                    <div className="text-lg font-bold text-main">{item.warehouse ? `${item.warehouse.code ? `[${item.warehouse.code}] ` : ''}${item.warehouse.name}` : '-'}</div>
                </div>

                <div className="glass-panel p-4">
                    <div className="text-textMuted text-sm mb-2 flex items-center gap-3">
                        <Package size={16} /> จำนวนคงเหลือปัจจุบัน
                    </div>
                    <div className="text-xl font-bold text-primary">
                        {Number(item.quantity).toLocaleString()} <span className="text-sm font-normal text-textMuted">{item.unit}</span>
                    </div>
                </div>

                <div className="glass-panel p-4">
                    <div className="text-violet-500 text-sm mb-2 flex items-center gap-3">
                        <ArrowUpRight size={16} /> รายการกำลังมา (PO)
                    </div>
                    <div className="text-xl font-bold text-violet-500">
                        {(() => {
                            const coming = pendingItems
                                .filter(p => p.description === item.product_name)
                                .reduce((sum, p) => sum + (Number(p.quantity) - Number(p.received_quantity || 0)), 0);
                            return `+${coming.toLocaleString()}`;
                        })()}
                        <span className="text-sm font-normal text-textMuted"> {item.unit}</span>
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

                <div className="glass-panel p-4" >
                    <div className="text-red-500 text-sm mb-2 flex items-center gap-3">
                        <TrendingDown size={16} /> รวมการนำออก
                    </div>
                    <div className="text-xl font-bold text-red-500">
                        -{stats.totalOut.toLocaleString()} <span className="text-sm font-normal text-textMuted">{item.unit}</span>
                    </div>
                </div>
            </div>

            {/* BOM Rules Section */}
            <div className="glass-panel p-6 mb-8">
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="m-0 text-primary flex items-center gap-2">
                        <Building2 size={20} /> ตั้งค่าสูตรการผลิต (BOM Rules)
                    </h3>
                    {hasPermission('warehouses', 'edit') && (
                        <button
                            onClick={() => setShowBomModal(true)}
                            className="btn-primary px-4 py-2 text-sm"
                        >
                            <Plus size={16} /> เพิ่มสูตรการผลิต
                        </button>
                    )}
                </div>

                {bomRules.length > 0 ? (
                    <div className="table-responsive-wrapper">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                    <th className="p-4 text-left text-textMuted">สินค้าที่ผลิตได้ (Finished Product)</th>
                                    <th className="p-4 text-right text-textMuted">ใช้วัตถุดิบ ({item.unit})</th>
                                    <th className="p-4 text-right text-textMuted">ผลิตได้ (หน่วย)</th>
                                    <th className="p-4 text-center text-textMuted">อัตราส่วนต่อ 1 ชิ้น</th>
                                    {hasPermission('warehouses', 'edit') && <th className="p-4 text-center text-textMuted">จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {bomRules.map(rule => (
                                    <tr key={rule.id} className="border-b border-border">
                                        <td className="p-4">{rule.supplier_products?.name || 'Unknown'}</td>
                                        <td className="p-4 text-right text-violet-500 font-medium">{Number(rule.raw_material_qty).toLocaleString()}</td>
                                        <td className="p-4 text-right text-primary font-medium">{Number(rule.finished_product_qty).toLocaleString()} {rule.supplier_products?.unit || 'PCS'}</td>
                                        <td className="p-4 text-center">
                                            {(Number(rule.raw_material_qty) / Number(rule.finished_product_qty)).toFixed(4)} {item.unit}
                                        </td>
                                        {hasPermission('warehouses', 'edit') && (
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleDeleteBomRule(rule.id)} className="bg-transparent border-none text-red-500 cursor-pointer p-1.5" title="ลบ"><Trash2 size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        ยังไม่มีการตั้งค่าสูตรการผลิตสำหรับวัตถุดิบรายการนี้
                    </div>
                )}
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
                                        <td className="px-6 py-5 text-right text-textMuted">
                                            {Number(log.old_quantity || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5 text-right font-semibold">
                                            {Number(log.balance || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {log.source_type === 'po' ? (
                                                    <>
                                                        <FileText size={14} color="#3b82f6" />
                                                        <span
                                                            className="text-blue-500 font-semibold cursor-pointer underline"
                                                            onClick={() => navigate(`/dashboard/supplier-pos/${log.source_id}`)}
                                                        >
                                                            {log.reference_no || 'ใบสั่งซื้อ'}
                                                        </span>
                                                    </>
                                                ) : log.source_type === 'production_requisition' ? (
                                                    <>
                                                        <FileText size={14} color="#8b5cf6" />
                                                        <span
                                                            className="text-violet-500 font-semibold cursor-pointer underline"
                                                            onClick={() => navigate(`/dashboard/production/requisitions/${log.source_id}`)}
                                                        >
                                                            {log.reference_no || 'ใบเบิกผลิต'}
                                                        </span>
                                                    </>
                                                ) : log.source_type === 'production_requisition_cancel' ? (
                                                    <>
                                                        <FileText size={14} color="#f43f5e" />
                                                        <span
                                                            className="text-rose-500 font-semibold"
                                                            title="ใบเบิกนี้ถูกลบ/ยกเลิกออกจากระบบแล้ว"
                                                        >
                                                            ยกเลิก {log.reference_no || 'ใบเบิก'}
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
                                        <td className="px-6 py-5">
                                            <div className="text-sm text-main font-medium">
                                                {log.performed_by || (log.remark?.includes('(โดย ') ? log.remark.split('(โดย ')[1].replace(')', '') : '-')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-textMuted text-sm" style={{ maxWidth: '250px' }}>
                                            {log.remark?.includes('(โดย ') ? log.remark.split(' (โดย ')[0] : (log.remark || '-')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center text-textMuted">
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
                    <div className="glass-panel p-8" style={{ width: '90%', maxWidth: '400px', background: 'white' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0">ปรับยอดสต็อกด้วยมือ</h3>
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
                                <div className="mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustType('PROD_REQ')}
                                        className="w-full p-3 rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-2" style={{ border: '1px solid #8b5cf6', background: adjustType === 'PROD_REQ' ? '#8b5cf6' : 'white', color: adjustType === 'PROD_REQ' ? 'white' : '#8b5cf6' }}
                                    >
                                        <Building2 size={16} /> เบิกออกผลิต (-)
                                    </button>
                                </div>
                            </div>
                            
                            {adjustType === 'PROD_REQ' && (
                                <div className="mb-5">
                                    <label className="block text-sm text-textMuted mb-2">แผนกการผลิตที่เบิก <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={reqLineId}
                                        onChange={(e) => setReqLineId(e.target.value)}
                                        className="glass-input w-full p-3 rounded-lg"
                                    >
                                        <option value="">-- เลือกแผนก --</option>
                                        {productionLines.map(line => (
                                            <option key={line.id} value={line.id}>{line.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {adjustType === 'PROD_REQ' && reqLineId && (
                                <div className="mb-5">
                                    <label className="block text-sm text-textMuted mb-2">ผลิตเป็นอะไร (ตัวเลือกเพิ่มเติม)</label>
                                    <select
                                        value={reqTargetItemId}
                                        onChange={(e) => setReqTargetItemId(e.target.value)}
                                        className="glass-input w-full p-3 rounded-lg"
                                    >
                                        <option value="">-- ระบุสินค้าที่จะผลิต --</option>
                                        {targetItems.map(t => (
                                            <option key={t.id} value={t.id}>{t.product_name}</option>
                                        ))}
                                    </select>
                                    {targetItems.length === 0 && (
                                        <div className="text-xs text-orange-500 mt-1">
                                            * แผนกที่เลือกยังไม่ได้ผูกกับคลังสินค้าใดๆ (ไปที่เมนูตั้งค่าการผลิตเพื่อผูกคลังก่อน)
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mb-5" style={{ display: 'grid', gridTemplateColumns: adjustType === 'PROD_REQ' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                <div>
                                    <label className="block text-sm text-textMuted mb-2">จำนวน ({item.unit}) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={adjustQty}
                                        onChange={e => setAdjustQty(e.target.value)}
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                                {adjustType === 'PROD_REQ' && (
                                    <div>
                                        <label className="block text-sm text-textMuted mb-2">น้ำหนัก (กิโลกรัม)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={reqWeightKg}
                                            onChange={e => setReqWeightKg(e.target.value)}
                                            className="glass-input w-full p-3 rounded-lg"
                                            placeholder="ไม่บังคับ"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm text-textMuted mb-2">หมายเหตุ (ระบุเหตุผลที่ปรับปรุง)</label>
                                <textarea
                                    required
                                    value={adjustRemark}
                                    onChange={e => setAdjustRemark(e.target.value)}
                                    className="glass-input w-full p-3 rounded-lg min-h-[80px]"
                                    placeholder="เช่น ของเสีย, นับสต็อกผิด, รับของคืน..."
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

            {/* BOM Modal */}
            {showBomModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel p-8" style={{ width: '90%', maxWidth: '500px', background: 'white' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0 text-primary flex items-center gap-2">
                                <Building2 size={20} /> เพิ่มการตั้งค่าสูตรการผลิต
                            </h3>
                            <button onClick={() => setShowBomModal(false)} className="bg-transparent border-none cursor-pointer text-textMuted"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveBomRule}>
                            <div className="mb-5">
                                <label className="block text-sm text-textMuted mb-2">สินค้าที่ผลิตได้ (Finished Product)</label>
                                <select
                                    value={newBomRule.supplier_product_id}
                                    onChange={e => setNewBomRule({ ...newBomRule, supplier_product_id: e.target.value })}
                                    className="glass-input w-full p-3" style={{ background: 'var(--bg-main)' }}
                                    required
                                >
                                    <option value="">-- เลือกสินค้า --</option>
                                    {supplierProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} {p.suppliers?.name ? `(${p.suppliers.name})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', gap: '1rem', alignItems: 'center' }}>
                                <div>
                                    <label className="block text-sm text-textMuted mb-2">ใช้วัตถุดิบ ({item.unit})</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        value={newBomRule.raw_material_qty}
                                        onChange={e => setNewBomRule({ ...newBomRule, raw_material_qty: e.target.value })}
                                        className="glass-input w-full p-3" style={{ borderColor: '#8b5cf6' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.5rem' }}>
                                    <ArrowLeft size={20} color="#8b5cf6" style={{ transform: 'rotate(180deg)' }} />
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-2">ผลิตได้ (หน่วยสินค้า)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={newBomRule.finished_product_qty}
                                        onChange={e => setNewBomRule({ ...newBomRule, finished_product_qty: e.target.value })}
                                        className="glass-input w-full p-3" style={{ borderColor: 'var(--primary)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-textMuted mb-2">การปัดเศษเมื่อนำไปคำนวณวัตถุดิบ (Rounding Mode)</label>
                                <select
                                    value={newBomRule.rounding_mode || 'exact'}
                                    onChange={e => setNewBomRule({ ...newBomRule, rounding_mode: e.target.value })}
                                    className="glass-input w-full p-3" style={{ background: 'var(--bg-main)' }}
                                >
                                    <option value="exact">ตามทศนิยม (Exact)</option>
                                    <option value="up">ปัดขึ้นเสมอ (Round Up)</option>
                                    <option value="down">ปัดลงเสมอ (Round Down)</option>
                                </select>
                            </div>

                            <div className="p-4 rounded-lg mb-6 text-sm text-violet-500 flex gap-2" style={{ background: 'rgba(139, 92, 246, 0.05)', alignItems: 'flex-start' }}>
                                <div>*</div>
                                <div>
                                    <strong>ตัวอย่าง:</strong> ถ้าการผลิต PIN 200 ตัว ต้องใช้เหล็กนี้ 10 กก.<br />
                                    ให้ใส่ <code>ใช้วัตถุดิบ: 10</code> และ <code>ผลิตได้: 200</code><br />
                                    (ระบบจะคำนวณอัตราส่วนต่อ 1 ชิ้นให้อัตโนมัติเวลาเปิด PO)
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="btn-primary w-full p-3">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกสูตรการผลิต'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-main w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-cardHover/50">
                            <h3 className="m-0 flex items-center gap-2 text-blue-500">
                                <ArrowUpRight size={20} /> ย้ายคลังสินค้ารายตัว
                            </h3>
                            <button onClick={() => setShowMoveModal(false)} className="bg-transparent border-none text-textMuted cursor-pointer hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleMoveSubmit} className="p-6">
                            <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-500">
                                เลือกคลังสินค้าปลายทางที่คุณต้องการย้าย <strong>{item.product_name}</strong> ไป<br/><br/>
                                <span className="text-[0.75rem]">
                                    *หากปลายทางมีสินค้านี้อยู่แล้ว ระบบจะรวมยอดเข้าด้วยกันและลบรายการต้นทางทิ้ง
                                </span>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-textMuted mb-2">คลังสินค้าปลายทาง <span className="text-red-500">*</span></label>
                                <select
                                    value={targetWarehouseId}
                                    onChange={e => setTargetWarehouseId(e.target.value)}
                                    className="glass-input w-full p-3"
                                    required
                                >
                                    <option value="">-- เลือกคลังสินค้าปลายทาง --</option>
                                    {warehouses.filter(w => w.id !== item.warehouse_id).map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.is_default ? '[คลังหลัก] ' : ''}{w.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={isSaving || !targetWarehouseId} className="btn-primary w-full p-3 bg-blue-500 hover:bg-blue-600 border-none shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                {isSaving ? 'กำลังบันทึก...' : 'ยืนยันการย้ายคลัง'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryHistoryPage;
