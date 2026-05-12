import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, FileText, Clock, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import { userService } from '../services/userService';

const SupplierPoFormPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const duplicateId = queryParams.get('duplicate');
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { showAlert, showError, showConfirm } = useDialog();

    const [suppliers, setSuppliers] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    
    const [formData, setFormData] = useState({
        po_number: '',
        supplier_id: '',
        delivery_warehouse_id: '',
        date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        credit_term: 'เครดิต 30 วัน',
        reference_doc: '',
        remark: '',
        purchased_by: '',
        approved_by: '',
        status: 'Draft',
        sub_total: 0,
        vat_rate: 7,
        vat_amount: 0,
        grand_total: 0
    });

    const [items, setItems] = useState([
        { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, unit: 'PCS', unit_price: 0, amount: 0, due_date: '' }
    ]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, [id, duplicateId]);

    // When supplier changes, load their products
    useEffect(() => {
        if (formData.supplier_id) {
            loadSupplierProducts(formData.supplier_id);
        } else {
            setSupplierProducts([]);
        }
    }, [formData.supplier_id]);

    // Recalculate totals when items or vat_rate changes
    useEffect(() => {
        calculateTotals();
    }, [items, formData.vat_rate]);

    const loadInitialData = async () => {
        try {
            const [suppliersData, warehousesData] = await Promise.all([
                supplierService.getSuppliers(),
                warehouseService.getWarehouses()
            ]);
            setSuppliers(suppliersData || []);
            setWarehouses(warehousesData || []);

            // Set default warehouse and current user for new POs
            if (!isEdit && !duplicateId) {
                const defaultWh = warehousesData?.find(w => w.is_default);
                const currentUser = userService.getCurrentUser();
                
                setFormData(prev => ({ 
                    ...prev, 
                    delivery_warehouse_id: defaultWh ? defaultWh.id : prev.delivery_warehouse_id,
                    purchased_by: currentUser ? currentUser.fullName : ''
                }));
            }

            if (isEdit || duplicateId) {
                const fetchId = isEdit ? id : duplicateId;
                const poData = await supplierPoService.getSupplierPoById(fetchId);
                if (poData) {
                    setFormData({
                        po_number: isEdit ? (poData.po_number || '') : '', // Clear if duplicating
                        supplier_id: poData.supplier_id || '',
                        delivery_warehouse_id: poData.delivery_warehouse_id || '',
                        date: isEdit ? (poData.date ? poData.date.split('T')[0] : '') : new Date().toISOString().split('T')[0],
                        delivery_date: poData.delivery_date ? poData.delivery_date.split('T')[0] : '',
                        credit_term: poData.credit_term || '',
                        reference_doc: poData.reference_doc || '',
                        remark: poData.remark || '',
                        purchased_by: isEdit ? (poData.purchased_by || '') : (userService.getCurrentUser()?.fullName || poData.purchased_by || ''),
                        approved_by: poData.approved_by || '',
                        status: isEdit ? (poData.status || 'Draft') : 'Draft',
                        sub_total: poData.sub_total || 0,
                        vat_rate: poData.vat_rate || 7,
                        vat_amount: poData.vat_amount || 0,
                        grand_total: poData.grand_total || 0
                    });

                    if (poData.supplier_po_items && poData.supplier_po_items.length > 0) {
                        setItems(poData.supplier_po_items.map(item => ({
                            ...item,
                            id: isEdit ? item.id : Date.now() + Math.random(), // New ID if duplicating
                            due_date: item.due_date ? item.due_date.split('T')[0] : ''
                        })));
                    }
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSupplierProducts = async (supplierId) => {
        try {
            const products = await supplierProductService.getProductsBySupplierId(supplierId);
            setSupplierProducts(products || []);
            return products;
        } catch (error) {
            console.error('Error loading products for supplier:', error);
            return [];
        }
    };

    const handleSupplierChange = async (e) => {
        const vendorId = e.target.value;
        setFormData(prev => ({ ...prev, supplier_id: vendorId }));
        
        if (!vendorId) {
            setSupplierProducts([]);
            return;
        }

        await loadSupplierProducts(vendorId);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'vat_rate' ? parseFloat(value) || 0 : value
        }));
    };

    const handleImageUpload = async (index, file) => {
        if (!file) return;
        
        try {
            // Show some loading state if needed
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `po_items/${fileName}`;
            
            const result = await supplierPoService.uploadFile(file, filePath);
            if (result.error) throw result.error;
            
            handleItemChange(index, 'image_url', result.publicUrl);
            showAlert('อัปโหลดรูปภาพสำเร็จ');
        } catch (error) {
            console.error('Error uploading image:', error);
            showError('ไม่สามารถอัปโหลดรูปภาพได้');
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        const item = newItems[index];

        if (field === 'description') {
            const selectedProduct = supplierProducts.find(p => p.name === value);
            item.description = value;
            if (selectedProduct) {
                item.supplier_product_id = selectedProduct.id;
                item.unit = selectedProduct.unit || 'PCS';
                item.unit_price = selectedProduct.price || 0;
            } else {
                item.supplier_product_id = '';
            }
        } else {
            item[field] = value;
        }

        // Auto calculate amount
        if (['quantity', 'unit_price', 'description'].includes(field)) {
            item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, unit: 'PCS', unit_price: 0, amount: 0, due_date: '' }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
        } else {
            showAlert('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
        }
    };

    const calculateTotals = () => {
        const sub_total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const vat_amount = (sub_total * (parseFloat(formData.vat_rate) || 0)) / 100;
        const grand_total = sub_total + vat_amount;

        setFormData(prev => ({
            ...prev,
            sub_total,
            vat_amount,
            grand_total
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.supplier_id) {
            showAlert('กรุณาเลือกผู้ขาย');
            return;
        }

        // Validate items
        const validItems = items.filter(item => item.description.trim() !== '');
        if (validItems.length === 0) {
            showAlert('กรุณากรอกรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                items: validItems.map(item => {
                    const { id, ...rest } = item;
                    return {
                        ...rest,
                        supplier_product_id: rest.supplier_product_id || null, // null if custom item
                        due_date: rest.due_date || formData.delivery_date || null
                    };
                })
            };

            if (isEdit) {
                await supplierPoService.updateSupplierPo(id, payload);
                await showAlert('บันทึกข้อมูลสำเร็จ');
            } else {
                await supplierPoService.createSupplierPo(payload);
                await showAlert('สร้างใบสั่งซื้อสำเร็จ');
            }
            navigate('/dashboard/supplier-pos');
        } catch (error) {
            console.error('Error saving PO:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <button
                onClick={() => navigate('/dashboard/supplier-pos')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEdit ? 'แก้ไขใบสั่งซื้อผู้ขาย' : 'สร้างใบสั่งซื้อผู้ขาย'}
                    </h1>
                    <div className="flex gap-4">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Draft">ฉบับร่าง (Draft)</option>
                            <option value="Waiting">รออนุมัติ (Waiting)</option>
                            <option value="Approved">อนุมัติแล้ว (Approved)</option>
                            <option value="Completed">ได้รับสินค้าแล้ว (Completed)</option>
                            <option value="Cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>ข้อมูลทั่วไป</h3>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เลขที่ PO</label>
                            <input
                                type="text"
                                name="po_number"
                                value={formData.po_number}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="สร้างอัตโนมัติเมื่อบันทึก"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้ขาย (Vendor) *</label>
                            <select
                                name="supplier_id"
                                value={formData.supplier_id}
                                onChange={handleSupplierChange}
                                className="glass-input"
                                required
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            >
                                <option value="">-- เลือกผู้ขาย --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>วันที่สั่งซื้อ *</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="glass-input"
                                required
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>สถานที่ส่ง (คลังสินค้า) *</label>
                            <select
                                name="delivery_warehouse_id"
                                value={formData.delivery_warehouse_id || ''}
                                onChange={handleChange}
                                className="glass-input"
                                required
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            >
                                <option value="">-- เลือกคลังสินค้า --</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.name} {w.is_default ? '(คลังหลัก)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>กำหนดส่งสินค้า *</label>
                            <input
                                type="date"
                                name="delivery_date"
                                value={formData.delivery_date}
                                onChange={handleChange}
                                className="glass-input"
                                required
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>เครดิตเทอม</label>
                            <input
                                type="text"
                                name="credit_term"
                                value={formData.credit_term}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="เช่น เครดิต 60 วัน, เงินสด"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>อ้างอิงเอกสาร</label>
                            <input
                                type="text"
                                name="reference_doc"
                                value={formData.reference_doc}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>รายการสินค้า</h3>
                        <button type="button" onClick={addItem} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '50px', textAlign: 'center' }}>ลำดับ</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '40%' }}>รายละเอียดสินค้า (เลือกจากผู้ขายหรือพิมพ์เอง)</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '15%', textAlign: 'right' }}>จำนวน</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '15%' }}>หน่วย</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '15%', textAlign: 'right' }}>ราคา/หน่วย</th>
                                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', width: '15%', textAlign: 'right' }}>จำนวนเงิน</th>
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    list={`supplier-products-${index}`}
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="glass-panel"
                                                    placeholder="เลือกสินค้าหรือพิมพ์รายละเอียดเอง..."
                                                    style={{ width: '100%', padding: '0.5rem', paddingRight: '2rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                                    required
                                                />
                                                {item.description && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleItemChange(index, 'description', '');
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '8px',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '2px'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {supplierProducts.length > 0 ? (
                                                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                                    มีสินค้าให้เลือก {supplierProducts.length} รายการ (ดับเบิลคลิกเพื่อดู)
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                                    ผู้ขายนี้ยังไม่มีสินค้าในระบบ (พิมพ์เองได้เลย)
                                                </div>
                                            )}
                                            <datalist id={`supplier-products-${index}`}>
                                                {supplierProducts.map(p => (
                                                    <option key={p.id} value={p.name}>฿{p.price}</option>
                                                ))}
                                            </datalist>

                                            <div style={{ marginTop: '0.8rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>รายละเอียดเพิ่มเติม (Note):</label>
                                                <textarea
                                                    value={item.note || ''}
                                                    onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                                                    placeholder="ใส่ข้อมูลเพิ่มเติมทีละบรรทัด (เช่น สเปคสินค้า)..."
                                                    rows="2"
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '0.5rem', 
                                                        background: 'rgba(255, 255, 255, 0.03)', 
                                                        borderRadius: '6px', 
                                                        color: 'var(--text-main)', 
                                                        border: '1px dashed var(--border-color)',
                                                        fontSize: '0.85rem',
                                                        resize: 'vertical',
                                                        minHeight: '45px'
                                                    }}
                                                />
                                            </div>

                                            <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="file"
                                                        id={`item-image-${index}`}
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(index, e.target.files[0])}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <label
                                                        htmlFor={`item-image-${index}`}
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.4rem', 
                                                            fontSize: '0.75rem', 
                                                            color: '#3b82f6', 
                                                            cursor: 'pointer',
                                                            background: 'rgba(59, 130, 246, 0.05)',
                                                            padding: '0.3rem 0.6rem',
                                                            borderRadius: '4px',
                                                            border: '1px solid rgba(59, 130, 246, 0.2)'
                                                        }}
                                                    >
                                                        <ImageIcon size={14} /> {item.image_url ? 'เปลี่ยนรูปภาพ' : 'เพิ่มรูปภาพ'}
                                                    </label>
                                                </div>
                                                {item.image_url && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <img 
                                                            src={item.image_url} 
                                                            alt="preview" 
                                                            style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} 
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleItemChange(index, 'image_url', '')}
                                                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}
                                                        >
                                                            ลบรูป
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', textAlign: 'right' }}
                                                required
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                className="glass-input"
                                                placeholder="ชิ้น/กก."
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', textAlign: 'right' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>
                                            <div style={{ marginBottom: '0.2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                            </div>
                                            ฿{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.4rem' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem' }}>
                        <div className="glass-panel p-6">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>หมายเหตุ (REMARK)</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                rows="4"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none', marginBottom: '1.5rem' }}
                                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                            />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้สั่งซื้อ (PURCHASE BY) *</label>
                                    <input
                                        type="text"
                                        name="purchased_by"
                                        value={formData.purchased_by}
                                        onChange={handleChange}
                                        required
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ผู้อนุมัติ (APPROVER BY) *</label>
                                    <input
                                        type="text"
                                        name="approved_by"
                                        value={formData.approved_by}
                                        onChange={handleChange}
                                        required
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted">รวมเป็นเงิน (SUB TOTAL)</span>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>฿{formData.sub_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="text-textMuted">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                        <input 
                                            type="number" 
                                            name="vat_rate" 
                                            value={formData.vat_rate} 
                                            onChange={handleChange}
                                            className="glass-input"
                                            style={{ width: '50px', padding: '0.2rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                        />
                                        <span className="text-textMuted">%</span>
                                    </div>
                                    <span className="text-textMain">฿{formData.vat_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--primary)' }}>ยอดเงินสุทธิ (TOTAL)</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>฿{formData.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SupplierPoFormPage;
