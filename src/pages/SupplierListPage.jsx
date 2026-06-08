import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import XLSX from 'xlsx-js-style';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileSpreadsheet, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../services/supplierService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const SupplierListPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const {
        data: paginatedData,
        totalItems,
        totalPages,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        isLoading,
        updateFilters,
        startItem,
        endItem,
        refresh
    } = useServerPagination(supplierService.getSuppliersPaginated, { searchTerm: '', status: '' }, 50);

    // Debounce filters
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, status: statusFilter });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, updateFilters]);

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล Supplier นี้?');
        if (confirmed) {
            try {
                await supplierService.deleteSupplier(id);
                showAlert('ลบข้อมูลเรียบร้อยแล้ว');
                refresh();
            } catch (error) {
                showError('ไม่สามารถลบข้อมูลได้: ' + error.message);
            }
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const exportData = await supplierService.exportSuppliers({
                searchTerm,
                status: statusFilter
            });

            const dataToExport = exportData.map(s => ({
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
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
            XLSX.writeFile(wb, 'Suppliers_Export.xlsx');
            await showAlert(`ส่งออก Excel เรียบร้อย (${dataToExport.length} รายการ)`);
        } catch (error) {
            console.error('Error exporting data:', error);
            await showError(error.message || 'เกิดข้อผิดพลาดในการ Export ข้อมูล');
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = !!statusFilter;
    const clearFilters = () => { 
        setStatusFilter(''); 
        updateFilters({ status: '' });
    };

    return (
        <div className="px-4 pb-8">
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
                        className="px-6 py-3 rounded-lg border-none text-white cursor-pointer font-medium flex items-center gap-2" style={{ background: '#3b82f6' }}
                    >
                        <Plus size={20} />
                        เพิ่ม Supplier
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel p-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative" style={{ flex: 1 }}>
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input
                            type="text"
                            placeholder="ค้นหา Supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="glass-input w-full bg-cardHover border border-border rounded-lg text-main" style={{ padding: '0.8rem 1rem 0.8rem 2.8rem' }}
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

            <div className="glass-panel p-0">
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="p-5 text-textMuted font-medium">รหัส</th>
                                <th className="p-5 text-textMuted font-medium">ชื่อ Supplier</th>
                                <th className="p-5 text-textMuted font-medium">ประเภท</th>
                                <th className="p-5 text-textMuted font-medium">ผู้ติดต่อ</th>
                                <th className="p-5 text-textMuted font-medium">เครดิต (วัน)</th>
                                <th className="p-5 text-textMuted font-medium">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((s) => (
                                    <tr key={s.id} className="border-b border-border table-row-hover">
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
                                        <td className="p-5 text-textMuted font-mono">
                                            {s.code || '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div 
                                                onClick={() => navigate(`/dashboard/suppliers/${s.id}`)}
                                                className="font-semibold text-blue-500 cursor-pointer underline"
                                                title="คลิกเพื่อดูรายละเอียด"
                                            >
                                                {s.name}
                                            </div>
                                            <div className="text-sm text-textMuted" style={{ marginTop: '0.2rem' }}>
                                                {s.email || '-'}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                                {(s.categoryNames || []).length > 0 ? s.categoryNames.map((name, i) => (
                                                    <span key={i} className="text-primary" style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'rgba(55, 71, 124, 0.05)', fontSize: '0.78rem', border: '1px solid rgba(55, 71, 124, 0.1)' }}>
                                                        {name}
                                                    </span>
                                                )) : (
                                                    <span className="text-textMuted text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div>{s.contactPerson || '-'}</div>
                                            <div className="text-sm text-textMuted">{s.phone}</div>
                                        </td>
                                        <td className="p-5">
                                            {s.creditTerm === 0 ? 'เงินสด' : (s.creditTerm ? `${s.creditTerm} วัน` : '-')}
                                        </td>
                                        <td className="p-5">
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
                                    <td colSpan="7" className="p-12 text-center text-textMuted">
                                        ไม่พบข้อมูล Supplier ลองค้นหาใหม่หรือเพิ่ม Supplier
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

export default SupplierListPage;
