import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Search, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import PageHeader from '../components/PageHeader';
import { useDialog } from '../contexts/DialogContext';

const DuplicateFinderPage = () => {
    const { showError } = useDialog();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    
    const [selectedCol1, setSelectedCol1] = useState('');
    const [selectedCol2, setSelectedCol2] = useState('');
    
    const [duplicates, setDuplicates] = useState([]);
    const [isCompared, setIsCompared] = useState(false);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        const name = uploadedFile.name;
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
            showError('กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น');
            return;
        }

        setFile(uploadedFile);
        setFileName(name);
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Read with header: "A" to get keys like 'A', 'B', 'C'
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: "A", defval: "" });
                
                // Find all unique columns across all rows
                const cols = new Set();
                jsonData.forEach(row => {
                    Object.keys(row).forEach(k => cols.add(k));
                });
                
                const colsArray = Array.from(cols).sort();
                
                setData(jsonData);
                setColumns(colsArray);
                
                // Auto-select first two columns if available
                if (colsArray.length >= 2) {
                    setSelectedCol1(colsArray[0]);
                    setSelectedCol2(colsArray[1]);
                } else if (colsArray.length === 1) {
                    setSelectedCol1(colsArray[0]);
                    setSelectedCol2('');
                }
                
                setIsCompared(false);
                setDuplicates([]);
                
            } catch (err) {
                console.error("Error parsing file:", err);
                showError('เกิดข้อผิดพลาดในการอ่านไฟล์ โปรดตรวจสอบไฟล์ของคุณ');
            }
        };
        reader.readAsBinaryString(uploadedFile);
    };

    const handleCompare = () => {
        if (!selectedCol1 || !selectedCol2) {
            showError('กรุณาเลือกคอลัมน์ที่จะเปรียบเทียบทั้ง 2 ฝั่ง');
            return;
        }

        if (selectedCol1 === selectedCol2) {
            showError('ไม่สามารถเปรียบเทียบคอลัมน์เดียวกันได้');
            return;
        }

        // Get unique non-empty values from each column
        // This automatically ignores intra-column duplicates (duplicates within the same column)
        const col1Values = new Set();
        const col2Values = new Set();

        data.forEach(row => {
            const val1 = row[selectedCol1]?.toString().trim();
            const val2 = row[selectedCol2]?.toString().trim();
            
            if (val1) col1Values.add(val1);
            if (val2) col2Values.add(val2);
        });

        // Find intersection
        const foundDuplicates = [...col1Values].filter(val => col2Values.has(val));
        
        setDuplicates(foundDuplicates);
        setIsCompared(true);
    };

    const handleReset = () => {
        setFile(null);
        setFileName('');
        setData([]);
        setColumns([]);
        setSelectedCol1('');
        setSelectedCol2('');
        setDuplicates([]);
        setIsCompared(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <PageHeader 
                title="จับผิดข้อมูลซ้ำ" 
                subtitle="ตรวจสอบข้อมูลที่ซ้ำกันระหว่าง 2 คอลัมน์ (ข้ามฝั่ง)" 
                icon={Search} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Upload & Config */}
                <div className="glass-panel p-6 flex flex-col gap-6 lg:col-span-1 h-fit">
                    {!file ? (
                        <div 
                            className="border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <div className="bg-primary/10 p-4 rounded-full text-primary mb-4">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">อัปโหลดไฟล์</h3>
                            <p className="text-sm text-textMuted">รองรับไฟล์ .xlsx, .xls หรือ .csv</p>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileSpreadsheet className="text-primary shrink-0" size={24} />
                                <span className="font-medium truncate">{fileName}</span>
                            </div>
                            <button onClick={handleReset} className="text-textMuted hover:text-error transition-colors p-1" title="เปลี่ยนไฟล์">
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    )}

                    {file && columns.length > 0 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-1">คอลัมน์ที่ 1 (ฝั่งซ้าย)</label>
                                <select 
                                    className="input-field w-full"
                                    value={selectedCol1}
                                    onChange={(e) => setSelectedCol1(e.target.value)}
                                >
                                    <option value="" disabled>-- เลือกคอลัมน์ --</option>
                                    {columns.map(col => (
                                        <option key={`col1-${col}`} value={col}>คอลัมน์ {col}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex justify-center">
                                <div className="bg-slate-100 rounded-full p-2 text-textMuted">
                                    <RefreshCw size={16} className="rotate-90" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-1">คอลัมน์ที่ 2 (ฝั่งขวา)</label>
                                <select 
                                    className="input-field w-full"
                                    value={selectedCol2}
                                    onChange={(e) => setSelectedCol2(e.target.value)}
                                >
                                    <option value="" disabled>-- เลือกคอลัมน์ --</option>
                                    {columns.map(col => (
                                        <option key={`col2-${col}`} value={col}>คอลัมน์ {col}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleCompare}
                                className="btn-primary w-full py-3 mt-4 flex justify-center items-center gap-2"
                            >
                                <Search size={18} />
                                <span>เริ่มจับผิดข้อมูล</span>
                            </button>
                            
                            <p className="text-xs text-textMuted text-center mt-2 leading-relaxed">
                                * ระบบจะหาเฉพาะข้อมูลที่ปรากฏทั้งในคอลัมน์ที่ 1 และ 2 <br/>
                                (ถ้าซ้ำกันเองในคอลัมน์เดียวกัน ระบบจะไม่สนใจ)
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Results */}
                <div className="glass-panel p-6 lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            ผลลัพธ์การตรวจสอบ
                        </h2>
                        {isCompared && (
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                                duplicates.length > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
                            }`}>
                                {duplicates.length > 0 ? (
                                    <>
                                        <AlertTriangle size={16} />
                                        <span>พบข้อมูลซ้ำ {duplicates.length} รายการ</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} />
                                        <span>ไม่พบข้อมูลซ้ำเลย เยี่ยมมาก!</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {!isCompared ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-textMuted opacity-60">
                            <Search size={48} className="mb-4" />
                            <p className="text-lg">อัปโหลดไฟล์และกด "เริ่มจับผิดข้อมูล" เพื่อดูผลลัพธ์</p>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                            {duplicates.length > 0 ? (
                                <div className="overflow-auto flex-1 p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                            <tr>
                                                <th className="py-3 px-6 font-semibold text-slate-600 w-24 text-center">ลำดับ</th>
                                                <th className="py-3 px-6 font-semibold text-slate-600">
                                                    ข้อมูลที่พบซ้ำทั้งสองฝั่ง 
                                                    <span className="text-xs font-normal text-slate-400 ml-2">
                                                        (คอลัมน์ {selectedCol1} และ {selectedCol2})
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {duplicates.map((dup, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 px-6 text-center text-slate-400">{idx + 1}</td>
                                                    <td className="py-3 px-6 font-medium text-slate-800">{dup}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="bg-success/10 p-4 rounded-full text-success mb-4">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-1">ข้อมูลสะอาดสะอ้าน!</h3>
                                    <p className="text-slate-500">ไม่มีข้อมูลใดซ้ำกันระหว่างคอลัมน์ {selectedCol1} และ {selectedCol2}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DuplicateFinderPage;
