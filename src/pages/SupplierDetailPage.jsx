import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User,
    Building, Calendar, Package, Plus, X, History, FileText, TrendingUp
} from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { supplierProductService } from '../services/supplierProductService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import SupplierProductHistory from '../components/SupplierProductHistory';

const SupplierDetailPage = () => {
    const { user } = useAuth();
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
    const [newProduct, setNewProduct] = useState({ name: '', sku: '', unit: '', price: '' });
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
                    sku: newProduct.sku,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
                showAlert('อัปเดตข้อมูลสินค้าสำเร็จ');
            } else {
                const product = await supplierProductService.createProduct({
                    supplierId: id,
                    name: newProduct.name,
                    sku: newProduct.sku,
                    unit: newProduct.unit,
                    price: parseFloat(newProduct.price) || 0
                });
                setProducts([...products, product]);
                showAlert('เพิ่มสินค้าใหม่สำเร็จ');
            }

            setNewProduct({ name: '', sku: '', unit: '', price: '' });
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
            sku: product.sku || '',
            unit: product.unit || '',
            price: product.price || ''
        });
        setIsAddingProduct(true);
    };

    const handleCancelEdit = () => {
        setIsAddingProduct(false);
        setEditingProduct(null);
        setNewProduct({ name: '', sku: '', unit: '', price: '' });
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

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;
    if (!supplier) return null;

    return (
        <div className="px-4 pb-8" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/suppliers')}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-4 p-0 flex items-center gap-2"
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h1 className="m-0 font-semibold" style={{ fontSize: '2rem' }}>{supplier.name}</h1>
                    <div className="text-textMuted flex gap-4" style={{ marginTop: '0.5rem' }}>
                        <span className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            #{supplier.code}
                        </span>
                        <span>•</span>
                        <span className="rounded-xl text-sm" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.1rem 0.5rem', background: supplier.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: supplier.status === 'Active' ? 'var(--success)' : 'var(--error)' }}>
                            {supplier.status === 'Active' ? 'ปกติ' : 'ระงับการใช้งาน'}
                        </span>
                        {(supplier.categoryNames || []).length > 0 && (
                            <>
                                <span>•</span>
                                {supplier.categoryNames.map((name, i) => (
                                    <span key={i} className="rounded-xl text-primary text-sm" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.1rem 0.5rem', background: 'rgba(55, 71, 124, 0.1)' }}>
                                        {name}
                                    </span>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    {hasPermission('suppliers', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/suppliers/${id}/edit`)}
                            className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <Edit size={18} /> แก้ไขข้อมูล
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6" style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color)' }}>
                <button
                    onClick={() => setActiveTab('info')}
                    className="px-6 py-3 bg-transparent border-none cursor-pointer text-base" style={{ borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'info' ? '600' : '400', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.2s' }}
                >
                    <Building size={18} /> ข้อมูลทั่วไป
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className="px-6 py-3 bg-transparent border-none cursor-pointer text-base" style={{ borderBottom: activeTab === 'products' ? '2px solid var(--secondary, #3b82f6)' : '2px solid transparent', marginBottom: '-2px', color: activeTab === 'products' ? 'var(--secondary, #3b82f6)' : 'var(--text-muted)', fontWeight: activeTab === 'products' ? '600' : '400', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.2s' }}
                >
                    <Package size={18} /> รายการสินค้า
                </button>
            </div>

            {/* Tab Content: Info */}
            {activeTab === 'info' && (
                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-panel p-8">
                            <h3 className="text-primary" style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Building size={22} /> รายละเอียดบริษัท
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>เลขผู้เสียภาษี</label>
                                    <div className="text-lg font-medium">{supplier.taxId || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>สาขา</label>
                                    <div className="text-lg font-medium">{supplier.branch || 'สำนักงานใหญ่'}</div>
                                </div>
                                <div>
                                    <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>เครดิตเทอม</label>
                                    <div className="text-lg font-medium text-emerald-500">
                                        {supplier.creditTerm === 0 ? 'เงินสด' : `${supplier.creditTerm} วัน`}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>สถานะ</label>
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
                                    <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>ประเภทผู้ขาย</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(supplier.categoryNames || []).length > 0 ? supplier.categoryNames.map((name, i) => (
                                            <span key={i} className="rounded-full text-primary text-sm font-medium" style={{ padding: '0.3rem 0.8rem', background: 'rgba(55, 71, 124, 0.08)', border: '1px solid rgba(55, 71, 124, 0.15)' }}>
                                                {name}
                                            </span>
                                        )) : (
                                            <span className="text-textMuted">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-8">
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                                <MapPin size={22} /> ที่อยู่จัดส่ง / ติดต่อ
                            </h3>
                            <div className="text-lg text-main" style={{ lineHeight: '1.8' }}>
                                {supplier.address || 'ไม่ระบุที่อยู่'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-panel p-8">
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--info)' }}>
                                <User size={22} /> ข้อมูลติดต่อ
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="text-sm text-textMuted" style={{ display: 'block', marginBottom: '0.3rem' }}>ผู้ติดต่อ</label>
                                    <div className="font-semibold">{supplier.contactPerson || '-'}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="text-primary" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <label className="text-textMuted" style={{ display: 'block', fontSize: '0.75rem' }}>เบอร์โทรศัพท์</label>
                                        <div className="font-medium">{supplier.phone || '-'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="text-emerald-500" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <label className="text-textMuted" style={{ display: 'block', fontSize: '0.75rem' }}>อีเมล</label>
                                        <div className="font-medium">{supplier.email || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-8">
                            <h3 className="mb-4 text-textMuted text-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FileText size={20} /> หมายเหตุ
                            </h3>
                            <div className="text-[0.95rem] text-textMuted" style={{ fontStyle: supplier.notes ? 'normal' : 'italic' }}>
                                {supplier.notes || 'ไม่มีหมายเหตุเพิ่มเติม'}
                            </div>
                        </div>

                        <div className="glass-panel p-8">
                            <h3 className="mb-4 text-textMuted text-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Calendar size={20} /> ประวัติ
                            </h3>
                            <div className="text-sm text-textMuted" style={{ display: 'grid', gap: '0.5rem' }}>
                                <div>สร้างเมื่อ: {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('th-TH') : '-'}</div>
                                {supplier.createdBy && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{supplier.createdBy}</span>
                                    </div>
                                )}
                                <div>อัปเดตล่าสุด: {supplier.updatedAt ? new Date(supplier.updatedAt).toLocaleDateString('th-TH') : '-'}</div>
                                {supplier.updatedBy && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{supplier.updatedBy}</span>
                                    </div>
                                )}
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
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="border-b border-border flex justify-between items-center" style={{ padding: '1.5rem 2rem' }}>
                            <h3 className="m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                                <Package size={22} /> รายการสินค้าที่สั่งซื้อจากผู้ขายรายนี้
                            </h3>
                            {/* {hasPermission('suppliers', 'edit') && !isAddingProduct && ( */}
                            <button
                                onClick={() => setIsAddingProduct(true)}
                                className="primary-btn px-5 py-2.5 rounded-xl border-none cursor-pointer flex items-center gap-2"
                            >
                                <Plus size={18} /> เพิ่มสินค้า
                            </button>
                            {/* )} */}
                        </div>

                        {isAddingProduct && (
                            <div className="p-8 border-b border-border" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'end' }}>
                                    <div>
                                        <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>ชื่อสินค้า</label>
                                        <input
                                            type="text"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                            placeholder="ระบุชื่อสินค้าหรือบริการ..."
                                            required
                                            className="glass-input w-full p-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>SKU (รหัสสินค้า)</label>
                                        <input
                                            type="text"
                                            value={newProduct.sku}
                                            onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                                            placeholder="รหัสอ้างอิงกลาง..."
                                            className="glass-input w-full p-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>หน่วย</label>
                                        <input
                                            type="text"
                                            value={newProduct.unit}
                                            onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                                            placeholder="เช่น ชิ้น, กก."
                                            className="glass-input w-full p-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-textMuted mb-2" style={{ display: 'block' }}>ราคาล่าสุด (บาท)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newProduct.price}
                                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                            placeholder="0.00"
                                            className="glass-input w-full p-3"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="primary-btn px-6 py-3 rounded-lg text-white border-none cursor-pointer font-semibold" style={{ background: 'var(--secondary)' }}>
                                            {isSavingProduct ? '...' : (editingProduct ? 'บันทึก' : 'เพิ่ม')}
                                        </button>
                                        <button type="button" onClick={handleCancelEdit} className="p-3 rounded-lg bg-transparent border border-border text-textMuted cursor-pointer">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="table-responsive-wrapper">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                        <th className="text-left text-textMuted font-medium" style={{ padding: '1.2rem 2rem' }}>ชื่อสินค้า / รายการ</th>
                                        <th className="text-left text-textMuted font-medium" style={{ padding: '1.2rem 2rem' }}>SKU</th>
                                        <th className="text-left text-textMuted font-medium" style={{ padding: '1.2rem 2rem' }}>หน่วยเรียก</th>
                                        <th className="text-right text-textMuted font-medium" style={{ padding: '1.2rem 2rem' }}>ราคาล่าสุด</th>
                                        <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? (
                                        products.map(p => (
                                            <tr key={p.id} className="table-row-hover border-b border-border">
                                                <td className="font-medium" style={{ padding: '1.2rem 2rem' }}>{p.name}</td>
                                                <td style={{ padding: '1.2rem 2rem', color: 'var(--info)' }}>{p.sku || '-'}</td>
                                                <td style={{ padding: '1.2rem 2rem' }}>{p.unit || '-'}</td>
                                                <td className="text-right font-semibold" style={{ padding: '1.2rem 2rem', color: 'var(--secondary)' }}>
                                                    {p.price > 0 ? `฿${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                </td>
                                                <td className="actions-column">
                                                    <div className="table-actions">
                                                        <button
                                                            onClick={() => setSelectedProductForHistory(p)}
                                                            className="action-link"
                                                            title="ดูประวัติราคา"
                                                        >
                                                            <TrendingUp size={16} />
                                                        </button>
                                                        {hasPermission('suppliers', 'edit') && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditProduct(p)}
                                                                    className="action-edit"
                                                                    title="แก้ไข"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(p.id, p.name)}
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
                                            <td colSpan="4" className="text-center text-textMuted" style={{ padding: '4rem' }}>
                                                <Package size={48} className="mb-4" style={{ opacity: 0.2 }} />
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
                <div className="glass-panel text-center text-textMuted" style={{ padding: '4rem' }}>
                    <History size={64} className="mb-6" style={{ opacity: 0.2 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>ประวัติการสั่งซื้อ</h3>
                    <p className="m-0">ระบบประวัติการซื้อจะแสดงผลเมื่อมีการเชื่อมต่อกับโมดูลจัดซื้อ (Purchasing) ในขั้นตอนถัดไปครับ</p>
                </div>
            )}
        </div>
    );
};

export default SupplierDetailPage;
