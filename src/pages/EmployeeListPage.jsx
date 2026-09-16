import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, FileSpreadsheet, Eye } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { usePermissions } from '../hooks/usePermissions';
import * as XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const EmployeeListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');

    const {
        data: paginatedEmployees,
        totalItems,
        totalPages,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        updateFilters,
        startItem,
        endItem,
        isLoading,
        refresh
    } = useServerPagination(employeeService.getEmployeesPaginated, { searchTerm: '' }, 50);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, updateFilters]);

    const exportEmployeeListToExcel = async () => {
        try {
            const exportData = await employeeService.exportEmployees({ searchTerm });
            const data = exportData.map(emp => ({
                'รหัส': emp.code,
                'ชื่อ-นามสกุล': emp.full_name,
                'ตำแหน่ง': emp.position,
                'ประเภทการจ้าง': emp.employment_type,
                'เบอร์โทร': emp.phone,
                'เงินเดือน': emp.monthly_salary,
                'ค่าแรงรายวัน': emp.daily_wage,
                'เบี้ยขยัน': emp.diligence_allowance,
                'สถานะ': emp.status === 'Active' ? 'ปกติ' : 'ระงับ'
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Employees");
            XLSX.writeFile(wb, `EmployeeList_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Error exporting employees:', error);
            await showAlert('ไม่สามารถส่งออกข้อมูลได้');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        const confirmed = await showConfirm('คุณแน่ใจว่าต้องการลบข้อมูลพนักงานนี้?');
        if (confirmed) {
            const success = await employeeService.deleteEmployee(id);
            if (success) {
                refresh();
            } else {
                await showAlert('ไม่สามารถลบข้อมูลพนักงานได้ อาจมีการใช้งานข้อมูลนี้อยู่');
            }
        }
    };

    const handleRowClick = (emp) => {
        navigate(`/dashboard/employees/${emp.id}/edit`);
    };

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title="รายชื่อพนักงาน"
                subtitle="จัดการข้อมูลพนักงานและค่าแรง"
                helpContent={HELP_CONTENT.employees}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportEmployeeListToExcel}
                        className="px-5 py-3 rounded-lg border border-slate-200 bg-white text-emerald-500 cursor-pointer flex items-center gap-2 font-medium text-[0.95rem]"
                    >
                        <FileSpreadsheet size={18} /> Export List
                    </button>
                    {hasPermission('employees', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/employees/new')}
                            className="px-5 py-3 rounded-lg border-none bg-primary text-white cursor-pointer flex items-center gap-2 font-medium text-[0.95rem] shadow-sm hover:opacity-90"
                        >
                            <Plus size={18} /> เพิ่มพนักงานใหม่
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* Search Bar */}
            <div className="glass-panel p-4 mb-6 flex items-center gap-4">
                <Search size={20} color="#888" />
                <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัสพนักงาน, เบอร์โทร..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input border-none bg-transparent w-full text-base outline-none text-main"
                />
            </div>

            {/* Employee Table */}
            <div className="glass-panel p-0 overflow-hidden">
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="actions-column text-gray-500 font-medium">จัดการ</th>
                                <th className="p-5 text-gray-500 font-medium">รหัส</th>
                                <th className="p-5 text-gray-500 font-medium">ชื่อ - นามสกุล</th>
                                <th className="p-5 text-gray-500 font-medium">ตำแหน่ง</th>
                                <th className="p-5 text-gray-500 font-medium">เบอร์โทร</th>
                                <th className="p-5 text-center text-gray-500 font-medium">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-12 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>
                            ) : paginatedEmployees.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center">ไม่พบข้อมูลพนักงาน</td></tr>
                            ) : (
                                paginatedEmployees.map(emp => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => handleRowClick(emp)}
                                        className="border-b border-border cursor-pointer transition-colors hover:bg-slate-50"
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(55, 71, 124, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <button className="action-view" title="ดูรายละเอียด" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${emp.id}/edit`); }}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('employees', 'edit') && (
                                                    <button className="action-edit" title="แก้ไขข้อมูล" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${emp.id}/edit`); }}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('employees', 'delete') && (
                                                    <button className="action-delete" title="ลบ" onClick={(e) => handleDelete(e, emp.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 font-mono text-gray-500">{emp.code}</td>
                                        <td className="p-5 font-medium text-main">{emp.full_name}</td>
                                        <td className="p-5 text-gray-500">{emp.position || '-'}</td>
                                        <td className="p-5 text-gray-500">{emp.phone || '-'}</td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                {emp.status === 'Active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {emp.status === 'Active' ? 'ปกติ' : 'ระงับ'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={totalItems}
                    startItem={startItem}
                    endItem={endItem}
                />
            </div>
        </div>
    );
};

export default EmployeeListPage;
