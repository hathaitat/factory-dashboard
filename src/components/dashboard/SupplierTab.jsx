import { useState, useEffect } from 'react';
import { Truck, Search, Eye, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../../services/supplierService';

const SupplierTab = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await supplierService.getSuppliers();
            setSuppliers(data || []);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Show top 5 on dashboard

    return (
        <div className="tab-content">
            <div className="kpi-grid">
                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <Truck size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนผู้ขายทั้งหมด</span>
                        <span className="kpi-value">{suppliers.length} <span className="unit">ราย</span></span>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>ผู้ขายรายล่าสุด</h3>
                    <button
                        onClick={() => navigate('/dashboard/suppliers')}
                        className="btn-text"
                        style={{ color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                        ดูทั้งหมด
                    </button>
                </div>

                <div className="table-responsive-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>รหัส</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ชื่อผู้ขาย</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ผู้ติดต่อ</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</td></tr>
                            ) : filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{s.code}</td>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{s.name}</td>
                                        <td style={{ padding: '1rem' }}>{s.contactPerson}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => navigate(`/dashboard/suppliers/${s.id}/edit`)}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierTab;
