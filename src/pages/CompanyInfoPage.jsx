import { useState, useEffect } from 'react';
import { Save, Building, MapPin, Phone, Mail, FileText, Calendar, Printer } from 'lucide-react';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';

const CompanyInfoPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        fax: '',
        email: '',
        taxId: '',
        updatedAt: null
    });
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('company', 'edit');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await companyService.getCompanyInfo();
        if (data) {
            setFormData(data);
        }
        setIsLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        try {
            const updatedData = await companyService.updateCompanyInfo(formData);
            setFormData(updatedData);
            setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#60a5fa' }}>
                    <Building size={32} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>ข้อมูลบริษัท</h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>จัดการข้อมูลโรงงานและที่อยู่ของคุณ</p>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        <Building size={16} /> ชื่อบริษัท
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className="glass-input"
                        placeholder="ระบุชื่อบริษัทของคุณ"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', opacity: canEdit ? 1 : 0.7 }}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        <MapPin size={16} /> ที่อยู่
                    </label>
                    <textarea
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                        disabled={!canEdit}
                        rows="3"
                        className="glass-input"
                        placeholder="ระบุที่อยู่บริษัท"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', resize: 'vertical', opacity: canEdit ? 1 : 0.7 }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            <Phone size={16} /> เบอร์โทรศัพท์
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className="glass-input"
                            placeholder="ระบุเบอร์โทรศัพท์"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', opacity: canEdit ? 1 : 0.7 }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            <Printer size={16} /> เบอร์แฟกซ์
                        </label>
                        <input
                            type="tel"
                            name="fax"
                            value={formData.fax || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className="glass-input"
                            placeholder="ระบุเบอร์แฟกซ์"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', opacity: canEdit ? 1 : 0.7 }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            <Mail size={16} /> อีเมล
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className="glass-input"
                            placeholder="ระบุอีเมลบริษัท"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', opacity: canEdit ? 1 : 0.7 }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            <FileText size={16} /> เลขประจำตัวผู้เสียภาษี
                        </label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className="glass-input"
                            placeholder="ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--card-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', opacity: canEdit ? 1 : 0.7 }}
                        />
                    </div>
                </div>

                {formData.updatedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        <Calendar size={14} />
                        อัปเดตล่าสุด: {new Date(formData.updatedAt).toLocaleString('th-TH')}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    {canEdit && (
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                padding: '0.8rem 2rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: isSaving ? '#4b5563' : '#3b82f6',
                                color: 'white',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CompanyInfoPage;
