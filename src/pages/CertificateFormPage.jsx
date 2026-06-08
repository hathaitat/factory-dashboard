import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, User } from 'lucide-react';
import { certificateService } from '../services/certificateService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import PageHeader from '../components/PageHeader';
import LastUpdated from '../components/LastUpdated';
import { useAuth } from '../contexts/AuthContext';

const CertificateFormPage = () => {
    const { user } = useAuth();
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
        file_path: '',     // Existing Path
        createdBy: '',
        updatedBy: ''
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
                            file_path: certData.file_path || '',
                            createdBy: certData.created_by || '',
                            updatedBy: certData.updated_by || '',
                            updatedAt: certData.updated_at || ''
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

            const currentUser = user;
            const operatorName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const certDataForDb = {
                name: formData.name,
                issue_date: formData.issue_date || null,
                expiry_date: formData.expiry_date || null,
                status: formData.status,
                file_url: uploadedFileUrl,
                file_path: uploadedFilePath,
                createdBy: isEditMode ? (formData.createdBy || operatorName) : operatorName,
                updatedBy: operatorName
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

    if (pageLoading) return <div className="p-8 text-center text-textMuted">กำลังโหลด...</div>;

    return (
        <div className="px-4 pb-8">
            <PageHeader
                title={isEditMode ? "แก้ไข Certificate" : "เพิ่ม Certificate ใหม่"}
                subtitle="เพิ่มหรือแก้ไขข้อมูลเอกสารรับรองสำหรับลูกค้าและสินค้า"
                onBack={() => navigate('/dashboard/certificates')}
            >
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/certificates')}
                    className="btn-secondary py-[0.6rem] px-6 rounded-lg flex items-center gap-2"
                >
                    <X size={18} />
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    form="certificate-form"
                    disabled={isLoading}
                    className={`btn-primary py-[0.6rem] px-6 rounded-lg flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <Save size={18} />
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </PageHeader>

            <div className="glass-panel p-8 max-w-[800px] mx-auto">
                <form id="certificate-form" onSubmit={handleSubmit}>

                    {/* Basic Info */}
                    <div className="mb-6">
                        <label className="block mb-2 font-medium text-textMain">ชื่อเอกสาร Certificate <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="glass-input w-full p-[0.8rem] rounded-lg border border-border bg-card-hover text-textMain"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6 grid-mobile-stack">
                        <div>
                            <label className="block mb-2 font-medium text-textMain">วันที่ออกเอกสาร (Issue Date)</label>
                            <input
                                type="date"
                                className="glass-input w-full p-[0.8rem] rounded-lg border border-border bg-card-hover text-textMain"
                                value={formData.issue_date}
                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-2 font-medium text-textMain">วันหมดอายุ (Expiry Date)</label>
                            <input
                                type="date"
                                className="glass-input w-full p-[0.8rem] rounded-lg border border-border bg-card-hover text-textMain"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-2 font-medium text-textMain">สถานะ (Status)</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="glass-input w-full p-[0.8rem] rounded-lg border border-border bg-card-hover text-textMain"
                            >
                                <option value="Active">ใช้งาน (Active)</option>
                                <option value="Expired">หมดอายุ (Expired)</option>
                                <option value="Revoked">เพิกถอน (Revoked)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 font-medium text-textMain">
                            อัปโหลดไฟล์ Certificate {isEditMode && formData.file_url ? `(มีไฟล์อยู่แล้ว สามารถอัปโหลดใหม่เพื่อเปลี่ยน)` : <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileChange}
                            className="glass-input w-full p-[0.8rem] rounded-lg border border-border bg-card-hover text-textMain"
                        />
                        {isEditMode && formData.file_url && !formData.file && (
                            <div className="mt-2 text-[0.9rem] text-textMuted">
                                <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-secondary underline hover:opacity-80">
                                    คลิกเพื่อดูไฟล์ปัจจุบัน
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Relations */}
                    <hr className="my-8 border-border opacity-50" />

                    <div className="grid grid-cols-2 gap-8 grid-mobile-stack">
                        {/* Select Customers (Moved to Left) */}
                        <div>
                            <label className="block mb-2 font-medium text-textMain">เลือกลูกค้า (Customers) <span className="text-textMuted text-[0.9rem] font-normal">(เลือกก่อน)</span></label>
                            <div className="max-h-[200px] overflow-y-auto p-4 border border-border rounded-lg bg-card">
                                {customers.length === 0 ? <div className="text-textMuted">ไม่มีข้อมูลลูกค้า</div> : customers.map(c => (
                                    <div key={`c-${c.id}`} className="mb-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`cust-${c.id}`}
                                            value={c.id}
                                            checked={selectedCustomers.includes(c.id)}
                                            onChange={handleCustomerChange}
                                        />
                                        <label htmlFor={`cust-${c.id}`} className="text-textMain cursor-pointer">{c.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Select Products (Filtered by selected customers) */}
                        <div>
                            <label className="block mb-2 font-medium text-textMain">เลือกสินค้าที่เกี่ยวข้อง (Products)</label>
                            <div className="max-h-[200px] overflow-y-auto p-4 border border-border rounded-lg bg-card">
                                {selectedCustomers.length === 0 ? (
                                    <div className="text-textMuted">กรุณาเลือกลูกค้าก่อน</div>
                                ) : (
                                    products.filter(p => selectedCustomers.includes(p.customerId)).length === 0 ? (
                                        <div className="text-textMuted">ไม่มีสินค้าสำหรับลูกค้าที่เลือก</div>
                                    ) : (
                                        products.filter(p => selectedCustomers.includes(p.customerId)).map(p => (
                                            <div key={`p-${p.id}`} className="mb-2 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`prod-${p.id}`}
                                                    value={p.id}
                                                    checked={selectedProducts.includes(p.id)}
                                                    onChange={handleProductChange}
                                                />
                                                <label htmlFor={`prod-${p.id}`} className="text-textMain cursor-pointer">{p.name}</label>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/certificates')}
                            className="btn-secondary py-[0.8rem] px-6 rounded-lg flex items-center gap-2"
                        >
                            <X size={20} />
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`btn-primary py-[0.8rem] px-6 rounded-lg flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Save size={20} />
                            {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                    {isEditMode && (
                        <div className="glass-panel p-[1.2rem] text-textMuted text-[0.8rem] flex flex-col gap-1 mt-6">
                            {formData.createdBy && (
                                <div className="flex items-center gap-2">
                                    <User size={14} /> สร้างโดย: <span className="text-textMain font-semibold">{formData.createdBy}</span>
                                </div>
                            )}
                            <LastUpdated updatedBy={formData.updatedBy} updatedAt={formData.updatedAt} />
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CertificateFormPage;
