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

const InvoiceListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert, showError } = useDialog();
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dateFilterType, setDateFilterType] = useState('date');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        setIsLoading(true);
        const data = await invoiceService.getInvoices();
        setInvoices(data || []);
        setIsLoading(false);
    };

    const handleDelete = async (id, invoiceNo) => {
        const confirmed = await showConfirm(`ต้องการลบใบกำกับภาษีเลขที่ ${invoiceNo} หรือไม่?`);
        if (confirmed) {
            const success = await invoiceService.deleteInvoice(id);
            if (success) {
                setInvoices(invoices.filter(inv => inv.id !== id));
            } else {
                await showError(error.message || 'ไม่สามารถลบใบกำกับภาษีได้');
            }
        }
    };

    const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const company = await companyService.getCompanyInfo();
            const invoiceIds = filteredInvoices.map(inv => inv.id);
            const fullInvoices = await Promise.all(
                invoiceIds.map(id => invoiceService.getInvoiceById(id))
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
            a.download = `Invoice_${group.replace(/ /g, '_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            await showAlert(`ส่งออก Excel เดือน${group} เรียบร้อย (${fullInvoices.filter(Boolean).length} ใบ)`);
        } catch (error) {
            console.error('Export month error:', error);
            await showError('ไม่สามารถส่งออก Excel ได้: ' + (error.message || ''));
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = dateFrom || dateTo;
    const clearFilters = () => { setDateFrom(''); setDateTo(''); setDateFilterType('date'); };

    const filteredInvoices = invoices.filter(inv => {
        const matchSearch = inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        const targetDate = dateFilterType === 'dueDate' ? inv.dueDate : inv.date;
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

    const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
        const group = getMonthYear(inv.date);
        if (!acc[group]) acc[group] = [];
        acc[group].push(inv);
        return acc;
    }, {});

    const monthYearGroups = Object.keys(groupedInvoices).sort((a, b) => {
        const dateA = Math.max(...groupedInvoices[a].map(inv => new Date(inv.date).getTime()));
        const dateB = Math.max(...groupedInvoices[b].map(inv => new Date(inv.date).getTime()));
        return dateB - dateA;
    });

    // KPI Calculations
    const kpis = React.useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const monthCount = monthlyInvoices.length;
        const pendingCount = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled').length;
        const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
        const totalCount = invoices.filter(inv => inv.status !== 'Cancelled').length;

        return { monthCount, pendingCount, paidCount, totalCount };
    }, [invoices]);

    return (
        <div style={{ padding: '0 1rem' }}>
            <PageHeader
                title="รายการใบกำกับภาษี (Invoices)"
                helpContent={HELP_CONTENT.invoices}
            >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="glass-panel"
                        style={{
                            padding: '0.6rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            color: 'var(--success)',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                        }}
                    >
                        <FileSpreadsheet size={18} /> {isExporting ? 'Exporting...' : 'Export All'}
                    </button>
                    {hasPermission('invoices', 'create') && (
                        <button
                            onClick={() => navigate('/dashboard/invoices/new')}
                            style={{
                                padding: '0.6rem 1.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: '#3b82f6',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                            }}
                        >
                            <Plus size={20} /> ออกใบกำกับภาษี
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><FileText size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>จำนวนใบกำกับภาษีเดือนนี้</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.monthCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'rgba(245, 158, 11, 0.02)' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#f59e0b' }}><Clock size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รอเก็บเงิน</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b' }}>{kpis.pendingCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.02)' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#10b981' }}><CheckCircle size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>เก็บเงินแล้ว</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{kpis.paidCount} ใบ</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'rgba(59, 130, 246, 0.02)' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.7rem', borderRadius: '10px', color: '#3b82f6' }}><TrendingUp size={20} /></div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ใบกำกับภาษีสะสม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6' }}>{kpis.totalCount} ใบ</div>
                    </div>
                </div>
            </div>

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
                        options: [
                            { value: 'date', label: 'วันที่ออกบิล' },
                            { value: 'dueDate', label: 'วันครบกำหนด' }
                        ]
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
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>เลขที่ใบกำกับ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ชื่อลูกค้า</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>อ้างอิง(PO)</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>วันที่</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>จำนวนเงินสุทธิ</th>
                                <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : filteredInvoices.length > 0 ? (
                                monthYearGroups.map((group) => (
                                    <React.Fragment key={group}>
                                        <tr style={{ background: 'rgba(59, 130, 246, 0.02)' }}>
                                            <td colSpan="8" style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#37477C', borderBottom: '1px solid var(--border-color)', borderTop: 'none', fontSize: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Calendar size={18} color="#3b82f6" />
                                                        <span>{group}</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{groupedInvoices[group].length} รายการ</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); exportMonthToExcel(group, groupedInvoices[group]); }}
                                                        disabled={isExporting}
                                                        title={`Export Excel เดือน${group}`}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                            padding: '0.4rem 0.8rem', borderRadius: '6px',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                                            background: 'white',
                                                            color: 'var(--success)', cursor: isExporting ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.8rem', fontWeight: '600',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                                                    >
                                                        <FileSpreadsheet size={14} /> ส่งออก Excel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {groupedInvoices[group].map((inv) => (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', background: 'var(--card-bg)' }}>
                                                <td className="actions-column">
                                                    <div className="table-actions">
                                                        <button
                                                            className="action-view"
                                                            onClick={() => window.open(`/dashboard/invoices/${inv.id}`, '_blank')}
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            className="action-print"
                                                            onClick={() => window.open(`/dashboard/invoices/${inv.id}/print`, '_blank')}
                                                            title="Print"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
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
                                                <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600', color: '#3b82f6', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                                                    <Link to={`/dashboard/invoices/${inv.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                        {inv.invoiceNo}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '1.2rem 1.5rem' }}>{inv.customerName}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)' }}>{inv.referenceNo || '-'}</td>
                                                <td style={{ padding: '1.2rem 1.5rem' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                                                    ฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                        background: inv.status === 'Draft' ? '#f3f4f6' :
                                                            (inv.status === 'Sent' || inv.status === 'Pending') ? 'rgba(245, 158, 11, 0.08)' :
                                                                inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.08)' :
                                                                    inv.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(107, 114, 128, 0.08)',
                                                        color: inv.status === 'Draft' ? '#6b7280' :
                                                            (inv.status === 'Sent' || inv.status === 'Pending') ? '#d97706' :
                                                                inv.status === 'Paid' ? '#059669' :
                                                                    inv.status === 'Cancelled' ? '#dc2626' : '#4b5563',
                                                        border: inv.status === 'Draft' ? '1px solid #e5e7eb' :
                                                            (inv.status === 'Sent' || inv.status === 'Pending') ? '1px solid rgba(245, 158, 11, 0.2)' :
                                                                inv.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.2)' :
                                                                    inv.status === 'Cancelled' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #e5e7eb'
                                                    }}>
                                                        {inv.status === 'Draft' && <Clock size={14} />}
                                                        {inv.status === 'Paid' && <CheckCircle size={14} />}
                                                        {(inv.status === 'Sent' || inv.status === 'Pending') && <AlertCircle size={14} />}
                                                        {inv.status === 'Cancelled' && <XCircle size={14} />}
                                                        {inv.status === 'Draft' ? 'แบบร่าง' :
                                                            (inv.status === 'Sent' || inv.status === 'Pending') ? 'ส่งแล้ว' :
                                                                inv.status === 'Paid' ? 'จ่ายแล้ว' :
                                                                    inv.status === 'Cancelled' ? 'ยกเลิก' : inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบรายการใบกำกับภาษี</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoiceListPage;
