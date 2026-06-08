import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Paperclip, Wrench, Sparkles, ShieldCheck, X, Save, Filter, History, Eye, User } from 'lucide-react';
import { internalItemService } from '../services/internalItemService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useAuth } from '../contexts/AuthContext';

const ICON_MAP = { Paperclip, Wrench, Package, Sparkles, ShieldCheck };

const InternalItemListPage = () => {
    const { user } = useAuth();
    const { showAlert, showError, showConfirm } = useDialog();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [showItemModal, setShowItemModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [itemForm, setItemForm] = useState({ name: '', description: '', category_id: '', unit: 'ชิ้น', unit_price: 0, current_stock: 0, min_stock: 0, status: 'active' });
    const [catForm, setCatForm] = useState({ name: '', icon: 'Package', color: '#6366f1' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [itemsData, catsData] = await Promise.all([
                internalItemService.getItems(),
                internalItemService.getCategories()
            ]);
            setItems(itemsData);
            setCategories(catsData);
        } catch (err) {
            showError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = items.filter(item => {
        if (filterStatus && item.status !== filterStatus) return false;
        if (filterCategory && item.category_id !== filterCategory) return false;
        if (search) {
            const s = search.toLowerCase();
            return item.name?.toLowerCase().includes(s) || item.description?.toLowerCase().includes(s);
        }
        return true;
    });

    const lowStockCount = items.filter(i => i.status === 'active' && (i.current_stock < 0 || (i.min_stock > 0 && i.current_stock <= i.min_stock))).length;
    const totalValue = items.filter(i => i.status === 'active').reduce((sum, i) => sum + (i.current_stock * i.unit_price), 0);

    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginatedData, totalItems, totalPages, startItem, endItem } = usePagination(filtered, 50);

    // Item CRUD
    const openItemModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setItemForm({ name: item.name, description: item.description || '', category_id: item.category_id || '', unit: item.unit || 'ชิ้น', unit_price: item.unit_price || 0, current_stock: item.current_stock || 0, min_stock: item.min_stock || 0, status: item.status || 'active' });
        } else {
            setEditingItem(null);
            setItemForm({ name: '', description: '', category_id: categories[0]?.id || '', unit: 'ชิ้น', unit_price: 0, current_stock: 0, min_stock: 0, status: 'active' });
        }
        setShowItemModal(true);
    };

    const saveItem = async () => {
        if (!itemForm.name.trim()) { showError('กรุณากรอกชื่อสินค้า'); return; }
        setIsSaving(true);
        try {
            const currentUser = user;
            const userName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const payload = { ...itemForm };

            if (editingItem) {
                payload.updated_by = userName;
                await internalItemService.updateItem(editingItem.id, payload);
                showAlert('อัปเดตสินค้าสำเร็จ');
            } else {
                payload.created_by = userName;
                payload.updated_by = userName;
                await internalItemService.createItem(payload);
                showAlert('เพิ่มสินค้าสำเร็จ');
            }
            setShowItemModal(false);
            loadData();
        } catch (err) {
            showError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteItem = async (item) => {
        const ok = await showConfirm(`ต้องการลบ "${item.name}" ใช่หรือไม่?`);
        if (!ok) return;
        try {
            await internalItemService.deleteItem(item.id);
            showAlert('ลบสินค้าสำเร็จ');
            loadData();
        } catch (err) {
            showError(err.message || 'ไม่สามารถลบได้');
        }
    };

    // Category CRUD
    const openCatModal = (cat = null) => {
        setEditingCat(cat);
        setCatForm(cat ? { name: cat.name, icon: cat.icon || 'Package', color: cat.color || '#6366f1' } : { name: '', icon: 'Package', color: '#6366f1' });
        setShowCatModal(true);
    };

    const saveCat = async () => {
        if (!catForm.name.trim()) { showError('กรุณากรอกชื่อหมวดหมู่'); return; }
        setIsSaving(true);
        try {
            if (editingCat) {
                await internalItemService.updateCategory(editingCat.id, catForm);
                showAlert('อัปเดตหมวดหมู่สำเร็จ');
            } else {
                await internalItemService.createCategory(catForm);
                showAlert('เพิ่มหมวดหมู่สำเร็จ');
            }
            setShowCatModal(false);
            loadData();
        } catch (err) {
            showError(err.message || 'เกิดข้อผิดพลาด');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteCat = async (cat) => {
        const ok = await showConfirm(`ต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`);
        if (!ok) return;
        try {
            await internalItemService.deleteCategory(cat.id);
            showAlert('ลบหมวดหมู่สำเร็จ');
            loadData();
        } catch (err) {
            showError(err.message || 'ไม่สามารถลบได้');
        }
    };

    const getCatIcon = (iconName) => {
        const IconComp = ICON_MAP[iconName] || Package;
        return IconComp;
    };





    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div>
            <PageHeader title="ของใช้ในโรงงาน" subtitle="จัดการสินค้า อุปกรณ์ และประวัติการเบิก/สั่งซื้อ" icon={<Package size={28} />} />

            {/* รายการสินค้า */}
            <div className="mt-2">
                {/* KPI Cards */}
                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                        <div className="text-textMuted text-sm">สินค้าทั้งหมด</div>
                        <div className="text-2xl font-bold text-primary mt-1">{items.filter(i => i.status === 'active').length}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                        <div className="text-textMuted text-sm">หมวดหมู่</div>
                        <div className="text-2xl font-bold text-[#8b5cf6] mt-1">{categories.length}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center', border: lowStockCount > 0 ? '1px solid #ef4444' : undefined }}>
                        <div className="text-textMuted text-sm flex items-center justify-center gap-1">{lowStockCount > 0 && <AlertTriangle size={14} className="text-[#ef4444]" />} สินค้าใกล้หมด</div>
                        <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-[#ef4444]' : 'text-textMain'}`}>{lowStockCount}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                        <div className="text-textMuted text-sm">มูลค่าสต๊อกรวม</div>
                        <div className="text-2xl font-bold text-[#10b981] mt-1">฿{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>

                {/* Category Chips */}
                <div className="glass-panel" style={{ padding: '1rem 1.2rem', marginBottom: '1rem' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-textMuted text-sm mr-1"><Filter size={14} className="inline" /> หมวดหมู่:</span>
                        <button onClick={() => setFilterCategory('')} className={`px-3 py-1 rounded-full text-sm border cursor-pointer transition-all ${!filterCategory ? 'bg-primary text-white border-primary' : 'bg-transparent text-textMuted border-border hover:border-primary'}`}>ทั้งหมด</button>
                        {categories.map(cat => {
                            const Icon = getCatIcon(cat.icon);
                            return (
                                <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-3 py-1 rounded-full text-sm border cursor-pointer transition-all flex items-center gap-1 ${filterCategory === cat.id ? 'text-white' : 'bg-transparent text-textMuted border-border hover:border-primary'}`} style={filterCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}>
                                    <Icon size={12} /> {cat.name}
                                </button>
                            );
                        })}
                        {hasPermission('internal_items', 'create') && (
                            <button onClick={() => openCatModal()} className="px-2 py-1 rounded-full text-xs border border-dashed border-border text-textMuted cursor-pointer hover:border-primary hover:text-primary bg-transparent flex items-center gap-1"><Plus size={12} /> จัดการหมวดหมู่</button>
                        )}
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="glass-panel" style={{ padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1" style={{ minWidth: '200px' }}>
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                            <input type="text" placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} className="glass-input w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                        </div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                            <option value="">ทุกสถานะ</option>
                            <option value="active">ใช้งาน</option>
                            <option value="inactive">ไม่ใช้งาน</option>
                        </select>
                        {hasPermission('internal_items', 'create') && (
                            <button onClick={() => openItemModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-medium text-sm hover:opacity-90 transition-opacity">
                                <Plus size={16} /> เพิ่มสินค้า
                            </button>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-6 py-4 text-center text-textMuted font-medium w-[120px] actions-column">จัดการ</th>
                                    <th className="px-6 py-4 text-left text-textMuted font-medium">สินค้า</th>
                                    <th className="px-6 py-4 text-left text-textMuted font-medium">หมวดหมู่</th>
                                    <th className="px-6 py-4 text-right text-textMuted font-medium">สต๊อก</th>
                                    <th className="px-6 py-4 text-right text-textMuted font-medium">ขั้นต่ำ</th>
                                    <th className="px-6 py-4 text-right text-textMuted font-medium">ราคา/หน่วย</th>
                                    <th className="px-6 py-4 text-center text-textMuted font-medium">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="px-6 py-12 text-center text-textMuted">
                                        <Package size={40} className="mx-auto mb-2 opacity-30" />
                                        <div>ไม่พบรายการสินค้า</div>
                                    </td></tr>
                                ) : paginatedData.map(item => {
                                    const isLow = item.status === 'active' && (item.current_stock < 0 || (item.min_stock > 0 && item.current_stock <= item.min_stock));
                                    const cat = categories.find(c => c.id === item.category_id);
                                    const CatIcon = cat ? getCatIcon(cat.icon) : Package;
                                    return (
                                        <tr key={item.id} className="border-b border-border hover:bg-white/5 transition-colors">
                                            <td className="actions-column">
                                                <div className="table-actions">
                                                    {hasPermission('internal_items', 'view') && (
                                                        <button onClick={() => navigate(`/dashboard/internal-items/${item.id}/history`)} className="action-view" title="ดูประวัติ"><Eye size={16} /></button>
                                                    )}
                                                    {hasPermission('internal_items', 'edit') && (
                                                        <button onClick={() => openItemModal(item)} className="action-edit" title="แก้ไข"><Edit2 size={16} /></button>
                                                    )}
                                                    {hasPermission('internal_items', 'delete') && (
                                                        <button onClick={() => deleteItem(item)} className="action-delete" title="ลบ"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-textMain">{item.name}</div>
                                                {item.description && <div className="text-sm text-textMuted mt-0.5">{item.description}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {cat ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: cat.color }}>
                                                        <CatIcon size={10} /> {cat.name}
                                                    </span>
                                                ) : <span className="text-textMuted text-sm">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-semibold ${isLow ? 'text-[#ef4444]' : 'text-textMain'}`}>
                                                    {isLow && <AlertTriangle size={14} className="inline mr-1" />}
                                                    {item.current_stock.toLocaleString()} {item.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-textMuted">{item.min_stock.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-textMain">฿{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === 'active' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#6b7280]/10 text-[#6b7280]'}`}>
                                                    {item.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        totalPages={totalPages}
                        startItem={startItem}
                        endItem={endItem}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                </div>

                {/* Item Modal */}
                {showItemModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="glass-panel w-full max-w-lg mx-4 p-6 rounded-xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-textMain">{editingItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
                                <button onClick={() => setShowItemModal(false)} className="p-1 rounded bg-transparent border-none cursor-pointer text-textMuted hover:text-textMain"><X size={20} /></button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">ชื่อสินค้า *</label>
                                    <input type="text" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" placeholder="เช่น กระดาษ A4" />
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">รายละเอียด</label>
                                    <textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" rows="2" placeholder="รายละเอียดเพิ่มเติม..." />
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">หมวดหมู่</label>
                                    <select value={itemForm.category_id} onChange={e => setItemForm(p => ({ ...p, category_id: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                                        <option value="">-- เลือกหมวดหมู่ --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-textMuted mb-1">หน่วย</label>
                                        <input type="text" value={itemForm.unit} onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-textMuted mb-1">ราคา/หน่วย (฿)</label>
                                        <input type="number" min="0" step="0.01" value={itemForm.unit_price} onChange={e => setItemForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain text-right" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm text-textMuted mb-1">สต๊อกปัจจุบัน</label>
                                        <input type="number" min="0" value={itemForm.current_stock} onChange={e => setItemForm(p => ({ ...p, current_stock: parseInt(e.target.value) || 0 }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain text-right" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-textMuted mb-1">จำนวนขั้นต่ำ</label>
                                        <input type="number" min="0" value={itemForm.min_stock} onChange={e => setItemForm(p => ({ ...p, min_stock: parseInt(e.target.value) || 0 }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain text-right" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">สถานะ</label>
                                    <select value={itemForm.status} onChange={e => setItemForm(p => ({ ...p, status: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                                        <option value="active">ใช้งาน</option>
                                        <option value="inactive">ไม่ใช้งาน</option>
                                    </select>
                                </div>
                                {editingItem && (
                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {editingItem.created_at && (
                                            <div>สร้างเมื่อ: {new Date(editingItem.created_at).toLocaleDateString('th-TH')}</div>
                                        )}
                                        {editingItem.created_by && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{editingItem.created_by}</span>
                                            </div>
                                        )}
                                        {editingItem.updated_at && (
                                            <div>อัปเดตล่าสุด: {new Date(editingItem.updated_at).toLocaleDateString('th-TH')}</div>
                                        )}
                                        {editingItem.updated_by && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{editingItem.updated_by}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer hover:bg-white/5">ยกเลิก</button>
                                <button onClick={saveItem} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-medium disabled:opacity-50">
                                    <Save size={16} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Modal */}
                {showCatModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="glass-panel w-full max-w-md mx-4 p-6 rounded-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-textMain">{editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h3>
                                <button onClick={() => setShowCatModal(false)} className="p-1 rounded bg-transparent border-none cursor-pointer text-textMuted hover:text-textMain"><X size={20} /></button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">ชื่อหมวดหมู่ *</label>
                                    <input type="text" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-lg border border-border bg-main text-textMain" />
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">สี</label>
                                    <input type="color" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} className="w-full h-10 rounded-lg border border-border cursor-pointer" />
                                </div>
                            </div>
                            {/* Existing categories list */}
                            {categories.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <div className="text-sm text-textMuted mb-2">หมวดหมู่ที่มีอยู่:</div>
                                    <div className="flex flex-col gap-1">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5">
                                                <span className="flex items-center gap-2 text-sm text-textMain">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                                                    {cat.name}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {hasPermission('internal_items', 'edit') && (
                                                        <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, icon: cat.icon, color: cat.color }); }} className="p-1 rounded bg-transparent border-none cursor-pointer text-[#3b82f6] text-xs hover:bg-[#3b82f6]/10"><Edit2 size={12} /></button>
                                                    )}
                                                    {hasPermission('internal_items', 'delete') && (
                                                        <button onClick={() => deleteCat(cat)} className="p-1 rounded bg-transparent border-none cursor-pointer text-[#ef4444] text-xs hover:bg-[#ef4444]/10"><Trash2 size={12} /></button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={() => setShowCatModal(false)} className="px-4 py-2 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer hover:bg-white/5">ปิด</button>
                                <button onClick={saveCat} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-medium disabled:opacity-50">
                                    <Save size={16} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalItemListPage;
