import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Truck, Filter, Eye } from 'lucide-react';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import SearchableSelect from '../components/SearchableSelect';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { customerService } from '../services/customerService';
import { companyService } from '../services/companyService';
import { useDialog } from '../contexts/DialogContext';
import { exportDeliverySchedule } from '../utils/deliveryScheduleExporter';

const DeliverySchedulePage = () => {
    const location = useLocation();
    const { showError, showAlert } = useDialog();
    
    // Check if we came from PO List with pre-selected customer
    const initialCustomerId = location.state?.customerId || '';
    
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
    
    const [poList, setPoList] = useState([]);
    const [selectedPoIds, setSelectedPoIds] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // For Preview
    const [previewData, setPreviewData] = useState([]);
    const [maxDeliveries, setMaxDeliveries] = useState(3);

    useEffect(() => {
        const fetchCustomers = async () => {
            const data = await customerService.getCustomers();
            setCustomers(data);
        };
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            fetchCustomerPOs(selectedCustomerId);
        } else {
            setPoList([]);
            setSelectedPoIds([]);
            setPreviewData([]);
        }
    }, [selectedCustomerId]);

    const fetchCustomerPOs = async (customerId) => {
        setIsLoading(true);
        try {
            // Get all POs for this customer that are not cancelled
            const pos = await purchaseOrderService.getPurchaseOrdersByCustomer(customerId);
            const validPos = pos.filter(po => po.status !== 'Cancelled');
            setPoList(validPos);
            
            // If passed from PO list state, auto-select those POs
            if (location.state?.selectedPoIds) {
                const preselected = location.state.selectedPoIds;
                setSelectedPoIds(validPos.filter(p => preselected.includes(p.id)).map(p => p.id));
            } else {
                setSelectedPoIds([]);
            }
        } catch (error) {
            console.error('Error fetching POs:', error);
            showError('ไม่สามารถดึงข้อมูล PO ได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPoIds.length > 0) {
            loadPreviewData();
        } else {
            setPreviewData([]);
        }
    }, [selectedPoIds]);

    const loadPreviewData = async () => {
        setIsLoading(true);
        try {
            const fullPoData = [];
            for (const poId of selectedPoIds) {
                // This gets PO with items and their delivered quantities
                const poDetails = await purchaseOrderService.getPurchaseOrderWithRemainingQuantity(poId);
                if (poDetails) {
                    fullPoData.push(poDetails);
                }
            }
            
            // Generate preview table rows
            const rows = [];
            let maxDlv = 0;
            
            fullPoData.forEach(po => {
                if (po.purchase_order_items) {
                    po.purchase_order_items.forEach(item => {
                        const sched = Array.isArray(item.delivery_schedule) ? item.delivery_schedule : [];
                        maxDlv = Math.max(maxDlv, sched.length);
                        
                        const poQty = Number(item.quantity) || 0;
                        const delQty = Number(item.delivered_quantity) || 0;
                        
                        rows.push({
                            id: `${po.id}-${item.sku}`,
                            poNumber: po.po_number,
                            sku: item.sku,
                            productName: item.product_name,
                            poQuantity: poQty,
                            unit: item.unit,
                            schedule: sched,
                            totalDelivered: delQty,
                            balance: Math.max(0, poQty - delQty),
                            status: poQty - delQty <= 0 ? 'ครบ' : 'ค้างส่ง'
                        });
                    });
                }
            });
            
            setMaxDeliveries(Math.max(3, maxDlv));
            setPreviewData(rows);
            
        } catch (error) {
            console.error('Error loading preview:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAllPo = (e) => {
        if (e.target.checked) {
            setSelectedPoIds(poList.map(po => po.id));
        } else {
            setSelectedPoIds([]);
        }
    };

    const handleSelectPo = (id) => {
        setSelectedPoIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleExport = async () => {
        if (!selectedCustomerId || selectedPoIds.length === 0) {
            showAlert('กรุณาเลือกลูกค้าและใบสั่งซื้ออย่างน้อย 1 รายการ');
            return;
        }

        setIsExporting(true);
        try {
            // 1. Get full PO details
            const fullPoData = [];
            for (const poId of selectedPoIds) {
                const poDetails = await purchaseOrderService.getPurchaseOrderWithRemainingQuantity(poId);
                if (poDetails) fullPoData.push(poDetails);
            }

            // 2. Get Customer details
            const customerDetails = await customerService.getCustomerById(selectedCustomerId);
            
            // 3. Get Company details
            const companyDetails = await companyService.getCompanyInfo();

            // 4. Export
            exportDeliverySchedule(fullPoData, customerDetails, companyDetails);
            
            showAlert('ดาวน์โหลดแผนการจัดส่งสำเร็จ');
        } catch (error) {
            console.error('Error exporting:', error);
            showError('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="px-4 pb-8">
            <PageHeader 
                title="ดาวน์โหลดแผนการจัดส่ง (Delivery Schedule)"
                helpContent={<p>เลือกลูกค้าและใบสั่งซื้อที่ต้องการ เพื่อดึงแผนการจัดส่งรวมออกมาเป็นไฟล์ Excel สำหรับส่งให้ลูกค้า</p>}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Col: Filters */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Filter size={20} className="text-blue-500" />
                            เงื่อนไขการดึงข้อมูล
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-2">1. เลือกลูกค้า</label>
                                <SearchableSelect
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    value={selectedCustomerId}
                                    onChange={setSelectedCustomerId}
                                    placeholder="ค้นหาชื่อลูกค้า..."
                                    isClearable
                                />
                            </div>
                            
                            {selectedCustomerId && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-textMuted mb-2 flex justify-between items-end">
                                        <span>2. เลือกใบสั่งซื้อ (PO)</span>
                                        <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-semibold">
                                            {selectedPoIds.length} / {poList.length}
                                        </span>
                                    </label>
                                    
                                    <div className="border border-border rounded-lg overflow-hidden bg-cardBg shadow-inner max-h-60 overflow-y-auto">
                                        {isLoading ? (
                                            <div className="p-8 text-center text-textMuted">
                                                <div className="loading-spinner mx-auto mb-2"></div>
                                                กำลังโหลด PO...
                                            </div>
                                        ) : poList.length > 0 ? (
                                            <div className="divide-y divide-border">
                                                <label className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer bg-black/5">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedPoIds.length === poList.length && poList.length > 0}
                                                        onChange={handleSelectAllPo}
                                                    />
                                                    <span className="font-semibold text-sm">เลือกทั้งหมด</span>
                                                </label>
                                                
                                                {poList.map(po => (
                                                    <label key={po.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={selectedPoIds.includes(po.id)}
                                                            onChange={() => handleSelectPo(po.id)}
                                                        />
                                                        <div>
                                                            <div className="font-semibold text-main">{po.po_number}</div>
                                                            <div className="text-xs text-textMuted">
                                                                กำหนดส่ง: {po.due_date ? new Date(po.due_date).toLocaleDateString('th-TH') : '-'}
                                                            </div>
                                                        </div>
                                                        <div className="ml-auto text-xs font-medium text-emerald-500">
                                                            ฿{Number(po.total_po_amount || 0).toLocaleString()}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center text-textMuted text-sm">
                                                ไม่พบประวัติใบสั่งซื้อสำหรับลูกค้ารายนี้
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="pt-4 border-t border-border/50">
                                <button
                                    onClick={handleExport}
                                    disabled={selectedPoIds.length === 0 || isExporting}
                                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                        selectedPoIds.length === 0 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                                    }`}
                                >
                                    {isExporting ? (
                                        <><div className="loading-spinner border-2 w-4 h-4"></div> กำลังสร้างไฟล์...</>
                                    ) : (
                                        <><Download size={20} /> ดาวน์โหลด Excel ({selectedPoIds.length} PO)</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Col: Preview */}
                <div className="lg:col-span-2">
                    <div className="glass-panel p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Eye size={20} className="text-emerald-500" />
                                ตัวอย่างข้อมูล (Preview)
                            </h3>
                            {previewData.length > 0 && (
                                <div className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full border border-emerald-500/20">
                                    พร้อมดาวน์โหลด {previewData.length} รายการ
                                </div>
                            )}
                        </div>
                        
                        {selectedPoIds.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-textMuted border-2 border-dashed border-border rounded-xl p-8 bg-black/5">
                                <Truck size={48} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium">ยังไม่ได้เลือกใบสั่งซื้อ</p>
                                <p className="text-sm mt-1">กรุณาเลือกลูกค้าและใบสั่งซื้อทางด้านซ้ายเพื่อดูตัวอย่างข้อมูล</p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-textMuted border-2 border-dashed border-border rounded-xl p-8 bg-black/5">
                                <div className="loading-spinner mb-4 w-10 h-10"></div>
                                <p className="font-medium">กำลังเตรียมข้อมูล...</p>
                            </div>
                        ) : (
                            <div className="flex-1 border border-border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                                <div className="bg-[#1E3A8A] text-white p-3 text-center font-bold">
                                    แผนการจัดส่งสินค้า (DELIVERY SCHEDULE)
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-border text-left">
                                                <th className="p-3 border-r border-border font-semibold text-slate-700">เลขที่ PO</th>
                                                <th className="p-3 border-r border-border font-semibold text-slate-700">รายการสินค้า</th>
                                                <th className="p-3 border-r border-border font-semibold text-slate-700 text-right">จำนวน Qty</th>
                                                {Array.from({ length: maxDeliveries }).map((_, i) => (
                                                    <th key={i} className="p-3 border-r border-border font-semibold text-emerald-700 bg-emerald-50 text-center">
                                                        ส่งรอบ {i+1}
                                                    </th>
                                                ))}
                                                <th className="p-3 border-r border-border font-semibold text-slate-700 text-right">ส่งแล้ว</th>
                                                <th className="p-3 border-r border-border font-semibold text-slate-700 text-right">คงเหลือ</th>
                                                <th className="p-3 font-semibold text-slate-700 text-center">สถานะ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, idx) => (
                                                <tr key={row.id} className={`border-b border-border ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                                                    <td className="p-3 border-r border-border font-medium text-blue-600 whitespace-nowrap">{row.poNumber}</td>
                                                    <td className="p-3 border-r border-border font-medium">
                                                        {row.productName}
                                                        <div className="text-xs text-slate-400 mt-0.5">{row.sku}</div>
                                                    </td>
                                                    <td className="p-3 border-r border-border text-right font-medium">{row.poQuantity.toLocaleString()}</td>
                                                    
                                                    {Array.from({ length: maxDeliveries }).map((_, i) => {
                                                        const sched = row.schedule[i];
                                                        return (
                                                            <td key={i} className="p-2 border-r border-border text-center">
                                                                {sched ? (
                                                                    <div>
                                                                        <div className="font-semibold">{Number(sched.quantity).toLocaleString()}</div>
                                                                        <div className="text-[10px] text-slate-500 bg-slate-100 rounded px-1 mt-1 inline-block">
                                                                            {sched.date ? new Date(sched.date).toLocaleDateString('th-TH') : '-'}
                                                                        </div>
                                                                    </div>
                                                                ) : <span className="text-slate-300">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                    
                                                    <td className="p-3 border-r border-border text-right font-semibold text-blue-600">{row.totalDelivered.toLocaleString()}</td>
                                                    <td className="p-3 border-r border-border text-right font-semibold text-amber-600">{row.balance.toLocaleString()}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${row.status === 'ครบ' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliverySchedulePage;
