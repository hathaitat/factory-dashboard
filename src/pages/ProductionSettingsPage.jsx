import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, Factory, MonitorPlay, Package, CheckSquare, Square } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionService } from '../services/productionService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';

const ProductionSettingsPage = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert, showError } = useDialog();
    const { hasPermission } = usePermissions();

    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([]);
    const [machines, setMachines] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedLineId, setSelectedLineId] = useState(null);

    // Line Modal States
    const [isLineModalOpen, setIsLineModalOpen] = useState(false);
    const [lineFormData, setLineFormData] = useState({ id: null, name: '', code: '', description: '', status: 'active', warehouse_ids: [] });
    const [isEditingMode, setIsEditingMode] = useState(false);

    // Machine Modal States
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [machineFormData, setMachineFormData] = useState({ id: null, name: '', code: '', description: '', status: 'active' });
    const [isEditingMachineMode, setIsEditingMachineMode] = useState(false);

    // Item Binding States (Now used in Line Modal)
    const [availableItems, setAvailableItems] = useState([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Permissions check
    const canEdit = hasPermission('production', 'edit') || hasPermission('production', 'create');
    const canDelete = hasPermission('production', 'delete');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedLineId) {
            loadMachines(selectedLineId);
        } else {
            setMachines([]);
        }
    }, [selectedLineId]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [linesData, whData] = await Promise.all([
                productionService.getLines(),
                warehouseService.getWarehouses()
            ]);
            setLines(linesData);
            setWarehouses(whData || []);
            if (linesData.length > 0 && !selectedLineId) {
                setSelectedLineId(linesData[0].id);
            }
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนกการผลิต');
        } finally {
            setIsLoading(false);
        }
    };

    const loadLines = async () => {
        try {
            const data = await productionService.getLines();
            setLines(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadMachines = async (lineId) => {
        try {
            const data = await productionService.getMachinesByLine(lineId);
            setMachines(data);
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูลเครื่องจักร');
        }
    };

    // --- Line Actions ---
    const openAddLineModal = () => {
        setLineFormData({ id: null, name: '', code: '', description: '', status: 'active', warehouse_ids: [], processes_template: [] });
        setIsEditingMode(false);
        setIsLineModalOpen(true);
        setAvailableItems([]);
    };

    const openEditLineModal = async (line) => {
        setLineFormData({ ...line, processes_template: line.processes_template || [] });
        setIsEditingMode(true);
        setIsLineModalOpen(true);
        
        setIsLoadingItems(true);
        try {
            if (line.warehouse_ids && line.warehouse_ids.length > 0) {
                const items = await warehouseService.getInventoryItemsByWarehouses(line.warehouse_ids);
                setAvailableItems(items || []);
            } else {
                setAvailableItems([]);
            }
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการโหลดรายการสินค้า');
        } finally {
            setIsLoadingItems(false);
        }
    };

    const handleSaveLine = async () => {
        try {
            if (!lineFormData.name || !lineFormData.code) {
                return showAlert('กรุณากรอกรหัสและชื่อแผนกให้ครบถ้วน', 'warning');
            }

            const payload = { ...lineFormData };
            if (!isEditingMode) {
                delete payload.id;
                await productionService.createLine(payload);
                showAlert('เพิ่มแผนกสำเร็จ', 'success');
            } else {
                await productionService.updateLine(lineFormData.id, lineFormData);
                showAlert('อัปเดตแผนกสำเร็จ', 'success');
            }
            setIsLineModalOpen(false);
            loadLines();
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการบันทึกแผนก');
        }
    };

    const handleDeleteLine = async (id, name) => {
        const confirmed = await showConfirm(`คุณต้องการลบแผนก "${name}" ใช่หรือไม่?\n⚠️ การลบแผนกจะลบเครื่องจักรที่อยู่ภายในทั้งหมด`);
        if (confirmed) {
            try {
                await productionService.deleteLine(id);
                showAlert('ลบแผนกสำเร็จ', 'success');
                if (selectedLineId === id) setSelectedLineId(null);
                loadLines();
            } catch (error) {
                showError('ไม่สามารถลบได้ อาจมีข้อมูลที่เกี่ยวข้องอยู่');
            }
        }
    };

    // Handle Checkbox for Warehouses
    const handleWarehouseToggle = async (warehouseId) => {
        const currentIds = lineFormData.warehouse_ids || [];
        const newIds = currentIds.includes(warehouseId)
            ? currentIds.filter(id => id !== warehouseId)
            : [...currentIds, warehouseId];
        
        setLineFormData(prev => ({ ...prev, warehouse_ids: newIds }));

        // Refetch available items based on new warehouse selection
        setIsLoadingItems(true);
        try {
            if (newIds.length > 0) {
                const items = await warehouseService.getInventoryItemsByWarehouses(newIds);
                setAvailableItems(items || []);
            } else {
                setAvailableItems([]);
            }
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการโหลดรายการสินค้า');
        } finally {
            setIsLoadingItems(false);
        }
    };

    // New Item-Group handlers
    const handleAddItemGroup = () => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: [
                ...(prev.processes_template || []),
                { id: Date.now().toString(), inventory_item_id: '', target_warehouse_id: '', steps: [{ name: '', target_warehouse_id: '' }] }
            ]
        }));
    };

    const handleUpdateItemGroup = (groupId, field, value) => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: (prev.processes_template || []).map(g =>
                g.id === groupId ? { ...g, [field]: value } : g
            )
        }));
    };

    const handleRemoveItemGroup = (groupId) => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: (prev.processes_template || []).filter(g => g.id !== groupId)
        }));
    };

    const handleAddStep = (groupId) => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: (prev.processes_template || []).map(g =>
                g.id === groupId ? { ...g, steps: [...(g.steps || []), { name: '', target_warehouse_id: '' }] } : g
            )
        }));
    };

    const handleUpdateStep = (groupId, stepIndex, field, value) => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: (prev.processes_template || []).map(g => {
                if (g.id !== groupId) return g;
                const newSteps = [...(g.steps || [])];
                const currentStep = newSteps[stepIndex];
                
                if (typeof currentStep === 'string') {
                    newSteps[stepIndex] = { name: currentStep, target_warehouse_id: '' };
                }
                
                if (field === 'name' && typeof currentStep === 'string') {
                    newSteps[stepIndex].name = value;
                } else {
                    newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
                }
                
                return { ...g, steps: newSteps };
            })
        }));
    };

    const handleRemoveStep = (groupId, stepIndex) => {
        setLineFormData(prev => ({
            ...prev,
            processes_template: (prev.processes_template || []).map(g => {
                if (g.id !== groupId) return g;
                const newSteps = (g.steps || []).filter((_, i) => i !== stepIndex);
                return { ...g, steps: newSteps };
            })
        }));
    };

    // --- Machine Actions ---
    const openAddMachineModal = () => {
        setMachineFormData({ id: null, name: '', code: '', description: '', status: 'active' });
        setIsEditingMachineMode(false);
        setIsMachineModalOpen(true);
    };

    const openEditMachineModal = (machine) => {
        setMachineFormData({ ...machine });
        setIsEditingMachineMode(true);
        setIsMachineModalOpen(true);
    };

    const handleSaveMachine = async () => {
        try {
            if (!machineFormData.name) {
                return showAlert('กรุณากรอกชื่อเครื่องจักร', 'warning');
            }

            const payload = { ...machineFormData, line_id: selectedLineId };

            if (!isEditingMachineMode) {
                delete payload.id;
                await productionService.createMachine(payload);
                showAlert('เพิ่มเครื่องจักรสำเร็จ', 'success');
            } else {
                await productionService.updateMachine(machineFormData.id, payload);
                showAlert('อัปเดตเครื่องจักรสำเร็จ', 'success');
            }
            setIsMachineModalOpen(false);
            loadMachines(selectedLineId);
        } catch (error) {
            showError('เกิดข้อผิดพลาดในการบันทึกเครื่องจักร');
        }
    };

    const handleDeleteMachine = async (id, name) => {
        const confirmed = await showConfirm(`คุณต้องการลบเครื่องจักร "${name}" ใช่หรือไม่?`);
        if (confirmed) {
            try {
                await productionService.deleteMachine(id);
                showAlert('ลบเครื่องจักรสำเร็จ', 'success');
                loadMachines(selectedLineId);
            } catch (error) {
                showError('ไม่สามารถลบได้ อาจมีข้อมูลที่เกี่ยวข้องอยู่');
            }
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="p-6">
            <button onClick={() => navigate('/dashboard/production')} className="btn btn-secondary mb-4">
                ← กลับหน้าหลักการผลิต
            </button>
            <PageHeader
                title="ตั้งค่าแผนกการผลิตและเครื่องจักร"
                subtitle="จัดการสายการผลิตและเครื่องจักรที่ใช้"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* --- Section: Production Lines --- */}
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-primary m-0">
                            <Factory size={24} /> แผนกการผลิต
                        </h2>
                        {canEdit && (
                            <button className="btn btn-primary btn-sm" onClick={openAddLineModal}>
                                <Plus size={16} /> เพิ่มแผนก
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 pr-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-3 px-2 min-w-[120px]">จัดการ</th>
                                    <th className="py-3 px-2 min-w-[80px]">รหัส</th>
                                    <th className="py-3 px-2 w-[150px]">ชื่อแผนก</th>
                                    <th className="py-3 px-2">ผูกคลังสินค้า</th>
                                    <th className="py-3 px-2 text-center w-[100px]">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Existing lines */}
                                {lines.map(line => (
                                    <tr
                                        key={line.id}
                                        className={`border-b border-border cursor-pointer transition-all ${selectedLineId === line.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-main border-l-4 border-l-transparent'}`}
                                        onClick={() => setSelectedLineId(line.id)}
                                    >
                                        <td className="py-3 px-2 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                                            <div className="table-actions">
                                                {canEdit && (
                                                    <button onClick={() => openEditLineModal(line)} className="action-edit" title="แก้ไข">
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleDeleteLine(line.id, line.name)} className="action-delete" title="ลบ">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className="font-mono text-sm">{line.code}</span>
                                        </td>
                                        <td className="py-3 px-2 font-medium">
                                            {line.name}
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm text-textMuted flex flex-wrap gap-1">
                                                    {(line.warehouse_ids || []).length > 0 ? (
                                                        (line.warehouse_ids || []).map(wId => {
                                                            const wh = warehouses.find(w => w.id === wId);
                                                            return wh ? <span key={wId} className="bg-gray-200 px-2 py-0.5 rounded text-xs">{wh.name}</span> : null;
                                                        })
                                                    ) : (
                                                        <span className="text-gray-400 italic">ไม่ได้ผูกคลัง</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${line.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {line.status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {lines.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-textMuted">ไม่พบข้อมูลแผนกการผลิต</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Section: Production Machines --- */}
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-primary m-0">
                            <MonitorPlay size={24} /> เครื่องจักร
                            {selectedLineId && (
                                <span className="text-sm font-normal text-textMuted ml-2">
                                    (แผนก: {lines.find(l => l.id === selectedLineId)?.name})
                                </span>
                            )}
                        </h2>
                        {canEdit && selectedLineId && (
                            <button className="btn btn-primary btn-sm" onClick={openAddMachineModal}>
                                <Plus size={16} /> เพิ่มเครื่องจักร
                            </button>
                        )}
                    </div>

                    {!selectedLineId ? (
                        <div className="flex-1 flex items-center justify-center text-textMuted flex-col gap-2">
                            <Factory size={48} className="opacity-20" />
                            <p>กรุณาเลือกแผนกการผลิตทางซ้ายมือ</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 pr-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="py-3 px-2 min-w-[120px]">จัดการ</th>
                                        <th className="py-3 px-2">รหัสเครื่อง</th>
                                        <th className="py-3 px-2">ชื่อเครื่อง</th>
                                        <th className="py-3 px-2 text-center">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Existing machines */}
                                    {machines.map(machine => (
                                        <tr key={machine.id} className="border-b border-border hover:bg-main transition-colors">
                                            <td className="py-3 px-2 min-w-[120px]">
                                                <div className="table-actions">
                                                    {canEdit && (
                                                        <button onClick={() => openEditMachineModal(machine)} className="action-edit" title="แก้ไข">
                                                            <Edit2 size={18} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => handleDeleteMachine(machine.id, machine.name)} className="action-delete" title="ลบ">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className="font-mono text-sm">{machine.code || '-'}</span>
                                            </td>
                                            <td className="py-3 px-2 font-medium">
                                                {machine.name}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${machine.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {machine.status === 'active' ? 'ใช้งาน' : machine.status === 'maintenance' ? 'ซ่อมบำรุง' : 'ระงับ'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {machines.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-textMuted">ไม่พบข้อมูลเครื่องจักร</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Line Modal --- */}
            {isLineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-primary text-white rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <Factory size={20} />
                                {isEditingMode ? 'แก้ไขแผนกการผลิต' : 'เพิ่มแผนกการผลิต'}
                            </h3>
                            <button onClick={() => setIsLineModalOpen(false)} className="bg-transparent border-none p-1 text-white/80 hover:text-white cursor-pointer flex items-center justify-center">
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* 2-column body */}
                        <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border min-h-0">
                            {/* Left: Basic Info + Warehouses */}
                            <div className="p-5 flex flex-col gap-4 overflow-y-auto min-h-[300px]">
                                <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">ข้อมูลแผนก</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">รหัสแผนก <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            className="input w-full" 
                                            value={lineFormData.code} 
                                            onChange={(e) => setLineFormData({ ...lineFormData, code: e.target.value.toUpperCase() })} 
                                            placeholder="CNC-01" 
                                            autoFocus 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">สถานะ</label>
                                        <select 
                                            className="input w-full" 
                                            value={lineFormData.status} 
                                            onChange={(e) => setLineFormData({ ...lineFormData, status: e.target.value })}
                                        >
                                            <option value="active">✅ ใช้งาน</option>
                                            <option value="inactive">⛔ ระงับ</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">ชื่อแผนก <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        className="input w-full" 
                                        value={lineFormData.name} 
                                        onChange={(e) => setLineFormData({ ...lineFormData, name: e.target.value })} 
                                        placeholder="ชื่อแผนกการผลิต" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        📦 ผูกคลังสินค้า
                                        <span className="ml-2 text-xs font-normal text-textMuted">({(lineFormData.warehouse_ids||[]).length} เลือก)</span>
                                    </label>
                                    <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
                                        {warehouses.map(wh => {
                                            const isChecked = (lineFormData.warehouse_ids || []).includes(wh.id);
                                            return (
                                                <div 
                                                    key={wh.id} 
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none ${isChecked ? 'bg-primary/10 border border-primary/30' : 'bg-main border border-transparent hover:border-border'}`}
                                                    onClick={() => handleWarehouseToggle(wh.id)}
                                                >
                                                    {isChecked ? <CheckSquare size={16} className="text-primary flex-shrink-0" /> : <Square size={16} className="text-textMuted opacity-40 flex-shrink-0" />}
                                                    <span className={`text-sm font-medium truncate ${isChecked ? 'text-primary' : ''}`} title={wh.name}>{wh.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Products & Steps - Item as primary grouping */}
                            <div className="p-5 flex flex-col gap-3 bg-slate-50/80 overflow-y-auto">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">🏭 สินค้าที่ผลิต</p>
                                        <p className="text-[11px] text-textMuted mt-0.5">แต่ละสินค้าสามารถมีได้หลายขั้นตอน</p>
                                    </div>
                                    <button onClick={handleAddItemGroup} className="btn btn-sm btn-primary shrink-0" disabled={(lineFormData.warehouse_ids||[]).length === 0}>
                                        <Plus size={14} /> เพิ่มสินค้า
                                    </button>
                                </div>

                                {(lineFormData.warehouse_ids || []).length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-textMuted py-10">
                                        <Package size={36} className="opacity-20 mb-2" />
                                        <p className="text-sm">เลือกคลังสินค้าก่อน</p>
                                        <p className="text-xs opacity-60">เพื่อดูรายการสินค้า</p>
                                    </div>
                                ) : isLoadingItems ? (
                                    <div className="flex-1 flex items-center justify-center py-10"><LoadingSpinner /></div>
                                ) : (lineFormData.processes_template || []).length === 0 ? (
                                    <div
                                        onClick={handleAddItemGroup}
                                        className="flex-1 flex flex-col items-center justify-center text-center text-textMuted py-10 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                                    >
                                        <MonitorPlay size={32} className="opacity-20 mb-2" />
                                        <p className="text-sm font-medium">ยังไม่มีสินค้า</p>
                                        <p className="text-xs mt-1 text-primary">คลิกเพื่อเพิ่มสินค้าแรก</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {(lineFormData.processes_template || []).map((group, gIdx) => {
                                            const selectedItem = availableItems.find(i => i.id === group.inventory_item_id);
                                            return (
                                                <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                    {/* Item Header */}
                                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5 flex items-center gap-2 border-b border-slate-200">
                                                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{gIdx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <SearchableSelect
                                                                options={availableItems.map(item => ({
                                                                    value: item.id,
                                                                    label: item.product_name,
                                                                    subLabel: item.sku || ''
                                                                }))}
                                                                value={group.inventory_item_id || ''}
                                                                onChange={(val) => handleUpdateItemGroup(group.id, 'inventory_item_id', val || '')}
                                                                placeholder="-- เลือกสินค้า (P/No) --"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveItemGroup(group.id)}
                                                            className="p-1 text-red-400 hover:text-red-600 shrink-0"
                                                            title="ลบสินค้านี้"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>



                                                    {/* Steps List */}
                                                    <div className="px-3 py-2 flex flex-col gap-1.5">
                                                        {(group.steps || []).map((step, sIdx) => {
                                                            const stepName = typeof step === 'string' ? step : (step.name || '');
                                                            const stepWh = typeof step === 'string' ? '' : (step.target_warehouse_id || '');
                                                            
                                                            return (
                                                            <div key={sIdx} className="flex flex-col gap-1 p-2 border border-slate-100 rounded-md bg-slate-50/50">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{sIdx + 1}</span>
                                                                    <input
                                                                        type="text"
                                                                        className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                                                                        placeholder={`ขั้นตอนที่ ${sIdx + 1} เช่น เจาะ`}
                                                                        value={stepName}
                                                                        onChange={(e) => handleUpdateStep(group.id, sIdx, 'name', e.target.value)}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleRemoveStep(group.id, sIdx)}
                                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                                                                        title="ลบขั้นตอนนี้"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                                <div className="flex items-center gap-2 pl-7 mt-1">
                                                                    <span className="text-[10px] text-textMuted font-medium shrink-0">📦 ปลายทาง:</span>
                                                                    <select
                                                                        className="flex-1 text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer"
                                                                        value={stepWh}
                                                                        onChange={(e) => handleUpdateStep(group.id, sIdx, 'target_warehouse_id', e.target.value)}
                                                                    >
                                                                        <option value="">-- อิงตามคลังสินค้าหลัก --</option>
                                                                        {warehouses.map(wh => (
                                                                            <option key={wh.id} value={wh.id}>{wh.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => handleAddStep(group.id)}
                                                            className="mt-1 text-xs text-primary hover:underline flex items-center gap-1"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                                                        >
                                                            <Plus size={12} /> เพิ่มขั้นตอน
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end gap-3 bg-main rounded-b-xl">
                            <button onClick={() => setIsLineModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                            <button onClick={handleSaveLine} className="btn btn-primary"><Save size={18} /> บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Machine Modal --- */}
            {isMachineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-primary text-white rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <MonitorPlay size={20} />
                                {isEditingMachineMode ? 'แก้ไขเครื่องจักร' : 'เพิ่มเครื่องจักร'}
                            </h3>
                            <button onClick={() => setIsMachineModalOpen(false)} className="bg-transparent border-none p-1 text-white/80 hover:text-white cursor-pointer flex items-center justify-center">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">รหัสเครื่องจักร</label>
                                <input 
                                    type="text" 
                                    className="input w-full" 
                                    value={machineFormData.code} 
                                    onChange={(e) => setMachineFormData({ ...machineFormData, code: e.target.value.toUpperCase() })} 
                                    placeholder="เช่น M-01" 
                                    autoFocus 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อเครื่องจักร <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="input w-full" 
                                    value={machineFormData.name} 
                                    onChange={(e) => setMachineFormData({ ...machineFormData, name: e.target.value })} 
                                    placeholder="ระบุชื่อหรือเบอร์เครื่องจักร" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">สถานะ</label>
                                <select 
                                    className="input w-full" 
                                    value={machineFormData.status} 
                                    onChange={(e) => setMachineFormData({ ...machineFormData, status: e.target.value })}
                                >
                                    <option value="active">ใช้งาน (Active)</option>
                                    <option value="maintenance">ซ่อมบำรุง (Maintenance)</option>
                                    <option value="inactive">ระงับ (Inactive)</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end gap-3 bg-main rounded-b-xl">
                            <button onClick={() => setIsMachineModalOpen(false)} className="btn btn-secondary">
                                ยกเลิก
                            </button>
                            <button onClick={handleSaveMachine} className="btn btn-primary">
                                <Save size={18} /> บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionSettingsPage;
