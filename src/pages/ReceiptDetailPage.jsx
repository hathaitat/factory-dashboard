import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Building, FileText, Calendar, Clock, User } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { settingService } from '../services/settingService';

const ReceiptDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bn, setBN] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formats, setFormats] = useState(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [data, formatsSettings] = await Promise.all([
                billingNoteService.getBillingNoteById(id),
                settingService.getSetting('document_formats')
            ]);
            setBN(data);
            setFormats(formatsSettings || { billing_note_prefix: 'BN', receipt_prefix: 'RE' });
        } catch (error) {
            console.error("Error loading receipt details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getReceiptNumber = () => {
        if (!bn || !bn.billingNoteNo || !formats) return '-';
        const bnPrefix = formats.billing_note_prefix || 'BI';
        const rePrefix = formats.receipt_prefix || 'RV';

        if (bn.billingNoteNo.startsWith(bnPrefix)) {
            return bn.billingNoteNo.replace(bnPrefix, rePrefix);
        }
        return bn.billingNoteNo.replace(/^[a-zA-Z]+/, rePrefix);
    };

    if (isLoading) return (
        <div className="p-12 text-center text-textMuted">
            <div className="loading-spinner mx-auto mb-4"></div>
            กำลังโหลดข้อมูลใบเสร็จ...
        </div>
    );
    if (!bn) return <div className="p-12 text-center text-textMuted">ไม่พบข้อมูลใบเสร็จ</div>;

    const customer = bn.customer || bn.customerSnapshot || {};

    return (
        <div style={{ padding: '0 1rem 3rem 1rem' }}>
            <div className="mb-8 flex justify-between items-center">
                <button
                    onClick={() => navigate('/dashboard/receipts')}
                    className="bg-transparent border-none text-gray-400 cursor-pointer flex items-center gap-2"
                >
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/print-receipt`)}
                        className="glass-panel px-5 py-2.5 text-emerald-500 cursor-pointer rounded-lg flex items-center gap-2 bg-emerald-500/10" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        <Printer size={18} /> พิมพ์ใบเสร็จ
                    </button>
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Header Info */}
                    <div className="glass-panel p-8">
                        <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 className="m-0 font-bold text-main" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>{getReceiptNumber()}</h1>
                                <div className="flex items-center gap-4" style={{ marginTop: '0.5rem' }}>
                                    <span className="text-gray-400 text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FileText size={16} /> อ้างอิงใบวางบิล: {bn.billingNoteNo}
                                    </span>
                                    <span className="rounded-full text-xs flex items-center gap-1" style={{ padding: '0.2rem 0.8rem', background: bn.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: bn.status === 'Paid' ? 'var(--success)' : '#f59e0b' }}>
                                        สถานะ: {bn.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400">จำนวนเงินรับสุทธิ</div>
                                <div className="text-emerald-500" style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.2rem' }}>
                                    ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="grid-mobile-stack p-6 bg-main rounded-xl" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                            <div>
                                <h4 className="mb-4 text-gray-400 text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <User size={14} style={{ display: 'inline', marginRight: '0.4rem' }} /> ข้อมูลลูกค้า
                                </h4>
                                <div className="font-semibold text-lg mb-2">{customer.name}</div>
                                <div className="text-textMuted text-[0.95rem]" style={{ lineHeight: '1.6' }}>
                                    <div>รหัส: {customer.code || '-'}</div>
                                    <div>เลขประจำตัวผู้เสียภาษี: {customer.taxId || '-'}</div>
                                    <div>สาขา: {customer.branch || ''}</div>
                                </div>
                            </div>
                            <div>
                                <h4 className="mb-4 text-gray-400 text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <FileText size={14} style={{ display: 'inline', marginRight: '0.4rem' }} /> ข้อมูลเพิ่มเติม
                                </h4>
                                <div className="text-textMuted text-[0.95rem]" style={{ lineHeight: '1.6' }}>
                                    <div>ที่อยู่: {customer.address || '-'}</div>
                                    <div>โทร: {customer.phone || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div className="glass-panel overflow-hidden p-0">
                        <div className="px-6 py-5 border-b border-border bg-cardHover">
                            <h3 className="m-0 text-lg font-semibold">รายการใบกำกับภาษีที่รับชำระ</h3>
                        </div>
                        <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left border-b border-border">
                                        <th className="px-6 py-4 text-gray-400 font-medium">ลำดับ</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">บิลเลขที่</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium">วันที่</th>
                                        <th className="px-6 py-4 text-gray-400 font-medium text-right">จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bn.invoices?.map((inv, idx) => (
                                        <tr key={inv.id} className="border-b border-border">
                                            <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                                            <td className="px-6 py-4 font-semibold text-primary">
                                                {inv.invoiceNo}
                                            </td>
                                            <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-main">
                                                ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!bn.invoices || bn.invoices.length === 0) && (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-textMuted">ไม่มีรายการใบกำกับภาษี</td>
                                        </tr>
                                    )}
                                    <tr className="bg-emerald-500/[0.02]">
                                        <td colSpan="3" className="p-6 text-right font-bold text-lg">ยอดรวมสุทธิ</td>
                                        <td className="p-6 text-right text-xl text-emerald-500" style={{ fontWeight: '800' }}>
                                            ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel p-6">
                        <h4 className="mb-4 text-gray-400 text-sm">หมายเหตุ</h4>
                        <div className="text-main text-[0.95rem] bg-main p-4 rounded-lg border border-border" style={{ minHeight: '100px' }}>
                            {bn.notes || 'ไม่มีหมายเหตุ'}
                        </div>
                    </div>

                    <div className="glass-panel p-6 text-textMuted text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <h4 className="text-textMuted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อมูลระบบ</h4>
                        <div className="flex items-center gap-2">
                            <Clock size={14} /> 
                            <span>ออกเมื่อ: {new Date(bn.createdAt).toLocaleString('th-TH')}</span>
                        </div>
                        {bn.createdBy && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> 
                                <span>ออกโดย: <span className="text-main font-semibold">{bn.createdBy}</span></span>
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
                                <span>แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{bn.updatedBy}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptDetailPage;
