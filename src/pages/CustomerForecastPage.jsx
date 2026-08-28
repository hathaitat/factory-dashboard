import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import PageHeader from '../components/PageHeader';
import SearchableSelect from '../components/SearchableSelect';
import { Save, AlertCircle, Search } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { customerForecastService } from '../services/customerForecastService';
import { productService } from '../services/productService';
import { useDialog } from '../contexts/DialogContext';

function CustomerForecastPage() {
    const { hasPermission } = usePermissions();
    const { showAlert, showConfirm } = useDialog();

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [forecasts, setForecasts] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lowerSearch = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerSearch) || 
            (p.sku && p.sku.toLowerCase().includes(lowerSearch))
        );
    }, [products, searchTerm]);

    // Generate next 6 months
    const monthKeys = useMemo(() => {
        const keys = [];
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            keys.push(`${yyyy}-${mm}`);
        }
        return keys;
    }, []);

    useEffect(() => {
        loadForecasts();
    }, []);

    const loadForecasts = async () => {
        setIsLoading(true);
        try {
            // Fetch all products
            const allProducts = await productService.getAllProducts();
            // Ensure unique by name, sort by name
            const uniqueProdsMap = new Map();
            allProducts.forEach(p => {
                if (p.name && !uniqueProdsMap.has(p.name)) {
                    uniqueProdsMap.set(p.name, { name: p.name, sku: p.sku || '' });
                }
            });
            const uniqueProds = Array.from(uniqueProdsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setProducts(uniqueProds);

            const { data, error } = await supabase
                .from('customer_forecasts')
                .select('*')
                .is('customer_id', null);

            if (error) throw error;

            const map = {};
            data.forEach(item => {
                const key = `${item.product_name}|||${item.forecast_month}`;
                map[key] = item.quantity;
            });
            setForecasts(map);
        } catch (error) {
            console.error('Error loading forecasts:', error);
            showAlert('error', 'ไม่สามารถโหลดข้อมูล Forecast ได้: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuantityChange = (productName, monthStr, value) => {
        const key = `${productName}|||${monthStr}`;
        const numValue = value === '' ? '' : Number(value);
        
        setForecasts(prev => ({
            ...prev,
            [key]: numValue
        }));
    };

    const handleSave = async () => {
        const confirm = await showConfirm('ยืนยันการบันทึกข้อมูล Forecast?');
        if (!confirm) return;

        setIsSaving(true);
        try {
            const forecastData = [];
            // We only save forecasts that have a valid number > 0 to avoid clutter
            Object.entries(forecasts).forEach(([key, qty]) => {
                const numQty = Number(qty);
                if (numQty > 0) {
                    const [productName, forecastMonth] = key.split('|||');
                    forecastData.push({
                        product_name: productName,
                        forecast_month: forecastMonth,
                        quantity: numQty
                    });
                }
            });

            if (forecastData.length === 0) {
                // If they cleared everything, we still want to delete old ones
                await customerForecastService.replaceForecasts(null, monthKeys, []);
                showAlert('success', 'เคลียร์ยอด Forecast สำเร็จ');
            } else {
                await customerForecastService.replaceForecasts(null, monthKeys, forecastData);
                showAlert('success', 'บันทึกข้อมูลสำเร็จ');
            }
            
            await loadForecasts();
        } catch (error) {
            console.error('Error saving forecasts:', error);
            const errorMsg = error?.message || error?.details || JSON.stringify(error);
            showAlert('error', 'เกิดข้อผิดพลาดในการบันทึก: ' + errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="บันทึกประมาณการยอดขาย (Customer Forecasts)"
                icon={AlertCircle}
                description="บันทึกยอดพยากรณ์ล่วงหน้าจากลูกค้า เพื่อใช้วางแผนการผลิตและวิเคราะห์ Demand"
            >
                {hasPermission('customer_forecasts', 'edit', true) && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn btn-primary"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        บันทึกข้อมูล
                    </button>
                )}
            </PageHeader>

            <div className="glass-panel overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="font-medium text-textMain">ตารางกรอกข้อมูล (6 เดือนล่วงหน้า)</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหารหัส/ชื่อสินค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                    </div>
                </div>

                    <div className="flex-1 overflow-auto table-responsive-wrapper">
                        {isLoading ? (
                            <div className="p-12 text-center text-textMuted">
                                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                                กำลังโหลดข้อมูล...
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-4 font-medium whitespace-nowrap border border-slate-300 w-1/4">รหัส/ชื่อสินค้า</th>
                                        {monthKeys.map(m => (
                                            <th key={m} className="p-4 font-medium text-center whitespace-nowrap border border-slate-300">
                                                เดือน {m}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={monthKeys.length + 1} className="p-8 text-center text-textMuted">
                                                ไม่พบรายการสินค้าที่ค้นหา
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map(product => (
                                            <tr key={product.name} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 font-medium text-textMain border border-slate-300 sticky left-0 bg-white z-0">
                                                <div className="flex flex-col">
                                                    {product.sku && <span className="text-xs text-textMuted">{product.sku}</span>}
                                                    <span>{product.name}</span>
                                                </div>
                                            </td>
                                            {monthKeys.map(m => {
                                                const key = `${product.name}|||${m}`;
                                                const val = forecasts[key] !== undefined ? forecasts[key] : '';
                                                return (
                                                    <td key={m} className="p-2 border border-slate-300">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={val}
                                                            onChange={(e) => handleQuantityChange(product.name, m, e.target.value)}
                                                            className="w-full p-2 text-center bg-transparent border-0 focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                                                            placeholder="-"
                                                            disabled={!hasPermission('customer_forecasts', 'edit', true)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                </div>
                {hasPermission('customer_forecasts', 'edit', true) && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn btn-primary"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Save size={18} />
                            )}
                            บันทึกข้อมูล
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomerForecastPage;
