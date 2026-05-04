import { useState, useEffect } from 'react';
import { Save, Clock, Settings, Briefcase, FileText, Plus, X, Building2, MapPin, Phone, User, Edit2, Trash2, Package } from 'lucide-react';
import { settingService } from '../services/settingService';
import { supplierCategoryService } from '../services/supplierCategoryService';
import { warehouseService } from '../services/warehouseService';
import { supplierService } from '../services/supplierService';
import { documentNumberHelper } from '../utils/documentNumbering';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import { useDialog } from '../contexts/DialogContext';

const SettingsPage = () => {
    const { showConfirm, showAlert, showError } = useDialog();
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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const [schedule, formats, cats, whs, supps] = await Promise.all([
                settingService.getSetting('work_schedule'),
                settingService.getSetting('document_formats'),
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
            await showError('ไม่สามารถเพิ่มประเภทได้: ' + (error.message || 'ชื่ออาจซ้ำหรือเกิดข้อผิดพลาดในการเชื่อมต่อ'));
        }
    };

    const handleDeleteCategory = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบประเภทนี้?');
        if (!confirmed) return;
        try {
            await supplierCategoryService.deleteCategory(id);
            setCategories(categories.filter(c => c.id !== id));
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

            if (editingWarehouse) {
                const updated = await warehouseService.updateWarehouse(editingWarehouse.id, payload);
                setWarehouses(warehouses.map(w => w.id === updated.id ? updated : w));
            } else {
                const added = await warehouseService.createWarehouse(payload);
                setWarehouses([added, ...warehouses]);
            }
            setShowWarehouseModal(false);
            setMessage({ type: 'success', text: 'บันทึกข้อมูลคลังสินค้าเรียบร้อย' });
        } catch (error) {
            console.error('Error saving warehouse:', error);
            await showError('เกิดข้อผิดพลาดในการบันทึกคลังสินค้า');
        }
    };

    const handleDeleteWarehouse = async (id) => {
        const confirmed = await showConfirm('ยืนยันการลบคลังสินค้านี้? ข้อมูลสินค้าในคลังจะถูกลบไปด้วย');
        if (!confirmed) return;
        try {
            await warehouseService.deleteWarehouse(id);
            setWarehouses(warehouses.filter(w => w.id !== id));
        } catch (error) {
            await showError(error.message || 'ไม่สามารถลบคลังสินค้าได้');
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
                settingService.saveSetting('document_formats', documentFormats, 'Document Number Formats')
            ]);
            setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader
                title="ตั้งค่าระบบ"
                subtitle="จัดการการตั้งค่าต่างๆ ของระบบ"
                helpContent={HELP_CONTENT.settings}
            />

            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Work Schedule Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                        <Briefcase size={20} /> เวลาทำงาน
                    </h3>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเข้างาน
                            </label>
                            <input
                                type="time"
                                name="start_time"
                                value={workSchedule.start_time}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเลิกงาน
                            </label>
                            <input
                                type="time"
                                name="end_time"
                                value={workSchedule.end_time}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>รวมเวลาทำงานทั้งหมด:</span>
                        <span style={{ color: '#3b82f6', fontWeight: '700', fontSize: '1.1rem' }}>{calculateDuration()}</span>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                        <Clock size={20} /> กฎการมาสาย (Late Penalty)
                    </h3>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                ห้ามสายเกิน (นาที)
                            </label>
                            <input
                                type="number"
                                name="late_threshold"
                                value={workSchedule.late_threshold}
                                onChange={handleChange}
                                placeholder="เช่น 30"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายไม่เกินนี้ จะนับนาทีที่สายจริง</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                บทลงโทษหากสายเกิน (นาที)
                            </label>
                            <input
                                type="number"
                                name="late_penalty_mins"
                                value={workSchedule.late_penalty_mins}
                                onChange={handleChange}
                                placeholder="เช่น 60"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายเกินเกณฑ์ข้างต้น จะถูกปรับเป็นจำนวนนี้ทันที</p>
                        </div>
                    </div>
                </div>

                {/* Document Formats Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
                        <FileText size={20} /> รูปแบบเลขที่เอกสาร
                    </h3>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8', fontSize: '0.9rem' }}>ตัวแปรที่ใช้ได้ (Variables)</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                <li><code>{`{YYYY}`}</code> - ปี ค.ศ. แบบ 4 หลัก เช่น 2026</li>
                                <li><code>{`{YY}`}</code> - ปี ค.ศ. แบบ 2 หลัก เช่น 26</li>
                                <li><code>{`{MM}`}</code> - เดือน แบบ 2 หลัก เช่น 02</li>
                                <li><code>{`{DD}`}</code> - วัน แบบ 2 หลัก เช่น 25</li>
                                <li><code>{`{RUN}`}</code> - เลขรันอัตโนมัติ (ต่อท้ายด้วยตัวเลขเพื่อระบุจำนวนหลักได้ เช่น <code>{`{RUN3}`}</code>, <code>{`{RUN5}`}</code> ค่าเริ่มต้นคือ 4 หลัก)</li>
                            </ul>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบกำกับภาษี (Invoice)
                            </label>
                            <input
                                type="text"
                                name="invoice_format"
                                value={documentFormats.invoice_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น INV-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.invoice_format || 'IV{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบวางบิล (Billing Note)
                            </label>
                            <input
                                type="text"
                                name="billing_note_format"
                                value={documentFormats.billing_note_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น BN-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.billing_note_format || 'BN{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบเสร็จรับเงิน (Receipt)
                            </label>
                            <input
                                type="text"
                                name="receipt_format"
                                value={documentFormats.receipt_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น RE-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.receipt_format || 'RE{YY}{MM}{RUN}')}</p>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ใบเสร็จจะดึงเลขรันชุดเดียวกับใบวางบิลมาแสดง</p>
                        </div>
                    </div>
                </div>

                {/* Warehouse Management Section */}
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
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
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500'
                            }}
                        >
                            <Plus size={18} /> เพิ่มคลังใหม่
                        </button>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อคลัง</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>ประเภท</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ติดต่อ</th>
                                    <th style={{ padding: '1rem', width: '100px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.map((wh) => (
                                    <tr key={wh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-main)' }}>
                                            {wh.name} {wh.is_default && <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '12px', marginLeft: '0.5rem' }}>Default</span>}
                                            {wh.code && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>รหัส: {wh.code}</div>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ fontSize: '0.85rem', background: wh.type === 'supplier' ? '#f59e0b' : '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                                {wh.type === 'supplier' ? 'คลังผู้ขาย' : 'คลังของเรา'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {wh.contact_person || '-'} <br />
                                            {wh.phone || ''}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button type="button" onClick={() => handleOpenWarehouseModal(wh)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.3rem' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                {!wh.is_default && (
                                                    <button type="button" onClick={() => handleDeleteWarehouse(wh.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {warehouses.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            ยังไม่มีข้อมูลคลังสินค้า
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier Categories Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                        <Briefcase size={20} /> ประเภทผู้ขาย (Supplier Categories)
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        กำหนดประเภทผู้ขายเพื่อใช้ในการจัดกลุ่มและแยกประเภทในหน้ารายชื่อและรายงาน
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="เช่น บริการ, วัตถุดิบ..."
                            className="glass-input"
                            style={{ flex: 1, padding: '0.8rem' }}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                        />
                        <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={!newCategory.trim()}
                            style={{
                                padding: '0.8rem 1.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--primary)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500'
                            }}
                        >
                            <Plus size={18} /> เพิ่ม
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.4rem 0.8rem',
                                    background: 'rgba(55, 71, 124, 0.05)',
                                    border: '1px solid rgba(55, 71, 124, 0.1)',
                                    borderRadius: '20px',
                                    color: 'var(--primary)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                {cat.name}
                                <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '50%'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                ยังไม่มีการกำหนดประเภทผู้ขาย
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={isSaving}
                        style={{
                            padding: '0.8rem 2rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: isSaving ? '#4b5563' : '#8b5cf6',
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </form>

            {/* Warehouse Modal */}
            {showWarehouseModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>
                                {editingWarehouse ? 'แก้ไขคลังสินค้า' : 'เพิ่มคลังสินค้าใหม่'}
                            </h2>
                            <button onClick={() => setShowWarehouseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form id="warehouse-form" onSubmit={handleSaveWarehouse}>
                            {!editingWarehouse?.is_default && (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>ประเภทคลัง</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input 
                                                type="radio" 
                                                name="type" 
                                                value="custom" 
                                                checked={warehouseFormData.type === 'custom'}
                                                onChange={(e) => setWarehouseFormData({...warehouseFormData, type: e.target.value, supplier_id: ''})}
                                            />
                                            คลังของเราเอง
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input 
                                                type="radio" 
                                                name="type" 
                                                value="supplier" 
                                                checked={warehouseFormData.type === 'supplier'}
                                                onChange={(e) => setWarehouseFormData({...warehouseFormData, type: e.target.value})}
                                            />
                                            คลังของผู้ขาย (Supplier)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {warehouseFormData.type === 'supplier' && !editingWarehouse?.is_default && (
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>เลือกผู้ขาย *</label>
                                    <select
                                        required
                                        value={warehouseFormData.supplier_id}
                                        onChange={(e) => handleSupplierSelectForWarehouse(e.target.value)}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    >
                                        <option value="">-- เลือกผู้ขาย --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>ชื่อคลัง *</label>
                                    <input
                                        required
                                        type="text"
                                        value={warehouseFormData.name}
                                        onChange={(e) => setWarehouseFormData({...warehouseFormData, name: e.target.value})}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>รหัสคลัง</label>
                                    <input
                                        type="text"
                                        value={warehouseFormData.code}
                                        onChange={(e) => setWarehouseFormData({...warehouseFormData, code: e.target.value})}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>ที่อยู่</label>
                                <textarea
                                    value={warehouseFormData.address}
                                    onChange={(e) => setWarehouseFormData({...warehouseFormData, address: e.target.value})}
                                    className="glass-input"
                                    rows="3"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>ชื่อผู้ติดต่อ</label>
                                    <input
                                        type="text"
                                        value={warehouseFormData.contact_person}
                                        onChange={(e) => setWarehouseFormData({...warehouseFormData, contact_person: e.target.value})}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={warehouseFormData.phone}
                                        onChange={(e) => setWarehouseFormData({...warehouseFormData, phone: e.target.value})}
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>หมายเหตุ</label>
                                <input
                                    type="text"
                                    value={warehouseFormData.notes}
                                    onChange={(e) => setWarehouseFormData({...warehouseFormData, notes: e.target.value})}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowWarehouseModal(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: '500' }}>
                                    ยกเลิก
                                </button>
                                <button type="submit" form="warehouse-form" className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>
                                    บันทึกคลังสินค้า
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
