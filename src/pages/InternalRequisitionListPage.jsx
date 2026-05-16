import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, PackageMinus, Plus, Search, Eye, Trash2, Calendar, User, DollarSign, Clock } from 'lucide-react';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/PageHeader';

const InternalRequisitionListPage = () => {
    const navigate = useNavigate();
    const { showAlert, showError, showConfirm } = useDialog();
    const { hasPermission } = usePermissions();
    const [requisitions, setRequisitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await internalRequisitionService.getRequisitions();
            setRequisitions(data);
        } catch (err) {
            showError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = requisitions.filter(req => {
        if (filterType && req.type !== filterType) return false;
        if (filterStatus && req.status !== filterStatus) return false;
        if (search) {
            const s = search.toLowerCase();
            return (
                req.requisition_number?.toLowerCase().includes(s) ||
                req.requested_by?.toLowerCase().includes(s) ||
                req.remark?.toLowerCase().includes(s)
            );
        }
        return true;
    });

    const deleteRequisition = async (req) => {
        if (req.status !== 'Draft') {
            showError('สามารถลบได้เฉพาะใบเบิกสถานะ Draft เท่านั้น');
            return;
        }
        const ok = await showConfirm(`ต้องการลบใบเบิกเลขที่ ${req.requisition_number} ใช่หรือไม่?`);
        if (!ok) return;
        try {
            await internalRequisitionService.deleteRequisition(req.id);
            showAlert('ลบรายการสำเร็จ');
            loadData();
        } catch (err) {
            showError(err.message || 'ไม่สามารถลบได้');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return { bg: '#10b9811a', text: '#10b981' };
            case 'Approved': return { bg: '#3b82f61a', text: '#3b82f6' };
            case 'Draft': return { bg: '#6b72801a', text: '#6b7280' };
            case 'Cancelled': return { bg: '#ef44441a', text: '#ef4444' };
            default: return { bg: '#6b72801a', text: '#6b7280' };
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '3rem auto' }}></div>;

    return (
        <div>
            <PageHeader 
                title="ประวัติการเบิก/สั่งซื้อ" 
                subtitle="จัดการรายการสั่งซื้อและเบิกของใช้ในโรงงาน" 
                icon={<Clock size={28} />} 
            />

            {/* Filters & Actions */}
            <div className="glass-panel p-5 mb-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1" style={{ minWidth: '250px' }}>
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาเลขที่, ผู้ขอเบิก..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="glass-input w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-main text-textMain" 
                        />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="glass-input px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                        <option value="">ทุกประเภท</option>
                        <option value="purchase">สั่งซื้อ (Purchase)</option>
                        <option value="withdraw">เบิก (Withdraw)</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input px-3 py-2 rounded-lg border border-border bg-main text-textMain">
                        <option value="">ทุกสถานะ</option>
                        <option value="Draft">Draft</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    {hasPermission('internal_items', 'create') && (
                        <button onClick={() => navigate('/dashboard/internal-requisitions/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer font-medium text-sm hover:opacity-90 transition-opacity">
                            <Plus size={16} /> สร้างใบเบิก/สั่งซื้อ
                        </button>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-6 py-4 text-left text-textMuted font-medium">เลขที่ / วันที่</th>
                                <th className="px-6 py-4 text-center text-textMuted font-medium">ประเภท</th>
                                <th className="px-6 py-4 text-left text-textMuted font-medium">ผู้ขอเบิก</th>
                                <th className="px-6 py-4 text-right text-textMuted font-medium">ยอดรวม</th>
                                <th className="px-6 py-4 text-center text-textMuted font-medium">สถานะ</th>
                                <th className="px-6 py-4 text-center text-textMuted font-medium w-[100px]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-textMuted">
                                    <Clock size={40} className="mx-auto mb-2 opacity-30" />
                                    <div>ไม่พบประวัติรายการ</div>
                                </td></tr>
                            ) : filtered.map(req => {
                                const colors = getStatusColor(req.status);
                                return (
                                    <tr key={req.id} className="border-b border-border hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-textMain">{req.requisition_number}</div>
                                            <div className="text-sm text-textMuted mt-0.5 flex items-center gap-1">
                                                <Calendar size={12} /> {new Date(req.date).toLocaleDateString('th-TH')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {req.type === 'purchase' ? (
                                                <span className="inline-flex items-center gap-1 text-[#3b82f6] text-sm font-medium">
                                                    <ShoppingCart size={14} /> สั่งซื้อ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[#f59e0b] text-sm font-medium">
                                                    <PackageMinus size={14} /> เบิกของ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-textMain">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                    {req.requested_by?.charAt(0) || '?'}
                                                </div>
                                                {req.requested_by}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-textMain">
                                            ฿{req.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="table-actions flex items-center justify-center gap-1">
                                                <button onClick={() => navigate(`/dashboard/internal-requisitions/${req.id}`)} className="action-view p-1.5 rounded bg-transparent border-none cursor-pointer text-primary hover:bg-primary/10" title="ดูรายละเอียด"><Eye size={16} /></button>
                                                {req.status === 'Draft' && hasPermission('internal_items', 'delete') && (
                                                    <button onClick={() => deleteRequisition(req)} className="action-delete p-1.5 rounded bg-transparent border-none cursor-pointer text-[#ef4444] hover:bg-[#ef4444]/10" title="ลบ"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InternalRequisitionListPage;
