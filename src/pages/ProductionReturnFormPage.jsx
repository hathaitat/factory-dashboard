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

const ProductionReturnFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isEditMode = location.pathname.endsWith('/edit');
    const isViewMode = !!id && !isEditMode;
    const { showConfirm, showAlert, showError } = useDialog();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(isViewMode);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        return_date: new Date().toISOString().slice(0, 10),
        line_id: '',
        target_warehouse_id: '',
        target_plan_id: '',
        notes: ''
    });
    const [items, setItems] = useState([]);

    // Master Data
    const [lines, setLines] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [activePlans, setActivePlans] = useState([]);

    useEffect(() => {
        loadMasterData();
        if (id) {
            loadReturn(id);
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
            
            if (!id && linesData?.length > 0) {
                setFormData(prev => ({ ...prev, line_id: linesData[0].id }));
            }
            if (!id && whData?.length > 0) {
                setFormData(prev => ({ ...prev, target_warehouse_id: whData[0].id }));
            }
        } catch (error) {
            showError('ไม่สามารถโหลดข้อมูลพื้นฐานได้');
        }
    };

    const loadReturn = async (retId) => {
        try {
            const data = await productionMaterialService.getReturnById(retId);
            
            if (data) {
                setFormData({
                    return_no: data.return_no,
                    return_date: data.return_date,
                    line_id: data.line_id,
                    target_warehouse_id: data.target_warehouse_id,
                    target_plan_id: data.target_plan_id || '',
                    notes: data.notes || ''
                });
                
                const loadedItems = (data.items || []).map(item => ({
                    id: item.id,
                    inventory_id: item.inventory_id,
                    quantity: item.quantity,
                    weight_kg: item.weight_kg || 0,
                    unit: item.unit,
                    reason: item.reason || '',
                    item_name: item.warehouse_inventory?.product_name || item.warehouse_inventory?.items?.name,
                    item_code: item.warehouse_inventory?.sku || item.warehouse_inventory?.items?.code
                }));
                setItems(loadedItems);
            } else {
                throw new Error('ไม่พบข้อมูลใบคืน');
            }
        } catch (error) {
            showError(error.message);
            navigate('/dashboard/production/returns');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (formData.target_warehouse_id) {
            warehouseService.getInventoryByWarehouse(formData.target_warehouse_id).then(whInv => {
                setFilteredInventory(whInv);
            }).catch(error => {
                console.error('Error fetching inventory for warehouse:', error);
                setFilteredInventory([]);
            });
        } else {
            setFilteredInventory([]);
        }
    }, [formData.target_warehouse_id]);

    useEffect(() => {
        if (formData.line_id && formData.return_date) {
            productionService.getPlansByDateAndLine(formData.return_date, formData.line_id).then(plans => {
                setActivePlans(plans || []);
            }).catch(error => {
                console.error('Error fetching plans:', error);
                setActivePlans([]);
            });
        } else {
            setActivePlans([]);
        }
    }, [formData.line_id, formData.return_date]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'target_warehouse_id' && items.length > 0) {
            setItems([]);
        }
    };

    const handleAddItem = () => {
        if (!formData.target_warehouse_id) return showAlert('กรุณาเลือกคลังปลายทางก่อนเพิ่มรายการ', 'warning');
        
        setItems([...items, {
            id: Date.now(),
            inventory_id: '',
            quantity: '',
            weight_kg: '',
            unit: '',
            reason: ''
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
                newItems[index].unit = inv.items?.unit || '';
            }
        } else {
            newItems[index][field] = value;
        }
        
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!formData.line_id || !formData.target_warehouse_id) {
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
            if (!item.reason || item.reason.trim() === '') {
                return showAlert(`รายการที่ ${i+1} กรุณาระบุเหตุผล/หมายเหตุที่คืน`, 'warning');
            }
        }

        const confirm = await showConfirm(
            isEditMode ? 'ระบบจะปรับปรุงข้อมูลการคืนและแก้ไขสต็อกให้ถูกต้อง ต้องการดำเนินการต่อหรือไม่?' : 'เมื่อบันทึกแล้ว ระบบจะทำการเพิ่มสต็อกวัตถุดิบเข้าคลังทันที ต้องการดำเนินการต่อหรือไม่?',
            isEditMode ? 'ยืนยันการแก้ไขข้อมูล' : 'ยืนยันการคืนวัตถุดิบ'
        );
        if (!confirm) return;

        setIsSaving(true);
        try {
            const activeUser = user?.fullName || user?.email || 'System';
            const headerPayload = {
                return_date: formData.return_date,
                line_id: formData.line_id,
                target_warehouse_id: formData.target_warehouse_id,
                target_plan_id: formData.target_plan_id || null,
                notes: formData.notes,
                created_by: activeUser,
                updated_by: activeUser,
                status: 'Completed'
            };

            if (isEditMode) {
                await productionMaterialService.updateReturn(id, headerPayload, items, activeUser);
                await showAlert('แก้ไขข้อมูลและปรับสต็อกสำเร็จ', 'success');
            } else {
                await productionMaterialService.createReturn(headerPayload, items, activeUser);
                await showAlert('บันทึกและเพิ่มสต็อกสำเร็จ', 'success');
            }
            
            navigate('/dashboard/production/returns');
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
                    title={isViewMode ? `รายละเอียดใบคืน: ${formData.return_no}` : isEditMode ? `แก้ไขใบคืนวัตถุดิบ: ${formData.return_no}` : "สร้างใบคืนวัตถุดิบ"} 
                    subtitle={isViewMode ? "ดูข้อมูลรายการและการคืนสต็อก" : isEditMode ? "ปรับปรุงข้อมูลและรายการคืนวัตถุดิบ" : "บันทึกรายการคืนวัตถุดิบที่เหลือเพื่อเพิ่มสต็อกเข้าคลัง"} 
                />
                {!isViewMode && (
                    <button 
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'กำลังบันทึกและคืนสต็อก...' : <><Save size={18} className="mr-2" /> บันทึกและคืนสต็อกทันที</>}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-panel p-6 md:col-span-3">
                    <h3 className="text-lg font-semibold m-0 mb-4 flex items-center gap-2 text-primary">
                        <Factory size={20} /> ข้อมูลใบคืน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {isViewMode && (
                            <div>
                                <label className="block text-sm text-textMuted mb-2">เลขที่เอกสาร</label>
                                <input type="text" className="input w-full bg-bgMain" value={formData.return_no || ''} readOnly />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-textMuted mb-2">วันที่คืน <span className="text-red-500">*</span></label>
                            <input 
                                type="date" 
                                name="return_date"
                                className="input w-full"
                                value={formData.return_date}
                                onChange={handleChange}
                                disabled={isViewMode}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-textMuted mb-2">แผนกการผลิตที่คืน <span className="text-red-500">*</span></label>
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
                            <label className="block text-sm text-textMuted mb-2">คลังปลายทาง (รับคืน) <span className="text-red-500">*</span></label>
                            <select 
                                name="target_warehouse_id"
                                className="input w-full"
                                value={formData.target_warehouse_id}
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
                        <Box size={20} /> รายการวัตถุดิบที่คืน
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
                                <th className="py-2 px-2">วัตถุดิบ (จะเพิ่มสต็อกเข้าคลังที่เลือก)</th>
                                <th className="py-2 px-2 text-right w-32">จำนวนคืน</th>
                                <th className="py-2 px-2 w-24">หน่วย</th>
                                <th className="py-2 px-2 text-right w-32">น้ำหนัก (กก.)</th>
                                <th className="py-2 px-2">เหตุผลที่คืน / หมายเหตุ <span className="text-red-500">*</span></th>
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
                                                        {inv.items?.code} - {inv.items?.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    <td className="py-2 px-2">
                                        {isViewMode ? (
                                            <div className="text-right font-medium text-green-500">
                                                {Number(item.quantity).toLocaleString()}
                                            </div>
                                        ) : (
                                            <input 
                                                type="number" 
                                                className="input input-sm w-full text-right font-medium text-green-500"
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
                                            <div className="text-textMuted">{item.reason || '-'}</div>
                                        ) : (
                                            <input 
                                                type="text" 
                                                className={`input input-sm w-full ${!item.reason ? 'border-orange-300 bg-orange-50/10' : ''}`}
                                                placeholder="ระบุเหตุผล (เช่น เบิกเกิน, ของเสีย)..."
                                                value={item.reason || ''}
                                                onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
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
                                    <td colSpan={isViewMode ? 6 : 7} className="py-8 text-center text-textMuted bg-bgMain/30">
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
                        {isSaving ? 'กำลังบันทึกและคืนสต็อก...' : <><Save size={18} className="mr-2" /> บันทึกและคืนสต็อกทันที</>}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductionReturnFormPage;
