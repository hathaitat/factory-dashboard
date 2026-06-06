import { useState, useEffect, useRef } from 'react';
import { Save, Building, MapPin, Phone, Mail, FileText, Calendar, Printer, User, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { companyService } from '../services/companyService';
import { userService } from '../services/userService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import LastUpdated from '../components/LastUpdated';
import { useAuth } from '../contexts/AuthContext';

const CompanyInfoPage = () => {
    const { user } = useAuth();
    const { showAlert } = useDialog();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        fax: '',
        email: '',
        taxId: '',
        logoUrl: '',
        updatedBy: null,
        updatedAt: null
    });
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('company', 'edit');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [message, setMessage] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await companyService.getCompanyInfo();
        if (data) {
            setFormData(data);
        }
        setIsLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation ตาม UAT Test Cases
        if (!formData.logoUrl) {
            showAlert('กรุณาอัปโหลดโลโก้บริษัท');
            return;
        }
        if (!formData.name?.trim()) {
            showAlert('กรุณากรอกชื่อบริษัท');
            return;
        }
        if (!formData.address?.trim()) {
            showAlert('กรุณากรอกที่อยู่บริษัท');
            return;
        }
        if (!formData.phone?.trim()) {
            showAlert('กรุณากรอกเบอร์โทรศัพท์');
            return;
        }
        if (!formData.email?.trim()) {
            showAlert('กรุณากรอกอีเมลบริษัท');
            return;
        }
        if (!formData.taxId?.trim()) {
            showAlert('กรุณากรอกเลขประจำตัวผู้เสียภาษี');
            return;
        }

        setIsSaving(true);
        setMessage(null);
        try {
            const currentUser = user;
            const submitData = {
                ...formData,
                updatedBy: currentUser?.fullName || currentUser?.username || 'System'
            };
            const updatedData = await companyService.updateCompanyInfo(submitData);
            setFormData(updatedData);
            
            if (updatedData.missingLogoColumn) {
                setMessage({ type: 'error', text: 'บันทึกข้อมูลสำเร็จ แต่ไม่สามารถบันทึกโลโก้ได้ (กรุณาให้ผู้ดูแลระบบเพิ่มคอลัมน์ logo_url ในตาราง company_info)' });
            } else {
                setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        } finally {
            setIsSaving(false);
        }
    };

    const uploadLogoFile = async (file) => {
        setIsUploadingLogo(true);
        setMessage(null);
        try {
            const url = await companyService.uploadLogo(file);
            setFormData(prev => ({ ...prev, logoUrl: url }));
            setMessage({ type: 'success', text: 'อัปโหลดโลโก้สำเร็จ (อย่าลืมกด "บันทึกข้อมูล" ด้านบน/ล่าง เพื่อยืนยัน)' });
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัปโหลดโลโก้' });
        } finally {
            setIsUploadingLogo(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadLogoFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (canEdit && !isUploadingLogo && !isSaving) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!canEdit || isUploadingLogo || isSaving) return;

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            await uploadLogoFile(file);
        } else if (file) {
            setMessage({ type: 'error', text: 'กรุณาอัพโหลดเฉพาะไฟล์รูปภาพ (PNG, JPG)' });
        }
    };

    if (isLoading) return <div className="p-8 text-textMuted">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="px-4 pb-8 max-w-[800px] mx-auto">
            <PageHeader
                title="ข้อมูลบริษัท"
                subtitle="จัดการข้อมูลโรงงานและที่อยู่ของคุณ"
                helpContent={HELP_CONTENT.companyInfo}
            >
                {canEdit && (
                    <button
                        type="submit"
                        form="company-info-form"
                        disabled={isSaving}
                        className={`py-3 px-8 rounded-lg border-none flex items-center gap-2 font-medium text-white transition-all ${isSaving ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-blue-500 cursor-pointer hover:bg-blue-600'}`}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                )}
            </PageHeader>

            {message && (
                <div className={`p-4 mb-6 rounded-lg border ${message.type === 'success' ? 'bg-[#10b981]/5 text-success border-[#10b981]/10' : 'bg-error/5 text-error border-error/10'}`}>
                    {message.text}
                </div>
            )}

            <form id="company-info-form" onSubmit={handleSubmit} className="glass-panel p-8 flex flex-col gap-6">
                {/* Logo Upload Section */}
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-textMuted mb-2">
                        <ImageIcon size={16} /> โลโก้บริษัท <span className="text-error">*</span>
                    </label>
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center p-6 rounded-xl border-2 border-dashed gap-4 transition-all duration-300 ${isDragging ? 'bg-[#3b82f6]/5 border-[#3b82f6]' : 'bg-card-hover border-border'}`}
                    >
                        <div className={`w-[120px] h-[120px] rounded-full bg-main flex items-center justify-center overflow-hidden border-2 relative transition-all duration-300 ${isDragging ? 'border-[#3b82f6]' : 'border-border'}`}>
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Company Logo" className="w-full h-full object-contain bg-white" />
                            ) : (
                                <ImageIcon size={40} className="text-textMuted opacity-50" />
                            )}
                            {isUploadingLogo && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                    <Loader2 size={24} className="animate-spin" />
                                </div>
                            )}
                        </div>
                        {canEdit && (
                            <div className="flex flex-col items-center gap-2">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg"
                                    ref={fileInputRef}
                                    onChange={handleLogoChange}
                                    className="hidden"
                                    disabled={isUploadingLogo || isSaving}
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingLogo || isSaving}
                                        className={`py-2 px-5 flex items-center gap-2 bg-white text-[#3b82f6] border border-[#3b82f6] rounded-lg font-medium transition-all duration-200 z-10 ${isUploadingLogo || isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}`}
                                    >
                                        <Upload size={16} /> {formData.logoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                                    </button>
                                    {formData.logoUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                                            disabled={isUploadingLogo || isSaving}
                                            className={`py-2 px-5 flex items-center gap-2 bg-white text-error border border-error rounded-lg font-medium transition-all duration-200 z-10 ${isUploadingLogo || isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 cursor-pointer'}`}
                                        >
                                            ลบโลโก้
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="text-[0.8rem] text-textMuted">ลากไฟล์มาวางที่นี่ หรือกดปุ่มอัปโหลด (แนะนำ 500x500px ไฟล์ PNG/JPG)</div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-textMuted mb-2">
                        <Building size={16} /> ชื่อบริษัท <span className="text-error">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        disabled={!canEdit}
                        className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain ${!canEdit && 'opacity-70'}`}
                        placeholder="ระบุชื่อบริษัทของคุณ"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-textMuted mb-2">
                        <MapPin size={16} /> ที่อยู่ <span className="text-error">*</span>
                    </label>
                    <textarea
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                        disabled={!canEdit}
                        rows="3"
                        className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain resize-y ${!canEdit && 'opacity-70'}`}
                        placeholder="ระบุที่อยู่บริษัท"
                    />
                </div>

                <div className="grid-mobile-stack grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-textMuted mb-2">
                            <Phone size={16} /> เบอร์โทรศัพท์ <span className="text-error">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain ${!canEdit && 'opacity-70'}`}
                            placeholder="ระบุเบอร์โทรศัพท์"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-textMuted mb-2">
                            <Printer size={16} /> เบอร์แฟกซ์
                        </label>
                        <input
                            type="tel"
                            name="fax"
                            value={formData.fax || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain ${!canEdit && 'opacity-70'}`}
                            placeholder="ระบุเบอร์แฟกซ์"
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-textMuted mb-2">
                            <Mail size={16} /> อีเมล <span className="text-error">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain ${!canEdit && 'opacity-70'}`}
                            placeholder="ระบุอีเมลบริษัท"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-textMuted mb-2">
                            <FileText size={16} /> เลขประจำตัวผู้เสียภาษี <span className="text-error">*</span>
                        </label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId || ''}
                            onChange={handleChange}
                            disabled={!canEdit}
                            className={`glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMain ${!canEdit && 'opacity-70'}`}
                            placeholder="ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก"
                        />
                    </div>
                </div>

                {(formData.updatedAt || formData.updatedBy) && (
                    <div className="flex flex-col gap-1 text-[0.85rem] text-textMuted mt-2">
                        <LastUpdated updatedBy={formData.updatedBy} updatedAt={formData.updatedAt} />
                    </div>
                )}

                {canEdit && (
                    <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-border">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`py-3 px-8 rounded-lg border-none flex items-center gap-2 font-medium text-white transition-all ${isSaving ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-blue-500 cursor-pointer hover:bg-blue-600'}`}
                        >
                            <Save size={18} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </button>
                    </div>
                )}

            </form>
        </div>
    );
};

export default CompanyInfoPage;
