import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Factory, Calendar, ChevronLeft, ChevronRight, Maximize2, Minimize2, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { employeeService } from '../services/employeeService';
import { warehouseService } from '../services/warehouseService';
import { productionMaterialService } from '../services/productionMaterialService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductionDailyLogPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { user } = useAuth();
    
    const { month: urlMonth, lineId: urlLineId } = useParams();
    const initialMonth = urlMonth || new Date().toISOString().slice(0,7);
    
    const [month, setMonth] = useState(initialMonth);
    const [lineId, setLineId] = useState(urlLineId || '');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [lines, setLines] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [machines, setMachines] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    
    // Matrix format: array of { id, product_name, process, inventory_id, target_warehouse_id, plan: {1: 10}, actual: {1: 9}, defect: {1: 0}, logs: {1: []}, requisition_sum: 0, isVirtual: boolean }
    const [matrix, setMatrix] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState(31);
    
    // Modal State
    const [selectedCell, setSelectedCell] = useState(null);

    useEffect(() => {
        loadBaseData();
    }, []);

    useEffect(() => {
        if (month && lineId) {
            const [y, m] = month.split('-');
            setDaysInMonth(new Date(y, m, 0).getDate());
            loadPlansAndLogs(month, lineId);
            productionService.getMachinesByLine(lineId).then(setMachines).catch(console.error);
        }
    }, [month, lineId]);

    const changeMonth = (offset) => {
        if (!month) return;
        const [y, m] = month.split('-');
        let newDate = new Date(parseInt(y), parseInt(m) - 1 + offset, 1);
        const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        setMonth(newMonthStr);
        navigate(`/dashboard/production/daily-log/edit/${newMonthStr}/${lineId}`, { replace: true });
    };

    const loadBaseData = async () => {
        setIsLoading(true);
        try {
            const [linesData, empsData, whData] = await Promise.all([
                productionService.getLines(),
                employeeService.getEmployees(),
                warehouseService.getWarehouses()
            ]);
            setLines(linesData);
            setEmployees(empsData || []);
            setWarehouses(whData || []);
            
            if (!urlLineId && linesData.length > 0) {
                setLineId(linesData[0].id);
                navigate(`/dashboard/production/daily-log/edit/${initialMonth}/${linesData[0].id}`, { replace: true });
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
            let currentLine = lines.find(l => l.id === lid);
            if (!currentLine) {
                const freshLines = await productionService.getLines();
                currentLine = freshLines.find(l => l.id === lid);
                if (freshLines.length > 0) setLines(freshLines);
            }

            const dateFrom = `${m}-01`;
            const dateTo = `${m}-${new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]), 0).getDate()}`;

            const [plansData, logsData, invData, reqsData] = await Promise.all([
                productionService.getPlansByMonthAndLine(m, lid),
                productionService.getLogsByMonthAndLine(m, lid),
                currentLine?.warehouse_ids?.length > 0 
                    ? warehouseService.getInventoryItemsByWarehouses(currentLine.warehouse_ids)
                    : Promise.resolve([]),
                productionMaterialService.getRequisitions({ line_id: lid, dateFrom, dateTo })
            ]);
            
            setInventoryItems(invData);

            const newMatrixMap = {};
            const getMapKey = (name, process) => `${name}|||${process || ''}`;

            // 1. Populate Available Products from Template
            if (currentLine?.processes_template?.length > 0 && invData) {
                currentLine.processes_template.forEach(group => {
                    if (!group.inventory_item_id) return;
                    const item = invData.find(i => i.id === group.inventory_item_id);
                    if (!item) return;

                    const steps = (group.steps || []).filter(s => {
                        if (typeof s === 'string') return s.trim() !== '';
                        return s && s.name && s.name.trim() !== '';
                    });

                    if (steps.length === 0) {
                        const key = getMapKey(item.product_name, '');
                        newMatrixMap[key] = {
                            id: key, product_name: item.product_name, process: '', inventory_id: item.id,
                            unit: item.unit, weight_unit: item.weight_unit, target_warehouse_id: group.target_warehouse_id || item.warehouse_id || null,
                            plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: 0, requisition_materials: new Set()
                        };
                    } else {
                        steps.forEach(step => {
                            const stepName = typeof step === 'string' ? step : step.name;
                            const stepTargetWh = typeof step === 'string' ? null : (step.target_warehouse_id || null);
                            const key = getMapKey(item.product_name, stepName);
                            newMatrixMap[key] = {
                                id: key, product_name: item.product_name, process: stepName, inventory_id: item.id,
                                unit: item.unit, weight_unit: item.weight_unit, target_warehouse_id: stepTargetWh || group.target_warehouse_id || item.warehouse_id || null,
                                plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: 0, requisition_materials: new Set()
                            };
                        });
                    }
                });
            }

            // 2. Populate Plans
            plansData.forEach(p => {
                const day = parseInt(p.plan_date.split('-')[2], 10);
                const key = getMapKey(p.product_name, p.process);
                if (!newMatrixMap[key]) {
                    newMatrixMap[key] = { 
                        id: key, product_name: p.product_name, process: p.process || '', inventory_id: null,
                        unit: p.unit, weight_unit: 'KG', target_warehouse_id: p.target_warehouse_id, plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: 0, requisition_materials: new Set()
                    };
                }
                
                if (p.target_warehouse_id && !newMatrixMap[key].target_warehouse_id) {
                    newMatrixMap[key].target_warehouse_id = p.target_warehouse_id;
                }

                newMatrixMap[key].plan[day] = {
                    plan_id: p.id,
                    target_quantity: p.target_quantity
                };
            });

            // 3. Populate Actuals from Logs
            logsData.forEach(l => {
                const day = parseInt(l.log_date.split('-')[2], 10);
                const pName = l.production_plans?.product_name || 'Unknown';
                const pProcess = l.production_plans?.process || '';
                const key = getMapKey(pName, pProcess);
                
                if (!newMatrixMap[key]) {
                    newMatrixMap[key] = { 
                        id: key, product_name: pName, process: pProcess, inventory_id: null,
                        unit: l.production_plans?.unit || 'PCS', weight_unit: 'KG', target_warehouse_id: l.production_plans?.target_warehouse_id, plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: 0, requisition_materials: new Set()
                    };
                }
                
                if (l.production_plans?.target_warehouse_id && !newMatrixMap[key].target_warehouse_id) {
                    newMatrixMap[key].target_warehouse_id = l.production_plans.target_warehouse_id;
                }
                
                if (!newMatrixMap[key].actual[day]) newMatrixMap[key].actual[day] = 0;
                newMatrixMap[key].actual[day] += Number(l.quantity_produced || 0);
                
                if (!newMatrixMap[key].defect[day]) newMatrixMap[key].defect[day] = 0;
                newMatrixMap[key].defect[day] += Number(l.quantity_defect || 0);
                
                if (!newMatrixMap[key].logs[day]) newMatrixMap[key].logs[day] = [];
                newMatrixMap[key].logs[day].push(l);
            });

            // 4. Map Requisitions Sum
            reqsData.forEach(req => {
                let targetProductName = req.target_plan?.product_name;
                let targetProcess = req.target_plan?.process || '';
                
                (req.items || []).forEach(item => {
                    const qty = Number(item.quantity || 0);
                    
                    // Fallback: If no target_plan, try to find product name in the notes!
                    if (!targetProductName && item.notes) {
                        const knownProducts = [...new Set(Object.values(newMatrixMap).map(r => r.product_name))];
                        for (const p of knownProducts) {
                            if (item.notes.includes(p)) {
                                targetProductName = p;
                                const matchingKeys = Object.keys(newMatrixMap).filter(k => newMatrixMap[k].product_name === p);
                                if (matchingKeys.length > 0) {
                                    targetProcess = newMatrixMap[matchingKeys[0]].process;
                                }
                                break;
                            }
                        }
                    }
                    
                    if (targetProductName) {
                        // Map to the specific target product and process from the requisition
                        const key = getMapKey(targetProductName, targetProcess);
                        if (newMatrixMap[key]) {
                            newMatrixMap[key].requisition_sum += qty;
                            if (item.warehouse_inventory?.product_name) newMatrixMap[key].requisition_materials.add(item.warehouse_inventory.product_name);
                        } else {
                            // If the plan was somehow deleted but requisition remains
                            newMatrixMap[key] = { 
                                id: key, product_name: targetProductName, process: targetProcess, inventory_id: null,
                                unit: 'PCS', weight_unit: 'KG', target_warehouse_id: null,
                                plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: qty, requisition_materials: new Set(item.warehouse_inventory?.product_name ? [item.warehouse_inventory.product_name] : [])
                            };
                        }
                    } else {
                        // Orphan requisition (no target plan). Show it as a separate raw material row so it's not lost.
                        const pName = item.warehouse_inventory?.product_name;
                        if (pName) {
                            const key = getMapKey(pName, 'วัตถุดิบ (ไม่ระบุเป้า)');
                            if (!newMatrixMap[key]) {
                                newMatrixMap[key] = { 
                                    id: key, product_name: pName, process: 'วัตถุดิบ (ไม่ระบุเป้า)', inventory_id: item.inventory_id,
                                    unit: item.unit || 'PCS', weight_unit: 'KG', target_warehouse_id: null,
                                    plan: {}, actual: {}, defect: {}, logs: {}, requisition_sum: 0, requisition_materials: new Set()
                                };
                            }
                            newMatrixMap[key].requisition_sum += qty;
                        }
                    }
                });
            });

            setMatrix(Object.values(newMatrixMap));
        } catch (error) {
            console.error(error);
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูลเป้าหมายและผลผลิตจริง');
        } finally {
            setIsLoading(false);
        }
    };

    const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const handleCellClick = (row, day) => {
        // Initialize an empty log if none exist
        const existingLogs = row.logs[day] || [];
        const initialLogs = existingLogs.length > 0 ? [...existingLogs] : [{
            id: `temp-${Date.now()}`,
            employee_id: '',
            machine_id: '',
            quantity_produced: '',
            quantity_defect: '',
            defect_reason: '',
            weight_produced: ''
        }];
        
        setSelectedCell({
            row,
            day,
            dateStr: `${month}-${String(day).padStart(2, '0')}`,
            logs: initialLogs
        });
    };

    const saveCellLogs = async () => {
        if (!selectedCell) return;
        
        const { row, day, dateStr, logs } = selectedCell;
        
        // Validate
        const validLogs = logs.filter(l => l.employee_id && (Number(l.quantity_produced) > 0 || Number(l.quantity_defect) > 0));
        
        if (validLogs.length === 0 && logs.length > 0 && logs.some(l => l.employee_id || l.quantity_produced || l.quantity_defect)) {
             const isConfirmed = await showConfirm('มีรายการที่กรอกข้อมูลไม่ครบ (ต้องระบุพนักงานและจำนวน) ยืนยันที่จะบันทึกเฉพาะรายการที่สมบูรณ์หรือไม่?');
             if(!isConfirmed) return;
        }

        try {
            // Check if plan exists for this day
            let planId = row.plan[day]?.plan_id;
            
            // If no plan, auto-create a virtual plan (target = 0)
            if (!planId) {
                const planData = {
                    line_id: lineId,
                    plan_month: month,
                    plan_date: dateStr,
                    product_name: row.product_name,
                    process: row.process || '',
                    target_warehouse_id: null,
                    target_quantity: 0,
                    unit: row.unit || 'PCS',
                    created_by: user.id
                };
                const newPlanRes = await productionService.createSimplePlan(planData);
                planId = newPlanRes.id;
            }

            // Prepare logs
            const logsToSave = validLogs.map(l => {
                const emp = employees.find(e => e.id === l.employee_id);
                const mac = machines.find(m => m.id === l.machine_id);
                return {
                    id: l.id.toString().startsWith('temp-') ? undefined : l.id,
                    plan_id: planId,
                    line_id: lineId,
                    log_date: dateStr,
                    employee_id: l.employee_id,
                    employee_name: emp ? `${emp.full_name} ${emp.nickname ? `(${emp.nickname})` : ''}`.trim() : 'Unknown',
                    machine_id: l.machine_id || null,
                    machine_name: mac ? mac.name : null,
                    quantity_produced: Number(l.quantity_produced || 0),
                    quantity_defect: Number(l.quantity_defect || 0),
                    defect_reason: l.defect_reason || '',
                    weight_produced: Number(l.weight_produced || 0)
                };
            });

            // Find logs to delete (existed before, but removed in modal)
            const oldLogs = row.logs[day] || [];
            const idsToKeep = validLogs.filter(l => !l.id.toString().startsWith('temp-')).map(l => l.id);
            const logsToDelete = oldLogs.filter(l => !idsToKeep.includes(l.id));

            if (logsToDelete.length > 0) {
                await Promise.all(logsToDelete.map(l => productionService.deleteDailyLog(l.id)));
            }
            
            if (logsToSave.length > 0) {
                await productionService.saveDailyLogs(logsToSave);
            }

            showAlert('บันทึกผลผลิตสำเร็จ', 'success');
            setSelectedCell(null);
            loadPlansAndLogs(month, lineId);
            
        } catch (error) {
            console.error(error);
            showError('เกิดข้อผิดพลาดในการบันทึกผลผลิต');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <PageHeader 
                title="บันทึกผลผลิตรายวัน (ตารางรายเดือน)" 
                description="บันทึกยอดผลิตและของเสียรายวัน โดยคลิกที่ช่องวันที่ (แถว Act.) เพื่อลงรายละเอียดพนักงาน" 
            />

            <div className="glass-panel p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2">เดือน (Month)</label>
                        <div className="flex items-center gap-2">
                            <button className="btn btn-secondary px-3" onClick={() => changeMonth(-1)}>
                                <ChevronLeft size={20} />
                            </button>
                            <div className="relative flex-1">
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                                <input 
                                    type="month" 
                                    className="input w-full font-bold text-center cursor-pointer"
                                    value={month}
                                    onChange={(e) => {
                                        setMonth(e.target.value);
                                        navigate(`/dashboard/production/daily-log/edit/${e.target.value}/${lineId}`, { replace: true });
                                    }}
                                />
                            </div>
                            <button className="btn btn-secondary px-3" onClick={() => changeMonth(1)}>
                                <ChevronRight size={20} />
                            </button>
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
                                onChange={(e) => {
                                    setLineId(e.target.value);
                                    navigate(`/dashboard/production/daily-log/edit/${month}/${e.target.value}`, { replace: true });
                                }}
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
                    .product-group-end-cell {
                        border-bottom: 3px solid #1e293b !important;
                    }
                    .step-end-cell {
                        border-bottom: 1.5px solid #94a3b8 !important;
                    }
                `}} />
                <div className="p-4 border-b border-border flex justify-between items-center bg-bgMain rounded-t-xl">
                    <h3 className="font-bold text-primary m-0">ตารางผลผลิตรายเดือน</h3>
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
                                    <th className="sticky top-0 left-0 z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[140px] min-w-[140px] text-center text-[#1e3a8a] font-bold">P/No</th>
                                    <th className="sticky top-0 left-[140px] z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[100px] min-w-[100px] text-center text-[#1e3a8a] font-bold">Process</th>
                                    <th className="sticky top-0 left-[240px] z-20 bg-slate-100 border-b border-r border-slate-300 p-2 w-[60px] min-w-[60px] text-center text-slate-700 font-bold">Type</th>
                                    
                                    {daysArray.map(day => (
                                        <th key={`h-${day}`} className="sticky top-0 z-10 bg-slate-50 border-b border-r border-gray-300 p-2 w-[50px] min-w-[50px] text-center font-bold text-slate-700">
                                            {day}
                                        </th>
                                    ))}
                                    
                                    <th className="sticky top-0 right-0 z-20 bg-[#fef08a] text-[#854d0e] border-b border-l border-slate-300 p-2 w-[85px] min-w-[85px] text-center font-bold">
                                        Sum
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
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
                                        pnoRowSpans[i] = span * 3;
                                    }

                                    return matrix.map((row, index) => {
                                        const planSum = daysArray.reduce((acc, d) => acc + Number(row.plan[d]?.target_quantity || 0), 0);
                                        const actSum = daysArray.reduce((acc, d) => acc + Number(row.actual[d] || 0), 0);
                                        
                                        const showPnoCell = pnoRowSpans[index] > 0;
                                        const pnoRowSpan = pnoRowSpans[index];
                                        const isLastRowForProduct = index === matrix.length - 1 || matrix[index + 1].product_name !== row.product_name;

                                        return (
                                            <React.Fragment key={row.id}>
                                                {/* --- Plan Row --- */}
                                                <tr className="bg-[#f0fdf4]">
                                                    {showPnoCell && (
                                                        <td className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 p-2 product-group-end-cell" rowSpan={pnoRowSpan}>
                                                            <span className="text-[0.85rem] font-bold text-slate-700 block truncate" title={row.product_name}>
                                                                {row.product_name}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className={`sticky left-[140px] z-10 bg-slate-50 border-r border-slate-200 p-2 ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`} rowSpan={3}>
                                                        <div className="flex flex-col h-full justify-center">
                                                            <span className="font-bold text-slate-700">{row.process || <span className="text-slate-400 italic">FG</span>}</span>
                                                            {(() => {
                                                                const wh = warehouses.find(w => w.id === row.target_warehouse_id);
                                                                return (
                                                                    <div className="text-[0.7rem] text-slate-500 mt-1" title={wh ? `ปลายทาง: ${wh.name}` : 'ไม่ระบุปลายทาง'}>
                                                                        ➔ {wh ? wh.name : '-'}
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="text-[0.7rem] text-orange-600 mt-1 font-bold">
                                                                เบิก{row.requisition_materials && row.requisition_materials.size > 0 ? ` (${Array.from(row.requisition_materials).join(', ')})` : ''}: {row.requisition_sum > 0 ? row.requisition_sum.toLocaleString() : '0'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="sticky left-[240px] z-10 bg-[#dcfce7] border-b border-r border-slate-200 p-2 font-bold text-center text-[#166534] whitespace-nowrap">(Plan)</td>
                                                    
                                                    {daysArray.map(day => (
                                                        <td key={`p-${day}`} className="border-b border-r border-gray-300 p-2 text-center text-gray-700 text-[0.8rem] bg-[#f0fdf4]">
                                                            {row.plan[day]?.target_quantity > 0 ? row.plan[day].target_quantity.toLocaleString() : ''}
                                                        </td>
                                                    ))}
                                                    
                                                    <td className="sticky right-0 z-10 bg-[#fef9c3] text-[#854d0e] border-b border-l border-slate-200 p-2 text-center font-bold">
                                                        {planSum > 0 ? planSum.toLocaleString() : '0'}
                                                    </td>
                                                </tr>

                                                {/* --- Actual Row --- */}
                                                <tr className="bg-[#eff6ff]">
                                                    <td className={`sticky left-[240px] z-10 bg-[#dbeafe] border-r border-slate-200 p-2 font-bold text-center text-[#1d4ed8] whitespace-nowrap`}>Act.</td>
                                                    
                                                    {daysArray.map(day => {
                                                        const isToday = new Date().toISOString().slice(0, 10) === `${month}-${String(day).padStart(2, '0')}`;
                                                        return (
                                                            <td 
                                                                key={`a-${day}`} 
                                                                onClick={() => handleCellClick(row, day)}
                                                                className={`border-r border-gray-300 p-2 text-center text-[#1d4ed8] font-bold cursor-pointer hover:bg-blue-200 transition-colors ${isToday ? 'bg-blue-100 ring-1 ring-inset ring-blue-400' : 'bg-[#eff6ff]'}`}
                                                                title="คลิกเพื่อลงผลผลิต"
                                                            >
                                                                {row.actual[day] > 0 ? row.actual[day].toLocaleString() : <span className="opacity-0 group-hover:opacity-100 text-blue-300 text-xs">+</span>}
                                                            </td>
                                                        );
                                                    })}
                                                    
                                                    <td className="sticky right-0 z-10 bg-[#fef9c3] text-[#854d0e] border-b-2 border-b-border border-l border-slate-200 p-2 text-center font-bold">
                                                        {actSum > 0 ? actSum.toLocaleString() : '0'}
                                                    </td>
                                                </tr>

                                                {/* --- Defect Row --- */}
                                                <tr className="bg-[#fef2f2]">
                                                    <td className={`sticky left-[240px] z-10 bg-[#fee2e2] border-r border-slate-200 p-2 font-bold text-center text-[#b91c1c] whitespace-nowrap ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`}>ของเสีย</td>
                                                    
                                                    {daysArray.map(day => (
                                                        <td 
                                                            key={`d-${day}`} 
                                                            className={`border-r border-gray-300 p-2 text-center text-[#b91c1c] font-medium bg-[#fef2f2] ${isLastRowForProduct ? 'product-group-end-cell' : 'step-end-cell'}`}
                                                        >
                                                            {row.defect[day] > 0 ? row.defect[day].toLocaleString() : ''}
                                                        </td>
                                                    ))}
                                                    
                                                    {(() => {
                                                        const defectSum = daysArray.reduce((acc, d) => acc + Number(row.defect[d] || 0), 0);
                                                        return (
                                                            <td className="sticky right-0 z-10 bg-[#fef9c3] text-[#854d0e] border-b-2 border-b-border border-l border-slate-200 p-2 text-center font-bold">
                                                                {defectSum > 0 ? defectSum.toLocaleString() : '0'}
                                                            </td>
                                                        );
                                                    })()}
                                                </tr>
                                            </React.Fragment>
                                        );
                                    });
                                })()}
                                
                                {matrix.length === 0 && (
                                    <tr>
                                        <td colSpan={daysArray.length + 4} className="p-8 text-center text-textMuted bg-card">
                                            ยังไม่มีรายการสินค้าสำหรับแผนกนี้
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Daily Log Modal */}
            {selectedCell && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in border border-border">
                        <div className="flex justify-between items-center p-5 border-b border-border bg-bgMain">
                            <div>
                                <h2 className="text-xl font-bold text-primary flex items-center gap-2 m-0">
                                    <CheckCircle2 size={24} />
                                    บันทึกผลผลิตประจำวันที่ {parseInt(selectedCell.dateStr.split('-')[2], 10)} {new Date(selectedCell.dateStr).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                </h2>
                                <p className="text-sm text-textMuted mt-1 mb-0 font-medium">
                                    รายการ: <strong className="text-textMain">{selectedCell.row.product_name}</strong>
                                    {selectedCell.row.process && <> ขั้นตอน: <strong className="text-textMain">{selectedCell.row.process}</strong></>}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedCell(null)} 
                                className="text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer p-2 flex items-center justify-center rounded-full hover:bg-slate-100"
                            >
                                <X size={20} className="text-textMuted" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-700 m-0">ตารางลงผลผลิต (แยกตามพนักงาน)</h3>
                                <button 
                                    className="btn btn-secondary btn-sm border-dashed bg-white"
                                    onClick={() => {
                                        setSelectedCell({
                                            ...selectedCell,
                                            logs: [...selectedCell.logs, {
                                                id: `temp-${Date.now()}`,
                                                employee_id: '',
                                                machine_id: '',
                                                quantity_produced: '',
                                                quantity_defect: '',
                                                defect_reason: '',
                                                weight_produced: ''
                                            }]
                                        })
                                    }}
                                >
                                    <Plus size={16} className="mr-1" /> เพิ่มแถว
                                </button>
                            </div>
                            
                            <div className="glass-panel overflow-hidden border border-border bg-white">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-border text-slate-600 text-[0.85rem]">
                                                <th className="py-2.5 px-3">พนักงาน <span className="text-red-500">*</span></th>
                                                <th className="py-2.5 px-3">เครื่องจักร</th>
                                                <th className="py-2.5 px-3 w-[120px]">ยอดดี ({selectedCell.row.unit})</th>
                                                <th className="py-2.5 px-3 w-[100px]">ของเสีย</th>
                                                <th className="py-2.5 px-3 w-[150px]">สาเหตุ</th>
                                                <th className="py-2.5 px-3 w-[120px]">น้ำหนัก ({selectedCell.row.weight_unit})</th>
                                                <th className="py-2.5 px-3 w-[50px]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCell.logs.map((log, index) => (
                                                <tr key={log.id} className="border-b border-border/50 hover:bg-slate-50">
                                                    <td className="py-2 px-2">
                                                        <select 
                                                            className="input input-sm w-full font-medium"
                                                            value={log.employee_id || ''}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].employee_id = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        >
                                                            <option value="">-- เลือกพนักงาน --</option>
                                                            {employees.map(e => (
                                                                <option key={e.id} value={e.id}>{e.full_name} {e.nickname ? `(${e.nickname})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <select 
                                                            className="input input-sm w-full"
                                                            value={log.machine_id || ''}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].machine_id = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        >
                                                            <option value="">-- เครื่องจักร --</option>
                                                            {machines.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="0" min="0" step="any"
                                                            className="input input-sm w-full text-right font-bold text-green-700 bg-green-50/50"
                                                            value={log.quantity_produced === 0 ? '' : (log.quantity_produced || '')}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].quantity_produced = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="0" min="0" step="any"
                                                            className="input input-sm w-full text-right font-bold text-red-600 bg-red-50/50"
                                                            value={log.quantity_defect === 0 ? '' : (log.quantity_defect || '')}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].quantity_defect = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="ระบุสาเหตุ..." 
                                                            className="input input-sm w-full"
                                                            value={log.defect_reason || ''}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].defect_reason = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="0" min="0" step="any"
                                                            className="input input-sm w-full text-right"
                                                            value={log.weight_produced === 0 ? '' : (log.weight_produced || '')}
                                                            onChange={(e) => {
                                                                const newLogs = [...selectedCell.logs];
                                                                newLogs[index].weight_produced = e.target.value;
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <button 
                                                            type="button"
                                                            className="text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 transition-colors border-0 cursor-pointer p-2 rounded-xl flex items-center justify-center"
                                                            onClick={() => {
                                                                const newLogs = selectedCell.logs.filter((_, i) => i !== index);
                                                                setSelectedCell({ ...selectedCell, logs: newLogs });
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedCell.logs.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="py-8 text-center text-slate-500 bg-slate-50">
                                                        กรุณากด "เพิ่มแถว" เพื่อใส่ข้อมูลพนักงานและยอดผลิต
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {selectedCell.logs.length > 0 && (
                                            <tfoot className="bg-slate-100/50">
                                                <tr className="font-bold">
                                                    <td colSpan="2" className="py-3 px-4 text-right text-slate-600">รวมของวันนี้:</td>
                                                    <td className="py-3 px-2 text-right text-green-700">
                                                        {selectedCell.logs.reduce((sum, l) => sum + Number(l.quantity_produced || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-2 text-right text-red-600">
                                                        {selectedCell.logs.reduce((sum, l) => sum + Number(l.quantity_defect || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td></td>
                                                    <td className="py-3 px-2 text-right text-slate-700">
                                                        {selectedCell.logs.reduce((sum, l) => sum + Number(l.weight_produced || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-bgMain flex justify-end gap-3">
                            <button className="btn btn-secondary" onClick={() => setSelectedCell(null)}>
                                ยกเลิก
                            </button>
                            <button className="btn btn-primary min-w-[140px] justify-center" onClick={saveCellLogs}>
                                <Save size={18} className="mr-2" /> บันทึกผลผลิต
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionDailyLogPage;
