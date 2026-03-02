import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User, CreditCard, Building, Calendar, Package, Plus, X } from 'lucide-react';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* General Info */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={20} /> ข้อมูลทั่วไป
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

                        <div style={{ overflowX: 'auto' }}>
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
                                                <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
        </div>
    );
};

export default CustomerDetailPage;
