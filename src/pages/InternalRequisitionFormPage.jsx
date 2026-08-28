import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShoppingCart, PackagePlus, Save } from 'lucide-react';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { internalItemService } from '../services/internalItemService';
import { useDialog } from '../contexts/DialogContext';
import { userService } from '../services/userService';
import FormPageHeader from '../components/FormPageHeader';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
const InternalRequisitionFormPage = () => {
    const { user } = useAuth();
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
                const currentUser = user;
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
        if (field === 'quantity' || field === 'unit_price') {
            item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        }
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

            const currentUser = user;
            const userName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const requisitionData = {
                ...formData,
                created_by: isEdit ? undefined : userName,
                updated_by: userName
            };
            const itemsData = items.map(i => ({
                item_id: i.item_id || null,
                item_name: i.item_name,
                quantity: parseInt(i.quantity) || 1,
                unit: i.unit,
                unit_price: parseFloat(i.unit_price) || 0,
                amount: parseFloat(i.amount) || 0
            }));

            requisitionData.total_amount = itemsData.reduce((sum, i) => sum + i.amount, 0);

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

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;

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

                <div className="glass-panel p-8 mb-6">
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลขที่เอกสาร</label>
                            <input type="text" value={formData.requisition_number} readOnly className="glass-input w-full rounded-lg text-textMuted border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)', opacity: 0.8 }} />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันที่เอกสาร *</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }} />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้ขอเบิก / สั่งซื้อ *</label>
                            <input type="text" name="requested_by" value={formData.requested_by} onChange={handleChange} required placeholder="ระบุชื่อผู้ขอเบิก" className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }} />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้อนุมัติ (ถ้ามี)</label>
                            <input type="text" name="approved_by" value={formData.approved_by} onChange={handleChange} placeholder="ระบุชื่อผู้อนุมัติ" className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }} />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ประเภทเอกสาร</label>
                            <div className="glass-input w-full rounded-lg text-blue-500 font-semibold" style={{ padding: '0.7rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center' }}>
                                <ShoppingCart size={14} style={{ marginRight: '0.5rem' }} /> สั่งซื้อ (Purchase)
                            </div>
                        </div>
                    </div>
                </div>


                <div className="glass-panel mb-6 overflow-hidden" style={{ padding: '0' }}>
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                        <h3 className="m-0 text-lg text-primary">รายการสินค้า</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-primary cursor-pointer text-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="text-textMuted font-medium text-center" style={{ padding: '1rem 1.5rem', width: '50px' }}>#</th>
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem' }}>รายละเอียดสินค้า</th>
                                    <th className="text-textMuted font-medium text-right" style={{ padding: '1rem 1.5rem', width: '120px' }}>จำนวน</th>
                                    <th className="text-textMuted font-medium text-center" style={{ padding: '1rem 1.5rem', width: '100px' }}>หน่วย</th>
                                    <th className="text-textMuted font-medium text-right" style={{ padding: '1rem 1.5rem', width: '120px' }}>ราคา/หน่วย</th>
                                    <th className="text-textMuted font-medium text-right" style={{ padding: '1rem 1.5rem', width: '120px' }}>ยอดรวม</th>
                                    <th className="p-4" style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="text-center text-textMuted" style={{ padding: '1rem 1.5rem' }}>{index + 1}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div className="mb-2">
                                                <SearchableSelect
                                                    options={allItems.map(i => ({
                                                        value: i.id,
                                                        label: i.name,
                                                        subLabel: i.category?.name || '-'
                                                    }))}
                                                    value={item.item_id || ''}
                                                    onChange={(val) => handleItemSelect(index, val || '')}
                                                    placeholder="-- เลือกสินค้า --"
                                                />
                                            </div>
                                            <input type="text" value={item.item_name} onChange={e => handleItemChange(index, 'item_name', e.target.value)} placeholder="หรือพิมพ์ชื่อสินค้าเอง..." className="glass-input w-full bg-transparent text-main border border-border text-xs" style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', borderStyle: 'dashed' }} />
                                            {item.item_name && !item.item_id && (
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-[#f59e0b]">
                                                    <PackagePlus size={10} /> สินค้าใหม่ — จะถูกเพิ่มเข้าระบบอัตโนมัติเมื่อบันทึก
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="glass-input w-full text-right text-main border border-border" style={{ padding: '0.6rem', background: 'var(--card-hover)', borderRadius: '6px' }} />
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <input type="text" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="glass-input w-full text-center text-main border border-border" style={{ padding: '0.6rem', background: 'var(--card-hover)', borderRadius: '6px' }} />
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <input type="number" min="0" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} className="glass-input w-full text-right text-main border border-border" style={{ padding: '0.6rem', background: 'var(--card-hover)', borderRadius: '6px' }} />
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }} className="text-right font-medium text-primary">
                                            ฿{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="bg-transparent border-none text-red-500 cursor-pointer" style={{ padding: '0.5rem' }}><Trash2 size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-white/5 border-t border-border">
                                    <td colSpan="5" className="text-right font-bold text-textMuted" style={{ padding: '1rem 1.5rem' }}>มูลค่ารวมทั้งสิ้น</td>
                                    <td className="text-right font-bold text-primary" style={{ padding: '1rem 1.5rem' }}>
                                        ฿{items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="p-6">
                        <label className="block text-sm text-textMuted mb-1">หมายเหตุ</label>
                        <textarea name="remark" value={formData.remark} onChange={handleChange} rows="3" className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain resize-none" placeholder="หมายเหตุเพิ่มเติม..." />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/internal-items?tab=history')}
                            className="glass-panel border border-border bg-transparent text-main rounded-lg cursor-pointer" style={{ padding: '0.8rem 1.5rem' }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="border-none text-white rounded-lg font-medium flex items-center gap-2" style={{ padding: '0.8rem 1.5rem', background: isSaving ? '#9ca3af' : '#3b82f6', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งซื้อ'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default InternalRequisitionFormPage;
