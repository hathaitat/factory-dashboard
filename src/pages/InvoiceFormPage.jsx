import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, CheckCircle, FileText, Printer, X } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

const InvoiceFormPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert, showConfirm, showToast } = useDialog();
    const isEdit = !!id;
    const referencePoId = location.state?.referencePoId;

    const [isLoading, setIsLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    // Add states for customer search dropdown
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [customerPOs, setCustomerPOs] = useState([]);

    const [formData, setFormData] = useState({
        invoiceNo: '',
        date: getLocalDateString(),
        customerId: '',
        referenceNo: '',
        purchaseOrderId: '',
        creditDays: 0,
        dueDate: '',
        notes: '',
        subtotal: 0,
        discount: 0,
        vatRate: 7,
        vatAmount: 0,
        grandTotal: 0,
        bahtText: '',
        status: 'Draft',
        deliveredBy: ''
    });

    const [items, setItems] = useState([
        { productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0, sku: '' }
    ]);

    // Add state for product autocomplete dropdown
    const [activeProductDropdown, setActiveProductDropdown] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [items, formData.discount, formData.vatRate, formData.adjustments]);

    useEffect(() => {
        if (formData.date && formData.creditDays !== undefined) {
            const date = new Date(formData.date);
            date.setDate(date.getDate() + parseInt(formData.creditDays || 0));
            setFormData(prev => ({ ...prev, dueDate: getLocalDateString(date) }));
        }
    }, [formData.date, formData.creditDays]);

    // Sync search text when customerId changes (e.g. on edit load or clear)
    useEffect(() => {
        if (formData.customerId && customers.length > 0) {
            const selected = customers.find(c => String(c.id) === String(formData.customerId));
            if (selected) {
                setCustomerSearch(`${selected.name} (${selected.code})`);
            }
        } else if (!formData.customerId && formData.customerSnapshot) {
            setCustomerSearch(`${formData.customerSnapshot.name} (ลูกค้าที่ถูกลบ)`);
        } else if (!formData.customerId) {
            setCustomerSearch('');
        }
    }, [formData.customerId, customers, formData.customerSnapshot]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [customerData] = await Promise.all([
                customerService.getCustomers()
            ]);
            setCustomers(customerData || []);

            if (isEdit) {
                const inv = await invoiceService.getInvoiceById(id);
                if (inv) {
                    setFormData({
                        ...inv,
                        date: inv.date,
                        dueDate: inv.dueDate,
                        adjustments: inv.adjustments || [],
                        deliveredBy: inv.customerSnapshot?.deliveredBy || ''
                    });

                    let loadedItems = inv.items;
                    if (inv.purchaseOrderId) {
                        const fullPo = await purchaseOrderService.getPurchaseOrderWithRemainingQuantity(inv.purchaseOrderId);
                        if (fullPo && fullPo.purchase_order_items) {
                            loadedItems = loadedItems.map(item => {
                                const poItem = fullPo.purchase_order_items.find(pi => pi.product_name === item.productName);
                                if (poItem) {
                                    return {
                                        ...item,
                                        maxQuantity: Number(item.quantity) + (poItem.remaining_quantity || 0)
                                    };
                                }
                                return item;
                            });
                        }
                    }
                    setItems(loadedItems);

                    if (inv.customerId) {
                        const [customerProducts, pos] = await Promise.all([
                            productService.getProductsByCustomerId(inv.customerId),
                            purchaseOrderService.getPurchaseOrdersByCustomer(inv.customerId)
                        ]);
                        setAllProducts(customerProducts || []);
                        setCustomerPOs(pos || []);
                    }
                }
            } else {
                const nextNo = await invoiceService.getNextInvoiceNo();
                let initialPoData = null;

                if (referencePoId) {
                    initialPoData = await purchaseOrderService.getPurchaseOrderWithRemainingQuantity(referencePoId);
                }

                setFormData(prev => ({
                    ...prev,
                    invoiceNo: nextNo,
                    customerId: initialPoData ? initialPoData.customer_id : '',
                    referenceNo: initialPoData ? initialPoData.po_number : '',
                    purchaseOrderId: referencePoId || ''
                }));

                if (initialPoData && initialPoData.customer_id) {
                    const selectedCustomer = customerData.find(c => String(c.id) === String(initialPoData.customer_id));
                    if (selectedCustomer) {
                        setFormData(prev => ({ ...prev, creditDays: selectedCustomer.creditTerm || 0 }));
                        setCustomerSearch(`${selectedCustomer.name} (${selectedCustomer.code})`);
                    }
                    const [customerProducts, pos] = await Promise.all([
                        productService.getProductsByCustomerId(initialPoData.customer_id),
                        purchaseOrderService.getPurchaseOrdersByCustomer(initialPoData.customer_id)
                    ]);
                    setAllProducts(customerProducts || []);
                    setCustomerPOs(pos || []);

                    if (initialPoData.purchase_order_items && initialPoData.purchase_order_items.length > 0) {
                        const itemsWithRemaining = initialPoData.purchase_order_items.filter(item => item.remaining_quantity > 0 || initialPoData.purchase_order_items.length === 1);
                        const mappedItems = itemsWithRemaining.map(item => {
                            const qty = item.remaining_quantity !== undefined && item.remaining_quantity >= 0 ? item.remaining_quantity : item.quantity;
                            const matchedProduct = customerProducts?.find(p => p.name === item.product_name);
                            return {
                                productName: item.product_name,
                                quantity: qty,
                                maxQuantity: qty,
                                unit: item.unit,
                                pricePerUnit: item.price_per_unit,
                                amount: qty * item.price_per_unit,
                                sku: matchedProduct?.sku || ''
                            };
                        });
                        setItems(mappedItems);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerChange = async (customerId) => {
        if (!customerId) {
            setFormData(prev => ({ ...prev, customerId: '', creditDays: 0 }));
            setAllProducts([]);
            return;
        }

        const selectedCustomer = customers.find(c => String(c.id) === String(customerId));
        setFormData(prev => ({
            ...prev,
            customerId,
            purchaseOrderId: '',
            referenceNo: '',
            creditDays: selectedCustomer?.creditTerm || 0
        }));

        // Proactive: Show customer note immediately
        if (selectedCustomer?.invoiceNote) {
            showToast(`📌 หมายเหตุจากลูกค้า: ${selectedCustomer.invoiceNote}`, 8000);
        }

        // Load products and POs for this customer
        const [customerProducts, pos] = await Promise.all([
            productService.getProductsByCustomerId(customerId),
            purchaseOrderService.getPurchaseOrdersByCustomer(customerId)
        ]);
        setAllProducts(customerProducts || []);
        setCustomerPOs(pos || []);
    };

    const handleAddItem = () => {
        setItems([...items, { productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0, sku: '' }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems.length > 0 ? newItems : [{ productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0, sku: '' }]);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];

        if (field === 'quantity') {
            const numValue = Number(value);
            if (newItems[index].maxQuantity !== undefined && numValue > newItems[index].maxQuantity) {
                showToast(`สามารถระบุจำนวนได้สูงสุด ${newItems[index].maxQuantity} (ตามยอดคงเหลือใน PO)`, 4000);
                newItems[index][field] = newItems[index].maxQuantity;
            } else {
                newItems[index][field] = value;
            }
        } else {
            newItems[index][field] = value;
        }

        if (field === 'quantity' || field === 'pricePerUnit') {
            const calculatedAmt = Number(newItems[index].quantity || 0) * Number(newItems[index].pricePerUnit || 0);
            newItems[index].amount = Math.round((calculatedAmt + Number.EPSILON) * 100) / 100;
        }

        setItems(newItems);
    };

    const handleAddAdjustment = () => {
        setFormData(prev => ({
            ...prev,
            adjustments: [...(prev.adjustments || []), { label: '', amount: 0 }]
        }));
    };

    const handleRemoveAdjustment = (index) => {
        const newAdjustments = [...formData.adjustments];
        newAdjustments.splice(index, 1);
        setFormData(prev => ({ ...prev, adjustments: newAdjustments }));
    };

    const handleAdjustmentChange = (index, field, value) => {
        const newAdjustments = [...formData.adjustments];
        newAdjustments[index][field] = value;
        setFormData(prev => ({ ...prev, adjustments: newAdjustments }));
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const adjTotal = (formData.adjustments || []).reduce((sum, adj) => sum + (Number(adj.amount) || 0), 0);
        const afterDiscount = subtotal - Number(formData.discount || 0);
        const calculatedVat = afterDiscount * (Number(formData.vatRate || 0) / 100);
        const vatAmount = Math.round((calculatedVat + Number.EPSILON) * 100) / 100;
        const grandTotal = Math.round((afterDiscount + vatAmount + adjTotal + Number.EPSILON) * 100) / 100;

        setFormData(prev => ({
            ...prev,
            subtotal,
            vatAmount,
            grandTotal,
            bahtText: thaiBaht(grandTotal)
        }));
    };

    const thaiBaht = (num) => {
        if (!num) return 'ศูนย์บาทถ้วน';
        const numStr = num.toFixed(2).split('.');
        let integer = numStr[0];
        let decimal = numStr[1];

        const thaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
        const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

        const convert = (s) => {
            let res = '';
            for (let i = 0; i < s.length; i++) {
                let n = parseInt(s[i]);
                let u = s.length - 1 - i;
                if (n !== 0) {
                    if (u === 1 && n === 1) res += 'สิบ';
                    else if (u === 1 && n === 2) res += 'ยี่สิบ';
                    else if (u === 0 && n === 1 && s.length > 1) res += 'เอ็ด';
                    else res += thaiNumbers[n] + thaiUnits[u];
                }
            }
            return res;
        };

        let result = convert(integer) + 'บาท';
        if (parseInt(decimal) === 0) {
            result += 'ถ้วน';
        } else {
            result += convert(decimal) + 'สตางค์';
        }
        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId && !formData.customerSnapshot) {
            await showAlert('กรุณาเลือกลูกค้า');
            return;
        }
        if (items.length === 0) {
            await showAlert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        setIsLoading(true);
        try {
            // Find selected customer object to save as snapshot
            const selectedCustomer = customers.find(c => String(c.id) === String(formData.customerId));
            const currentUser = user;
            const userName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const submissionData = {
                ...formData,
                customerId: selectedCustomer ? formData.customerId : null,
                createdBy: isEdit ? undefined : userName,
                updatedBy: userName,
                customerSnapshot: selectedCustomer ? {
                    id: selectedCustomer.id,
                    code: selectedCustomer.code,
                    name: selectedCustomer.name,
                    taxId: selectedCustomer.taxId,
                    branch: selectedCustomer.branch,
                    phone: selectedCustomer.phone,
                    fax: selectedCustomer.fax,
                    address: selectedCustomer.address,
                    creditTerm: selectedCustomer.creditTerm,
                    deliveredBy: formData.deliveredBy
                } : { ...formData.customerSnapshot, deliveredBy: formData.deliveredBy }
            };

            let result;
            if (isEdit) {
                result = await invoiceService.updateInvoice(id, submissionData, items);
            } else {
                result = await invoiceService.createInvoice(submissionData, items);
            }

            // Check for warnings (e.g. stock deduction negative stock or auto creation)
            if (result && result.warnings && result.warnings.length > 0) {
                const warningMsg = result.warnings.join('\n');
                await showAlert('บันทึกสำเร็จ แต่มีการแจ้งเตือน:\n\n' + warningMsg);
            }

            // Check for new products to prompt auto-save
            if (selectedCustomer) {
                const newProducts = [];
                for (const item of items) {
                    if (item.productName && item.productName.trim() !== '') {
                        const existing = allProducts.find(p => p.name === item.productName);
                        if (!existing) {
                            newProducts.push({
                                customerId: selectedCustomer.id,
                                name: item.productName,
                                sku: item.sku || '',
                                unit: item.unit || '',
                                price: item.pricePerUnit || 0
                            });
                        }
                    }
                }

                if (newProducts.length > 0) {
                    // Turn off loading temporarily so the prompt is clearly visible
                    setIsLoading(false);
                    const confirmSave = await showConfirm(`พบรายการสินค้าใหม่ ${newProducts.length} รายการ คุณต้องการบันทึกสินค้าใหม่นี้เข้าสู่ฐานข้อมูลลูกค้าหรือไม่?`);
                    if (confirmSave) {
                        setIsLoading(true);
                        try {
                            for (const product of newProducts) {
                                await productService.createProduct(product);
                            }
                        } catch (prodErr) {
                            console.error('Error auto-saving products:', prodErr);
                            await showAlert('เกิดข้อผิดพลาดในการบันทึกสินค้าใหม่บางรายการ');
                        }
                    }
                }
            }

            // Check for customer Invoice remark and show toast
            if (formData.customerId) {
                const customer = customers.find(c => String(c.id) === String(formData.customerId));
                if (customer && customer.invoiceNote) {
                    showToast(customer.invoiceNote, 5000);
                }
            }

            navigate('/dashboard/invoices');
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
                onClick={() => navigate('/dashboard/invoices')}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-6 text-sm flex items-center gap-2"
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>
                        {isEdit ? 'แก้ไขใบกำกับภาษี' : 'ออกใบกำกับภาษีใหม่'}
                    </h1>
                    <div className="flex gap-4">
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => navigate(`/dashboard/invoices/${id}/print`)}
                                className="px-5 py-2.5 rounded-lg font-medium cursor-pointer flex items-center gap-2" style={{ background: 'rgba(55, 71, 124, 0.05)', color: '#37477C', border: '1px solid rgba(55, 71, 124, 0.1)' }}
                            >
                                <Printer size={18} /> พิมพ์
                            </button>
                        )}
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input px-4 py-2.5 rounded-lg text-main border border-border" style={{ background: 'var(--bg-main)' }}
                        >
                            <option value="Draft">แบบร่าง (Draft)</option>
                            <option value="Sent">ใบวางบิล (Sent)</option>
                            <option value="Paid">ชำระเงินแล้ว (Paid)</option>
                            <option value="Cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="text-white border-none rounded-lg font-semibold cursor-pointer flex items-center gap-2" style={{ padding: '0.6rem 1.5rem', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                        >
                            <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel p-8 mb-6">
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลือกลูกค้า</label>
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
                                    className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', paddingRight: '2.5rem', background: 'var(--bg-main)' }}
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            handleCustomerChange('');
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="bg-transparent border-none text-textMuted cursor-pointer" style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', zIndex: 2 }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div className="border border-border rounded-lg" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', background: 'var(--card-bg)', zIndex: 50, marginTop: '0.2rem', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
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
                                            className="cursor-pointer border-b border-border text-main" style={{ padding: '0.8rem 1rem', transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div className="font-medium">{c.name}</div>
                                            <div className="text-textMuted text-xs">{c.code}</div>
                                        </div>
                                    ))}
                                    {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.code?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                        <div className="text-textMuted text-center" style={{ padding: '0.7rem' }}>ไม่พบลูกค้าที่ค้นหา</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เลขที่ใบกำกับ</label>
                            <input
                                type="text"
                                value={formData.invoiceNo}
                                onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                                required
                                className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันที่</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>
                                เลขอ้างอิง (PO No.)
                            </label>
                            <select
                                value={formData.purchaseOrderId || ''}
                                onChange={async (e) => {
                                    const poId = e.target.value;
                                    if (!poId) {
                                        setFormData(prev => ({ ...prev, purchaseOrderId: '', referenceNo: '' }));
                                        return;
                                    }
                                    const selectedPO = customerPOs.find(p => p.id === poId);
                                    setFormData(prev => ({ ...prev, purchaseOrderId: poId, referenceNo: selectedPO?.po_number || '' }));

                                    if (selectedPO) {
                                        const confirmed = await showConfirm('คุณต้องการโหลดรายการสินค้าจากใบสั่งซื้อนี้อัตโนมัติหรือไม่? (รายการปัจจุบันจะถูกแทนที่)');
                                        if (confirmed) {
                                            const fullPo = await purchaseOrderService.getPurchaseOrderWithRemainingQuantity(poId);
                                            if (fullPo && fullPo.purchase_order_items && fullPo.purchase_order_items.length > 0) {
                                                const itemsWithRemaining = fullPo.purchase_order_items.filter(item => item.remaining_quantity > 0 || fullPo.purchase_order_items.length === 1);
                                                const mappedItems = itemsWithRemaining.map(item => {
                                                    const qty = item.remaining_quantity !== undefined && item.remaining_quantity >= 0 ? item.remaining_quantity : item.quantity;
                                                    const matchedProduct = allProducts.find(p => p.name === item.product_name);
                                                    return {
                                                        productName: item.product_name,
                                                        quantity: qty,
                                                        maxQuantity: qty,
                                                        unit: item.unit,
                                                        pricePerUnit: item.price_per_unit,
                                                        amount: qty * item.price_per_unit,
                                                        sku: matchedProduct?.sku || ''
                                                    };
                                                });
                                                setItems(mappedItems);
                                                calculateTotals();
                                            }
                                        }
                                    }
                                }}
                                className="glass-input w-full rounded-lg text-main border border-border mb-2" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                                disabled={!formData.customerId}
                            >
                                <option value="">-- ไม่ระบุ / พิมพ์เลขเอกสารเอง --</option>
                                {customerPOs
                                    .filter(po => {
                                        // Hide Completed/Cancelled POs, unless it's the currently selected PO (for edit mode)
                                        if (po.status === 'Completed' || po.status === 'Cancelled') {
                                            return po.id === formData.purchaseOrderId;
                                        }
                                        return true;
                                    })
                                    .map(po => (
                                        <option key={po.id} value={po.id}>{po.po_number}</option>
                                    ))}
                            </select>
                            <input
                                type="text"
                                value={formData.referenceNo}
                                onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                                placeholder="พิมพ์อ้างอิง PO หรืออื่นๆ"
                                className="glass-panel w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>เครดิต (วัน)</label>
                            <input
                                type="number"
                                value={formData.creditDays}
                                onChange={e => setFormData({ ...formData, creditDays: e.target.value })}
                                className="glass-panel w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>วันครบกำหนด</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                readOnly
                                className="glass-panel w-full rounded-lg text-textMuted border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)', opacity: 0.7 }}
                            />
                        </div>
                        <div>
                            <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>ผู้จัดส่ง (ไม่บังคับ)</label>
                            <input
                                type="text"
                                value={formData.deliveredBy || ''}
                                onChange={e => setFormData({ ...formData, deliveredBy: e.target.value })}
                                placeholder="ชื่อพนักงานหรือผู้ส่งมอบ"
                                className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel mb-6 overflow-hidden" style={{ padding: '0' }}>
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                        <h3 className="m-0 text-lg text-primary">รายการสินค้า</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="text-primary cursor-pointer text-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem', width: '25%' }}>รหัส SKU</th>
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem', width: '25%' }}>รายละเอียดสินค้า</th>
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem', width: '10%' }}>จำนวน</th>
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem', width: '15%' }}>หน่วย</th>
                                    <th className="text-textMuted font-medium" style={{ padding: '1rem 1.5rem', width: '15%' }}>ราคา/หน่วย</th>
                                    <th className="text-textMuted font-medium text-right" style={{ padding: '1rem 1.5rem', width: '10%' }}>จำนวนเงิน</th>
                                    <th className="p-4" style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} className="border-b border-border">
                                        <td style={{ padding: '0.8rem 1.5rem', position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={item.sku}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    handleItemChange(index, 'sku', val);
                                                    setActiveProductDropdown(index);
                                                }}
                                                onFocus={() => setActiveProductDropdown(index)}
                                                placeholder="เลือกหรือพิมพ์ SKU..."
                                                className="glass-input w-full text-main border border-border" style={{ padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px' }}
                                            />
                                            {activeProductDropdown === index && (
                                                <div className="border border-border rounded-lg" style={{ position: 'absolute', top: '100%', left: '1.5rem', right: '1.5rem', background: 'var(--card-bg)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
                                                    {allProducts.filter(p =>
                                                        (p.sku || '').toLowerCase().includes((item.sku || '').toLowerCase()) ||
                                                        (p.name || '').toLowerCase().includes((item.sku || '').toLowerCase())
                                                    ).map(p => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => {
                                                                handleItemChange(index, 'sku', p.sku || '');
                                                                handleItemChange(index, 'productName', p.name || '');
                                                                handleItemChange(index, 'unit', p.unit || '');
                                                                handleItemChange(index, 'pricePerUnit', p.price || 0);
                                                                setActiveProductDropdown(null);
                                                            }}
                                                            className="px-4 py-2.5 cursor-pointer border-b border-border text-main" style={{ transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between' }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <div>
                                                                <span className="font-medium text-blue-500" style={{ marginRight: '0.5rem' }}>{p.sku || '-'}</span>
                                                                {p.name}
                                                            </div>
                                                            <div className="text-textMuted">฿{p.price}</div>
                                                        </div>
                                                    ))}
                                                    {allProducts.filter(p => (p.sku || '').toLowerCase().includes((item.sku || '').toLowerCase()) || (p.name || '').toLowerCase().includes((item.sku || '').toLowerCase())).length === 0 && (
                                                        <div className="text-textMuted text-center" style={{ padding: '0.7rem' }}>ไม่พบรายการ กด Enter หรือพิมพ์ต่อเพื่อเพิ่มใหม่</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="text"
                                                required
                                                value={item.productName}
                                                onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                                placeholder="ชื่อสินค้า..."
                                                className="glass-input w-full text-main border border-border" style={{ padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="number"
                                                required
                                                min="0.01"
                                                step="any"
                                                max={item.maxQuantity !== undefined ? item.maxQuantity : undefined}
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                className="glass-input w-full text-main border border-border" style={{ padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px' }}
                                            />
                                            {item.maxQuantity !== undefined && (
                                                <div className="text-textMuted text-right" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                                    สูงสุด: {item.maxQuantity}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="text"
                                                required
                                                value={item.unit}
                                                onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                                placeholder="ชิ้น/กก."
                                                className="glass-input w-full text-main border border-border" style={{ padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem' }}>
                                            <input
                                                type="number"
                                                value={item.pricePerUnit}
                                                onChange={e => handleItemChange(index, 'pricePerUnit', e.target.value)}
                                                className="glass-input w-full text-main border border-border" style={{ padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td className="text-right font-medium" style={{ padding: '0.8rem 1.5rem' }}>
                                            <div className="text-sm text-textMuted" style={{ marginBottom: '0.2rem' }}>
                                                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                            </div>
                                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="bg-transparent border-none text-red-500 cursor-pointer" style={{ padding: '0.4rem' }}
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
                        <label className="mb-2 text-textMuted text-sm" style={{ display: 'block' }}>หมายเหตุ</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows="4"
                            className="glass-input w-full rounded-lg text-main border border-border" style={{ padding: '0.7rem', background: 'var(--bg-main)', resize: 'none' }}
                            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                        />
                        <div className="p-3 rounded-lg text-textMuted text-sm" style={{ marginTop: '1rem', background: 'var(--bg-main)' }}>
                            <span className="text-main font-medium">ตัวอักษร:</span> {formData.bahtText}
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-textMuted">รวมเป็นเงิน (Subtotal)</span>
                                <span className="text-lg text-main">฿{formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-textMuted">หักส่วนลด</span>
                                <input
                                    type="number"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                    className="glass-input text-right text-main border border-border" style={{ width: '120px', padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '4px' }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-textMuted">ภาษีมูลค่าเพิ่ม (VAT)</span>
                                    <input
                                        type="number"
                                        value={formData.vatRate}
                                        onChange={e => setFormData({ ...formData, vatRate: e.target.value })}
                                        className="glass-input text-center text-main border border-border text-xs" style={{ width: '50px', padding: '0.2rem', background: 'var(--bg-main)', borderRadius: '4px' }}
                                    />
                                    <span className="text-textMuted">%</span>
                                </div>
                                <span className="text-textMain">฿{formData.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Dynamic Adjustments */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm text-amber-500">รายการปรับปรุงพิเศษ (บวก/ลบ)</span>
                                <button type="button" onClick={handleAddAdjustment} className="bg-transparent border-none text-amber-500 cursor-pointer text-xs font-medium">+ เพิ่มช่อง</button>
                            </div>
                            {formData.adjustments?.map((adj, idx) => (
                                <div key={idx} className="mb-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={adj.label}
                                        onChange={e => handleAdjustmentChange(idx, 'label', e.target.value)}
                                        placeholder="เช่น ค่าขนส่ง"
                                        className="glass-panel text-sm bg-transparent border border-border text-main" style={{ flex: 2, padding: '0.3rem' }}
                                    />
                                    <input
                                        type="number"
                                        value={adj.amount}
                                        onChange={e => handleAdjustmentChange(idx, 'amount', e.target.value)}
                                        className="glass-panel text-sm text-right bg-transparent border border-border text-main" style={{ flex: 1, padding: '0.3rem' }}
                                    />
                                    <button type="button" onClick={() => handleRemoveAdjustment(idx)} className="text-red-500 bg-transparent border-none cursor-pointer"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center" style={{ padding: '1.5rem 0', borderTop: '2px solid var(--border-color)', marginTop: '0.5rem', background: 'linear-gradient(to right, transparent, rgba(16, 185, 129, 0.05))', paddingRight: '1rem', borderRadius: '0 0 12px 12px' }}>
                            <div className="text-right" style={{ flex: 1 }}>
                                <div className="font-semibold text-main" style={{ fontSize: '1rem' }}>จำนวนเงินรวมทั้งสิ้น</div>
                                <div className="text-xs text-textMuted" style={{ fontWeight: '400' }}>(Grand Total)</div>
                            </div>
                            <div className="text-right" style={{ marginLeft: '2rem' }}>
                                <span className="text-emerald-500" style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                                    ฿{formData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/invoices')}
                        className="rounded-lg border border-border bg-transparent text-textMuted cursor-pointer" style={{ padding: '0.8rem 1.5rem' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="text-white border-none rounded-lg font-semibold cursor-pointer flex items-center gap-2" style={{ padding: '0.8rem 1.5rem', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                        <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InvoiceFormPage;
