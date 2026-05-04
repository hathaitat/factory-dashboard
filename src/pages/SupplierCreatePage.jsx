import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierForm from '../components/SupplierForm';
import { supplierService } from '../services/supplierService';
import { useDialog } from '../contexts/DialogContext';

const SupplierCreatePage = () => {
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();

    const handleCreate = async (data) => {
        try {
            await supplierService.createSupplier(data);
            await showAlert('เพิ่ม Supplier ใหม่สำเร็จ');
            navigate('/dashboard/suppliers');
        } catch (error) {
            console.error('Error creating supplier:', error);
            showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/suppliers')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    padding: 0
                }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>
            <SupplierForm
                title="เพิ่ม Supplier ใหม่"
                onSubmit={handleCreate}
                initialData={{
                    code: '',
                    name: '',
                    taxId: '',
                    branch: '',
                    contactPerson: '',
                    phone: '',
                    email: '',
                    address: '',
                    creditTerm: 0,
                    status: 'Active',
                    notes: '',
                    categoryIds: []
                }}
            />
        </div>
    );
};

export default SupplierCreatePage;
