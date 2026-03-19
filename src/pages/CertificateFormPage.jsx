import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Upload } from 'lucide-react';
import { certificateService } from '../services/certificateService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';

const CertificateFormPage = () => {
    const { id } = useParams();
    const isEditMode = !!id;
    const navigate = useNavigate();
    const { showError, showAlert } = useDialog();

    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        issue_date: '',
        expiry_date: '',
        status: 'Active',
        file: null,       // File object when uploading a new file
        file_url: '',     // Existing URL
        file_path: ''     // Existing Path
    });

    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [custData, prodData] = await Promise.all([
                    customerService.getCustomers(),
                    productService.getAllProducts()
                ]);
                setCustomers(custData || []);
                setProducts(prodData || []);

                if (isEditMode) {
                    const certData = await certificateService.getCertificateById(id);
                    if (certData) {
                        setFormData({
                            name: certData.name,
                            issue_date: certData.issue_date || '',
                            expiry_date: certData.expiry_date || '',
                            status: certData.status || 'Active',
                            file: null,
                            file_url: certData.file_url || '',
                            file_path: certData.file_path || ''
                        });
                        setSelectedProducts(certData.certificate_products?.map(p => p.product_id) || []);
                        setSelectedCustomers(certData.certificate_customers?.map(c => c.customer_id) || []);
                    }
                }
            } catch (error) {
                console.error("Error loading form data:", error);
                showError("ไม่สามารถโหลดข้อมูลเบื้องต้นได้");
            } finally {
                setPageLoading(false);
            }
        };
        loadInitialData();
    }, [id, isEditMode]);

    const handleProductChange = (e) => {
        const value = e.target.value; // Product IDs are UUIDs, do NOT parse as Int
        setSelectedProducts(prev => 
            e.target.checked ? [...prev, value] : prev.filter(p => p !== value)
        );
    };

    const handleCustomerChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (e.target.checked) {
            setSelectedCustomers(prev => [...prev, value]);
        } else {
            setSelectedCustomers(prev => prev.filter(c => c !== value));
            // Also remove products that belong to this customer so they don't get saved invisibly
            const productIdsOfCustomer = products.filter(p => p.customerId === value).map(p => p.id);
            setSelectedProducts(prev => prev.filter(pid => !productIdsOfCustomer.includes(pid)));
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name) {
            return showError('กรุณากรอกชื่อ Certificate');
        }

        if (!isEditMode && !formData.file) {
            return showError('กรุณาอัปโหลดไฟล์ Certificate (PDF/Image)');
        }

        setIsLoading(true);

        try {
            let uploadedFileUrl = formData.file_url;
            let uploadedFilePath = formData.file_path;

            // Handle file upload if there's a new file
            if (formData.file) {
                // Upload new file
                const uploadResult = await certificateService.uploadFile(formData.file);
                if (!uploadResult) {
                    throw new Error('ไม่สามารถอัปโหลดไฟล์ได้');
                }
                uploadedFileUrl = uploadResult.url;
                uploadedFilePath = uploadResult.path;

                // Delete old file if in edit mode
                if (isEditMode && formData.file_path) {
                    await certificateService.deleteFile(formData.file_path);
                }
            }

            const certDataForDb = {
                name: formData.name,
                issue_date: formData.issue_date || null,
                expiry_date: formData.expiry_date || null,
                status: formData.status,
                file_url: uploadedFileUrl,
                file_path: uploadedFilePath
            };

            if (isEditMode) {
                await certificateService.updateCertificate(id, certDataForDb, selectedProducts, selectedCustomers);
                await showAlert('อัปเดต Certificate เรียบร้อยแล้ว');
            } else {
                await certificateService.createCertificate(certDataForDb, selectedProducts, selectedCustomers);
                await showAlert('เพิ่ม Certificate เรียบร้อยแล้ว');
            }

            navigate('/dashboard/certificates');
        } catch (error) {
            console.error('Submit error:', error);
            showError('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
        } finally {
            setIsLoading(false);
        }
    };

    if (pageLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title={isEditMode ? "แก้ไข Certificate" : "เพิ่ม Certificate ใหม่"}
                subtitle="เพิ่มหรือแก้ไขข้อมูลเอกสารรับรองสำหรับลูกค้าและสินค้า"
                onBack={() => navigate('/dashboard/certificates')}
            />

            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    
                    {/* Basic Info */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>ชื่อเอกสาร Certificate <span style={{color:'red'}}>*</span></label>
                        <input
                            type="text"
                            className="glass-input"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-hover)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>วันที่ออกเอกสาร (Issue Date)</label>
                            <input
                                type="date"
                                className="glass-input"
                                value={formData.issue_date}
                                onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-hover)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>วันหมดอายุ (Expiry Date)</label>
                            <input
                                type="date"
                                className="glass-input"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-hover)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>
                            อัปโหลดไฟล์ Certificate {isEditMode && formData.file_url ? `(มีไฟล์อยู่แล้ว สามารถอัปโหลดใหม่เพื่อเปลี่ยน)` : <span style={{color:'red'}}>*</span>}
                        </label>
                        <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileChange}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-hover)', color: 'var(--text-main)' }}
                        />
                        {isEditMode && formData.file_url && !formData.file && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <a href={formData.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                                    คลิกเพื่อดูไฟล์ปัจจุบัน
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Relations */}
                    <hr style={{ margin: '2rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Select Customers (Moved to Left) */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>เลือกลูกค้า (Customers) <span style={{color:'var(--text-muted)', fontSize:'0.9rem', fontWeight:'normal'}}>(เลือกก่อน)</span></label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                                {customers.length === 0 ? <div style={{color:'var(--text-muted)'}}>ไม่มีข้อมูลลูกค้า</div> : customers.map(c => (
                                    <div key={`c-${c.id}`} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            id={`cust-${c.id}`}
                                            value={c.id}
                                            checked={selectedCustomers.includes(c.id)}
                                            onChange={handleCustomerChange}
                                        />
                                        <label htmlFor={`cust-${c.id}`} style={{ color: 'var(--text-main)', cursor: 'pointer' }}>{c.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Select Products (Filtered by selected customers) */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-main)' }}>เลือกสินค้าที่เกี่ยวข้อง (Products)</label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                                {selectedCustomers.length === 0 ? (
                                    <div style={{color:'var(--text-muted)'}}>กรุณาเลือกลูกค้าก่อน</div>
                                ) : (
                                    products.filter(p => selectedCustomers.includes(p.customerId)).length === 0 ? (
                                        <div style={{color:'var(--text-muted)'}}>ไม่มีสินค้าสำหรับลูกค้าที่เลือก</div>
                                    ) : (
                                        products.filter(p => selectedCustomers.includes(p.customerId)).map(p => (
                                            <div key={`p-${p.id}`} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`prod-${p.id}`}
                                                    value={p.id}
                                                    checked={selectedProducts.includes(p.id)}
                                                    onChange={handleProductChange}
                                                />
                                                <label htmlFor={`prod-${p.id}`} style={{ color: 'var(--text-main)', cursor: 'pointer' }}>{p.name}</label>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/certificates')}
                            className="glass-panel"
                            style={{
                                padding: '0.8rem 1.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-main)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <X size={20} />
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '0.8rem 1.5rem',
                                border: 'none',
                                background: isLoading ? '#9ca3af' : '#3b82f6',
                                color: 'white',
                                borderRadius: '8px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500'
                            }}
                        >
                            <Save size={20} />
                            {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CertificateFormPage;
