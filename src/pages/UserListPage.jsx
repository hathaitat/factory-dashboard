import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Check, X, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';

const UserListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(data || []);
        } catch (error) {
            console.error('Failed to load users:', error);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        const confirmed = await showConfirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${name}"?`);
        if (confirmed) {
            const success = await userService.deleteUser(id);
            if (success) {
                loadUsers();
            } else {
                await showAlert('เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
            }
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const PermissionBadge = ({ label, hasPermission, color }) => (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            background: hasPermission ? `${color}20` : 'var(--card-hover)',
            color: hasPermission ? color : '#666',
            border: `1px solid ${hasPermission ? `${color}40` : 'var(--border-color)'}`,
            marginRight: '0.3rem',
            opacity: hasPermission ? 1 : 0.5
        }}>
            {hasPermission ? <Check size={12} /> : <X size={12} />}
            {label}
        </span>
    );

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>จัดการสิทธิ์ผู้ใช้งาน</h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#888' }}>เพิ่ม ลบ แก้ไข และกำหนดสิทธิ์การเข้าถึง</p>
                </div>
                {hasPermission('users', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/users/new')}
                        style={{
                            padding: '0.8rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#8b5cf6', // Violet for permissions
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500'
                        }}
                    >
                        <Plus size={20} />
                        เพิ่มผู้ใช้งาน
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ หรือ username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input"
                        style={{
                            width: '100%',
                            padding: '0.8rem 1rem 0.8rem 2.8rem',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-main)'
                        }}
                    />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1.2rem', color: '#888', fontWeight: '500' }}>ชื่อ - นามสกุล</th>
                                <th style={{ padding: '1.2rem', color: '#888', fontWeight: '500' }}>Username</th>
                                <th style={{ padding: '1.2rem', color: '#888', fontWeight: '500' }}>สิทธิ์การใช้งาน</th>
                                <th style={{ padding: '1.2rem', color: '#888', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white' }}>
                                                    {user.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                {user.fullName}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#888', marginLeft: '2.5rem' }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: '1.2rem', fontFamily: 'monospace', color: '#aaa' }}>
                                            @{user.username || '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {Object.entries(user.permissions || {}).map(([key, value]) => {
                                                    // Count permissions for this module
                                                    const permCount = Object.values(value).filter(Boolean).length;
                                                    if (permCount === 0) return null;

                                                    // Simple label map
                                                    const labels = {
                                                        customers: 'ลูกค้า',
                                                        invoices: 'ใบกำกับภาษี',
                                                        billing: 'ใบวางบิล',
                                                        employees: 'พนักงาน',
                                                        company: 'บริษัท',
                                                        users: 'ผู้ใช้',
                                                        production: 'ผลิต'
                                                    };

                                                    return (
                                                        <span key={key} style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.2rem 0.6rem',
                                                            borderRadius: '12px',
                                                            background: 'var(--card-hover)',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-muted)'
                                                        }}>
                                                            {labels[key] || key}: {permCount === 4 ? 'Full' : `${permCount} สิทธิ์`}
                                                        </span>
                                                    );
                                                })}
                                                {Object.keys(user.permissions || {}).length === 0 && <span style={{ color: '#666', fontSize: '0.8rem' }}>- ไม่มีสิทธิ์ -</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                {hasPermission('users', 'edit') && (
                                                    <button
                                                        onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
                                                        title="แก้ไขสิทธิ์"
                                                        style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', border: 'none', borderRadius: '6px', color: '#8b5cf6', cursor: 'pointer' }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('users', 'delete') && (
                                                    <button
                                                        onClick={() => handleDelete(user.id, user.fullName)}
                                                        title="ลบผู้ใช้งาน"
                                                        style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                                        ไม่พบผู้ใช้งาน
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserListPage;
