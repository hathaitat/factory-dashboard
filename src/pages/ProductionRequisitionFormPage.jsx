import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Box, Factory } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { productionMaterialService } from '../services/productionMaterialService';
import { productionService } from '../services/productionService';
import { warehouseService } from '../services/warehouseService';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductionRequisitionFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isViewMode = !!id;
    const { showConfirm, showAlert, showError } = useDialog();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(isViewMode);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        req_date: new Date().toISOString().slice(0, 10),
        line_id: '',
        source_warehouse_id: '',
        target_plan_id: '',
        notes: ''
    });
    const [items, setItems] = useState([]);

    // Master Data
    const [lines, setLines] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [activePlans, setActivePlans] = useState([]);

    useEffect(() => {
        loadMasterData();
        if (isViewMode) {
            loadRequisition(id);
        }
    }, [id]);

    const loadMasterData = async () => {
        try {
            const [linesData, whData] = await Promise.all([
                productionService.getLines(),
                warehouseService.getWarehouses()
            ]);
            setLines(linesData || []);
            setWarehouses(whData || []);
            
            if (!isViewMode) {
                const searchParams = new URLSearchParams(location.search);
                const queryLineId = searchParams.get('lineId');
                const queryPlanId = searchParams.get('planId');
                const queryDate = searchParams.get('date');
                
                setFormData(prev => ({ 
                    ...prev, 
                    req_date: queryDate || prev.req_date,
                    line_id: queryLineId || (linesData?.length > 0 ? linesData[0].id : ''),
                    target_plan_id: queryPlanId || prev.target_plan_id
                }));
            }
            if (!isViewMode && whData?.length > 0) {
                setFormData(prev => ({ ...prev, source_warehouse_id: whData[0].id }));
            }
        } catch (error) {
            console.error('Error in loadMasterData:', error);
            showError('ไม่สามารถโหลดข้อมูลพื้นฐานได้');
        }
    };

    const loadRequisition = async (reqId) => {
        try {
            const data = await productionMaterialService.getRequisitionById(reqId);
            if (data) {
                setFormData({
                    req_no: data.req_no,
                    req_date: data.req_date,
                    line_id: data.line_id,
                    source_warehouse_id: data.source_warehouse_id,
                    target_plan_id: data.target_plan_id || '',
                    notes: data.notes || ''
                });
                
                const loadedItems = (data.items || []).map(item => ({
                    id: item.id,
                    inventory_id: item.inventory_id,
                    quantity: item.quantity,
                    unit: item.unit,
                    notes: item.notes || '',
                    item_name: item.warehouse_inventory?.product_name,
                    item_code: item.warehouse_inventory?.sku
                }));
                setItems(loadedItems);
            }
        } catch (error) {
            showError('ไม่พบข้อมูลเอกสารใบเบิก');
            navigate('/dashboard/production/requisitions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (formData.source_warehouse_id) {
            warehouseService.getInventoryByWarehouse(formData.source_warehouse_id).then(whInv => {
                setFilteredInventory(whInv.filter(inv => inv.quantity > 0));
            }).catch(error => {
                console.error('Error fetching inventory for warehouse:', error);
                setFilteredInventory([]);
            });
        } else {
            setFilteredInventory([]);
        }
    }, [formData.source_warehouse_id]);

    useEffect(() => {
        if (formData.line_id && formData.req_date) {
            productionService.getPlansByDateAndLine(formData.req_date, formData.line_id).then(plans => {
                setActivePlans(plans || []);
            }).catch(error => {
                console.error('Error fetching plans:', error);
                setActivePlans([]);
            });
        } else {
            setActivePlans([]);
        }
    }, [formData.line_id, formData.req_date]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // If warehouse changes, clear items because inventory choices changed
        if (name === 'source_warehouse_id' && items.length > 0) {
            setItems([]);
        }
    };

    const handleAddItem = () => {
        if (!formData.source_warehouse_id) return showAlert('กรุณาเลือกคลังต้นทางก่อนเพิ่มรายการ', 'warning');
        
        setItems([...items, {
            id: Date.now(),
            inventory_id: '',
            quantity: '',
            unit: '',
            notes: '',
            max_qty: 0
        }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        
        if (field === 'inventory_id') {
            const inv = filteredInventory.find(i => i.id === value);
            newItems[index].inventory_id = value;
            if (inv) {
                newItems[index].unit = inv.unit || '';
                newItems[index].max_qty = inv.quantity;
            } else {
                newItems[index].max_qty = 0;
            }
        } else {
            newItems[index][field] = value;
        }
        
        setItems(newItems);
    };

    const handleSave = async () => {
        if (isSaving) return;
        
        if (!formData.line_id || !formData.source_warehouse_id) {
            return showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        }
        if (items.length === 0) {
            return showAlert('กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ', 'warning');
        }

        // Validate items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.inventory_id || !item.quantity || Number(item.quantity) <= 0) {
                return showAlert(`รายการที่ ${i+1} ข้อมูลไม่สมบูรณ์ หรือจำนวนต้องมากกว่า 0`, 'warning');
            }
            if (Number(item.quantity) > Number(item.max_qty)) {
                return showAlert(`รายการที่ ${i+1} เบิกเกินจำนวนคงเหลือในคลัง (เหลือ: ${item.max_qty})`, 'warning');
            }
        }

        const confirm = await showConfirm(
            'เมื่อบันทึกแล้ว ระบบจะทำการตัดสต็อกวัตถุดิบจากคลังทันที ไม่สามารถแก้ไขได้ ต้องการดำเนินการต่อหรือไม่?',
            'ยืนยันการเบิกวัตถุดิบ'
        );
        if (!confirm) return;

        setIsSaving(true);
        try {
            const activeUser = user?.fullName || user?.email || 'System';
            const headerPayload = {
                req_date: formData.req_date,
                line_id: formData.line_id,
                source_warehouse_id: formData.source_warehouse_id,
                target_plan_id: formData.target_plan_id || null,
                notes: formData.notes,
                created_by: activeUser,
                updated_by: activeUser,
                status: 'Completed' // Auto-approve per user instruction
            };

            await productionMaterialService.createRequisition(headerPayload, items, activeUser);
            await showAlert('บันทึกและตัดสต็อกสำเร็จ', 'success');
            navigate('/dashboard/production/requisitions');
        } catch (error) {
            showError(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="p-6">
            <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> กลับหน้ารายการ
            </button>

            <div className="flex justify-between items-center mb-6">
                <PageHeader 
                    title={isViewMode ? `รายละเอียดใบเบิก: ${formData.req_no}` : "สร้างใบเบิกวัตถุดิบ"} 
                    subtitle={isViewMode ? "ดูข้อมูลรายการและการตัดสต็อก" : "บันทึกรายการเบิกเพื่อตัดสต็อกเข้าแผนกผลิต"} 
                />
                {!isViewMode && (
                    <button 
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'กำลังบันทึกและตัดสต็อก...' : <><Save size={18} className="mr-2" /> บันทึกและตัดสต็อกทันที</>}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-panel p-6 md:col-span-3">
                    <h3 className="text-lg font-semibold m-0 mb-4 flex items-center gap-2 text-primary">
                        <Factory size={20} /> ข้อมูลใบเบิก
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {isViewMode && (
                            <div>
                                <label className="block text-sm text-textMuted mb-2">เลขที่เอกสาร</label>
                                <input type="text" className="input w-full bg-bgMain" value={formData.req_no || ''} readOnly />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-textMuted mb-2">วันที่เบิก <span className="text-red-500">*</span></label>
                            <input 
                                type="date" 
                                name="req_date"
                                className="input w-full"
                                value={formData.req_date}
                                onChange={handleChange}
                                disabled={isViewMode}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-2">แผนกการผลิตที่เบิก <span className="text-red-500">*</span></label>
                            <select 
                                name="line_id"
                                className="input w-full"
                                value={formData.line_id}
                                onChange={handleChange}
                                disabled={isViewMode}
                            >
                                <option value="">-- เลือกแผนก --</option>
                                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-2">คลังต้นทาง (เบิกจาก) <span className="text-red-500">*</span></label>
                            <select 
                                name="source_warehouse_id"
                                className="input w-full"
                                value={formData.source_warehouse_id}
                                onChange={handleChange}
                                disabled={isViewMode}
                            >
                                <option value="">-- เลือกคลัง --</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-2">เป้าหมายการผลิตที่เกี่ยวข้อง <span className="text-red-500">*</span></label>
                            <select 
                                name="target_plan_id"
                                className="input w-full"
                                value={formData.target_plan_id}
                                onChange={handleChange}
                                disabled={isViewMode}
                            >
                                <option value="">-- เลือกเป้าหมายการผลิต --</option>
                                {activePlans.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.product_name} {p.process ? `(${p.process})` : ''} - เป้า: {p.target_quantity} {p.unit}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-textMuted mb-2">หมายเหตุเพิ่มเติม</label>
                            <input 
                                type="text" 
                                name="notes"
                                className="input w-full"
                                placeholder="ระบุหมายเหตุ (ถ้ามี)"
                                value={formData.notes}
                                onChange={handleChange}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold m-0 flex items-center gap-2 text-primary">
                        <Box size={20} /> รายการวัตถุดิบ
                    </h3>
                    {!isViewMode && (
                        <button className="btn btn-secondary border-dashed" onClick={handleAddItem}>
                            <Plus size={16} className="mr-1" /> เพิ่มรายการ
                        </button>
                    )}
                </div>

                <div className="table-responsive-wrapper">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b-2 border-border text-textMuted text-sm">
                                <th className="py-2 px-2 w-12 text-center">ลำดับ</th>
                                <th className="py-2 px-2">วัตถุดิบ (ดึงจากคลังต้นทางที่เลือก)</th>
                                {!isViewMode && <th className="py-2 px-2 text-right w-24">คงเหลือ</th>}
                                <th className="py-2 px-2 text-right w-32">จำนวนเบิก</th>
                                <th className="py-2 px-2 w-24">หน่วย</th>
                                <th className="py-2 px-2 text-right w-32">น้ำหนัก (กก.)</th>
                                <th className="py-2 px-2">หมายเหตุรายการ</th>
                                {!isViewMode && <th className="py-2 px-2 w-16"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id || index} className="border-b border-border">
                                    <td className="py-2 px-2 text-center text-textMuted">{index + 1}</td>
                                    <td className="py-2 px-2">
                                        {isViewMode ? (
                                            <div className="font-medium text-textMain">
                                                {item.item_code} - {item.item_name}
                                            </div>
                                        ) : (
                                            <select 
                                                className="input input-sm w-full"
                                                value={item.inventory_id || ''}
                                                onChange={(e) => handleItemChange(index, 'inventory_id', e.target.value)}
                                            >
                                                <option value="">-- เลือกวัตถุดิบ --</option>
                                                {filteredInventory.map(inv => (
                                                    <option key={inv.id} value={inv.id}>
                                                        {inv.sku || inv.product_code || ''} {inv.sku ? '-' : ''} {inv.product_name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    {!isViewMode && (
                                        <td className="py-2 px-2 text-right text-textMuted">
                                            {item.max_qty ? item.max_qty.toLocaleString() : '-'}
                                        </td>
                                    )}
                                    <td className="py-2 px-2">
                                        {isViewMode ? (
                                            <div className="text-right font-medium text-orange-500">
                                                {Number(item.quantity).toLocaleString()}
                                            </div>
                                        ) : (
                                            <input 
                                                type="number" 
                                                className={`input input-sm w-full text-right font-medium ${item.quantity > item.max_qty ? 'border-red-500 text-red-500' : 'text-orange-500'}`}
                                                min="0.01"
                                                step="0.01"
                                                placeholder="0"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="py-2 px-2 text-textMuted">
                                        {item.unit || '-'}
                                    </td>
                                    <td className="py-2 px-2">
                                        {isViewMode ? (
                                            <div className="text-right font-medium text-blue-500">
                                                {item.weight_kg ? Number(item.weight_kg).toLocaleString() : '-'}
                                            </div>
                                        ) : (
                                            <input 
                                                type="number" 
                                                className="input input-sm w-full text-right font-medium text-blue-500"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={item.weight_kg || ''}
                                                onChange={(e) => handleItemChange(index, 'weight_kg', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    <td className="py-2 px-2">
                                        {isViewMode ? (
                                            <div className="text-textMuted">{item.notes || '-'}</div>
                                        ) : (
                                            <input 
                                                type="text" 
                                                className="input input-sm w-full"
                                                placeholder="ระบุ..."
                                                value={item.notes || ''}
                                                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                            />
                                        )}
                                    </td>
                                    {!isViewMode && (
                                        <td className="py-2 px-2 text-center">
                                            <button 
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleRemoveItem(index)}
                                                title="ลบรายการ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={isViewMode ? 6 : 8} className="py-8 text-center text-textMuted bg-bgMain/30">
                                        ยังไม่มีรายการวัตถุดิบ กรุณากด "เพิ่มรายการ"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!isViewMode && (
                <div className="mt-6 flex justify-end">
                    <button 
                        className="btn btn-primary min-w-[200px]"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'กำลังบันทึกและตัดสต็อก...' : <><Save size={18} className="mr-2" /> บันทึกและตัดสต็อกทันที</>}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductionRequisitionFormPage;
