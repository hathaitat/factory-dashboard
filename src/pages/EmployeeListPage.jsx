import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, User, Clock, CheckCircle, XCircle, MoreVertical, ChevronRight, ArrowLeft, Upload, FileSpreadsheet, FileText } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { usePermissions } from '../hooks/usePermissions';
import LogTimeModal from '../components/LogTimeModal';
import PeriodDetailModal from '../components/PeriodDetailModal';
import ImportPreviewModal from '../components/ImportPreviewModal';
import FullTimesheetModal from '../components/FullTimesheetModal';
import AddPeriodModal from '../components/AddPeriodModal';
import * as XLSX from 'xlsx';
import { useDialog } from '../contexts/DialogContext';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

import { settingService } from '../services/settingService';
import { periodService } from '../services/periodService';

const EmployeeListPage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { showConfirm, showAlert } = useDialog();
    const fileInputRef = useRef(null);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // View Mode: 'info' | 'timesheet'
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState(searchParams.get('mode') || 'timesheet');

    // Period Selection State
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [periodLogs, setPeriodLogs] = useState([]); // Store all logs for the period
    const [periodStats, setPeriodStats] = useState({}); // Map employeeId -> Stats
    const [diligenceOverrides, setDiligenceOverrides] = useState({}); // Map employeeId -> boolean | null
    const [workSchedule, setWorkSchedule] = useState(null); // { start_time, end_time }

    // Import Modal State
    const [importModal, setImportModal] = useState({
        isOpen: false,
        data: null,
        status: 'preview', // preview, processing, success, error
        message: ''
    });

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetailLogs, setSelectedDetailLogs] = useState([]);
    const [isFullTimesheetOpen, setIsFullTimesheetOpen] = useState(false);
    const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);

    useEffect(() => {
        loadEmployees();
        loadPeriods();
        loadSettings();
    }, []);

    const loadPeriods = async () => {
        const data = await periodService.getPeriods();
        // Map to camelCase for component usage
        const mappedData = data.map(p => ({
            ...p,
            startDate: p.start_date,
            endDate: p.end_date
        }));
        setPeriods(mappedData);
    };

    const loadSettings = async () => {
        const schedule = await settingService.getSetting('work_schedule');
        if (schedule) {
            setWorkSchedule(schedule);
        }
    };

    useEffect(() => {
        if (selectedPeriod) {
            loadPeriodData();
        }
    }, [selectedPeriod]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredEmployees(employees);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = employees.filter(emp =>
                emp.full_name.toLowerCase().includes(lowerTerm) ||
                emp.code.toLowerCase().includes(lowerTerm) ||
                (emp.phone && emp.phone.includes(searchTerm))
            );
            setFilteredEmployees(filtered);
        }
    }, [searchTerm, employees]);

    const loadEmployees = async () => {
        setIsLoading(true);
        const data = await employeeService.getEmployees();
        setEmployees(data);
        setFilteredEmployees(data);
        setIsLoading(false);
    };

    const loadPeriodData = async () => {
        if (!selectedPeriod) return;
        setIsLoading(true);
        const logs = await employeeService.getWorkLogsByPeriod(selectedPeriod.startDate, selectedPeriod.endDate);
        const overridesList = await employeeService.getDiligenceOverrides(selectedPeriod.id);

        // Convert overrides to map: { empId: { isForced, amount } }
        const overridesMap = {};
        overridesList.forEach(o => {
            overridesMap[o.employee_id] = {
                isForced: o.is_diligence_forced,
                amount: o.diligence_override_amount
            };
        });
        setDiligenceOverrides(overridesMap);

        setPeriodLogs(logs);

        // Calculate Stats
        const stats = {};
        const periodStart = new Date(selectedPeriod.startDate);
        const periodEnd = new Date(selectedPeriod.endDate);
        const daysInPeriod = [];
        for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
            daysInPeriod.push(new Date(d));
        }

        employees.forEach(emp => {
            const empLogs = logs.filter(l => l.employee_id === emp.id);
            const totalDays = empLogs.reduce((sum, l) => sum + Number(l.work_days), 0);
            const totalOT = empLogs.reduce((sum, l) => sum + Number(l.ot_hours), 0);
            const totalLate = empLogs.reduce((sum, l) => sum + (Number(l.late_hours) || 0), 0);

            // Calculate Absent Days
            let absentDays = 0;
            daysInPeriod.forEach(date => {
                const dateStr = date.toISOString().split('T')[0];
                const isSunday = date.getDay() === 0;

                // Sunday is never counted as absent (even if log exists as absent)
                if (isSunday) return;

                const dailyLog = empLogs.find(l => l.work_date.split('T')[0] === dateStr);

                if (!dailyLog) {
                    // No log: Count as absent (since not Sunday)
                    absentDays++;
                } else {
                    // Log exists: Check if it's an "Absent" log (work_days = 0)
                    if (Number(dailyLog.work_days) === 0) {
                        absentDays++;
                    }
                }
            });

            stats[emp.id] = {
                workDays: totalDays,
                lateHours: totalLate,
                otHours: totalOT,
                absentDays: absentDays,
                diligence: (() => {
                    const override = overridesMap[emp.id];

                    // If manual amount is set, use it (regardless of forced flag, though usually forced=true if amount exists)
                    if (override && override.amount !== null && override.amount !== undefined) {
                        return Number(override.amount);
                    }

                    // Fallback to legacy forced flag if amount is missing but forced is true
                    if (override && override.isForced === true) return (Number(emp.diligence_allowance) || 0);
                    if (override && override.isForced === false) return 0;

                    // Auto Calculation
                    // Logic: Must have 0 absent days and 0 late hours
                    // Note: We don't have per-employee diligence setting anymore in form, so defaulting to 500 or 0?
                    // User removed input, but maybe data still exists or we should use a default?
                    // Let's assume 500 as default if not set, or 0.
                    // Actually, if they removed the input, how do we know the base rate?
                    // We should probably rely on the existing data in DB or ask user.
                    // For now, I'll keep using `emp.diligence_allowance` (which might be in DB even if hidden in form).

                    return (absentDays === 0 && totalLate === 0) ? (Number(emp.diligence_allowance) || 0) : 0;
                })()
            };
        });
        setPeriodStats(stats);
        setIsLoading(false);
    };

    const handleSelectPeriod = (period) => {
        setSelectedPeriod(period);
        // useEffect will trigger loadPeriodData
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset value immediately
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const arrayBuffer = evt.target.result;
                const wb = XLSX.read(arrayBuffer, { type: 'array' });

                let allLogs = [];
                let allMissing = [];

                // Loop through ALL sheets
                for (const wsname of wb.SheetNames) {
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    if (!data || data.length === 0) continue;

                    // Detect Format per sheet
                    const headerRow = data[0];
                    const isSimpleFormat = headerRow && (
                        (headerRow.includes('Code') || headerRow.includes('รหัส')) &&
                        (headerRow.includes('Date') || headerRow.includes('วันที่'))
                    );

                    // Helper to run parser with current employees state
                    const runParser = (currentEmployees) => {
                        if (isSimpleFormat) {
                            return parseSimpleFormat(data, currentEmployees);
                        } else {
                            return parseStandardReportFormat(data, currentEmployees, workSchedule);
                        }
                    };

                    const result = runParser(employees);

                    // VALIDATION: Check if Excel date matches selected period month/year
                    if (selectedPeriod && result.headerStartDate) {
                        const fileDate = result.headerStartDate;
                        const periodDate = new Date(selectedPeriod.startDate);

                        if (fileDate.getMonth() !== periodDate.getMonth() ||
                            fileDate.getFullYear() !== periodDate.getFullYear()) {

                            const fileMonth = fileDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
                            const periodMonth = periodDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

                            const confirmMsg = `⚠️ คำเตือน: งวดที่เลือกคือเดือน "${periodMonth}" แต่ข้อมูลในไฟล์ดูเหมือนจะเป็นของเดือน "${fileMonth}"\n\nคุณแน่ใจหรือไม่ว่าต้องการนำเข้าข้อมูลนี้?`;
                            const confirmed = await showConfirm(confirmMsg);
                            if (!confirmed) {
                                return;
                            }
                        }
                    }

                    allLogs = [...allLogs, ...result.logs];
                    allMissing = [...allMissing, ...result.missing];
                }

                if (allLogs.length === 0 && allMissing.length === 0) {
                    await showAlert('ไม่พบข้อมูลในไฟล์ (หรือรูปแบบไม่ถูกต้อง)');
                    return;
                }

                // Show Preview Modal instead of Alert
                setImportModal({
                    isOpen: true,
                    data: { logs: allLogs, missing: allMissing },
                    status: 'preview',
                    message: ''
                });

            } catch (error) {
                console.error('Import Error:', error);
                await showAlert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleClearData = async () => {
        if (!selectedPeriod) return;

        const confirmMsg = `คุณต้องการลบข้อมูลเวลาทั้งหมดของงวด "${selectedPeriod.label}" ใช่หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!`;
        const confirmed = await showConfirm(confirmMsg);
        if (confirmed) {
            setIsLoading(true);
            try {
                const success = await employeeService.deleteWorkLogsByPeriod(selectedPeriod.startDate, selectedPeriod.endDate);
                if (success) {
                    await showAlert('ลบข้อมูลเรียบร้อยแล้ว');
                    loadPeriodData(); // Refresh data
                } else {
                    await showAlert('เกิดข้อผิดพลาดในการลบข้อมูล');
                }
            } catch (error) {
                console.error(error);
                await showAlert('เกิดข้อผิดพลาด: ' + error.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const finalizeImport = async (modifiedLogs) => {
        if (!importModal.data) return;

        // Determine which logs to use (modified or original)
        let finalLogs = importModal.data.logs;
        if (Array.isArray(modifiedLogs)) {
            finalLogs = modifiedLogs;
        }

        setImportModal(prev => ({ ...prev, status: 'processing' }));

        const { missing } = importModal.data;
        let successCount = 0;
        let addedCount = 0;

        try {
            // 1. Handle New Employees (Create if missing)
            // Note: We check `missing` from original data. 
            // If user added *more* logs for *other* new employees in the editor... 
            // (Editor doesn't allow adding logs for people not in the list currently).

            if (missing && missing.length > 0) {
                const uniqueMissing = Array.from(new Map(missing.map(item => [item.code, item])).values());
                for (const m of uniqueMissing) {
                    // Check existence first to strictly avoid duplicates if multiple clicks
                    const { data: existing } = await employeeService.getByCode(m.code);
                    if (!existing) {
                        await employeeService.createEmployee({
                            code: m.code,
                            full_name: m.name || `พนักงานใหม่ ${m.code}`,
                            position: 'พนักงานทั่วไป',
                            daily_wage: 350,
                            status: 'Active'
                        });
                        addedCount++;
                    }
                }
            }

            // 2. Refresh Employees Map to resolve IDs
            // (Crucial if we just added employees or if logs lack IDs)
            let empMap = new Map(employees.map(e => [e.code, e.id]));
            if (addedCount > 0) {
                const updatedEmps = await employeeService.getEmployees();
                setEmployees(updatedEmps);
                empMap = new Map(updatedEmps.map(e => [e.code, e.id]));
            }

            // 3. Import Logs
            for (const log of finalLogs) {
                // Resolve Employee ID
                let empId = log.employee_id;
                if (!empId) {
                    empId = empMap.get(log.employee_code);
                }

                if (!empId) {
                    console.warn(`Skipping log for unknown employee: ${log.employee_code}`);
                    continue;
                }

                // Construct DB Log
                // Remove helper fields and ensure correct types
                const dbLog = {
                    employee_id: empId,
                    work_date: log.work_date,
                    start_time: log.start_time,
                    end_time: log.end_time,
                    work_days: Number(log.work_days),
                    ot_hours: Number(log.ot_hours),
                    late_hours: Number(log.late_hours || 0),
                    // Check if there are other fields?
                };

                await employeeService.upsertWorkLog(dbLog);
                successCount++;
            }

            // 4. Refresh Data
            loadPeriodData();

            setImportModal(prev => ({
                ...prev,
                status: 'success',
                message: `นำเข้าข้อมูลเวลาสำเร็จ ${successCount} รายการ${addedCount > 0 ? ` และเพิ่มพนักงานใหม่ ${addedCount} คน` : ''}`
            }));

        } catch (error) {
            console.error(error);
            setImportModal(prev => ({
                ...prev,
                status: 'error',
                message: error.message
            }));
        }
    };

    const parseSimpleFormat = (data, employeesList) => {
        // Find column indices
        const header = data[0];
        const colMap = {};
        header.forEach((col, index) => {
            if (typeof col !== 'string') return;
            const c = col.trim().toLowerCase();
            if (['code', 'รหัส'].includes(c)) colMap.code = index;
            if (['name', 'ชื่อ', 'ชิ่อ'].includes(c)) colMap.name = index; // Add Name support for simple format too
            if (['date', 'วันที่'].includes(c)) colMap.date = index;
            if (['in', 'เข้า'].includes(c)) colMap.in = index;
            if (['out', 'ออก'].includes(c)) colMap.out = index;
            if (['ot', 'โอที'].includes(c)) colMap.ot = index;
            if (['late', 'สาย'].includes(c)) colMap.late = index;
        });

        if (colMap.code === undefined || colMap.date === undefined) {
            // Return empty logic for safety if format sort of matches but not quite? 
            // Or throw? throwing stops other sheets. 
            // Let's return empty.
            return { logs: [], missing: [] };
        }

        const logs = [];
        const missing = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const code = row[colMap.code];
            if (!code) continue;

            // Find Employee
            const emp = employeesList.find(e => String(e.code) === String(code));

            if (!emp) {
                const name = colMap.name !== undefined ? row[colMap.name] : null;
                missing.push({ code: String(code), name: name });
                continue;
            }

            const dateVal = row[colMap.date];
            const workDate = parseExcelDate(dateVal);
            if (!workDate) continue;

            console.log(`[Simple] Emp: ${emp.code} (${emp.full_name}) | Date: ${workDate} | Time: ${formatTime(row[colMap.in])} - ${formatTime(row[colMap.out])}`);

            logs.push({
                employee_id: emp.id,
                work_date: workDate,
                start_time: formatTime(row[colMap.in]),
                end_time: formatTime(row[colMap.out]),
                work_days: 1,
                ot_hours: parseFloat(row[colMap.ot] || 0),
                late_hours: parseFloat(row[colMap.late] || 0)
            });
        }
        return { logs, missing };
    };

    const parseStandardReportFormat = (data, employeesList, workSchedule) => {
        const logs = [];
        const missing = []; // Array of { code, name }
        let periodStartDate = null;
        let periodEndDate = null;

        // Parse Schedule if exists
        let scheduleStartMins = null;
        let scheduleEndMins = null;
        if (workSchedule) {
            const [sh, sm] = workSchedule.start_time.split(':').map(Number);
            scheduleStartMins = sh * 60 + sm;
            const [eh, em] = workSchedule.end_time.split(':').map(Number);
            scheduleEndMins = eh * 60 + em;
        }

        // 1. Detect Header Date Range
        if (data.length > 0) {
            for (let i = 0; i < Math.min(5, data.length); i++) {
                const rowStr = (data[i] || []).join(' ').toLowerCase();
                const rangeMatch = rowStr.match(/(\d{4}-\d{2}-\d{2})\s*[~-]\s*(\d{4}-\d{2}-\d{2})/);
                if (rangeMatch) {
                    periodStartDate = new Date(rangeMatch[1]);
                    periodEndDate = new Date(rangeMatch[2]);
                    break;
                }
            }
        }

        if (!periodStartDate) {
            // alert('ไม่พบวันที่เริ่มต้นของงวด (รูปแบบ YYYY-MM-DD)'); 
            // Don't alert here, might be a random sheet.
            return { logs: [], missing: [] };
        }

        // 2. Map Employees
        const employeeMap = {};
        let codeRowIndex = -1;

        for (let r = 0; r < Math.min(10, data.length); r++) {
            const rowStr = (data[r] || []).join(' ').toLowerCase();
            if (rowStr.includes('รหัส') || rowStr.includes('code')) {
                codeRowIndex = r;
                break;
            }
        }

        if (codeRowIndex === -1) {
            return { logs: [], missing: [] };
        }

        const codeRow = data[codeRowIndex];
        // Usually Name is in the same row? Or Row above/below? 
        // In the screenshot: "ชื่อ .... รหัส ..." are in the same header block row?
        // Actually usually standard report has "Code: xxx Name: yyy" in a header block above data.
        // BUT the provided screenshot shows a horizontal layout with blocks. 
        // Let's assume Code and Name are in `codeRow` or `codeRow-1`.

        // Strategy: Scan `codeRow` for "Code" and look for "Name" nearby.

        const BLOCK_SIZE = 15; // Approximate block width based on columns

        for (let c = 0; c < codeRow.length; c++) {
            const cell = String(codeRow[c] || '').trim().toLowerCase();

            // Found a Code Label
            if (cell === 'รหัส' || cell === 'code') {
                const codeVal = codeRow[c + 1];
                if (codeVal) {
                    // Try to find Name in the same block
                    // Look in same row or previous row for "Name"/"ชื่อ"
                    let nameVal = null;

                    // define block range
                    const blockStart = Math.floor(c / BLOCK_SIZE) * BLOCK_SIZE;
                    const blockEnd = blockStart + BLOCK_SIZE;

                    // Search in codeRow AND Previous Row
                    // Check Previous Row first (as per screenshot)
                    if (codeRowIndex > 0) {
                        const prevRow = data[codeRowIndex - 1];
                        if (prevRow) {
                            for (let k = blockStart; k < blockEnd; k++) {
                                const searchCell = String(prevRow[k] || '').trim().toLowerCase();
                                if (searchCell === 'ชื่อ' || searchCell === 'name') {
                                    nameVal = prevRow[k + 1];
                                    break;
                                }
                            }
                        }
                    }

                    // If not found, check same row
                    if (!nameVal) {
                        for (let k = blockStart; k < blockEnd; k++) {
                            const searchCell = String(codeRow[k] || '').trim().toLowerCase();
                            if (searchCell === 'ชื่อ' || searchCell === 'name') {
                                nameVal = codeRow[k + 1];
                                break;
                            }
                        }
                    }

                    const emp = employeesList.find(e => String(e.code) === String(codeVal));
                    if (emp) {
                        if (!employeeMap[blockStart]) {
                            employeeMap[blockStart] = emp;
                        }
                    } else {
                        missing.push({
                            code: String(codeVal),
                            name: nameVal ? String(nameVal).trim() : null
                        });
                    }
                }
            }
        }

        // 3. Scan Data Rows
        let dataHeaderRowIndex = -1;
        for (let r = codeRowIndex + 1; r < data.length; r++) {
            const row = data[r] || [];
            if (String(row[0]).includes('วันที่') || String(row[0]).toLowerCase().includes('date')) {
                dataHeaderRowIndex = r;
                break;
            }
        }

        if (dataHeaderRowIndex === -1) {
            return { logs: [], missing };
        }

        const dataStartIndex = dataHeaderRowIndex + 2;

        for (let r = dataStartIndex; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue;

            const firstCell = String(row[0] || '').trim();
            if (!firstCell || !firstCell.match(/^\d{1,2}/)) continue;

            Object.entries(employeeMap).forEach(([blockStartStr, emp]) => {
                const blockStart = parseInt(blockStartStr);
                const dateCell = row[blockStart + 0];
                if (!dateCell) return;

                // Parse Date Logic
                let workDate = null;
                const dayMatch = String(dateCell).match(/^(\d{1,2})/);
                if (dayMatch) {
                    const day = parseInt(dayMatch[1]);
                    let candidate = new Date(periodStartDate);
                    candidate.setDate(day);
                    if (day < periodStartDate.getDate()) {
                        candidate.setMonth(candidate.getMonth() + 1);
                    }
                    workDate = candidate.toISOString().split('T')[0];
                }

                if (!workDate) return;

                const getVal = (offset) => row[blockStart + offset];
                const cleanTime = (val) => {
                    if (!val) return null;
                    const s = formatTime(val);
                    if (!s || s === '00:00') return null;
                    // Validate structure H:MM or HH:MM to avoid text like "ขาด"
                    if (!String(s).match(/^\d{1,2}:\d{2}$/)) return null;
                    return s;
                };

                // Collect ALL potential time columns
                const rawTimes = [
                    getVal(1), getVal(3), // Morning
                    getVal(6), getVal(8), // Afternoon
                    getVal(10), getVal(12) // OT
                ];

                const validTimes = rawTimes
                    .map(cleanTime)
                    .filter(t => t)
                    .sort();

                const startTime = validTimes.length > 0 ? validTimes[0] : null;
                const endTime = validTimes.length > 0 ? validTimes[validTimes.length - 1] : null;

                // OT Calculation (keep existing logic: only if explicit OT pair exists)
                // However, user might want OT calculated from total hours? 
                // For now, let's stick to the column-based OT to be safe, or 0 if not paired.
                let otHours = 0;
                const otIn = cleanTime(getVal(10));
                const otOut = cleanTime(getVal(12));

                if (otIn && otOut) {
                    const parseH = (t) => {
                        const [h, m] = t.split(':').map(Number);
                        return h + m / 60;
                    };
                    const startH = parseH(otIn);
                    const endH = parseH(otOut);
                    otHours = endH - startH;
                    if (otHours < 0) otHours += 24;
                }

                // Check for "Absent" text in relevant columns for this block
                const blockCells = [
                    getVal(0), getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), // Check wider range
                    getVal(6), getVal(7), getVal(8), getVal(9), getVal(10)
                ];
                const isExplicitAbsent = blockCells.some(cell => String(cell).includes('ขาด'));

                if (startTime || endTime || otHours > 0) {
                    // Late & Early Calculation
                    let isLate = false;
                    let isEarly = false;
                    let lateHours = 0;

                    if (startTime && scheduleStartMins !== null) {
                        const [h, m] = startTime.split(':').map(Number);
                        const actualMins = h * 60 + m;
                        const lateMins = actualMins - scheduleStartMins;

                        if (lateMins > 0) {
                            isLate = true;
                            const threshold = Number(workSchedule?.late_threshold || 0);
                            const penalty = Number(workSchedule?.late_penalty_mins || 0);

                            if (threshold > 0 && lateMins > threshold) {
                                lateHours = penalty / 60;
                            } else {
                                lateHours = lateMins / 60;
                            }
                        }
                    }

                    if (endTime && scheduleEndMins !== null) {
                        const [h, m] = endTime.split(':').map(Number);
                        const actualMins = h * 60 + m;
                        // Only count early leave if work_days is full?
                        // Assuming full day work:
                        if (actualMins < scheduleEndMins) {
                            isEarly = true;
                        }
                    }

                    // 8 hours = 480 minutes
                    const STANDARD_DAY_MINS = 480;
                    let lossMins = 0;

                    if (isLate) {
                        const [h, m] = startTime.split(':').map(Number);
                        lossMins += (h * 60 + m) - scheduleStartMins;
                    }
                    if (isEarly) {
                        const [h, m] = endTime.split(':').map(Number);
                        lossMins += scheduleEndMins - (h * 60 + m);
                    }

                    let workDays = 1.0;
                    if (!startTime || !endTime || startTime === endTime) {
                        // Incomplete day (missing in or out)
                        // Do NOT set to 0, otherwise it shows as Absent.
                        // Set to 0.5 or calculate based on what we have?
                        // For now, force at least 0.1 to indicate "Present but incomplete"
                        workDays = 0.5;

                        // If we have strict deduction, we might want to deduct loss. 
                        // But let's ensure it doesn't drop to 0 unless explicit absent.
                        const calculatedDays = Math.max(0, 0.5 - (lossMins / STANDARD_DAY_MINS));
                        workDays = Math.max(0.1, calculatedDays); // Ensure > 0
                    } else {
                        workDays = Math.max(0, (STANDARD_DAY_MINS - lossMins) / STANDARD_DAY_MINS);
                    }

                    console.log(`[Standard] Emp: ${emp.code} (${emp.full_name}) | Date: ${workDate} | Time: ${startTime} - ${endTime} | OT: ${otHours} | Late: ${isLate} | WorkDays: ${workDays}`);
                    logs.push({
                        employee_id: emp.id,
                        employee_code: emp.code,
                        employee_name: emp.full_name,
                        work_date: workDate,
                        start_time: startTime,
                        end_time: (startTime === endTime) ? null : endTime,
                        work_days: parseFloat(workDays.toFixed(2)),
                        ot_hours: parseFloat(otHours.toFixed(2)),
                        late_hours: parseFloat(lateHours.toFixed(2)),
                        is_late: isLate,
                        is_early: isEarly
                    });
                } else if (isExplicitAbsent) {
                    // Insert explicit absent log
                    console.log(`[Standard] Emp: ${emp.code} | Date: ${workDate} | Explicit Absent`);
                    logs.push({
                        employee_id: emp.id,
                        employee_code: emp.code,
                        employee_name: emp.full_name,
                        work_date: workDate,
                        start_time: null,
                        end_time: null,
                        work_days: 0, // Mark as 0 work days
                        ot_hours: 0,
                        late_hours: 0,
                    });
                }
            });
        }
        return { logs, missing, headerStartDate: periodStartDate, headerEndDate: periodEndDate };
    };

    // Helper: Parse Excel Date (numbers or strings)
    const parseExcelDate = (val) => {
        if (!val) return null;
        let dateObj = null;

        // If number (Excel serial date)
        if (typeof val === 'number') {
            // approximate check: 43831 is 2020-01-01
            if (val < 43831) return null;
            dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        // If string YYYY-MM-DD
        else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateObj = new Date(val);
        }
        else {
            // Only try standard parse if it looks like a full date, not "16 ศ."
            if (String(val).length > 6 && !String(val).match(/^\d{1,2}\s/)) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) dateObj = d;
            }
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            if (year < 2020 || year > 2030) return null;
            return dateObj.toISOString().split('T')[0];
        }
        return null;
    };

    const isValidDate = (val) => {
        return parseExcelDate(val) !== null;
    };

    const isValidTime = (val) => {
        if (typeof val === 'string' && val.match(/^\d{1,2}:\d{2}$/)) return true;
        // Excel fraction for time? 0.5 = 12:00
        if (typeof val === 'number' && val >= 0 && val < 1) return true;
        return false;
    };

    const formatTime = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'number') {
            // Convert Excel fraction to HH:mm
            const totalSeconds = Math.round(val * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        return null;
    };

    const getBirthdayDisplay = (emp) => {
        if (!emp.date_of_birth || !selectedPeriod) return null;

        const dob = new Date(emp.date_of_birth);
        const start = new Date(selectedPeriod.startDate);
        const end = new Date(selectedPeriod.endDate);

        // Check current year of period start
        const year = start.getFullYear();
        const thisYearBirthday = new Date(year, dob.getMonth(), dob.getDate());

        const d = new Date(thisYearBirthday); d.setHours(0, 0, 0, 0);
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);

        if (d >= s && d <= e) {
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        }

        // Edge case: Period crosses year
        if (start.getFullYear() !== end.getFullYear()) {
            const nextYearBirthday = new Date(end.getFullYear(), dob.getMonth(), dob.getDate());
            const d2 = new Date(nextYearBirthday); d2.setHours(0, 0, 0, 0);
            if (d2 >= s && d2 <= e) {
                return d2.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }
        }
        return null;
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        const confirmed = await showConfirm('คุณแน่ใจว่าต้องการลบข้อมูลพนักงานนี้?');
        if (confirmed) {
            const success = await employeeService.deleteEmployee(id);
            if (success) loadEmployees();
        }
    };

    const handleRowClick = (emp) => {
        if (viewMode === 'info') {
            navigate(`/dashboard/employees/${emp.id}/edit`);
        } else if (selectedPeriod) {
            // Open Period Detail Modal
            setSelectedEmployee(emp);
            // Filter logs for this employee in this period
            const logs = periodLogs.filter(l => l.employee_id === emp.id).sort((a, b) => new Date(a.work_date) - new Date(b.work_date));
            setSelectedDetailLogs(logs);
            setIsDetailModalOpen(true);
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <PageHeader
                title="รายชื่อพนักงาน"
                subtitle={viewMode === 'timesheet' ? 'จัดการเวลาทำงานและการเข้างาน' : 'จัดการข้อมูลพนักงานและค่าแรง'}
                helpContent={HELP_CONTENT.employees}
            >
                {viewMode === 'info' && hasPermission('employees', 'create') && (
                    <button
                        onClick={() => navigate('/dashboard/employees/new')}
                        className="btn-primary"
                        style={{
                            padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#37477C', color: 'white',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', fontSize: '1rem'
                        }}
                    >
                        <Plus size={20} /> เพิ่มพนักงาน
                    </button>
                )}

                {viewMode === 'timesheet' && selectedPeriod && hasPermission('employees', 'edit') && (
                    <label
                        style={{
                            padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', fontSize: '1rem'
                        }}>
                        <FileSpreadsheet size={20} /> Import Time From Excel
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onClick={(e) => { e.target.value = null; }}
                            onChange={handleImport}
                        />
                    </label>
                )}
            </PageHeader>

            {/* Controls: View Mode Toggle */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{
                    background: '#f3f4f6', padding: '0.4rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', width: '100%',
                }}>
                    <button
                        onClick={() => { setViewMode('timesheet'); setSelectedPeriod(null); }}
                        style={{
                            flex: 1, border: 'none', background: viewMode === 'timesheet' ? '#37477C' : 'transparent',
                            color: viewMode === 'timesheet' ? 'white' : '#6b7280', padding: '0.6rem 1rem', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            boxShadow: viewMode === 'timesheet' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', fontSize: '1rem'
                        }}
                    >
                        <Clock size={18} /> ลงเวลางาน
                    </button>

                    <button
                        onClick={() => setViewMode('info')}
                        style={{
                            flex: 1, border: 'none', background: viewMode === 'info' ? '#37477C' : 'transparent',
                            color: viewMode === 'info' ? 'white' : '#6b7280', padding: '0.6rem 1rem', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            boxShadow: viewMode === 'info' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', fontSize: '1rem'
                        }}
                    >
                        <User size={18} /> ข้อมูลทั่วไป
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            {viewMode === 'timesheet' && !selectedPeriod ? (
                /* PERIOD SELECTION LIST */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#37477C' }}>
                        <Clock size={20} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>เลือกงวดเวลาทำงาน</h3>
                        {hasPermission('employees', 'create') && (
                            <button
                                onClick={() => setIsAddPeriodModalOpen(true)}
                                style={{
                                    background: '#37477C', color: 'white', border: 'none',
                                    borderRadius: '50%', width: '28px', height: '28px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', marginLeft: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                title="เพิ่มงวดเวลาใหม่"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {periods.map((period) => (
                            <div
                                key={period.id}
                                style={{ position: 'relative' }}
                            >
                                <button
                                    onClick={() => handleSelectPeriod(period)}
                                    className="period-card"
                                    style={{
                                        width: '100%',
                                        padding: '1.5rem',
                                        paddingRight: '6rem', // More space for delete button
                                        textAlign: 'left',
                                        background: '#37477C',
                                        borderRadius: '8px',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'transform 0.2s, background 0.2s',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem', fontWeight: '500' }}>
                                        {period.label}
                                    </span>
                                    <ChevronRight size={24} color="white" />
                                </button>
                                {hasPermission('employees', 'delete') && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const confirmed = await showConfirm(`⚠️ คำเตือน: การลบงวด "${period.label}" จะทำการลบข้อมูลการลงเวลาทั้งหมดในงวดนี้ด้วย!!\n\nข้อมูลที่ลบไปจะไม่สามารถกู้คืนได้\n\nคุณแน่ใจว่าต้องการลบใช่หรือไม่?`);
                                            if (confirmed) {
                                                periodService.deletePeriod(period.id).then(loadPeriods);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none',
                                            padding: '10px', borderRadius: '6px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        title="ลบงวดนี้"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {periods.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0', color: '#64748b' }}>
                                <FileSpreadsheet size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <div>ยังไม่มีงวดเวลา</div>
                                <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>กดปุ่ม + เพื่อเพิ่มงวดเวลาเริ่มต้นการทำงาน</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* EMPLOYEE LIST (Standard or Timesheet DETAIL MODE) */
                <>
                    {/* Header for Drill-down (Back Button) */}
                    {viewMode === 'timesheet' && selectedPeriod && (
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={() => setSelectedPeriod(null)}
                                style={{
                                    border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 1rem', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: '#64748b'
                                }}
                            >
                                <ArrowLeft size={20} /> ย้อนกลับ
                            </button>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#37477C' }}>
                                งวด: {selectedPeriod.label}
                            </span>
                            <div style={{ flex: 1 }}></div>
                            <button
                                onClick={() => setIsFullTimesheetOpen(true)}
                                style={{
                                    border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 1rem', borderRadius: '6px', color: '#37477C', fontWeight: '500', marginRight: '0.5rem'
                                }}
                            >
                                <FileText size={18} /> ดูตารางรวมพนักงาน
                            </button>
                            {hasPermission('employees', 'delete') && (
                                <button
                                    onClick={handleClearData}
                                    style={{
                                        border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.5rem 1rem', borderRadius: '6px', color: '#ef4444', fontWeight: '500'
                                    }}
                                >
                                    <Trash2 size={18} /> ลบข้อมูลทั้่งหมดในงวดนี้
                                </button>
                            )}
                        </div>
                    )}

                    {/* Search Bar */}

                    {/* Search Bar */}
                    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Search size={20} color="#888" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, รหัสพนักงาน, เบอร์โทร..."
                            className="glass-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '1rem', outline: 'none', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Employee Table */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500' }}>รหัส</th>
                                        <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500' }}>ชื่อ - นามสกุล</th>
                                        {/* Dynamic Columns based on View Mode */}
                                        {viewMode === 'timesheet' && selectedPeriod ? (
                                            <>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>วันเกิด</th>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>ทำงาน (วัน)</th>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>ขาด (วัน)</th>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>OT (ชม.)</th>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>สาย (นาที)</th>
                                                <th style={{ padding: '1.2rem', textAlign: 'center', color: '#6b7280', fontWeight: '500' }}>เบี้ยขยัน</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500' }}>ตำแหน่ง</th>
                                                <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500' }}>เบอร์โทร</th>
                                                <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500', textAlign: 'center' }}>สถานะ</th>
                                                <th style={{ padding: '1.2rem', color: '#6b7280', fontWeight: '500', textAlign: 'right' }}>จัดการ</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูล...</td></tr>
                                    ) : filteredEmployees.length === 0 ? (
                                        <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center' }}>ไม่พบข้อมูลพนักงาน</td></tr>
                                    ) : (
                                        filteredEmployees.map(emp => {
                                            const stats = periodStats[emp.id] || { workDays: 0, lateHours: 0, otHours: 0, absentDays: 0 };

                                            return (
                                                <tr
                                                    key={emp.id}
                                                    onClick={() => handleRowClick(emp)}
                                                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(55, 71, 124, 0.05)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '1.2rem', fontFamily: 'monospace', color: '#6b7280' }}>{emp.code}</td>
                                                    <td style={{ padding: '1.2rem', fontWeight: '500', color: 'var(--text-main)' }}>{emp.full_name}</td>

                                                    {viewMode === 'timesheet' && selectedPeriod ? (
                                                        <>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 'bold', color: '#ec4899' }}>
                                                                {getBirthdayDisplay(emp) || '-'}
                                                            </td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>{Number(stats.workDays).toFixed(2)}</td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{stats.absentDays}</td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', color: '#8b5cf6' }}>{Number(stats.otHours).toFixed(2)}</td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', color: '#f59e0b' }}>{Math.round(stats.lateHours * 60)}</td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 'bold', color: stats.diligence > 0 ? '#10b981' : '#ccc' }}>
                                                                {stats.diligence > 0 ? stats.diligence.toLocaleString() : '-'}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '1.2rem', color: '#6b7280' }}>{emp.position || '-'}</td>
                                                            <td style={{ padding: '1.2rem', color: '#6b7280' }}>{emp.phone || '-'}</td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem',
                                                                    background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                    color: emp.status === 'Active' ? '#10b981' : '#ef4444',
                                                                    border: emp.status === 'Active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                                                }}>
                                                                    {emp.status === 'Active' ? 'ปกติ' : 'ระงับ'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                    {hasPermission('employees', 'edit') && (
                                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${emp.id}/edit`); }}
                                                                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', color: '#6b7280' }}>
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                    )}
                                                                    {hasPermission('employees', 'delete') && (
                                                                        <button onClick={(e) => handleDelete(e, emp.id)}
                                                                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}>
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
</div>
                    </div>
                </>
            )
            }

            {/* Quick Log Modal (Existing) */}
            {
                isLogModalOpen && selectedEmployee && (
                    <LogTimeModal
                        employee={selectedEmployee}
                        onClose={() => setIsLogModalOpen(false)}
                        onSuccess={() => { }}
                    />
                )
            }

            {/* Period Detail Modal (New) */}
            {
                isDetailModalOpen && selectedEmployee && (
                    <PeriodDetailModal
                        isOpen={isDetailModalOpen}
                        onClose={() => setIsDetailModalOpen(false)}
                        employee={selectedEmployee}
                        period={selectedPeriod}
                        logs={selectedDetailLogs}
                        workSchedule={workSchedule}
                        diligenceOverride={diligenceOverrides[selectedEmployee.id]}
                        onUpdate={loadPeriodData}
                    />
                )
            }

            {/* Import Preview Modal */}
            <ImportPreviewModal
                isOpen={importModal.isOpen}
                onClose={() => setImportModal(prev => ({ ...prev, isOpen: false }))}
                data={importModal.data}
                status={importModal.status}
                message={importModal.message}
                onConfirm={finalizeImport}
            />

            <FullTimesheetModal
                isOpen={isFullTimesheetOpen}
                onClose={() => setIsFullTimesheetOpen(false)}
                employees={employees}
                period={selectedPeriod}
                logs={periodLogs}
                stats={periodStats}
                workSchedule={workSchedule}
                overrides={diligenceOverrides}
                onToggleDiligence={async (empId, isForced, amount) => {
                    try {
                        await employeeService.upsertDiligenceOverride(selectedPeriod.id, empId, isForced, amount);
                        setDiligenceOverrides(prev => ({
                            ...prev,
                            [empId]: { isForced, amount }
                        }));
                        loadPeriodData();
                    } catch (error) {
                        console.error('Failed to update diligence override', error);
                        await showError('บันทึกไม่สำเร็จ');
                    }
                }}
                onUpdateLog={async (empId, dateStr, startTime, endTime) => {
                    try {
                        const payload = {
                            employee_id: empId,
                            work_date: dateStr,
                        };
                        // Only add time if provided, otherwise null
                        if (startTime) payload.start_time = startTime;
                        else payload.start_time = null;

                        if (endTime) payload.end_time = endTime;
                        else payload.end_time = null;

                        // If both null, upsert will create a log with null times (absent? or just cleared?)
                        // If we want to delete log, we might need a separate delete function, but upsert with nulls is fine for now usually.

                        // Calculate late minutes
                        let lateHours = 0;
                        if (startTime && workSchedule && workSchedule.start_time) {
                            const [sh, sm] = workSchedule.start_time.split(':').map(Number);
                            const [ah, am] = startTime.split(':').map(Number);

                            const scheduleMins = sh * 60 + sm;
                            const actualMins = ah * 60 + am;

                            if (actualMins > scheduleMins) {
                                lateHours = (actualMins - scheduleMins) / 60;
                            }
                        }
                        payload.late_hours = lateHours;

                        // Also update work_days ? 
                        // If no start/end, work_days = 0.
                        // If start/end, work_days = 1 (or 0.5?). Default to 1 if present.
                        if (startTime && endTime) {
                            payload.work_days = 1;
                        } else if (!startTime && !endTime) {
                            payload.work_days = 0;
                        }
                        // If partial? let's assume 1 if either exists for now, or just stick to 1 if start exists.

                        await employeeService.upsertWorkLog(payload);
                        loadPeriodData();
                    } catch (error) {
                        console.error(error);
                        await showAlert('บันทึกเวลาไม่สำเร็จ');
                    }
                }}
            />

            <AddPeriodModal
                isOpen={isAddPeriodModalOpen}
                onClose={() => setIsAddPeriodModalOpen(false)}
                onSuccess={loadPeriods}
            />
        </div >
    );
};

export default EmployeeListPage;
