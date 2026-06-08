import { useState, useEffect } from 'react';
import { Save, Clock, Settings, Briefcase, FileText, Plus, X, Building2, MapPin, Phone, User, Edit2, Trash2, Package, CheckCircle } from 'lucide-react';
import { settingService } from '../services/settingService';
import { supplierCategoryService } from '../services/supplierCategoryService';
import { warehouseService } from '../services/warehouseService';
import { supplierService } from '../services/supplierService';
import { userService } from '../services/userService';
import { documentNumberHelper } from '../utils/documentNumbering';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
    const { user } = useAuth();
    const { showConfirm, showAlert, showError, showToast } = useDialog();
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showWarehouseModal, setShowWarehouseModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [warehouseFormData, setWarehouseFormData] = useState({
        name: '', code: '', type: 'custom', supplier_id: '', address: '', contact_person: '', phone: '', notes: ''
    });
    const [workSchedule, setWorkSchedule] = useState({
        start_time: '08:00',
        end_time: '17:00',
        late_threshold: 0,
        late_penalty_mins: 0
    });
    const [documentFormats, setDocumentFormats] = useState({
        invoice_format: 'IV{YY}{MM}{RUN}',
        billing_note_format: 'BN{YY}{MM}{RUN}',
        receipt_format: 'RE{YY}{MM}{RUN}'
    });
    const [defaultDistributionWarehouseId, setDefaultDistributionWarehouseId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Delete Warehouse states
    const [showDeleteWarehouseModal, setShowDeleteWarehouseModal] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState(null);
    const [transferTargetWarehouseId, setTransferTargetWarehouseId] = useState('');

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [showSyncModal, setShowSyncModal] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const [schedule, formats, defaultDistWarehouseId, cats, whs, supps] = await Promise.all([
                settingService.getSetting('work_schedule'),
                settingService.getSetting('document_formats'),
                settingService.getSetting('default_distribution_warehouse_id'),
                supplierCategoryService.getCategories(),
                warehouseService.getWarehouses(),
                supplierService.getSuppliers()
            ]);

            if (schedule) {
                setWorkSchedule({
                    start_time: schedule.start_time || '08:00',
                    end_time: schedule.end_time || '17:00',
                    late_threshold: schedule.late_threshold || 0,
                    late_penalty_mins: schedule.late_penalty_mins || 0
                });
            }

            if (formats) {
                setDocumentFormats({
                    invoice_format: formats.invoice_format || 'IV{YY}{MM}{RUN}',
                    billing_note_format: formats.billing_note_format || 'BN{YY}{MM}{RUN}',
                    receipt_format: formats.receipt_format || 'RE{YY}{MM}{RUN}'
                });
            }

            if (defaultDistWarehouseId) {
                setDefaultDistributionWarehouseId(defaultDistWarehouseId);
            }

            setCategories(cats || []);
            setWarehouses(whs || []);
            setSuppliers(supps || []);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCategory = async () => {
        const val = newCategory.trim();
        if (!val) return;

        // Local check for duplicates
        if (categories.some(c => c.name.toLowerCase() === val.toLowerCase())) {
            await showError('ประเภทนี้มีอยู่ในรายการแล้ว');
            return;
        }

        try {
            const added = await supplierCategoryService.createCategory(val);
            setCategories([...categories, added]);
            setNewCategory('');
        } catch (error) {
            console.error('Error adding category:', error);
            await showError('ไม่สามารถเพิ่มประเภทได้');
        }
    };

    const handleSyncCustomerProducts = async () => {
        if (!defaultDistributionWarehouseId) {
            await showAlert('กรุณาเลือกและบันทึก "คลังกระจายสินค้าหลัก" ก่อนทำการ Sync');
            return;
        }

        const confirmed = await showConfirm('ต้องการดึงข้อมูลสินค้าของลูกค้าทั้งหมดมาสร้างในคลังกระจายสินค้าหลัก (ถ้ายังไม่มี) หรือไม่?');
        if (!confirmed) return;

        setIsSyncing(true);
        try {
            const result = await warehouseService.syncCustomerProductsToWarehouse(defaultDistributionWarehouseId);
            setSyncResult(result);
            setShowSyncModal(true);
        } catch (error) {
            console.error('Error syncing products:', error);
            await showError('เกิดข้อผิดพลาดในการ Sync ข้อมูลสินค้า');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleEditCategory = (cat) => {
        // Implementation
    };

    const handleDeleteCategory = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบประเภทนี้? (ผู้ขายที่เคยใช้ประเภทนี้จะยังคงอยู่จนกว่าจะมีการแก้ไขข้อมูลผู้ขาย)');
        if (!confirmed) return;
        try {
            await supplierCategoryService.deleteCategory(id);
            setCategories(categories.filter(c => c.id !== id));
            showToast('ลบประเภทผู้ขายเรียบร้อย', 'success', 'ประเภทผู้ขาย');
        } catch (error) {
            console.error('Error deleting category:', error);
            await showError('ไม่สามารถลบประเภทนี้ได้ เนื่องจากมีการใช้งานอยู่หรือเกิดข้อผิดพลาด');
        }
    };

    // --- Warehouse Management ---
    const handleOpenWarehouseModal = (wh = null) => {
        if (wh) {
            setEditingWarehouse(wh);
            setWarehouseFormData({
                name: wh.name || '',
                code: wh.code || '',
                type: wh.type || 'custom',
                supplier_id: wh.supplier_id || '',
                address: wh.address || '',
                contact_person: wh.contact_person || '',
                phone: wh.phone || '',
                notes: wh.notes || ''
            });
        } else {
            setEditingWarehouse(null);
            setWarehouseFormData({
                name: '', code: '', type: 'custom', supplier_id: '', address: '', contact_person: '', phone: '', notes: ''
            });
        }
        setShowWarehouseModal(true);
    };

    const handleSupplierSelectForWarehouse = (supplierId) => {
        const supplier = suppliers.find(s => s.id.toString() === supplierId.toString());
        if (supplier) {
            setWarehouseFormData(prev => ({
                ...prev,
                supplier_id: supplier.id,
                name: `คลัง ${supplier.name}`,
                address: supplier.address || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || ''
            }));
        } else {
            setWarehouseFormData(prev => ({ ...prev, supplier_id: '' }));
        }
    };

    const handleSaveWarehouse = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...warehouseFormData };
            // Fix empty string to null for BIGINT column
            if (!payload.supplier_id) payload.supplier_id = null;
            if (!payload.code) payload.code = null;

            const currentUser = user;
            const userName = currentUser?.fullName || currentUser?.username || 'Unknown';

            if (editingWarehouse) {
                payload.updated_by = userName;
                const updated = await warehouseService.updateWarehouse(editingWarehouse.id, payload);
                setWarehouses(warehouses.map(w => w.id === updated.id ? updated : w));
            } else {
                payload.created_by_name = userName;
                payload.updated_by = userName;
                const added = await warehouseService.createWarehouse(payload);
                setWarehouses([added, ...warehouses]);
            }
            setShowWarehouseModal(false);
            showToast('บันทึกข้อมูลคลังสินค้าเรียบร้อย', 'success', 'คลังสินค้า');
        } catch (error) {
            console.error('Error saving warehouse:', error);
            await showError('เกิดข้อผิดพลาดในการบันทึกคลังสินค้า');
        }
    };

    const handleDeleteWarehouse = async (id) => {
        try {
            const inventory = await warehouseService.getInventoryByWarehouse(id);
            if (inventory && inventory.length > 0) {
                // If items exist, open the transfer target modal
                setWarehouseToDelete(id);
                setTransferTargetWarehouseId('');
                setShowDeleteWarehouseModal(true);
            } else {
                const confirmed = await showConfirm('ยืนยันการลบคลังสินค้านี้?');
                if (!confirmed) return;
                await warehouseService.deleteWarehouse(id);
                setWarehouses(warehouses.filter(w => w.id !== id));
                showToast('ลบคลังสินค้าเรียบร้อย', 'success', 'คลังสินค้า');
            }
        } catch (error) {
            console.error('Error checking warehouse inventory:', error);
            await showError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลสินค้าในคลัง');
        }
    };

    const confirmDeleteAndTransferWarehouse = async () => {
        if (!transferTargetWarehouseId || !warehouseToDelete) return;
        try {
            await warehouseService.deleteWarehouseAndTransfer(warehouseToDelete, transferTargetWarehouseId);
            setWarehouses(warehouses.filter(w => w.id !== warehouseToDelete));
            setShowDeleteWarehouseModal(false);
            setWarehouseToDelete(null);
            setTransferTargetWarehouseId('');
            showToast('ลบคลังสินค้าและโอนย้ายสินค้าเรียบร้อย', 'success', 'คลังสินค้า');
        } catch (error) {
            console.error('Error deleting and transferring warehouse:', error);
            await showError('เกิดข้อผิดพลาดในการโอนย้ายสินค้าและลบคลังสินค้า');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setWorkSchedule(prev => ({ ...prev, [name]: value }));
        setMessage(null);
    };

    const handleFormatChange = (e) => {
        const { name, value } = e.target;
        // Upper case and limit to 20 chars max for formats
        const upperValue = value.toUpperCase().slice(0, 20);
        setDocumentFormats(prev => ({ ...prev, [name]: upperValue }));
        setMessage(null);
    };

    const calculateDuration = () => {
        if (!workSchedule.start_time || !workSchedule.end_time) return '0 ชั่วโมง';

        const [startH, startM] = workSchedule.start_time.split(':').map(Number);
        const [endH, endM] = workSchedule.end_time.split(':').map(Number);

        let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight

        // Subtract 1 hour (60 minutes) for lunch break
        diffMinutes -= 60;
        if (diffMinutes < 0) diffMinutes = 0; // Ensure no negative duration

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `${hours} ชั่วโมง ${minutes > 0 ? `${minutes} นาที` : ''} (หักพักเที่ยง 1 ชม.)`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await Promise.all([
                settingService.saveSetting('work_schedule', workSchedule, 'Work Schedule Configuration'),
                settingService.saveSetting('document_formats', documentFormats, 'Document Number Formats'),
                settingService.saveSetting('default_distribution_warehouse_id', defaultDistributionWarehouseId, 'Default Distribution Warehouse')
            ]);
            showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success', 'ตั้งค่าระบบ');
        } catch (error) {
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error', 'ตั้งค่าระบบ');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-textMuted">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="px-4 pb-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader
                title="ตั้งค่าระบบ"
                subtitle="จัดการการตั้งค่าต่างๆ ของระบบ"
                helpContent={HELP_CONTENT.settings}
            >
                <button
                    type="submit"
                    form="settings-form"
                    disabled={isSaving}
                    className="rounded-lg border-none text-white font-medium flex items-center gap-2" style={{ padding: '0.6rem 1.5rem', background: isSaving ? '#4b5563' : '#8b5cf6', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
                >
                    <Save size={18} />
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </button>
            </PageHeader>

            <form id="settings-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Work Schedule Section */}
                <div className="glass-panel p-8">
                    <h3 className="mt-0 mb-6 text-violet-500 flex items-center gap-2">
                        <Briefcase size={20} /> เวลาทำงาน
                    </h3>

                    <div className="grid-mobile-stack mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเข้างาน <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                name="start_time"
                                value={workSchedule.start_time}
                                onChange={handleChange}
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเลิกงาน <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                name="end_time"
                                value={workSchedule.end_time}
                                onChange={handleChange}
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="font-medium" style={{ color: '#64748b' }}>รวมเวลาทำงานทั้งหมด:</span>
                        <span className="text-blue-500 font-bold text-lg">{calculateDuration()}</span>
                    </div>

                    <hr className="border-none" style={{ borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

                    <h3 className="mb-6 text-amber-500 flex items-center gap-2">
                        <Clock size={20} /> กฎการมาสาย (Late Penalty)
                    </h3>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                ห้ามสายเกิน (นาที) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="late_threshold"
                                value={workSchedule.late_threshold}
                                onChange={handleChange}
                                placeholder="เช่น 30"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายไม่เกินนี้ จะนับนาทีที่สายจริง</p>
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                บทลงโทษหากสายเกิน (นาที) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="late_penalty_mins"
                                value={workSchedule.late_penalty_mins}
                                onChange={handleChange}
                                placeholder="เช่น 60"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายเกินเกณฑ์ข้างต้น จะถูกปรับเป็นจำนวนนี้ทันที</p>
                        </div>
                    </div>
                </div>

                {/* Document Formats Section */}
                <div className="glass-panel p-8">
                    <h3 className="mt-0 mb-6 text-blue-500 flex items-center gap-2">
                        <FileText size={20} /> รูปแบบเลขที่เอกสาร
                    </h3>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group p-4 rounded-lg" style={{ gridColumn: '1 / -1', background: 'rgba(59, 130, 246, 0.05)' }}>
                            <h4 className="text-sm" style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8' }}>ตัวแปรที่ใช้ได้ (Variables)</h4>
                            <ul className="m-0 text-sm text-textMuted" style={{ paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                                <li><code>{`{YYYY}`}</code> - ปี ค.ศ. แบบ 4 หลัก เช่น 2026</li>
                                <li><code>{`{YY}`}</code> - ปี ค.ศ. แบบ 2 หลัก เช่น 26</li>
                                <li><code>{`{MM}`}</code> - เดือน แบบ 2 หลัก เช่น 02</li>
                                <li><code>{`{DD}`}</code> - วัน แบบ 2 หลัก เช่น 25</li>
                                <li><code>{`{RUN}`}</code> - เลขรันอัตโนมัติ (ต่อท้ายด้วยตัวเลขเพื่อระบุจำนวนหลักได้ เช่น <code>{`{RUN3}`}</code>, <code>{`{RUN5}`}</code> ค่าเริ่มต้นคือ 4 หลัก)</li>
                            </ul>
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                รูปแบบ ใบกำกับภาษี (Invoice)
                            </label>
                            <input
                                type="text"
                                name="invoice_format"
                                value={documentFormats.invoice_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น INV-{YYYY}-{MM}-{RUN}"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main" style={{ textTransform: 'uppercase' }}
                            />
                            <p className="text-xs text-emerald-500" style={{ margin: '0.4rem 0 0 0' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.invoice_format || 'IV{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                รูปแบบ ใบวางบิล (Billing Note)
                            </label>
                            <input
                                type="text"
                                name="billing_note_format"
                                value={documentFormats.billing_note_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น BN-{YYYY}-{MM}-{RUN}"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main" style={{ textTransform: 'uppercase' }}
                            />
                            <p className="text-xs text-emerald-500" style={{ margin: '0.4rem 0 0 0' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.billing_note_format || 'BN{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                                รูปแบบ ใบเสร็จรับเงิน (Receipt)
                            </label>
                            <input
                                type="text"
                                name="receipt_format"
                                value={documentFormats.receipt_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น RE-{YYYY}-{MM}-{RUN}"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main" style={{ textTransform: 'uppercase' }}
                            />
                            <p className="text-xs text-emerald-500" style={{ margin: '0.4rem 0 0 0' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.receipt_format || 'RE{YY}{MM}{RUN}')}</p>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ใบเสร็จจะดึงเลขรันชุดเดียวกับใบวางบิลมาแสดง</p>
                        </div>
                    </div>
                </div>

                {/* Auto Stock Deduction Section */}
                <div className="glass-panel p-8">
                    <h3 className="mt-0 mb-6 text-emerald-500 flex items-center gap-2">
                        <Package size={20} /> การตัดสต็อกอัตโนมัติ (Auto Stock Deduction)
                    </h3>

                    <div className="form-group" style={{ maxWidth: '400px' }}>
                        <label className="mb-2 text-textMuted" style={{ display: 'block' }}>
                            คลังกระจายสินค้าหลัก (Default Distribution Warehouse)
                        </label>
                        <select
                            value={defaultDistributionWarehouseId}
                            onChange={(e) => {
                                setDefaultDistributionWarehouseId(e.target.value);
                                setMessage(null);
                            }}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                        >
                            <option value="">-- เลือกคลังสินค้าหลัก --</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <p className="text-xs" style={{ margin: '0.4rem 0 0 0', color: '#64748b' }}>
                            ใบกำกับภาษี (Invoice) จะถูกตั้งค่าให้หักสต็อกจากคลังนี้โดยอัตโนมัติ
                        </p>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleSyncCustomerProducts}
                                disabled={isSyncing || !defaultDistributionWarehouseId}
                                className="btn-secondary px-4 py-2.5 flex items-center gap-2"
                            >
                                {isSyncing ? (
                                    <>กำลัง Sync...</>
                                ) : (
                                    <>🔄 ดึงสินค้าลูกค้าทั้งหมดเข้าคลังนี้</>
                                )}
                            </button>
                            <p className="text-textMuted" style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem' }}>
                                ตรวจสอบและสร้างสินค้าของลูกค้าทั้งหมดลงในคลังหลัก หากยังไม่มี
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warehouse Management Section */}
                <div className="glass-panel p-8 mb-8">
                    <div className="mb-6 flex justify-between items-center">
                        <h3 className="mt-0 text-primary flex items-center gap-2" style={{ marginBottom: 0 }}>
                            <Building2 size={20} /> จัดการคลังสินค้า (Warehouses)
                        </h3>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingWarehouse(null);
                                setWarehouseFormData({
                                    name: '', code: '', type: 'custom', supplier_id: '', address: '', contact_person: '', phone: '', notes: ''
                                });
                                setShowWarehouseModal(true);
                            }}
                            className="px-5 py-2.5 rounded-lg border-none text-white cursor-pointer font-medium flex items-center gap-2" style={{ background: 'var(--primary)' }}
                        >
                            <Plus size={18} /> เพิ่มคลังใหม่
                        </button>
                    </div>

                    <div className="table-responsive-wrapper overflow-x-auto mb-6">
                        <table className="w-full border-collapse" style={{ minWidth: '600px' }}>
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="p-4 text-textMuted font-medium">ชื่อคลัง</th>
                                    <th className="p-4 text-textMuted font-medium">ประเภท</th>
                                    <th className="p-4 text-textMuted font-medium">ผู้ติดต่อ</th>
                                    <th className="p-4 text-center text-textMuted font-medium" style={{ width: '100px' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.map((wh) => (
                                    <tr key={wh.id} className="border-b border-border">
                                        <td className="p-4 font-medium text-main">
                                            {wh.code ? `[${wh.code}] ` : ''}{wh.name} {wh.is_default && <span className="text-white rounded-xl" style={{ fontSize: '0.75rem', background: '#3b82f6', padding: '0.2rem 0.5rem', marginLeft: '0.5rem' }}>Default</span>}
                                            {wh.code && <div className="text-sm text-textMuted">รหัส: {wh.code}</div>}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-white rounded-xl" style={{ background: wh.type === 'supplier' ? '#f59e0b' : '#10b981', padding: '0.2rem 0.6rem' }}>
                                                {wh.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-textMuted">
                                            {wh.contact_person || '-'} <br />
                                            {wh.phone || ''}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                                                <button type="button" onClick={() => handleOpenWarehouseModal(wh)} className="bg-transparent border-none text-blue-500 cursor-pointer" style={{ padding: '0.3rem' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                {!wh.is_default && (
                                                    <button type="button" onClick={() => handleDeleteWarehouse(wh.id)} className="bg-transparent border-none text-red-500 cursor-pointer" style={{ padding: '0.3rem' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {warehouses.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-textMuted">
                                            ยังไม่มีข้อมูลคลังสินค้า
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier Categories Section */}
                <div className="glass-panel p-8">
                    <h3 className="mt-0 mb-6 text-primary flex items-center gap-2">
                        <Briefcase size={20} /> ประเภทผู้ขาย (Supplier Categories)
                    </h3>
                    <p className="text-textMuted text-sm mb-6">
                        กำหนดประเภทผู้ขายเพื่อใช้ในการจัดกลุ่มและแยกประเภทในหน้ารายชื่อและรายงาน
                    </p>

                    <div className="mb-6 flex gap-3">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="เช่น บริการ, วัตถุดิบ..."
                            className="glass-input p-3" style={{ flex: 1 }}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                        />
                        <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={!newCategory.trim()}
                            className="px-6 py-3 rounded-lg border-none text-white cursor-pointer font-medium flex items-center gap-2" style={{ background: 'var(--primary)' }}
                        >
                            <Plus size={18} /> เพิ่ม
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                className="rounded-full text-primary text-sm font-medium flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(55, 71, 124, 0.05)', border: '1px solid rgba(55, 71, 124, 0.1)' }}
                            >
                                {cat.name}
                                <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="bg-transparent border-none text-red-500 cursor-pointer" style={{ padding: '0.2rem', display: 'flex', alignItems: 'center', borderRadius: '50%' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-textMuted text-sm" style={{ fontStyle: 'italic' }}>
                                ยังไม่มีการกำหนดประเภทผู้ขาย
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-lg border-none text-white font-medium flex items-center gap-2" style={{ padding: '0.8rem 2rem', background: isSaving ? '#4b5563' : '#8b5cf6', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </form>

            {/* Warehouse Modal */}
            {showWarehouseModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content glass-panel p-8" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="m-0 text-2xl text-primary">
                                {editingWarehouse ? 'แก้ไขคลังสินค้า' : 'เพิ่มคลังสินค้าใหม่'}
                            </h2>
                            <button onClick={() => setShowWarehouseModal(false)} className="bg-transparent border-none cursor-pointer text-textMuted">
                                <X size={24} />
                            </button>
                        </div>

                        <form id="warehouse-form" onSubmit={handleSaveWarehouse}>
                            {!editingWarehouse?.is_default && (
                                <div className="form-group mb-6">
                                    <label className="mb-2" style={{ display: 'block' }}>ประเภทคลัง</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="custom"
                                                checked={warehouseFormData.type === 'custom'}
                                                onChange={(e) => setWarehouseFormData({ ...warehouseFormData, type: e.target.value, supplier_id: '' })}
                                            />
                                            คลังของเราเอง
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="supplier"
                                                checked={warehouseFormData.type === 'supplier'}
                                                onChange={(e) => setWarehouseFormData({ ...warehouseFormData, type: e.target.value })}
                                            />
                                            คลังของผู้ขาย (Supplier)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {warehouseFormData.type === 'supplier' && !editingWarehouse?.is_default && (
                                <div className="form-group mb-4">
                                    <label className="mb-2 text-textMuted" style={{ display: 'block' }}>เลือกผู้ขาย <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={warehouseFormData.supplier_id}
                                        onChange={(e) => handleSupplierSelectForWarehouse(e.target.value)}
                                        className="glass-input w-full p-3 rounded-lg bg-main border border-border text-main"
                                    >
                                        <option value="">-- เลือกผู้ขาย --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="mb-2 text-textMuted" style={{ display: 'block' }}>ชื่อคลัง <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        value={warehouseFormData.name}
                                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })}
                                        className="glass-input w-full p-3 rounded-lg bg-main border border-border text-main"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="mb-2 text-textMuted" style={{ display: 'block' }}>รหัสคลัง <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        value={warehouseFormData.code}
                                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, code: e.target.value })}
                                        className="glass-input w-full p-3 rounded-lg bg-main border border-border text-main"
                                    />
                                </div>
                            </div>

                            <div className="form-group mb-4">
                                <label className="mb-2" style={{ display: 'block' }}>ที่อยู่</label>
                                <textarea
                                    value={warehouseFormData.address}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, address: e.target.value })}
                                    rows="3"
                                    className="glass-input w-full p-3 rounded-lg" style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="mb-2" style={{ display: 'block' }}>ชื่อผู้ติดต่อ</label>
                                    <input
                                        type="text"
                                        value={warehouseFormData.contact_person}
                                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, contact_person: e.target.value })}
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="mb-2" style={{ display: 'block' }}>เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={warehouseFormData.phone}
                                        onChange={(e) => setWarehouseFormData({ ...warehouseFormData, phone: e.target.value })}
                                        className="glass-input w-full p-3 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="form-group mb-6">
                                <label className="mb-2" style={{ display: 'block' }}>หมายเหตุ</label>
                                <input
                                    type="text"
                                    value={warehouseFormData.notes}
                                    onChange={(e) => setWarehouseFormData({ ...warehouseFormData, notes: e.target.value })}
                                    className="glass-input w-full p-3 rounded-lg"
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setShowWarehouseModal(false)} className="px-6 py-3 rounded-lg text-red-500 cursor-pointer font-medium" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    ยกเลิก
                                </button>
                                <button type="submit" form="warehouse-form" className="btn-primary px-6 py-3">
                                    บันทึกคลังสินค้า
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sync Result Modal */}
            {showSyncModal && syncResult && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content glass-panel p-8" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="m-0 text-xl text-emerald-500 flex items-center gap-2">
                                <CheckCircle size={24} /> Sync สำเร็จ!
                            </h2>
                            <button onClick={() => setShowSyncModal(false)} className="bg-transparent border-none cursor-pointer text-textMuted">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4" style={{ flex: 1, overflowY: 'auto' }}>
                            <div className="mb-4 p-4 rounded-lg bg-emerald-500/10" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <strong>ผลลัพธ์การดึงข้อมูล:</strong>
                                <ul className="text-main" style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                                    <li>สร้างรายการสินค้าใหม่ในคลัง: <strong className="text-emerald-500">{syncResult.created.length}</strong> รายการ</li>
                                    <li>ข้ามรายการที่ซ้ำ/มีอยู่แล้ว: <strong>{syncResult.skippedCount}</strong> รายการ</li>
                                </ul>
                            </div>

                            {syncResult.created.length > 0 ? (
                                <div>
                                    <h4 className="mb-4 text-main">สินค้าที่ถูกเพิ่มใหม่:</h4>
                                    <div className="table-responsive-wrapper">
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-left bg-main">
                                                    <th className="px-4 py-3 text-textMuted">SKU</th>
                                                    <th className="px-4 py-3 text-textMuted">ชื่อสินค้า</th>
                                                    <th className="px-4 py-3 text-textMuted">ลูกค้าอ้างอิง</th>
                                                    <th className="px-4 py-3 text-textMuted">หน่วย</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {syncResult.created.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-border">
                                                        <td className="px-4 py-3 text-textMuted">{item.sku}</td>
                                                        <td className="px-4 py-3 text-main font-medium">{item.productName}</td>
                                                        <td className="px-4 py-3 text-textMuted">{item.customerName}</td>
                                                        <td className="px-4 py-3 text-textMuted">{item.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-textMuted bg-main rounded-lg">
                                    สินค้าของลูกค้าทุกรายการอยู่ในคลังกระจายสินค้าหลักเรียบร้อยแล้ว ไม่มีรายการใหม่เพิ่ม
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <button type="button" onClick={() => setShowSyncModal(false)} className="btn-primary px-6 py-3">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Warehouse & Transfer Modal */}
            {showDeleteWarehouseModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content glass-panel p-8" style={{ width: '90%', maxWidth: '450px' }}>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="m-0 text-xl text-red-500">
                                ยืนยันการลบคลังสินค้า
                            </h2>
                            <button onClick={() => setShowDeleteWarehouseModal(false)} className="bg-transparent border-none cursor-pointer text-textMuted">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-main mb-6 text-[0.95rem]">
                            มีรายการสินค้าอยู่ในคลังนี้ กรุณาเลือกคลังสินค้าเป้าหมายเพื่อโอนย้ายสินค้าก่อนทำการลบ:
                        </p>

                        <div className="form-group mb-6">
                            <label className="mb-2 text-textMuted" style={{ display: 'block' }}>คลังสินค้าเป้าหมาย <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={transferTargetWarehouseId}
                                onChange={(e) => setTransferTargetWarehouseId(e.target.value)}
                                className="glass-input w-full p-3 rounded-lg bg-main border border-border text-main"
                            >
                                <option value="">-- เลือกคลังสินค้าเป้าหมาย --</option>
                                {warehouses
                                    .filter(w => w.id !== warehouseToDelete)
                                    .map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="mt-6 flex justify-end gap-4">
                            <button type="button" onClick={() => setShowDeleteWarehouseModal(false)} className="px-6 py-3 rounded-lg text-red-500 cursor-pointer font-medium" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteAndTransferWarehouse}
                                disabled={!transferTargetWarehouseId}
                                className="btn-primary px-6 py-3" style={{ background: 'var(--error)' }}
                            >
                                โอนย้ายและลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
