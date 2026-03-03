import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, User, Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';

const MODULES = [
    { id: 'overview', label: 'ภาพรวม (Dashboard)' },
    { id: 'customers', label: 'ข้อมูลลูกค้า' },
    { id: 'invoices', label: 'ใบกำกับภาษี' },
    { id: 'billing', label: 'ใบวางบิล' },
    { id: 'employees', label: 'พนักงาน' },
    { id: 'company', label: 'ข้อมูลบริษัท' },
    { id: 'users', label: 'สิทธิ์การใช้งาน' },
    { id: 'settings', label: 'ตั้งค่าระบบ' },
    { id: 'production', label: 'ข้อมูลการผลิต' }
];

const ACTIONS = [
    { id: 'view', label: 'ดูข้อมูล' },
    { id: 'create', label: 'สร้าง' },
    { id: 'edit', label: 'แก้ไข' },
    { id: 'delete', label: 'ลบ' }
];

const UserFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const { showAlert } = useDialog();

    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        permissions: {} // Structure: { "customers": { "view": true, ... } }
    });
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            loadUser();
        } else {
            // Initialize default permissions (all false)
            const initialPermissions = {};
            MODULES.forEach(module => {
                initialPermissions[module.id] = {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false
                };
            });
            setFormData(prev => ({ ...prev, permissions: initialPermissions }));
        }
    }, [id]);

    const loadUser = async () => {
        try {
            const data = await userService.getUserById(id);
            if (data) {
                // Ensure permissions object exists and has all modules
                const permissions = data.permissions || {};
                MODULES.forEach(module => {
                    if (!permissions[module.id]) {
                        permissions[module.id] = { view: false, create: false, edit: false, delete: false };
                    }
                });
                setFormData({ ...data, permissions });
            } else {
                await showAlert('ไม่พบข้อมูลผู้ใช้งาน');
                navigate('/dashboard/users');
            }
        } catch (error) {
            console.error('Error:', error);
            navigate('/dashboard/users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePermissionChange = (moduleId, actionId) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: {
                    ...prev.permissions[moduleId],
                    [actionId]: !prev.permissions[moduleId]?.[actionId]
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (isEditMode) {
                await userService.updateUser(id, formData);
            } else {
                await userService.createUser(formData);
            }
            navigate('/dashboard/users');
        } catch (error) {
            console.error('Error saving user:', error);
            await showAlert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message || 'ไม่ทราบสาเหตุ'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                    {isEditMode ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', color: '#888' }}>
                    {isEditMode ? 'แก้ไขรายละเอียดและกำหนดสิทธิ์แยกตามเมนู' : 'สร้างบัญชีและกำหนดสิทธิ์รายเมนู'}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                {/* ข้อมูลทั่วไป */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                        <User size={20} /> ข้อมูลทั่วไป
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>ชื่อ - นามสกุล <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                className="glass-input"
                                placeholder="เช่น สมชาย ใจดี"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Username <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="glass-input"
                                placeholder="ภาษาอังกฤษเท่านั้น"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="name@example.com"
                            style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>
                            รหัสผ่าน {isEditMode && <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password || ''}
                                onChange={handleChange}
                                required={!isEditMode}
                                className="glass-input"
                                placeholder="ระบุรหัสผ่านสำหรับการเข้าใช้งาน"
                                style={{ width: '100%', padding: '0.8rem', paddingRight: '3rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.8rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* สิทธิ์การใช้งาน (Matrix Layout) */}
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(139, 92, 246, 0.05)', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                            <Shield size={20} /> กำหนดสิทธิ์การใช้งาน (Permission Matrix)
                        </h3>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--card-hover)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>เมนูการใช้งาน</th>
                                    {ACTIONS.map(action => (
                                        <th key={action.id} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                            {action.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(module => (
                                    <tr key={module.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{module.label}</td>
                                        {ACTIONS.map(action => {
                                            const isChecked = formData.permissions[module.id]?.[action.id];
                                            return (
                                                <td key={action.id} style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <label style={{
                                                        display: 'inline-flex',
                                                        cursor: 'pointer',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        background: isChecked ? '#8b5cf6' : 'var(--bg-main)',
                                                        border: isChecked ? 'none' : '1px solid var(--border-color)',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isChecked}
                                                            onChange={() => handlePermissionChange(module.id, action.id)}
                                                            style={{ display: 'none' }}
                                                        />
                                                        {isChecked && <Check size={16} color="white" />}
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/users')}
                        style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        style={{
                            padding: '0.8rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#8b5cf6',
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500'
                        }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </form >
        </div >
    );
};

export default UserFormPage;
