import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, X, UploadCloud, File, Eye, FileText, Clock, User } from 'lucide-react';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import LastUpdated from '../components/LastUpdated';
import { useAuth } from '../contexts/AuthContext';

const PurchaseOrderFormPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showToast } = useDialog();
    const isEdit = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [uploadingFile, setUploadingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [formData, setFormData] = useState({
        po_number: '',
        issue_date: getLocalDateString(),
        due_date: '',
        customer_id: '',
        status: 'Waiting',
        notes: '',
        file_url: '',
        discount: 0,
        vat_rate: 7,
        subtotal: 0,
        vat_amount: 0,
        grand_total: 0,
        created_at: null,
        updated_at: null
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
                        status: po.status || 'Waiting',
                        notes: po.notes || '',
                        file_url: po.file_url || '',
                        discount: po.discount || 0,
                        vat_rate: po.vat_rate !== null ? po.vat_rate : 7,
                        subtotal: po.subtotal || 0,
                        vat_amount: po.vat_amount || 0,
                        grand_total: po.grand_total || 0,
                        created_at: po.created_at,
                        updated_at: po.updated_at,
                        created_by: po.created_by,
                        updated_by: po.updated_by
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

        const selectedCustomer = customers.find(c => String(c.id) === String(customerId));
        setFormData(prev => ({ ...prev, customer_id: customerId }));

        // Proactive: Show customer PO note immediately
        if (selectedCustomer?.poNote) {
            showToast(`📌 หมายเหตุการสั่งซื้อ: ${selectedCustomer.poNote}`, 8000);
        }

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
            const calculatedAmt = Number(newItems[index].quantity || 0) * Number(newItems[index].price_per_unit || 0);
            newItems[index].amount = Math.round((calculatedAmt + Number.EPSILON) * 100) / 100;
        }

        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const afterDiscount = subtotal - Number(formData.discount || 0);
        const calculatedVat = afterDiscount * (Number(formData.vat_rate || 0) / 100);
        const vatAmount = Math.round((calculatedVat + Number.EPSILON) * 100) / 100;
        const grandTotal = Math.round((afterDiscount + vatAmount + Number.EPSILON) * 100) / 100;

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

    const handleFileUpload = async (file) => {
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

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
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
        if (!formData.due_date) {
            await showAlert('กรุณาระบุ วันกำหนดส่ง (Due Date)');
            return;
        }

        setIsLoading(true);
        try {
            const currentUser = user;
            const userName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const payload = {
                ...formData,
                due_date: formData.due_date || null,
                created_by: isEdit ? undefined : userName,
                updated_by: userName
            };

            if (isEdit) {
                await purchaseOrderService.updatePurchaseOrder(id, payload, items);
            } else {
                await purchaseOrderService.createPurchaseOrder(payload, items);
            }

            if (formData.customer_id) {
                const customer = customers.find(c => String(c.id) === String(formData.customer_id));
                if (customer && customer.poNote) {
                    showToast(customer.poNote, 5000);
                }
            }

            navigate('/dashboard/purchase-orders');
        } catch (error) {
            console.error('Save error:', error);
            await showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !customers.length) return <div className="p-8 text-textMuted">กำลังโหลด...</div>;

    return (
        <div className="px-4 pb-8">
            <button
                onClick={() => navigate('/dashboard/purchase-orders')}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-6 text-sm flex items-center gap-2"
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>
                        {isEdit ? 'แก้ไขใบสั่งซื้อ (PO)' : 'เพิ่มใบสั่งซื้อใหม่'}
                    </h1>
                    <div className="flex gap-4">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input px-4 py-2.5 bg-main rounded-lg text-main border border-border"
                        >
                            <option value="Waiting">รอดำเนินการ (Waiting)</option>
                            <option value="Progressing">กำลังดำเนินการ (Progressing)</option>
                            <option value="Completed">ส่งมอบครบแล้ว (Completed)</option>
                            <option value="Cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading || uploadingFile}
                            className="text-white border-none rounded-lg font-semibold cursor-pointer flex items-center gap-2" style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', transition: 'all 0.2s' }}
                        >
                            <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel p-8 mb-6">
                    <h3 className="mt-0 mb-6 text-lg text-primary flex items-center gap-2">
                        <FileText size={18} /> ข้อมูลทั่วไป
                    </h3>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลขที่ใบสั่งซื้อ (PO Number) <span className="text-error">*</span></label>
                            <input
                                type="text"
                                value={formData.po_number}
                                onChange={e => setFormData({ ...formData, po_number: e.target.value })}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div className="relative">
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลือกลูกค้า (หรือพิมพ์ใหม่)</label>
                            <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
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
                                    className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border" style={{ paddingRight: '2.5rem' }}
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            handleCustomerChange('');
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="bg-transparent border-none text-textMuted cursor-pointer absolute" style={{ right: '12px', display: 'flex', alignItems: 'center', padding: '2px', zIndex: 2 }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div className="border border-border rounded-lg absolute bg-cardBg" style={{ top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 50, marginTop: '0.2rem', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
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
                                            className="px-4 py-3 cursor-pointer border-b border-border text-main" style={{ transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div className="font-medium">{c.name}</div>
                                            <div className="text-textMuted text-xs">{c.code}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันที่ออกเอกสาร</label>
                            <input
                                type="date"
                                value={formData.issue_date}
                                onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                required
                                className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันกำหนดส่ง (Due Date) <span className="text-error">*</span></label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                required
                                className="glass-panel w-full p-2.5 bg-main rounded-lg text-main border border-border"
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ไฟล์แนบ PO (PDF / รูปภาพ)</label>
                            <div className="flex items-center gap-4">
                                <label
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        padding: '2rem',
                                        background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'white',
                                        border: `2px dashed ${isDragging ? '#3b82f6' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        color: isDragging ? '#3b82f6' : 'var(--text-main)',
                                        transition: 'all 0.3s ease',
                                        width: '100%',
                                        minHeight: '120px',
                                        textAlign: 'center',
                                        boxShadow: isDragging ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none'
                                    }}>
                                    <div className="p-4" style={{ background: isDragging ? 'rgba(59, 130, 246, 0.1)' : '#f8fafc', borderRadius: '50%', color: isDragging ? '#3b82f6' : '#94a3b8', transition: 'all 0.3s' }}>
                                        <UploadCloud size={32} />
                                    </div>
                                    <div className="font-semibold text-base">
                                        {uploadingFile ? 'กำลังอัปโหลด...' : 'ลากไฟล์ใบสั่งซื้อมาวางที่นี่'}
                                    </div>
                                    <div className="text-sm text-textMuted">หรือคลิกเพื่อเลือกไฟล์ (PDF, JPG, PNG)</div>
                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0])} accept="image/*,.pdf" />
                                </label>
                            </div>
                            {formData.file_url && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 no-underline px-4 py-2 flex items-center gap-2 bg-blue-500/10" style={{ borderRadius: '6px', width: 'fit-content' }}>
                                        <File size={18} /> ดูไฟล์แนบปัจจุบัน
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-panel mb-6 overflow-hidden p-0">
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                        <h3 className="m-0 text-lg text-primary">รายการออเดอร์</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="text-primary cursor-pointer text-sm bg-blue-500/10 px-3 py-1.5" style={{ border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '40%' }}>รายละเอียดสินค้า</th>
                                    <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '15%' }}>จำนวน</th>
                                    <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '15%' }}>หน่วย</th>
                                    <th className="px-6 py-4 text-textMuted font-medium" style={{ width: '15%' }}>ราคา/หน่วย <span style={{ fontSize: '0.75rem' }}>(ถ้ามี)</span></th>
                                    <th className="px-6 py-4 text-textMuted font-medium text-right" style={{ width: '15%' }}>จำนวนเงิน</th>
                                    <th className="p-4" style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} className="border-b border-border">
                                        <td className="px-6 py-3">
                                            <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
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
                                                    placeholder="พิมพ์ชื่อสินค้า..."
                                                    className="glass-panel w-full p-2 bg-cardHover rounded text-main border border-border" style={{ paddingRight: '2rem' }}
                                                />
                                                {item.product_name && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleItemChange(index, 'product_name', '');
                                                            handleItemChange(index, 'unit', '');
                                                            handleItemChange(index, 'price_per_unit', 0);
                                                        }}
                                                        className="bg-transparent border-none text-textMuted cursor-pointer absolute" style={{ right: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
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
                                        <td className="px-6 py-3">
                                            <input
                                                type="number"
                                                required
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                placeholder="ชิ้น/กก."
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <input
                                                type="number"
                                                value={item.price_per_unit}
                                                onChange={e => handleItemChange(index, 'price_per_unit', e.target.value)}
                                                className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium">
                                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="bg-transparent border-none text-red-500 cursor-pointer p-1.5"
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

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel p-6">
                        <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows="4"
                            className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border" style={{ resize: 'none' }}
                            placeholder="เช่น สถานที่ส่งมอบเฉพาะ, ข้อควรระวัง"
                        />
                    </div>

                    <div className="glass-panel p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-textMuted">รวมเป็นเงิน (Sub Total)</span>
                            <span className="font-medium">฿{formData.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-textMuted">หักส่วนลด (Discount)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                    className="glass-input p-1.5 text-right bg-cardHover rounded border border-border text-main" style={{ width: '100px' }}
                                />
                                <span>฿</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-textMuted">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                <input
                                    type="number"
                                    value={formData.vat_rate}
                                    onChange={e => setFormData({ ...formData, vat_rate: e.target.value })}
                                    className="glass-input text-center bg-cardHover border border-border rounded text-main" style={{ width: '60px', padding: '0.2rem 0.4rem' }}
                                />
                                <span>%</span>
                            </div>
                            <span className="font-medium">฿{formData.vat_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '0.5rem 0' }}></div>

                        <div className="flex justify-between items-center" style={{ padding: '1.5rem 0', borderTop: '2px solid #e2e8f0', marginTop: '0.5rem', background: 'linear-gradient(to right, transparent, rgba(16, 185, 129, 0.05))', paddingRight: '1rem', borderRadius: '0 0 12px 12px' }}>
                            <div className="text-right" style={{ flex: 1 }}>
                                <div className="text-base font-semibold text-main">จำนวนเงินรวมทั้งสิ้น</div>
                                <div className="text-xs text-textMuted" style={{ fontWeight: '400' }}>(Grand Total)</div>
                            </div>
                            <div className="text-right" style={{ marginLeft: '2rem' }}>
                                <span className="text-emerald-500" style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                                    ฿{formData.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/purchase-orders')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || uploadingFile}
                        className="px-6 py-3 text-white border-none rounded-lg font-semibold cursor-pointer flex items-center gap-2" style={{ background: 'var(--primary)', transition: 'all 0.2s' }}
                    >
                        <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </form>

            {isEdit && formData.created_at && (
                <div className="mt-6 p-4 text-textMuted text-sm" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>สร้างเมื่อ: {new Date(formData.created_at).toLocaleString('th-TH')}</span>
                    </div>
                    {formData.created_by && (
                        <div className="flex items-center gap-2">
                            <User size={14} />
                            <span>สร้างโดย: <span className="text-main font-semibold">{formData.created_by}</span></span>
                        </div>
                    )}
                    <LastUpdated updatedBy={formData.updated_by} updatedAt={formData.updated_at} />
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderFormPage;
