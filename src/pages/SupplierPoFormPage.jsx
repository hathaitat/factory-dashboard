import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowLeft, Image as ImageIcon, Building2, AlertTriangle, User } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { userService } from '../services/userService';
import { calculateSubcontractTotal } from '../utils/bomCalculator';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';

const SupplierPoFormPage = () => {
    const { user } = useAuth();
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
    const [isDirty, setIsDirty] = useState(false);

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
        grand_total: 0,
        created_by_name: '',
        updated_by: ''
    });

    const [items, setItems] = useState([
        { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, received_quantity: 0, received_this_round: 0, previous_received: 0, unit: 'PCS', unit_price: 0, amount: 0, due_date: '', raw_material_qty: '' }
    ]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleBack = async () => {
        if (isDirty) {
            const confirmed = await showConfirm('คุณมีข้อมูลที่ยังไม่ได้บันทึก ยืนยันที่จะย้อนกลับหรือไม่?');
            if (!confirmed) return;
        }
        navigate('/dashboard/supplier-pos');
    };

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
                const currentUser = user;

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
                        purchased_by: isEdit ? (poData.purchased_by || '') : (user?.fullName || poData.purchased_by || ''),
                        approved_by: poData.approved_by || '',
                        status: isEdit ? (poData.status || 'Draft') : 'Draft',
                        sub_total: poData.sub_total || 0,
                        vat_rate: poData.vat_rate || 7,
                        vat_amount: poData.vat_amount || 0,
                        grand_total: poData.grand_total || 0,
                        created_by_name: poData.created_by_name || '',
                        updated_by: poData.updated_by || ''
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
        setIsDirty(true);

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
        setIsDirty(true);
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
        setIsDirty(true);
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), supplier_product_id: '', description: '', note: '', image_url: '', quantity: 1, received_quantity: 0, previous_received: 0, unit: 'PCS', unit_price: 0, amount: 0, due_date: '' }]);
        setIsDirty(true);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
            setIsDirty(true);
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

            const currentUser = user;
            const operatorName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const payload = {
                ...formData,
                created_by_name: isEdit ? (formData.created_by_name || operatorName) : operatorName,
                updated_by: operatorName,
                status: finalStatus,
                items: validItems.map(item => {
                    const { id, previous_received, received_this_round, raw_material_qty, ...rest } = item;
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
                        const currentUser = user;
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
                        await supplierPoService.deleteSupplierPo(savedPo.id);
                        throw new Error(`ไม่สามารถตัดสต็อกวัตถุดิบได้ (${err.message || 'สต็อกอาจไม่เพียงพอ'}) ระบบได้ยกเลิกการสร้างใบสั่งซื้อนี้แล้ว`);
                    }
                } else {
                    await showAlert('สร้างใบสั่งซื้อสำเร็จ');
                }
            }
            setIsDirty(false);
            navigate('/dashboard/supplier-pos');
        } catch (error) {
            console.error('Error saving PO:', error);
            showError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    }; if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;

    return (
        <div className="px-4 pb-8">
            <button
                type="button"
                onClick={handleBack}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-6 text-sm flex items-center gap-2"
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <PageHeader
                title={isReceiveMode ? 'รับสินค้าเข้าคลัง' : (isEdit ? 'แก้ไขใบสั่งซื้อผู้ขาย' : 'สร้างใบสั่งซื้อผู้ขาย')}
                subtitle={isEdit ? `เลขที่ใบสั่งซื้อ: ${formData.po_number || '-'}` : 'กรอกรายละเอียดเพื่อสร้างใบสั่งซื้อใหม่'}
            >
                <div className="flex gap-4" style={{ alignItems: 'center' }}>
                    <select
                        value={formData.status}
                        onChange={e => {
                            setFormData({ ...formData, status: e.target.value });
                            setIsDirty(true);
                        }}
                        className="glass-input px-4 py-2.5 bg-main rounded-lg text-main border border-border"
                    >
                        <option value="Draft">ฉบับร่าง (Draft)</option>
                        <option value="Partial">รับสินค้าบางส่วน (Partially Received)</option>
                        <option value="Completed">ได้รับสินค้าครบแล้ว (Completed)</option>
                        <option value="Cancelled">ยกเลิก (Cancelled)</option>
                    </select>
                    <button
                        type="submit"
                        form="po-form"
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2" style={{ padding: '0.6rem 1.5rem' }}
                    >
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งซื้อ'}
                    </button>
                </div>
            </PageHeader>

            <form id="po-form" onSubmit={handleSubmit}>
                {subcontractInventoryId && !isEdit && (
                    <div className="glass-panel p-6 mb-8" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <h3 className="mt-0 text-violet-500 flex items-center gap-2">
                            <Building2 size={20} /> วัตถุดิบที่ต้องเบิกใช้สำหรับการจ้างผลิต
                        </h3>
                        <p className="text-textMuted text-sm mb-4">
                            เมื่อบันทึกใบสั่งซื้อนี้เป็นครั้งแรก ระบบจะทำการ <b>"เบิกตัดสต็อก"</b> วัตถุดิบรายการนี้ออกจากคลังให้โดยอัตโนมัติ
                        </p>

                        {subcontractQty > 0 && subcontractCalculationNote && (
                            <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 flex items-start gap-2">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                <div className="text-[0.85rem] leading-relaxed">
                                    <span>ยอดคำนวณอัตโนมัติ <b>{subcontractCalculationNote}</b></span><br />
                                    <span>โปรดตรวจสอบและปรับแก้ตัวเลขในช่องด้านล่างให้ตรงกับจำนวนจริงที่จะเบิกใช้</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4" style={{ alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                                <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>รายการวัตถุดิบ (อ้างอิงจากคลังที่เลือก)</label>
                                <input type="text" value={subcontractMaterial} disabled className="glass-input w-full p-3" style={{ opacity: 0.7 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>จำนวนที่ต้องการเบิกใช้</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={subcontractQty}
                                    onChange={e => setSubcontractQty(e.target.value)}
                                    className="glass-input w-full p-3" style={{ borderColor: '#8b5cf6' }}
                                    placeholder="ระบุจำนวน"
                                    required={!!subcontractInventoryId}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="glass-panel p-8 mb-8">
                    <h3 className="text-primary" style={{ margin: '0 0 1.5rem 0' }}>ข้อมูลทั่วไป</h3>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลขที่ PO</label>
                            <input
                                type="text"
                                name="po_number"
                                value={formData.po_number}
                                onChange={handleChange}
                                placeholder="สร้างอัตโนมัติเมื่อบันทึก"
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้ขาย (Vendor) *</label>
                            <select
                                name="supplier_id"
                                value={formData.supplier_id}
                                onChange={handleSupplierChange}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            >
                                <option value="">-- เลือกผู้ขาย --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันที่สั่งซื้อ *</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>สถานที่ส่ง (คลังสินค้า) *</label>
                            <select
                                name="delivery_warehouse_id"
                                value={formData.delivery_warehouse_id || ''}
                                onChange={handleChange}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
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
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>กำหนดส่งสินค้า *</label>
                            <input
                                type="date"
                                name="delivery_date"
                                value={formData.delivery_date}
                                onChange={handleChange}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เครดิตเทอม</label>
                            <input
                                type="text"
                                name="credit_term"
                                value={formData.credit_term}
                                onChange={handleChange}
                                placeholder="เช่น เครดิต 60 วัน, เงินสด"
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>อ้างอิงเอกสาร</label>
                            <input
                                type="text"
                                name="reference_doc"
                                value={formData.reference_doc}
                                onChange={handleChange}
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-0 mb-6 overflow-hidden">
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                        <h3 className="m-0 text-lg text-primary">รายการสินค้า</h3>
                        <button type="button" onClick={addItem} className="text-primary cursor-pointer text-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>

                    <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="px-6 py-4 text-textMuted font-medium w-[50px] text-center">ลำดับ</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[40%]">รายละเอียดสินค้า (เลือกจากผู้ขายหรือพิมพ์เอง)</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">จำนวนสั่ง</th>
                                    {(formData.status === 'Completed' || formData.status === 'Partial' || isReceiveMode) && (
                                        <th className="px-6 py-4 text-[#10b981] font-semibold w-[15%] text-right">รับเพิ่มรอบนี้</th>
                                    )}
                                    <th className="px-6 py-4 text-textMuted font-medium w-[10%]">หน่วย</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">ราคา/หน่วย</th>
                                    <th className="px-6 py-4 text-textMuted font-medium w-[15%] text-right">จำนวนเงิน</th>
                                    <th className="p-4 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-border">
                                        <td className="px-6 py-3.5 text-center text-textMuted">{index + 1}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    list={`supplier-products-${index}`}
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="เลือกสินค้าหรือพิมพ์รายละเอียดเอง..."
                                                    className="glass-panel w-full p-2 bg-cardHover rounded text-main border border-border" style={{ paddingRight: '2rem' }}
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
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border text-right"
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
                                                    className="glass-input w-full p-2 rounded text-emerald-500 text-right" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', fontWeight: 'bold' }}
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
                                                placeholder="ชิ้น/กก."
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                            />
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border text-right"
                                            />
                                        </td>
                                        <td className="px-6 py-3.5 text-right font-medium">
                                            <div className="mb-1 text-[0.9rem] text-textMuted">
                                                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                            </div>
                                            ฿{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="bg-transparent border-none text-red-500 cursor-pointer p-1.5"
                                                title="ลบรายการ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid-mobile-stack p-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div className="glass-panel p-6">
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>หมายเหตุ (REMARK)</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                rows="4"
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border mb-6" style={{ resize: 'none' }}
                                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้สั่งซื้อ (PURCHASE BY) *</label>
                                    <input
                                        type="text"
                                        name="purchased_by"
                                        value={formData.purchased_by}
                                        onChange={handleChange}
                                        required
                                        className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้อนุมัติ (APPROVER BY) *</label>
                                    <input
                                        type="text"
                                        name="approved_by"
                                        value={formData.approved_by}
                                        onChange={handleChange}
                                        required
                                        className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-textMuted">รวมเป็นเงิน (SUB TOTAL)</span>
                                    <span className="text-lg text-main">฿{formData.sub_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-textMuted">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                        <input
                                            type="number"
                                            name="vat_rate"
                                            value={formData.vat_rate}
                                            onChange={handleChange}
                                            className="glass-input text-center bg-main rounded text-main border border-border text-xs" style={{ width: '50px', padding: '0.2rem' }}
                                        />
                                        <span className="text-textMuted">%</span>
                                    </div>
                                    <span className="text-textMain">฿{formData.vat_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center" style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                                    <span className="text-xl font-semibold text-primary">ยอดเงินสุทธิ (TOTAL)</span>
                                    <span className="text-2xl font-bold text-emerald-500">฿{formData.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-6 flex justify-end gap-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/supplier-pos')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-3 rounded-lg border-none text-white font-medium flex items-center gap-2" style={{ background: 'var(--primary)', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งซื้อ'}
                    </button>
                </div>
                {isEdit && (
                    <div className="glass-panel p-5 text-textMuted text-sm flex flex-col gap-2 mt-6">
                        {formData.created_by_name && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{formData.created_by_name}</span>
                            </div>
                        )}
                        {formData.updated_by && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{formData.updated_by}</span>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};

export default SupplierPoFormPage;
