
import * as XLSX from 'xlsx';
import fs from 'fs';

// Mock Employees Data (Need to match the codes in the Excel file)
const mockEmployees = [
    { id: 1, code: '690126', full_name: 'Phet' },
    { id: 2, code: '630209', full_name: 'Rey' },
    { id: 3, code: '630819', full_name: 'Koemleang' },
];

const parseExcelDate = (val) => {
    if (!val) return null;
    let dateObj = null;

    if (typeof val === 'number') {
        if (val < 43831) return null;
        dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateObj = new Date(val);
    }
    else {
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

const formatTime = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return null;
};

const parseStandardReportFormat = (data, employees) => {
    const logs = [];
    let periodStartDate = null;
    let periodEndDate = null;

    // 1. Detect Header Date Range
    console.log('Sample Content (First 5 Rows):', data.slice(0, 5));

    if (data.length > 0) {
        // Try first 2 rows for date range
        let rangeFound = false;
        for (let i = 0; i < Math.min(3, data.length); i++) {
            const rowStr = (data[i] || []).join(' ').toLowerCase();
            const rangeMatch = rowStr.match(/(\d{4}-\d{2}-\d{2})\s*[~-]\s*(\d{4}-\d{2}-\d{2})/);
            if (rangeMatch) {
                periodStartDate = new Date(rangeMatch[1]);
                periodEndDate = new Date(rangeMatch[2]);
                console.log('Found Period in Row', i, ':', periodStartDate, periodEndDate);
                rangeFound = true;
                break;
            }
        }

    }

    if (!periodStartDate) {
        console.error('Error: Period Start Date not found.');
        return [];
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
        console.error('Error: Code row not found.');
        return [];
    }

    const codeRow = data[codeRowIndex];
    const BLOCK_SIZE = 15;

    for (let c = 0; c < codeRow.length; c++) {
        const cell = String(codeRow[c] || '').trim().toLowerCase();
        if (cell === 'รหัส' || cell === 'code') {
            const codeVal = codeRow[c + 1];
            if (codeVal) {
                const emp = employees.find(e => String(e.code) === String(codeVal));
                if (emp) {
                    const blockStart = Math.floor(c / BLOCK_SIZE) * BLOCK_SIZE;
                    if (!employeeMap[blockStart]) {
                        employeeMap[blockStart] = emp;
                        console.log(`Mapped Block ${blockStart} to Employee ${emp.full_name} (${emp.code})`);
                    }
                } else {
                    console.warn(`Warning: Employee code ${codeVal} not found in mock DB.`);
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
        console.error('Error: Data header row not found.');
        return [];
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
                return s === '00:00' ? null : s;
            };

            const s1In = cleanTime(getVal(1));
            const s1Out = cleanTime(getVal(3));
            const s2In = cleanTime(getVal(6));
            const s2Out = cleanTime(getVal(8));
            const otIn = cleanTime(getVal(10));
            const otOut = cleanTime(getVal(12));

            const allIns = [s1In, s2In].filter(x => x).sort();
            const allOuts = [s1Out, s2Out].filter(x => x).sort();

            const startTime = allIns.length > 0 ? allIns[0] : null;
            const endTime = allOuts.length > 0 ? allOuts[allOuts.length - 1] : null;

            let otHours = 0;
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

            if (startTime || endTime || otHours > 0) {
                logs.push({
                    employee_id: emp.id,
                    work_date: workDate,
                    start_time: startTime,
                    end_time: endTime,
                    ot_hours: parseFloat(otHours.toFixed(2)),
                });
            }
        });
    }

    console.log(`Parsed ${logs.length} logs successfully.`);
    // Log first 5
    console.log('Sample logs:', logs.slice(0, 5));
    return logs;
};


try {
    const filename = '1_StandardReport.xlsx';
    console.log(`Reading ${filename}...`);
    const fileBuf = fs.readFileSync(filename);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // We don't have real employees in DB context here, so mocking
    // Need to update mockEmployees with correct codes if parsing fails
    console.log('Employees:', mockEmployees);

    parseStandardReportFormat(data, mockEmployees);

} catch (e) {
    console.error('Test Failed:', e);
}
