import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, X, UploadCloud, File, Eye, FileText } from 'lucide-react';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useDialog } from '../contexts/DialogContext';

const PurchaseOrderFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const isEdit = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [formData, setFormData] = useState({
        po_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        customer_id: '',
        status: 'Pending',
        notes: '',
        file_url: '',
        discount: 0,
        vat_rate: 7,
        subtotal: 0,
        vat_amount: 0,
        grand_total: 0
    });

    const [items, setItems] = useState([
        { product_name: '', quantity: 1, unit: '', price_per_unit: 0, amount: 0 }
    ]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [items]);

    useEffect(() => {
        if (formData.customer_id && customers.length > 0) {
            const selected = customers.find(c => String(c.id) === String(formData.customer_id));
            if (selected) {
                setCustomerSearch(`${selected.name} (${selected.code})`);
            }
        } else if (!formData.customer_id) {
            setCustomerSearch('');
        }
    }, [formData.customer_id, customers]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [customerData] = await Promise.all([
                customerService.getCustomers()
            ]);
            setCustomers(customerData || []);

            if (isEdit) {
                const po = await purchaseOrderService.getPurchaseOrderById(id);
                if (po) {
                    setFormData({
                        po_number: po.po_number,
                        issue_date: po.issue_date,
                        due_date: po.due_date || '',
                        customer_id: po.customer_id || '',
                        status: po.status || 'Pending',
                        notes: po.notes || '',
                        file_url: po.file_url || '',
                        discount: po.discount || 0,
                        vat_rate: po.vat_rate !== null ? po.vat_rate : 7,
                        subtotal: po.subtotal || 0,
                        vat_amount: po.vat_amount || 0,
                        grand_total: po.grand_total || 0
                    });

                    if (po.purchase_order_items && po.purchase_order_items.length > 0) {
                        setItems(po.purchase_order_items);
                    }

                    if (po.customer_id) {
                        const customerProducts = await productService.getProductsByCustomerId(po.customer_id);
                        setAllProducts(customerProducts || []);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerChange = async (customerId) => {
        if (!customerId) {
            setFormData(prev => ({ ...prev, customer_id: '' }));
            setAllProducts([]);
            return;
        }

        setFormData(prev => ({ ...prev, customer_id: customerId }));

        const customerProducts = await productService.getProductsByCustomerId(customerId);
        setAllProducts(customerProducts || []);
    };

    const handleAddItem = () => {
        setItems([...items, { product_name: '', quantity: 1, unit: '', price_per_unit: 0, amount: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems.length > 0 ? newItems : [{ product_name: '', quantity: 1, unit: '', price_per_unit: 0, amount: 0 }]);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'price_per_unit') {
            newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].price_per_unit || 0);
        }

        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const afterDiscount = subtotal - Number(formData.discount || 0);
        const vatAmount = afterDiscount * (Number(formData.vat_rate || 0) / 100);
        const grandTotal = afterDiscount + vatAmount;

        setFormData(prev => ({
            ...prev,
            subtotal: subtotal,
            vat_amount: vatAmount,
            grand_total: grandTotal
        }));
    };

    useEffect(() => {
        calculateTotals();
    }, [formData.discount, formData.vat_rate]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const url = await purchaseOrderService.uploadFile(file, formData.po_number || 'new-po');
            setFormData(prev => ({ ...prev, file_url: url }));
            showAlert('อัปโหลดไฟล์สำเร็จ');
        } catch (error) {
            console.error('Upload Error:', error);
            showAlert('ไม่สามารถอัปโหลดไฟล์ได้: ' + error.message);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.po_number) {
            await showAlert('กรุณาระบุเลขที่ใบสั่งซื้อ (PO)');
            return;
        }
        if (items.length === 0 || items.every(i => !i.product_name)) {
            await showAlert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                await purchaseOrderService.updatePurchaseOrder(id, formData, items);
            } else {
                await purchaseOrderService.createPurchaseOrder(formData, items);
            }
            navigate('/dashboard/purchase-orders');
        } catch (error) {
            console.error('Save error:', error);
            await showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !customers.length) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>กำลังโหลด...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <button
                onClick={() => navigate('/dashboard/purchase-orders')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEdit ? 'แก้ไขใบสั่งซื้อ (PO)' : 'เพิ่มใบสั่งซื้อใหม่'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Pending">รอดำเนินการ (Pending)</option>
                            <option value="In Progress">กำลังจัดเตรียม (In Progress)</option>
                            <option value="Completed">ส่งมอบครบแล้ว (Completed)</option>
                            <option value="Cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading || uploadingFile}
                            style={{ padding: '0.6rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                            <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} /> ข้อมูลทั่วไป
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลขที่ใบสั่งซื้อ (PO Number) <span style={{ color: '#f87171' }}>*</span></label>
                            <input
                                type="text"
                                value={formData.po_number}
                                onChange={e => setFormData({ ...formData, po_number: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลือกลูกค้า (หรือพิมพ์ใหม่)</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => {
                                        setCustomerSearch(e.target.value);
                                        setShowCustomerDropdown(true);
                                        if (!e.target.value) handleCustomerChange('');
                                    }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                    placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            handleCustomerChange('');
                                            setShowCustomerDropdown(false);
                                        }}
                                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', zIndex: 2 }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', background: 'var(--card-hover)', zIndex: 50, border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {customers.filter(c =>
                                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                        c.code?.toLowerCase().includes(customerSearch.toLowerCase())
                                    ).map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                handleCustomerChange(c.id);
                                                setShowCustomerDropdown(false);
                                            }}
                                            style={{ padding: '0.7rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({c.code})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันที่ออกเอกสาร</label>
                            <input
                                type="date"
                                value={formData.issue_date}
                                onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันกำหนดส่ง (Due Date)</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="glass-panel"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>ไฟล์แนบ PO (PDF / รูปภาพ)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <label style={{
                                    padding: '0.7rem 1rem', background: 'var(--card-hover)',
                                    border: '1px dashed var(--border-color)', borderRadius: '8px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    color: 'var(--text-main)'
                                }}>
                                    <UploadCloud size={18} />
                                    {uploadingFile ? 'กำลังอัปโหลด...' : 'เลือกไฟล์/ถ่ายภาพ'}
                                    <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf" />
                                </label>
                                {formData.file_url && (
                                    <a href={formData.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', textDecoration: 'none' }}>
                                        <File size={18} /> ไฟล์แนบปัจจุบัน
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b' }}>รายการออเดอร์</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '40%' }}>รายละเอียดสินค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>จำนวน</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>หน่วย</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>ราคา/หน่วย <span style={{ fontSize: '0.75rem' }}>(ถ้ามี)</span></th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%', textAlign: 'right' }}>จำนวนเงิน</th>
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    list={`products-${index}`}
                                                    required
                                                    value={item.product_name}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const prod = allProducts.find(p => p.name === val);
                                                        if (prod) {
                                                            handleItemChange(index, 'product_name', prod.name);
                                                            handleItemChange(index, 'unit', prod.unit || '');
                                                            handleItemChange(index, 'price_per_unit', prod.price || 0);
                                                        } else {
                                                            handleItemChange(index, 'product_name', val);
                                                        }
                                                    }}
                                                    className="glass-panel"
                                                    placeholder="พิมพ์ชื่อสินค้า..."
                                                    style={{ width: '100%', padding: '0.5rem', paddingRight: '2rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                                />
                                                {item.product_name && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleItemChange(index, 'product_name', '');
                                                            handleItemChange(index, 'unit', '');
                                                            handleItemChange(index, 'price_per_unit', 0);
                                                        }}
                                                        style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <datalist id={`products-${index}`}>
                                                {allProducts.map(p => (
                                                    <option key={p.id} value={p.name}>฿{p.price}</option>
                                                ))}
                                            </datalist>
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="number"
                                                required
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                className="glass-input"
                                                placeholder="ชิ้น/กก."
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="number"
                                                value={item.price_per_unit}
                                                onChange={e => handleItemChange(index, 'price_per_unit', e.target.value)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>
                                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '0.8rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.4rem' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows="4"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none' }}
                            placeholder="เช่น สถานที่ส่งมอบเฉพาะ, ข้อควรระวัง"
                        />
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>รวมเป็นเงิน (Sub Total)</span>
                            <span style={{ fontWeight: '500' }}>฿{formData.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>หักส่วนลด (Discount)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                    className="glass-input"
                                    style={{ width: '100px', padding: '0.4rem', textAlign: 'right', background: 'var(--card-hover)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                />
                                <span>฿</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                <input
                                    type="number"
                                    value={formData.vat_rate}
                                    onChange={e => setFormData({ ...formData, vat_rate: e.target.value })}
                                    className="glass-input"
                                    style={{ width: '60px', padding: '0.2rem 0.4rem', textAlign: 'center', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                                />
                                <span>%</span>
                            </div>
                            <span style={{ fontWeight: '500' }}>฿{formData.vat_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '0.5rem 0' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>จำนวนเงินรวมทั้งสิ้น</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--success)' }}>
                                ฿{formData.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PurchaseOrderFormPage;
