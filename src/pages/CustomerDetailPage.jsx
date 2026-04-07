import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User, Building, Calendar, Package, Plus, X, History, FileText, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
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

    // Product Form State
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [newProduct, setNewProduct] = useState({ name: '', unit: '', price: '' });
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
        }
    }, [activeTab]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            // Fetch all POs and Invoices for this customer
            const [allPOs, allInvoices] = await Promise.all([
                purchaseOrderService.getPurchaseOrdersByCustomer(id),
                invoiceService.getInvoices()
            ]);

            // Filter invoices for this customer
            const customerInvoices = allInvoices.filter(inv => String(inv.customerId) === String(id));

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

    const toggleMonth = (month) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
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
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
            } else {
                const product = await productService.createProduct({
                    customerId: id,
                    name: newProduct.name,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts([...products, product]);
            }

            setNewProduct({ name: '', unit: '', price: '' });
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
            unit: product.unit || '',
            price: product.price || ''
        });
        setIsAddingProduct(true);
    };

    const handleCancelEdit = () => {
        setIsAddingProduct(false);
        setEditingProduct(null);
        setNewProduct({ name: '', unit: '', price: '' });
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

    if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>กำลังโหลดข้อมูล...</div>;
    if (!customer) return null;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/customers')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    padding: 0
                }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '600' }}>{customer.name}</h1>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: '#888' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace' }}>
                            #{customer.code || customer.id.toString().padStart(4, '0')}
                        </span>
                        <span>•</span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '12px',
                            background: customer.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: customer.status === 'Active' ? '#34d399' : '#f87171',
                            fontSize: '0.85rem',
                        }}>
                            {customer.status === 'Active' ? 'ปกติ' : 'ระงับการใช้งาน'}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasPermission('customers', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/customers/${id}/edit`)}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-hover)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                    {hasPermission('customers', 'delete') && (
                        <button
                            onClick={handleDeleteCustomer}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
                <button
                    onClick={() => setActiveTab('info')}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent',
                        marginBottom: '-2px',
                        color: activeTab === 'info' ? '#3b82f6' : 'var(--text-muted)',
                        fontWeight: activeTab === 'info' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Building size={18} /> ข้อมูลลูกค้า
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'history' ? '2px solid #f59e0b' : '2px solid transparent',
                        marginBottom: '-2px',
                        color: activeTab === 'history' ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: activeTab === 'history' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <History size={18} /> ประวัติการซื้อ
                </button>
            </div>

            {/* Tab: Info */}
            {activeTab === 'info' && (
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* General Info */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={20} /> ข้อมูลทั่วไป
                        </h3>
                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>เลขประจำตัวผู้เสียภาษี</label>
                                <div>{customer.taxId || '-'}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>เครดิต (วัน)</label>
                                <div style={{ color: '#34d399', fontWeight: '500' }}>
                                    {customer.creditTerm === 0 || customer.creditTerm === '0' ? 'สด' : (customer.creditTerm ? `${customer.creditTerm} วัน` : '-')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={20} /> รายการสินค้า (Products)
                            </h3>
                            {hasPermission('customers', 'edit') && !isAddingProduct && (
                                <button
                                    onClick={() => {
                                        setEditingProduct(null);
                                        setNewProduct({ name: '', unit: '', price: '' });
                                        setIsAddingProduct(true);
                                    }}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'rgba(245, 158, 11, 0.2)',
                                        color: '#f59e0b',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Plus size={16} /> เพิ่มสินค้า
                                </button>
                            )}
                        </div>

                        {isAddingProduct && (
                            <div style={{ padding: '1rem', background: 'var(--card-hover)', borderBottom: '1px solid var(--border-color)' }}>
                                <form onSubmit={handleSaveProduct} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>ชื่อสินค้า</label>
                                        <input
                                            type="text"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                            required
                                            className="glass-input"
                                            placeholder="ระบุชื่อสินค้า"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>หน่วย</label>
                                        <input
                                            type="text"
                                            value={newProduct.unit}
                                            onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                                            className="glass-input"
                                            placeholder="เช่น ชิ้น"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>ราคา/หน่วย</label>
                                        <input
                                            type="number"
                                            value={newProduct.price}
                                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                            className="glass-input"
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="submit"
                                            disabled={!newProduct.name || isSavingProduct}
                                            style={{
                                                padding: '0.6rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#f59e0b',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {isSavingProduct ? '...' : (editingProduct ? 'บันทึก' : 'เพิ่ม')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            style={{
                                                padding: '0.6rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color)',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '0.8rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.9rem' }}>สินค้า</th>
                                        <th style={{ padding: '0.8rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.9rem' }}>ราคา/หน่วย</th>
                                        <th style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.9rem' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? (
                                        products.map((product) => (
                                            <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.9 }}>
                                                <td style={{ padding: '0.8rem 1.5rem' }}>
                                                    <div style={{ fontWeight: '500' }}>{product.name}</div>
                                                </td>
                                                <td style={{ padding: '0.8rem 1.5rem' }}>
                                                    {product.price > 0 ? `฿${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '0.3rem' }}>
                                                        {product.unit && `/ ${product.unit}`}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right' }}>
                                                    <div className="table-actions">
                                                    {hasPermission('customers', 'edit') && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditProduct(product)}
                                                                style={{
                                                                    padding: '0.4rem',
                                                                    borderRadius: '4px',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: '#3b82f6',
                                                                    cursor: 'pointer',
                                                                    opacity: 0.8
                                                                }}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                                                style={{
                                                                    padding: '0.4rem',
                                                                    borderRadius: '4px',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: '#f87171',
                                                                    cursor: 'pointer',
                                                                    opacity: 0.8
                                                                }}
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
                                            <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                                ยังไม่มีรายการสินค้า
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
</div>
                    </div>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Contact Info */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={20} /> ข้อมูลการติดต่อ
                        </h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginBottom: '0.3rem' }}>ผู้ติดต่อ</label>
                                <div style={{ fontWeight: '500' }}>{customer.contactPerson || '-'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} style={{ color: '#888' }} />
                                <div>{customer.phone || '-'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} style={{ color: '#888' }} />
                                <div>{customer.email || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={20} /> ที่อยู่
                        </h3>
                        <div style={{ lineHeight: '1.6' }}>
                            {customer.address || '-'}
                        </div>
                    </div>

                    {/* History */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                            <Calendar size={18} /> ประวัติ
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#888', display: 'grid', gap: '0.5rem' }}>
                            <div>สร้างเมื่อ: {new Date(customer.createdAt).toLocaleDateString('th-TH')}</div>
                            <div>อัปเดตล่าสุด: {new Date(customer.updatedAt).toLocaleDateString('th-TH')}</div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Tab: History */}
            {activeTab === 'history' && (
            <div>
                {isLoadingHistory ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดประวัติการซื้อ...</div>
                ) : historyData.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <History size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <div style={{ fontSize: '1.1rem' }}>ยังไม่มีประวัติการซื้อ</div>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>ยอดซื้อรวมทั้งหมด</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                                    ฿{historyData.reduce((sum, m) => sum + m.totalInvAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>จำนวน PO ทั้งหมด</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                    {historyData.reduce((sum, m) => sum + m.pos.length, 0)} ฉบับ
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>จำนวน INV ทั้งหมด</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                                    {historyData.reduce((sum, m) => sum + m.invoices.length, 0)} ฉบับ
                                </div>
                            </div>
                        </div>

                        {/* Monthly breakdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {historyData.map(monthData => (
                                <div key={monthData.month} className="glass-panel" style={{ overflow: 'hidden' }}>
                                    {/* Month Header - Clickable */}
                                    <button
                                        onClick={() => toggleMonth(monthData.month)}
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1.5rem',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            color: 'var(--text-main)',
                                            borderBottom: expandedMonths[monthData.month] ? '1px solid var(--border-color)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {expandedMonths[monthData.month] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>{formatMonthName(monthData.month)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                                    PO: {monthData.pos.length}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                                                    INV: {monthData.invoices.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '600', color: '#10b981', fontSize: '1.1rem' }}>
                                                ฿{monthData.totalInvAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    {expandedMonths[monthData.month] && (
                                        <div style={{ padding: '1rem 1.5rem' }}>
                                            {/* PO List */}
                                            {monthData.pos.length > 0 && (
                                                <div style={{ marginBottom: monthData.invoices.length > 0 ? '1.5rem' : 0 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <ShoppingCart size={14} /> ใบสั่งซื้อ (PO)
                                                    </div>
                                                    {monthData.pos.map(po => (
                                                        <div
                                                            key={po.id}
                                                            onClick={() => window.open(`/dashboard/purchase-orders/${po.id}/edit`, '_blank')}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '0.6rem 0.8rem',
                                                                borderRadius: '6px',
                                                                marginBottom: '0.3rem',
                                                                background: 'var(--bg-main)',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                                        >
                                                            <div>
                                                                <span style={{ fontWeight: '500', color: '#3b82f6', fontSize: '0.9rem' }}>{po.po_number}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                                                                    {new Date(po.issue_date).toLocaleDateString('th-TH')}
                                                                </span>
                                                                <span style={{
                                                                    marginLeft: '0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.1rem 0.4rem',
                                                                    borderRadius: '8px',
                                                                    background: po.status === 'Completed' ? 'rgba(16,185,129,0.1)' : po.status === 'In Progress' ? 'rgba(59,130,246,0.1)' : 'rgba(156,163,175,0.1)',
                                                                    color: po.status === 'Completed' ? '#10b981' : po.status === 'In Progress' ? '#3b82f6' : '#9ca3af'
                                                                }}>
                                                                    {po.status}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                                                ฿{Number(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Invoice List */}
                                            {monthData.invoices.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <FileText size={14} /> ใบกำกับภาษี (INV)
                                                    </div>
                                                    {monthData.invoices.map(inv => (
                                                        <div
                                                            key={inv.id}
                                                            onClick={() => window.open(`/dashboard/invoices/${inv.id}/edit`, '_blank')}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '0.6rem 0.8rem',
                                                                borderRadius: '6px',
                                                                marginBottom: '0.3rem',
                                                                background: 'var(--bg-main)',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'var(--bg-main)'}
                                                        >
                                                            <div>
                                                                <span style={{ fontWeight: '500', color: '#f59e0b', fontSize: '0.9rem' }}>{inv.invoiceNo}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                                                                    {new Date(inv.date).toLocaleDateString('th-TH')}
                                                                </span>
                                                                <span style={{
                                                                    marginLeft: '0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.1rem 0.4rem',
                                                                    borderRadius: '8px',
                                                                    background: inv.status === 'Paid' ? 'rgba(16,185,129,0.1)' : inv.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)',
                                                                    color: inv.status === 'Paid' ? '#10b981' : inv.status === 'Pending' ? '#f59e0b' : '#9ca3af'
                                                                }}>
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
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
        </div>
    );
};

export default CustomerDetailPage;
