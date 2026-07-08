import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import { Search, Printer, Eye, FileSpreadsheet, TrendingUp, CheckCircle, Clock, XCircle, Calendar, DollarSign } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { companyService } from '../services/companyService';
import { settingService } from '../services/settingService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const ReceiptListPage = () => {
    const navigate = useNavigate();
    const { showAlert, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [formats, setFormats] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');
    const [kpis, setKpis] = useState({ revenueThisMonth: 0, totalPaidCount: 0, totalRevenue: 0 });

    const {
        data: paginatedData,
        totalItems,
        totalPages,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        isLoading,
        updateFilters,
        startItem,
        endItem,
        refresh
    } = useServerPagination(billingNoteService.getBillingNotesPaginated, { searchTerm: '', dateFrom: '', dateTo: '', status: '', dateFilterType: 'date' }, 50);

    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, dateFrom, dateTo, status: statusFilter, dateFilterType });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, dateFrom, dateTo, statusFilter, dateFilterType, updateFilters]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [stats, formatsSettings] = await Promise.all([
                billingNoteService.getReceiptStats(),
                settingService.getSetting('document_formats')
            ]);

            setFormats(formatsSettings || { billing_note_prefix: 'BN', receipt_prefix: 'RE' });
            setKpis(stats);
        } catch (error) {
            console.error("Error loading receipt data:", error);
        }
    };

    const getReceiptNumber = (bnNo, bnDate) => {
        if (!bnNo || !formats) return '-';
        const bnPrefix = formats.billing_note_prefix || 'BI';
        const rePrefix = formats.receipt_prefix || 'RV';

        if (bnNo.startsWith(bnPrefix)) {
            return bnNo.replace(bnPrefix, rePrefix);
        }
        return bnNo.replace(/^[a-zA-Z]+/, rePrefix);
    };

    const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const exportData = await billingNoteService.exportBillingNotes({
                searchTerm,
                dateFrom,
                dateTo,
                status: statusFilter
            });
            const bnIds = exportData.map(bn => bn.id);
            const fullBNs = [];

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
                setCell(r, 3, 'ใบเสร็จรับเงิน', { font: bold(14), alignment: alignC });
                merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
                r++;

                // === Row 7: blank ===
                r++;

                // === Row 8-13: Customer + Document Meta ===
                setCell(r, 0, 'ลูกค้า', { font: bold(10) });
                setCell(r, 1, cust.code || '', { font: normal(10) });
                setCell(r, 4, 'เลขที่ใบเสร็จ', { font: bold(10), alignment: alignR });
                setCell(r, 5, getReceiptNumber(bn.billingNoteNo, bn.date), { font: normal(10) });
                r++;

                setCell(r, 1, cust.name || '', { font: bold(11) });
                merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
                setCell(r, 4, 'วันที่', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(bn.date), { font: normal(10) });
                r++;

                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${cust.taxId || ''}`, { font: normal(9) });
                setCell(r, 2, `สาขา ${cust.branch || '-'}`, { font: normal(9) });
                setCell(r, 4, 'อ้างอิงใบวางบิล', { font: bold(10), alignment: alignR });
                setCell(r, 5, bn.billingNoteNo, { font: normal(10) });
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
                const headers = ['ลำดับ', 'เลขที่ใบกำกับภาษี', 'วันที่เอกสาร', 'ครบกำหนด', '', 'จำนวนเงิน'];
                headers.forEach((h, c) => setCell(r, c, h, headerStyle));
                merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
                r++;

                // === Items (Linked Invoices) ===
                (bn.invoices || []).forEach((inv, idx) => {
                    setCell(r, 0, idx + 1, { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 1, inv.invoiceNo, { font: normal(10), alignment: alignL, border: border('all') });
                    setCell(r, 2, fmtDate(inv.date), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 3, fmtDate(inv.dueDate), { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 4, '', { font: normal(10), border: border('all') });
                    setCell(r, 5, fmtNum(inv.grandTotal), { font: normal(10), alignment: alignR, border: border('all') });
                    merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
                    r++;
                });

                // Empty rows to fill table (min 6 rows total)
                const minRows = 6;
                const emptyCount = Math.max(0, minRows - (bn.invoices || []).length);
                for (let i = 0; i < emptyCount; i++) {
                    for (let c = 0; c <= 5; c++) {
                        setCell(r, c, '', { border: border('all') });
                    }
                    merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
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

                // Merge notes cell
                merges.push({ s: { r: notesStartRow, c: 0 }, e: { r: notesStartRow, c: 2 } });
                merges.push({ s: { r: notesStartRow, c: 3 }, e: { r: r, c: 3 } }); // Space cell

                // Column widths
                ws['!cols'] = [
                    { wch: 8 },   // ลำดับ
                    { wch: 20 },  // เลขที่ใบกำกับ
                    { wch: 15 },  // วันที่
                    { wch: 15 },  // ครบกำหนด
                    { wch: 8 },   // spacer
                    { wch: 18 },  // จำนวนเงิน
                ];

                ws['!merges'] = merges;
                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 5 } });

                const receiptNo = getReceiptNumber(bn.billingNoteNo, bn.date);
                XLSX.utils.book_append_sheet(wb, ws, (receiptNo || 'Sheet').substring(0, 31));
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt_Export_${getLocalDateString()}.xlsx`;
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

    const hasActiveFilters = !!(dateFrom || dateTo || statusFilter);
    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setDateFilterType('date');
        setStatusFilter('');
        updateFilters({ dateFrom: '', dateTo: '', status: '', dateFilterType: 'date' });
    };

    return (
        <div className="px-4">
            <PageHeader
                title="รายการใบเสร็จรับเงิน"
                helpContent={HELP_CONTENT.receipts}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel px-4 py-2.5 text-emerald-500 rounded-lg font-medium text-sm flex items-center gap-2 bg-white border border-slate-200" style={{ cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.6 : 1 }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'กำลังสร้างไฟล์...' : 'Export All'}
                    </button>
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel flex items-center gap-4 border border-emerald-500/10 bg-emerald-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><TrendingUp size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รายรับเดือนนี้</div>
                        <div className="text-xl font-bold text-emerald-500">฿{kpis.revenueThisMonth.toLocaleString()}</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-blue-500/10 bg-blue-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-blue-500 bg-blue-500/10"><CheckCircle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">จำนวนบิลที่ชำระแล้ว</div>
                        <div className="text-xl font-bold text-blue-500">{kpis.totalPaidCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4 border border-emerald-500/10 bg-emerald-500/[0.02]" style={{ padding: '1.25rem' }}>
                    <div className="p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"><DollarSign size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รายรับสะสมทั้งหมด</div>
                        <div className="text-xl font-bold text-emerald-500">฿{kpis.totalRevenue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 mb-6 border border-border flex items-center gap-4 bg-cardBg">
                <Search size={20} className="text-textMuted" />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่ใบเสร็จ, เลขที่ใบวางบิล หรือชื่อลูกค้า..."
                    className="bg-transparent border-none text-main text-base w-full outline-none"
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

            <div className="glass-panel overflow-x-auto p-0">
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">เลขที่ใบเสร็จ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">อ้างอิงใบวางบิล</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ชื่อลูกค้า</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">จำนวนเงินสุทธิ</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">สถานะบิล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((bn) => (
                                    <tr key={bn.id} className="border-b border-border bg-cardBg" style={{ transition: 'background 0.2s' }}>
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <Link
                                                    className="action-view"
                                                    to={`/dashboard/receipts/${bn.id}`}
                                                    target="_blank"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                <Link
                                                    className="action-edit"
                                                    to={`/dashboard/billing-notes/${bn.id}/print-receipt`}
                                                    target="_blank"
                                                    title="Print Receipt"
                                                >
                                                    <Printer size={18} />
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-semibold text-primary text-lg font-mono">
                                            <Link to={`/dashboard/receipts/${bn.id}`} className="text-primary no-underline">
                                                {getReceiptNumber(bn.billingNoteNo, bn.date)}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-textMuted">{bn.billingNoteNo}</td>
                                        <td className="px-6 py-5">
                                            {bn.customer_id ? (
                                                <Link
                                                    to={`/dashboard/customers/${bn.customer_id}`}
                                                    className="text-blue-500 no-underline"
                                                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {bn.customerName}
                                                </Link>
                                            ) : (
                                                bn.customerName
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right font-semibold text-emerald-500">
                                            ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="rounded-full text-xs font-semibold px-3 py-1.5 whitespace-nowrap inline-flex gap-1" style={{ alignItems: 'center', background: bn.status === 'Draft' ? '#f3f4f6' : bn.status === 'Paid' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', color: bn.status === 'Draft' ? '#6b7280' : bn.status === 'Paid' ? '#059669' : '#dc2626', border: bn.status === 'Draft' ? '1px solid #e5e7eb' : bn.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                {bn.status === 'Draft' && <Clock size={14} />}
                                                {bn.status === 'Paid' && <CheckCircle size={14} />}
                                                {bn.status === 'Cancelled' && <XCircle size={14} />}
                                                {bn.status === 'Draft' ? 'ฉบับร่าง' :
                                                    bn.status === 'Paid' ? 'ชำระเงินแล้ว' : 'ยกเลิก'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">ไม่พบรายการใบเสร็จ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    totalPages={totalPages}
                    startItem={startItem}
                    endItem={endItem}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>
        </div>
    );
};

export default ReceiptListPage;
