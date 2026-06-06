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

    useEffect(() => {
        if (customer) {
            document.title = `รายงานประวัติสินค้า - ${customer.name}`;
        }
    }, [customer]);

    if (isLoading || !customer || !company) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'Sarabun, sans-serif' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>กำลังเตรียมเอกสาร...</div>
            </div>
        );
    }


    return (
        <div className="print-container">
            <div className="no-print" style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#111', 
                borderBottom: '1px solid #333', zIndex: 1000
            }}>
                <button 
                    onClick={() => window.close()} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> ปิดหน้าต่าง
                </button>
                
                <button 
                    onClick={() => window.print()} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: '#3b82f6', border: 'none', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Printer size={18} /> พิมพ์รายงาน
                </button>
            </div>

            <div className="invoice-paper" style={{ padding: '15mm 15mm' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2.5px solid #000', paddingBottom: '15px' }}>
                    <div className="flex-1">
                        {company.nameEn && <div style={{ fontSize: '1.2rem', fontFamily: 'serif', color: '#444' }}>{company.nameEn}</div>}
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '4px' }}>{company.name}</div>
                        <div style={{ fontSize: '0.95rem', lineHeight: '1.4', color: '#000', maxWidth: '550px' }}>
                            {company.address}<br />
                            {[
                                company.phone && `โทร: ${company.phone}`,
                                company.fax && `แฟกซ์: ${company.fax}`,
                                company.taxId && `เลขประจำตัวผู้เสียภาษี: ${company.taxId}`
                            ].filter(Boolean).join(' | ')}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px', marginBottom: '8px' }}>REPORT</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>รายงานประวัติการซื้อสินค้า</div>
                    </div>
                </div>

                {/* Report Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '25px', background: '#f9fafb', padding: '15px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                    <div>
                        <div className="text-[0.9rem] text-gray-500 mb-[2px]">ลูกค้า:</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{customer.name} {customer.branch && `(สาขา ${customer.branch})`}</div>
                        <div style={{ fontSize: '0.95rem', color: '#444' }}>รหัสลูกค้า: {customer.code || customer.id}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[0.9rem] text-gray-500 mb-[2px]">วันที่พิมพ์รายงาน:</div>
                        <div className="text-base font-medium">{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div className="text-[0.9rem] text-gray-500 mt-1">เวลา: {new Date().toLocaleTimeString('th-TH')}</div>
                    </div>
                </div>

                {/* Content */}
                {productHistoryData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', border: '1px dashed #ccc', borderRadius: '8px', color: '#666' }}>
                        ไม่พบข้อมูลประวัติการซื้อสินค้าในช่วงเวลาที่เลือก
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {productHistoryData.map((monthData) => (
                            <div key={monthData.month} style={{ breakInside: 'avoid' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '4px', height: '24px', background: '#000' }}></div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>ข้อมูลประจำเดือน {formatMonthName(monthData.month)}</h3>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: '#444' }}>
                                        รายการสินค้าทั้งหมด {monthData.products.length} รายการ
                                    </div>
                                </div>

                                <table className="items-table-print" style={{ marginBottom: '5px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                                            <th style={{ width: '8%', textAlign: 'center', fontWeight: 'bold' }}>ลำดับ</th>
                                            <th style={{ width: '47%', textAlign: 'left', fontWeight: 'bold' }}>ชื่อรายการสินค้า</th>
                                            <th style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>จำนวนรวม</th>
                                            <th style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>ราคา/หน่วย</th>
                                            <th style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>มูลค่ารวม</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthData.products.map((prod, idx) => (
                                            <tr key={idx}>
                                                <td className="text-center">{idx + 1}</td>
                                                <td style={{ textAlign: 'left', fontWeight: '500' }}>{prod.name}</td>
                                                <td className="text-right">
                                                    {prod.quantity.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#666' }}>{prod.unit}</span>
                                                </td>
                                                <td className="text-right">
                                                    {prod.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                    {prod.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#f9fafb' }}>
                                            <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', padding: '10px' }}>สรุปยอดรวมเดือน{formatMonthName(monthData.month)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{monthData.totalQuantity.toLocaleString()}</td>
                                            <td style={{ border: 'none' }}></td>
                                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#000', fontSize: '1rem', textDecoration: 'underline' }}>
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
