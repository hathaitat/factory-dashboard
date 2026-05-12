import { useState, useEffect } from 'react';
import XLSX from 'xlsx-js-style';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileSpreadsheet, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../services/supplierService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';

const SupplierListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();

    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setIsLoading(true);
        try {
            const data = await supplierService.getSuppliers();
            setSuppliers(data || []);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            showError(error.message || 'ไม่สามารถโหลดข้อมูล Supplier ได้');
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล Supplier นี้?');
        if (confirmed) {
            try {
                await supplierService.deleteSupplier(id);
                showAlert('ลบข้อมูลเรียบร้อยแล้ว');
                loadSuppliers();
            } catch (error) {
                showError('ไม่สามารถลบข้อมูลได้: ' + error.message);
            }
        }
    };

    const exportToExcel = async () => {
        try {
            const filteredData = suppliers.filter(s => {
                const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchStatus = !statusFilter || s.status === statusFilter;
                return matchSearch && matchStatus;
            });

            const exportData = filteredData.map(s => ({
                'รหัส Supplier': s.code || '',
                'ชื่อ Supplier': s.name || '',
                'เลขประจำตัวผู้เสียภาษี': s.taxId || '',
                'ผู้ติดต่อ': s.contactPerson || '',
                'เบอร์โทรศัพท์': s.phone || '',
                'อีเมล': s.email || '',
                'ที่อยู่': s.address || '',
                'ประเภท': (s.categoryNames || []).join(', ') || '-',
                'เครดิต (วัน)': s.creditTerm === 0 || s.creditTerm === '0' ? 'เงินสด' : (s.creditTerm || '-'),
                'สถานะ': s.status === 'Active' ? 'ปกติ' : 'ระงับ'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
            XLSX.writeFile(wb, 'Suppliers_Export.xlsx');
        } catch (error) {
            console.error('Error exporting data:', error);
            await showError(error.message || 'เกิดข้อผิดพลาดในการ Export ข้อมูล');
        }
    };

    const hasActiveFilters = !!statusFilter;
    const clearFilters = () => { setStatusFilter(''); };

    const filteredSuppliers = suppliers.filter(s => {
        const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = !statusFilter || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title="ข้อมูล Supplier"
                subtitle="จัดการฐานข้อมูลผู้ขายและคู่ค้าของคุณ"
                helpContent={HELP_CONTENT.suppliers || "จัดการข้อมูลผู้ขาย (Supplier) เพื่อใช้ในระบบจัดซื้อ"}
            >
                <button
                    onClick={exportToExcel}
                    className="btn-excel"
                >
                    <FileSpreadsheet size={20} /> Export Excel
                </button>
                {hasPermission('suppliers', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/suppliers/new')}
                        style={{
                            padding: '0.8rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#3b82f6',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500'
                        }}
                    >
                        <Plus size={20} />
                        เพิ่ม Supplier
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="flex items-center gap-4">
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="ค้นหา Supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="glass-input"
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem 0.8rem 2.8rem',
                                background: 'var(--card-hover)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'var(--text-main)'
                            }}
                        />
                    </div>
                </div>
            </div>

            <ListFilter
                filters={[
                    { type: 'select', label: 'สถานะ', value: statusFilter, onChange: setStatusFilter, options: [
                        { value: '', label: 'ทั้งหมด' },
                        { value: 'Active', label: 'Active (ปกติ)' },
                        { value: 'Inactive', label: 'Inactive (ระงับ)' }
                    ]}
                ]}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="glass-panel" style={{ padding: '0' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>รหัส</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อ Supplier</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ประเภท</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ติดต่อ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>เครดิต (วัน)</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((s) => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <button
                                                    className="action-view"
                                                    onClick={() => navigate(`/dashboard/suppliers/${s.id}`)}
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {hasPermission('suppliers', 'edit') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate(`/dashboard/suppliers/${s.id}/edit`)}
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('suppliers', 'delete') && (
                                                    <button
                                                        className="action-delete"
                                                        onClick={() => handleDelete(s.id)}
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {s.code || '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                {s.name}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                {s.email || '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                {(s.categoryNames || []).length > 0 ? s.categoryNames.map((name, i) => (
                                                    <span key={i} style={{
                                                        display: 'inline-block',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(55, 71, 124, 0.05)',
                                                        fontSize: '0.78rem',
                                                        color: 'var(--primary)',
                                                        border: '1px solid rgba(55, 71, 124, 0.1)'
                                                    }}>
                                                        {name}
                                                    </span>
                                                )) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div>{s.contactPerson || '-'}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.phone}</div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            {s.creditTerm === 0 ? 'เงินสด' : (s.creditTerm ? `${s.creditTerm} วัน` : '-')}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <span style={{
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                background: s.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                color: s.status === 'Active' ? 'var(--success)' : 'var(--text-muted)',
                                                border: `1px solid ${s.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`
                                            }}>
                                                {s.status === 'Active' ? 'ปกติ' : 'ระงับ'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        ไม่พบข้อมูล Supplier ลองค้นหาใหม่หรือเพิ่ม Supplier
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

export default SupplierListPage;
