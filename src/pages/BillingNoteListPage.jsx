import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import { Plus, Search, FileText, Edit, Trash2, Printer, Eye, FileSpreadsheet, TrendingUp, CheckCircle, Clock, XCircle, Calendar } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
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
            const fullBNs = [];

            // Fetch in batches of 5 to avoid potential Rate Limits and browser stalls
            const batchSize = 5;
            for (let i = 0; i < bnIds.length; i += batchSize) {
                const batchIds = bnIds.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batchIds.map(id => billingNoteService.getBillingNoteById(id))
                );
                fullBNs.push(...batchResults);
            }

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
            a.download = `BillingNote_Export_${getLocalDateString()}.xlsx`;
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

    // Export only a specific month's billing notes
    const exportMonthToExcel = async (group, monthNotes) => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const fullBNs = [];
            const batchSize = 5;
            const bnIds = monthNotes.map(bn => bn.id);
            for (let i = 0; i < bnIds.length; i += batchSize) {
                const batchIds = bnIds.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batchIds.map(id => billingNoteService.getBillingNoteById(id))
                );
                fullBNs.push(...batchResults);
            }

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
                let r = 0;

                const setCell = (row, col, value, style = {}) => {
                    const ref = XLSX.utils.encode_cell({ r: row, c: col });
                    ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
                };

                setCell(r, 0, company?.name || '', { font: bold(14) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 4 } }); r++;
                setCell(r, 0, company?.address || '', { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 4 } }); r++;
                setCell(r, 0, `TEL: ${company?.phone || ''} FAX: ${company?.fax || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); r++;
                setCell(r, 0, `E-mail: ${company?.email || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); r++;
                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${company?.taxId || ''}`, { font: normal(10) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); r++;
                r++;
                setCell(r, 3, 'ใบวางบิล / ใบแจ้งหนี้', { font: bold(14), alignment: alignC });
                merges.push({ s: { r, c: 3 }, e: { r, c: 5 } }); r++;
                r++;

                setCell(r, 0, 'ลูกค้า', { font: bold(10) });
                setCell(r, 1, cust.code || '', { font: normal(10) });
                setCell(r, 4, 'เลขที่ใบวางบิล', { font: bold(10), alignment: alignR });
                setCell(r, 5, bn.billingNoteNo, { font: normal(10) }); r++;
                setCell(r, 1, cust.name || '', { font: bold(11) });
                merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
                setCell(r, 4, 'วันที่', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(bn.date), { font: normal(10) }); r++;
                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${cust.taxId || ''}`, { font: normal(9) });
                setCell(r, 2, `สาขา ${cust.branch || '-'}`, { font: normal(9) });
                setCell(r, 4, 'สถานะ', { font: bold(10), alignment: alignR });
                setCell(r, 5, bn.status, { font: normal(10) }); r++;
                setCell(r, 0, cust.address || '', { font: normal(9) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 3 } }); r++;
                setCell(r, 0, `TEL: ${cust.phone || ''}`, { font: normal(9) });
                setCell(r, 1, `FAX: ${cust.fax || '-'}`, { font: normal(9) }); r++;
                r++;

                const headerStyle = { font: bold(10), alignment: alignC, border: border('all'), fill: { fgColor: { rgb: 'E8E8E8' } } };
                const headers = ['ลำดับ', 'เลขที่ใบกำกับภาษี', 'วันที่เอกสาร', 'ครบกำหนด', 'อ้างอิง (PO)', 'จำนวนเงิน'];
                headers.forEach((h, c) => setCell(r, c, h, headerStyle)); r++;

                (bn.invoices || []).forEach((inv, idx) => {
                    setCell(r, 0, idx + 1, { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 1, inv.invoiceNo, { font: normal(10), alignment: alignL, border: border('all') });
                    setCell(r, 2, fmtDate(inv.date), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 3, fmtDate(inv.dueDate), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 4, inv.poNumber || '-', { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 5, fmtNum(inv.grandTotal), { font: normal(10), alignment: alignR, border: border('all') });
                    r++;
                });

                const emptyCount = Math.max(0, 6 - (bn.invoices || []).length);
                for (let i = 0; i < emptyCount; i++) {
                    for (let c = 0; c <= 5; c++) setCell(r, c, '', { border: border('all') });
                    r++;
                }

                const notesStartRow = r;
                setCell(r, 0, `หมายเหตุ: ${bn.notes || ''}`, { font: normal(9), alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: border('all') });
                setCell(r, 4, 'จำนวนเงินรวมทั้งสิ้น', { font: bold(11), alignment: alignR, border: border('all') });
                setCell(r, 5, fmtNum(bn.totalAmount), { font: bold(11), alignment: alignR, border: border('all') });
                r++;
                setCell(r, 0, bn.bahtText ? `(${bn.bahtText})` : '', { font: bold(10), border: border('blr') });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
                merges.push({ s: { r: notesStartRow, c: 0 }, e: { r: notesStartRow, c: 2 } });
                merges.push({ s: { r: notesStartRow, c: 3 }, e: { r: r, c: 3 } });

                ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
                ws['!merges'] = merges;
                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 5 } });
                XLSX.utils.book_append_sheet(wb, ws, (bn.billingNoteNo || 'Sheet').substring(0, 31));
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BillingNote_${group.replace(/ /g, '_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await showAlert(`ส่งออก Excel เดือน${group} เรียบร้อย (${fullBNs.filter(Boolean).length} ใบ)`);
        } catch (error) {
            console.error('Export month error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = dateFrom || dateTo;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); };

    const filteredNotes = billingNotes.filter(bn => {
        const matchSearch = bn.billingNoteNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bn.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const targetDate = bn.date;
        const matchDateFrom = !dateFrom || (targetDate && targetDate >= dateFrom);
        const matchDateTo = !dateTo || (targetDate && targetDate <= dateTo);
        return matchSearch && matchDateFrom && matchDateTo;
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

    // KPI Calculations
    const kpis = React.useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthBNs = billingNotes.filter(bn => {
            const d = new Date(bn.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const monthCount = monthBNs.length;
        const pendingCount = billingNotes.filter(bn => bn.status === 'Draft' || bn.status === 'Unpaid').length;
        const paidCount = billingNotes.filter(bn => bn.status === 'Paid').length;
        const totalCount = billingNotes.filter(bn => bn.status !== 'Cancelled').length;

        return { monthCount, pendingCount, paidCount, totalCount };
    }, [billingNotes]);

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบวางบิล (Billing Notes)"
                helpContent={HELP_CONTENT.billingNotes}
            >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            color: 'var(--success)',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            opacity: isExporting ? 0.6 : 1
                        }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'กำลังสร้างไฟล์...' : 'Export All'}
                    </button>
                    {hasPermission('billing', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/billing-notes/new')}
                            style={{
                                padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: '#3b82f6', border: 'none', color: 'white',
                                cursor: 'pointer', borderRadius: '8px', fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                            }}
                        >
                            <Plus size={20} /> ออกใบวางบิล
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><FileText size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>จำนวนใบวางบิลเดือนนี้</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.monthCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#f59e0b' }}><Clock size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รอชำระเงิน</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b' }}>{kpis.pendingCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><CheckCircle size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ชำระแล้ว</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.paidCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#3b82f6' }}><TrendingUp size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ใบวางบิลสะสม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{kpis.totalCount} ใบ</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Search size={20} className="text-textMuted" />
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
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
            />

            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th className="actions-column" style={{ color: 'var(--text-muted)', fontWeight: '500' }}>จัดการ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบวางบิล</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงินสุทธิ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredNotes.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                                            <td colSpan="6" style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#37477C', borderBottom: '1px solid var(--border-color)', borderTop: 'none', fontSize: '1rem' }}>
                                                <div className="flex justify-between items-center">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Calendar size={18} color="#3b82f6" />
                                                        <span>{group}</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{groupedNotes[group].length} รายการ</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); exportMonthToExcel(group, groupedNotes[group]); }}
                                                        disabled={isExporting}
                                                        title={`Export Excel เดือน${group}`}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                            padding: '0.3rem 0.7rem', borderRadius: '6px',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                                            background: 'rgba(16, 185, 129, 0.05)',
                                                            color: 'var(--success)', cursor: isExporting ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.8rem', fontWeight: '500',
                                                            opacity: isExporting ? 0.5 : 1
                                                        }}
                                                    >
                                                        <FileSpreadsheet size={14} /> Export
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {groupedNotes[group].map((bn) => (
                                            <tr key={bn.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                                <td className="actions-column">
                                                    <div className="table-actions">
                                                        <button
                                                            className="action-view"
                                                            onClick={() => window.open(`/dashboard/billing-notes/${bn.id}`, '_blank')}
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            className="action-print"
                                                            onClick={() => window.open(`/dashboard/billing-notes/${bn.id}/print`, '_blank')}
                                                            title="Print"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                        {hasPermission('billing', 'edit') && (
                                                            <button
                                                                className="action-edit"
                                                                onClick={() => navigate(`/dashboard/billing-notes/${bn.id}/edit`)}
                                                                title="Edit"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                        )}
                                                        {hasPermission('billing', 'delete') && (
                                                            <button
                                                                className="action-delete"
                                                                onClick={() => handleDelete(bn.id, bn.billingNoteNo)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
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
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: bn.status === 'Draft' ? '#f3f4f6' :
                                                            bn.status === 'Paid' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                        color: bn.status === 'Draft' ? '#6b7280' :
                                                            bn.status === 'Paid' ? '#059669' : '#dc2626',
                                                        border: bn.status === 'Draft' ? '1px solid #e5e7eb' :
                                                            bn.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                                    }}>
                                                        {bn.status === 'Draft' && <Clock size={14} />}
                                                        {bn.status === 'Paid' && <CheckCircle size={14} />}
                                                        {bn.status === 'Cancelled' && <XCircle size={14} />}
                                                        {bn.status === 'Draft' ? 'รอชำระ' :
                                                            bn.status === 'Paid' ? 'ชำระแล้ว' : 'ยกเลิก'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบรายการใบวางบิล</td>
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
