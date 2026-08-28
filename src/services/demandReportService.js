import { supabase } from './supabaseClient';
import { customerForecastService } from './customerForecastService';
import { productService } from './productService';
import { getLocalDateString } from '../utils/dateUtils';

export const demandReportService = {
    // 1. Get Demand (PO items) for the last 4 months
    getDemandData: async (months = 4) => {
        try {
            const today = new Date();
            // Go back 4 months from the first day of the current month to ensure we get full past months
            const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
            const startString = startDate.toISOString().split('T')[0];

            // Fetch POs that are not cancelled
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id,
                    issue_date,
                    status,
                    purchase_order_items (
                        product_name,
                        quantity
                    )
                `)
                .neq('status', 'Cancelled')
                .gte('issue_date', startString);

            if (error) throw error;

            // Process data to group by product and month
            const demandMap = {}; // { [productName]: { 'YYYY-MM': totalQty } }
            
            // Initialize all products with 0 for all target months
            const monthKeys = [];
            for (let i = months - 1; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthKeys.push(monthKey);
            }

            data.forEach(po => {
                const poMonth = po.issue_date.substring(0, 7); // YYYY-MM
                if (po.purchase_order_items) {
                    po.purchase_order_items.forEach(item => {
                        const name = item.product_name;
                        if (!name) return;
                        
                        if (!demandMap[name]) {
                            demandMap[name] = {};
                            monthKeys.forEach(m => demandMap[name][m] = 0);
                        }
                        
                        if (demandMap[name][poMonth] !== undefined) {
                            demandMap[name][poMonth] += Number(item.quantity || 0);
                        }
                    });
                }
            });

            return { demandMap, monthKeys };
        } catch (error) {
            console.error('Error fetching demand data:', error);
            throw error;
        }
    },

    // 2. Get current stock for all items
    getCurrentStock: async () => {
        try {
            const { data, error } = await supabase
                .from('warehouse_inventory')
                .select('product_name, quantity, product_type, sku');

            if (error) throw error;

            const stockMap = {};
            data.forEach(item => {
                const name = item.product_name;
                if (!name) return;
                
                if (!stockMap[name]) {
                    stockMap[name] = { fg: 0, raw: 0, total: 0, sku: item.sku || '' };
                } else if (!stockMap[name].sku && item.sku) {
                    stockMap[name].sku = item.sku;
                }
                const qty = Number(item.quantity || 0);
                stockMap[name].total += qty;
                
                if (item.product_type === 'finished_good' || item.product_type === 'finished') {
                    stockMap[name].fg += qty;
                } else if (item.product_type === 'material') {
                    stockMap[name].raw += qty;
                } else {
                    // For custom types or empty types, just add to raw for now
                    stockMap[name].raw += qty;
                }
            });

            return stockMap;
        } catch (error) {
            console.error('Error fetching current stock:', error);
            throw error;
        }
    },

    // 3. Get pending Supplier POs (items ordered but not fully received)
    getPendingSupplierPOs: async () => {
        try {
            // Get supplier POs that are Draft or Partial
            const { data, error } = await supabase
                .from('supplier_pos')
                .select(`
                    id,
                    status,
                    supplier_po_items (
                        description,
                        quantity,
                        received_quantity
                    )
                `)
                .in('status', ['Draft', 'Partial']);

            if (error) throw error;

            const pendingMap = {};
            data.forEach(po => {
                if (po.supplier_po_items) {
                    po.supplier_po_items.forEach(item => {
                        const name = item.description;
                        if (!name) return;
                        const qty = Number(item.quantity || 0);
                        const received = Number(item.received_quantity || 0);
                        const pending = Math.max(0, qty - received);
                        
                        if (pending > 0) {
                            pendingMap[name] = (pendingMap[name] || 0) + pending;
                        }
                    });
                }
            });

            return pendingMap;
        } catch (error) {
            console.error('Error fetching pending supplier POs:', error);
            throw error;
        }
    },

    // 4. Get pending Customer POs
    getPendingCustomerPOs: async () => {
        try {
            const today = new Date();
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];

            const { data: pos, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id,
                    status,
                    due_date,
                    purchase_order_items (
                        product_name,
                        quantity
                    ),
                    invoices (
                        status,
                        invoice_items (
                            product_name,
                            quantity
                        )
                    )
                `)
                .neq('status', 'Completed')
                .neq('status', 'Cancelled');

            if (error) throw error;

            const pendingThisMonthMap = {};
            const pendingNextMonthMap = {};

            pos.forEach(po => {
                const ordered = {};
                const delivered = {};
                
                if (po.purchase_order_items) {
                    po.purchase_order_items.forEach(item => {
                        const name = item.product_name;
                        if (name) ordered[name] = (ordered[name] || 0) + Number(item.quantity || 0);
                    });
                }
                
                if (po.invoices) {
                    po.invoices.forEach(inv => {
                        if (inv.status !== 'Cancelled' && inv.invoice_items) {
                            inv.invoice_items.forEach(item => {
                                const name = item.product_name;
                                if (name) delivered[name] = (delivered[name] || 0) + Number(item.quantity || 0);
                            });
                        }
                    });
                }
                
                Object.keys(ordered).forEach(name => {
                    const req = ordered[name];
                    const del = delivered[name] || 0;
                    const rem = Math.max(0, req - del);
                    if (rem > 0) {
                        if (!po.due_date || po.due_date <= endOfMonth) {
                            pendingThisMonthMap[name] = (pendingThisMonthMap[name] || 0) + rem;
                        } else if (po.due_date > endOfMonth && po.due_date <= endOfNextMonth) {
                            pendingNextMonthMap[name] = (pendingNextMonthMap[name] || 0) + rem;
                        }
                    }
                });
            });

            return { pendingThisMonthMap, pendingNextMonthMap };
        } catch (error) {
            console.error('Error fetching pending customer POs:', error);
            throw error;
        }
    },

    // 5. Calculate everything to generate the final report data
    getDemandAnalysisReport: async () => {
        try {
            const nextMonthDate = new Date();
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

            const [demandResult, stockMap, pendingSupplierMap, pendingCustomerResult, forecastMap, customerProducts] = await Promise.all([
                demandReportService.getDemandData(4),
                demandReportService.getCurrentStock(),
                demandReportService.getPendingSupplierPOs(),
                demandReportService.getPendingCustomerPOs(),
                customerForecastService.getAggregatedForecastForMonth(nextMonthStr),
                productService.getAllProducts()
            ]);

            const { demandMap, monthKeys } = demandResult;
            const pendingCustomerMap = pendingCustomerResult.pendingThisMonthMap;
            const pendingCustomerNextMonthMap = pendingCustomerResult.pendingNextMonthMap;
            
            // Create a mapping from SKU to Customer Product Name to merge warehouse stock
            const skuToProductName = {};
            customerProducts.forEach(p => {
                if (p.sku) {
                    skuToProductName[p.sku] = p.name;
                }
            });

            // Aggregate stockMap so that raw materials or items with different names but same SKU 
            // are merged under the primary customer product name
            const aggregatedStockMap = {};
            Object.keys(stockMap).forEach(stockName => {
                const item = stockMap[stockName];
                const primaryName = (item.sku && skuToProductName[item.sku]) ? skuToProductName[item.sku] : stockName;
                
                if (!aggregatedStockMap[primaryName]) {
                    aggregatedStockMap[primaryName] = { fg: 0, raw: 0, total: 0, sku: item.sku || '' };
                }
                aggregatedStockMap[primaryName].fg += item.fg;
                aggregatedStockMap[primaryName].raw += item.raw;
                aggregatedStockMap[primaryName].total += item.total;
                if (!aggregatedStockMap[primaryName].sku && item.sku) {
                    aggregatedStockMap[primaryName].sku = item.sku;
                }
            });

            // Aggregate pendingSupplierMap so supplier PO items get merged into the correct primary product row
            const aggregatedPendingSupplierMap = {};
            Object.keys(pendingSupplierMap).forEach(supplierProductName => {
                const pendingQty = pendingSupplierMap[supplierProductName];
                const skuFromStock = stockMap[supplierProductName]?.sku;
                const primaryName = (skuFromStock && skuToProductName[skuFromStock]) ? skuToProductName[skuFromStock] : supplierProductName;
                aggregatedPendingSupplierMap[primaryName] = (aggregatedPendingSupplierMap[primaryName] || 0) + pendingQty;
            });

            const allProducts = new Set([
                ...customerProducts.map(p => p.name),
                ...Object.keys(demandMap),
                ...Object.keys(aggregatedStockMap).filter(p => aggregatedStockMap[p].fg > 0 || demandMap[p] || pendingCustomerMap[p] || pendingCustomerNextMonthMap[p] || forecastMap[p]),
                ...Object.keys(pendingCustomerMap),
                ...Object.keys(pendingCustomerNextMonthMap),
                ...Object.keys(aggregatedPendingSupplierMap),
                ...Object.keys(forecastMap)
            ]);

            const reportData = [];

            allProducts.forEach(productName => {
                const demandRecord = demandMap[productName] || {};
                let totalDemand = 0;
                
                const history = monthKeys.map(m => {
                    const val = demandRecord[m] || 0;
                    totalDemand += val;
                    return { month: m, value: val };
                });

                // Calculate average based on 4 months, rounded up to the nearest integer
                const averageDemand = Math.ceil(totalDemand / 4);
                const customerForecast = forecastMap[productName] || 0;
                
                // If there's a forecast, use it for safety stock, otherwise fallback to historical average
                const safetyStock = customerForecast > 0 ? customerForecast : averageDemand;
                
                const stockData = aggregatedStockMap[productName] || { fg: 0, raw: 0, total: 0, sku: '' };
                const currentStock = stockData.total;
                const currentStockFG = stockData.fg;
                const currentStockRaw = stockData.raw;

                const pendingSupplierPO = aggregatedPendingSupplierMap[productName] || 0;
                const totalAvailable = currentStock + pendingSupplierPO;
                
                const pendingCustomerPO = pendingCustomerMap[productName] || 0;
                
                // Needs = SafetyStock + PendingCustomerPO - TotalAvailable
                const requiredAction = Math.max(0, (safetyStock + pendingCustomerPO) - totalAvailable);
                
                let status = 'adequate';
                if (requiredAction > 0) {
                    status = 'shortage'; // Needs action
                } else if (totalAvailable < (safetyStock + pendingCustomerPO) * 1.5) {
                    status = 'low'; // Approaching safety stock
                }

                reportData.push({
                    productName,
                    sku: stockData.sku,
                    history,
                    totalDemand,
                    averageDemand,
                    customerForecast,
                    safetyStock,
                    currentStock,
                    currentStockFG,
                    currentStockRaw,
                    pendingSupplierPO,
                    pendingCustomerPO,
                    pendingCustomerPONextMonth: pendingCustomerNextMonthMap[productName] || 0,
                    totalAvailable,
                    requiredAction,
                    status
                });
            });

            // Sort by required action (highest first), then by average demand
            reportData.sort((a, b) => {
                if (b.requiredAction !== a.requiredAction) {
                    return b.requiredAction - a.requiredAction;
                }
                return b.averageDemand - a.averageDemand;
            });

            return {
                data: reportData,
                monthKeys
            };
        } catch (error) {
            console.error('Error generating demand analysis report:', error);
            throw error;
        }
    }
};
