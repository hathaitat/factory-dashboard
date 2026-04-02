import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import { Plus, Search, FileText, Edit, Trash2, Printer, Eye, FileSpreadsheet } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';

const BillingNoteListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [billingNotes, setBillingNotes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');

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

    const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const bnIds = filteredNotes.map(bn => bn.id);
            const fullBNs = await Promise.all(
                bnIds.map(id => billingNoteService.getBillingNoteById(id))
            );

            // Style helpers
            const border = (sides = 'all') => {
                const b = { style: 'thin', color: { rgb: '000000' } };
                if (sides === 'all') return { top: b, bottom: b, left: b, right: b };
                const r = {};
                if (sides.includes('t')) r.top = b;
                if (sides.includes('b')) r.bottom = b;
                if (sides.includes('l')) r.left = b;
                if (sides.includes('r')) r.right = b;
                return r;
            };
            const bold = (sz = 11) => ({ bold: true, sz, name: 'Tahoma' });
            const normal = (sz = 11) => ({ sz, name: 'Tahoma' });
            const alignR = { horizontal: 'right' };
            const alignC = { horizontal: 'center' };
            const alignL = { horizontal: 'left' };

            const wb = XLSX.utils.book_new();

            fullBNs.filter(Boolean).forEach((bn) => {
                const cust = bn.customer || bn.customerSnapshot || {};
                const ws = {};
                const merges = [];
                let r = 0; // current row index

                // Helper to set cell
                const setCell = (row, col, value, style = {}) => {
                    const ref = XLSX.utils.encode_cell({ r: row, c: col });
                    ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
                };

                // === Row 0: Company Name (bold, large) ===
                setCell(r, 0, company?.name || '', { font: bold(14) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
                r++;

                // === Row 1: Address ===
                setCell(r, 0, company?.address || '', { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
                r++;

                // === Row 2: Tel/Fax ===
                setCell(r, 0, `TEL: ${company?.phone || ''} FAX: ${company?.fax || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
                r++;

                // === Row 3: Email ===
                setCell(r, 0, `E-mail: ${company?.email || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
                r++;

                // === Row 4: Tax ID ===
                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${company?.taxId || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
                r++;

                // === Row 5: blank ===
                r++;

                // === Row 6: Document Title ===
                setCell(r, 3, 'ใบวางบิล / ใบแจ้งหนี้', { font: bold(14), alignment: alignC });
                merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
                r++;

                // === Row 7: blank ===
                r++;

                // === Row 8-13: Customer + Document Meta ===
                setCell(r, 0, 'ลูกค้า', { font: bold(10) });
                setCell(r, 1, cust.code || '', { font: normal(10) });
                setCell(r, 4, 'เลขที่ใบวางบิล', { font: bold(10), alignment: alignR });
                setCell(r, 5, bn.billingNoteNo, { font: normal(10) });
                r++;

                setCell(r, 1, cust.name || '', { font: bold(11) });
                merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
                setCell(r, 4, 'วันที่', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(bn.date), { font: normal(10) });
                r++;

                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${cust.taxId || ''}`, { font: normal(9) });
                setCell(r, 2, `สาขา ${cust.branch || '-'}`, { font: normal(9) });
                setCell(r, 4, 'สถานะ', { font: bold(10), alignment: alignR });
                setCell(r, 5, bn.status, { font: normal(10) });
                r++;

                setCell(r, 0, cust.address || '', { font: normal(9) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
                r++;

                setCell(r, 0, `TEL: ${cust.phone || ''}`, { font: normal(9) });
                setCell(r, 1, `FAX: ${cust.fax || '-'}`, { font: normal(9) });
                r++;

                // === blank ===
                r++;

                // === Items Table Header ===
                const headerRow = r;
                const headerStyle = { font: bold(10), alignment: alignC, border: border('all'), fill: { fgColor: { rgb: 'E8E8E8' } } };
                const headers = ['ลำดับ', 'เลขที่ใบกำกับภาษี', 'วันที่เอกสาร', 'ครบกำหนด', 'อ้างอิง (PO)', 'จำนวนเงิน'];
                headers.forEach((h, c) => setCell(r, c, h, headerStyle));
                r++;

                // === Items (Linked Invoices) ===
                (bn.invoices || []).forEach((inv, idx) => {
                    setCell(r, 0, idx + 1, { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 1, inv.invoiceNo, { font: normal(10), alignment: alignL, border: border('all') });
                    setCell(r, 2, fmtDate(inv.date), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 3, fmtDate(inv.dueDate), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 4, inv.poNumber || '-', { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 5, fmtNum(inv.grandTotal), { font: normal(10), alignment: alignR, border: border('all') });
                    r++;
                });

                // Empty rows to fill table (min 6 rows total)
                const minRows = 6;
                const emptyCount = Math.max(0, minRows - (bn.invoices || []).length);
                for (let i = 0; i < emptyCount; i++) {
                    for (let c = 0; c <= 5; c++) {
                        setCell(r, c, '', { border: border('all') });
                    }
                    r++;
                }

                // === Totals section ===
                const notesStartRow = r;
                setCell(r, 0, `หมายเหตุ: ${bn.notes || ''}`, { font: normal(9), alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: border('all') });
                
                setCell(r, 4, 'จำนวนเงินรวมทั้งสิ้น', { font: bold(11), alignment: alignR, border: border('all') });
                setCell(r, 5, fmtNum(bn.totalAmount), { font: bold(11), alignment: alignR, border: border('all') });
                
                // Baht Text
                r++;
                setCell(r, 0, bn.bahtText ? `(${bn.bahtText})` : '', { font: bold(10), border: border('blr') });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); 
                
                // Merge notes cell vertically across the total row
                merges.push({ s: { r: notesStartRow, c: 0 }, e: { r: notesStartRow, c: 2 } });
                merges.push({ s: { r: notesStartRow, c: 3 }, e: { r: r, c: 3 } }); // Empty cell next to notes

                // Column widths
                ws['!cols'] = [
                    { wch: 8 },   // ลำดับ
                    { wch: 20 },  // เลขที่ใบกำกับ
                    { wch: 15 },  // วันที่
                    { wch: 15 },  // ครบกำหนด
                    { wch: 18 },  // PO
                    { wch: 18 },  // จำนวนเงิน
                ];

                ws['!merges'] = merges;
                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 5 } });

                XLSX.utils.book_append_sheet(wb, ws, (bn.billingNoteNo || 'Sheet').substring(0, 31));
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BillingNote_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await showAlert(`ส่งออก Excel เรียบร้อย (${fullBNs.filter(Boolean).length} ใบ)`);
        } catch (error) {
            console.error('Export error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = dateFrom || dateTo || statusFilter;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setDateFilterType('date'); };

    const filteredNotes = billingNotes.filter(bn => {
        const matchSearch = bn.billingNoteNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bn.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            
        const targetDate = bn.date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        const matchStatus = !statusFilter || bn.status === statusFilter;
        return matchSearch && matchDateFrom && matchDateTo && matchStatus;
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
                    disabled={isExporting}
                    className="glass-panel"
                    style={{
                        padding: '0.6rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        color: 'var(--success)', 
                        cursor: isExporting ? 'not-allowed' : 'pointer', 
                        borderRadius: '8px',
                        opacity: isExporting ? 0.6 : 1
                    }}
                >
                    <FileSpreadsheet size={18} /> {isExporting ? 'กำลังสร้างไฟล์...' : 'Export Excel'}
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

            <ListFilter
                filters={[
                    { 
                        type: 'date-range', 
                        dateFrom, 
                        dateTo, 
                        onDateFromChange: setDateFrom, 
                        onDateToChange: setDateTo,
                        value: dateFilterType,
                        onChange: setDateFilterType,
                        options: [{ value: 'date', label: 'วันที่เอกสาร' }]
                    },
                    { type: 'select', label: 'สถานะ', value: statusFilter, onChange: setStatusFilter, options: [
                        { value: '', label: 'ทั้งหมด' },
                        { value: 'Draft', label: 'Draft' },
                        { value: 'Sent', label: 'Sent' }
                    ]}
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
            />

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
                                                        onClick={() => window.open(`/dashboard/billing-notes/${bn.id}`, '_blank')}
                                                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px' }}
                                                        title="View"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(`/dashboard/billing-notes/${bn.id}/print`, '_blank')}
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
