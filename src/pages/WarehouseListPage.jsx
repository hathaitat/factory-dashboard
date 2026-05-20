import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Package, Settings, Edit2, Trash2, Plus, MapPin, Phone, User, Save, X, Eye } from 'lucide-react';
import { warehouseService } from '../services/warehouseService';
import { supplierPoService } from '../services/supplierPoService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';

const WarehouseListPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [warehouses, setWarehouses] = useState([]);
    const [activeWarehouseId, setActiveWarehouseId] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Inventory view states
    const [activeTab, setActiveTab] = useState('material'); // material | finished_good
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        product_type: 'material',
        product_name: '',
        sku: '',
        quantity: 0,
        unit: 'PCS',
        min_stock: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadWarehouses();
        loadPendingItems();
    }, []);

    const loadPendingItems = async () => {
        try {
            const items = await supplierPoService.getPendingItems();
            setPendingItems(items || []);
        } catch (error) {
            console.error('Error loading pending items:', error);
        }
    };

    useEffect(() => {
        if (activeWarehouseId) {
            loadInventory(activeWarehouseId);
        }
    }, [activeWarehouseId]);

    const loadWarehouses = async () => {
        setIsLoading(true);
        try {
            const data = await warehouseService.getWarehouses();
            setWarehouses(data || []);
            if (data && data.length > 0 && !activeWarehouseId) {
                // Set default warehouse as active first, otherwise first one
                const defaultWh = data.find(w => w.is_default) || data[0];
                setActiveWarehouseId(defaultWh.id);
            }
        } catch (error) {
            console.error('Error loading warehouses:', error);
            showError('ไม่สามารถโหลดข้อมูลคลังสินค้าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const loadInventory = async (warehouseId) => {
        try {
            const invData = await warehouseService.getInventoryByWarehouse(warehouseId);
            setInventory(invData || []);
        } catch (error) {
            console.error('Error loading inventory:', error);
            showError('ไม่สามารถโหลดข้อมูลสินค้าในคลังได้');
        }
    };

    // --- Modal Logic ---
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
                product_type: activeTab,
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
            const payload = { ...formData, warehouse_id: activeWarehouseId };
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


    const activeWarehouse = warehouses.find(w => w.id === activeWarehouseId);

    // Filter inventory by search only (removed tab filter)
    const filteredInventory = inventory.filter(i => {
        const matchSearch = i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchSearch;
    });

    if (isLoading && warehouses.length === 0) {
        return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    }

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title="คลังสินค้า (Warehouses)"
                subtitle="จัดการคลังสินค้าและสต็อกสินค้าทั้งหมด"
            >
                {hasPermission('settings', 'view') && (
                    <button
                        onClick={() => navigate('/dashboard/settings')}
                        style={{
                            padding: '0.6rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#3b82f6',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <Settings size={20} /> ตั้งค่าคลังสินค้า
                    </button>
                )}
            </PageHeader>

            {/* Warehouse Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                {warehouses.map(wh => (
                    <button
                        key={wh.id}
                        onClick={() => setActiveWarehouseId(wh.id)}
                        style={{
                            padding: '0.8rem 1.5rem',
                            background: activeWarehouseId === wh.id ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeWarehouseId === wh.id ? 'white' : 'var(--text-main)',
                            border: activeWarehouseId === wh.id ? 'none' : '1px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                            boxShadow: activeWarehouseId === wh.id ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                        }}
                    >
                        <Building2 size={18} />
                        {wh.code ? `[${wh.code}] ` : ''}{wh.name}
                        {wh.is_default && <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>Default</span>}
                    </button>
                ))}
            </div>

            {/* Active Warehouse Content */}
            {activeWarehouse && (
                <>
                    {/* Active Warehouse Info */}
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', background: activeWarehouse.type === 'supplier' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '12px' }}>
                                    {activeWarehouse.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                                </span>
                                {activeWarehouse.code && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>รหัส: {activeWarehouse.code}</span>}
                            </div>
                            {activeWarehouse.address && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    <MapPin size={18} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                                    <span>{activeWarehouse.address}</span>
                                </div>
                            )}
                        </div>
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            {activeWarehouse.contact_person && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    <User size={18} className="text-textMuted" />
                                    <span>ผู้ติดต่อ: {activeWarehouse.contact_person}</span>
                                </div>
                            )}
                            {activeWarehouse.phone && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-main)' }}>
                                    <Phone size={18} className="text-textMuted" />
                                    <span>เบอร์โทร: {activeWarehouse.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                        <Search size={20} className="text-textMuted" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อรายการ, SKU..."
                            style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1rem', width: '100%', outline: 'none' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Inventory Section */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600' }}>
                                <Package size={20} /> รายการสินค้าในคลัง
                            </div>
                            {hasPermission('warehouses', 'create') && (
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="btn-primary"
                                    style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Plus size={16} /> เพิ่มรายการใหม่
                                </button>
                            )}
                        </div>

                        <div className="table-responsive-wrapper overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-main)' }}>
                                        <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '30%' }}>ชื่อรายการ</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ประเภท</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>SKU</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนคงเหลือ</th>
                                        <th style={{ padding: '1rem 1.5rem', color: '#8b5cf6', fontWeight: '600', textAlign: 'right' }}>กำลังมาเพิ่ม</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>หน่วย</th>
                                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map((item) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontWeight: '500' }}>{item.product_name}</td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    {item.product_type === 'material' ? (
                                                        <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>วัตถุดิบ</span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>สินค้าสำเร็จรูป</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{item.sku || '-'}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 'bold', color: item.quantity <= item.min_stock ? '#ef4444' : 'var(--text-main)' }}>
                                                    {Number(item.quantity).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '600', color: '#8b5cf6' }}>
                                                    {(() => {
                                                        const coming = pendingItems
                                                            .filter(p => p.description === item.product_name)
                                                            .reduce((sum, p) => sum + (Number(p.quantity) - Number(p.received_quantity || 0)), 0);
                                                        return coming > 0 ? `+${coming.toLocaleString()}` : '-';
                                                    })()}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{item.unit}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                    {item.quantity <= item.min_stock ? (
                                                        <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>ของใกล้หมด</span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>ปกติ</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                ไม่มีรายการในหมวดหมู่นี้
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )
            }

            {/* Modal Form */}
            {
                showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)' }}>
                                    {editingItem ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการใหม่'}
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="form-group mb-4">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ประเภทรายการ *</label>
                                    <select
                                        required
                                        value={formData.product_type}
                                        onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    >
                                        <option value="material">วัตถุดิบ (Material)</option>
                                        <option value="finished_good">สินค้าสำเร็จรูป (FG)</option>
                                    </select>
                                </div>

                                <div className="form-group mb-4">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ชื่อรายการ *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.product_name}
                                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                        className="glass-input"
                                        placeholder="เช่น เหล็กแผ่น, สกรู..."
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>

                                <div className="form-group mb-4">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>รหัส SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>จำนวนคงเหลือ *</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>หน่วยนับ *</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="glass-input"
                                            placeholder="เช่น PCS, KG..."
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>จำนวนขั้นต่ำ (เตือนเมื่อของใกล้หมด)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.min_stock}
                                            onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                                            className="glass-input"
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: '500' }}>
                                        ยกเลิก
                                    </button>
                                    <button type="submit" disabled={isSaving} className="btn-primary" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default WarehouseListPage;
