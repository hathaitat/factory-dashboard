import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Factory, Calendar, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductionPlanFormPage = () => {
    const navigate = useNavigate();
    const { month: urlMonth, lineId: urlLineId } = useParams();
    const [searchParams] = useSearchParams();
    
    // Default to params if edit, else query string, else current
    const initialMonth = urlMonth || searchParams.get('month') || new Date().toISOString().slice(0,7);
    
    const { showConfirm, showAlert, showError } = useDialog();
    const { user } = useAuth();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [month, setMonth] = useState(initialMonth);

    const changeMonth = (offset) => {
        if (!month) return;
        const [y, m] = month.split('-');
        let newDate = new Date(parseInt(y), parseInt(m) - 1 + offset, 1);
        const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        setMonth(newMonthStr);
        
        // Update URL to match current view
        navigate(`/dashboard/production/plans/edit/${newMonthStr}/${lineId}`, { replace: true });
    };

    const [lineId, setLineId] = useState(urlLineId || '');
    const [lines, setLines] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    
    // Matrix format: array of { id, product_name, process, target_warehouse_id, plan: {1: 10, ...}, actual: {1: 9, ...} }
    const [matrix, setMatrix] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (month && lineId) {
            loadPlansAndLogs(month, lineId);
        }
    }, [month, lineId]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [linesData, whData] = await Promise.all([
                productionService.getLines(),
                warehouseService.getWarehouses()
            ]);
            setLines(linesData);
            setWarehouses(whData || []);
            
            if (!urlLineId && linesData.length > 0) {
                setLineId(linesData[0].id);
            }
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูลพื้นฐาน');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPlansAndLogs = async (m, lid) => {
        setIsLoading(true);
        try {
            // Find current line to get mapped warehouses
            let currentLine = lines.find(l => l.id === lid);
            if (!currentLine) {
                // If not found in state (e.g., initial load race condition), fetch again
                const freshLines = await productionService.getLines();
                currentLine = freshLines.find(l => l.id === lid);
            }

            const [plansData, logsData, invData] = await Promise.all([
                productionService.getPlansByMonthAndLine(m, lid),
                productionService.getLogsByMonthAndLine(m, lid),
                currentLine && currentLine.warehouse_ids && currentLine.warehouse_ids.length > 0 
                    ? warehouseService.getInventoryItemsByWarehouses(currentLine.warehouse_ids)
                    : Promise.resolve([])
            ]);
            
            setInventoryItems(invData);

            const newMatrixMap = {};
            const getMapKey = (name, process) => `${name}|||${process || ''}`;

            // Populate Plans
            plansData.forEach(p => {
                const day = parseInt(p.plan_date.split('-')[2], 10);
                const key = getMapKey(p.product_name, p.process);
                if (!newMatrixMap[key]) {
                    newMatrixMap[key] = { 
                        id: key, 
                        product_name: p.product_name, 
                        process: p.process || '', 
                        target_warehouse_id: p.target_warehouse_id || '',
                        plan: {}, 
                        actual: {} 
                    };
                }
                newMatrixMap[key].plan[day] = p.target_quantity;
            });

            // Populate Actuals from Logs
            logsData.forEach(l => {
                const day = parseInt(l.log_date.split('-')[2], 10);
                const pName = l.production_plans?.product_name || 'Unknown';
                const pProcess = l.production_plans?.process || '';
                const key = getMapKey(pName, pProcess);
                
                if (!newMatrixMap[key]) {
                    newMatrixMap[key] = { 
                        id: key, 
                        product_name: pName, 
                        process: pProcess, 
                        target_warehouse_id: l.production_plans?.target_warehouse_id || '',
                        plan: {}, 
                        actual: {} 
                    };
                }
                
                if (!newMatrixMap[key].actual[day]) {
                    newMatrixMap[key].actual[day] = 0;
                }
                newMatrixMap[key].actual[day] += Number(l.quantity_produced || 0);
            });

            // Pre-populate Matrix with Processes Template from the Line
            // New structure: [{inventory_item_id, target_warehouse_id, steps: ["step1","step2"]}]
            if (currentLine && currentLine.processes_template && Array.isArray(currentLine.processes_template) && invData) {
                currentLine.processes_template.forEach(group => {
                    if (!group.inventory_item_id) return;
                    const item = invData.find(i => i.id === group.inventory_item_id);
                    if (!item) return;

                    const steps = (group.steps || []).filter(s => {
                        if (typeof s === 'string') return s.trim() !== '';
                        return s && s.name && s.name.trim() !== '';
                    });

                    if (steps.length === 0) {
                        // No steps defined → add 1 row with blank process name
                        const key = getMapKey(item.product_name, '');
                        if (!newMatrixMap[key]) {
                            newMatrixMap[key] = {
                                id: key,
                                product_name: item.product_name,
                                process: '',
                                target_warehouse_id: group.target_warehouse_id || item.warehouse_id || '',
                                plan: {},
                                actual: {}
                            };
                        }
                    } else {
                        // Each step = 1 row in the grid
                        steps.forEach(step => {
                            const stepName = typeof step === 'string' ? step : step.name;
                            const stepTargetWh = typeof step === 'string' ? '' : (step.target_warehouse_id || '');
                            
                            const key = getMapKey(item.product_name, stepName);
                            if (!newMatrixMap[key]) {
                                newMatrixMap[key] = {
                                    id: key,
                                    product_name: item.product_name,
                                    process: stepName,
                                    target_warehouse_id: stepTargetWh || group.target_warehouse_id || item.warehouse_id || '',
                                    plan: {},
                                    actual: {}
                                };
                            }
                        });
                    }
                });
            }

            const finalMatrix = Object.values(newMatrixMap).filter(row => {
                const hasPlan = Object.values(row.plan).some(v => Number(v) > 0);
                const hasActual = Object.values(row.actual).some(v => Number(v) > 0);
                
                if (hasPlan || hasActual) return true;
                
                const isTemplate = currentLine?.processes_template?.some(group => {
                    const item = invData?.find(i => i.id === group.inventory_item_id);
                    if (!item || item.product_name !== row.product_name) return false;
                    
                    const steps = (group.steps || []).filter(s => {
                        if (typeof s === 'string') return s.trim() !== '';
                        return s && s.name && s.name.trim() !== '';
                    });
                    
                    if (steps.length === 0 && row.process === '') return true;
                    return steps.some(s => {
                        const sName = typeof s === 'string' ? s : s.name;
                        return sName === row.process;
                    });
                });
                
                return isTemplate;
            });

            setMatrix(finalMatrix);
        } catch (error) {
            console.error(error);
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูลเป้าหมายและผลผลิตจริง');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRow = () => {
        setMatrix([...matrix, { 
            id: `new-${Date.now()}`, 
            product_name: '', 
            process: '', 
            target_warehouse_id: '',
            plan: {}, 
            actual: {} 
        }]);
    };

    const handleDeleteRow = async (index) => {
        const row = matrix[index];
        if (Object.keys(row.actual).length > 0) {
            return showAlert('ไม่สามารถลบแถวที่มีบันทึกยอดผลิตจริงแล้วได้', 'warning');
        }
        
        const isConfirmed = await showConfirm('ต้องการลบสินค้านี้ออกจากแผนการผลิตใช่หรือไม่?', 'ยืนยันการลบ');
        if (isConfirmed) {
            const newMatrix = [...matrix];
            newMatrix.splice(index, 1);
            setMatrix(newMatrix);
        }
    };

    const handleProductChange = (index, field, value) => {
        const newMatrix = [...matrix];
        newMatrix[index][field] = value;
        setMatrix(newMatrix);
    };

    const handlePlanChange = (rowIndex, day, value) => {
        const newMatrix = [...matrix];
        newMatrix[rowIndex].plan[day] = value;
        setMatrix(newMatrix);
    };

    const handleSave = async () => {
        if (!lineId) return showAlert('กรุณาเลือกแผนกการผลิต', 'warning');
        if (!month) return showAlert('กรุณาเลือกเดือน', 'warning');

        // Validation
        for (let i = 0; i < matrix.length; i++) {
            const row = matrix[i];
            if (!row.product_name) {
                return showAlert(`กรุณาระบุชื่อสินค้าในบรรทัดที่ ${i + 1}`, 'warning');
            }
        }

        setIsSaving(true);
        try {
            const plansToSave = [];
            
            matrix.forEach(row => {
                const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);
                daysArray.forEach(day => {
                    const val = row.plan[day];
                    if (val !== undefined && val !== '' && Number(val) > 0) {
                        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                        plansToSave.push({
                            line_id: lineId,
                            plan_month: month,
                            plan_date: dateStr,
                            product_name: row.product_name,
                            process: row.process || '',
                            target_warehouse_id: row.target_warehouse_id || null,
                            target_quantity: Number(val),
                            unit: 'PCS', // Default
                            created_by: user.id
                        });
                    }
                });
            });

            await productionService.savePlans(plansToSave, month, lineId);
            showAlert('บันทึกเป้าหมายการผลิตสำเร็จ', 'success');
            
            // Reload to get properly merged data
            loadPlansAndLogs(month, lineId);
        } catch (error) {
            console.error('Error saving plans:', error);
            showError('เกิดข้อผิดพลาดในการบันทึกเป้าหมาย');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate days in selected month
    let daysInMonth = 31;
    if (month) {
        const [y, m] = month.split('-');
        daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
    }
    const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const formatMonthDisplay = (yyyyMm) => {
        if (!yyyyMm) return '';
        const [y, m] = yyyyMm.split('-');
        const date = new Date(y, parseInt(m) - 1, 1);
        return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('/dashboard/production/plans')} className="btn btn-secondary">
                    <ArrowLeft size={18} /> กลับหน้ารายการเป้าหมาย
                </button>
                <button onClick={handleSave} disabled={isSaving || isLoading} className="btn btn-primary">
                    <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}
                </button>
            </div>
            
            <PageHeader 
                title="ตั้งเป้าหมายการผลิต" 
                subtitle="กำหนดเป้าหมายรายวัน และเทียบยอดผลิตจริง" 
            />

            <div className="glass-panel p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2">เดือน (Month)</label>
                        <div className="flex items-center gap-2">
                            <button 
                                className="btn btn-secondary px-2 border-border"
                                onClick={() => changeMonth(-1)}
                                title="เดือนก่อนหน้า"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="relative flex-1">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                                <input 
                                    type="month" 
                                    className="input w-full font-bold" 
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={month}
                                    onChange={(e) => {
                                        setMonth(e.target.value);
                                        navigate(`/dashboard/production/plans/edit/${e.target.value}/${lineId}`, { replace: true });
                                    }}
                                />
                            </div>
                            
                            <button 
                                className="btn btn-secondary px-2 border-border"
                                onClick={() => changeMonth(1)}
                                title="เดือนถัดไป"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className="text-sm text-textMuted mt-2 ml-1">
                            แสดงผลสำหรับ: <span className="text-primary font-semibold">{formatMonthDisplay(month)}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2">แผนกการผลิต (Production Line)</label>
                        <div className="relative">
                            <Factory size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                            <select 
                                className="input w-full font-bold cursor-pointer"
                                style={{ paddingLeft: '2.5rem' }}
                                value={lineId}
                                onChange={(e) => setLineId(e.target.value)}
                            >
                                <option value="" disabled>-- เลือกแผนก --</option>
                                {lines.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`glass-panel flex flex-col transition-all ${isFullscreen ? 'fixed inset-4 z-50 rounded-xl shadow-2xl h-auto bottom-4 bg-bgMain/95 backdrop-blur-xl' : 'h-[65vh]'}`}>
                <style dangerouslySetInnerHTML={{__html: `
                    .production-plan-table th, 
                    .production-plan-table td {
                        border-right: 1px solid #cbd5e1 !important;
                    }
                    .production-plan-table th.sticky.right-0,
                    .production-plan-table td.sticky.right-0 {
                        border-left: 1px solid #cbd5e1 !important;
                        border-right: none !important;
                    }
                    /* Custom clear separators */
                    .product-group-end-cell {
                        border-bottom: 3px solid #1e293b !important; /* Very clear dark slate border */
                    }
                    .step-end-cell {
                        border-bottom: 1.5px solid #94a3b8 !important; /* Standard step separator border */
                    }
                `}} />
                <div className="p-4 border-b border-border flex justify-between items-center bg-bgMain rounded-t-xl">
                    <h3 className="font-bold text-primary m-0">ตารางแผนการผลิตรายวัน</h3>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            {isFullscreen ? ' ย่อหน้าต่าง' : ' เต็มจอ'}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto relative">
                    {isLoading && matrix.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <table className="production-plan-table w-full border-collapse min-w-max text-[0.85rem]">
                            <thead>
                                <tr>
                                    {/* Sticky Headers */}
                                    <th className="sticky top-0 left-0 z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[140px] min-w-[140px] text-center text-[#1e3a8a] font-bold">P/No</th>
                                    <th className="sticky top-0 left-[140px] z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[100px] min-w-[100px] text-center text-[#1e3a8a] font-bold">Process</th>
                                    <th className="sticky top-0 left-[240px] z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[60px] min-w-[60px] text-center text-slate-700 font-bold">Type</th>
                                    
                                    {/* Date Headers */}
                                    {daysArray.map(day => (
                                        <th key={`h-${day}`} className="sticky top-0 z-10 bg-slate-50 border-b border-r border-gray-300 p-2 w-[70px] min-w-[70px] text-center font-bold text-slate-700">
                                            {day}
                                        </th>
                                    ))}
                                    
                                    {/* Sum Header */}
                                    <th className="sticky top-0 right-0 z-20 bg-[#fef08a] text-[#854d0e] border-b border-l border-slate-300 p-2 w-[85px] min-w-[85px] text-center font-bold">
                                        Sum
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Pre-calculate rowSpans for P/No column
                                    const pnoRowSpans = new Array(matrix.length).fill(1);
                                    for (let i = 0; i < matrix.length; i++) {
                                        if (pnoRowSpans[i] === 0) continue;
                                        let span = 1;
                                        for (let j = i + 1; j < matrix.length; j++) {
                                            if (matrix[j].product_name === matrix[i].product_name) {
                                                span++;
                                                pnoRowSpans[j] = 0;
                                            } else {
                                                break;
                                            }
                                        }
                                        pnoRowSpans[i] = span * 2; // * 2 because each matrix row has Plan & Act rows
                                    }

                                    return matrix.map((row, index) => {
                                        // Calculate sums
                                        const planSum = daysArray.reduce((acc, d) => acc + Number(row.plan[d] || 0), 0);
                                        const actSum = daysArray.reduce((acc, d) => acc + Number(row.actual[d] || 0), 0);
                                        
                                        const showPnoCell = pnoRowSpans[index] > 0;
                                        const pnoRowSpan = pnoRowSpans[index];
                                        const isLastRowForProduct = index === matrix.length - 1 || matrix[index + 1].product_name !== row.product_name;

                                        return (
                                            <React.Fragment key={row.id}>
                                                {/* --- Plan Row --- */}
                                                <tr className="bg-[#f0fdf4]">
                                                    {/* P/No - Read Only (Merged if same) */}
                                                    {showPnoCell && (
                                                        <td className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 p-2 product-group-end-cell" rowSpan={pnoRowSpan}>
                                                            <span className="text-[0.85rem] font-bold text-slate-700 block truncate" title={row.product_name}>
                                                                {row.product_name || <span className="text-textMuted italic text-xs">ไม่ระบุ</span>}
                                                            </span>
                                                        </td>
                                                    )}
                                                {/* Process */}
                                                <td className={`sticky left-[140px] z-10 bg-slate-50 border-r border-slate-200 p-0 ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`} rowSpan={2}>
                                                    <div className="flex flex-col h-full justify-center">
                                                        <input 
                                                            type="text" 
                                                            className="w-full p-2 pb-1 bg-transparent border-none text-[0.85rem] font-bold outline-none text-slate-700"
                                                            value={row.process}
                                                            onChange={(e) => handleProductChange(index, 'process', e.target.value)}
                                                            placeholder="พิมพ์ Process..."
                                                        />
                                                        {(() => {
                                                            const wh = warehouses.find(w => w.id === row.target_warehouse_id);
                                                            return (
                                                                <div className="px-2 pb-2 text-[0.7rem] text-slate-500 truncate" title={wh ? `ปลายทาง: ${wh.name}` : 'ไม่ระบุปลายทาง'}>
                                                                    ➔ {wh ? wh.name : '-'}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                {/* Type: Plan */}
                                                <td className="sticky left-[240px] z-10 bg-[#dcfce7] border-b border-r border-slate-200 p-2 font-bold text-center text-[#166534] whitespace-nowrap">(Plan)</td>
                                                
                                                {/* Plan Data Cells */}
                                                {daysArray.map(day => (
                                                    <td key={`p-${day}`} className="border-b border-r border-gray-300 p-0 bg-[#f0fdf4]">
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-full p-2 text-center bg-transparent border-none outline-none focus:bg-green-100 text-[0.85rem] font-medium text-gray-700"
                                                            value={row.plan[day] || ''}
                                                            onChange={(e) => handlePlanChange(index, day, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                                
                                                {/* Plan Sum */}
                                                <td className="sticky right-0 z-10 bg-[#fef9c3] text-[#854d0e] border-b border-l border-slate-200 p-2 text-center font-bold">
                                                    {planSum > 0 ? planSum.toLocaleString() : '0'}
                                                </td>
                                            </tr>

                                            {/* --- Actual Row --- */}
                                            <tr className="bg-[#eff6ff]">
                                                {/* Type: Act. */}
                                                <td className={`sticky left-[240px] z-10 bg-[#dbeafe] border-r border-slate-200 p-2 font-bold text-center text-[#1d4ed8] whitespace-nowrap ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`}>Act.</td>
                                                
                                                {/* Actual Data Cells */}
                                                {daysArray.map(day => (
                                                    <td key={`a-${day}`} className={`border-r border-gray-300 p-2 text-center text-[#1d4ed8] font-semibold bg-[#eff6ff] ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`}>
                                                        {row.actual[day] > 0 ? row.actual[day].toLocaleString() : ''}
                                                    </td>
                                                ))}
                                                
                                                {/* Actual Sum */}
                                                <td className="sticky right-0 z-10 bg-[#fef9c3] text-[#854d0e] border-b-2 border-b-border border-l border-slate-200 p-2 text-center font-bold">
                                                    {actSum > 0 ? actSum.toLocaleString() : '0'}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                });
                                })()}
                                
                                {matrix.length === 0 && (
                                    <tr>
                                        <td colSpan={daysArray.length + 4} className="p-8 text-center text-textMuted bg-card">
                                            ยังไม่มีรายการสินค้า กดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มต้นตั้งเป้าหมาย
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            <datalist id="inventory-list">
                {inventoryItems.map((item, idx) => (
                    <option key={idx} value={item.product_name} />
                ))}
            </datalist>

            <div className="flex justify-end mt-6">
                <button onClick={handleSave} disabled={isSaving || isLoading} className="btn btn-primary btn-lg w-[200px] justify-center">
                    <Save size={20} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย'}
                </button>
            </div>
        </div>
    );
};

export default ProductionPlanFormPage;
