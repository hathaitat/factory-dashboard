import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierForm from '../components/SupplierForm';
import { supplierService } from '../services/supplierService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';

const SupplierCreatePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();

    const handleCreate = async (data) => {
        try {
            const currentUser = user;
            const payload = {
                ...data,
                createdBy: currentUser?.fullName || currentUser?.username || 'Unknown',
                updatedBy: currentUser?.fullName || currentUser?.username || 'Unknown'
            };
            await supplierService.createSupplier(payload);
            await showAlert('เพิ่ม Supplier ใหม่สำเร็จ');
            navigate('/dashboard/suppliers');
        } catch (error) {
            console.error('Error creating supplier:', error);
            showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    return (
        <div className="px-4 pb-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/suppliers')}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-6 p-0 flex items-center gap-2"
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
