import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, ShoppingCart, PackageMinus } from 'lucide-react';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { internalItemService } from '../services/internalItemService';
import { useDialog } from '../contexts/DialogContext';
import { userService } from '../services/userService';

const InternalRequisitionFormPage = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();

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
    useEffect(() => { calculateTotal(); }, [items]);

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

    const handleTypeChange = async (type) => {
        const reqNum = await internalRequisitionService.generateRequisitionNumber(type);
        setFormData(prev => ({ ...prev, type, requisition_number: reqNum }));
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
            const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
            const price = parseFloat(field === 'unit_price' ? value : item.unit_price) || 0;
            item.amount = qty * price;
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

    const calculateTotal = () => {
        const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        setFormData(prev => ({ ...prev, total_amount: total }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.requested_by.trim()) { showError('กรุณากรอกชื่อผู้ขอเบิก'); return; }
        if (items.some(i => !i.item_name.trim())) { showError('กรุณาเลือกหรือกรอกชื่อสินค้าให้ครบ'); return; }

        setIsSaving(true);
        try {
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
                showAlert('อัปเดตใบเบิกสำเร็จ');
            } else {
                await internalRequisitionService.createRequisition(requisitionData, itemsData);
                showAlert('สร้างใบเบิกสำเร็จ');
            }
            navigate('/dashboard/internal-requisitions');
        } catch (err) {
            showError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/dashboard/internal-requisitions')} className="p-2 rounded-lg bg-transparent border border-border cursor-pointer text-textMuted hover:text-textMain hover:border-primary transition-all"><ArrowLeft size={20} /></button>
                <div>
                    <h2 className="text-xl font-bold text-textMain m-0">{isEdit ? 'แก้ไขใบเบิก/สั่งซื้อ' : 'สร้างใบเบิก/สั่งซื้อใหม่'}</h2>
                    <p className="text-sm text-textMuted m-0 mt-0.5">เลขที่: {formData.requisition_number || 'กำลังสร้าง...'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Type Selection */}
                <div className="glass-panel p-5 mb-5">
                    <label className="block text-sm text-textMuted mb-3 font-medium">ประเภท *</label>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => handleTypeChange('purchase')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer font-medium transition-all ${formData.type === 'purchase' ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]' : 'border-border bg-transparent text-textMuted hover:border-[#3b82f6]/50'}`}>
                            <ShoppingCart size={20} /> สั่งซื้อ (Purchase)
                        </button>
                        <button type="button" onClick={() => handleTypeChange('withdraw')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer font-medium transition-all ${formData.type === 'withdraw' ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]' : 'border-border bg-transparent text-textMuted hover:border-[#f59e0b]/50'}`}>
                            <PackageMinus size={20} /> เบิก (Withdraw)
                        </button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="glass-panel p-5 mb-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-textMuted mb-1">เลขที่</label>
                            <input type="text" value={formData.requisition_number} readOnly className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMuted" />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">วันที่ *</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} required className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">สถานะ</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                                <option value="Draft">Draft</option>
                                <option value="Approved">Approved</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">ผู้ขอเบิก *</label>
                            <input type="text" name="requested_by" value={formData.requested_by} onChange={handleChange} required className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">ผู้อนุมัติ</label>
                            <input type="text" name="approved_by" value={formData.approved_by} onChange={handleChange} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="glass-panel mb-5" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="flex justify-between items-center px-5 py-3 border-b border-border">
                        <h3 className="text-base font-semibold text-primary m-0">รายการสินค้า</h3>
                        <button type="button" onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] cursor-pointer hover:bg-[#3b82f6]/20"><Plus size={14} /> เพิ่ม</button>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-textMuted font-medium text-center w-[50px]">#</th>
                                    <th className="px-4 py-3 text-textMuted font-medium text-left">สินค้า</th>
                                    <th className="px-4 py-3 text-textMuted font-medium text-right w-[100px]">จำนวน</th>
                                    <th className="px-4 py-3 text-textMuted font-medium text-center w-[80px]">หน่วย</th>
                                    <th className="px-4 py-3 text-textMuted font-medium text-right w-[120px]">ราคา/หน่วย</th>
                                    <th className="px-4 py-3 text-textMuted font-medium text-right w-[120px]">รวม</th>
                                    <th className="px-4 py-3 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="px-4 py-3 text-center text-textMuted">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <select value={item.item_id || ''} onChange={e => handleItemSelect(index, e.target.value)} className="glass-input w-full px-2 py-1.5 rounded border border-border bg-main text-textMain text-sm mb-1">
                                                <option value="">-- เลือกสินค้า --</option>
                                                {allItems.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.category?.name || '-'}) — สต๊อก: {i.current_stock}</option>
                                                ))}
                                            </select>
                                            <input type="text" value={item.item_name} onChange={e => handleItemChange(index, 'item_name', e.target.value)} placeholder="หรือพิมพ์ชื่อสินค้าเอง..." className="glass-input w-full px-2 py-1 rounded border border-dashed border-border bg-transparent text-textMain text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="glass-input w-full px-2 py-1.5 rounded border border-border bg-main text-textMain text-right" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="glass-input w-full px-2 py-1.5 rounded border border-border bg-main text-textMain text-center text-sm" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} className="glass-input w-full px-2 py-1.5 rounded border border-border bg-main text-textMain text-right" />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-textMain">
                                            ฿{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="p-1 rounded bg-transparent border-none cursor-pointer text-[#ef4444] hover:bg-[#ef4444]/10"><Trash2 size={14} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total & Remark */}
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem' }}>
                        <div>
                            <label className="block text-sm text-textMuted mb-1">หมายเหตุ</label>
                            <textarea name="remark" value={formData.remark} onChange={handleChange} rows="3" className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain resize-none" placeholder="หมายเหตุเพิ่มเติม..." />
                        </div>
                        <div className="glass-panel p-4">
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-textMuted">จำนวนรายการ</span>
                                <span className="text-textMain font-medium">{items.length} รายการ</span>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                                <span className="text-lg font-semibold text-primary">ยอดรวมทั้งหมด</span>
                                <span className="text-2xl font-bold text-[#10b981]">฿{formData.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/dashboard/internal-requisitions')} className="px-5 py-2.5 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer hover:bg-white/5 font-medium">ยกเลิก</button>
                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white border-none cursor-pointer font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InternalRequisitionFormPage;
