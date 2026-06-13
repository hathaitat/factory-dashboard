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
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const BillingNoteListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [kpis, setKpis] = useState({ draft: 0, sent: 0, paid: 0, totalValue: 0 });

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
    } = useServerPagination(billingNoteService.getBillingNotesPaginated, { searchTerm: '', dateFrom: '', dateTo: '', dateFilterType: 'date' }, 50);

    // Debounce filters
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, dateFrom, dateTo, dateFilterType });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, dateFrom, dateTo, dateFilterType, updateFilters]);

    useEffect(() => {
        loadKpis();
    }, []);

    const loadKpis = async () => {
        const stats = await billingNoteService.getBillingNoteStats();
        setKpis(stats);
    };

    const handleDelete = async (id, noteNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบวางบิลเลขที่ ${noteNo} หรือไม่?`);
        if (confirmed) {
            const success = await billingNoteService.deleteBillingNote(id);
            if (success) {
                refresh();
                loadKpis();
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
            const exportData = await billingNoteService.exportBillingNotes({
                searchTerm,
                dateFrom,
                dateTo,
                dateFilterType
            });
            const bnIds = exportData.map(bn => bn.id);
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

    const hasActiveFilters = !!(dateFrom || dateTo);
    const clearFilters = () => { 
        setDateFrom(''); 
        setDateFrom('');
        setDateTo('');
        updateFilters({ dateFrom: '', dateTo: '', dateFilterType: 'date' });
    };

    return (
        <div className="px-4">
            <PageHeader
                title="รายการใบวางบิล (Billing Notes)"
                helpContent={HELP_CONTENT.billingNotes}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className={`glass-panel py-2 px-4 flex items-center gap-2 bg-white border border-[#e2e8f0] text-success rounded-lg font-medium text-[0.9rem] ${isExporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'กำลังสร้างไฟล์...' : 'Export All'}
                    </button>
                    {hasPermission('billing', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/billing-notes/new')}
                            className="py-2.5 px-[1.2rem] flex items-center gap-2 bg-[#3b82f6] border-none text-white cursor-pointer rounded-lg font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
                        >
                            <Plus size={20} /> ออกใบวางบิล
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8 grid-mobile-stack">
                <div className="glass-panel p-5 flex items-center gap-4 border border-[#10b981]/10 bg-[#10b981]/[0.02]">
                    <div className="bg-[#10b981]/10 p-[0.7rem] rounded-[10px] text-success"><FileText size={20} /></div>
                    <div>
                        <div className="text-[0.8rem] text-textMuted">จำนวนใบวางบิลเดือนนี้</div>
                        <div className="text-[1.2rem] font-bold text-[#10b981]">{kpis.monthCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel p-5 flex items-center gap-4 border border-[#f59e0b]/10 bg-[#f59e0b]/[0.02]">
                    <div className="bg-[#f59e0b]/10 p-[0.7rem] rounded-[10px] text-[#f59e0b]"><Clock size={20} /></div>
                    <div>
                        <div className="text-[0.8rem] text-textMuted">รอชำระเงิน</div>
                        <div className="text-[1.2rem] font-bold text-[#f59e0b]">{kpis.pendingCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel p-5 flex items-center gap-4 border border-[#10b981]/10 bg-[#10b981]/[0.02]">
                    <div className="bg-[#10b981]/10 p-[0.7rem] rounded-[10px] text-success"><CheckCircle size={20} /></div>
                    <div>
                        <div className="text-[0.8rem] text-textMuted">ชำระแล้ว</div>
                        <div className="text-[1.2rem] font-bold text-[#10b981]">{kpis.paidCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel p-5 flex items-center gap-4 border border-[#3b82f6]/10 bg-[#3b82f6]/[0.02]">
                    <div className="bg-[#3b82f6]/10 p-[0.7rem] rounded-[10px] text-[#3b82f6]"><TrendingUp size={20} /></div>
                    <div>
                        <div className="text-[0.8rem] text-textMuted">ใบวางบิลสะสม</div>
                        <div className="text-[1.2rem] font-bold text-[#3b82f6]">{kpis.totalCount} ใบ</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 mb-6 flex items-center gap-4 bg-card border border-border">
                <Search size={20} className="text-textMuted" />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่หรือชื่อลูกค้า..."
                    className="bg-transparent border-none text-textMain text-base w-full outline-none"
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

            <div className="glass-panel p-0 overflow-x-auto">
                <div className="table-responsive-wrapper w-full overflow-x-auto [webkit-overflow-scrolling:touch]">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="py-[1.2rem] px-[1.5rem] text-textMuted font-medium">เลขที่ใบวางบิล</th>
                                <th className="py-[1.2rem] px-[1.5rem] text-textMuted font-medium">ชื่อลูกค้า</th>
                                <th className="py-[1.2rem] px-[1.5rem] text-textMuted font-medium">วันที่</th>
                                <th className="py-[1.2rem] px-[1.5rem] text-textMuted font-medium text-right">จำนวนเงินสุทธิ</th>
                                <th className="py-[1.2rem] px-[1.5rem] text-textMuted font-medium text-center">สถานะ</th>
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
                                    <tr key={bn.id} className="border-b border-border transition-colors duration-200 bg-card">
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <Link
                                                    className="action-view"
                                                    to={`/dashboard/billing-notes/${bn.id}`}
                                                    target="_blank"
                                                    title="View"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                <Link
                                                    className="action-print"
                                                    to={`/dashboard/billing-notes/${bn.id}/print`}
                                                    target="_blank"
                                                    title="Print"
                                                >
                                                    <Printer size={18} />
                                                </Link>
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
                                        <td className="py-[1.2rem] px-[1.5rem] font-semibold text-[#3b82f6] text-[1.1rem] font-mono">
                                            <Link to={`/dashboard/billing-notes/${bn.id}`} className="text-[#3b82f6] no-underline hover:underline">
                                                {bn.billingNoteNo}
                                            </Link>
                                        </td>
                                        <td className="py-[1.2rem] px-[1.5rem]">
                                            {bn.customer_id ? (
                                                <Link 
                                                    to={`/dashboard/customers/${bn.customer_id}`} 
                                                    className="text-[#3b82f6] no-underline hover:underline"
                                                >
                                                    {bn.customerName}
                                                </Link>
                                            ) : (
                                                bn.customerName
                                            )}
                                        </td>
                                        <td className="py-[1.2rem] px-[1.5rem]">{new Date(bn.date).toLocaleDateString('th-TH')}</td>
                                        <td className="py-[1.2rem] px-[1.5rem] text-right font-semibold text-success">
                                            ฿{bn.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-[1.2rem] px-[1.5rem] text-center">
                                            <span className={`py-1.5 px-3 rounded-[20px] text-[0.8rem] font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
                                                bn.status === 'Draft' ? 'bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]' :
                                                bn.status === 'Paid' ? 'bg-[#10b981]/[0.08] text-[#059669] border border-[#10b981]/20' : 
                                                'bg-[#ef4444]/[0.08] text-[#dc2626] border border-[#ef4444]/20'
                                            }`}>
                                                {bn.status === 'Draft' && <Clock size={14} />}
                                                {bn.status === 'Paid' && <CheckCircle size={14} />}
                                                {bn.status === 'Cancelled' && <XCircle size={14} />}
                                                {bn.status === 'Draft' ? 'รอชำระ' :
                                                    bn.status === 'Paid' ? 'ชำระแล้ว' : 'ยกเลิก'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-textMuted">ไม่พบรายการใบวางบิล</td>
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

export default BillingNoteListPage;
