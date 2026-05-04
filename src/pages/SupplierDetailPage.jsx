import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User,
    Building, Calendar, Package, Plus, X, History,
    ShoppingCart, ChevronDown, ChevronUp, CreditCard, FileText, TrendingUp
} from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import SupplierProductHistory from '../components/SupplierProductHistory';

const SupplierDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [supplier, setSupplier] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');

    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);

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
            const supplierData = await supplierService.getSupplierById(id);
            if (supplierData) {
                setSupplier(supplierData);
                const productsData = await supplierProductService.getProductsBySupplierId(id);
                setProducts(productsData || []);
            } else {
                navigate('/dashboard/suppliers');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSupplier = async () => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ขายรายนี้?');
        if (confirmed) {
            try {
                await supplierService.deleteSupplier(id);
                navigate('/dashboard/suppliers');
            } catch (error) {
                await showAlert('ไม่สามารถลบข้อมูลผู้ขายได้');
            }
        }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSavingProduct(true);
        try {
            if (editingProduct) {
                const updated = await supplierProductService.updateProduct(editingProduct.id, {
                    name: newProduct.name,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
                showAlert('อัปเดตข้อมูลสินค้าสำเร็จ');
            } else {
                const product = await supplierProductService.createProduct({
                    supplierId: id,
                    name: newProduct.name,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts([...products, product]);
                showAlert('เพิ่มสินค้าใหม่สำเร็จ');
            }

            setNewProduct({ name: '', unit: '', price: '' });
            setIsAddingProduct(false);
            setEditingProduct(null);
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการบันทึกสินค้า');
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
            const success = await supplierProductService.deleteProduct(productId);
            if (success) {
                setProducts(products.filter(p => p.id !== productId));
                showAlert('ลบสินค้าสำเร็จ');
            } else {
                showError('เกิดข้อผิดพลาดในการลบสินค้า');
            }
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!supplier) return null;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/suppliers')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    padding: 0
                }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '600' }}>{supplier.name}</h1>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace' }}>
                            #{supplier.code}
                        </span>
                        <span>•</span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '12px',
                            background: supplier.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: supplier.status === 'Active' ? 'var(--success)' : 'var(--error)',
                            fontSize: '0.85rem',
                        }}>
                            {supplier.status === 'Active' ? 'ปกติ' : 'ระงับการใช้งาน'}
                        </span>
                        {(supplier.categoryNames || []).length > 0 && (
                            <>
                                <span>•</span>
                                {supplier.categoryNames.map((name, i) => (
                                    <span key={i} style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '12px',
                                        background: 'rgba(55, 71, 124, 0.1)',
                                        color: 'var(--primary)',
                                        fontSize: '0.85rem',
                                    }}>
                                        {name}
                                    </span>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {hasPermission('suppliers', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/suppliers/${id}/edit`)}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                        >
                            <Edit size={18} /> แก้ไขข้อมูล
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
                        borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
                        marginBottom: '-2px',
                        color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'info' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Building size={18} /> ข้อมูลทั่วไป
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'products' ? '2px solid var(--secondary, #3b82f6)' : '2px solid transparent',
                        marginBottom: '-2px',
                        color: activeTab === 'products' ? 'var(--secondary, #3b82f6)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'products' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <Package size={18} /> รายการสินค้า
                </button>
            </div>

            {/* Tab Content: Info */}
            {activeTab === 'info' && (
                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                                <Building size={22} /> รายละเอียดบริษัท
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>เลขผู้เสียภาษี</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{supplier.taxId || '-'}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>สาขา</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{supplier.branch || 'สำนักงานใหญ่'}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>เครดิตเทอม</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--success)' }}>
                                        {supplier.creditTerm === 0 ? 'เงินสด' : `${supplier.creditTerm} วัน`}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>สถานะ</label>
                                    <span style={{
                                        padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem',
                                        background: supplier.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: supplier.status === 'Active' ? '#10b981' : '#ef4444',
                                        border: `1px solid ${supplier.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {supplier.status === 'Active' ? 'ปกติ (Active)' : 'ระงับ (Inactive)'}
                                    </span>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ประเภทผู้ขาย</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(supplier.categoryNames || []).length > 0 ? supplier.categoryNames.map((name, i) => (
                                            <span key={i} style={{
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                background: 'rgba(55, 71, 124, 0.08)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(55, 71, 124, 0.15)',
                                                fontSize: '0.9rem',
                                                fontWeight: '500'
                                            }}>
                                                {name}
                                            </span>
                                        )) : (
                                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                                <MapPin size={22} /> ที่อยู่จัดส่ง / ติดต่อ
                            </h3>
                            <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                                {supplier.address || 'ไม่ระบุที่อยู่'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--info)' }}>
                                <User size={22} /> ข้อมูลติดต่อ
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>ผู้ติดต่อ</label>
                                    <div style={{ fontWeight: '600' }}>{supplier.contactPerson || '-'}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>เบอร์โทรศัพท์</label>
                                        <div style={{ fontWeight: '500' }}>{supplier.phone || '-'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>อีเมล</label>
                                        <div style={{ fontWeight: '500' }}>{supplier.email || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                <FileText size={20} /> หมายเหตุ
                            </h3>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: supplier.notes ? 'normal' : 'italic' }}>
                                {supplier.notes || 'ไม่มีหมายเหตุเพิ่มเติม'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Products */}

            {activeTab === 'products' && (
                selectedProductForHistory ? (
                    <SupplierProductHistory
                        product={selectedProductForHistory}
                        onBack={() => setSelectedProductForHistory(null)}
                    />
                ) : (
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                                <Package size={22} /> รายการสินค้าที่สั่งซื้อจากผู้ขายรายนี้
                            </h3>
                            {/* {hasPermission('suppliers', 'edit') && !isAddingProduct && ( */}
                            <button
                                onClick={() => setIsAddingProduct(true)}
                                className="primary-btn"
                                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}
                            >
                                <Plus size={18} /> เพิ่มสินค้า
                            </button>
                            {/* )} */}
                        </div>

                        {isAddingProduct && (
                            <div style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ชื่อสินค้า</label>
                                        <input
                                            type="text"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                            className="glass-input"
                                            placeholder="ระบุชื่อสินค้าหรือบริการ..."
                                            required
                                            style={{ width: '100%', padding: '0.8rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>หน่วย</label>
                                        <input
                                            type="text"
                                            value={newProduct.unit}
                                            onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                                            className="glass-input"
                                            placeholder="เช่น ชิ้น, กก."
                                            style={{ width: '100%', padding: '0.8rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ราคาล่าสุด (บาท)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newProduct.price}
                                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                            className="glass-input"
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '0.8rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="submit" className="primary-btn" style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', background: 'var(--secondary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                            {isSavingProduct ? '...' : (editingProduct ? 'บันทึก' : 'เพิ่ม')}
                                        </button>
                                        <button type="button" onClick={handleCancelEdit} style={{ padding: '0.8rem', borderRadius: '8px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-responsive-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                        <th style={{ padding: '1.2rem 2rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อสินค้า / รายการ</th>
                                        <th style={{ padding: '1.2rem 2rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '500' }}>หน่วยเรียก</th>
                                        <th style={{ padding: '1.2rem 2rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500' }}>ราคาล่าสุด</th>
                                        <th style={{ padding: '1.2rem 2rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? (
                                        products.map(p => (
                                            <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '1.2rem 2rem', fontWeight: '500' }}>{p.name}</td>
                                                <td style={{ padding: '1.2rem 2rem' }}>{p.unit || '-'}</td>
                                                <td style={{ padding: '1.2rem 2rem', textAlign: 'right', fontWeight: '600', color: 'var(--secondary)' }}>
                                                    {p.price > 0 ? `฿${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                </td>
                                                <td style={{ padding: '1.2rem 2rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => setSelectedProductForHistory(p)}
                                                            style={{ background: 'rgba(55, 71, 124, 0.1)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px' }}
                                                            title="ดูประวัติราคา"
                                                        >
                                                            <TrendingUp size={18} />
                                                        </button>
                                                        {hasPermission('suppliers', 'edit') && (
                                                            <>
                                                                <button onClick={() => handleEditProduct(p)} style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px' }} title="แก้ไข">
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button onClick={() => handleDeleteProduct(p.id, p.name)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px' }} title="ลบ">
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                                <div>ยังไม่มีรายการสินค้าสำหรับผู้ขายรายนี้</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Tab Content: History */}
            {activeTab === 'history' && (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <History size={64} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>ประวัติการสั่งซื้อ</h3>
                    <p style={{ margin: 0 }}>ระบบประวัติการซื้อจะแสดงผลเมื่อมีการเชื่อมต่อกับโมดูลจัดซื้อ (Purchasing) ในขั้นตอนถัดไปครับ</p>
                </div>
            )}
        </div>
    );
};

export default SupplierDetailPage;
