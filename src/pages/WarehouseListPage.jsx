import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Package, Settings, Edit2, Trash2, Plus, MapPin, Phone, User, Save, X, Eye, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { warehouseService } from '../services/warehouseService';
import { supplierPoService } from '../services/supplierPoService';
import { settingService } from '../services/settingService';
import { supabase } from '../services/supabaseClient';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';

const WarehouseListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [warehouses, setWarehouses] = useState([]);
    const [activeWarehouseId, setActiveWarehouseId] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Inventory view states
    const [searchTerm, setSearchTerm] = useState('');
    const [defaultDistributionWarehouseId, setDefaultDistributionWarehouseId] = useState(null);
    const [customerProductsMap, setCustomerProductsMap] = useState({});

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isCustomType, setIsCustomType] = useState(false);
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
            const [data, defaultDistId] = await Promise.all([
                warehouseService.getWarehouses(),
                settingService.getSetting('default_distribution_warehouse_id')
            ]);

            setWarehouses(data || []);
            setDefaultDistributionWarehouseId(defaultDistId);

            if (data && data.length > 0 && !activeWarehouseId) {
                // Set default warehouse as active first, otherwise first one
                const defaultWh = data.find(w => w.is_default) || data[0];
                setActiveWarehouseId(defaultWh.id);
            }

            // Pre-fetch customer products for the map just in case we need it
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
                const finalMap = {};
                Object.keys(cmap).forEach(k => {
                    finalMap[k] = Array.from(cmap[k]);
                });
                setCustomerProductsMap(finalMap);
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
            const isStandard = item.product_type === 'material' || item.product_type === 'finished_good';
            setIsCustomType(!isStandard);
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
            setIsCustomType(false);
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
            showError(error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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
    const isDefaultDistribution = (activeWarehouseId === defaultDistributionWarehouseId);

    // Calculate inventory stats for the active warehouse
    const totalMaterials = inventory.filter(i => i.product_type === 'material').length;
    const totalFinishedGoods = inventory.filter(i => i.product_type === 'finished_good').length;
    const lowStockItemsCount = inventory.filter(i => i.quantity < 0 || (i.min_stock > 0 && i.quantity <= i.min_stock)).length;
    const totalQuantity = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    // Filter inventory by search only (removed tab filter)
    const filteredInventory = inventory.filter(i => {
        const matchSearch = i.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchSearch;
    });

    const exportToExcel = async () => {
        try {
            const dataToExport = filteredInventory.map(item => {
                const coming = pendingItems
                    .filter(p => p.description === item.product_name)
                    .reduce((sum, p) => sum + (Number(p.quantity) - Number(p.received_quantity || 0)), 0);
                
                let customers = '-';
                const key = item.sku ? item.sku : item.product_name;
                const custArr = customerProductsMap[key];
                if (custArr && custArr.length > 0) {
                    customers = custArr.join(', ');
                }

                let status = 'ปกติ';
                if (item.quantity < 0 || (item.min_stock > 0 && item.quantity <= item.min_stock)) {
                    status = 'ของใกล้หมด';
                }

                let productType = item.product_type;
                if (productType === 'material') productType = 'วัตถุดิบ';
                if (productType === 'finished_good') productType = 'สินค้าสำเร็จรูป';

                const row = {
                    'ชื่อรายการ': item.product_name,
                    'ประเภท': productType,
                    'รหัสสินค้า': item.sku || '-',
                    'จำนวนคงเหลือ': Number(item.quantity),
                    'กำลังมาเพิ่ม': coming > 0 ? coming : 0,
                    'หน่วย': item.unit || '-',
                    'ลูกค้า': customers,
                    'สถานะ': status
                };
                
                return row;
            });

            const headers = ['ชื่อรายการ', 'ประเภท', 'รหัสสินค้า', 'จำนวนคงเหลือ', 'กำลังมาเพิ่ม', 'หน่วย', 'ลูกค้า', 'สถานะ'];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
            XLSX.writeFile(wb, `Inventory_Export_${activeWarehouse?.name || 'Warehouse'}.xlsx`);
        } catch (error) {
            console.error('Error exporting data:', error);
            showError('เกิดข้อผิดพลาดในการ Export ข้อมูล');
        }
    };

    if (isLoading && warehouses.length === 0) {
        return <div className="loading-spinner my-12 mx-auto"></div>;
    }

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title="คลังสินค้า"
                subtitle="จัดการคลังสินค้าและสต็อกสินค้าทั้งหมด"
            >
                {hasPermission('settings', 'view') && (
                    <button
                        onClick={() => navigate('/dashboard/settings')}
                        className="btn btn-primary px-5 py-2.5 flex items-center gap-2"
                    >
                        <Settings size={20} /> ตั้งค่าคลังสินค้า
                    </button>
                )}
            </PageHeader>

            {/* Warehouse Tabs */}
            <div className="mb-6">
                {warehouses.filter(w => w.type !== 'supplier').length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-textMuted mb-2 px-1">คลังภายใน (Internal)</h3>
                        <div className="overflow-x-auto flex gap-2 pb-2">
                            {warehouses.filter(w => w.type !== 'supplier').map(wh => (
                                <button
                                    key={wh.id}
                                    onClick={() => setActiveWarehouseId(wh.id)}
                                    className="px-6 py-3 rounded-lg cursor-pointer font-medium whitespace-nowrap flex items-center gap-2" style={{ background: activeWarehouseId === wh.id ? 'var(--primary)' : 'var(--card-bg)', color: activeWarehouseId === wh.id ? 'white' : 'var(--text-main)', border: activeWarehouseId === wh.id ? 'none' : '1px solid var(--border-color)', transition: 'all 0.2s', boxShadow: activeWarehouseId === wh.id ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none' }}
                                >
                                    <Building2 size={18} />
                                    {wh.code ? `[${wh.code}] ` : ''}{wh.name}
                                    {wh.is_default && <span className="rounded-xl" style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.5rem' }}>Default</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {warehouses.filter(w => w.type === 'supplier').length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-textMuted mb-2 px-1">คลังภายนอก / ซัพพลายเออร์ (External)</h3>
                        <div className="overflow-x-auto flex gap-2 pb-2 border-b border-border">
                            {warehouses.filter(w => w.type === 'supplier').map(wh => (
                                <button
                                    key={wh.id}
                                    onClick={() => setActiveWarehouseId(wh.id)}
                                    className="px-6 py-3 rounded-lg cursor-pointer font-medium whitespace-nowrap flex items-center gap-2" style={{ background: activeWarehouseId === wh.id ? '#f59e0b' : 'var(--card-bg)', color: activeWarehouseId === wh.id ? 'white' : 'var(--text-main)', border: activeWarehouseId === wh.id ? 'none' : '1px solid var(--border-color)', transition: 'all 0.2s', boxShadow: activeWarehouseId === wh.id ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none' }}
                                >
                                    <Building2 size={18} />
                                    {wh.code ? `[${wh.code}] ` : ''}{wh.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Warehouse Content */}
            {activeWarehouse && (
                <>
                    {/* Active Warehouse Info */}
                    <div className="glass-panel p-6 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        <div className="min-w-[250px]" style={{ flex: '1' }}>
                            <div className="mb-4 flex gap-2">
                                <span className="text-white rounded-xl whitespace-nowrap inline-block" style={{ fontSize: '0.75rem', background: activeWarehouse.type === 'supplier' ? '#f59e0b' : '#10b981', padding: '0.3rem 0.8rem' }}>
                                    {activeWarehouse.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                                </span>
                                {activeWarehouse.code && <span className="text-sm text-textMuted" style={{ alignSelf: 'center' }}>รหัส: {activeWarehouse.code}</span>}
                            </div>
                            {activeWarehouse.address && (
                                <div className="text-main mb-2 flex gap-2" style={{ alignItems: 'flex-start' }}>
                                    <MapPin size={18} className="text-textMuted" style={{ marginTop: '2px' }} />
                                    <span>{activeWarehouse.address}</span>
                                </div>
                            )}
                        </div>
                        <div className="min-w-[250px]" style={{ flex: '1' }}>
                            {activeWarehouse.contact_person && (
                                <div className="text-main mb-2 flex gap-2" style={{ alignItems: 'center' }}>
                                    <User size={18} className="text-textMuted" />
                                    <span>ผู้ติดต่อ: {activeWarehouse.contact_person}</span>
                                </div>
                            )}
                            {activeWarehouse.phone && (
                                <div className="text-main flex gap-2" style={{ alignItems: 'center' }}>
                                    <Phone size={18} className="text-textMuted" />
                                    <span>เบอร์โทร: {activeWarehouse.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards for Active Warehouse */}
                    <div className="grid-mobile-stack mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="glass-panel bg-white flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div className="rounded-xl text-blue-500" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem' }}>
                                <Package size={22} />
                            </div>
                            <div>
                                <div className="text-sm text-textMuted" style={{ marginBottom: '0.2rem' }}>วัตถุดิบทั้งหมด</div>
                                <div className="text-2xl text-blue-500" style={{ fontWeight: '800', lineHeight: 1 }}>{totalMaterials.toLocaleString()} <span className="text-xs text-textMuted" style={{ fontWeight: 'normal' }}>รายการ</span></div>
                            </div>
                        </div>

                        <div className="glass-panel bg-white flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div className="rounded-xl text-emerald-500" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem' }}>
                                <Package size={22} />
                            </div>
                            <div>
                                <div className="text-sm text-textMuted" style={{ marginBottom: '0.2rem' }}>สินค้าสำเร็จรูป</div>
                                <div className="text-2xl text-emerald-500" style={{ fontWeight: '800', lineHeight: 1 }}>{totalFinishedGoods.toLocaleString()} <span className="text-xs text-textMuted" style={{ fontWeight: 'normal' }}>รายการ</span></div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${lowStockItemsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.1)'}`, background: lowStockItemsCount > 0 ? 'rgba(239, 68, 68, 0.02)' : 'white' }}>
                            <div className="rounded-xl" style={{ background: lowStockItemsCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', color: lowStockItemsCount > 0 ? '#ef4444' : '#f59e0b' }}>
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <div className="text-sm text-textMuted" style={{ marginBottom: '0.2rem' }}>สินค้าใกล้หมด</div>
                                <div className="text-2xl" style={{ fontWeight: '800', color: lowStockItemsCount > 0 ? '#ef4444' : '#f59e0b', lineHeight: 1 }}>{lowStockItemsCount.toLocaleString()} <span className="text-xs text-textMuted" style={{ fontWeight: 'normal' }}>รายการ</span></div>
                            </div>
                        </div>

                        <div className="glass-panel bg-white flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
                            <div className="rounded-xl text-violet-500" style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem' }}>
                                <Building2 size={22} />
                            </div>
                            <div>
                                <div className="text-sm text-textMuted" style={{ marginBottom: '0.2rem' }}>จำนวนสินค้าคงคลังรวม</div>
                                <div className="text-2xl text-violet-500" style={{ fontWeight: '800', lineHeight: 1 }}>{totalQuantity.toLocaleString()} <span className="text-xs text-textMuted" style={{ fontWeight: 'normal' }}>หน่วย</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-4 mb-6 border border-border flex items-center gap-4" style={{ background: 'var(--card-bg)' }}>
                        <Search size={20} className="text-textMuted" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อรายการ, รหัสสินค้า..."
                            className="bg-transparent border-none text-main text-base w-full outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Inventory Section */}
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center" style={{ background: 'rgba(0, 0, 0, 0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                            <div className="text-primary font-semibold flex items-center gap-2">
                                <Package size={20} /> รายการสินค้าในคลัง
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportToExcel}
                                    className="glass-panel px-4 py-2.5 flex items-center gap-2 bg-success/5 border border-success/10 text-success cursor-pointer rounded-lg font-medium text-sm"
                                    title="Export to Excel"
                                >
                                    <FileSpreadsheet size={16} /> Export Excel
                                </button>
                                {hasPermission('warehouses', 'create') && (
                                    <button
                                        onClick={() => handleOpenModal()}
                                        className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={16} /> เพิ่มรายการใหม่
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="table-responsive-wrapper overflow-x-auto">
                            <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr className="border-b border-border text-left bg-main">
                                        <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                        <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '30%' }}>ชื่อรายการ</th>
                                        <th className="px-6 py-4 text-textMuted font-medium">ประเภท</th>
                                        <th className="px-6 py-4 text-textMuted font-medium">รหัสสินค้า</th>
                                        <th className="px-6 py-4 text-textMuted font-medium text-right">จำนวนคงเหลือ</th>
                                        <th className="px-6 py-4 text-violet-500 font-semibold text-right">กำลังมาเพิ่ม</th>
                                        <th className="px-6 py-4 text-textMuted font-medium">หน่วย</th>
                                        <th className="px-6 py-4 font-semibold text-textMuted text-center">ลูกค้า</th>
                                        <th className="px-6 py-4 text-textMuted font-medium text-center">สถานะ</th>
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
                                                <td className="px-6 py-4">
                                                    <div
                                                        onClick={() => navigate(`/dashboard/inventory/${item.id}`)}
                                                        className="font-semibold text-blue-500 cursor-pointer underline"
                                                        title="คลิกเพื่อดูรายละเอียด"
                                                    >
                                                        {item.product_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.product_type === 'material' ? (
                                                        <span className="text-primary rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.6rem' }}>วัตถุดิบ</span>
                                                    ) : item.product_type === 'finished_good' ? (
                                                        <span className="text-emerald-500 rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem' }}>สินค้าสำเร็จรูป</span>
                                                    ) : (
                                                        <span className="text-orange-500 rounded-xl inline-block whitespace-nowrap" style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.6rem' }}>{item.product_type}</span>
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
                                                <td className="text-center px-6 py-4">
                                                    {(() => {
                                                        const key = item.sku ? item.sku : item.product_name;
                                                        const customers = customerProductsMap[key];
                                                        if (!customers || customers.length === 0) return <span className="text-textMuted">-</span>;
                                                        return (
                                                            <div className="flex flex-wrap gap-1 justify-center">
                                                                {customers.map((c, i) => (
                                                                    <span key={i} className="text-xs bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
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
                                            <td colSpan="9" className="p-12 text-center text-textMuted">
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
                                        required={!isCustomType}
                                        value={isCustomType ? '__custom__' : formData.product_type}
                                        onChange={(e) => {
                                            if (e.target.value === '__custom__') {
                                                setIsCustomType(true);
                                                setFormData({ ...formData, product_type: '' });
                                            } else {
                                                setIsCustomType(false);
                                                setFormData({ ...formData, product_type: e.target.value });
                                            }
                                        }}
                                        className={`glass-input w-full p-3 rounded-lg ${isCustomType ? 'mb-2' : ''}`}
                                    >
                                        <option value="material">วัตถุดิบ (Material)</option>
                                        <option value="finished_good">สินค้าสำเร็จรูป (FG)</option>
                                        {Array.from(new Set(inventory.map(i => i.product_type))).filter(t => t !== 'material' && t !== 'finished_good').map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                        <option value="__custom__">+ เพิ่มประเภทใหม่...</option>
                                    </select>
                                    
                                    {isCustomType && (
                                        <input 
                                            type="text"
                                            required
                                            value={formData.product_type}
                                            onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                                            placeholder="พิมพ์ประเภทรายการที่ต้องการ"
                                            className="glass-input w-full p-3 rounded-lg"
                                            autoFocus
                                        />
                                    )}
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
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>รหัสสินค้า</label>
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
                                        <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>จำนวนต่ำสุดที่ควรมี (เตือนเมื่อของใกล้หมด)</label>
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
                )
            }
        </div >
    );
};

export default WarehouseListPage;
