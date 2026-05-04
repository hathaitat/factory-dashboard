import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Building, User, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';

const SupplierFormPage = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();
    
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        tax_id: '',
        branch: '',
        address: '',
        contact_person: '',
        phone: '',
        email: '',
        credit_term: 0,
        status: 'Active',
        notes: ''
    });

    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isEdit) {
            loadSupplier();
        }
    }, [id]);

    const loadSupplier = async () => {
        try {
            const data = await supplierService.getSupplierById(id);
            if (data) {
                setFormData({
                    code: data.code || '',
                    name: data.name || '',
                    tax_id: data.tax_id || '',
                    branch: data.branch || '',
                    address: data.address || '',
                    contact_person: data.contact_person || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    credit_term: data.credit_term || 0,
                    status: data.status || 'Active',
                    notes: data.notes || ''
                });
            }
        } catch (error) {
            console.error('Error loading supplier:', error);
            showError('ไม่สามารถโหลดข้อมูลผู้ขายได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'credit_term' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.code || !formData.name) {
            showAlert('กรุณากรอกรหัสและชื่อผู้ขาย');
            return;
        }

        setIsSaving(true);
        try {
            if (isEdit) {
                await supplierService.updateSupplier(id, formData);
                await showAlert('บันทึกข้อมูลสำเร็จ');
            } else {
                await supplierService.createSupplier(formData);
                await showAlert('เพิ่มผู้ขายใหม่สำเร็จ');
            }
            navigate('/dashboard/suppliers');
        } catch (error) {
            console.error('Error saving supplier:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title={isEdit ? 'แก้ไขข้อมูล Supplier' : 'เพิ่ม Supplier ใหม่'}
                subtitle="จัดการข้อมูลรายละเอียดและที่อยู่ติดต่อของคู่ค้า"
            >
                <button
                    onClick={() => navigate('/dashboard/suppliers')}
                    style={{
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-hover)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <X size={18} /> ยกเลิก
                </button>
            </PageHeader>

            <div className="glass-panel fade-in" style={{ padding: '2.5rem', maxWidth: '850px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.8rem' }}>
                    
                    {/* Section: Basic Information */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                รหัส Supplier <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="เช่น SUP001"
                                required
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                ชื่อบริษัท / ชื่อผู้ขาย <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="ชื่อเต็มบริษัท..."
                                required
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                เลขผู้เสียภาษี
                            </label>
                            <input
                                type="text"
                                name="tax_id"
                                value={formData.tax_id}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="เลข 13 หลัก..."
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                สาขา
                            </label>
                            <input
                                type="text"
                                name="branch"
                                value={formData.branch}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="เช่น สำนักงานใหญ่ หรือ 00001"
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                    {/* Section: Contact Information */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            ชื่อผู้ติดต่อ
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                            <input
                                type="text"
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ padding: '0.9rem 1.2rem 0.9rem 3rem', width: '100%' }}
                                placeholder="ระบุชื่อผู้ประสานงาน..."
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                เบอร์โทรศัพท์
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ padding: '0.9rem 1.2rem 0.9rem 3rem', width: '100%' }}
                                    placeholder="08X-XXX-XXXX"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                อีเมล
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="glass-input"
                                    style={{ padding: '0.9rem 1.2rem 0.9rem 3rem', width: '100%' }}
                                    placeholder="example@email.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            ที่อยู่บริษัท
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '1.2rem', color: 'var(--text-muted)', opacity: 0.6 }} />
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ padding: '0.9rem 1.2rem 0.9rem 3rem', minHeight: '100px', width: '100%', lineHeight: '1.6', resize: 'vertical' }}
                                placeholder="ระบุที่อยู่จัดส่งและที่อยู่ออกใบกำกับภาษี..."
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                    {/* Section: Terms & Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                เครดิตเทอม (วัน) <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(0 = สด)</span>
                            </label>
                            <input
                                type="number"
                                name="credit_term"
                                value={formData.credit_term}
                                onChange={handleChange}
                                className="glass-input"
                                placeholder="0"
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                สถานะการทำรายการ
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.9rem 1.2rem' }}
                            >
                                <option value="Active">ปกติ (Active)</option>
                                <option value="Inactive">ระงับ (Inactive)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            หมายเหตุภายใน
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ minHeight: '100px', width: '100%', lineHeight: '1.6', padding: '1rem', resize: 'vertical' }}
                            placeholder="บันทึกข้อมูลเพิ่มเติมเกี่ยวกับ Supplier นี้..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/suppliers')}
                            className="btn-secondary"
                            style={{ padding: '1rem 2rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '500' }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="primary-btn"
                            style={{
                                padding: '1rem 2.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--primary)',
                                color: 'white',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                fontWeight: '600',
                                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.25)',
                                opacity: isSaving ? 0.7 : 1,
                                transition: 'all 0.3s'
                            }}
                        >
                            <Save size={20} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierFormPage;
