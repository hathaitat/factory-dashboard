import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';

const CustomerListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();

    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await customerService.getCustomers();
            setCustomers(data || []);
        } catch (error) {
            console.error('Failed to load customers:', error);
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลลูกค้านี้?');
        if (confirmed) {
            await customerService.deleteCustomer(id);
            loadCustomers();
        }
    };

    const exportToExcel = async () => {
        try {
            // 1. Prepare Customer Data
            const customerData = customers.map(customer => ({
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
            const customerMap = customers.reduce((acc, cust) => {
                acc[cust.id] = cust;
                return acc;
            }, {});

            const productData = products.map(product => {
                const customer = customerMap[product.customerId] || {};
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
            await showAlert('เกิดข้อผิดพลาดในการ Export ข้อมูล');
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>ข้อมูลลูกค้า</h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>จัดการฐานข้อมูลลูกค้าของคุณ</p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={exportToExcel}
                        className="glass-panel"
                        style={{
                            padding: '0.8rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <FileSpreadsheet size={20} /> Export Excel
                    </button>
                    {hasPermission('customers', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/customers/new')}
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
                            เพิ่มลูกค้า
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="ค้นหาลูกค้า..."
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

            <div className="glass-panel" style={{ padding: '0' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>รหัส</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อบริษัท</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ผู้ติดต่อ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>เครดิต (วัน)</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>สถานะ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1.2rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {customer.code || '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{customer.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{customer.email}</div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div>{customer.contactPerson}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{customer.phone}</div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            {customer.creditTerm === 0 || customer.creditTerm === '0' ? 'เงินสด' : (customer.creditTerm ? `${customer.creditTerm} วัน` : '-')}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <span style={{
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                background: customer.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                                color: customer.status === 'Active' ? '#34d399' : '#9ca3af',
                                                border: `1px solid ${customer.status === 'Active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`
                                            }}>
                                                {customer.status === 'Active' ? 'ปกติ' : 'ระงับ'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                                                    title="ดูรายละเอียด"
                                                    style={{ padding: '0.5rem', background: 'var(--card-hover)', border: 'none', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('customers', 'edit') && (
                                                    <button
                                                        onClick={() => navigate(`/dashboard/customers/${customer.id}/edit`)}
                                                        title="แก้ไข"
                                                        style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer' }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('customers', 'delete') && (
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        title="ลบ"
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
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        ไม่พบข้อมูลลูกค้า ลองค้นหาใหม่หรือเพิ่มลูกค้า
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

export default CustomerListPage;
