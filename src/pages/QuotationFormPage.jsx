import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, CheckCircle, FileText, Printer, X, ChevronDown, ChevronUp, FolderPlus, Calculator } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useDialog } from '../contexts/DialogContext';

// Safe formula evaluator: supports +, -, *, /, parentheses, and numbers
const evaluateFormula = (expr) => {
    if (!expr || typeof expr !== 'string') return 0;
    const sanitized = expr.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    // Only allow digits, operators, parentheses, and decimal points
    if (!/^[\d+\-*/().]+$/.test(sanitized)) return 0;
    // Prevent empty parentheses or double operators
    if (/\(\)/.test(sanitized) || /[+\-*/]{2,}/.test(sanitized)) return 0;
    try {
        const result = new Function('return ' + sanitized)();
        return isFinite(result) ? Math.round((result + Number.EPSILON) * 100) / 100 : 0;
    } catch {
        return 0;
    }
};

const QuotationFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useDialog();
    const isEdit = !!id;
    const [activeTab, setActiveTab] = useState('quotation'); // 'quotation' or 'costing'

    const [isLoading, setIsLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    // Customer search dropdown states
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [formData, setFormData] = useState({
        quotationNo: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        attnName: '',
        validityDays: 15,
        paymentCondition: 'สด',
        deliveryTime: 'FOLLOW TO P/O',
        notes: '',
        subtotal: 0,
        discount: 0,
        vatRate: 7,
        vatAmount: 0,
        grandTotal: 0,
        bahtText: '',
        status: 'Draft',
        costCalculation: {
            sections: [
                {
                    id: Date.now().toString(),
                    name: 'ค่าวัสดุ/อุปกรณ์',
                    collapsed: false,
                    items: [{ name: '', qty: 1, unit: 'ชิ้น', costPerUnit: 0, total: 0, useFormula: false, formula: '' }],
                    subtotal: 0
                }
            ],
            margin: 30,
            totalCost: 0,
            suggestedPrice: 0,
            notes: ''
        }
    });

    const [items, setItems] = useState([
        { productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0 }
    ]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [items, formData.discount, formData.vatRate]);

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
                const qt = await quotationService.getQuotationById(id);
                if (qt) {
                    setFormData({
                        ...qt,
                        date: qt.date
                    });
                    setItems(qt.items && qt.items.length > 0 ? qt.items : [{ productName: '', quantity: 1, unit: '', pricePerUnit: 0, amount: 0 }]);
                    if (qt.customerId) {
                        const customerProducts = await productService.getProductsByCustomerId(qt.customerId);
                        setAllProducts(customerProducts || []);
                    }
                }
            } else {
                const nextNo = await quotationService.getNextQuotationNumber(new Date());
                setFormData(prev => ({ ...prev, quotationNo: nextNo }));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerChange = async (customerId) => {
        if (!customerId) {
            setFormData(prev => ({ ...prev, customerId: '' }));
            setAllProducts([]);
            return;
        }

        const selectedCustomer = customers.find(c => String(c.id) === String(customerId));
        setFormData(prev => ({
            ...prev,
            customerId,
            paymentCondition: parseInt(selectedCustomer?.creditTerm) === 0 ? 'สด' : `${selectedCustomer?.creditTerm} วัน`
        }));

        const customerProducts = await productService.getProductsByCustomerId(customerId);
        setAllProducts(customerProducts || []);
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

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const afterDiscount = subtotal - Number(formData.discount || 0);
        const calculatedVat = afterDiscount * (Number(formData.vatRate || 0) / 100);
        const vatAmount = Math.round((calculatedVat + Number.EPSILON) * 100) / 100;
        const grandTotal = Math.round((afterDiscount + vatAmount + Number.EPSILON) * 100) / 100;

        setFormData(prev => ({
            ...prev,
            subtotal,
            vatAmount,
            grandTotal,
            bahtText: thaiBaht(grandTotal)
        }));
    };

    // ===== Section-based Cost Calculation Handlers =====
    const recalcCostTotals = (sections, margin) => {
        const totalCost = sections.reduce((sum, sec) => {
            const secTotal = sec.items.reduce((s, item) => s + (Number(item.total) || 0), 0);
            return sum + secTotal;
        }, 0);
        const suggestedPrice = totalCost * (1 + ((margin || 0) / 100));
        return { totalCost, suggestedPrice };
    };

    const addCostSection = () => {
        const newSections = [...(formData.costCalculation?.sections || []), {
            id: Date.now().toString(),
            name: 'หมวดใหม่',
            collapsed: false,
            items: [{ name: '', qty: 1, unit: '', costPerUnit: 0, total: 0, useFormula: false, formula: '' }],
            subtotal: 0
        }];
        const margin = formData.costCalculation?.margin || 0;
        const { totalCost, suggestedPrice } = recalcCostTotals(newSections, margin);
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections, totalCost, suggestedPrice }
        }));
    };

    const removeCostSection = (sectionIndex) => {
        const newSections = (formData.costCalculation?.sections || []).filter((_, i) => i !== sectionIndex);
        const margin = formData.costCalculation?.margin || 0;
        const { totalCost, suggestedPrice } = recalcCostTotals(newSections, margin);
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections, totalCost, suggestedPrice }
        }));
    };

    const updateSectionName = (sectionIndex, name) => {
        const newSections = [...(formData.costCalculation?.sections || [])];
        newSections[sectionIndex] = { ...newSections[sectionIndex], name };
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections }
        }));
    };

    const toggleSectionCollapse = (sectionIndex) => {
        const newSections = [...(formData.costCalculation?.sections || [])];
        newSections[sectionIndex] = { ...newSections[sectionIndex], collapsed: !newSections[sectionIndex].collapsed };
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections }
        }));
    };

    const addCostItem = (sectionIndex) => {
        const newSections = [...(formData.costCalculation?.sections || [])];
        newSections[sectionIndex] = {
            ...newSections[sectionIndex],
            items: [...newSections[sectionIndex].items, { name: '', qty: 1, unit: '', costPerUnit: 0, total: 0, useFormula: false, formula: '' }]
        };
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections }
        }));
    };

    const removeCostItem = (sectionIndex, itemIndex) => {
        const newSections = [...(formData.costCalculation?.sections || [])];
        const newItems = newSections[sectionIndex].items.filter((_, i) => i !== itemIndex);
        const subtotal = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        newSections[sectionIndex] = {
            ...newSections[sectionIndex],
            items: newItems.length > 0 ? newItems : [{ name: '', qty: 1, unit: '', costPerUnit: 0, total: 0, useFormula: false, formula: '' }],
            subtotal
        };
        const margin = formData.costCalculation?.margin || 0;
        const { totalCost, suggestedPrice } = recalcCostTotals(newSections, margin);
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections, totalCost, suggestedPrice }
        }));
    };

    const handleCostItemChange = (sectionIndex, itemIndex, field, value) => {
        const newSections = [...(formData.costCalculation?.sections || [])];
        const newItems = [...newSections[sectionIndex].items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };

        // Toggle formula mode
        if (field === 'useFormula') {
            if (value) {
                // Switching to formula: pre-fill formula from current qty * costPerUnit
                const currentTotal = Number(newItems[itemIndex].qty || 0) * Number(newItems[itemIndex].costPerUnit || 0);
                if (!newItems[itemIndex].formula && currentTotal > 0) {
                    newItems[itemIndex].formula = String(currentTotal);
                }
                newItems[itemIndex].total = evaluateFormula(newItems[itemIndex].formula);
            } else {
                // Switching back to simple mode
                newItems[itemIndex].total = Number(newItems[itemIndex].qty || 0) * Number(newItems[itemIndex].costPerUnit || 0);
            }
        } else if (field === 'formula') {
            newItems[itemIndex].total = evaluateFormula(value);
        } else if ((field === 'qty' || field === 'costPerUnit') && !newItems[itemIndex].useFormula) {
            newItems[itemIndex].total = Number(newItems[itemIndex].qty || 0) * Number(newItems[itemIndex].costPerUnit || 0);
        }

        const subtotal = newItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems, subtotal };

        const margin = formData.costCalculation?.margin || 0;
        const { totalCost, suggestedPrice } = recalcCostTotals(newSections, margin);
        setFormData(prev => ({
            ...prev,
            costCalculation: { ...prev.costCalculation, sections: newSections, totalCost, suggestedPrice }
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
        if (!formData.customerId && !formData.customerSnapshot && !customerSearch.trim()) {
            await showAlert('กรุณาเลือกลูกค้าที่มีอยู่ หรือพิมพ์ชื่อลูกค้าใหม่');
            return;
        }
        if (items.length === 0) {
            await showAlert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        setIsLoading(true);
        try {
            const selectedCustomer = customers.find(c => String(c.id) === String(formData.customerId));
            const submissionData = {
                ...formData,
                isGeneratedNumber: !isEdit,
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
                } : (formData.customerSnapshot || { name: customerSearch.trim(), address: '' })
            };

            if (isEdit) {
                await quotationService.updateQuotation(id, submissionData, items);
            } else {
                await quotationService.createQuotation(submissionData, items);
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

            navigate('/dashboard/quotations');
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
                onClick={() => navigate('/dashboard/quotations')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('quotation')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        background: activeTab === 'quotation' ? 'rgba(59, 130, 246, 0.1)' : 'none',
                        border: 'none',
                        borderBottom: activeTab === 'quotation' ? '2px solid #3b82f6' : '2px solid transparent',
                        color: activeTab === 'quotation' ? '#3b82f6' : '#888',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                    }}
                >
                    ใบเสนอราคา
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        background: activeTab === 'costing' ? 'rgba(245, 158, 11, 0.1)' : 'none',
                        border: 'none',
                        borderBottom: activeTab === 'costing' ? '2px solid #f59e0b' : '2px solid transparent',
                        color: activeTab === 'costing' ? '#f59e0b' : '#888',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem'
                    }}
                >
                    คำนวณต้นทุน
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEdit ? 'แก้ไขใบเสนอราคา' : 'ออกใบเสนอราคาใหม่'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
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

                {activeTab === 'quotation' ? (
                    <>
                        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                            {/* ... existing fields ... */}
                            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                                {/* Copying all the fields inside the middle grid for reference, but ensuring we don't break the structure */}
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
                                                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', zIndex: 2 }}
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
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>ATTN. (ถึง)</label>
                                    <input
                                        type="text"
                                        value={formData.attnName}
                                        onChange={e => setFormData({ ...formData, attnName: e.target.value })}
                                        className="glass-input"
                                        placeholder="ชื่อผู้ติดต่อ (ถ้ามี)"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลขที่อ้างอิง (Quotation No.)</label>
                                    <input
                                        type="text"
                                        value={formData.quotationNo}
                                        onChange={e => setFormData({ ...formData, quotationNo: e.target.value })}
                                        required
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันที่เสนอราคา</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        className="glass-input"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>ยืนราคา (วัน)</label>
                                    <input
                                        type="number"
                                        value={formData.validityDays}
                                        onChange={e => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 0 })}
                                        className="glass-panel"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เงื่อนไขชำระเงิน</label>
                                    <input
                                        type="text"
                                        value={formData.paymentCondition}
                                        onChange={e => setFormData({ ...formData, paymentCondition: e.target.value })}
                                        className="glass-panel"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                                <div>
                                     <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>กำหนดส่งของ</label>
                                    <input
                                        type="text"
                                        value={formData.deliveryTime}
                                        onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                                        className="glass-panel"
                                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#3b82f6' }}>รายการสินค้า</h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                                >
                                    <Plus size={16} /> เพิ่มรายการ
                                </button>
                            </div>
                            <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
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
                                                    <input
                                                        type="text"
                                                        value={item.productName}
                                                        onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                                        className="glass-panel"
                                                        placeholder="สินค้า..."
                                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--card-hover)', borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.8rem 1.5rem' }}>
                                                    <input
                                                        type="number"
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
                                                <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right' }}>
                                                    ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '0.8rem' }}>
                                                    <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>หมายเหตุ</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows="4"
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none' }}
                                />
                                <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>ตัวอักษร:</span> {formData.bahtText}
                                </div>
                            </div>

                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#888' }}>รวมเป็นเงิน (Subtotal)</span>
                                        <span style={{ fontSize: '1.1rem' }}>฿{formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                                            <span style={{ color: '#888' }}>VAT ({formData.vatRate}%)</span>
                                        </div>
                                        <span>฿{formData.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>จำนวนเงินรวมทั้งสิ้น</span>
                                    <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--success)' }}>
                                        ฿{formData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div>
                        {/* Section Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} /> คำนวณต้นทุน
                            </h3>
                            <button
                                type="button"
                                onClick={addCostSection}
                                style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}
                            >
                                <FolderPlus size={18} /> เพิ่มหมวดต้นทุน
                            </button>
                        </div>

                        {/* Cost Sections */}
                        {(formData.costCalculation?.sections || []).map((section, sIdx) => {
                            const sectionColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
                            const sColor = sectionColors[sIdx % sectionColors.length];
                            return (
                                <div key={section.id} className="glass-panel" style={{ marginBottom: '1rem', overflow: 'hidden', border: `1px solid ${sColor}22` }}>
                                    {/* Section Header */}
                                    <div style={{ padding: '0.8rem 1.2rem', background: `${sColor}08`, borderBottom: section.collapsed ? 'none' : `1px solid ${sColor}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                            <button type="button" onClick={() => toggleSectionCollapse(sIdx)} style={{ background: 'none', border: 'none', color: sColor, cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                                {section.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                            </button>
                                            <div style={{ width: '4px', height: '20px', background: sColor, borderRadius: '2px' }}></div>
                                            <input
                                                type="text"
                                                value={section.name}
                                                onChange={e => updateSectionName(sIdx, e.target.value)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '600', outline: 'none', flex: 1, padding: '0.2rem' }}
                                                placeholder="ชื่อหมวดต้นทุน..."
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <span style={{ color: sColor, fontWeight: '600', fontSize: '1rem' }}>
                                                ฿{(section.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const ok = await showConfirm(`ลบหมวด "${section.name}" ทั้งหมดหรือไม่?`);
                                                    if (ok) removeCostSection(sIdx);
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section Items */}
                                    {!section.collapsed && (
                                        <div style={{ padding: '0' }}>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <th style={{ padding: '0.6rem 0.8rem', color: '#888', fontWeight: '500', textAlign: 'left', fontSize: '0.85rem' }}>รายละเอียด</th>
                                                            <th colSpan={2} style={{ padding: '0.6rem 0.8rem', color: '#888', fontWeight: '500', textAlign: 'left', fontSize: '0.85rem' }}>จำนวน × ต้นทุน / สูตรคำนวณ</th>
                                                            <th style={{ padding: '0.6rem 0.8rem', color: '#888', fontWeight: '500', textAlign: 'right', fontSize: '0.85rem', width: '120px' }}>รวม</th>
                                                            <th style={{ width: '60px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {section.items.map((item, iIdx) => (
                                                            <tr key={iIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                <td style={{ padding: '0.4rem 0.8rem', width: '35%' }}>
                                                                    <input type="text" value={item.name} onChange={e => handleCostItemChange(sIdx, iIdx, 'name', e.target.value)} placeholder="เช่น เสาเข็ม, ค่าแรงช่าง..." className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                                                                </td>
                                                                <td colSpan={2} style={{ padding: '0.4rem 0.4rem' }}>
                                                                    {item.useFormula ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                            <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>ƒ</span>
                                                                            <input
                                                                                type="text"
                                                                                value={item.formula}
                                                                                onChange={e => handleCostItemChange(sIdx, iIdx, 'formula', e.target.value)}
                                                                                placeholder="เช่น 174/8*29 หรือ 500000/100000"
                                                                                className="glass-input"
                                                                                style={{ width: '100%', padding: '0.4rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'monospace' }}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                            <input type="number" value={item.qty} onChange={e => handleCostItemChange(sIdx, iIdx, 'qty', e.target.value)} className="glass-input" placeholder="จำนวน" style={{ width: '70px', padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                                                                            <input type="text" value={item.unit} onChange={e => handleCostItemChange(sIdx, iIdx, 'unit', e.target.value)} placeholder="หน่วย" className="glass-input" style={{ width: '60px', padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                                                                            <span style={{ color: '#888', fontSize: '0.9rem' }}>×</span>
                                                                            <input type="number" value={item.costPerUnit} onChange={e => handleCostItemChange(sIdx, iIdx, 'costPerUnit', e.target.value)} className="glass-input" placeholder="ต้นทุน" style={{ width: '100px', padding: '0.4rem', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '0.4rem 0.8rem', textAlign: 'right', fontWeight: '500', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                                                    ฿{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '0.4rem', display: 'flex', gap: '2px', alignItems: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCostItemChange(sIdx, iIdx, 'useFormula', !item.useFormula)}
                                                                        title={item.useFormula ? 'สลับเป็น จำนวน×ต้นทุน' : 'สลับเป็นสูตรคำนวณ'}
                                                                        style={{ background: item.useFormula ? 'rgba(245, 158, 11, 0.15)' : 'none', border: item.useFormula ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent', color: item.useFormula ? '#f59e0b' : '#888', cursor: 'pointer', padding: '3px', display: 'flex', borderRadius: '4px' }}
                                                                    >
                                                                        <Calculator size={14} />
                                                                    </button>
                                                                    <button type="button" onClick={() => removeCostItem(sIdx, iIdx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px', display: 'flex' }}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ padding: '0.5rem 0.8rem', display: 'flex', justifyContent: 'flex-start' }}>
                                                <button type="button" onClick={() => addCostItem(sIdx)} style={{ background: 'none', border: '1px dashed var(--border-color)', color: '#888', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Plus size={14} /> เพิ่มรายการ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Summary */}
                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                {/* Section subtotals breakdown */}
                                {(formData.costCalculation?.sections || []).map((section, sIdx) => {
                                    const sectionColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
                                    const sColor = sectionColors[sIdx % sectionColors.length];
                                    return (
                                        <div key={section.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sColor }}></div>
                                                {section.name}
                                            </span>
                                            <span>฿{(section.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                        <span style={{ fontWeight: '600' }}>รวมต้นทุนทั้งหมด:</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>฿{(formData.costCalculation?.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                        <span style={{ color: '#888' }}>กำไรที่ต้องการ (%):</span>
                                        <input
                                            type="number"
                                            value={formData.costCalculation?.margin || 0}
                                            onChange={e => {
                                                const margin = Number(e.target.value);
                                                const sections = formData.costCalculation?.sections || [];
                                                const { totalCost, suggestedPrice } = recalcCostTotals(sections, margin);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    costCalculation: { ...prev.costCalculation, margin, totalCost, suggestedPrice }
                                                }));
                                            }}
                                            className="glass-input"
                                            style={{ width: '80px', padding: '0.4rem', textAlign: 'right', background: 'var(--bg-main)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                                        <span style={{ fontWeight: '600', color: '#3b82f6' }}>ราคาแนะนำขาย:</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                            ฿{(formData.costCalculation?.suggestedPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '0.3rem' }}>หมายเหตุต้นทุน:</label>
                                    <textarea
                                        value={formData.costCalculation?.notes || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, costCalculation: { ...prev.costCalculation, notes: e.target.value } }))}
                                        rows="2"
                                        className="glass-input"
                                        placeholder="เช่น อย่าให้ต่ำกว่า 50%, ราคาเหล็กอาจปรับขึ้น..."
                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', borderRadius: '6px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px dashed #3b82f6', width: '100%' }}>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#888' }}>
                                        * ระบบจะนำราคาแนะนำขายไปใส่ในรายการสินค้าแรกของใบเสนอราคา
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const price = formData.costCalculation?.suggestedPrice || 0;
                                            const newItems = [...items];
                                            if (newItems.length > 0) {
                                                newItems[0].pricePerUnit = Math.round(price / (newItems[0].quantity || 1) * 100) / 100;
                                                newItems[0].amount = price;
                                            }
                                            setItems(newItems);
                                            setActiveTab('quotation');
                                            showAlert('นำราคาแนะนำไปใช้ในใบเสนอราคาเรียบร้อยแล้ว');
                                        }}
                                        style={{ width: '100%', padding: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <CheckCircle size={18} /> นำราคาไปใช้ในใบเสนอราคา
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default QuotationFormPage;
