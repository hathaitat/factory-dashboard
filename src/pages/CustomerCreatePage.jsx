import { useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import { customerService } from '../services/customerService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';

const CustomerCreatePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showAlert } = useDialog();

    const handleCreate = async (data) => {
        try {
            const currentUser = user;
            const payload = {
                ...data,
                createdBy: currentUser?.fullName || currentUser?.username || 'Unknown',
                updatedBy: currentUser?.fullName || currentUser?.username || 'Unknown'
            };
            await customerService.createCustomer(payload);
            navigate('/dashboard/customers');
        } catch (error) {
            console.error('Error creating customer:', error);
            await showAlert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    return (
        <div className="px-4 pb-8">
            <CustomerForm
                title="เพิ่มลูกค้าใหม่"
                onSubmit={handleCreate}
                initialData={{
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    status: 'Active',
                    contactPerson: ''
                }}
            />
        </div>
    );
};

export default CustomerCreatePage;
