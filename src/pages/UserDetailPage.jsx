import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, User, Mail, Shield, Calendar, ShieldCheck, Check, X, Clock } from 'lucide-react';
import { userService } from '../services/userService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import LastUpdated from '../components/LastUpdated';

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
    { id: 'envelopes', label: 'ใบปะหน้าซองจดหมาย' },
    { id: 'employees', label: 'พนักงาน' },
    { id: 'company', label: 'ข้อมูลบริษัท' },
    { id: 'users', label: 'สิทธิ์การใช้งาน' },
    { id: 'settings', label: 'ตั้งค่าระบบ' },
    { id: 'production', label: 'ข้อมูลการผลิต' },
    { id: 'internal_items', label: 'ของใช้ในโรงงาน (Items)' },
    { id: 'internal_requisitions', label: 'ประวัติการเบิก/สั่งซื้อ (History)' },
    { id: 'alerts', label: 'การแจ้งเตือน (Alerts)' }
];

const UserDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showAlert } = useDialog();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, [id]);

    const loadUser = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getUserById(id);
            if (data) {
                setUser(data);
            } else {
                await showAlert('ไม่พบข้อมูลผู้ใช้งาน');
                navigate('/dashboard/users');
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            navigate('/dashboard/users');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-textMuted">กำลังโหลดข้อมูล...</div>;
    if (!user) return null;

    const canEdit = hasPermission('users', 'edit');

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title="รายละเอียดสิทธิ์ผู้ใช้งาน"
                subtitle="ข้อมูลส่วนตัวและสิทธิ์การเข้าใช้งานระบบ"
            >
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/dashboard/users')}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-main cursor-pointer rounded-lg font-medium text-sm flex items-center gap-2"
                    >
                        <ArrowLeft size={18} /> ย้อนกลับ
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
                            className="px-5 py-2.5 border-none text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: '#8b5cf6', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)' }}
                        >
                            <Edit2 size={18} /> แก้ไขสิทธิ์ผู้ใช้งาน
                        </button>
                    )}
                </div>
            </PageHeader>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }} className="grid-mobile-stack">
                {/* Left Card: Profile Details */}
                <div className="glass-panel p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="border-b border-border" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingBottom: '1.5rem' }}>
                        <div className="text-white mb-2" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="m-0 text-main text-center" style={{ fontSize: '1.4rem' }}>{user.fullName}</h2>
                        <span className="text-sm text-textMuted">@{user.username}</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="text-sm text-textMuted flex items-center gap-2" style={{ marginBottom: '0.3rem' }}>
                                <Mail size={14} /> อีเมล
                            </div>
                            <div className="text-[0.95rem] text-main" style={{ paddingLeft: '1.25rem' }}>{user.email || '-'}</div>
                        </div>

                        <div>
                            <div className="text-sm text-textMuted flex items-center gap-2" style={{ marginBottom: '0.3rem' }}>
                                <Clock size={14} /> เข้าใช้งานล่าสุด
                            </div>
                            <div className="text-[0.95rem] text-main" style={{ paddingLeft: '1.25rem' }}>
                                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('th-TH') : '-'}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-textMuted flex items-center gap-2" style={{ marginBottom: '0.3rem' }}>
                                <Calendar size={14} /> วันที่สร้างบัญชี
                            </div>
                            <div className="text-[0.95rem] text-main" style={{ paddingLeft: '1.25rem' }}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleString('th-TH') : '-'}
                            </div>
                        </div>

                        {(user.createdBy || user.updatedBy) && (
                            <div className="text-sm text-textMuted flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                {user.createdBy && (
                                    <div>สร้างโดย: <span className="font-semibold text-main">{user.createdBy}</span></div>
                                )}
                                {user.updatedBy && (
                                    <LastUpdated updatedBy={user.updatedBy} updatedAt={user.updatedAt} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Card: Permissions Matrix */}
                <div className="glass-panel p-6">
                    <h3 className="mt-0 mb-6 text-violet-500 flex items-center gap-2">
                        <ShieldCheck size={20} /> ตารางกำหนดสิทธิ์การเข้าใช้งาน
                    </h3>

                    <div className="table-responsive-wrapper overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="text-textMuted" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th className="p-3">เมนู / โมดูลระบบ</th>
                                    <th className="p-3 text-center">ดูข้อมูล</th>
                                    <th className="p-3 text-center">สร้าง</th>
                                    <th className="p-3 text-center">แก้ไข</th>
                                    <th className="p-3 text-center">ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map((module) => {
                                    const mPerms = user.permissions?.[module.id] || { view: false, create: false, edit: false, delete: false };
                                    return (
                                        <tr key={module.id} className="border-b border-border">
                                            <td className="p-3 font-medium text-main">
                                                {module.label}
                                            </td>
                                            {['view', 'create', 'edit', 'delete'].map((action) => {
                                                const hasAction = !!mPerms[action];
                                                return (
                                                    <td key={action} className="p-3 text-center">
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            background: hasAction ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                                                            color: hasAction ? 'var(--success)' : '#666',
                                                            opacity: hasAction ? 1 : 0.4
                                                        }}>
                                                            {hasAction ? <Check size={14} /> : <X size={14} />}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailPage;
