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

    if (isLoading) return <div style={{ padding: '2rem' }}>กำลังโหลด...</div>;
    if (!bn) return <div style={{ padding: '2rem' }}>ไม่พบข้อมูลใบวางบิล</div>;

    return (
        <div style={{ padding: '0 1rem 3rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/dashboard/billing-notes')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                >
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${id}/print`)}
                        className="glass-panel"
                        style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#8b5cf6', cursor: 'pointer', borderRadius: '8px' }}
                    >
                        <Printer size={18} /> พิมพ์ใบวางบิล
                    </button>
                    <button
                        onClick={() => navigate(`/dashboard/billing-notes/${id}/print-receipt`)}
                        className="glass-panel"
                        style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', cursor: 'pointer', borderRadius: '8px' }}
                    >
                        <Printer size={18} /> พิมพ์ใบเสร็จ
                    </button>
                    {hasPermission('billing', 'edit') && (
                        <button
                            onClick={() => navigate(`/dashboard/billing-notes/${id}/edit`)}
                            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                    {hasPermission('billing', 'delete') && (
                        <button
                            onClick={handleDelete}
                            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #f87171', color: '#f87171', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Header Info */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{bn.billingNoteNo}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#888', fontSize: '0.9rem' }}>
                                        <Clock size={16} /> วันที่ออก: {new Date(bn.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                    </span>
                                    <span style={{
                                        padding: '0.2rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        background: bn.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: bn.status === 'Paid' ? 'var(--success)' : '#f59e0b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}>
                                        {bn.status === 'Paid' ? <CheckCircle2 size={14} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />}
                                        {bn.status}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', color: '#888' }}>จำนวนเงินรวมทั้งสิ้น</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.2rem' }}>
                                    ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <User size={14} style={{ display: 'inline', marginRight: '0.4rem' }} /> ข้อมูลลูกค้า
                                </h4>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{bn.customer.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                    <div>รหัส: {bn.customer.code}</div>
                                    <div>เลขประจำตัวผู้เสียภาษี: {bn.customer.taxId || '-'}</div>
                                    <div>สาขา: {bn.customer.branch || 'สำนักงานใหญ่'}</div>
                                </div>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <FileText size={14} style={{ display: 'inline', marginRight: '0.4rem' }} /> ข้อมูลเพิ่มเติม
                                </h4>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                    <div>ที่อยู่: {bn.customer.address || '-'}</div>
                                    <div>โทร: {bn.customer.phone || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--card-hover)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>รายการใบกำกับภาษีที่แนบ</h3>
                        </div>
                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500' }}>ลำดับ</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500' }}>บิลเลขที่</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500' }}>อ้างอิง(PO)</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500' }}>ลงวันที่</th>
                                    <th style={{ padding: '1rem 1.5rem', color: '#888', fontWeight: '500', textAlign: 'right' }}>จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bn.invoices.map((inv, idx) => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem 1.5rem', color: '#888' }}>{idx + 1}</td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#3b82f6' }}>
                                            <Link to={`/dashboard/invoices/${inv.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                {inv.invoiceNo}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {inv.poNumber ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {inv.poNumber}
                                                    <span style={{
                                                        padding: '0.1rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        background: inv.poStatus === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                        color: inv.poStatus === 'Completed' ? 'var(--success)' : 'var(--primary)',
                                                        whiteSpace: 'nowrap'
                                                    }} title="สถานะ PO">
                                                        {inv.poStatus}
                                                    </span>
                                                </div>
                                            ) : <span style={{ color: '#888' }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                            ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'rgba(16, 185, 129, 0.02)' }}>
                                    <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }}>ยอดรวมสุทธิ</td>
                                    <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: '800', fontSize: '1.3rem', color: 'var(--success)' }}>
                                        ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
</div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.9rem' }}>หมายเหตุ</h4>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', minHeight: '100px', border: '1px solid var(--border-color)' }}>
                            {bn.notes || 'ไม่มีหมายเหตุ'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingNoteDetailPage;
