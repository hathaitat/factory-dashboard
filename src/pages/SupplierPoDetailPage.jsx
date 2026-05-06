import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Edit, ArrowLeft, CheckCircle, Clock, XCircle, Trash2, Building2, MapPin, Phone, User, Package, FileText } from 'lucide-react';
import { supplierPoService } from '../services/supplierPoService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';
import SupplierPoPrintTemplate from '../components/SupplierPoPrintTemplate';

const SupplierPoDetailPage = () => {
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

    const handleDelete = async () => {
        const confirmed = await showConfirm('คุณแน่ใจหรือไม่ที่จะลบใบสั่งซื้อนี้?');
        if (!confirmed) return;

        try {
            await supplierPoService.deleteSupplierPo(id);
            navigate('/dashboard/supplier-pos');
        } catch (error) {
            console.error('Error deleting:', error);
            showError('ไม่สามารถลบใบสั่งซื้อได้');
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;
    if (!po) return null;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Draft': return <span style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>ฉบับร่าง</span>;
            case 'Waiting': return <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>รออนุมัติ</span>;
            case 'Approved': return <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>อนุมัติแล้ว</span>;
            case 'Completed': return <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>ได้รับสินค้าแล้ว</span>;
            case 'Cancelled': return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>ยกเลิก</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title="รายละเอียดใบสั่งซื้อผู้ขาย"
                subtitle={`เลขที่: ${po.po_number}`}
                onBack={() => navigate('/dashboard/supplier-pos')}
            >
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    {getStatusBadge(po.status)}
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
                    
                    {hasPermission('supplier_pos', 'edit') && (po.status === 'Draft' || po.status === 'Waiting') && (
                        <button
                            onClick={() => navigate(`/dashboard/supplier-pos/${id}/edit`)}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Edit size={18} /> แก้ไข
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Printer size={18} /> พิมพ์ใบสั่งซื้อ
                    </button>
                    {hasPermission('supplier_pos', 'delete') && (po.status === 'Draft' || po.status === 'Waiting') && (
                        <button
                            onClick={handleDelete}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                        >
                            <Trash2 size={18} /> ลบ
                        </button>
                    )}
                </div>
            </PageHeader>

            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                            <div>
                                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building2 size={20} /> ข้อมูลผู้ขาย
                                </h3>
                                <div style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>{po.suppliers?.name}</div>
                                {po.suppliers?.address && <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '450px', lineHeight: '1.5' }}>{po.suppliers.address}</div>}
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                                    {po.suppliers?.contact_person && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><User size={14} /> {po.suppliers.contact_person}</div>}
                                    {po.suppliers?.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><Phone size={14} /> {po.suppliers.phone}</div>}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>ส่งไปที่คลังสินค้า</div>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>{po.warehouses?.name || 'คลังหลัก'}</div>
                                {po.warehouses?.address && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', marginLeft: 'auto', marginTop: '0.3rem' }}>{po.warehouses.address}</div>}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', width: '60px', textAlign: 'center' }}>#</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>รายการสินค้า / รายละเอียด</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>จำนวน</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>ราคา/หน่วย</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(po.supplier_po_items || []).map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1.2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                            <td style={{ padding: '1.2rem 1rem' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.description}</div>
                                                {item.due_date && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>กำหนดส่ง: {new Date(item.due_date).toLocaleDateString('th-TH')}</div>}
                                            </td>
                                            <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: 'var(--text-main)' }}>{item.quantity.toLocaleString()} {item.unit}</td>
                                            <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>฿{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {[...Array(Math.max(0, 3 - (po.supplier_po_items?.length || 0)))].map((_, i) => (
                                        <tr key={`empty-${i}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td colSpan="5" style={{ padding: '1.2rem 1rem' }}>&nbsp;</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {po.remark && (
                            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>หมายเหตุ (Remark)</div>
                                <div style={{ color: 'var(--text-main)', lineHeight: '1.6' }}>{po.remark}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}>สรุปยอดเงิน</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>รวมเป็นเงิน</span>
                                <span style={{ fontWeight: '500' }}>฿{(po.sub_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>ภาษีมูลค่าเพิ่ม ({po.vat_rate}%)</span>
                                <span style={{ fontWeight: '500' }}>฿{(po.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>ยอดเงินสุทธิ</span>
                                <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.3rem' }}>฿{(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {hasPermission('supplier_pos', 'edit') && (
                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--primary)', fontWeight: '600' }}>เปลี่ยนสถานะรายการ:</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {po.status === 'Waiting' && (
                                    <button onClick={() => handleStatusUpdate('Approved')} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: '#10b981', borderColor: '#10b981', background: 'white', padding: '1rem' }}>
                                        <CheckCircle size={20} /> <span style={{ fontWeight: '600' }}>อนุมัติการสั่งซื้อ</span>
                                    </button>
                                )}
                                {po.status === 'Approved' && (
                                    <button onClick={() => handleStatusUpdate('Completed')} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem' }}>
                                        <CheckCircle size={20} /> <span style={{ fontWeight: '600' }}>ได้รับสินค้าครบถ้วน (นำเข้าคลัง)</span>
                                    </button>
                                )}
                                {po.status === 'Draft' && (
                                    <button onClick={() => handleStatusUpdate('Waiting')} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem' }}>
                                        <Clock size={20} /> <span style={{ fontWeight: '600' }}>ส่งขออนุมัติ</span>
                                    </button>
                                )}
                                {['Waiting', 'Approved'].includes(po.status) && (
                                    <button onClick={() => handleStatusUpdate('Cancelled')} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: '#ef4444', borderColor: '#ef4444', background: 'white', padding: '1rem' }}>
                                        <XCircle size={20} /> <span style={{ fontWeight: '600' }}>ยกเลิกรายการ</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.1rem', fontWeight: '600' }}>ข้อมูลการจัดซื้อ</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>วันที่สั่งซื้อ</span>
                                <span style={{ fontWeight: '500' }}>{new Date(po.date).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>กำหนดส่ง</span>
                                <span style={{ fontWeight: '500' }}>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>เงื่อนไขเครดิต</span>
                                <span style={{ fontWeight: '500' }}>{po.credit_term || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>เลขที่อ้างอิง</span>
                                <span style={{ fontWeight: '500' }}>{po.reference_doc || '-'}</span>
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <User size={16} /> ผู้สั่งซื้อ: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{po.purchased_by || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <CheckCircle size={16} /> ผู้อนุมัติ: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{po.approved_by || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <Clock size={14} /> สร้างเมื่อ: {new Date(po.created_at).toLocaleString('th-TH')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} /> อัปเดตล่าสุด: {new Date(po.updated_at).toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SupplierPoDetailPage;
