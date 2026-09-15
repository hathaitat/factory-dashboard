import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Calendar, FileSpreadsheet, Eye } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import { payrollService } from '../services/payrollService';
import PageHeader from '../components/PageHeader';
import CreatePayrollPeriodModal from '../components/CreatePayrollPeriodModal';

const PayrollPeriodListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();
    const [periods, setPeriods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const loadPeriods = async () => {
        setIsLoading(true);
        const data = await payrollService.getPayrollPeriods();
        setPeriods(data);
        setIsLoading(false);
    };

    useEffect(() => {
        let active = true;
        (async () => {
            const data = await payrollService.getPayrollPeriods();
            if (!active) return;
            setPeriods(data);
            setIsLoading(false);
        })();
        return () => { active = false; };
    }, []);

    const handleDelete = async (id, name) => {
        if (!hasPermission('employees', 'delete')) return;
        const confirmed = await showConfirm(
            `คุณแน่ใจหรือไม่ว่าต้องการลบงวด "${name}"?`,
            'ยืนยันการลบ'
        );
        if (confirmed) {
            const success = await payrollService.deletePayrollPeriod(id);
            if (success) {
                setPeriods(periods.filter(p => p.id !== id));
                showAlert('ลบงวดเงินเดือนสำเร็จ');
            } else {
                showAlert('เกิดข้อผิดพลาด ไม่สามารถลบได้');
            }
        }
    };

    return (
        <div className="page-container p-6">
            <PageHeader
                title="งวดเงินเดือน (Payroll Periods)"
                subtitle="จัดการงวดการจ่ายเงินเดือนและสรุปยอด"
            >
                {hasPermission('employees', 'create') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer border-none shadow-[0_4px_12px_rgba(59,130,246,0.3)] font-medium"
                    >
                        <Plus size={20} />
                        สร้างงวดเงินเดือน
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel overflow-hidden">
                <div className="table-responsive-wrapper">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-main border-b border-border text-textMuted font-medium text-sm">
                                <th className="actions-column text-textMuted font-medium text-sm">จัดการ</th>
                                <th className="p-4">ชื่องวด</th>
                                <th className="p-4">วันที่เริ่มต้น</th>
                                <th className="p-4">วันที่สิ้นสุด</th>
                                <th className="p-4">สถานะ</th>
                                <th className="p-4">วันที่สร้าง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-3 w-8 h-8"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : periods.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Calendar size={48} className="text-gray-300" />
                                            <p className="m-0 text-lg">ยังไม่มีงวดเงินเดือน</p>
                                            <p className="m-0 text-sm opacity-70">กดปุ่ม "สร้างงวดเงินเดือน" ด้านบนเพื่อเพิ่มงวดแรก</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                periods.map((period) => (
                                    <tr 
                                        key={period.id} 
                                        className="border-b border-border hover:bg-black/5 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/dashboard/payroll/${period.id}`)}
                                    >
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/payroll/${period.id}`); }}
                                                    className="action-view"
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('employees', 'delete') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(period.id, period.name); }}
                                                        className="action-delete"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-main">
                                            {period.name}
                                        </td>
                                        <td className="p-4 text-textMuted">
                                            {new Date(period.start_date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="p-4 text-textMuted">
                                            {new Date(period.end_date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                                period.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                                period.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>
                                                {period.status === 'draft' ? 'แบบร่าง' :
                                                 period.status === 'confirmed' ? 'ยืนยันแล้ว' :
                                                 'จ่ายแล้ว'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-textMuted text-sm">
                                            {new Date(period.created_at).toLocaleDateString('th-TH')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreatePayrollPeriodModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    loadPeriods();
                    showAlert('สร้างงวดเงินเดือนสำเร็จ');
                }}
            />
        </div>
    );
};

export default PayrollPeriodListPage;
