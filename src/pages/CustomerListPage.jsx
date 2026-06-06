import { useState, useEffect } from 'react';
import XLSX from 'xlsx-js-style';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const CustomerListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

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
    } = useServerPagination(customerService.getCustomersPaginated, { searchTerm: '', status: '' }, 50);

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลลูกค้านี้?');
        if (confirmed) {
            await customerService.deleteCustomer(id);
            refresh();
        }
    };

    const exportToExcel = async () => {
        try {
            // Fetch all customers matching the current filter (bypass pagination)
            const allFilteredCustomers = await customerService.exportCustomers({ 
                searchTerm, 
                status: statusFilter 
            });

            // 1. Prepare Customer Data
            const customerData = allFilteredCustomers.map(customer => ({
                'รหัสลูกค้า': customer.code || '',
                'ชื่อบริษัท': customer.name || '',
                'เลขประจำตัวผู้เสียภาษี': customer.taxId || '',
                'ผู้ติดต่อ': customer.contactPerson || '',
                'เบอร์โทรศัพท์': customer.phone || '',
                'อีเมล': customer.email || '',
                'ที่อยู่': customer.address || '',
                'เครดิต (วัน)': customer.creditTerm === 0 || customer.creditTerm === '0' ? 'เงินสด' : (customer.creditTerm || '-'),
                'สถานะ': customer.status === 'Active' ? 'ปกติ' : 'ระงับ'
            }));

            // 2. Prepare Product Data
            const products = await productService.getAllProducts();
            const customerMap = allFilteredCustomers.reduce((acc, cust) => {
                acc[cust.id] = cust;
                return acc;
            }, {});

            const productData = products
                .filter(product => customerMap[product.customerId])
                .map(product => {
                const customer = customerMap[product.customerId];
                return {
                    'รหัสลูกค้า': customer.code || '',
                    'ชื่อบริษัท': customer.name || '',
                    'ชื่อสินค้า': product.name,
                    'ราคา': product.price,
                    'หน่วย': product.unit || ''
                };
            });

            // 3. Create Workbook
            const wb = XLSX.utils.book_new();

            // Add Customers Sheet
            const wsCustomers = XLSX.utils.json_to_sheet(customerData);
            XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

            // Add Products Sheet
            const wsProducts = XLSX.utils.json_to_sheet(productData);
            XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');

            // 4. Save File
            XLSX.writeFile(wb, 'Customers_Products_Export.xlsx');
        } catch (error) {
            console.error('Error exporting data:', error);
            await showError(error.message || 'เกิดข้อผิดพลาดในการ Export ข้อมูล');
        }
    };

    const hasActiveFilters = !!statusFilter;
    const clearFilters = () => { 
        setStatusFilter('');
        updateFilters({ status: '' });
    };

    // Use effect to handle debounced search and filter updates
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, status: statusFilter });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, updateFilters]);

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title="ข้อมูลลูกค้า"
                subtitle="จัดการฐานข้อมูลลูกค้าของคุณ"
                helpContent={HELP_CONTENT.customers}
            >
                <button
                    onClick={exportToExcel}
                    className="glass-panel px-6 py-3 flex items-center gap-2 bg-success/5 border border-success/10 text-success cursor-pointer rounded-lg font-medium"
                >
                    <FileSpreadsheet size={20} /> Export Excel
                </button>
                {hasPermission('customers', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/customers/new')}
                        className="px-6 py-3 rounded-lg border-none bg-blue-500 text-white cursor-pointer flex items-center gap-2 font-medium"
                    >
                        <Plus size={20} />
                        เพิ่มลูกค้า
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel p-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input
                            type="text"
                            placeholder="ค้นหาลูกค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="glass-input w-full py-3 pr-4 pl-11 bg-card-hover border border-border rounded-lg text-textMain"
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
                <div className="table-responsive-wrapper overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="p-5 text-textMuted font-medium">รหัส</th>
                                <th className="p-5 text-textMuted font-medium">ชื่อบริษัท</th>
                                <th className="p-5 text-textMuted font-medium">ผู้ติดต่อ</th>
                                <th className="p-5 text-textMuted font-medium">เครดิต (วัน)</th>
                                <th className="p-5 text-textMuted font-medium">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-textMuted">
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((customer) => (
                                    <tr key={customer.id} className="border-b border-border">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <button
                                                    className="action-view"
                                                    onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {hasPermission('customers', 'edit') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate(`/dashboard/customers/${customer.id}/edit`)}
                                                        title="แก้ไข"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('customers', 'delete') && (
                                                    <button
                                                        className="action-delete"
                                                        onClick={() => handleDelete(customer.id)}
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-textMuted font-mono">
                                            {customer.code || '-'}
                                        </td>
                                        <td className="p-5">
                                            <div 
                                                onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                                                className="font-semibold text-blue-500 cursor-pointer hover:underline"
                                                title="คลิกเพื่อดูรายละเอียด"
                                            >
                                                {customer.name}
                                            </div>
                                            <div className="text-[0.85rem] text-textMuted">{customer.email}</div>
                                        </td>
                                        <td className="p-5">
                                            <div>{customer.contactPerson}</div>
                                            <div className="text-[0.85rem] text-textMuted">{customer.phone}</div>
                                        </td>
                                        <td className="p-5">
                                            {customer.creditTerm === 0 || customer.creditTerm === '0' ? 'เงินสด' : (customer.creditTerm ? `${customer.creditTerm} วัน` : '-')}
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-[0.85rem] border ${
                                                customer.status === 'Active' 
                                                    ? 'bg-success/20 text-success border-success/30' 
                                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                            }`}>
                                                {customer.status === 'Active' ? 'ปกติ' : 'ระงับ'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">
                                        ไม่พบข้อมูลลูกค้า ลองค้นหาใหม่หรือเพิ่มลูกค้า
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
        </div >
    );
};

export default CustomerListPage;
