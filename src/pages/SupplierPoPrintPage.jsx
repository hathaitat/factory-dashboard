import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { companyService } from '../services/companyService';
import SupplierPoPrintTemplate from '../components/SupplierPoPrintTemplate';

const SupplierPoPrintPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [poData, compData] = await Promise.all([
                supplierPoService.getSupplierPoById(id),
                companyService.getCompanyInfo()
            ]);
            setPo(poData);
            setCompany(compData);
        } catch (error) {
            console.error('Error fetching PO for print:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลใบสั่งซื้อ...</div>;
    if (!po) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>ไม่พบข้อมูลใบสั่งซื้อ</div>;

    return (
        <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>
                {`
                @media print {
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .print-content { padding: 0 !important; margin: 0 !important; }
                    @page { margin: 0; size: A4; }
                }
                `}
            </style>

            {/* Dark Preview Control Bar */}
            <div className="no-print" style={{ 
                padding: '0.8rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center',
                gap: '1rem',
                background: '#111', 
                color: 'white', 
                position: 'sticky', 
                top: 0, 
                zIndex: 100,
                borderBottom: '1px solid #333'
            }}>
                <button 
                    onClick={() => navigate(`/dashboard/supplier-pos/${id}`)} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                
                <button 
                    onClick={handlePrint} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: '#3b82f6', border: 'none', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Printer size={18} /> พิมพ์ใบสั่งซื้อ
                </button>
            </div>

            {/* Paper Preview Area */}
            <div className="print-content" style={{ 
                padding: '40px 20px', 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'flex-start',
                overflowY: 'auto',
                flex: 1
            }}>
                <div style={{ 
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    width: 'fit-content'
                }}>
                    <SupplierPoPrintTemplate po={po} company={company} />
                </div>
            </div>
        </div>
    );
};

export default SupplierPoPrintPage;
