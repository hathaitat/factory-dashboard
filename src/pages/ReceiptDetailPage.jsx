import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Building, FileText, Calendar, Clock } from 'lucide-react';
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
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            กำลังโหลดข้อมูลใบเสร็จ...
        </div>
    );
    if (!bn) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูลใบเสร็จ</div>;

    const customer = bn.customer || bn.customerSnapshot || {};

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/dashboard/receipts')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/print-receipt`)}
                        style={{ padding: '0.6rem 1.5rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <Printer size={18} /> พิมพ์ใบเสร็จ
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ใบเสร็จรับเงิน (Receipt)
                    </h1>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                        เลขที่: <strong style={{ color: 'var(--text-main)' }}>{getReceiptNumber()}</strong>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary)'
                    }}>
                        สถานะบิล: {bn.status}
                    </span>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        อ้างอิงใบวางบิล: {bn.billingNoteNo}
                    </div>
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                        <Building size={18} className="text-primary" /> ข้อมูลลูกค้า
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)' }}>
                        <div><strong style={{ color: 'var(--text-main)' }}>ชื่อ:</strong> {customer.name} {customer.branch ? `(${customer.branch})` : ''}</div>
                        {customer.code && <div><strong style={{ color: 'var(--text-main)' }}>รหัส:</strong> {customer.code}</div>}
                        <div><strong style={{ color: 'var(--text-main)' }}>ที่อยู่:</strong> {customer.address || '-'}</div>
                        <div><strong style={{ color: 'var(--text-main)' }}>เลขประจำตัวผู้เสียภาษี:</strong> {customer.taxId || '-'}</div>
                        <div><strong style={{ color: 'var(--text-main)' }}>เบอร์โทร:</strong> {customer.phone || '-'}</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                        <FileText size={18} className="text-secondary" /> ข้อมูลเอกสาร
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} /> <strong style={{ color: 'var(--text-main)' }}>วันที่ใบวางบิล:</strong> {new Date(bn.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        {bn.notes && (
                            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <strong style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-main)' }}>หมายเหตุ:</strong>
                                {bn.notes}
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={14} />
                                <span>สร้างเมื่อ: {new Date(bn.createdAt).toLocaleString('th-TH')}</span>
                            </div>
                            {bn.updatedAt && bn.updatedAt !== bn.createdAt && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={14} />
                                    <span>แก้ไขล่าสุด: {new Date(bn.updatedAt).toLocaleString('th-TH')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.05)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                        <FileText size={18} /> รายการใบกำกับภาษี ({bn.invoices?.length || 0})
                    </h3>
                </div>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--card-hover)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ลำดับ</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบกำกับ</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ครบกำหนด</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bn.invoices?.map((inv, index) => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{index + 1}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--primary)', fontWeight: '600', fontFamily: 'monospace' }}>{inv.invoiceNo}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                        {inv.dueDate
                                            ? new Date(inv.dueDate).toLocaleDateString('th-TH')
                                            : (inv.creditDays ? `+${inv.creditDays} วัน` : '-')
                                        }
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--text-main)' }}>
                                        ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {(!bn.invoices || bn.invoices.length === 0) && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่มีรายการใบกำกับภาษี</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '2px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}>{bn.bahtText}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-muted)' }}>รวมทั้งสิ้น</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--success)' }}>
                                ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptDetailPage;
