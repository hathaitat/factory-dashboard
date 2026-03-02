import { useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import { customerService } from '../services/customerService';
import { useDialog } from '../contexts/DialogContext';

const CustomerCreatePage = () => {
    const navigate = useNavigate();
    const { showAlert } = useDialog();

    const handleCreate = async (data) => {
        try {
            await customerService.createCustomer(data);
            navigate('/dashboard/customers');
        } catch (error) {
            console.error('Error creating customer:', error);
            await showAlert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
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
