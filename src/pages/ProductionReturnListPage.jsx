import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, Eye, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import { productionMaterialService } from '../services/productionMaterialService';
import { productionService } from '../services/productionService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const ProductionReturnListPage = () => {
    const navigate = useNavigate();
    const { lineId: urlLineId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [returns, setReturns] = useState([]);

    const { showConfirm, showAlert, showError } = useDialog();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();

    const canDelete = hasPermission('production', 'delete');

    // Filters
    const now = new Date();
    const [dateFrom, setDateFrom] = useState(now.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);
    const [period, setPeriod] = useState('day');
    const [lineId, setLineId] = useState(urlLineId || '');
    const [lines, setLines] = useState([]);

    useEffect(() => {
        loadLines();
    }, []);

    useEffect(() => {
        loadReturns();
    }, [dateFrom, dateTo, lineId]);

    const loadLines = async () => {
        try {
            const data = await productionService.getLines();
            setLines(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const loadReturns = async () => {
        setIsLoading(true);
        try {
            const data = await productionMaterialService.getReturns({ dateFrom, dateTo, line_id: lineId });
            setReturns(data || []);
        } catch (error) {
            console.error('Error loading returns', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (retId, retNo) => {
        if (await showConfirm(`คุณต้องการลบใบคืนวัตถุดิบ ${retNo} ใช่หรือไม่?\nสต็อกจะถูกหักออกจากคลังโดยอัตโนมัติ`, 'ยืนยันการลบ')) {
            try {
                await productionMaterialService.deleteReturn(retId, user?.email);
                showAlert('ลบใบคืนวัตถุดิบสำเร็จ', 'success');
                loadReturns();
            } catch (error) {
                showError('ลบใบคืนวัตถุดิบไม่สำเร็จ เนื่องจากระบบพบข้อผิดพลาด');
            }
        }
    };

    return (
        <div className="p-6">
            <button onClick={() => navigate('/dashboard/production/returns')} className="btn btn-secondary mb-4">
                ← กลับไปหน้ารายชื่อแผนก
            </button>
            <div className="flex justify-between items-center mb-6">
                <PageHeader
                    title="ประวัติการคืนวัตถุดิบ"
                    subtitle={`รายการคืนวัตถุดิบเหลือใช้จากแผนกกลับเข้าคลัง`}
                />
                <button
                    onClick={() => navigate(urlLineId ? `/dashboard/production/returns/new?lineId=${urlLineId}` : '/dashboard/production/returns/new')}
                    className="btn btn-primary"
                >
                    <Plus size={18} className="mr-2" /> ทำรายการคืนวัตถุดิบ
                </button>
            </div>

            <ListFilter 
                hasActiveFilters={true}
                onClear={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFrom(today);
                    setDateTo(today);
                    setPeriod('day');
                    setLineId('');
                }}
                filters={[
                    {
                        type: 'date-range',
                        value: period,
                        onChange: (val) => {
                            setPeriod(val);
                            const current = new Date();
                            if (val === 'day') {
                                const today = current.toISOString().split('T')[0];
                                setDateFrom(today);
                                setDateTo(today);
                            } else if (val === 'week') {
                                const first = current.getDate() - current.getDay();
                                const last = first + 6;
                                setDateFrom(new Date(current.setDate(first)).toISOString().split('T')[0]);
                                setDateTo(new Date(current.setDate(last)).toISOString().split('T')[0]);
                            } else if (val === 'month') {
                                setDateFrom(new Date(current.getFullYear(), current.getMonth(), 1).toISOString().split('T')[0]);
                                setDateTo(new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().split('T')[0]);
                            } else if (val === 'year') {
                                setDateFrom(new Date(current.getFullYear(), 0, 1).toISOString().split('T')[0]);
                                setDateTo(new Date(current.getFullYear(), 11, 31).toISOString().split('T')[0]);
                            }
                        },
                        options: [
                            { value: 'day', label: 'วันนี้ (Day)' },
                            { value: 'week', label: 'สัปดาห์นี้ (Week)' },
                            { value: 'month', label: 'เดือนนี้ (Month)' },
                            { value: 'year', label: 'ปีนี้ (Year)' }
                        ],
                        dateFrom: dateFrom,
                        onDateFromChange: setDateFrom,
                        dateTo: dateTo,
                        onDateToChange: setDateTo
                    },

                ]}
            />

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div className="glass-panel overflow-hidden">
                    <div className="table-responsive-wrapper">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-bgMain text-textMuted border-b border-border">
                                    <th className="p-4 font-medium min-w-[120px]">จัดการ</th>
                                    <th className="p-4 font-medium">วันที่</th>
                                    <th className="p-4 font-medium">เลขที่เอกสาร</th>
                                    <th className="p-4 font-medium">คลังปลายทาง</th>
                                    <th className="p-4 font-medium">แผนกที่คืน</th>
                                    <th className="p-4 font-medium">จำนวนรายการ</th>
                                    <th className="p-4 font-medium">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.length > 0 ? (
                                    returns.map((ret) => (
                                        <tr key={ret.id} className="border-b border-border hover:bg-bgMain/50 transition-colors">
                                            <td className="p-4">
                                                <div className="table-actions">
                                                    <button
                                                        className="action-view"
                                                        title="ดูรายละเอียด"
                                                        onClick={() => navigate(`/dashboard/production/returns/${ret.id}`)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            className="action-edit"
                                                            title="แก้ไขเอกสาร"
                                                            onClick={() => navigate(`/dashboard/production/returns/${ret.id}/edit`)}
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            className="action-delete"
                                                            title="ลบเอกสาร"
                                                            onClick={() => handleDelete(ret.id, ret.return_no)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {new Date(ret.return_date).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-4 font-medium text-textMain">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-pink-500" />
                                                    {ret.return_no}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {ret.warehouses?.name || '-'}
                                            </td>
                                            <td className="p-4">
                                                {ret.production_lines?.name || '-'}
                                            </td>
                                            <td className="p-4">
                                                {ret.items?.length || 0} รายการ
                                            </td>
                                            <td className="p-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-medium">
                                                    รับคืน/เพิ่มสต็อกแล้ว
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-textMuted">
                                            ไม่พบประวัติการคืนวัตถุดิบในเดือนนี้
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionReturnListPage;
