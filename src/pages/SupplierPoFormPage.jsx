import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, Image as ImageIcon, Building2, AlertTriangle } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { userService } from '../services/userService';
import { calculateSubcontractTotal } from '../utils/bomCalculator';

const SupplierPoFormPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const duplicateId = queryParams.get('duplicate');
    const isReceiveMode = queryParams.get('mode') === 'receive';

    // Subcontracting params
    const subcontractInventoryId = queryParams.get('subcontract_inventory_id');
    const subcontractMaterial = queryParams.get('subcontract_material');
    const [subcontractQty, setSubcontractQty] = useState('');
    const [subcontractCalculationNote, setSubcontractCalculationNote] = useState('');
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { showAlert, showError, showConfirm } = useDialog();

    const [suppliers, setSuppliers] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const [inventoryBomRules, setInventoryBomRules] = useState([]);

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
        { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, received_quantity: 0, received_this_round: 0, previous_received: 0, unit: 'PCS', unit_price: 0, amount: 0, due_date: '', raw_material_qty: '' }
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
            const [suppliersData, warehousesData, bomRulesData] = await Promise.all([
                supplierService.getSuppliers(),
                warehouseService.getWarehouses(),
                warehouseService.getAllInventoryBomRules()
            ]);
            setSuppliers(suppliersData || []);
            setWarehouses(warehousesData || []);
            setInventoryBomRules(bomRulesData || []);

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

                    // If in receive mode and currently Draft, suggest Partial status
                    if (isReceiveMode && poData.status === 'Draft') {
                        setFormData(prev => ({ ...prev, status: 'Partial' }));
                    }

                    if (poData.supplier_po_items && poData.supplier_po_items.length > 0) {
                        setItems(poData.supplier_po_items.map(item => {
                            const isDraft = poData.status === 'Draft';
                            const prevRcv = isDraft ? 0 : (item.received_quantity || 0);
                            return {
                                ...item,
                                id: isEdit ? item.id : Date.now() + Math.random(), // New ID if duplicating
                                received_this_round: 0,
                                previous_received: prevRcv,
                                received_quantity: prevRcv,
                                due_date: item.due_date ? item.due_date.split('T')[0] : ''
                            };
                        }));
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

        // Auto calculate raw_material_qty using BOM rules
        if (['quantity', 'description'].includes(field) && item.supplier_product_id) {
            // Find a matching BOM rule. Priority: Matches the subcontractInventoryId currently selected in the top panel
            let matchingRule = null;
            if (subcontractInventoryId) {
                matchingRule = inventoryBomRules.find(r => r.supplier_product_id === item.supplier_product_id && r.inventory_id === subcontractInventoryId);
            }
            
            // If no exact match with subcontract material, find ANY rule for this product
            if (!matchingRule) {
                matchingRule = inventoryBomRules.find(r => r.supplier_product_id === item.supplier_product_id);
            }

            // Apply rule
            if (matchingRule) {
                const ratio = Number(matchingRule.raw_material_qty) / Number(matchingRule.finished_product_qty);
                item.raw_material_qty = ((parseFloat(item.quantity) || 0) * ratio).toFixed(4);
            } else if (item.supplier_product_id && (field === 'description' || field === 'quantity')) {
                // If the product has a legacy raw_material_ratio fallback
                const selectedProduct = supplierProducts.find(p => p.id === item.supplier_product_id);
                if (selectedProduct && selectedProduct.raw_material_ratio > 0) {
                    item.raw_material_qty = ((parseFloat(item.quantity) || 0) * selectedProduct.raw_material_ratio).toFixed(4);
                } else {
                    item.raw_material_qty = '';
                }
            }

            // Auto calculate and update the top panel subcontractQty state if applicable
            const { qty, note } = calculateSubcontractTotal(newItems, inventoryBomRules, subcontractInventoryId, supplierProducts);
            setSubcontractQty(qty);
            setSubcontractCalculationNote(note);
        }

        // Validate received_this_round against quantity
        if (field === 'received_this_round' || field === 'quantity') {
            const maxQty = parseFloat(item.quantity) || 0;
            const prevRcv = parseFloat(item.previous_received) || 0;
            const maxAllowed = Math.max(0, maxQty - prevRcv);
            let currentRcvThisRound = parseFloat(item.received_this_round) || 0;
            if (currentRcvThisRound > maxAllowed) {
                item.received_this_round = maxAllowed;
                if (field === 'received_this_round') {
                    showAlert(`ยอดรับเพิ่มรอบนี้ต้องไม่เกินจำนวนที่เหลือค้างส่ง (${maxAllowed})`);
                }
            } else if (currentRcvThisRound < 0) {
                item.received_this_round = 0;
            }
            item.received_quantity = prevRcv + (parseFloat(item.received_this_round) || 0);
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, received_quantity: 0, previous_received: 0, unit: 'PCS', unit_price: 0, amount: 0, due_date: '' }]);
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
            // Auto-detect status if receiving goods
            let finalStatus = formData.status;
            if (finalStatus === 'Completed' || finalStatus === 'Partial') {
                const isFullyReceived = validItems.every(item =>
                    Number(item.received_quantity) >= Number(item.quantity)
                );
                const isNotReceivedAtAll = validItems.every(item =>
                    Number(item.received_quantity) === 0 || !item.received_quantity
                );

                if (isFullyReceived) {
                    finalStatus = 'Completed';
                } else if (isNotReceivedAtAll) {
                    finalStatus = 'Draft';
                } else {
                    finalStatus = 'Partial';
                }
            }

            const payload = {
                ...formData,
                status: finalStatus,
                items: validItems.map(item => {
                    const { id, previous_received, received_this_round, ...rest } = item;
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
                const savedPo = await supplierPoService.createSupplierPo(payload);

                // Automatically deduct stock for subcontracting ONLY ON CREATE
                if (subcontractInventoryId && Number(subcontractQty) > 0) {
                    try {
                        const currentUser = userService.getCurrentUser();
                        await warehouseService.adjustStock(
                            subcontractInventoryId,
                            'OUT',
                            subcontractQty,
                            `เบิกไปแปรรูปชิ้นส่วนตามใบสั่งจ้างผลิต (PO: ${savedPo.po_number || savedPo.id})`,
                            currentUser?.fullName || 'system'
                        );
                        await showAlert('สร้างใบสั่งซื้อ และตัดยอดสต็อกวัตถุดิบสำเร็จ');
                    } catch (err) {
                        console.error('Failed to deduct subcontract material:', err);
                        await showAlert('บันทึกใบสั่งซื้อสำเร็จ แต่ไม่สามารถตัดสต็อกวัตถุดิบได้ กรุณาไปตัดสต็อกด้วยตนเองที่หน้าคลังสินค้า');
                    }
                } else {
                    await showAlert('สร้างใบสั่งซื้อสำเร็จ');
                }
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
                {subcontractInventoryId && !isEdit && (
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #8b5cf6' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                            <Building2 size={20} /> วัตถุดิบที่ต้องเบิกใช้สำหรับการจ้างผลิต
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            เมื่อบันทึกใบสั่งซื้อนี้เป็นครั้งแรก ระบบจะทำการ <b>"เบิกตัดสต็อก"</b> วัตถุดิบรายการนี้ออกจากคลังให้โดยอัตโนมัติ
                        </p>
                        
                        {subcontractQty > 0 && subcontractCalculationNote && (
                            <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 flex items-start gap-2">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                <div className="text-[0.85rem] leading-relaxed">
                                    <span>ยอดคำนวณอัตโนมัติ <b>{subcontractCalculationNote}</b></span><br/>
                                    <span>โปรดตรวจสอบและปรับแก้ตัวเลขในช่องด้านล่างให้ตรงกับจำนวนจริงที่จะเบิกใช้</span>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>รายการวัตถุดิบ (อ้างอิงจากคลังที่เลือก)</label>
                                <input type="text" value={subcontractMaterial} disabled className="glass-input" style={{ width: '100%', padding: '0.8rem', opacity: 0.7 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>จำนวนที่ต้องการเบิกใช้</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={subcontractQty}
                                    onChange={e => setSubcontractQty(e.target.value)}
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.8rem', borderColor: '#8b5cf6' }}
                                    placeholder="ระบุจำนวน"
                                    required={!!subcontractInventoryId}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isReceiveMode ? 'รับสินค้าเข้าคลัง' : (isEdit ? 'แก้ไขใบสั่งซื้อผู้ขาย' : 'สร้างใบสั่งซื้อผู้ขาย')}
                    </h1>
                    <div className="flex gap-4">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Draft">ฉบับร่าง (Draft)</option>
                            <option value="Partial">รับสินค้าบางส่วน (Partially Received)</option>
                            <option value="Completed">ได้รับสินค้าครบแล้ว (Completed)</option>
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
                                        {w.code ? `[${w.code}] ` : ''}{w.name} {w.is_default ? '(คลังหลัก)' : ''}
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
                                <tr className="border-b border-border text-left">
                                    <th className="p-4 w-[50px]"></th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[50px] text-center">ลำดับ</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[40%]">รายละเอียดสินค้า (เลือกจากผู้ขายหรือพิมพ์เอง)</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">จำนวนสั่ง</th>
                                    {(formData.status === 'Completed' || formData.status === 'Partial' || isReceiveMode) && (
                                        <th className="px-6 py-4 text-[#10b981] font-semibold w-[15%] text-right">รับเพิ่มรอบนี้</th>
                                    )}
                                    <th className="px-6 py-4 text-textMuted font-medium w-[10%]">หน่วย</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">ราคา/หน่วย</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="p-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-1.5 text-textMuted hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                                title="ลบรายการ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-3.5 text-center text-textMuted">{index + 1}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="relative flex items-center">
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
                                                        className="absolute right-2 bg-none border-none text-textMuted cursor-pointer flex items-center justify-center p-0.5"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {supplierProducts.length > 0 ? (
                                                <div className="text-[0.75rem] text-[#10b981] mt-1 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                                                    มีสินค้าให้เลือก {supplierProducts.length} รายการ (ดับเบิลคลิกเพื่อดู)
                                                </div>
                                            ) : (
                                                <div className="text-[0.75rem] text-[#f59e0b] mt-1 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>
                                                    ผู้ขายนี้ยังไม่มีสินค้าในระบบ (พิมพ์เองได้เลย)
                                                </div>
                                            )}
                                            <datalist id={`supplier-products-${index}`}>
                                                {supplierProducts.map(p => (
                                                    <option key={p.id} value={p.name}>฿{p.price}</option>
                                                ))}
                                            </datalist>

                                            <div className="mt-3">
                                                <label className="block text-[0.75rem] text-textMuted mb-1">รายละเอียดเพิ่มเติม (Note):</label>
                                                <textarea
                                                    value={item.note || ''}
                                                    onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                                                    placeholder="ใส่ข้อมูลเพิ่มเติมทีละบรรทัด (เช่น สเปคสินค้า)..."
                                                    rows="2"
                                                    className="w-full p-2 bg-white/5 rounded-md text-textMain border border-dashed border-border text-[0.85rem] resize-y min-h-[45px]"
                                                />
                                            </div>

                                            <div className="mt-3 flex items-center gap-4">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id={`item-image-${index}`}
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(index, e.target.files[0])}
                                                        className="hidden"
                                                    />
                                                    <label
                                                        htmlFor={`item-image-${index}`}
                                                        className="flex items-center gap-1.5 text-[0.75rem] text-[#3b82f6] cursor-pointer bg-[#3b82f6]/5 px-2.5 py-1 rounded border border-[#3b82f6]/20"
                                                    >
                                                        <ImageIcon size={14} /> {item.image_url ? 'เปลี่ยนรูปภาพ' : 'เพิ่มรูปภาพ'}
                                                    </label>
                                                </div>
                                                {item.image_url && (
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={item.image_url}
                                                            alt="preview"
                                                            className="w-[30px] h-[30px] object-cover rounded border border-border"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(index, 'image_url', '')}
                                                            className="bg-none border-none text-[#f87171] cursor-pointer text-[0.7rem]"
                                                        >
                                                            ลบรูป
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    handleItemChange(index, 'quantity', e.target.value);
                                                }}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', textAlign: 'right' }}
                                                required
                                            />
                                        </td>
                                        {(formData.status === 'Completed' || formData.status === 'Partial' || isReceiveMode) && (
                                            <td className="px-6 py-3.5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={Math.max(0, (item.quantity || 0) - (item.previous_received || 0))}
                                                    step="0.01"
                                                    value={item.received_this_round ?? 0}
                                                    onChange={(e) => handleItemChange(index, 'received_this_round', e.target.value)}
                                                    className="glass-input"
                                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', color: '#10b981', border: '1px solid #10b981', textAlign: 'right', fontWeight: 'bold' }}
                                                    required
                                                />
                                                {item.previous_received > 0 && (
                                                    <div className="text-[0.75rem] text-textMuted mt-1">
                                                        รับแล้วรอบก่อน: {item.previous_received}
                                                    </div>
                                                )}
                                                {item.received_this_round > 0 && (
                                                    <div className="text-[0.75rem] text-[#3b82f6] mt-0.5 font-medium">
                                                        ยอดรับรวมใหม่: {((item.previous_received || 0) + Number(item.received_this_round)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-3.5">
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                className="glass-input"
                                                placeholder="ชิ้น/กก."
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td className="px-6 py-3.5">
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
                                        <td className="px-6 py-3.5 text-right font-medium">
                                            <div className="mb-1 text-[0.9rem] text-textMuted">
                                                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                            </div>
                                            ฿{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
