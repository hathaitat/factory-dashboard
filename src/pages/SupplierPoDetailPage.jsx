import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Edit, ArrowLeft, CheckCircle, Clock, XCircle, Trash2, Building2, Phone, User } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';

const SupplierPoDetailPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();
    const [po, setPo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPo();
    }, [id]);

    const loadPo = async () => {
        try {
            const data = await supplierPoService.getSupplierPoById(id);
            if (data) {
                setPo(data);
            } else {
                showError('ไม่พบข้อมูลใบสั่งซื้อ');
                navigate('/dashboard/supplier-pos');
            }
        } catch (error) {
            console.error('Error loading PO:', error);
            showError('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        navigate(`/dashboard/supplier-pos/${id}/print`);
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            await supplierPoService.updateStatus(id, newStatus);
            setPo({ ...po, status: newStatus });
            showAlert(`เปลี่ยนสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
            loadPo(); // Reload to get updated metadata (approved_by, etc.)
        } catch (error) {
            console.error('Error updating status:', error);
            showError('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        }
    };

    const handleCancel = async () => {
        const confirmed = await showConfirm(`ยืนยันการยกเลิกใบสั่งซื้อเลขที่ ${po.po_number}? \n(ระบบจะตรวจสอบสต็อกและหักสินค้าออกจากคลังคืน)`);
        if (!confirmed) return;

        try {
            setIsLoading(true);
            await supplierPoService.cancelSupplierPo(id);
            showAlert('ยกเลิกใบสั่งซื้อและปรับปรุงสต็อกเรียบร้อยแล้ว');
            loadPo();
        } catch (error) {
            console.error('Error cancelling:', error);
            showError(error.message || 'ไม่สามารถยกเลิกใบสั่งซื้อได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ที่จะลบใบสั่งซื้อนี้?');
        if (!confirmed) return;

        try {
            await supplierPoService.deleteSupplierPo(id);
            navigate('/dashboard/supplier-pos');
        } catch (error) {
            console.error('Error deleting:', error);
            showError(error.message || 'ไม่สามารถลบใบสั่งซื้อได้');
        }
    };

    if (isLoading) return <div className="loading-spinner my-12 mx-auto"></div>;
    if (!po) return null;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Draft': return <span className="text-textMuted rounded-full text-sm" style={{ background: 'rgba(107, 114, 128, 0.1)', padding: '0.3rem 0.8rem' }}>ฉบับร่าง</span>;
            case 'Partial': return <span className="text-amber-500 rounded-full text-sm" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.3rem 0.8rem' }}>รับสินค้าบางส่วน</span>;
            case 'Completed': return <span className="text-emerald-500 rounded-full text-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.8rem' }}>ได้รับสินค้าครบแล้ว</span>;
            case 'Cancelled': return <span className="text-red-500 rounded-full text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.3rem 0.8rem' }}>ยกเลิก</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    return (
        <div className="px-4 pb-8">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/supplier-pos')} className="bg-transparent border border-border text-main p-2 rounded-lg cursor-pointer">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="m-0 font-semibold" style={{ fontSize: '1.8rem' }}>รายละเอียดใบสั่งซื้อผู้ขาย</h1>
                        <div className="text-sm text-textMuted">เลขที่: {po.po_number}</div>
                    </div>
                    <div style={{ marginLeft: '1rem' }}>
                        {getStatusBadge(po.status === 'Completed' && po.supplier_po_items && !po.supplier_po_items.every(i => (i.received_quantity || 0) >= i.quantity) ? 'Partial' : po.status)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2.5 text-violet-500 cursor-pointer rounded-lg flex items-center gap-2" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                    >
                        <Printer size={18} /> พิมพ์ใบสั่งซื้อ
                    </button>
                    {hasPermission('supplier_pos', 'edit') && (po.status === 'Draft' || po.status === 'Partial' || (po.status === 'Completed' && po.supplier_po_items && !po.supplier_po_items.every(i => (i.received_quantity || 0) >= i.quantity))) && (
                        <button
                            onClick={() => navigate(`/dashboard/supplier-pos/${id}/edit`)}
                            className="px-5 py-2.5 border-none cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}
                        >
                            <Edit size={18} /> แก้ไข / รับสินค้า
                        </button>
                    )}
                    {hasPermission('supplier_pos', 'delete') && (po.status === 'Draft') && (
                        <button
                            onClick={handleDelete}
                            className="px-5 py-2.5 text-red-500 cursor-pointer rounded-lg flex items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </div>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel p-8">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                            <div>
                                <h3 className="mb-4 text-primary flex items-center gap-2">
                                    <Building2 size={20} /> ข้อมูลผู้ขาย
                                </h3>
                                <div className="text-xl font-semibold mb-2">{po.suppliers?.name}</div>
                                {po.suppliers?.address && <div className="text-textMuted text-[0.95rem]" style={{ maxWidth: '450px', lineHeight: '1.5' }}>{po.suppliers.address}</div>}
                                <div className="mt-4" style={{ display: 'flex', gap: '1.5rem' }}>
                                    {po.suppliers?.contact_person && <div className="text-sm text-textMuted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> {po.suppliers.contact_person}</div>}
                                    {po.suppliers?.phone && <div className="text-sm text-textMuted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={14} /> {po.suppliers.phone}</div>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-textMuted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>ส่งไปที่คลังสินค้า</div>
                                <div className="font-semibold text-main text-lg">{po.warehouses ? `${po.warehouses.code ? `[${po.warehouses.code}] ` : ''}${po.warehouses.name}` : 'คลังหลัก'}</div>
                                {po.warehouses?.address && <div className="text-sm text-textMuted" style={{ maxWidth: '200px', marginLeft: 'auto', marginTop: '0.3rem' }}>{po.warehouses.address}</div>}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left" style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th className="p-4 text-textMuted font-semibold text-center" style={{ width: '60px' }}>#</th>
                                        <th className="p-4 text-textMuted font-semibold">รายการสินค้า / รายละเอียด</th>
                                        <th className="p-4 text-textMuted font-semibold text-right">จำนวน</th>
                                        <th className="p-4 text-textMuted font-semibold text-right">ราคา/หน่วย</th>
                                        <th className="p-4 text-textMuted font-semibold text-right">จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(po.supplier_po_items || []).map((item, idx) => (
                                        <tr key={item.id} className="border-b border-border">
                                            <td className="text-center text-textMuted" style={{ padding: '1.2rem 1rem' }}>{idx + 1}</td>
                                            <td style={{ padding: '1.2rem 1rem' }}>
                                                <div className="font-semibold text-main text-base" style={{ marginBottom: '0.4rem' }}>{item.description}</div>
                                                {item.note && (
                                                    <div className="text-sm text-textMuted rounded" style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap', padding: '0.4rem 0.6rem', background: 'rgba(0, 0, 0, 0.02)', borderLeft: '2px solid var(--border-color)' }}>
                                                        {item.note}
                                                    </div>
                                                )}
                                                {item.image_url && (
                                                    <div style={{ marginTop: '0.8rem' }}>
                                                        <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={item.image_url}
                                                                alt="product spec"
                                                                className="rounded border border-border" style={{ maxWidth: '250px', maxHeight: '200px', objectFit: 'contain', display: 'block' }}
                                                            />
                                                        </a>
                                                    </div>
                                                )}
                                                {item.due_date && <div className="text-xs text-textMuted" style={{ marginTop: '0.4rem' }}>กำหนดส่ง: {new Date(item.due_date).toLocaleDateString('th-TH')}</div>}
                                            </td>
                                            <td className="text-right text-main" style={{ padding: '1.2rem 1rem' }}>
                                                {item.quantity.toLocaleString()} {item.unit}
                                                {(po.status === 'Completed' || po.status === 'Partial') && (
                                                    <div className="text-emerald-500 text-sm font-semibold" style={{ marginTop: '4px' }}>
                                                        (รับแล้ว: {item.received_quantity !== undefined ? item.received_quantity : item.quantity})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-right text-textMuted" style={{ padding: '1.2rem 1rem' }}>฿{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-right font-semibold text-main" style={{ padding: '1.2rem 1rem' }}>฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {[...Array(Math.max(0, 3 - (po.supplier_po_items?.length || 0)))].map((_, i) => (
                                        <tr key={`empty-${i}`} className="border-b border-border">
                                            <td colSpan="5" style={{ padding: '1.2rem 1rem' }}>&nbsp;</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {po.remark && (
                            <div className="p-6 bg-main rounded-xl border border-border" style={{ marginTop: '2.5rem' }}>
                                <div className="text-sm text-textMuted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>หมายเหตุ (Remark)</div>
                                <div className="text-main" style={{ lineHeight: '1.6' }}>{po.remark}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {hasPermission('supplier_pos', 'edit') && po.status !== 'Cancelled' && (
                        <div className="glass-panel p-6" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <h3 className="mb-4 text-base text-primary font-semibold">การจัดการเอกสาร:</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {po.status === 'Draft' && (
                                    <>
                                        <button onClick={() => navigate(`/dashboard/supplier-pos/${id}/edit?mode=receive`)} className="btn-primary w-full p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                            <CheckCircle size={20} /> <span className="font-semibold">รับสินค้าเข้าคลัง (Receive)</span>
                                        </button>
                                        <button onClick={handleCancel} className="btn-secondary w-full text-red-500 bg-white p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', borderColor: '#ef4444' }}>
                                            <XCircle size={20} /> <span className="font-semibold">ยกเลิกรายการ</span>
                                        </button>
                                    </>
                                )}
                                {(po.status === 'Partial' || (po.status === 'Completed' && po.supplier_po_items && !po.supplier_po_items.every(i => (i.received_quantity || 0) >= i.quantity))) && (
                                    <>
                                        <button onClick={() => navigate(`/dashboard/supplier-pos/${id}/edit?mode=receive`)} className="btn-primary w-full p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                            <CheckCircle size={20} /> <span className="font-semibold">รับสินค้าเพิ่มเติม</span>
                                        </button>
                                        <button onClick={handleCancel} className="btn-secondary w-full text-red-500 bg-white p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', borderColor: '#ef4444' }}>
                                            <XCircle size={20} /> <span className="font-semibold">ยกเลิกใบสั่งซื้อ (หักสต็อกคืน)</span>
                                        </button>
                                    </>
                                )}
                                {po.status === 'Completed' && po.supplier_po_items && po.supplier_po_items.every(i => (i.received_quantity || 0) >= i.quantity) && (
                                    <button onClick={handleCancel} className="btn-secondary w-full text-red-500 bg-white p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', borderColor: '#ef4444' }}>
                                        <XCircle size={20} /> <span className="font-semibold">ยกเลิกใบสั่งซื้อ (หักสต็อกคืน)</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold" style={{ margin: '0 0 1.5rem 0' }}>สรุปยอดเงิน</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between">
                                <span className="text-textMuted">รวมเป็นเงิน</span>
                                <span className="font-medium">฿{(po.sub_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-b border-border" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem' }}>
                                <span className="text-textMuted">ภาษีมูลค่าเพิ่ม ({po.vat_rate}%)</span>
                                <span className="font-medium">฿{(po.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-4 rounded-xl" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', background: 'rgba(59, 130, 246, 0.05)' }}>
                                <span className="text-primary font-semibold">ยอดเงินสุทธิ</span>
                                <span className="text-primary font-bold text-xl">฿{(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold" style={{ margin: '0 0 1.2rem 0' }}>ข้อมูลการจัดซื้อ</h3>
                        <div className="text-[0.95rem] flex flex-col gap-4">
                            <div className="flex justify-between">
                                <span className="text-textMuted">วันที่สั่งซื้อ</span>
                                <span className="font-medium">{new Date(po.date).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-textMuted">กำหนดส่ง</span>
                                <span className="font-medium">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-textMuted">เงื่อนไขเครดิต</span>
                                <span className="font-medium">{po.credit_term || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-textMuted">เลขที่อ้างอิง</span>
                                <span className="font-medium">{po.reference_doc || '-'}</span>
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div className="text-textMuted text-sm flex items-center gap-2">
                                        <User size={16} /> ผู้สั่งซื้อ: <span className="text-main font-semibold">{po.purchased_by || '-'}</span>
                                    </div>
                                    <div className="text-textMuted text-sm flex items-center gap-2">
                                        <CheckCircle size={16} /> ผู้อนุมัติ: <span className="text-main font-semibold">{po.approved_by || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 text-textMuted text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div className="flex items-center gap-2">
                            <Clock size={14} /> สร้างเมื่อ: {new Date(po.created_at).toLocaleString('th-TH')}
                        </div>
                        {po.created_by_name && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> สร้างโดย: <span className="text-main font-semibold">{po.created_by_name}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Clock size={14} /> อัปเดตล่าสุด: {new Date(po.updated_at).toLocaleString('th-TH')}
                        </div>
                        {po.updated_by && (
                            <div className="flex items-center gap-2">
                                <User size={14} /> แก้ไขล่าสุดโดย: <span className="text-main font-semibold">{po.updated_by}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SupplierPoDetailPage;
