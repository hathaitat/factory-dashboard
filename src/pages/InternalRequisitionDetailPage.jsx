import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, CheckCircle, XCircle, Printer, Calendar, User, ShoppingCart, Info, Clock, AlertTriangle, ShieldCheck, Package, PackageCheck, X, Save, DollarSign } from 'lucide-react';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { internalItemService } from '../services/internalItemService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';

const InternalRequisitionDetailPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showError, showConfirm } = useDialog();
    const { hasPermission } = usePermissions();
    const currentUser = user;
    const [requisition, setRequisition] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [approvedQuantities, setApprovedQuantities] = useState({});

    // Stock Receive Modal
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [receiveItems, setReceiveItems] = useState([]);
    const [isReceiving, setIsReceiving] = useState(false);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await internalRequisitionService.getRequisitionById(id);
            if (data) {
                setRequisition(data);
                if (data.status === 'Draft' && data.items) {
                    setSelectedItems(data.items.map(item => item.id));
                    const initialQtys = {};
                    data.items.forEach(item => {
                        initialQtys[item.id] = item.quantity;
                    });
                    setApprovedQuantities(initialQtys);
                }
            } else {
                showError('ไม่พบข้อมูลใบสั่งซื้อ');
                navigate('/dashboard/internal-items?tab=history');
            }
        } catch (err) {
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        const statusText = {
            'Approved': 'อนุมัติ',
            'Cancelled': 'ยกเลิก'
        }[newStatus] || newStatus;

        const ok = await showConfirm(`ต้องการเปลี่ยนสถานะเป็น "${statusText}" ใช่หรือไม่?`);
        if (!ok) return;

        try {
            await internalRequisitionService.updateStatus(id, newStatus, currentUser?.fullName || currentUser?.username || 'Unknown');
            showAlert(`เปลี่ยนสถานะเป็น ${statusText} สำเร็จ`);
            loadData();
        } catch (err) {
            showError(err.message || 'ไม่สามารถเปลี่ยนสถานะได้');
        }
    };

    // Handle Approval & Stock Deduction
    const handleApproveAndDeduct = async () => {
        if (selectedItems.length === 0) {
            showError('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการเพื่ออนุมัติ');
            return;
        }

        // Validate quantities
        for (const itemId of selectedItems) {
            if (!approvedQuantities[itemId] || approvedQuantities[itemId] <= 0) {
                showError('กรุณาระบุจำนวนที่ต้องการอนุมัติให้ถูกต้อง (ต้องมากกว่า 0)');
                return;
            }
            const originalItem = requisition.items.find(i => i.id === itemId);
            if (approvedQuantities[itemId] > originalItem.quantity) {
                showError(`จำนวนที่อนุมัติของ ${originalItem.item_name} ต้องไม่เกินจำนวนที่ขอเบิก (${originalItem.quantity})`);
                return;
            }
        }

        const unselectedCount = requisition.items.length - selectedItems.length;
        let confirmMsg = `ยืนยันการอนุมัติและตัดสต๊อกสินค้าที่เลือกจำนวน ${selectedItems.length} รายการ?\n\nระบบจะหักสต๊อกและบันทึกประวัติการเบิกใช้อัตโนมัติ`;
        if (unselectedCount > 0) {
            confirmMsg += `\n\n⚠️ คำเตือน: สินค้าที่ไม่ได้เลือกอีก ${unselectedCount} รายการ จะถูกลบออกจากใบเบิกนี้!`;
        }

        const ok = await showConfirm(confirmMsg);
        if (!ok) return;

        setIsLoading(true); // Reuse loading state for the whole page during action
        try {
            const quantitiesToPass = {};
            selectedItems.forEach(itemId => {
                quantitiesToPass[itemId] = Number(approvedQuantities[itemId]);
            });

            await internalRequisitionService.approveAndDeductStock(id, currentUser?.fullName || 'system', quantitiesToPass);
            showAlert(`อนุมัติและตัดสต๊อกเรียบร้อยแล้ว`);
            loadData();
        } catch (err) {
            showError(err.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(requisition.items.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (itemId) => {
        setSelectedItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId) 
                : [...prev, itemId]
        );
    };

    const handleQuantityChange = (itemId, val) => {
        setApprovedQuantities(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return { bg: '#10b981', text: '#fff' };
            case 'Approved': return { bg: '#3b82f6', text: '#fff' };
            case 'Draft': return { bg: '#6b7280', text: '#fff' };
            case 'Cancelled': return { bg: '#ef4444', text: '#fff' };
            default: return { bg: '#6b7280', text: '#fff' };
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!requisition) return null;

    const statusStyle = getStatusColor(requisition.status);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard/internal-items?tab=history')} className="p-2 rounded-lg bg-transparent border border-border cursor-pointer text-textMuted hover:text-textMain hover:border-primary transition-all"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-xl font-bold text-textMain m-0">{requisition.requisition_number}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={statusStyle}>
                                {requisition.status}
                            </span>
                            <span className="text-sm text-textMuted flex items-center gap-1">
                                <Calendar size={12} /> {new Date(requisition.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer hover:bg-white/5 font-medium transition-all">
                        <Printer size={18} /> พิมพ์
                    </button>
                    {requisition.status === 'Draft' && hasPermission('internal_items', 'edit') && (
                        <button onClick={() => navigate(`/dashboard/internal-requisitions/${requisition.id}/edit`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-medium hover:opacity-90 transition-opacity">
                            <Edit2 size={18} /> แก้ไข
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Items */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Items List */}
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="px-6 py-4 border-b border-border bg-white/5 flex items-center gap-2 text-primary font-semibold">
                            <Info size={18} /> รายการสินค้า
                        </div>
                        <div className="table-responsive-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr className="border-b border-border text-xs text-textMuted uppercase tracking-wider">
                                        {requisition.status === 'Draft' && hasPermission('internal_items', 'edit') && (
                                            <th className="px-6 py-3 text-left font-medium w-[40px]">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedItems.length === requisition.items?.length && requisition.items?.length > 0} 
                                                    onChange={handleSelectAll} 
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-3 text-left font-medium">ลำดับ</th>
                                        <th className="px-6 py-3 text-left font-medium">ชื่อสินค้า</th>
                                        <th className="px-6 py-3 text-right font-medium">จำนวน</th>
                                        <th className="px-6 py-3 text-center font-medium">หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requisition.items?.map((item, idx) => (
                                        <tr key={item.id} className={`border-b border-border hover:bg-white/5 transition-colors ${requisition.status === 'Draft' && hasPermission('internal_items', 'edit') && !selectedItems.includes(item.id) ? 'opacity-50' : ''}`}>
                                            {requisition.status === 'Draft' && hasPermission('internal_items', 'edit') && (
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedItems.includes(item.id)}
                                                        onChange={() => handleSelectItem(item.id)}
                                                        className="w-4 h-4 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-textMuted text-sm">{idx + 1}</td>
                                            <td className="px-6 py-4 font-medium text-textMain">{item.item_name}</td>
                                            <td className="px-6 py-4 text-right">
                                                {requisition.status === 'Draft' && hasPermission('internal_items', 'edit') && selectedItems.includes(item.id) ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            max={item.quantity}
                                                            value={approvedQuantities[item.id] || ''} 
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            className="glass-input w-20 text-right text-main border border-border" 
                                                            style={{ padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '6px' }}
                                                        />
                                                        <span className="text-xs text-textMuted">/ {item.quantity}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-textMain font-semibold">{(item.quantity || 0).toLocaleString()}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-textMuted text-sm">{item.unit || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Remark */}
                    {requisition.remark && (
                        <div className="glass-panel p-6">
                            <h3 className="text-sm font-semibold text-textMuted mb-2 flex items-center gap-2 uppercase tracking-wide">
                                <Info size={16} /> หมายเหตุ
                            </h3>
                            <p className="text-textMain whitespace-pre-wrap m-0 leading-relaxed">{requisition.remark}</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Information & Actions */}
                <div className="flex flex-col gap-6">
                    {/* Summary Info */}
                    <div className="glass-panel p-6">
                        <h3 className="text-sm font-semibold text-textMuted mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-border pb-2">
                            <Clock size={16} /> ข้อมูลเอกสาร
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-textMuted flex items-center gap-2"><User size={14} /> ผู้ขอสั่งซื้อ:</span>
                                <span className="text-sm font-medium text-textMain text-right">{requisition.requested_by || '-'}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-textMuted flex items-center gap-2"><CheckCircle size={14} /> ผู้อนุมัติ:</span>
                                <span className="text-sm font-medium text-textMain text-right">{requisition.approved_by || '-'}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-textMuted flex items-center gap-2"><ShoppingCart size={14} /> ประเภท:</span>
                                <span className="text-sm font-bold text-[#3b82f6]">สั่งซื้อ (Purchase)</span>
                            </div>
                            {requisition.total_amount > 0 && (
                                <div className="flex justify-between items-start">
                                    <span className="text-sm text-textMuted flex items-center gap-2"><DollarSign size={14} /> มูลค่ารวม:</span>
                                    <span className="text-sm font-bold text-[#10b981]">฿{requisition.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="mt-2 pt-4 border-t border-border flex flex-col gap-2">
                                <div>
                                    <div className="text-[10px] text-textMuted uppercase font-bold tracking-widest">สร้างเมื่อ</div>
                                    <div className="text-xs text-textMain">{new Date(requisition.created_at).toLocaleString('th-TH')}</div>
                                </div>
                                {requisition.created_by && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <User size={14} className="text-textMuted" /> สร้างโดย: <span className="text-main font-semibold">{requisition.created_by}</span>
                                    </div>
                                )}
                                {requisition.updated_at && (
                                    <div>
                                        <div className="text-[10px] text-textMuted uppercase font-bold tracking-widest">แก้ไขล่าสุดเมื่อ</div>
                                        <div className="text-xs text-textMain">{new Date(requisition.updated_at).toLocaleString('th-TH')}</div>
                                    </div>
                                )}
                                {requisition.updated_by && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <User size={14} className="text-textMuted" /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{requisition.updated_by}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Actions */}
                    {hasPermission('internal_items', 'edit') && (
                        <div className="glass-panel p-6">
                            <h3 className="text-sm font-semibold text-textMuted mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-border pb-2">
                                <ShieldCheck size={16} className="text-primary" /> จัดการสถานะ
                            </h3>
                            <div className="flex flex-col gap-2">
                                {requisition.status === 'Draft' && (
                                    <button onClick={handleApproveAndDeduct} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#10b981] text-white border-none cursor-pointer font-bold hover:opacity-90 transition-all">
                                        <PackageCheck size={18} /> อนุมัติและตัดสต๊อก
                                    </button>
                                )}
                                {requisition.status !== 'Completed' && requisition.status !== 'Cancelled' && (
                                    <button onClick={() => handleStatusChange('Cancelled')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-transparent border border-[#ef4444] text-[#ef4444] cursor-pointer font-bold hover:bg-[#ef4444]/10 transition-all">
                                        <XCircle size={18} /> ยกเลิกรายการ
                                    </button>
                                )}
                                {requisition.status === 'Completed' && (
                                    <div className="p-3 rounded-lg bg-[#10b9811a] text-[#10b981] text-xs flex items-start gap-2 leading-relaxed">
                                        <CheckCircle size={16} className="shrink-0" />
                                        รายการนี้ถูกอนุมัติและตัดสต๊อกเรียบร้อยแล้ว ไม่สามารถแก้ไขได้
                                    </div>
                                )}
                                {requisition.status === 'Cancelled' && (
                                    <div className="p-3 rounded-lg bg-[#ef44441a] text-[#ef4444] text-xs flex items-start gap-2 leading-relaxed">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        รายการนี้ถูกยกเลิกแล้ว
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default InternalRequisitionDetailPage;
