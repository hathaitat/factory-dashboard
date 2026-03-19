import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerForm = ({ initialData, onSubmit, title }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        fax: '',
        address: '',
        status: 'Active',
        contactPerson: '',
        branch: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button onClick={() => navigate('/dashboard/customers')} className="btn-secondary" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                {formData.id && (
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>System ID (UUID)</label>
                        <input
                            type="text"
                            value={formData.id}
                            readOnly
                            disabled
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                        />
                    </div>
                )}
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>รหัสลูกค้า <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code || ''}
                        onChange={handleChange}
                        required
                        placeholder="ระบุรหัสลูกค้า"
                        className="glass-input"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อบริษัท <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="glass-input"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อผู้ติดต่อ</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>เบอร์แฟกซ์</label>
                        <input
                            type="tel"
                            name="fax"
                            value={formData.fax || ''}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                            เครดิต (วัน) <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '4px' }}>(ใส่ 0 = เครดิตสด)</span>
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
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>สถานะ</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        >
                            <option value="Active" style={{ color: 'black' }}>ปกติ</option>
                            <option value="Inactive" style={{ color: 'black' }}>ระงับ</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ที่อยู่</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        className="glass-input"
                        style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/customers')}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form >
        </div >
    );
};

export default CustomerForm;
