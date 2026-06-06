import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Building, User, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';

const SupplierFormPage = () => {
    const { user } = useAuth();
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

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title={isEdit ? 'แก้ไขข้อมูล Supplier' : 'เพิ่ม Supplier ใหม่'}
                subtitle="จัดการข้อมูลรายละเอียดและที่อยู่ติดต่อของคู่ค้า"
            >
                <button
                    onClick={() => navigate('/dashboard/suppliers')}
                    className="px-4 py-2.5 rounded-lg border border-border bg-cardHover text-textMuted cursor-pointer flex items-center gap-2"
                >
                    <X size={18} /> ยกเลิก
                </button>
            </PageHeader>

            <div className="glass-panel fade-in" style={{ padding: '2.5rem', maxWidth: '850px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.8rem' }}>

                    {/* Section: Basic Information */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                รหัส Supplier <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="เช่น SUP001"
                                required
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                ชื่อบริษัท / ชื่อผู้ขาย <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="ชื่อเต็มบริษัท..."
                                required
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                เลขผู้เสียภาษี
                            </label>
                            <input
                                type="text"
                                name="tax_id"
                                value={formData.tax_id}
                                onChange={handleChange}
                                placeholder="เลข 13 หลัก..."
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                สาขา
                            </label>
                            <input
                                type="text"
                                name="branch"
                                value={formData.branch}
                                onChange={handleChange}
                                placeholder="เช่น สำนักงานใหญ่ หรือ 00001"
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                    {/* Section: Contact Information */}
                    <div className="form-group">
                        <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                            ชื่อผู้ติดต่อ
                        </label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" style={{ opacity: 0.6 }} />
                            <input
                                type="text"
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={handleChange}
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem 0.9rem 3rem' }}
                                placeholder="ระบุชื่อผู้ประสานงาน..."
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                เบอร์โทรศัพท์
                            </label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" style={{ opacity: 0.6 }} />
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="glass-input w-full" style={{ padding: '0.9rem 1.2rem 0.9rem 3rem' }}
                                    placeholder="08X-XXX-XXXX"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                อีเมล
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" style={{ opacity: 0.6 }} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="glass-input w-full" style={{ padding: '0.9rem 1.2rem 0.9rem 3rem' }}
                                    placeholder="example@email.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                            ที่อยู่บริษัท
                        </label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-4 text-textMuted" style={{ top: '1.2rem', opacity: 0.6 }} />
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem 0.9rem 3rem', minHeight: '100px', lineHeight: '1.6', resize: 'vertical' }}
                                placeholder="ระบุที่อยู่จัดส่งและที่อยู่ออกใบกำกับภาษี..."
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                    {/* Section: Terms & Status */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                เครดิตเทอม (วัน) <span className="text-xs text-textMuted" style={{ fontWeight: 'normal' }}>(0 = สด)</span>
                            </label>
                            <input
                                type="number"
                                name="credit_term"
                                value={formData.credit_term}
                                onChange={handleChange}
                                placeholder="0"
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                                สถานะการทำรายการ
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="glass-input w-full" style={{ padding: '0.9rem 1.2rem' }}
                            >
                                <option value="Active">ปกติ (Active)</option>
                                <option value="Inactive">ระงับ (Inactive)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label text-textMuted font-medium" style={{ display: 'block', marginBottom: '0.6rem' }}>
                            หมายเหตุภายใน
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            className="glass-input w-full p-4" style={{ minHeight: '100px', lineHeight: '1.6', resize: 'vertical' }}
                            placeholder="บันทึกข้อมูลเพิ่มเติมเกี่ยวกับ Supplier นี้..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end gap-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/suppliers')}
                            className="btn-secondary rounded-xl border border-border bg-transparent text-textMuted cursor-pointer font-medium" style={{ padding: '1rem 2rem' }}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="primary-btn rounded-xl border-none text-white font-semibold flex items-center gap-3" style={{ padding: '1rem 2.5rem', background: 'var(--primary)', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.25)', opacity: isSaving ? 0.7 : 1, transition: 'all 0.3s' }}
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
