import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShoppingCart, PackagePlus } from 'lucide-react';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { internalItemService } from '../services/internalItemService';
import { useDialog } from '../contexts/DialogContext';
import { userService } from '../services/userService';
import FormPageHeader from '../components/FormPageHeader';

const InternalRequisitionFormPage = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { showAlert, showError, showConfirm } = useDialog();

    const [categories, setCategories] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        requisition_number: '',
        date: new Date().toISOString().split('T')[0],
        type: 'purchase',
        requested_by: '',
        approved_by: '',
        status: 'Draft',
        total_amount: 0,
        remark: ''
    });

    const [items, setItems] = useState([
        { id: Date.now(), item_id: '', item_name: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, amount: 0 }
    ]);

    useEffect(() => { loadInitialData(); }, [id]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [catsData, itemsData] = await Promise.all([
                internalItemService.getCategories(),
                internalItemService.getItems()
            ]);
            setCategories(catsData);
            setAllItems(itemsData.filter(i => i.status === 'active'));

            if (!isEdit) {
                const currentUser = userService.getCurrentUser();
                const reqNum = await internalRequisitionService.generateRequisitionNumber('purchase');
                setFormData(prev => ({
                    ...prev,
                    requisition_number: reqNum,
                    requested_by: currentUser?.fullName || ''
                }));
            }

            if (isEdit) {
                const reqData = await internalRequisitionService.getRequisitionById(id);
                if (reqData) {
                    setFormData({
                        requisition_number: reqData.requisition_number || '',
                        date: reqData.date || new Date().toISOString().split('T')[0],
                        type: reqData.type || 'purchase',
                        requested_by: reqData.requested_by || '',
                        approved_by: reqData.approved_by || '',
                        status: reqData.status || 'Draft',
                        total_amount: reqData.total_amount || 0,
                        remark: reqData.remark || ''
                    });
                    if (reqData.items?.length > 0) {
                        setItems(reqData.items.map(item => ({
                            ...item,
                            id: item.id || Date.now() + Math.random()
                        })));
                    }
                }
            }
        } catch (err) {
            showError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemSelect = (index, itemId) => {
        const selectedItem = allItems.find(i => i.id === itemId);
        const newItems = [...items];
        if (selectedItem) {
            newItems[index] = {
                ...newItems[index],
                item_id: selectedItem.id,
                item_name: selectedItem.name,
                unit: selectedItem.unit || 'ชิ้น',
                unit_price: selectedItem.unit_price || 0,
                amount: (newItems[index].quantity || 1) * (selectedItem.unit_price || 0)
            };
        } else {
            newItems[index] = { ...newItems[index], item_id: '', item_name: '', unit: 'ชิ้น', unit_price: 0, amount: 0 };
        }
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        const item = newItems[index];
        item[field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems(prev => [...prev, { id: Date.now(), item_id: '', item_name: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, amount: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.requested_by.trim()) { showError('กรุณากรอกชื่อผู้ขอสั่งซื้อ'); return; }
        if (items.some(i => !i.item_name.trim())) { showError('กรุณาเลือกหรือกรอกชื่อสินค้าให้ครบ'); return; }
        if (items.some(i => !i.quantity || i.quantity <= 0)) { showError('กรุณากรอกจำนวนสินค้าให้ถูกต้อง'); return; }

        setIsSaving(true);
        try {
            // ตรวจสอบรายการที่พิมพ์เอง (ไม่ได้เลือกจาก Dropdown) และถาม Confirm
            const manualItems = items.filter(i => !i.item_id && i.item_name.trim());
            if (manualItems.length > 0) {
                const names = manualItems.map(i => `• ${i.item_name}`).join('\n');
                const addToSystem = await showConfirm(
                    `พบสินค้าที่ยังไม่มีในระบบ:\n${names}\n\nต้องการเพิ่มสินค้าเหล่านี้เข้าระบบด้วยหรือไม่?`
                );
                if (addToSystem) {
                    for (const manualItem of manualItems) {
                        try {
                            const newItem = await internalItemService.createItem({
                                name: manualItem.item_name,
                                unit: manualItem.unit || 'ชิ้น',
                                unit_price: 0,
                                current_stock: 0,
                                min_stock: 0,
                                status: 'active',
                                category_id: null
                            });
                            // อัปเดต item_id ในรายการ
                            const idx = items.findIndex(i => i.id === manualItem.id);
                            if (idx !== -1 && newItem?.id) {
                                items[idx].item_id = newItem.id;
                            }
                        } catch (err) {
                            console.error('Error auto-creating item:', err);
                        }
                    }
                }
            }

            const requisitionData = { ...formData };
            const itemsData = items.map(i => ({
                item_id: i.item_id || null,
                item_name: i.item_name,
                quantity: parseInt(i.quantity) || 1,
                unit: i.unit,
                unit_price: parseFloat(i.unit_price) || 0,
                amount: parseFloat(i.amount) || 0
            }));

            if (isEdit) {
                await internalRequisitionService.updateRequisition(id, requisitionData, itemsData);
                showAlert('อัปเดตใบสั่งซื้อสำเร็จ');
            } else {
                await internalRequisitionService.createRequisition(requisitionData, itemsData);
                showAlert('สร้างใบสั่งซื้อสำเร็จ');
            }
            navigate('/dashboard/internal-items?tab=history');
        } catch (err) {
            showError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    const statusOptions = [
        { value: 'Draft', label: 'แบบร่าง (Draft)' },
        { value: 'Approved', label: 'อนุมัติ (Approved)' },
        { value: 'Completed', label: 'เสร็จสมบูรณ์ (Completed)' },
        { value: 'Cancelled', label: 'ยกเลิก (Cancelled)' }
    ];

    return (
        <div style={{ padding: '0 0 2rem 0' }}>
            <FormPageHeader
                title={isEdit ? 'แก้ไขใบสั่งซื้อ' : 'สร้างใบสั่งซื้อใหม่'}
                backUrl="/dashboard/internal-requisitions"
                onSave={handleSubmit}
                isSaving={isSaving}
                saveText="บันทึกใบสั่งซื้อ"
                showStatus={true}
                status={formData.status}
                onStatusChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                statusOptions={statusOptions}
            />

            <form onSubmit={handleSubmit}>

                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลขที่เอกสาร</label>
                            <input type="text" value={formData.requisition_number} readOnly className="glass-input" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-muted)', border: '1px solid var(--border-color)', opacity: 0.8 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>วันที่เอกสาร *</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="glass-input" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้ขอเบิก / สั่งซื้อ *</label>
                            <input type="text" name="requested_by" value={formData.requested_by} onChange={handleChange} required placeholder="ระบุชื่อผู้ขอเบิก" className="glass-input" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้อนุมัติ (ถ้ามี)</label>
                            <input type="text" name="approved_by" value={formData.approved_by} onChange={handleChange} placeholder="ระบุชื่อผู้อนุมัติ" className="glass-input" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ประเภทเอกสาร</label>
                            <div className="glass-input" style={{ width: '100%', padding: '0.7rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.1)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                <ShoppingCart size={14} style={{ marginRight: '0.5rem' }} /> สั่งซื้อ (Purchase)
                            </div>
                        </div>
                    </div>
                </div>


                <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>รายการสินค้า</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '50px', textAlign: 'center' }}>#</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>รายละเอียดสินค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '150px', textAlign: 'right' }}>จำนวน</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '120px', textAlign: 'center' }}>หน่วย</th>
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <select value={item.item_id || ''} onChange={e => handleItemSelect(index, e.target.value)} className="glass-panel" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'var(--card-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                                                <option value="">-- เลือกสินค้า --</option>
                                                {allItems.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.category?.name || '-'})</option>
                                                ))}
                                            </select>
                                            <input type="text" value={item.item_name} onChange={e => handleItemChange(index, 'item_name', e.target.value)} placeholder="หรือพิมพ์ชื่อสินค้าเอง..." className="glass-input" style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'transparent', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.8rem', borderStyle: 'dashed' }} />
                                            {item.item_name && !item.item_id && (
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-[#f59e0b]">
                                                    <PackagePlus size={10} /> สินค้าใหม่ — จะถูกเพิ่มเข้าระบบอัตโนมัติเมื่อบันทึก
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="glass-input" style={{ width: '100%', padding: '0.6rem', textAlign: 'right', background: 'var(--card-hover)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <input type="text" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="glass-input" style={{ width: '100%', padding: '0.6rem', textAlign: 'center', background: 'var(--card-hover)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem' }}><Trash2 size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Remark */}
                    <div style={{ padding: '1.5rem' }}>
                        <label className="block text-sm text-textMuted mb-1">หมายเหตุ</label>
                        <textarea name="remark" value={formData.remark} onChange={handleChange} rows="3" className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain resize-none" placeholder="หมายเหตุเพิ่มเติม..." />
                    </div>
                </div>


            </form>
        </div>
    );
};

export default InternalRequisitionFormPage;
