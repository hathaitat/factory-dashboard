import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';

const UserListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { hasPermission, user: currentUser } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
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
            try {
                await userService.deleteUser(id);
                loadUsers();
            } catch (error) {
                await showError(error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
            }
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginatedData, totalItems, totalPages, startItem, endItem } = usePagination(filteredUsers, 50);

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title="จัดการสิทธิ์ผู้ใช้งาน"
                subtitle="เพิ่ม ลบ แก้ไข และกำหนดสิทธิ์การเข้าถึง"
                helpContent={HELP_CONTENT.users}
            >
                {hasPermission('users', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/users/new')}
                        className="px-6 py-3 rounded-lg border-none text-white cursor-pointer font-medium flex items-center gap-2" style={{ background: '#8b5cf6' }}
                    >
                        <Plus size={20} /> เพิ่มผู้ใช้งาน
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel p-6 mb-8">
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ หรือ username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input w-full bg-main border border-border rounded-lg text-main" style={{ padding: '0.8rem 1rem 0.8rem 2.8rem' }}
                    />
                </div>
            </div>

            <div className="glass-panel p-0">
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
<table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="actions-column text-gray-400 font-medium">จัดการ</th>
                                <th className="p-5 text-gray-400 font-medium">ชื่อ - นามสกุล</th>
                                <th className="p-5 text-gray-400 font-medium">Username</th>
                                <th className="p-5 text-gray-400 font-medium">เข้าใช้งานล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((user) => {
                                    const isSuperadmin = user.username === 'superadmin';
                                    return (
                                    <tr key={user.id} className="border-b border-border">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                {hasPermission('users', 'view') && (
                                                    <button
                                                        className="action-view"
                                                        onClick={() => navigate(`/dashboard/users/${user.id}`)}
                                                        title="ดูรายละเอียด"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('users', 'edit') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
                                                        title="แก้ไขสิทธิ์"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('users', 'delete') && String(user?.id) !== String(currentUser?.id) && !isSuperadmin && (
                                                    <button
                                                        className="action-delete"
                                                        onClick={() => handleDelete(user.id, user.fullName)}
                                                        title="ลบผู้ใช้งาน"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-medium flex items-center gap-2">
                                                <div className="text-sm text-white" style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSuperadmin ? '#f59e0b' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {isSuperadmin ? <Shield size={16} /> : user.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span
                                                    onClick={() => navigate(`/dashboard/users/${user.id}`)}
                                                    className="cursor-pointer text-primary no-underline font-semibold"
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {user.fullName}
                                                </span>
                                                {isSuperadmin && (
                                                    <span className="text-white rounded-xl font-semibold" style={{ fontSize: '0.7rem', background: '#f59e0b', padding: '0.15rem 0.5rem' }}>
                                                        SUPERADMIN
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400" style={{ marginLeft: '2.5rem' }}>{user.email}</div>
                                        </td>
                                        <td className="p-5 font-mono" style={{ color: '#aaa' }}>
                                            @{user.username || '-'}
                                        </td>
                                        <td className="p-5">
                                            {user.lastLoginAt ? (
                                                <span className="text-sm text-main">
                                                    {new Date(user.lastLoginAt).toLocaleString('th-TH')}
                                                </span>
                                            ) : (
                                                <span className="text-sm" style={{ color: '#aaa', fontStyle: 'italic' }}>ยังไม่เคยเข้าสู่ระบบ</span>
                                            )}
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center text-gray-400">
                                        ไม่พบผู้ใช้งาน
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
</div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    startItem={startItem}
                    endItem={endItem}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>
        </div>
    );
};

export default UserListPage;
