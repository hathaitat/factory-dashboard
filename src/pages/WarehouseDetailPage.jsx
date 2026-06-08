import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Package, MapPin, Phone, User, Save, X, Eye } from 'lucide-react';
import { warehouseService } from '../services/warehouseService';
import { supplierPoService } from '../services/supplierPoService';
import { settingService } from '../services/settingService';
import { supabase } from '../services/supabaseClient';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';

const WarehouseDetailPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [warehouse, setWarehouse] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDefaultDistribution, setIsDefaultDistribution] = useState(false);
    const [customerProductsMap, setCustomerProductsMap] = useState({});

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        product_type: 'material', // material | finished_good
        product_name: '',
        sku: '',
        quantity: 0,
        unit: 'PCS',
        min_stock: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [whData, invData, pendingData, defaultDistId] = await Promise.all([
                warehouseService.getWarehouseById(id),
                warehouseService.getInventoryByWarehouse(id),
                supplierPoService.getPendingItems(),
                settingService.getSetting('default_distribution_warehouse_id')
            ]);
            setWarehouse(whData);
            setInventory(invData || []);
            setPendingItems(pendingData || []);

            const isDist = (defaultDistId === id);
            setIsDefaultDistribution(isDist);

            // If it's the distribution warehouse, fetch customer products to map owners
            if (isDist) {
                const { data: custProducts } = await supabase
                    .from('customer_products')
                    .select('sku, name, customer:customers(name)');

                if (custProducts) {
                    const cmap = {};
                    custProducts.forEach(cp => {
                        const key = cp.sku ? cp.sku : cp.name;
                        if (!cmap[key]) cmap[key] = new Set();
                        if (cp.customer && cp.customer.name) {
                            cmap[key].add(cp.customer.name);
                        }
                    });

                    // Convert sets to arrays
                    const finalMap = {};
                    Object.keys(cmap).forEach(k => {
                        finalMap[k] = Array.from(cmap[k]);
                    });
                    setCustomerProductsMap(finalMap);
                }
            }

        } catch (error) {
            console.error('Error loading warehouse data:', error);
            showError('ไม่สามารถโหลดข้อมูลคลังสินค้าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                product_type: item.product_type,
                product_name: item.product_name,
                sku: item.sku || '',
                quantity: item.quantity,
                unit: item.unit || 'PCS',
                min_stock: item.min_stock || 0
            });
        } else {
            setEditingItem(null);
            setFormData({
                product_type: 'material',
                product_name: '',
                sku: '',
                quantity: 0,
                unit: 'PCS',
                min_stock: 0
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...formData, warehouse_id: id };
            if (editingItem) {
                const updated = await warehouseService.updateInventoryItem(editingItem.id, payload);
                setInventory(inventory.map(i => i.id === updated.id ? updated : i));
                showAlert('อัปเดตข้อมูลสินค้าสำเร็จ');
            } else {
                const added = await warehouseService.addInventoryItem(payload);
                setInventory([added, ...inventory]);
                showAlert('เพิ่มสินค้าในคลังสำเร็จ');
            }
            setShowModal(false);
        } catch (error) {
            console.error('Error saving item:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (itemId) => {
        const confirmed = await showConfirm('ยืนยันการลบสินค้านี้ออกจากคลัง?');
        if (!confirmed) return;
        try {
            await warehouseService.deleteInventoryItem(itemId);
            setInventory(inventory.filter(i => i.id !== itemId));
        } catch (error) {
            console.error('Error deleting item:', error);
            showError('ไม่สามารถลบรายการนี้ได้');
        }
    };

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;
    if (!warehouse) return <div className="p-8 text-center">ไม่พบข้อมูลคลังสินค้า</div>;

    const filteredInventory = inventory.filter(i =>
        i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title={`คลังสินค้า: ${warehouse.code ? `[${warehouse.code}] ` : ''}${warehouse.name}`}
                subtitle={`รหัสคลัง: ${warehouse.code || '-'}`}
                onBack={() => navigate('/dashboard/warehouses')}
            />

            {/* Info Card */}
            <div className="glass-panel p-6 mb-8" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div className="min-w-[250px]" style={{ flex: '1' }}>
                    <div className="mb-4 flex gap-2">
                        {warehouse.is_default && (
                            <span className="text-white rounded-xl" style={{ fontSize: '0.75rem', background: '#3b82f6', padding: '0.3rem 0.8rem' }}>คลังหลัก (Default)</span>
                        )}
                        <span className="text-white rounded-xl" style={{ fontSize: '0.75rem', background: warehouse.type === 'supplier' ? '#f59e0b' : '#10b981', padding: '0.3rem 0.8rem' }}>
                            {warehouse.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                        </span>
                    </div>
                    {warehouse.address && (
                        <div className="text-main mb-2 flex gap-2" style={{ alignItems: 'flex-start' }}>
                            <MapPin size={18} className="text-textMuted" style={{ marginTop: '2px' }} />
                            <span>{warehouse.address}</span>
                        </div>
                    )}
                </div>
                <div className="min-w-[250px]" style={{ flex: '1' }}>
                    {warehouse.contact_person && (
                        <div className="text-main mb-2 flex gap-2" style={{ alignItems: 'center' }}>
                            <User size={18} className="text-textMuted" />
                            <span>ผู้ติดต่อ: {warehouse.contact_person}</span>
                        </div>
                    )}
                    {warehouse.phone && (
                        <div className="text-main flex gap-2" style={{ alignItems: 'center' }}>
                            <Phone size={18} className="text-textMuted" />
                            <span>เบอร์โทร: {warehouse.phone}</span>
                        </div>
                    )}
                </div>
                <div className="min-w-[250px] text-sm text-textMuted" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {warehouse.created_at && (
                        <div>สร้างเมื่อ: {new Date(warehouse.created_at).toLocaleDateString('th-TH')}</div>
                    )}
                    {warehouse.created_by_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{warehouse.created_by_name}</span>
                        </div>
                    )}
                    {warehouse.updated_at && (
                        <div>อัปเดตล่าสุด: {new Date(warehouse.updated_at).toLocaleDateString('th-TH')}</div>
                    )}
                    {warehouse.updated_by && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{warehouse.updated_by}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory Section */}
            <div className="glass-panel p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center" style={{ background: 'rgba(0, 0, 0, 0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex gap-4" style={{ flex: 1, minWidth: '300px' }}>
                        <div className="relative" style={{ flex: 1, maxWidth: '400px' }}>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-main text-main outline-none"
                            />
                        </div>
                    </div>
                    {hasPermission('warehouses', 'create') && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="btn-primary px-4 py-2.5 flex items-center gap-2"
                        >
                            <Plus size={16} /> เพิ่มรายการใหม่
                        </button>
                    )}
                </div>

                <div className="table-responsive-wrapper overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                        <thead>
                            <tr className="border-b border-border text-left bg-main">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '30%' }}>ชื่อรายการ</th>
                                <th className="px-6 py-4 text-textMuted font-medium">ประเภท</th>
                                <th className="px-6 py-4 text-textMuted font-medium">SKU</th>
                                <th className="px-6 py-4 text-textMuted font-medium text-right">จำนวนคงเหลือ</th>
                                <th className="px-6 py-4 text-violet-500 font-semibold text-right">กำลังมาเพิ่ม</th>
                                <th className="px-6 py-4 font-semibold text-textMuted">หน่วย</th>
                                {isDefaultDistribution && (
                                    <th className="px-6 py-4 font-semibold text-textMuted">ลูกค้า</th>
                                )}
                                <th className="px-6 py-4 font-semibold text-textMuted text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map((item) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <button
                                                    onClick={() => navigate(`/dashboard/inventory/${item.id}`)}
                                                    className="action-view"
                                                    title="ดูประวัติการเข้า-ออก"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {hasPermission('warehouses', 'edit') && (
                                                    <button onClick={() => handleOpenModal(item)} className="action-edit" title="แก้ไข">
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('warehouses', 'delete') && (
                                                    <button onClick={() => handleDelete(item.id)} className="action-delete" title="ลบ">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-main font-medium">{item.product_name}</td>
                                        <td className="px-6 py-4">
                                            {item.product_type === 'material' ? (
                                                <span className="text-primary rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem' }}>วัตถุดิบ</span>
                                            ) : (
                                                <span className="text-emerald-500 rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem' }}>สินค้าสำเร็จรูป</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-textMuted">{item.sku || '-'}</td>
                                        <td className="px-6 py-4 text-right" style={{ fontWeight: 'bold', color: (item.quantity < 0 || (item.min_stock > 0 && item.quantity <= item.min_stock)) ? '#ef4444' : 'var(--text-main)' }}>
                                            {Number(item.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-violet-500">
                                            {(() => {
                                                const coming = pendingItems
                                                    .filter(p => p.description === item.product_name)
                                                    .reduce((sum, p) => sum + (Number(p.quantity) - Number(p.received_quantity || 0)), 0);
                                                return coming > 0 ? `+${coming.toLocaleString()}` : '-';
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-textMuted">{item.unit}</td>
                                        {isDefaultDistribution && (
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const key = item.sku ? item.sku : item.product_name;
                                                    const customers = customerProductsMap[key];
                                                    if (!customers || customers.length === 0) return <span className="text-textMuted">-</span>;
                                                    return (
                                                        <div className="flex flex-wrap gap-1">
                                                            {customers.map((c, i) => (
                                                                <span key={i} className="text-xs bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                                                                    {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            {(item.quantity < 0 || (item.min_stock > 0 && item.quantity <= item.min_stock)) ? (
                                                <span className="text-red-500 rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: '#fee2e2', padding: '0.2rem 0.6rem' }}>ของใกล้หมด</span>
                                            ) : (
                                                <span className="text-emerald-500 rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: '#d1fae5', padding: '0.2rem 0.6rem' }}>ปกติ</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isDefaultDistribution ? "9" : "8"} className="p-12 text-center text-textMuted">
                                        ไม่มีรายการในคลังนี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content glass-panel p-8" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="m-0 text-xl text-primary">
                                {editingItem ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการใหม่'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="bg-transparent border-none cursor-pointer text-textMuted">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="form-group mb-4">
                                <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ประเภทรายการ *</label>
                                <select
                                    required
                                    value={formData.product_type}
                                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                                    className="glass-input w-full p-3 rounded-lg"
                                >
                                    <option value="material">วัตถุดิบ (Material)</option>
                                    <option value="finished_good">สินค้าสำเร็จรูป (FG)</option>
                                </select>
                            </div>

                            <div className="form-group mb-4">
                                <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ชื่อรายการ *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.product_name}
                                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                    placeholder="เช่น เหล็กแผ่น, สกรู..."
                                    className="glass-input w-full p-3 rounded-lg"
                                />
                            </div>

                            <div className="form-group mb-4">
                                <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>รหัส SKU</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="glass-input w-full p-3 rounded-lg"
                                />
                            </div>

                            <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>จำนวนคงเหลือ *</label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>หน่วยนับ *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="เช่น PCS, KG..."
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>จำนวนขั้นต่ำ (เตือนเมื่อของใกล้หมด)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.min_stock}
                                        onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-lg text-red-500 cursor-pointer font-medium" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isSaving} className="btn-primary px-6 py-3 flex items-center gap-2">
                                    <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseDetailPage;
