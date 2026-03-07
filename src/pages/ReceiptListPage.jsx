import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Search, Printer, Eye, FileSpreadsheet } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { settingService } from '../services/settingService';
import { documentNumberHelper } from '../utils/documentNumbering';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const ReceiptListPage = () => {
    const navigate = useNavigate();
    const [billingNotes, setBillingNotes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [formats, setFormats] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [data, formatsSettings] = await Promise.all([
                billingNoteService.getBillingNotes(),
                settingService.getSetting('document_formats')
            ]);
            setBillingNotes(data || []);
            setFormats(formatsSettings || { billing_note_prefix: 'BN', receipt_prefix: 'RE' });
        } catch (error) {
            console.error("Error loading receipt data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getReceiptNumber = (bnNo, bnDate) => {
        if (!formats) return '-';
        const bnFormat = formats.billing_note_format || (formats.billing_note_prefix ? `${formats.billing_note_prefix}{YY}{MM}{RUN}` : 'BN{YY}{MM}{RUN}');
        const reFormat = formats.receipt_format || (formats.receipt_prefix ? `${formats.receipt_prefix}{YY}{MM}{RUN}` : 'RE{YY}{MM}{RUN}');

        try {
            const runNumber = documentNumberHelper.extractRunNumber(bnNo, bnFormat, new Date(bnDate || new Date()));
            // Simulating today's date for the list block just to show the format
            return documentNumberHelper.applyRunNumberToFormat(runNumber, reFormat, new Date());
        } catch (e) {
            return bnNo.replace(formats.billing_note_prefix || 'BN', formats.receipt_prefix || 'RE');
        }
    };

    const exportToExcel = () => {
        const dataToExport = billingNotes.map(bn => ({
            'เลขที่ใบเสร็จ': getReceiptNumber(bn.billingNoteNo, bn.date),
            'อ้างอิงใบวางบิล': bn.billingNoteNo,
            'วันที่ใบวางบิล': bn.date,
            'ลูกค้า': bn.customerName,
            'จำนวนเงินรวม': bn.totalAmount,
            'สถานะ': bn.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
        XLSX.writeFile(wb, 'Receipt_Export.xlsx');
    };

    const filteredNotes = billingNotes.filter(bn => {
        const receiptNo = getReceiptNumber(bn.billingNoteNo, bn.date).toLowerCase();
        const bnNo = bn.billingNoteNo.toLowerCase();
        const search = searchTerm.toLowerCase();
        return receiptNo.includes(search) || bnNo.includes(search) || bn.customerName.toLowerCase().includes(search);
    });

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

    const monthYearGroups = Object.keys(groupedNotes).sort((a, b) => {
        const dateA = Math.max(...groupedNotes[a].map(bn => new Date(bn.date).getTime()));
        const dateB = Math.max(...groupedNotes[b].map(bn => new Date(bn.date).getTime()));
        return dateB - dateA;
    });

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบเสร็จรับเงิน (Receipts)"
                helpContent={HELP_CONTENT.receipts}
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
            </PageHeader>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ใบเสร็จ, เลขที่ใบวางบิล หรือชื่อลูกค้า..."
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
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบเสร็จ</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>อ้างอิงใบวางบิล</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงินสุทธิ</th>
                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะบิล</th>
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
                                            <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#8b5cf6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                <Link to={`/dashboard/receipts/${bn.id}`} style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                                                    {getReceiptNumber(bn.billingNoteNo, bn.date)}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.9rem', color: '#888' }}>{bn.billingNoteNo}</td>
                                            <td style={{ padding: '1.2rem 1.5rem' }}>{bn.customerName}</td>
                                            <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                                ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                        onClick={() => navigate(`/dashboard/receipts/${bn.id}`)}
                                                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/print-receipt`)}
                                                        style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                        title="Print Receipt"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>ไม่พบรายการใบเสร็จ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
</div>
            </div>
        </div>
    );
};

export default ReceiptListPage;
