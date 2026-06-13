import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, FileText, Edit, Trash2, Printer, FileSpreadsheet, Eye, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { companyService } from '../services/companyService';
import { usePermissions } from '../hooks/usePermissions';
import XLSX from 'xlsx-js-style';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import ListFilter from '../components/ListFilter';
import Pagination from '../components/Pagination';
import { useServerPagination } from '../hooks/useServerPagination';

const InvoiceListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');
    const [kpis, setKpis] = useState({ monthCount: 0, pendingCount: 0, paidCount: 0, totalCount: 0 });

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
    } = useServerPagination(invoiceService.getInvoicesPaginated, { searchTerm: '', status: '', dateFrom: '', dateTo: '', dateFilterType: 'date' }, 50);

    useEffect(() => {
        const loadKPIs = async () => {
            const stats = await invoiceService.getInvoiceStats();
            setKpis({
                monthCount: stats.monthCount || 0,
                pendingCount: stats.pendingCount || 0,
                paidCount: stats.paidCount || 0,
                totalCount: stats.totalCount || 0
            });
        };
        loadKPIs();
    }, [refresh]);

    const hasActiveFilters = !!(statusFilter || dateFrom || dateTo);
    const clearFilters = () => {
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        updateFilters({ status: '', dateFrom: '', dateTo: '', dateFilterType: 'date' });
    };

    // Debounce filters
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ searchTerm, status: statusFilter, dateFrom, dateTo, dateFilterType });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, dateFrom, dateTo, dateFilterType, updateFilters]);

    const handleDelete = async (id, invoiceNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบกำกับภาษีเลขที่ ${invoiceNo} หรือไม่?`);
        if (confirmed) {
            const success = await invoiceService.deleteInvoice(id);
            if (success) {
                refresh();
            } else {
                await showError('ไม่สามารถลบใบกำกับภาษีได้');
            }
        }
    };

    const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const allFilteredInvoices = await invoiceService.exportInvoices({
                searchTerm,
                status: statusFilter,
                dateFrom,
                dateTo,
                dateFilterType
            });
            const fullInvoices = await Promise.all(
                allFilteredInvoices.map(inv => invoiceService.getInvoiceById(inv.id))
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

            fullInvoices.filter(Boolean).forEach((inv) => {
                const cust = inv.customer || inv.customerSnapshot || {};
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
                const titleRow = r;
                setCell(r, 3, 'ใบกำกับสินค้า / ใบกำกับภาษี', { font: bold(14), alignment: alignC });
                merges.push({ s: { r, c: 3 }, e: { r, c: 5 } });
                r++;

                // === Row 7: blank ===
                r++;

                // === Row 8-13: Customer + Invoice Meta ===
                setCell(r, 0, 'ลูกค้า', { font: bold(10) });
                setCell(r, 1, cust.code || '', { font: normal(10) });
                setCell(r, 4, 'เลขที่ใบกำกับ', { font: bold(10), alignment: alignR });
                setCell(r, 5, inv.invoiceNo, { font: normal(10) });
                r++;

                setCell(r, 1, cust.name || '', { font: bold(11) });
                merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
                setCell(r, 4, 'วันที่', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(inv.date), { font: normal(10) });
                r++;

                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${cust.taxId || ''}`, { font: normal(9) });
                setCell(r, 2, `สาขา ${cust.branch || '-'}`, { font: normal(9) });
                setCell(r, 4, 'เครดิต', { font: bold(10), alignment: alignR });
                setCell(r, 5, parseInt(inv.creditDays) === 0 ? 'สด' : `${inv.creditDays} วัน`, { font: normal(10) });
                r++;

                setCell(r, 0, cust.address || '', { font: normal(9) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
                setCell(r, 4, 'ครบกำหนด', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(inv.dueDate), { font: normal(10) });
                r++;

                setCell(r, 0, `TEL: ${cust.phone || ''}`, { font: normal(9) });
                setCell(r, 1, `FAX: ${cust.fax || '-'}`, { font: normal(9) });
                r++;

                setCell(r, 0, `อ้างอิง: ${inv.referenceNo || '-'}`, { font: normal(9) });
                r++;

                // === blank ===
                r++;

                // === Items Table Header (with borders + bold + center + gray bg) ===
                const headerRow = r;
                const headerStyle = { font: bold(10), alignment: alignC, border: border('all'), fill: { fgColor: { rgb: 'E8E8E8' } } };
                const headers = ['ลำดับ', 'รหัสสินค้า / รายละเอียด', '', 'จำนวน', 'ราคา / หน่วย', 'จำนวนเงิน'];
                headers.forEach((h, c) => setCell(r, c, h, headerStyle));
                merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }); // merge product name header
                r++;

                // === Items (with borders) ===
                const itemStartRow = r;
                (inv.items || []).forEach((item, idx) => {
                    setCell(r, 0, idx + 1, { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 1, item.productName, { font: normal(10), alignment: alignL, border: border('lr') });
                    setCell(r, 2, '', { font: normal(10), border: border('lr') });
                    setCell(r, 3, `${fmtNum(item.quantity)} ${item.unit || ''}`, { font: normal(10), alignment: alignR, border: border('all') });
                    setCell(r, 4, fmtNum(item.pricePerUnit), { font: normal(10), alignment: alignR, border: border('all') });
                    setCell(r, 5, fmtNum(item.amount), { font: normal(10), alignment: alignR, border: border('all') });
                    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }); // merge product name cols
                    r++;
                });

                // Empty rows to fill table (min 6 rows total)
                const minRows = 6;
                const emptyCount = Math.max(0, minRows - (inv.items || []).length);
                for (let i = 0; i < emptyCount; i++) {
                    for (let c = 0; c <= 5; c++) {
                        setCell(r, c, '', { border: border('all') });
                    }
                    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } });
                    r++;
                }

                // === Totals section ===
                const summaryLabelStyle = { font: normal(10), alignment: alignR, border: border('lr') };
                const summaryValueStyle = { font: normal(10), alignment: alignR, border: border('lr') };
                const summaryBoldLabelStyle = { font: bold(11), alignment: alignR, border: border('all') };
                const summaryBoldValueStyle = { font: bold(11), alignment: alignR, border: border('all') };

                // Notes cell (merged, spans left side)
                const totalRows = 4 + (inv.adjustments?.length || 0) + 1; // subtotal,discount,after-discount,vat,adjustments,grand
                const notesStartRow = r;
                setCell(r, 0, `หมายเหตุ: ${inv.notes || ''}`, { font: normal(9), alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: border('all') });
                // This span will be set via merge below

                // Subtotal
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'รวมเป็นเงิน', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.subtotal), summaryValueStyle);
                r++;

                // Discount
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'หักส่วนลด', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.discount), summaryValueStyle);
                r++;

                // After discount
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'ยอดหลังหักส่วนลด', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.subtotal - (inv.discount || 0)), summaryValueStyle);
                r++;

                // VAT
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, `ภาษีมูลค่าเพิ่ม ${inv.vatRate}%`, summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.vatAmount), summaryValueStyle);
                r++;

                // Adjustments
                (inv.adjustments || []).forEach(adj => {
                    setCell(r, 3, '', { border: border('lr') });
                    setCell(r, 4, adj.label, summaryLabelStyle);
                    setCell(r, 5, fmtNum(adj.amount), summaryValueStyle);
                    r++;
                });

                // Grand total (bold, with bottom border)
                setCell(r, 0, inv.bahtText ? `(${inv.bahtText})` : '', { font: bold(10), border: border('blr') });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); // merge baht text
                setCell(r, 3, '', { border: border('blr') });
                setCell(r, 4, 'จำนวนเงินรวมทั้งสิ้น', summaryBoldLabelStyle);
                setCell(r, 5, fmtNum(inv.grandTotal), summaryBoldValueStyle);

                // Merge notes cell vertically
                merges.push({ s: { r: notesStartRow, c: 0 }, e: { r: r, c: 2 } });

                // Set range
                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: 5 } });

                // Column widths
                ws['!cols'] = [
                    { wch: 8 },   // ลำดับ
                    { wch: 30 },  // รายละเอียด
                    { wch: 14 },  // (merge with col 1)
                    { wch: 18 },  // จำนวน
                    { wch: 16 },  // ราคา/หน่วย
                    { wch: 16 },  // จำนวนเงิน
                ];

                // Row heights
                ws['!rows'] = [];
                // Make the header row a bit taller
                ws['!rows'][headerRow] = { hpt: 22 };

                ws['!merges'] = merges;

                const sheetName = (inv.invoiceNo || 'Sheet').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_Export_${getLocalDateString()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await showAlert(`ส่งออก Excel เรียบร้อย (${fullInvoices.filter(Boolean).length} ใบ)`);
        } catch (error) {
            console.error('Export error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    // Export only a specific month's invoices
    const exportMonthToExcel = async (group, monthInvoices) => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const invoiceIds = monthInvoices.map(inv => inv.id);
            const fullInvoices = [];
            const batchSize = 5;
            for (let i = 0; i < invoiceIds.length; i += batchSize) {
                const batchIds = invoiceIds.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batchIds.map(id => invoiceService.getInvoiceById(id))
                );
                fullInvoices.push(...batchResults);
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

            fullInvoices.filter(Boolean).forEach((inv) => {
                const cust = inv.customer || inv.customerSnapshot || {};
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
                setCell(r, 3, 'ใบกำกับสินค้า / ใบกำกับภาษี', { font: bold(14), alignment: alignC });
                merges.push({ s: { r, c: 3 }, e: { r, c: 5 } }); r++;
                r++;

                setCell(r, 0, 'ลูกค้า', { font: bold(10) });
                setCell(r, 1, cust.code || '', { font: normal(10) });
                setCell(r, 4, 'เลขที่ใบกำกับ', { font: bold(10), alignment: alignR });
                setCell(r, 5, inv.invoiceNo, { font: normal(10) }); r++;
                setCell(r, 1, cust.name || '', { font: bold(11) });
                merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
                setCell(r, 4, 'วันที่', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(inv.date), { font: normal(10) }); r++;
                setCell(r, 0, `เลขประจำตัวผู้เสียภาษี: ${cust.taxId || ''}`, { font: normal(9) });
                setCell(r, 2, `สาขา ${cust.branch || '-'}`, { font: normal(9) });
                setCell(r, 4, 'เครดิต', { font: bold(10), alignment: alignR });
                setCell(r, 5, parseInt(inv.creditDays) === 0 ? 'สด' : `${inv.creditDays} วัน`, { font: normal(10) }); r++;
                setCell(r, 0, cust.address || '', { font: normal(9) });
                merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
                setCell(r, 4, 'ครบกำหนด', { font: bold(10), alignment: alignR });
                setCell(r, 5, fmtDate(inv.dueDate), { font: normal(10) }); r++;
                setCell(r, 0, `TEL: ${cust.phone || ''}`, { font: normal(9) });
                setCell(r, 1, `FAX: ${cust.fax || '-'}`, { font: normal(9) }); r++;
                setCell(r, 0, `อ้างอิง: ${inv.referenceNo || '-'}`, { font: normal(9) }); r++;
                r++;

                const headerRow = r;
                const headerStyle = { font: bold(10), alignment: alignC, border: border('all'), fill: { fgColor: { rgb: 'E8E8E8' } } };
                const headers = ['ลำดับ', 'รหัสสินค้า / รายละเอียด', '', 'จำนวน', 'ราคา / หน่วย', 'จำนวนเงิน'];
                headers.forEach((h, c) => setCell(r, c, h, headerStyle));
                merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }); r++;

                (inv.items || []).forEach((item, idx) => {
                    setCell(r, 0, idx + 1, { font: normal(10), alignment: alignC, border: border('all') });
                    setCell(r, 1, item.productName, { font: normal(10), alignment: alignL, border: border('lr') });
                    setCell(r, 2, '', { font: normal(10), border: border('lr') });
                    setCell(r, 3, `${fmtNum(item.quantity)} ${item.unit || ''}`, { font: normal(10), alignment: alignR, border: border('all') });
                    setCell(r, 4, fmtNum(item.pricePerUnit), { font: normal(10), alignment: alignR, border: border('all') });
                    setCell(r, 5, fmtNum(item.amount), { font: normal(10), alignment: alignR, border: border('all') });
                    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }); r++;
                });

                const emptyCount = Math.max(0, 6 - (inv.items || []).length);
                for (let i = 0; i < emptyCount; i++) {
                    for (let c = 0; c <= 5; c++) setCell(r, c, '', { border: border('all') });
                    merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }); r++;
                }

                const summaryLabelStyle = { font: normal(10), alignment: alignR, border: border('lr') };
                const summaryValueStyle = { font: normal(10), alignment: alignR, border: border('lr') };
                const summaryBoldLabelStyle = { font: bold(11), alignment: alignR, border: border('all') };
                const summaryBoldValueStyle = { font: bold(11), alignment: alignR, border: border('all') };

                const notesStartRow = r;
                setCell(r, 0, `หมายเหตุ: ${inv.notes || ''}`, { font: normal(9), alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: border('all') });
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'รวมเป็นเงิน', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.subtotal), summaryValueStyle); r++;
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'หักส่วนลด', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.discount), summaryValueStyle); r++;
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, 'ยอดหลังหักส่วนลด', summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.subtotal - (inv.discount || 0)), summaryValueStyle); r++;
                setCell(r, 3, '', { border: border('lr') });
                setCell(r, 4, `ภาษีมูลค่าเพิ่ม ${inv.vatRate}%`, summaryLabelStyle);
                setCell(r, 5, fmtNum(inv.vatAmount), summaryValueStyle); r++;
                (inv.adjustments || []).forEach(adj => {
                    setCell(r, 3, '', { border: border('lr') });
                    setCell(r, 4, adj.label, summaryLabelStyle);
                    setCell(r, 5, fmtNum(adj.amount), summaryValueStyle); r++;
                });
                setCell(r, 0, inv.bahtText ? `(${inv.bahtText})` : '', { font: bold(10), border: border('blr') });
                merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
                setCell(r, 3, '', { border: border('blr') });
                setCell(r, 4, 'จำนวนเงินรวมทั้งสิ้น', summaryBoldLabelStyle);
                setCell(r, 5, fmtNum(inv.grandTotal), summaryBoldValueStyle);
                merges.push({ s: { r: notesStartRow, c: 0 }, e: { r: r, c: 2 } });

                ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: 5 } });
                ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
                ws['!rows'] = []; ws['!rows'][headerRow] = { hpt: 22 };
                ws['!merges'] = merges;
                XLSX.utils.book_append_sheet(wb, ws, (inv.invoiceNo || 'Sheet').substring(0, 31));
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoices_Export.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await showAlert(`ส่งออก Excel เรียบร้อย (${fullInvoices.filter(Boolean).length} ใบ)`);
        } catch (error) {
            console.error('Export error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="px-4">
            <PageHeader
                title="รายการใบกำกับภาษี (Invoices)"
                helpContent={HELP_CONTENT.invoices}
            >
                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel px-4 py-2.5 text-emerald-500 rounded-lg font-medium text-sm flex items-center gap-2" style={{ background: 'white', border: '1px solid #e2e8f0', cursor: isExporting ? 'not-allowed' : 'pointer' }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'Exporting...' : 'Export All'}
                    </button>
                    {hasPermission('invoices', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/invoices/new')}
                            className="px-5 py-2.5 border-none text-white cursor-pointer rounded-lg font-semibold flex items-center gap-2" style={{ background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                        >
                            <Plus size={20} /> ออกใบกำกับภาษี
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div className="rounded-xl text-emerald-500" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem' }}><FileText size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">จำนวนใบกำกับภาษีเดือนนี้</div>
                        <div className="text-xl font-bold text-emerald-500">{kpis.monthCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div className="rounded-xl text-amber-500" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.7rem' }}><Clock size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">รอเก็บเงิน</div>
                        <div className="text-xl font-bold text-amber-500">{kpis.pendingCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div className="rounded-xl text-emerald-500" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem' }}><CheckCircle size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">เก็บเงินแล้ว</div>
                        <div className="text-xl font-bold text-emerald-500">{kpis.paidCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel flex items-center gap-4" style={{ padding: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div className="rounded-xl text-blue-500" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem' }}><TrendingUp size={20} /></div>
                    <div>
                        <div className="text-xs text-textMuted">ใบกำกับภาษีสะสม</div>
                        <div className="text-xl font-bold text-blue-500">{kpis.totalCount} ใบ</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 mb-6 border border-border flex items-center gap-4" style={{ background: 'var(--card-bg)' }}>
                <Search size={20} className="text-textMuted" />
                <input
                    type="text"
                    placeholder="ค้นตามเลขที่หรือชื่อลูกค้า..."
                    className="bg-transparent border-none text-main w-full" style={{ fontSize: '1rem', outline: 'none' }}
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
                        options: [
                            { value: 'date', label: 'วันที่ออกบิล' },
                            { value: 'dueDate', label: 'วันครบกำหนด' }
                        ]
                    }
                ]}
                onClear={clearFilters}
                hasActiveFilters={!!hasActiveFilters}
            />

            <div className="glass-panel overflow-x-auto" style={{ padding: '0' }}>
                <div className="table-responsive-wrapper overflow-x-auto touch-pan-x">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="actions-column text-textMuted font-medium">จัดการ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">เลขที่ใบกำกับ</th>
                                <th className="px-6 py-5 text-textMuted font-medium">ชื่อลูกค้า</th>
                                <th className="px-6 py-5 text-textMuted font-medium">อ้างอิง(PO)</th>
                                <th className="px-6 py-5 text-textMuted font-medium">วันที่</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-right">จำนวนเงินสุทธิ</th>
                                <th className="px-6 py-5 text-textMuted font-medium text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-textMuted">
                                        <div className="loading-spinner mx-auto mb-4"></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((inv) => (
                                    <tr key={inv.id} className="border-b border-border" style={{ transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                        <td className="actions-column">
                                            <div className="table-actions">
                                                <Link
                                                    className="action-view"
                                                    to={`/dashboard/invoices/${inv.id}`}
                                                    target="_blank"
                                                    title="View"
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                <Link
                                                    className="action-print"
                                                    to={`/dashboard/invoices/${inv.id}/print`}
                                                    target="_blank"
                                                    title="Print"
                                                >
                                                    <Printer size={18} />
                                                </Link>
                                                {hasPermission('billing', 'create') && (
                                                    <button
                                                        className="action-link"
                                                        onClick={() => navigate('/dashboard/billing-notes/new', { state: { preselectInvoice: inv } })}
                                                        title="ออกใบวางบิล"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('invoices', 'edit') && (
                                                    <button
                                                        className="action-edit"
                                                        onClick={() => navigate(`/dashboard/invoices/${inv.id}/edit`)}
                                                        title="Edit"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {hasPermission('invoices', 'delete') && (
                                                    <button
                                                        className="action-delete"
                                                        onClick={() => handleDelete(inv.id, inv.invoiceNo)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-semibold text-blue-500 text-lg font-mono">
                                            <Link to={`/dashboard/invoices/${inv.id}`} className="text-blue-500 no-underline">
                                                {inv.invoiceNo}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-5">
                                            {inv.customer_id ? (
                                                <Link
                                                    to={`/dashboard/customers/${inv.customer_id}`}
                                                    className="text-blue-500 no-underline"
                                                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {inv.customerName}
                                                </Link>
                                            ) : (
                                                inv.customerName
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-textMuted">{inv.referenceNo || '-'}</td>
                                        <td className="px-6 py-5">{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                        <td className="px-6 py-5 text-right font-semibold text-emerald-500">
                                            ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="rounded-full text-xs font-semibold" style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', background: inv.status === 'Draft' ? '#f3f4f6' : (inv.status === 'Sent' || inv.status === 'Pending') ? 'rgba(245, 158, 11, 0.08)' : inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.08)' : inv.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(107, 114, 128, 0.08)', color: inv.status === 'Draft' ? '#6b7280' : (inv.status === 'Sent' || inv.status === 'Pending') ? '#d97706' : inv.status === 'Paid' ? '#059669' : inv.status === 'Cancelled' ? '#dc2626' : '#4b5563', border: inv.status === 'Draft' ? '1px solid #e5e7eb' : (inv.status === 'Sent' || inv.status === 'Pending') ? '1px solid rgba(245, 158, 11, 0.2)' : inv.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.2)' : inv.status === 'Cancelled' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #e5e7eb' }}>
                                                {inv.status === 'Draft' && <Clock size={14} />}
                                                {inv.status === 'Paid' && <CheckCircle size={14} />}
                                                {(inv.status === 'Sent' || inv.status === 'Pending') && <AlertCircle size={14} />}
                                                {inv.status === 'Cancelled' && <XCircle size={14} />}
                                                {inv.status === 'Draft' ? 'แบบร่าง (Draft)' :
                                                    (inv.status === 'Sent' || inv.status === 'Pending') ? 'ใบวางบิล (Sent)' :
                                                        inv.status === 'Paid' ? 'ชำระเงินแล้ว (Paid)' :
                                                            inv.status === 'Cancelled' ? 'ยกเลิก (Cancelled)' : inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-textMuted">ไม่พบรายการใบกำกับภาษี</td>
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

export default InvoiceListPage;
