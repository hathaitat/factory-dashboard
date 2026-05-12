import { useState, useEffect } from 'react';
import { Truck, Eye, FileText, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../../services/supplierService';
import { supplierPoService } from '../../services/supplierPoService';
import CustomLineChart from './CustomLineChart';

const SupplierTab = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [latestPOs, setLatestPOs] = useState([]);
    const [rawPOs, setRawPOs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [suppliersData, posData] = await Promise.all([
                supplierService.getSuppliers(),
                supplierPoService.getSupplierPos()
            ]);
            const posWithNames = (posData || []).map(po => ({
                ...po,
                supplierName: po.suppliers?.name || 'ไม่ระบุ'
            }));
            setSuppliers(suppliersData || []);
            setRawPOs(posWithNames);
            setLatestPOs(posWithNames.slice(0, 5)); // Get latest 5 POs
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Show top 5 on dashboard

    const pendingPOs = latestPOs.filter(po => po.status !== 'Completed' && po.status !== 'Cancelled');
    const monthlyTotal = latestPOs
        .filter(po => {
            const poDate = new Date(po.date);
            const now = new Date();
            return poDate.getMonth() === now.getMonth() && poDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, po) => sum + (po.grand_total || 0), 0);

    return (
        <div className="tab-content">
            <div className="kpi-grid mb-6">
                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <Truck size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">จำนวนผู้ขายทั้งหมด</span>
                        <span className="kpi-value">{suppliers.length} <span className="unit">ราย</span></span>
                    </div>
                </div>
                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper orange">
                        <Clock size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">PO รอรับสินค้า</span>
                        <span className="kpi-value">{pendingPOs.length} <span className="unit">รายการ</span></span>
                    </div>
                </div>
                <div className="glass-panel kpi-card">
                    <div className="kpi-icon-wrapper green">
                        <div className="font-bold">฿</div>
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">ยอดสั่งซื้อเดือนนี้</span>
                        <span className="kpi-value">{monthlyTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="unit">บาท</span></span>
                    </div>
                </div>
            </div>

            <CustomLineChart
                title="แนวโน้มยอดสั่งซื้อจากผู้ขาย (Vendor POs)"
                metrics={[
                    { id: 'po_amount', label: 'ยอดสั่งซื้อ (มูลค่า)', data: rawPOs, dateField: 'date', valueField: 'grand_total', color: '#f59e0b', valuePrefix: '฿' },
                    { id: 'po_count', label: 'จำนวนคำสั่งซื้อ (ใบ)', data: rawPOs, dateField: 'date', valueField: null, color: '#3b82f6', valueSuffix: ' ใบ', chartType: 'line', yAxisId: 'right' }
                ]}
                defaultMetric="po_amount"
                enableGroupBy={true}
                groupByData={rawPOs}
                groupByField="supplierName"
                groupByDateField="date"
                groupByValueField="grand_total"
                groupByPrefix="฿"
            />

            <div className="dashboard-grid">
                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={16} /> ผู้ขายรายล่าสุด
                        </h3>
                        <button
                            onClick={() => navigate('/dashboard/suppliers')}
                            className="btn-text"
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                        >
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>รหัส</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ชื่อผู้ขาย</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ผู้ติดต่อ</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</td></tr>
                                ) : filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map(s => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                            <td style={{ padding: '0.8rem 1.5rem', fontFamily: 'monospace' }}>{s.code}</td>
                                            <td style={{ padding: '0.8rem 1.5rem', fontWeight: '500' }}>{s.name}</td>
                                            <td style={{ padding: '0.8rem 1.5rem' }}>{s.contactPerson}</td>
                                            <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => navigate(`/dashboard/suppliers/${s.id}/edit`)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
                    <div className="panel-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> ประวัติการสั่งซื้อล่าสุด (POs)
                        </h3>
                        <button
                            onClick={() => navigate('/dashboard/supplier-pos')}
                            className="btn-text"
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                        >
                            ดูทั้งหมด <ExternalLink size={14} />
                        </button>
                    </div>

                    <div className="table-responsive-wrapper" style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>เลขที่ PO</th>
                                    <th style={{ padding: '0.8rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ผู้ขาย</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>ยอดเงิน</th>
                                    <th style={{ padding: '0.8rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.85rem' }}>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</td></tr>
                                ) : latestPOs.length > 0 ? (
                                    latestPOs.map(po => (
                                        <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover-row">
                                            <td style={{ padding: '0.8rem 1.5rem', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/supplier-pos/${po.id}`)}>
                                                {po.po_number}
                                            </td>
                                            <td style={{ padding: '0.8rem 1.5rem' }}>{po.suppliers?.name || '-'}</td>
                                            <td style={{ padding: '0.8rem 1.5rem', textAlign: 'right', fontWeight: '500' }}>
                                                ฿{(po.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '0.8rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '0.75rem', 
                                                    padding: '4px 10px', 
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    background: 
                                                        po.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                                        po.status === 'Waiting' ? 'rgba(245, 158, 11, 0.1)' : 
                                                        po.status === 'Approved' ? 'rgba(59, 130, 246, 0.1)' : 
                                                        'rgba(107, 114, 128, 0.1)',
                                                    color: 
                                                        po.status === 'Completed' ? '#10b981' : 
                                                        po.status === 'Waiting' ? '#f59e0b' : 
                                                        po.status === 'Approved' ? '#3b82f6' : 
                                                        '#6b7280'
                                                }}>
                                                    {po.status === 'Approved' ? 'อนุมัติแล้ว' : 
                                                     po.status === 'Waiting' ? 'รออนุมัติ' : 
                                                     po.status === 'Completed' ? 'รับสินค้าแล้ว' : po.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่มีประวัติการสั่งซื้อ</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <style>{`.hover-row:hover { background: var(--bg-main) !important; }`}</style>
        </div>
    );
};

export default SupplierTab;
