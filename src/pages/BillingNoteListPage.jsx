import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Plus, Search, FileText, Edit, Trash2, Printer, Eye, FileSpreadsheet } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const BillingNoteListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [billingNotes, setBillingNotes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadBillingNotes();
    }, []);

    const loadBillingNotes = async () => {
        setIsLoading(true);
        const data = await billingNoteService.getBillingNotes();
        setBillingNotes(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (id, noteNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบวางบิลเลขที่ ${noteNo} หรือไม่?`);
        if (confirmed) {
            const success = await billingNoteService.deleteBillingNote(id);
            if (success) {
                setBillingNotes(billingNotes.filter(bn => bn.id !== id));
            } else {
                await showError('ไม่สามารถลบใบวางบิลได้');
            }
        }
    };

    const exportToExcel = () => {
        const dataToExport = billingNotes.map(bn => ({
            'เลขที่ใบวางบิล': bn.billingNoteNo,
            'วันที่': bn.date,
            'ลูกค้า': bn.customerName,
            'จำนวนเงินรวม': bn.totalAmount,
            'สถานะ': bn.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BillingNotes');
        XLSX.writeFile(wb, 'BillingNote_Export.xlsx');
    };

    const filteredNotes = billingNotes.filter(bn =>
        bn.billingNoteNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bn.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping by Month/Year
    const getMonthYear = (dateString) => {
        const date = new Date(dateString);
        const monthNames = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
    };

    const groupedNotes = filteredNotes.reduce((acc, bn) => {
        const group = getMonthYear(bn.date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(bn);
        return acc;
    }, {});

    // Create an ordered array of keys sorted by the latest note in each group
    const monthYearGroups = Object.keys(groupedNotes).sort((a, b) => {
        const dateA = Math.max(...groupedNotes[a].map(bn => new Date(bn.date).getTime()));
        const dateB = Math.max(...groupedNotes[b].map(bn => new Date(bn.date).getTime()));
        return dateB - dateA;
    });

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบวางบิล (Billing Notes)"
                helpContent={HELP_CONTENT.billingNotes}
            >
                <button
                    onClick={exportToExcel}
                    className="glass-panel"
                    style={{
                        padding: '0.6rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        color: 'var(--success)', cursor: 'pointer', borderRadius: '8px'
                    }}
                >
                    <FileSpreadsheet size={18} /> Export Excel
                </button>
                {hasPermission('billing', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/billing-notes/new')}
                        style={{
                            padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: '#3b82f6', border: 'none', color: 'white',
                            cursor: 'pointer', borderRadius: '8px', fontWeight: '500'
                        }}
                    >
                        <Plus size={20} /> ออกใบวางบิล
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่หรือชื่อลูกค้า..."
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1rem', width: '100%', outline: 'none' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบวางบิล</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงินสุทธิ</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูล...</td>
                            </tr>
                        ) : filteredNotes.length > 0 ? (
                            monthYearGroups.map((group) => (
                                <React.Fragment key={group}>
                                    <tr style={{ background: 'var(--bg-main)' }}>
                                        <td colSpan="6" style={{ padding: '0.8rem 1.5rem', fontWeight: '600', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', borderTop: 'none' }}>
                                            เดือน {group}
                                        </td>
                                    </tr>
                                    {groupedNotes[group].map((bn) => (
                                        <tr key={bn.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                            <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                <Link to={`/dashboard/billing-notes/${bn.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                    {bn.billingNoteNo}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem' }}>{bn.customerName}</td>
                                            <td style={{ padding: '1.2rem 1.5rem' }}>{new Date(bn.date).toLocaleDateString('th-TH')}</td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                                ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    background: bn.status === 'Draft' ? 'var(--card-hover)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: bn.status === 'Draft' ? 'var(--text-muted)' : 'var(--primary)'
                                                }}>
                                                    {bn.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => navigate(`/dashboard/billing-notes/${bn.id}`)}
                                                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                        title="View"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/print`)}
                                                        style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                        title="Print"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                    {hasPermission('billing', 'edit') && (
                                                        <button
                                                            onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/edit`)}
                                                            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('billing', 'delete') && (
                                                        <button
                                                            onClick={() => handleDelete(bn.id, bn.billingNoteNo)}
                                                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>ไม่พบรายการใบวางบิล</td>
                            </tr>
                        )}
                    </tbody>
                </table>
</div>
            </div>
        </div>
    );
};

export default BillingNoteListPage;
