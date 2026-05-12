import { useState, useEffect } from 'react';
import { Save, X, FileText, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierCategoryService } from '../services/supplierCategoryService';

const SupplierForm = ({ initialData, onSubmit, title }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        taxId: '',
        branch: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        creditTerm: 0,
        status: 'Active',
        notes: '',
        categoryIds: []
    });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await supplierCategoryService.getCategories();
        setCategories(cats || []);
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'creditTerm' ? (parseInt(value) || 0) : value
        }));
    };

    const toggleCategory = (catId) => {
        setFormData(prev => {
            const current = prev.categoryIds || [];
            const exists = current.includes(catId);
            return {
                ...prev,
                categoryIds: exists
                    ? current.filter(id => id !== catId)
                    : [...current, catId]
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="m-0">{title}</h2>
                <button onClick={() => navigate('/dashboard/suppliers')} className="btn-secondary" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                {formData.id && (
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>System ID (UUID)</label>
                        <input
                            type="text"
                            value={formData.id}
                            readOnly
                            disabled
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: '#f1f5f9', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                        />
                    </div>
                )}
                
                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>รหัส Supplier <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code || ''}
                            onChange={handleChange}
                            required
                            placeholder="ระบุรหัส Supplier"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อ Supplier / บริษัท <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            required
                            placeholder="ระบุชื่อ Supplier"
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เลขประจำตัวผู้เสียภาษี</label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="13 หลัก"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>สาขา</label>
                        <input
                            type="text"
                            name="branch"
                            value={formData.branch || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="เช่น สำนักงานใหญ่ หรือ 00000"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อผู้ติดต่อ</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="ระบุชื่อผู้ติดต่อ"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="08X-XXX-XXXX"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="example@email.com"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                            เครดิต (วัน) <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '4px' }}>(ใส่ 0 = เงินสด)</span>
                        </label>
                        <input
                            type="number"
                            name="creditTerm"
                            value={formData.creditTerm !== undefined && formData.creditTerm !== null ? formData.creditTerm : ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="จำนวนวัน"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>สถานะ</label>
                    <select
                        name="status"
                        value={formData.status || 'Active'}
                        onChange={handleChange}
                        className="glass-input"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    >
                        <option value="Active" style={{ color: 'black' }}>ปกติ (Active)</option>
                        <option value="Inactive" style={{ color: 'black' }}>ระงับ (Inactive)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ประเภทผู้ขาย <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(เลือกได้หลายรายการ)</span></label>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        padding: '0.8rem',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        minHeight: '48px'
                    }}>
                        {categories.length > 0 ? categories.map(cat => {
                            const isSelected = (formData.categoryIds || []).includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    style={{
                                        padding: '0.35rem 0.8rem',
                                        borderRadius: '20px',
                                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                                        background: isSelected ? 'rgba(55, 71, 124, 0.12)' : 'transparent',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: isSelected ? '600' : '400',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}
                                >
                                    <span style={{ fontSize: '0.7rem' }}>{isSelected ? '✓' : '＋'}</span>
                                    {cat.name}
                                </button>
                            );
                        }) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>ยังไม่มีประเภท — เพิ่มได้ที่เมนู "ตั้งค่า"</span>
                        )}
                    </div>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        จัดการประเภทเพิ่มเติมได้ที่เมนู "ตั้งค่า"
                    </p>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ที่อยู่</label>
                    <textarea
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                        rows="3"
                        className="glass-input"
                        placeholder="ระบุที่อยู่บริษัท..."
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', resize: 'vertical' }}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>หมายเหตุภายใน</label>
                    <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        rows="2"
                        className="glass-input"
                        placeholder="บันทึกข้อมูลเพิ่มเติมเกี่ยวกับ Supplier นี้..."
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/suppliers')}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form >
        </div >
    );
};

export default SupplierForm;
