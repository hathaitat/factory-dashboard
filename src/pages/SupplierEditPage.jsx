import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierForm from '../components/SupplierForm';
import { supplierService } from '../services/supplierService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';

const SupplierEditPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();
    const [supplier, setSupplier] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSupplier = async () => {
            try {
                const data = await supplierService.getSupplierById(id);
                if (data) {
                    setSupplier(data);
                } else {
                    showError('ไม่พบข้อมูล Supplier');
                    navigate('/dashboard/suppliers');
                }
            } catch (error) {
                console.error('Error fetching supplier:', error);
                showError('ไม่สามารถโหลดข้อมูล Supplier ได้');
                navigate('/dashboard/suppliers');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSupplier();
    }, [id, navigate, showError]);

    const handleUpdate = async (data) => {
        try {
            const currentUser = user;
            const payload = {
                ...data,
                updatedBy: currentUser?.fullName || currentUser?.username || 'Unknown'
            };
            await supplierService.updateSupplier(id, payload);
            await showAlert('บันทึกข้อมูลสำเร็จ');
            navigate('/dashboard/suppliers');
        } catch (error) {
            console.error('Error updating supplier:', error);
            showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;
    if (!supplier) return null;

    return (
        <div className="px-4 pb-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate('/dashboard/suppliers')}
                className="bg-transparent border-none text-textMuted cursor-pointer mb-6 p-0 flex items-center gap-2"
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>
            <SupplierForm
                title="แก้ไขข้อมูล Supplier"
                onSubmit={handleUpdate}
                initialData={supplier}
            />
        </div>
    );
};

export default SupplierEditPage;
