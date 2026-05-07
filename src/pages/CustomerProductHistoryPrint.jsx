import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { customerService } from '../services/customerService';
import { invoiceService } from '../services/invoiceService';
import { companyService } from '../services/companyService';
import '../styles/InvoicePrint.css';

const CustomerProductHistoryPrint = () => {
    const { id } = useParams();
    const location = useLocation();
    const [customer, setCustomer] = useState(null);
    const [company, setCompany] = useState(null);
    const [productHistoryData, setProductHistoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [customerData, companyData, items] = await Promise.all([
                customerService.getCustomerById(id),
                companyService.getCompanyInfo(),
                invoiceService.getInvoiceItemsByCustomer(id)
            ]);
            
            setCustomer(customerData);
            setCompany(companyData);
            
            const queryParams = new URLSearchParams(location.search);
            const targetMonth = queryParams.get('month');

            // Group by month
            const monthlyMap = {};
            
            items.forEach(item => {
                if (!item.date) return;
                const date = new Date(item.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                // If a specific month is requested, skip other months
                if (targetMonth && monthKey !== targetMonth) return;

                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = {
                        month: monthKey,
                        products: {},
                        totalAmount: 0,
                        totalQuantity: 0
                    };
                }
                
                // Group by product name AND unit price
                const prodKey = `${item.productName || 'Unknown Product'}_${item.unitPrice}`;
                if (!monthlyMap[monthKey].products[prodKey]) {
                    monthlyMap[monthKey].products[prodKey] = {
                        name: item.productName || 'Unknown Product',
                        quantity: 0,
                        unitPrice: item.unitPrice,
                        unit: item.unit || '',
                        totalPrice: 0
                    };
                }
                
                monthlyMap[monthKey].products[prodKey].quantity += item.quantity;
                monthlyMap[monthKey].products[prodKey].totalPrice += item.totalPrice;
                
                monthlyMap[monthKey].totalAmount += item.totalPrice;
                monthlyMap[monthKey].totalQuantity += item.quantity;
            });
            
            // Convert products map to array and sort
            const sortedData = Object.values(monthlyMap).map(m => ({
                ...m,
                products: Object.values(m.products).sort((a, b) => b.totalPrice - a.totalPrice)
            })).sort((a, b) => b.month.localeCompare(a.month)); // Sort months descending
            
            setProductHistoryData(sortedData);

        } catch (error) {
            console.error('Error loading data for print:', error);
        } finally {
            setIsLoading(false);
            // Auto print when data is loaded
            setTimeout(() => {
                window.print();
            }, 500);
        }
    };

    const formatMonthName = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        return `${thaiMonths[parseInt(month)]} ${parseInt(year) + 543}`;
    };

    if (isLoading || !customer || !company) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังเตรียมเอกสาร...</div>;
    }

    // Print Layout
    return (
        <div className="print-container">
            <div className="no-print" style={{ padding: '1rem', display: 'flex', gap: '1rem', background: '#111', borderBottom: '1px solid #333', flexWrap: 'wrap' }}>
                <button onClick={() => window.close()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #444', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> ปิดหน้าต่าง
                </button>
                <button onClick={() => window.print()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <Printer size={18} /> พิมพ์รายงาน
                </button>
            </div>

            <div className="invoice-paper" style={{ minHeight: '297mm' }}>
                {/* Header */}
                <div className="header-section" style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div className="company-info-print">
                        <div className="company-name-th">{company.name}</div>
                        <div className="company-address-th">{company.address}</div>
                        <div className="company-contact">
                            {company.phone && `TEL: ${company.phone}`} {company.fax && `FAX: ${company.fax}`}
                        </div>
                    </div>
                    <div className="title-section" style={{ textAlign: 'right' }}>
                        <div className="doc-title" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>รายงานประวัติการซื้อสินค้า</div>
                        <div>ลูกค้า: <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{customer.name}</span></div>
                        <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '5px' }}>
                            พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {productHistoryData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>ไม่มีข้อมูลการซื้อสินค้า</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {productHistoryData.map((monthData, index) => (
                            <div key={monthData.month} style={{ breakInside: 'avoid' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>ประจำเดือน {formatMonthName(monthData.month)}</h3>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        ยอดรวม: ฿{monthData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                
                                <table className="items-table-print">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '10%', textAlign: 'center' }}>ลำดับ</th>
                                            <th style={{ width: '40%', textAlign: 'left' }}>รายการสินค้า</th>
                                            <th style={{ width: '15%', textAlign: 'right' }}>จำนวนรวม</th>
                                            <th style={{ width: '15%', textAlign: 'right' }}>ราคา/หน่วย</th>
                                            <th style={{ width: '20%', textAlign: 'right' }}>มูลค่ารวม (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthData.products.map((prod, idx) => (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ textAlign: 'left' }}>{prod.name}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {prod.quantity.toLocaleString()} {prod.unit}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {prod.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {prod.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="2" className="summary-label" style={{ borderRight: 'none', borderBottom: '1px solid #000' }}>รวมทั้งสิ้นเดือน {formatMonthName(monthData.month)}</td>
                                            <td className="summary-value-bold" style={{ borderLeft: 'none', borderBottom: '1px solid #000', textAlign: 'right' }}>
                                                {monthData.totalQuantity.toLocaleString()}
                                            </td>
                                            <td className="summary-value-bold" style={{ borderLeft: 'none', borderBottom: '1px solid #000', textAlign: 'right' }}></td>
                                            <td className="summary-value-bold" style={{ borderLeft: 'none', borderBottom: '1px solid #000', textAlign: 'right' }}>
                                                {monthData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerProductHistoryPrint;
