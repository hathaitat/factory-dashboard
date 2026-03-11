import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, CheckCircle, FileText, Printer, X } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useDialog } from '../contexts/DialogContext';

const InvoiceFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert, showConfirm } = useDialog();
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
        date: new Date().toISOString().split('T')[0],
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
        status: 'Draft'
    });

    const [items, setItems] = useState([
        { productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0 }
    ]);

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
            setFormData(prev => ({ ...prev, dueDate: date.toISOString().split('T')[0] }));
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
                        adjustments: inv.adjustments || []
                    });
                    setItems(inv.items);
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
                            return {
                                productName: item.product_name,
                                quantity: qty,
                                unit: item.unit,
                                pricePerUnit: item.price_per_unit,
                                amount: qty * item.price_per_unit
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

        // Load products and POs for this customer
        const [customerProducts, pos] = await Promise.all([
            productService.getProductsByCustomerId(customerId),
            purchaseOrderService.getPurchaseOrdersByCustomer(customerId)
        ]);
        setAllProducts(customerProducts || []);
        setCustomerPOs(pos || []);
    };

    const handleAddItem = () => {
        setItems([...items, { productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems.length > 0 ? newItems : [{ productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0 }]);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

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
            const submissionData = {
                ...formData,
                customerId: selectedCustomer ? formData.customerId : null,
                customerSnapshot: selectedCustomer ? {
                    id: selectedCustomer.id,
                    code: selectedCustomer.code,
                    name: selectedCustomer.name,
                    taxId: selectedCustomer.taxId,
                    branch: selectedCustomer.branch,
                    phone: selectedCustomer.phone,
                    fax: selectedCustomer.fax,
                    address: selectedCustomer.address,
                    creditTerm: selectedCustomer.creditTerm
                } : formData.customerSnapshot
            };

            if (isEdit) {
                await invoiceService.updateInvoice(id, submissionData, items);
            } else {
                await invoiceService.createInvoice(submissionData, items);
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

            navigate('/dashboard/invoices');
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
                onClick={() => navigate('/dashboard/invoices')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEdit ? 'แก้ไขใบกำกับภาษี' : 'ออกใบกำกับภาษีใหม่'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Draft">แบบร่าง (Draft)</option>
                            <option value="Pending">ใบวางบิล (Pending)</option>
                            <option value="Sent">ส่งแล้ว (Sent)</option>
                            <option value="Paid">ชำระเงินแล้ว (Paid)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{ padding: '0.6rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                            <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลือกลูกค้า</label>
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
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: '#888',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '2px',
                                            zIndex: 2
                                        }}
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
                                    {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.code?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                        <div style={{ padding: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>ไม่พบลูกค้าที่ค้นหา</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลขที่ใบกำกับ</label>
                            <input
                                type="text"
                                value={formData.invoiceNo}
                                onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันที่</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>
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
                                                    return {
                                                        productName: item.product_name,
                                                        quantity: qty,
                                                        unit: item.unit,
                                                        pricePerUnit: item.price_per_unit,
                                                        amount: qty * item.price_per_unit
                                                    };
                                                });
                                                setItems(mappedItems);
                                                calculateTotals();
                                            }
                                        }
                                    }
                                }}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}
                                disabled={!formData.customerId}
                            >
                                <option value="">-- ไม่ระบุ / พิมพ์เลขเอกสารเอง --</option>
                                {customerPOs.map(po => (
                                    <option key={po.id} value={po.id}>{po.po_number}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={formData.referenceNo}
                                onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                                className="glass-panel"
                                placeholder="พิมพ์อ้างอิง PO หรืออื่นๆ"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เครดิต (วัน)</label>
                            <input
                                type="number"
                                value={formData.creditDays}
                                onChange={e => setFormData({ ...formData, creditDays: e.target.value })}
                                className="glass-panel"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันครบกำหนด</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                readOnly
                                className="glass-panel"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-muted)', border: '1px solid var(--border-color)', opacity: 0.7 }}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b' }}>รายการสินค้า</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                        >
                            <Plus size={16} /> เพิ่มรายการ
                        </button>
                    </div>
                    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '40%' }}>รายละเอียดสินค้า</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>จำนวน</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>หน่วย</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', width: '15%' }}>ราคา/หน่วย</th>
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
                                                    value={item.productName}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const prod = allProducts.find(p => p.name === val);
                                                        if (prod) {
                                                            handleItemChange(index, 'productName', prod.name);
                                                            handleItemChange(index, 'unit', prod.unit || '');
                                                            handleItemChange(index, 'pricePerUnit', prod.price || 0);
                                                        } else {
                                                            handleItemChange(index, 'productName', val);
                                                        }
                                                    }}
                                                    className="glass-panel"
                                                    placeholder="เลือกสินค้าหรือพิมพ์เอง..."
                                                    style={{ width: '100%', padding: '0.5rem', paddingRight: '2rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                                />
                                                {item.productName && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleItemChange(index, 'productName', '');
                                                            handleItemChange(index, 'unit', '');
                                                            handleItemChange(index, 'pricePerUnit', 0);
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '8px',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#888',
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
                                                required
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
                                                value={item.pricePerUnit}
                                                onChange={e => handleItemChange(index, 'pricePerUnit', e.target.value)}
                                                className="glass-input"
                                                style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>
                                            <div style={{ marginBottom: '0.2rem', fontSize: '0.9rem', color: '#888' }}>
                                                {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}
                                            </div>
                                            ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>หมายเหตุ</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows="4"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none' }}
                            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                        />
                        <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>ตัวอักษร:</span> {formData.bahtText}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#888' }}>รวมเป็นเงิน (Subtotal)</span>
                                <span style={{ fontSize: '1.1rem' }}>฿{formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#888' }}>หักส่วนลด</span>
                                <input
                                    type="number"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                    className="glass-input"
                                    style={{ width: '120px', padding: '0.4rem', textAlign: 'right', background: 'var(--bg-main)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#888' }}>ภาษีมูลค่าเพิ่ม (VAT)</span>
                                    <input
                                        type="number"
                                        value={formData.vatRate}
                                        onChange={e => setFormData({ ...formData, vatRate: e.target.value })}
                                        className="glass-input"
                                        style={{ width: '50px', padding: '0.2rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                                    />
                                    <span style={{ color: '#888' }}>%</span>
                                </div>
                                <span>฿{formData.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Dynamic Adjustments */}
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>รายการปรับปรุงพิเศษ (บวก/ลบ)</span>
                                <button type="button" onClick={handleAddAdjustment} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '0.8rem' }}>+ เพิ่มช่อง</button>
                            </div>
                            {formData.adjustments?.map((adj, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={adj.label}
                                        onChange={e => handleAdjustmentChange(idx, 'label', e.target.value)}
                                        placeholder="เช่น ค่าขนส่ง"
                                        className="glass-panel"
                                        style={{ flex: 2, padding: '0.3rem', fontSize: '0.85rem', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                    />
                                    <input
                                        type="number"
                                        value={adj.amount}
                                        onChange={e => handleAdjustmentChange(idx, 'amount', e.target.value)}
                                        className="glass-panel"
                                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.85rem', textAlign: 'right', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                    />
                                    <button type="button" onClick={() => handleRemoveAdjustment(idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>จำนวนเงินรวมทั้งสิ้น</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--success)' }}>
                                ฿{formData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default InvoiceFormPage;
