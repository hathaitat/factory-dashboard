import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, User, Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import LastUpdated from '../components/LastUpdated';
import { useAuth } from '../contexts/AuthContext';

const MODULES = [
    { id: 'overview', label: 'ภาพรวม (Dashboard)' },
    { id: 'customers', label: 'ข้อมูลลูกค้า' },
    { id: 'suppliers', label: 'ข้อมูลผู้ขาย (Suppliers)' },
    { id: 'supplier_pos', label: 'ใบสั่งซื้อผู้ขาย (Vendor PO)' },
    { id: 'warehouses', label: 'คลังสินค้า (Warehouses)' },
    { id: 'certificates', label: 'เอกสาร Certificate' },
    { id: 'purchase_orders', label: 'ใบสั่งซื้อ (PO)' },
    { id: 'quotations', label: 'ใบเสนอราคา' },
    { id: 'invoices', label: 'ใบกำกับภาษี' },
    { id: 'billing', label: 'ใบวางบิล' },
    { id: 'certificate_receipts', label: 'ใบรับรองแทนใบเสร็จ' },
    { id: 'employees', label: 'พนักงาน' },
    { id: 'company', label: 'ข้อมูลบริษัท' },
    { id: 'users', label: 'สิทธิ์การใช้งาน' },
    { id: 'settings', label: 'ตั้งค่าระบบ' },
    { id: 'production', label: 'ข้อมูลการผลิต' },
    { id: 'internal_items', label: 'ของใช้ในโรงงาน (Items)' },
    { id: 'internal_requisitions', label: 'ประวัติการเบิก/สั่งซื้อ (History)' },
    { id: 'alerts', label: 'การแจ้งเตือน (Alerts)' }
];

const ACTIONS = [
    { id: 'view', label: 'ดูข้อมูล' },
    { id: 'create', label: 'สร้าง' },
    { id: 'edit', label: 'แก้ไข' },
    { id: 'delete', label: 'ลบ' }
];

const UserFormPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const { showAlert } = useDialog();

    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        permissions: {}, // Structure: { "customers": { "view": true, ... } }
        createdBy: '',
        updatedBy: ''
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
                setFormData({
                    ...data,
                    permissions,
                    createdBy: data.createdBy || '',
                    updatedBy: data.updatedBy || ''
                });
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
        const currentUser = user;
        const isEditingSelf = String(id) === String(currentUser?.id);

        // Prevent self-lockout: Cannot disable 'view' or 'edit' for 'users' module if editing self
        if (isEditingSelf && moduleId === 'users' && (actionId === 'view' || actionId === 'edit')) {
            return;
        }

        setFormData(prev => {
            const currentPerms = prev.permissions[moduleId] || { view: false, create: false, edit: false, delete: false };
            const newValue = !currentPerms[actionId];

            let newModulePerms = {
                ...currentPerms,
                [actionId]: newValue
            };

            // Smart Logic: If checking create/edit/delete, automatically check 'view'
            if (newValue && (actionId === 'create' || actionId === 'edit' || actionId === 'delete')) {
                newModulePerms.view = true;
            }

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [moduleId]: newModulePerms
                }
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const activeUser = user;
            const operatorName = activeUser?.fullName || activeUser?.username || 'Unknown';
            const payload = {
                ...formData,
                createdBy: isEditMode ? (formData.createdBy || operatorName) : operatorName,
                updatedBy: operatorName
            };
            if (isEditMode) {
                await userService.updateUser(id, payload);
            } else {
                await userService.createUser(payload);
            }
            navigate('/dashboard/users');
        } catch (error) {
            console.error('Error saving user:', error);
            await showAlert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message || 'ไม่ทราบสาเหตุ'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-textMuted">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="px-4 pb-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="mb-8 flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>
                        {isEditMode ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                    </h1>
                    <p className="text-gray-400" style={{ margin: '0.5rem 0 0 0' }}>
                        {isEditMode ? 'แก้ไขรายละเอียดและกำหนดสิทธิ์แยกตามเมนู' : 'สร้างบัญชีและกำหนดสิทธิ์รายเมนู'}
                    </p>
                </div>
                <button
                    type="submit"
                    form="user-form"
                    disabled={isSaving}
                    className="px-6 py-3 rounded-lg border-none text-white font-medium flex items-center gap-2" style={{ background: '#8b5cf6', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                    <Save size={18} />
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>

            <form id="user-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                {/* ข้อมูลทั่วไป */}
                <div className="glass-panel p-8">
                    <h3 className="mt-0 mb-6 text-violet-500 flex items-center gap-2">
                        <User size={20} /> ข้อมูลทั่วไป
                    </h3>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="mb-2 text-gray-400" style={{ display: 'block' }}>ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                placeholder="เช่น สมชาย ใจดี"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                        </div>
                        <div className="form-group">
                            <label className="mb-2 text-gray-400" style={{ display: 'block' }}>Username <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="ภาษาอังกฤษเท่านั้น"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                            />
                        </div>
                    </div>
                    <div className="form-group mt-4">
                        <label className="mb-2 text-gray-400" style={{ display: 'block' }}>อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            placeholder="name@example.com"
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main"
                        />
                    </div>
                    <div className="form-group mt-4">
                        <label className="mb-2 text-gray-400" style={{ display: 'block' }}>
                            รหัสผ่าน {isEditMode && <span className="text-xs text-amber-500">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password || ''}
                                onChange={handleChange}
                                required={!isEditMode}
                                placeholder="ระบุรหัสผ่านสำหรับการเข้าใช้งาน"
                                className="glass-input w-full p-3 bg-main border border-border rounded-lg text-main" style={{ paddingRight: '3rem' }}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 -translate-y-1/2 bg-transparent border-none text-textMuted cursor-pointer" style={{ right: '0.8rem', display: 'flex', alignItems: 'center' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* สิทธิ์การใช้งาน (Matrix Layout) */}
                <div className="glass-panel p-0 overflow-hidden">
                    <div className="p-6 border-b border-border" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                        <h3 className="m-0 text-violet-500 flex items-center gap-2">
                            <Shield size={20} /> กำหนดสิทธิ์การใช้งาน (Permission Matrix)
                        </h3>
                    </div>

                    <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-cardHover">
                                    <th className="p-4 text-left text-textMuted border-b border-border">เมนูการใช้งาน</th>
                                    {ACTIONS.map(action => (
                                        <th key={action.id} className="p-4 text-center text-textMuted border-b border-border">
                                            {action.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(module => (
                                    <tr key={module.id} className="border-b border-border">
                                        <td className="p-4 font-medium">{module.label}</td>
                                        {ACTIONS.map(action => {
                                            const isChecked = formData.permissions[module.id]?.[action.id];
                                            return (
                                                <td key={action.id} className="p-4 text-center">
                                                    <label className="cursor-pointer" style={{ display: 'inline-flex', width: '24px', height: '24px', borderRadius: '6px', background: isChecked ? '#8b5cf6' : 'var(--bg-main)', border: isChecked ? 'none' : '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
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

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/users')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-3 rounded-lg border-none text-white font-medium flex items-center gap-2" style={{ background: '#8b5cf6', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
                {isEditMode && (
                    <div className="glass-panel p-5 text-textMuted text-sm flex flex-col gap-2 mt-6">
                        {formData.createdBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{formData.createdBy}</span>
                            </div>
                        )}
                        <LastUpdated updatedBy={formData.updatedBy} updatedAt={formData.updatedAt} />
                    </div>
                )}
            </form>
        </div>
    );
};

export default UserFormPage;
