import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierForm from '../components/SupplierForm';
import { supplierService } from '../services/supplierService';
import { useDialog } from '../contexts/DialogContext';

const SupplierEditPage = () => {
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
            await supplierService.updateSupplier(id, data);
            await showAlert('บันทึกข้อมูลสำเร็จ');
            navigate('/dashboard/suppliers');
        } catch (error) {
            console.error('Error updating supplier:', error);
            showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!supplier) return null;

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
                title="แก้ไขข้อมูล Supplier"
                onSubmit={handleUpdate}
                initialData={supplier}
            />
        </div>
    );
};

export default SupplierEditPage;
