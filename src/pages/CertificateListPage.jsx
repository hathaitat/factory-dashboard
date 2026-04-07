import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Download, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { certificateService } from '../services/certificateService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import ListFilter from '../components/ListFilter';

const CertificateListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showError } = useDialog();

    const [certificates, setCertificates] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [expiryFilter, setExpiryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('issue_date');

    useEffect(() => {
        loadCertificates();
    }, []);

    const loadCertificates = async () => {
        setIsLoading(true);
        try {
            const data = await certificateService.getCertificates();
            setCertificates(data || []);
        } catch (error) {
            console.error('Failed to load certificates:', error);
            showError('ไม่สามารถโหลดข้อมูล Certificate ได้');
            setCertificates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, filePath) => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Certificate นี้?');
        if (confirmed) {
            await certificateService.deleteCertificate(id, filePath);
            loadCertificates();
        }
    };

    const hasActiveFilters = !!expiryFilter || !!dateFrom || !!dateTo;
    const clearFilters = () => { setExpiryFilter(''); setDateFrom(''); setDateTo(''); setDateFilterType('issue_date'); };

    const getExpiryCategory = (expiryDate) => {
        if (!expiryDate) return 'normal';
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'expiring';
        return 'normal';
    };

    const filteredCertificates = certificates.filter(cert => {
        const matchSearch = cert.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchExpiry = !expiryFilter || getExpiryCategory(cert.expiry_date) === expiryFilter;
        
        const targetDate = dateFilterType === 'expiry_date' ? cert.expiry_date : cert.issue_date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        
        return matchSearch && matchExpiry && matchDateFrom && matchDateTo;
    });

    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return { label: 'ไม่มีวันหมดอายุ', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
        
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { label: 'หมดอายุ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', isWarning: true };
        } else if (diffDays <= 30) {
            return { label: `ใกล้หมดอายุ (${diffDays} วัน)`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', isWarning: true };
        }
        return { label: 'ปกติ', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title="จัดการ Certificate"
                subtitle="ข้อมูล Certificate และเอกสารรับรองสำหรับลูกค้าและสินค้า"
            >
                {hasPermission('certificates', 'create', true) && ( // Fallback to true if permission module not strictly defined yet
                    <button
                        onClick={() => navigate('/dashboard/certificates/new')}
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
                        เพิ่ม Certificate
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ Certificate..."
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

            <ListFilter
                filters={[
                    { 
                        type: 'date-range', 
                        dateFrom, 
                        dateTo, 
                        onDateFromChange: setDateFrom, 
                        onDateToChange: setDateTo,
                        value: dateFilterType,
                        onChange: setDateFilterType,
                        options: [
                            { value: 'issue_date', label: 'วันที่ออกเอกสาร' },
                            { value: 'expiry_date', label: 'วันหมดอายุ' }
                        ]
                    },
                    { type: 'select', label: 'สถานะหมดอายุ', value: expiryFilter, onChange: setExpiryFilter, options: [
                        { value: '', label: 'ทั้งหมด' },
                        { value: 'normal', label: 'ปกติ' },
                        { value: 'expiring', label: 'ใกล้หมดอายุ' },
                        { value: 'expired', label: 'หมดอายุแล้ว' }
                    ]}
                ]}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="glass-panel" style={{ padding: '0' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อเอกสาร</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>สินค้าที่เกี่ยวข้อง</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>ลูกค้า</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันหมดอายุ</th>
                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '500' }}>สถานะแจ้งเตือน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredCertificates.length > 0 ? (
                                filteredCertificates.map((cert) => {
                                    const status = getExpiryStatus(cert.expiry_date);
                                    
                                    return (
                                    <tr key={cert.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td className="actions-column">
                                                <div className="table-actions">
                                                    {cert.file_url && (
                                                        <a
                                                            className="action-download"
                                                            href={cert.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="ดาวน์โหลด / ดูไฟล์"
                                                        >
                                                            <Download size={18} />
                                                        </a>
                                                    )}
                                                    {hasPermission('certificates', 'edit', true) && (
                                                        <button
                                                            className="action-edit"
                                                            onClick={() => navigate(`/dashboard/certificates/${cert.id}/edit`)}
                                                            title="แก้ไข"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('certificates', 'delete', true) && (
                                                        <button
                                                            className="action-delete"
                                                            onClick={() => handleDelete(cert.id, cert.file_path)}
                                                            title="ลบ"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {cert.name}
                                                {status.isWarning && <AlertTriangle size={14} color="#f59e0b" />}
                                            </div>
                                            {cert.issue_date && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ออกเมื่อ: {new Date(cert.issue_date).toLocaleDateString('th-TH')}</div>}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {cert.certificate_products?.length > 0 
                                                    ? cert.certificate_products.map(p => p.customer_products?.name).filter(Boolean).join(', ')
                                                    : '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {cert.certificate_customers?.length > 0
                                                    ? cert.certificate_customers.map(c => c.customers?.name).filter(Boolean).join(', ')
                                                    : '-'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('th-TH') : '-'}
                                        </td>
                                        <td style={{ padding: '1.2rem' }}>
                                            <span style={{
                                                padding: '0.35rem 1rem',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: status.bg,
                                                color: status.color,
                                                border: `1px solid ${status.color}33`,
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                letterSpacing: '0.01em'
                                            }}>
                                                {status.isWarning && <AlertTriangle size={12} />}
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        ไม่พบข้อมูล Certificate ลองค้นหาใหม่หรือเพิ่มข้อมูล
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

export default CertificateListPage;
