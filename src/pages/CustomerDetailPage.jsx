import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User, Building, Calendar, Package, Plus, X, History, FileText, ShoppingCart, ChevronDown, ChevronUp, Printer, List, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { invoiceService } from '../services/invoiceService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();
    const [customer, setCustomer] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');

    // History tab state
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState({});

    // Product History tab state
    const [productHistoryData, setProductHistoryData] = useState([]);
    const [isLoadingProductHistory, setIsLoadingProductHistory] = useState(false);
    const [expandedProductMonths, setExpandedProductMonths] = useState({});

    // Product Form State
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', unit: '', price: '', sku: '' });
    const [isSavingProduct, setIsSavingProduct] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const customerData = await customerService.getCustomerById(id);
            if (customerData) {
                setCustomer(customerData);
                const productsData = await productService.getProductsByCustomerId(id);
                setProducts(productsData || []);
            } else {
                navigate('/dashboard/customers');
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load history when tab changes
    useEffect(() => {
        if (activeTab === 'history' && historyData.length === 0) {
            loadHistory();
        } else if (activeTab === 'product_history' && productHistoryData.length === 0) {
            loadProductHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            // Fetch all POs and Invoices for this customer efficiently
            const [allPOs, customerInvoices] = await Promise.all([
                purchaseOrderService.getPurchaseOrdersByCustomer(id),
                invoiceService.getInvoicesByCustomer(id)
            ]);

            // Group by month
            const monthlyMap = {};

            // Process POs
            (allPOs || []).forEach(po => {
                if (po.status === 'Cancelled') return;
                const date = new Date(po.issue_date || po.created_at);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap[key]) {
                    monthlyMap[key] = { month: key, pos: [], invoices: [], totalPOAmount: 0, totalInvAmount: 0 };
                }
                monthlyMap[key].pos.push(po);
                monthlyMap[key].totalPOAmount += Number(po.grand_total || 0);
            });

            // Process Invoices
            (customerInvoices || []).forEach(inv => {
                if (inv.status === 'Cancelled') return;
                const date = new Date(inv.date || inv.createdAt);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap[key]) {
                    monthlyMap[key] = { month: key, pos: [], invoices: [], totalPOAmount: 0, totalInvAmount: 0 };
                }
                monthlyMap[key].invoices.push(inv);
                monthlyMap[key].totalInvAmount += Number(inv.grandTotal || 0);
            });

            // Sort by month descending
            const sorted = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));
            setHistoryData(sorted);

            // Auto-expand first month
            if (sorted.length > 0) {
                setExpandedMonths({ [sorted[0].month]: true });
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const loadProductHistory = async () => {
        setIsLoadingProductHistory(true);
        try {
            const items = await invoiceService.getInvoiceItemsByCustomer(id);

            // Group by month
            const monthlyMap = {};

            items.forEach(item => {
                if (!item.date) return;
                const date = new Date(item.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = {
                        month: monthKey,
                        products: {},
                        totalAmount: 0,
                        totalQuantity: 0
                    };
                }

                // Group by product name AND unit price to accurately show price per unit
                const prodKey = `${item.productName || 'Unknown Product'}_${item.unitPrice}`;
                if (!monthlyMap[monthKey].products[prodKey]) {
                    monthlyMap[monthKey].products[prodKey] = {
                        name: item.productName || 'Unknown Product',
                        quantity: 0,
                        unitPrice: item.unitPrice,
                        unit: item.unit || '',
                        totalPrice: 0
                    };
                }

                monthlyMap[monthKey].products[prodKey].quantity += item.quantity;
                monthlyMap[monthKey].products[prodKey].totalPrice += item.totalPrice;

                monthlyMap[monthKey].totalAmount += item.totalPrice;
                monthlyMap[monthKey].totalQuantity += item.quantity;
            });

            // Convert products map to array and sort
            const sortedData = Object.values(monthlyMap).map(m => ({
                ...m,
                products: Object.values(m.products).sort((a, b) => b.totalPrice - a.totalPrice)
            })).sort((a, b) => b.month.localeCompare(a.month)); // Sort months descending

            setProductHistoryData(sortedData);

            if (sortedData.length > 0) {
                setExpandedProductMonths({ [sortedData[0].month]: true });
            }
        } catch (error) {
            console.error('Error loading product history:', error);
        } finally {
            setIsLoadingProductHistory(false);
        }
    };

    const exportProductHistoryToExcel = () => {
        if (!productHistoryData.length) return;

        const wb = XLSX.utils.book_new();

        // Prepare data for export
        const data = [];
        productHistoryData.forEach(month => {
            month.products.forEach(p => {
                data.push({
                    'เดือน': formatMonthName(month.month),
                    'ชื่อสินค้า': p.name,
                    'จำนวน': p.quantity,
                    'หน่วย': p.unit,
                    'ราคา/หน่วย': p.unitPrice,
                    'มูลค่ารวม': p.totalPrice
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Product History");
        XLSX.writeFile(wb, `ProductHistory_${customer.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportMonthlyProductToExcel = (monthData) => {
        const wb = XLSX.utils.book_new();
        const data = monthData.products.map(p => ({
            'ชื่อสินค้า': p.name,
            'จำนวน': p.quantity,
            'หน่วย': p.unit,
            'ราคา/หน่วย': p.unitPrice,
            'มูลค่ารวม': p.totalPrice
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, monthData.month);
        XLSX.writeFile(wb, `ProductHistory_${customer.name}_${monthData.month}.xlsx`);
    };

    const exportDocumentHistoryToExcel = () => {
        if (!historyData.length) return;

        const data = [];
        historyData.forEach(month => {
            // Add POs
            month.pos.forEach(po => {
                data.push({
                    'เดือน': formatMonthName(month.month),
                    'ประเภท': 'PO',
                    'เลขที่เอกสาร': po.po_number,
                    'วันที่': new Date(po.issue_date).toLocaleDateString('th-TH'),
                    'สถานะ': po.status,
                    'จำนวนเงิน': po.grand_total
                });
            });
            // Add Invoices
            month.invoices.forEach(inv => {
                data.push({
                    'เดือน': formatMonthName(month.month),
                    'ประเภท': 'INV',
                    'เลขที่เอกสาร': inv.invoiceNo,
                    'วันที่': new Date(inv.date).toLocaleDateString('th-TH'),
                    'สถานะ': inv.status,
                    'จำนวนเงิน': inv.grandTotal
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Document History");
        XLSX.writeFile(wb, `DocumentHistory_${customer.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleMonth = (month) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    const toggleProductMonth = (month) => {
        setExpandedProductMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    const formatMonthName = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        return `${thaiMonths[parseInt(month)]} ${parseInt(year) + 543}`;
    };

    const handleDeleteCustomer = async () => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้? การกระทำนี้ไม่สามารถย้อนกลับได้');
        if (confirmed) {
            const success = await customerService.deleteCustomer(id);
            if (success) {
                navigate('/dashboard/customers');
            } else {
                await showAlert('ไม่สามารถลบลูกค้าได้');
            }
        }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSavingProduct(true);
        try {
            if (editingProduct) {
                const updated = await productService.updateProduct(editingProduct.id, {
                    name: newProduct.name,
                    sku: newProduct.sku || null,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
            } else {
                const product = await productService.createProduct({
                    customerId: id,
                    name: newProduct.name,
                    sku: newProduct.sku || null,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts([...products, product]);
            }

            setNewProduct({ name: '', unit: '', price: '', sku: '' });
            setIsAddingProduct(false);
            setEditingProduct(null);
        } catch (error) {
            await showAlert('เกิดข้อผิดพลาดในการบันทึกสินค้า');
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setNewProduct({
            name: product.name,
            sku: product.sku || '',
            unit: product.unit || '',
            price: product.price || ''
        });
        setIsAddingProduct(true);
    };

    const handleCancelEdit = () => {
        setIsAddingProduct(false);
        setEditingProduct(null);
        setNewProduct({ name: '', unit: '', price: '', sku: '' });
    };

    const handleDeleteProduct = async (productId, productName) => {
        const confirmed = await showConfirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${productName}"?`);
        if (confirmed) {
            const success = await productService.deleteProduct(productId);
            if (success) {
                setProducts(products.filter(p => p.id !== productId));
            } else {
                await showAlert('เกิดข้อผิดพลาดในการลบสินค้า');
            }
        }
    };

    if (isLoading) return <div className="p-8 text-gray-500">กำลังโหลดข้อมูล...</div>;
    if (!customer) return null;

    return (
        <div className="px-4 pb-8 max-w-5xl mx-auto">
            <button
                onClick={() => navigate('/dashboard/customers')}
                className="flex items-center gap-2 bg-transparent border-none text-gray-500 cursor-pointer mb-4 p-[0]"
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="m-[0] text-3xl font-semibold">{customer.name}</h1>
                    <div className="flex gap-4 mt-2 text-gray-500">
                        <span className="flex items-center gap-1.5 font-mono">
                            #{customer.code || customer.id.toString().padStart(4, '0')}
                        </span>
                        <span>•</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-xl text-[0.85rem] ${customer.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {customer.status === 'Active' ? 'ปกติ' : 'ระงับการใช้งาน'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {hasPermission('customers', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/customers/${id}/edit`)}
                            className="p-[0.6rem 1rem] rounded-lg border border-border bg-card-hover text-main cursor-pointer flex items-center gap-2"
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                    {hasPermission('customers', 'delete') && (
                        <button
                            onClick={handleDeleteCustomer}
                            className="px-4 py-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 cursor-pointer flex items-center gap-2"
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-0 mb-6 border-b-2 border-border">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-3 bg-transparent border-none border-b-2 -mb-0.5 cursor-pointer flex items-center gap-2 text-base transition-all duration-200 ${activeTab === 'info' ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-muted font-normal'}`}
                >
                    <Building size={18} /> ข้อมูลลูกค้า
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 bg-transparent border-none border-b-2 -mb-0.5 cursor-pointer flex items-center gap-2 text-base transition-all duration-200 ${activeTab === 'history' ? 'border-amber-500 text-amber-500 font-semibold' : 'border-transparent text-muted font-normal'}`}
                >
                    <History size={18} /> ประวัติการซื้อ (เอกสาร)
                </button>
                <button
                    onClick={() => setActiveTab('product_history')}
                    className={`px-6 py-3 bg-transparent border-none border-b-2 -mb-0.5 cursor-pointer flex items-center gap-2 text-base transition-all duration-200 ${activeTab === 'product_history' ? 'border-emerald-500 text-emerald-500 font-semibold' : 'border-transparent text-muted font-normal'}`}
                >
                    <List size={18} /> ประวัติการซื้อ (สินค้า)
                </button>
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
                <div className="grid-mobile-stack grid grid-cols-[2fr_1fr] gap-6">
                    <div className="flex flex-col gap-6">
                        {/* General Info */}
                        <div className="glass-panel p-6">
                            <h3 className="mt-[0] mb-6 text-violet-500 flex items-center gap-2">
                                <Building size={20} /> ข้อมูลทั่วไป
                            </h3>
                            <div className="grid-mobile-stack grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                                    <div>{customer.taxId || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">เครดิต (วัน)</label>
                                    <div className="text-emerald-500 font-medium">
                                        {customer.creditTerm === 0 || customer.creditTerm === '0' ? 'สด' : (customer.creditTerm ? `${customer.creditTerm} วัน` : '-')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="glass-panel p-0 overflow-hidden">
                            <div className="p-6 flex justify-between items-center border-b border-border">
                                <h3 className="m-[0] text-amber-500 flex items-center gap-2">
                                    <Package size={20} /> รายการสินค้า (Products)
                                </h3>
                                {hasPermission('customers', 'edit') && !isAddingProduct && (
                                    <button
                                        onClick={() => {
                                            setEditingProduct(null);
                                            setNewProduct({ name: '', unit: '', price: '', sku: '' });
                                            setIsAddingProduct(true);
                                        }}
                                        className="px-3 py-1.5 rounded-md border-none bg-[rgba(245, 158, 11, 0.2)] text-amber-500 cursor-pointer flex items-center gap-1 text-[0.95rem]"
                                    >
                                        <Plus size={16} /> เพิ่มสินค้า
                                    </button>
                                )}
                            </div>

                            {isAddingProduct && (
                                <div className="p-4 bg-card-hover border-b border-border">
                                    <form onSubmit={handleSaveProduct} className="flex gap-4 items-end">
                                        <div className="flex-[2]">
                                            <label className="block text-sm text-gray-500 mb-1">ชื่อสินค้า</label>
                                            <input
                                                type="text"
                                                value={newProduct.name}
                                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                                required
                                                placeholder="ระบุชื่อสินค้า"
                                                className="glass-input w-full p-2.5 bg-main border border-border rounded text-main"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-500 mb-1">รหัส SKU (ถ้ามี)</label>
                                            <input
                                                type="text"
                                                value={newProduct.sku}
                                                onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}

                                                placeholder="SKU-001"
                                                className="glass-input w-full p-2.5 bg-main border border-border rounded text-main"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-500 mb-1">หน่วย</label>
                                            <input
                                                type="text"
                                                value={newProduct.unit}
                                                onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}

                                                placeholder="เช่น ชิ้น"
                                                className="glass-input w-full p-2.5 bg-main border border-border rounded text-main"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm text-gray-500 mb-1">ราคา/หน่วย</label>
                                            <input
                                                type="number"
                                                value={newProduct.price}
                                                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}

                                                placeholder="0.00"
                                                className="glass-input w-full p-2.5 bg-main border border-border rounded text-main"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={!newProduct.name || isSavingProduct}
                                                className="px-5 py-2.5 rounded-lg border-none bg-blue-500 text-white cursor-pointer font-medium hover:bg-blue-600 transition-colors shadow-sm"
                                            >
                                                {isSavingProduct ? '...' : (editingProduct ? 'บันทึก' : 'เพิ่ม')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="px-3 py-2.5 rounded-lg border border-border bg-card text-textMuted hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors shadow-sm"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-6 py-3 text-left text-muted font-medium text-[0.95rem]">รหัส SKU</th>
                                            <th className="px-6 py-3 text-left text-muted font-medium text-[0.95rem]">สินค้า</th>
                                            <th className="px-6 py-3 text-left text-muted font-medium text-[0.95rem]">ราคา/หน่วย</th>
                                            <th className="actions-column text-muted font-medium text-[0.95rem]">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length > 0 ? (
                                            products.map((product) => (
                                                <tr key={product.id} className="border-b border-border opacity-90">
                                                    <td className="px-6 py-3">
                                                        <div className="font-medium text-blue-500">{product.sku || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="font-medium">{product.name}</div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {product.price > 0 ? `฿${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                        <span className="text-gray-500 text-sm ml-1">
                                                            {product.unit && `/ ${product.unit}`}
                                                        </span>
                                                    </td>
                                                    <td className="actions-column">
                                                        <div className="table-actions">
                                                            {hasPermission('customers', 'edit') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEditProduct(product)}
                                                                        className="action-edit"
                                                                        title="แก้ไข"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteProduct(product.id, product.name)}
                                                                        className="action-delete"
                                                                        title="ลบ"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="p-8 text-center text-gray-500 italic">
                                                    ยังไม่มีรายการสินค้า
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Contact Info */}
                        <div className="glass-panel p-6">
                            <h3 className="mt-[0] mb-6 text-blue-500 flex items-center gap-2">
                                <User size={20} /> ข้อมูลการติดต่อ
                            </h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">ผู้ติดต่อ</label>
                                    <div className="font-medium">{customer.contactPerson || '-'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-gray-500" />
                                    <div>{customer.phone || '-'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-500" />
                                    <div>{customer.email || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="glass-panel p-6">
                            <h3 className="mt-[0] mb-6 text-emerald-500 flex items-center gap-2">
                                <MapPin size={20} /> ที่อยู่
                            </h3>
                            <div className="leading-relaxed">
                                {customer.address || '-'}
                            </div>
                        </div>

                        {/* History */}
                        <div className="glass-panel p-6">
                            <h3 className="mt-[0] mb-4 text-gray-500 flex items-center gap-2 text-base">
                                <Calendar size={18} /> ประวัติ
                            </h3>
                            <div className="text-sm text-gray-500 grid gap-2">
                                <div>สร้างเมื่อ: {new Date(customer.createdAt).toLocaleDateString('th-TH')}</div>
                                {customer.createdBy && (
                                    <div className="flex items-center gap-1.5">
                                        <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{customer.createdBy}</span>
                                    </div>
                                )}
                                <div>อัปเดตล่าสุด: {new Date(customer.updatedAt).toLocaleDateString('th-TH')}</div>
                                {customer.updatedBy && (
                                    <div className="flex items-center gap-1.5">
                                        <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{customer.updatedBy}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: History */}
            {activeTab === 'history' && (
                <div>
                    {isLoadingHistory ? (
                        <div className="p-[3rem] text-center text-muted">กำลังโหลดประวัติการซื้อ...</div>
                    ) : historyData.length === 0 ? (
                        <div className="glass-panel p-[3rem] text-center text-muted">
                            <History size={48} className="mb-4" />
                            <div className="text-lg">ยังไม่มีประวัติการซื้อ</div>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid-mobile-stack grid gap-4 mb-6">
                                <div className="glass-panel p-6 text-center bg-[linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05))] border-[1px solid rgba(16, 185, 129, 0.1)]">
                                    <div className="text-muted text-[0.95rem] mb-2 font-medium">ยอดซื้อรวมทั้งหมด</div>
                                    <div className="text-[1.75rem] text-emerald-500">
                                        ฿{historyData.reduce((sum, m) => sum + m.totalInvAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="glass-panel p-6 text-center bg-[linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.05))] border-[1px solid rgba(59, 130, 246, 0.1)]">
                                    <div className="text-muted text-[0.95rem] mb-2 font-medium">จำนวน PO ทั้งหมด</div>
                                    <div className="text-[1.75rem] text-blue-500">
                                        {historyData.reduce((sum, m) => sum + m.pos.length, 0)} <span className="text-base font-medium">ฉบับ</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 text-center bg-[linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.05))] border-[1px solid rgba(245, 158, 11, 0.1)]">
                                    <div className="text-muted text-[0.95rem] mb-2 font-medium">จำนวน INV ทั้งหมด</div>
                                    <div className="text-[1.75rem] text-amber-500">
                                        {historyData.reduce((sum, m) => sum + m.invoices.length, 0)} <span className="text-base font-medium">ฉบับ</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={exportDocumentHistoryToExcel}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-main cursor-pointer text-[0.95rem] font-medium"
                                >
                                    <FileSpreadsheet size={16} color="#10b981" /> Export History (Excel)
                                </button>
                            </div>

                            {/* Monthly breakdown */}
                            <div className="flex flex-col gap-[0.75rem]">
                                {historyData.map(monthData => (
                                    <div key={monthData.month} className="glass-panel overflow-hidden">
                                        {/* Month Header - Clickable */}
                                        <button
                                            onClick={() => toggleMonth(monthData.month)}
                                            className={`w-full px-6 py-4 bg-transparent border-none cursor-pointer flex justify-between items-center text-main ${expandedMonths[monthData.month] ? 'border-b border-border' : 'border-b-0'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    {expandedMonths[monthData.month] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    <span className="font-semibold text-[1.05rem]">{formatMonthName(monthData.month)}</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <span className="text-sm px-2 py-1 rounded-xl bg-[rgba(59, 130, 246, 0.1)] text-blue-500">
                                                        PO: {monthData.pos.length}
                                                    </span>
                                                    <span className="text-sm px-2 py-1 rounded-xl bg-[rgba(245, 158, 11, 0.1)] text-amber-500">
                                                        INV: {monthData.invoices.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-emerald-500 text-lg">
                                                    ฿{monthData.totalInvAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Content */}
                                        {expandedMonths[monthData.month] && (
                                            <div className="p-[1rem 1.5rem]">
                                                {/* PO List */}
                                                {monthData.pos.length > 0 && (
                                                    <div className={`${monthData.invoices.length > 0 ? 'mb-6' : 'mb-0'}`}>
                                                        <div className="text-sm font-semibold text-blue-500 mb-2 flex items-center gap-1.5">
                                                            <ShoppingCart size={14} /> ใบสั่งซื้อ (PO)
                                                        </div>
                                                        {monthData.pos.map(po => (
                                                            <div
                                                                key={po.id}
                                                                onClick={() => window.open(`/dashboard/purchase-orders/${po.id}/edit`, '_blank')}
                                                                className="flex justify-between items-center p-[0.6rem 0.8rem] rounded-md mb-1 bg-main cursor-pointer"
                                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
                                                                onMouseOut={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                                            >
                                                                <div>
                                                                    <span className="font-medium text-blue-500 text-[0.95rem]">{po.po_number}</span>
                                                                    <span className="text-muted text-sm ml-[0.75rem]">
                                                                        {new Date(po.issue_date).toLocaleDateString('th-TH')}
                                                                    </span>
                                                                    <span className={`ml-2 text-[0.75rem] px-1.5 py-0.5 rounded-lg ${po.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : po.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-400/10 text-gray-400'}`}>
                                                                        {po.status}
                                                                    </span>
                                                                </div>
                                                                <span className="font-medium text-[0.95rem]">
                                                                    ฿{Number(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Invoice List */}
                                                {monthData.invoices.length > 0 && (
                                                    <div>
                                                        <div className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-1.5">
                                                            <FileText size={14} /> ใบกำกับภาษี (INV)
                                                        </div>
                                                        {monthData.invoices.map(inv => (
                                                            <div
                                                                key={inv.id}
                                                                onClick={() => window.open(`/dashboard/invoices/${inv.id}/edit`, '_blank')}
                                                                className="flex justify-between items-center p-[0.6rem 0.8rem] rounded-md mb-1 bg-main cursor-pointer"
                                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)'}
                                                                onMouseOut={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                                            >
                                                                <div>
                                                                    <span className="font-medium text-amber-500 text-[0.95rem]">{inv.invoiceNo}</span>
                                                                    <span className="text-muted text-sm ml-[0.75rem]">
                                                                        {new Date(inv.date).toLocaleDateString('th-TH')}
                                                                    </span>
                                                                    <span className={`ml-2 text-[0.75rem] px-1.5 py-0.5 rounded-lg ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : inv.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-400/10 text-gray-400'}`}>
                                                                        {inv.status}
                                                                    </span>
                                                                </div>
                                                                <span className="font-medium text-[0.95rem]">
                                                                    ฿{Number(inv.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Tab: Product History */}
            {activeTab === 'product_history' && (
                <div>
                    {isLoadingProductHistory ? (
                        <div className="p-[3rem] text-center text-muted">กำลังโหลดประวัติการซื้อสินค้า...</div>
                    ) : productHistoryData.length === 0 ? (
                        <div className="glass-panel p-[3rem] text-center text-muted">
                            <List size={48} className="mb-4" />
                            <div className="text-lg">ยังไม่มีประวัติการซื้อสินค้าจากใบกำกับภาษี</div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end gap-4 mb-6">
                                <button
                                    onClick={exportProductHistoryToExcel}
                                    className="p-[0.6rem 1.2rem] rounded-lg border-[1px solid #10b981] bg-[rgba(16, 185, 129, 0.05)] text-emerald-500 cursor-pointer flex items-center gap-2 font-medium"
                                >
                                    <FileSpreadsheet size={18} /> Export Excel
                                </button>
                                <button
                                    onClick={() => window.open(`/dashboard/customers/${id}/print-product-history`, '_blank')}
                                    className="p-[0.6rem 1.2rem] rounded-lg border-[1px solid #3b82f6] bg-[rgba(59, 130, 246, 0.05)] text-blue-500 cursor-pointer flex items-center gap-2 font-medium"
                                >
                                    <Printer size={18} /> พิมพ์รายงานทั้งหมด
                                </button>
                            </div>

                            {/* Monthly product breakdown */}
                            <div className="flex flex-col gap-[0.75rem]">
                                {productHistoryData.map(monthData => (
                                    <div key={monthData.month} className="glass-panel overflow-hidden">
                                        {/* Month Header - Clickable */}
                                        <div
                                            onClick={() => toggleProductMonth(monthData.month)}
                                            className={`w-full px-6 py-4 bg-transparent border-none cursor-pointer flex justify-between items-center text-main ${expandedProductMonths[monthData.month] ? 'border-b border-border' : 'border-b-0'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    {expandedProductMonths[monthData.month] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    <span className="font-semibold text-[1.05rem]">{formatMonthName(monthData.month)}</span>
                                                </div>
                                                <div className="flex gap-[0.75rem] items-center">
                                                    <span className="text-sm px-2 py-1 rounded-xl bg-[rgba(16, 185, 129, 0.1)] text-emerald-500">
                                                        {monthData.products.length} รายการสินค้า
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-[0.75rem]">
                                                <div className="font-semibold text-emerald-500 text-lg mr-2">
                                                    ฿{monthData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        exportMonthlyProductToExcel(monthData);
                                                    }}
                                                    title="Export Excel เดือนนี้"
                                                    className="p-1.5 rounded-md border-[1px solid rgba(16, 185, 129, 0.2)] bg-[rgba(16, 185, 129, 0.05)] text-[var(--success)] cursor-pointer flex items-center"
                                                >
                                                    <FileSpreadsheet size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`/dashboard/customers/${id}/print-product-history?month=${monthData.month}`, '_blank');
                                                    }}
                                                    title="พิมพ์รายงานเดือนนี้"
                                                    className="p-1.5 rounded-md border-[1px solid rgba(59, 130, 246, 0.2)] bg-[rgba(59, 130, 246, 0.05)] text-blue-500 cursor-pointer flex items-center"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Content: Product List Table */}
                                        {expandedProductMonths[monthData.month] && (
                                            <div className="p-0">
                                                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                                                    <table className="w-full text-[0.95rem]">
                                                        <thead>
                                                            <tr className="border-b border-border bg-main">
                                                                <th className="px-6 py-3 text-left text-muted font-medium">ชื่อสินค้า</th>
                                                                <th className="px-6 py-3 text-right text-muted font-medium">จำนวนที่ซื้อรวม</th>
                                                                <th className="px-6 py-3 text-right text-muted font-medium">ราคา/หน่วย</th>
                                                                <th className="px-6 py-3 text-right text-muted font-medium">มูลค่ารวม</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {monthData.products.map((prod, idx) => (
                                                                <tr key={idx} className="border-b border-border">
                                                                    <td className="px-6 py-3 font-medium text-main">
                                                                        {prod.name}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <span className="font-semibold text-blue-500">{prod.quantity.toLocaleString()}</span>
                                                                        <span className="text-muted ml-1 text-sm">{prod.unit}</span>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right text-main">
                                                                        ฿{prod.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-semibold text-emerald-500">
                                                                        ฿{prod.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerDetailPage;
