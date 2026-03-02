import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import { customerService } from '../services/customerService';
import { useDialog } from '../contexts/DialogContext';

const CustomerEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const data = await customerService.getCustomerById(id);
                if (data) {
                    setCustomer(data);
                } else {
                    navigate('/dashboard/customers');
                }
            } catch (error) {
                console.error('Error fetching customer:', error);
                navigate('/dashboard/customers');
            }
        };
        fetchCustomer();
    }, [id, navigate]);

    const handleUpdate = async (data) => {
        try {
            await customerService.updateCustomer(id, data);
            navigate('/dashboard/customers');
        } catch (error) {
            console.error('Error updating customer:', error);
            await showAlert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    if (!customer) return <div>Loading...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <CustomerForm
                title="แก้ไขข้อมูลลูกค้า"
                onSubmit={handleUpdate}
                initialData={customer}
            />
        </div>
    );
};

export default CustomerEditPage;
