import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Printer, Trash2, Clock, CheckCircle2, FileText, User } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';

const BillingNoteDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm } = useDialog();
    const [bn, setBN] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await billingNoteService.getBillingNoteById(id);
        if (data) {
            setBN(data);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm(`ต้องการลบใบวางบิลเลขที่ ${bn.billingNoteNo} หรือไม่?`);
        if (confirmed) {
            const success = await billingNoteService.deleteBillingNote(id);
            if (success) {
                navigate('/dashboard/billing-notes');
            }
        }
    };

    if (isLoading) return <div className="p-8">กำลังโหลด...</div>;
    if (!bn) return <div className="p-8">ไม่พบข้อมูลใบวางบิล</div>;

    return (
        <div className="px-4 pb-12">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => navigate('/dashboard/billing-notes')}
                    className="flex items-center gap-2 bg-transparent border-none text-[#888888] cursor-pointer hover:opacity-80"
                >
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${id}/print`)}
                        className="glass-panel py-2.5 px-[1.2rem] flex items-center gap-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] cursor-pointer rounded-lg hover:bg-[#8b5cf6]/20"
                    >
                        <Printer size={18} /> พิมพ์ใบวางบิล
                    </button>
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${id}/print-receipt`)}
                        className="glass-panel py-2.5 px-[1.2rem] flex items-center gap-2 bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] cursor-pointer rounded-lg hover:bg-[#f59e0b]/20"
                    >
                        <Printer size={18} /> พิมพ์ใบเสร็จ
                    </button>
                    {hasPermission('billing', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/billing-notes/${id}/edit`)}
                            className="py-2.5 px-[1.2rem] flex items-center gap-2 bg-[#3b82f6] text-white border-none rounded-lg cursor-pointer hover:opacity-90"
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                    {hasPermission('billing', 'delete') && (
                        <button
                            onClick={handleDelete}
                            className="py-2.5 px-[1.2rem] flex items-center gap-2 bg-transparent border border-[#f87171] text-[#f87171] rounded-lg cursor-pointer hover:bg-[#f87171]/10"
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-6 grid-mobile-stack">
                <div className="flex flex-col gap-6">
                    {/* Header Info */}
                    <div className="glass-panel p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="m-0 text-[2rem] font-bold text-textMain tracking-tight">{bn.billingNoteNo}</h1>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="flex items-center gap-1.5 text-[#888888] text-[0.9rem]">
                                        <Clock size={16} /> วันที่ออก: {new Date(bn.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                    </span>
                                    <span className={`py-1 px-3 rounded-[20px] text-[0.8rem] flex items-center gap-1 ${
                                        bn.status === 'Paid' ? 'bg-[#10b981]/10 text-success' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                                    }`}>
                                        {bn.status === 'Paid' ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />}
                                        {bn.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[0.9rem] text-[#888888]">จำนวนเงินรวมทั้งสิ้น</div>
                                <div className="text-[2.5rem] font-extrabold text-success mt-1">
                                    ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 p-6 bg-main rounded-[12px] grid-mobile-stack">
                            <div>
                                <h4 className="m-0 mb-4 text-[#888888] text-[0.85rem] uppercase tracking-wider">
                                    <User size={14} className="inline mr-1.5" /> ข้อมูลลูกค้า
                                </h4>
                                <div className="font-semibold text-[1.1rem] mb-2">{bn.customer.name}</div>
                                <div className="text-textMuted text-[0.95rem] leading-relaxed">
                                    <div>รหัส: {bn.customer.code}</div>
                                    <div>เลขประจำตัวผู้เสียภาษี: {bn.customer.taxId || '-'}</div>
                                    <div>สาขา: {bn.customer.branch || ''}</div>
                                </div>
                            </div>
                            <div>
                                <h4 className="m-0 mb-4 text-[#888888] text-[0.85rem] uppercase tracking-wider">
                                    <FileText size={14} className="inline mr-1.5" /> ข้อมูลเพิ่มเติม
                                </h4>
                                <div className="text-textMuted text-[0.95rem] leading-relaxed">
                                    <div>ที่อยู่: {bn.customer.address || '-'}</div>
                                    <div>โทร: {bn.customer.phone || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="py-[1.2rem] px-[1.5rem] border-b border-border bg-card-hover">
                            <h3 className="m-0 text-[1.1rem] font-semibold text-textMain">รายการใบกำกับภาษีที่แนบ</h3>
                        </div>
                        <div className="table-responsive-wrapper w-full overflow-x-auto [webkit-overflow-scrolling:touch]">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left border-b border-border">
                                        <th className="py-4 px-[1.5rem] text-[#888888] font-medium">ลำดับ</th>
                                        <th className="py-4 px-[1.5rem] text-[#888888] font-medium">บิลเลขที่</th>
                                        <th className="py-4 px-[1.5rem] text-[#888888] font-medium">อ้างอิง(PO)</th>
                                        <th className="py-4 px-[1.5rem] text-[#888888] font-medium">ลงวันที่</th>
                                        <th className="py-4 px-[1.5rem] text-[#888888] font-medium text-right">จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bn.invoices.map((inv, idx) => (
                                        <tr key={inv.id} className="border-b border-border">
                                            <td className="py-4 px-[1.5rem] text-[#888888]">{idx + 1}</td>
                                            <td className="py-4 px-[1.5rem] font-semibold text-[#3b82f6]">
                                                <Link to={`/dashboard/invoices/${inv.id}`} className="text-[#3b82f6] no-underline hover:underline">
                                                    {inv.invoiceNo}
                                                </Link>
                                            </td>
                                            <td className="py-4 px-[1.5rem]">
                                                {inv.poNumber ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {inv.poNumber}
                                                        <span className={`py-0.5 px-2 rounded-xl text-[0.75rem] whitespace-nowrap ${
                                                            inv.poStatus === 'Completed' ? 'bg-[#10b981]/10 text-success' : 'bg-[#37477C]/10 text-[#37477C]'
                                                        }`} title="สถานะ PO">
                                                            {inv.poStatus}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-[#888888]">-</span>}
                                            </td>
                                            <td className="py-4 px-[1.5rem]">{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                            <td className="py-4 px-[1.5rem] text-right font-semibold text-success">
                                                ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-[#10b981]/[0.02]">
                                        <td colSpan="4" className="p-6 text-right font-bold text-[1.1rem] text-textMain">ยอดรวมสุทธิ</td>
                                        <td className="p-6 text-right font-extrabold text-[1.3rem] text-success">
                                            ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="flex flex-col gap-6">
                    <div className="glass-panel p-6">
                        <h4 className="m-0 mb-4 text-[#888888] text-[0.9rem]">หมายเหตุ</h4>
                        <div className="text-textMain text-[0.95rem] bg-main p-4 rounded-lg min-h-[100px] border border-border">
                            {bn.notes || 'ไม่มีหมายเหตุ'}
                        </div>
                    </div>

                    <div className="glass-panel p-6 flex flex-col gap-3 text-textMuted text-[0.85rem]">
                        <h4 className="m-0 mb-2 text-textMuted text-[0.75rem] uppercase tracking-wider">ข้อมูลระบบ</h4>
                        <div className="flex items-center gap-2">
                            <Clock size={14} /> 
                            <span>สร้างเมื่อ: {new Date(bn.createdAt).toLocaleString('th-TH')}</span>
                        </div>
                        {bn.createdBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> 
                                <span>สร้างโดย: <span className="text-textMain font-semibold">{bn.createdBy}</span></span>
                            </div>
                        )}
                        {bn.updatedAt && bn.updatedAt !== bn.createdAt && (
                            <div className="flex items-center gap-2">
                                <Clock size={14} /> 
                                <span>แก้ไขล่าสุด: {new Date(bn.updatedAt).toLocaleString('th-TH')}</span>
                            </div>
                        )}
                        {bn.updatedBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> 
                                <span>แก้ไขล่าสุดโดย: <span className="text-textMain font-semibold">{bn.updatedBy}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingNoteDetailPage;
