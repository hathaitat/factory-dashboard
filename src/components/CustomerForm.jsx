import { useState, useEffect } from 'react';
import { Save, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerForm = ({ initialData, onSubmit, title }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        fax: '',
        address: '',
        status: 'Active',
        contactPerson: '',
        branch: '',
        creditTerm: 0,
        poNote: '',
        invoiceNote: '',
        billingNoteNote: '',
        receiptNote: '',
        billingAttention: '',
        billingAddress: '',
        billingPhone: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
                        form="customer-form"
                        className="btn-primary px-4 py-2 flex items-center gap-2 font-medium"
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/customers')} 
                        className="btn-secondary flex items-center p-2 rounded-lg border border-border text-textMuted bg-transparent hover:bg-card-hover transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <form id="customer-form" onSubmit={handleSubmit} className="grid gap-6">
                {formData.id && (
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">System ID (UUID)</label>
                        <input
                            type="text"
                            value={formData.id}
                            readOnly
                            disabled
                            className="glass-input w-full p-3 bg-card-hover border border-border rounded-lg text-textMuted cursor-not-allowed"
                        />
                    </div>
                )}
                <div className="form-group">
                    <label className="block mb-2 text-textMuted">รหัสลูกค้า <span className="text-error">*</span></label>
                    <input
                        type="text"
                        name="code"
                        value={formData.code || ''}
                        onChange={handleChange}
                        required
                        placeholder="ระบุรหัสลูกค้า"
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                    />
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">ชื่อบริษัท <span className="text-error">*</span></label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">ชื่อผู้ติดต่อ</label>
                        <input
                            type="text"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เบอร์แฟกซ์</label>
                        <input
                            type="tel"
                            name="fax"
                            value={formData.fax || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">
                            เครดิต (วัน) <span className="text-error">*</span> <span className="text-sm text-textMuted font-normal ml-1">(ใส่ 0 = เครดิตสด)</span>
                        </label>
                        <input
                            type="number"
                            name="creditTerm"
                            value={formData.creditTerm !== undefined && formData.creditTerm !== null ? formData.creditTerm : ''}
                            onChange={handleChange}
                            required
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="จำนวนวัน"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">สถานะ</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        >
                            <option value="Active" className="text-textMain bg-card">ปกติ</option>
                            <option value="Inactive" className="text-textMain bg-card">ระงับ</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">ที่อยู่ <span className="text-error">*</span></label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows="2"
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                    />
                </div>

                <div className="border-t border-border my-4"></div>

                <h3 className="m-0 mb-2 text-lg text-primary flex items-center gap-2">
                    <FileText size={20} /> ข้อมูลที่อยู่วางบิล (Billing Address)
                </h3>
                <div className="text-sm text-textMuted mb-4">หากเว้นว่างไว้ ระบบจะใช้ที่อยู่และผู้ติดต่อหลักด้านบนแทน</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เรียน (ผู้ติดต่อสำหรับวางบิล)</label>
                        <input
                            type="text"
                            name="billingAttention"
                            value={formData.billingAttention || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                            placeholder="เช่น ฝ่ายบัญชี, คุณสมชาย"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">เบอร์โทรศัพท์ (สำหรับวางบิล)</label>
                        <input
                            type="tel"
                            name="billingPhone"
                            value={formData.billingPhone || ''}
                            onChange={handleChange}
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="block mb-2 text-textMuted">ที่อยู่วางบิล</label>
                    <textarea
                        name="billingAddress"
                        value={formData.billingAddress || ''}
                        onChange={handleChange}
                        rows="2"
                        className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                    />
                </div>

                <div className="border-t border-border my-4"></div>

                <h3 className="m-0 mb-2 text-lg text-primary flex items-center gap-2">
                    <FileText size={20} /> หมายเหตุสำหรับเอกสาร (จะแสดงเมื่อสร้างเอกสารนั้นๆ)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">หมายเหตุใบสั่งซื้อ (PO)</label>
                        <textarea
                            name="poNote"
                            value={formData.poNote || ''}
                            onChange={handleChange}
                            rows="2"
                            placeholder="ระบุหมายเหตุที่จะให้เตือนเมื่อสร้าง PO..."
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">หมายเหตุใบกำกับภาษี (Invoice)</label>
                        <textarea
                            name="invoiceNote"
                            value={formData.invoiceNote || ''}
                            onChange={handleChange}
                            rows="2"
                            placeholder="ระบุหมายเหตุที่จะให้เตือนเมื่อสร้าง Invoice..."
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">หมายเหตุใบวางบิล</label>
                        <textarea
                            name="billingNoteNote"
                            value={formData.billingNoteNote || ''}
                            onChange={handleChange}
                            rows="2"
                            placeholder="ระบุหมายเหตุที่จะให้เตือนเมื่อสร้างใบวางบิล..."
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 text-textMuted">หมายเหตุใบเสร็จรับเงิน</label>
                        <textarea
                            name="receiptNote"
                            value={formData.receiptNote || ''}
                            onChange={handleChange}
                            rows="2"
                            placeholder="ระบุหมายเหตุที่จะให้เตือนเมื่อออกใบเสร็จ..."
                            className="glass-input w-full p-3 bg-main border border-border rounded-lg text-textMain resize-y"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/customers')}
                        className="px-6 py-3 rounded-lg border border-border bg-transparent text-textMuted hover:bg-card-hover transition-colors cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                    >
                        <Save size={18} />
                        บันทึกข้อมูล
                    </button>
                </div>
            </form >
        </div >
    );
};

export default CustomerForm;
