import { useState, useEffect } from 'react';
import { Save, X, FileText, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierCategoryService } from '../services/supplierCategoryService';

const SupplierForm = ({ initialData, onSubmit, title }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        taxId: '',
        branch: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        creditTerm: 0,
        status: 'Active',
        notes: '',
        categoryIds: []
    });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await supplierCategoryService.getCategories();
        setCategories(cats || []);
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'creditTerm' ? (parseInt(value) || 0) : value
        }));
    };

    const toggleCategory = (catId) => {
        setFormData(prev => {
            const current = prev.categoryIds || [];
            const exists = current.includes(catId);
            return {
                ...prev,
                categoryIds: exists
                    ? current.filter(id => id !== catId)
                    : [...current, catId]
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="glass-panel p-8 max-w-[800px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="m-0">{title}</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        form="supplier-form"
                        className="btn-primary px-4 py-2 flex items-center gap-2 font-medium"
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/suppliers')} 
                        className="btn-secondary flex items-center p-2 rounded-lg border border-border text-textMuted bg-transparent hover:bg-card-hover transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <form id="supplier-form" onSubmit={handleSubmit} className="grid gap-6">
                {formData.id && (
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted text-sm">System ID (UUID)</label>
                        <input
                            type="text"
                            value={formData.id}
                            readOnly
                            disabled
                            className="glass-input w-full p-3 bg-slate-100 dark:bg-card-hover text-textMuted cursor-not-allowed border-none"
                        />
                    </div>
                )}
                
                <div className="grid-mobile-stack grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted text-sm">รหัส Supplier <span className="text-error">*</span></label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code || ''}
                            onChange={handleChange}
                            required
                            placeholder="ระบุรหัส Supplier"
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">ชื่อ Supplier / บริษัท <span className="text-error">*</span></label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            required
                            placeholder="ระบุชื่อ Supplier"
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เลขประจำตัวผู้เสียภาษี</label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="13 หลัก"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">สาขา</label>
                        <input
                            type="text"
                            name="branch"
                            value={formData.branch || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="เช่น สำนักงานใหญ่ หรือ 00000"
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">ชื่อผู้ติดต่อ</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="ระบุชื่อผู้ติดต่อ"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="08X-XXX-XXXX"
                        />
                    </div>
                </div>

                <div className="grid-mobile-stack grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="example@email.com"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">
                            เครดิต (วัน) <span className="text-sm text-textMuted font-normal ml-1">(ใส่ 0 = เงินสด)</span>
                        </label>
                        <input
                            type="number"
                            name="creditTerm"
                            value={formData.creditTerm !== undefined && formData.creditTerm !== null ? formData.creditTerm : ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="จำนวนวัน"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">สถานะ</label>
                    <select
                        name="status"
                        value={formData.status || 'Active'}
                        onChange={handleChange}
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                    >
                        <option value="Active" className="text-textMain bg-card">ปกติ (Active)</option>
                        <option value="Inactive" className="text-textMain bg-card">ระงับ (Inactive)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">ประเภทผู้ขาย <span className="text-sm text-textMuted font-normal">(เลือกได้หลายรายการ)</span></label>
                    <div className="flex flex-wrap gap-2 p-3 bg-main border border-border rounded-lg min-h-[48px]">
                        {categories.length > 0 ? categories.map(cat => {
                            const isSelected = (formData.categoryIds || []).includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-full border text-sm transition-all flex items-center gap-1 ${
                                        isSelected 
                                            ? 'border-primary bg-primary/10 text-primary font-semibold' 
                                            : 'border-border bg-transparent text-textMuted font-normal'
                                    }`}
                                >
                                    <span className="text-[0.7rem]">{isSelected ? '✓' : '＋'}</span>
                                    {cat.name}
                                </button>
                            );
                        }) : (
                            <span className="text-textMuted text-sm italic">ยังไม่มีประเภท — เพิ่มได้ที่เมนู "ตั้งค่า"</span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-textMuted">
                        จัดการประเภทเพิ่มเติมได้ที่เมนู "ตั้งค่า"
                    </p>
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">ที่อยู่</label>
                    <textarea
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                        rows="3"
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        placeholder="ระบุที่อยู่บริษัท..."
                    />
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">หมายเหตุภายใน</label>
                    <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        rows="2"
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        placeholder="บันทึกข้อมูลเพิ่มเติมเกี่ยวกับ Supplier นี้..."
                    />
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/suppliers')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted hover:bg-card-hover transition-colors cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form >
        </div >
    );
};

export default SupplierForm;
