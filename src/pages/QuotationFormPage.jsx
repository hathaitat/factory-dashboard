import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Search, CheckCircle, FileText, Printer, X, ChevronDown, ChevronUp, FolderPlus, Calculator, User } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

// Safe formula evaluator using recursive descent parser (no eval/new Function)
const evaluateFormula = (expr) => {
    if (!expr || typeof expr !== 'string') return 0;
    const sanitized = expr.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[\d+\-*/().]+$/.test(sanitized)) return 0;

    let pos = 0;
    const peek = () => sanitized[pos];
    const consume = () => sanitized[pos++];

    // Grammar: expression = term (('+' | '-') term)*
    const parseExpression = () => {
        let left = parseTerm();
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseTerm();
            left = op === '+' ? left + right : left - right;
        }
        return left;
    };

    // term = factor (('*' | '/') factor)*
    const parseTerm = () => {
        let left = parseFactor();
        while (peek() === '*' || peek() === '/') {
            const op = consume();
            const right = parseFactor();
            left = op === '*' ? left * right : (right !== 0 ? left / right : 0);
        }
        return left;
    };

    // factor = number | '(' expression ')'
    const parseFactor = () => {
        if (peek() === '(') {
            consume(); // '('
            const val = parseExpression();
            if (peek() === ')') consume(); // ')'
            return val;
        }
        let numStr = '';
        // Handle leading minus for negative numbers
        if (peek() === '-') numStr += consume();
        while (pos < sanitized.length && (/\d/.test(peek()) || peek() === '.')) {
            numStr += consume();
        }
        return parseFloat(numStr) || 0;
    };

    try {
        const result = parseExpression();
        return isFinite(result) ? Math.round((result + Number.EPSILON) * 100) / 100 : 0;
    } catch {
        return 0;
    }
};

const QuotationFormPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showConfirm, showToast } = useDialog();
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
        date: getLocalDateString(),
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

        // Proactive: Show customer quotation note immediately
        if (selectedCustomer?.quotationNote) {
            showToast(`📌 หมายเหตุใบเสนอราคา: ${selectedCustomer.quotationNote}`, 8000);
        }

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
            const currentUser = user;
            const operatorName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const submissionData = {
                ...formData,
                createdBy: isEdit ? (formData.createdBy || operatorName) : operatorName,
                updatedBy: operatorName,
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

    if (isLoading && !customers.length) return <div className="p-8 text-textMuted">กำลังโหลด...</div>;

    return (
        <div className="px-4 pb-8">
            <button
                onClick={() => navigate('/dashboard/quotations')}
                className="bg-transparent border-none text-gray-400 cursor-pointer mb-6 flex items-center gap-2"
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div className="mb-8 border-b border-border" style={{ display: 'flex', gap: '1.5rem', padding: '0 0.5rem' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('quotation')}
                    className="bg-transparent border-none cursor-pointer font-bold text-base" style={{ padding: '0.75rem 0.5rem', borderBottom: activeTab === 'quotation' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'quotation' ? '#3b82f6' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.2s', opacity: activeTab === 'quotation' ? 1 : 0.7 }}
                >
                    <FileText size={18} /> ใบเสนอราคา (Quotation)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    className="bg-transparent border-none cursor-pointer font-bold text-base" style={{ padding: '0.75rem 0.5rem', borderBottom: activeTab === 'costing' ? '3px solid #f59e0b' : '3px solid transparent', color: activeTab === 'costing' ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.2s', opacity: activeTab === 'costing' ? 1 : 0.7 }}
                >
                    <Calculator size={18} /> การคำนวณต้นทุน (Costing)
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>
                        {isEdit ? 'แก้ไขใบเสนอราคา' : 'ออกใบเสนอราคาใหม่'}
                    </h1>
                    <div className="flex gap-4">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input px-4 py-2.5 bg-main rounded-lg text-main border border-border"
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
                            className="text-white border-none rounded-lg font-medium cursor-pointer flex items-center gap-2" style={{ padding: '0.6rem 1.5rem', background: '#3b82f6' }}
                        >
                            <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                {activeTab === 'quotation' ? (
                    <>
                        <div className="glass-panel p-8 mb-6">
                            {/* ... existing fields ... */}
                            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                                {/* Copying all the fields inside the middle grid for reference, but ensuring we don't break the structure */}
                                <div className="relative">
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>เลือกลูกค้า</label>
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
                                                className="bg-transparent border-none text-gray-400 cursor-pointer absolute" style={{ right: '12px', display: 'flex', alignItems: 'center', zIndex: 2 }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {showCustomerDropdown && (
                                        <div className="bg-cardHover border border-border rounded-lg absolute" style={{ top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 50, marginTop: '0.2rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
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
                                                    className="p-2.5 cursor-pointer border-b border-border text-main"
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {c.name} <span className="text-textMuted text-sm">({c.code})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>ATTN. (ถึง)</label>
                                    <input
                                        type="text"
                                        value={formData.attnName}
                                        onChange={e => setFormData({ ...formData, attnName: e.target.value })}
                                        placeholder="ชื่อผู้ติดต่อ (ถ้ามี)"
                                        className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>เลขที่อ้างอิง (Quotation No.)</label>
                                    <input
                                        type="text"
                                        value={formData.quotationNo}
                                        onChange={e => setFormData({ ...formData, quotationNo: e.target.value })}
                                        required
                                        className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>วันที่เสนอราคา</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>ยืนราคา (วัน)</label>
                                    <input
                                        type="number"
                                        value={formData.validityDays}
                                        onChange={e => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 0 })}
                                        className="glass-panel w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>เงื่อนไขชำระเงิน</label>
                                    <input
                                        type="text"
                                        value={formData.paymentCondition}
                                        onChange={e => setFormData({ ...formData, paymentCondition: e.target.value })}
                                        className="glass-panel w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>กำหนดส่งของ</label>
                                    <input
                                        type="text"
                                        value={formData.deliveryTime}
                                        onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                                        className="glass-panel w-full p-2.5 bg-main rounded-lg text-main border border-border"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel mb-6 overflow-hidden p-0">
                            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                                <h3 className="m-0 text-lg text-blue-500">รายการสินค้า</h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-blue-500 cursor-pointer text-sm bg-blue-500/10 px-3 py-1.5" style={{ border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                    <Plus size={16} /> เพิ่มรายการ
                                </button>
                            </div>
                            <div className="table-responsive-wrapper overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border text-left">
                                            <th className="px-6 py-4 text-gray-400 font-medium" style={{ width: '40%' }}>รายละเอียดสินค้า</th>
                                            <th className="px-6 py-4 text-gray-400 font-medium" style={{ width: '15%' }}>จำนวน</th>
                                            <th className="px-6 py-4 text-gray-400 font-medium" style={{ width: '15%' }}>หน่วย</th>
                                            <th className="px-6 py-4 text-gray-400 font-medium" style={{ width: '15%' }}>ราคา/หน่วย</th>
                                            <th className="px-6 py-4 text-gray-400 font-medium text-right" style={{ width: '15%' }}>จำนวนเงิน</th>
                                            <th className="p-4" style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index} className="border-b border-border">
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.productName}
                                                        onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                                        placeholder="สินค้า..."
                                                        className="glass-panel w-full p-2 bg-cardHover rounded text-main border border-border"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
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
                                                        className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.pricePerUnit}
                                                        onChange={e => handleItemChange(index, 'pricePerUnit', e.target.value)}
                                                        className="glass-input w-full p-2 bg-cardHover rounded text-main border border-border"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    ฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-3">
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="bg-transparent border-none cursor-pointer" style={{ color: '#f87171' }}>
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
                            <div className="glass-panel p-6">
                                <label className="mb-2 text-gray-400 text-sm" style={{ display: 'block' }}>หมายเหตุ</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows="4"
                                    className="glass-input w-full p-2.5 bg-main rounded-lg text-main border border-border" style={{ resize: 'none' }}
                                />
                                <div className="mt-4 p-3 bg-main rounded-lg text-textMuted text-sm">
                                    <span className="text-main font-medium">ตัวอักษร:</span> {formData.bahtText}
                                </div>
                            </div>

                            <div className="glass-panel p-6">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">รวมเป็นเงิน (Subtotal)</span>
                                        <span className="text-lg">฿{formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">หักส่วนลด</span>
                                        <input
                                            type="number"
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                            className="glass-input p-1.5 text-right bg-main rounded text-main border border-border" style={{ width: '120px' }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">VAT ({formData.vatRate}%)</span>
                                        </div>
                                        <span>฿{formData.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-between items-center" style={{ padding: '1.5rem 0', borderTop: '2px solid #e2e8f0', background: 'linear-gradient(to right, transparent, rgba(16, 185, 129, 0.05))', paddingRight: '1rem', borderRadius: '0 0 12px 12px' }}>
                                    <div className="text-right" style={{ flex: 1 }}>
                                        <div className="text-base font-semibold text-main">จำนวนเงินรวมทั้งสิ้น</div>
                                        <div className="text-xs text-textMuted" style={{ fontWeight: '400' }}>(Grand Total)</div>
                                    </div>
                                    <div className="text-right" style={{ marginLeft: '2rem' }}>
                                        <span className="text-emerald-500" style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                                            ฿{formData.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div>
                        {/* Section Header */}
                        <div className="mb-6 flex justify-between items-center">
                            <h3 className="m-0 text-amber-500 flex items-center gap-2">
                                <FileText size={20} /> คำนวณต้นทุน
                            </h3>
                            <button
                                type="button"
                                onClick={addCostSection}
                                className="text-amber-500 px-4 py-2 cursor-pointer font-medium" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
                                        <div className="flex items-center gap-2" style={{ flex: 1 }}>
                                            <button type="button" onClick={() => toggleSectionCollapse(sIdx)} className="bg-transparent border-none cursor-pointer" style={{ color: sColor, padding: '2px', display: 'flex' }}>
                                                {section.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                            </button>
                                            <div style={{ width: '4px', height: '20px', background: sColor, borderRadius: '2px' }}></div>
                                            <input
                                                type="text"
                                                value={section.name}
                                                onChange={e => updateSectionName(sIdx, e.target.value)}
                                                className="bg-transparent border-none text-main text-base font-semibold outline-none" style={{ flex: 1, padding: '0.2rem' }}
                                                placeholder="ชื่อหมวดต้นทุน..."
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-base" style={{ color: sColor }}>
                                                ฿{(section.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const ok = await showConfirm(`ลบหมวด "${section.name}" ทั้งหมดหรือไม่?`);
                                                    if (ok) removeCostSection(sIdx);
                                                }}
                                                className="bg-transparent border-none cursor-pointer" style={{ color: '#f87171', padding: '4px', display: 'flex' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section Items */}
                                    {!section.collapsed && (
                                        <div className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-border">
                                                            <th className="text-gray-400 font-medium text-left text-sm" style={{ padding: '0.6rem 0.8rem' }}>รายละเอียด</th>
                                                            <th colSpan={2} className="text-gray-400 font-medium text-left text-sm" style={{ padding: '0.6rem 0.8rem' }}>จำนวน × ต้นทุน / สูตรคำนวณ</th>
                                                            <th className="text-gray-400 font-medium text-right text-sm" style={{ padding: '0.6rem 0.8rem', width: '120px' }}>รวม</th>
                                                            <th style={{ width: '60px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {section.items.map((item, iIdx) => (
                                                            <tr key={iIdx} className="border-b border-border">
                                                                <td className="px-3 py-1.5" style={{ width: '35%' }}>
                                                                    <input type="text" value={item.name} onChange={e => handleCostItemChange(sIdx, iIdx, 'name', e.target.value)} placeholder="เช่น เสาเข็ม, ค่าแรงช่าง..." className="glass-input w-full p-1.5 bg-main rounded border border-border text-main text-sm" />
                                                                </td>
                                                                <td colSpan={2} style={{ padding: '0.4rem 0.4rem' }}>
                                                                    {item.useFormula ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-amber-500 text-xs font-semibold whitespace-nowrap">ƒ</span>
                                                                            <input
                                                                                type="text"
                                                                                value={item.formula}
                                                                                onChange={e => handleCostItemChange(sIdx, iIdx, 'formula', e.target.value)}
                                                                                placeholder="เช่น 174/8*29 หรือ 500000/100000"
                                                                                className="glass-input w-full p-1.5 rounded text-main text-sm font-mono" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1">
                                                                            <input type="number" value={item.qty} onChange={e => handleCostItemChange(sIdx, iIdx, 'qty', e.target.value)} placeholder="จำนวน" className="glass-input p-1.5 bg-main rounded border border-border text-main text-sm" style={{ width: '70px' }} />
                                                                            <input type="text" value={item.unit} onChange={e => handleCostItemChange(sIdx, iIdx, 'unit', e.target.value)} placeholder="หน่วย" className="glass-input p-1.5 bg-main rounded border border-border text-main text-sm" style={{ width: '60px' }} />
                                                                            <span className="text-gray-400 text-sm">×</span>
                                                                            <input type="number" value={item.costPerUnit} onChange={e => handleCostItemChange(sIdx, iIdx, 'costPerUnit', e.target.value)} placeholder="ต้นทุน" className="glass-input p-1.5 bg-main rounded border border-border text-main text-sm" style={{ width: '100px' }} />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="text-right font-medium text-sm px-3 py-1.5 whitespace-nowrap">
                                                                    ฿{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="p-1.5" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCostItemChange(sIdx, iIdx, 'useFormula', !item.useFormula)}
                                                                        title={item.useFormula ? 'สลับเป็น จำนวน×ต้นทุน' : 'สลับเป็นสูตรคำนวณ'}
                                                                        className="cursor-pointer rounded" style={{ background: item.useFormula ? 'rgba(245, 158, 11, 0.15)' : 'none', border: item.useFormula ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent', color: item.useFormula ? '#f59e0b' : '#888', padding: '3px', display: 'flex' }}
                                                                    >
                                                                        <Calculator size={14} />
                                                                    </button>
                                                                    <button type="button" onClick={() => removeCostItem(sIdx, iIdx)} className="bg-transparent border-none cursor-pointer" style={{ color: '#f87171', padding: '3px', display: 'flex' }}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ padding: '0.5rem 0.8rem', display: 'flex', justifyContent: 'flex-start' }}>
                                                <button type="button" onClick={() => addCostItem(sIdx)} className="bg-transparent text-gray-400 rounded cursor-pointer text-sm flex items-center gap-1" style={{ border: '1px dashed var(--border-color)', padding: '0.3rem 0.8rem' }}>
                                                    <Plus size={14} /> เพิ่มรายการ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Summary */}
                        <div className="grid-mobile-stack mt-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="glass-panel p-6">
                                {/* Section subtotals breakdown */}
                                {(formData.costCalculation?.sections || []).map((section, sIdx) => {
                                    const sectionColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
                                    const sColor = sectionColors[sIdx % sectionColors.length];
                                    return (
                                        <div key={section.id} className="mb-2 text-sm" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-gray-400" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sColor }}></div>
                                                {section.name}
                                            </span>
                                            <span>฿{(section.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                        <span className="font-semibold">รวมต้นทุนทั้งหมด:</span>
                                        <span className="text-xl font-bold">฿{(formData.costCalculation?.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    <div className="flex justify-between items-center" style={{ marginBottom: '0.8rem' }}>
                                        <span className="text-gray-400">กำไรที่ต้องการ (%):</span>
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
                                            className="glass-input p-1.5 text-right bg-main rounded border border-border text-main" style={{ width: '80px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                                        <span className="font-semibold text-blue-500">ราคาแนะนำขาย:</span>
                                        <span className="text-2xl font-bold text-blue-500">
                                            ฿{(formData.costCalculation?.suggestedPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="mt-4">
                                    <label className="text-gray-400 text-sm" style={{ display: 'block', marginBottom: '0.3rem' }}>หมายเหตุต้นทุน:</label>
                                    <textarea
                                        value={formData.costCalculation?.notes || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, costCalculation: { ...prev.costCalculation, notes: e.target.value } }))}
                                        rows="2"
                                        placeholder="เช่น อย่าให้ต่ำกว่า 50%, ราคาเหล็กอาจปรับขึ้น..."
                                        className="glass-input w-full p-2 bg-main text-main border border-border text-sm" style={{ borderRadius: '6px', resize: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <div className="p-6 w-full rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed #3b82f6' }}>
                                    <p className="mb-4 text-sm text-gray-400">
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
                                        className="w-full p-3 text-white border-none rounded-lg cursor-pointer font-semibold" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <CheckCircle size={18} /> นำราคาไปใช้ในใบเสนอราคา
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/quotations')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 text-white border-none rounded-lg font-medium cursor-pointer flex items-center gap-2" style={{ background: '#3b82f6' }}
                    >
                        <Save size={18} /> {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>

                {isEdit && (
                    <div className="glass-panel p-5 text-textMuted text-sm flex flex-col gap-2 mt-6">
                        {formData.createdBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{formData.createdBy}</span>
                            </div>
                        )}
                        {formData.updatedBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{formData.updatedBy}</span>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};

export default QuotationFormPage;
