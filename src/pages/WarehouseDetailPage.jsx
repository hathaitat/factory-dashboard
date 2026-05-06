import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Package, MapPin, Phone, User, Save, X } from 'lucide-react';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';

const WarehouseDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [warehouse, setWarehouse] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            const [whData, invData] = await Promise.all([
                warehouseService.getWarehouseById(id),
                warehouseService.getInventoryByWarehouse(id)
            ]);
            setWarehouse(whData);
            setInventory(invData || []);
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

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!warehouse) return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูลคลังสินค้า</div>;

    const filteredInventory = inventory.filter(i => 
        i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title={`คลังสินค้า: ${warehouse.name}`}
                subtitle={`รหัสคลัง: ${warehouse.code || '-'}`}
                onBack={() => navigate('/dashboard/warehouses')}
            />

            {/* Info Card */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div style={{ flex: '1', minWidth: '250px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        {warehouse.is_default && (
                            <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '12px' }}>คลังหลัก (Default)</span>
                        )}
                        <span style={{ fontSize: '0.75rem', background: warehouse.type === 'supplier' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '12px' }}>
                            {warehouse.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                        </span>
                    </div>
                    {warehouse.address && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                            <MapPin size={18} style={{ color: 'var(--text-muted)', marginTop: '2px' }}/> 
                            <span>{warehouse.address}</span>
                        </div>
                    )}
                </div>
                <div style={{ flex: '1', minWidth: '250px' }}>
                    {warehouse.contact_person && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                            <User size={18} style={{ color: 'var(--text-muted)' }}/> 
                            <span>ผู้ติดต่อ: {warehouse.contact_person}</span>
                        </div>
                    )}
                    {warehouse.phone && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-main)' }}>
                            <Phone size={18} style={{ color: 'var(--text-muted)' }}/> 
                            <span>เบอร์โทร: {warehouse.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory Section */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <input 
                                type="text"
                                placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        </div>
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

                <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-main)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '30%' }}>ชื่อรายการ</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ประเภท</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>SKU</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนคงเหลือ</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>หน่วย</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                                <th style={{ padding: '1rem 1.5rem', width: '100px', textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{item.unit}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            {item.quantity <= item.min_stock ? (
                                                <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>ของใกล้หมด</span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>ปกติ</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                {hasPermission('warehouses', 'edit') && (
                                                    <button onClick={() => handleOpenModal(item)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.2rem' }}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('warehouses', 'delete') && (
                                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        ไม่มีรายการในหมวดหมู่นี้
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
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
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

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
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

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
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
            )}
        </div>
    );
};

export default WarehouseDetailPage;
