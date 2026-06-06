import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { quotationService } from '../services/quotationService';
import { companyService } from '../services/companyService';

const QuotationPrintTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        const [qtData, compData] = await Promise.all([
            quotationService.getQuotationById(id),
            companyService.getCompanyInfo()
        ]);

        setQuotation(qtData);
        setCompany(compData);
        setIsLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <div className="p-8">กำลังโหลด...</div>;
    if (!quotation || !company) return <div className="p-8">ไม่พบข้อมูลใบเสนอราคา</div>;

    const cust = quotation.customer || quotation.customerSnapshot || {};
    const filledItems = [...quotation.items];
    const MIN_ROWS = 10;
    while (filledItems.length < MIN_ROWS) {
        filledItems.push({ id: `empty-${filledItems.length}`, isEmpty: true });
    }

    return (
        <div className="print-container" style={{ fontFamily: '"Sarabun", "TH Sarabun New", "Arial", sans-serif', color: '#000' }}>
            <style>
                {`
                    @media print {
                        body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                        .no-print { display: none !important; }
                        .print-container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 2mm; box-sizing: border-box; }
                        .print-table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
                        .print-table th, .print-table td { border: 1px solid #000; padding: 4px 8px; font-size: 13pt; line-height: 1.2; }
                        .print-table th { text-align: center; }
                        .border-none { border: none !important; }
                        .border-left { border-left: 1px solid #000 !important; }
                        .border-right { border-right: 1px solid #000 !important; }
                        .border-top { border-top: 1px solid #000 !important; }
                        .border-bottom { border-bottom: 1px solid #000 !important; }
                        .flex-col { display: flex; flex-direction: column; }
                    }
                    @media screen {
                        .print-container { width: 210mm; margin: 2rem auto; padding: 10mm; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-height: 297mm; }
                        .print-table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
                        .print-table th, .print-table td { border: 1px solid #000; padding: 4px 8px; font-size: 11pt; line-height: 1.2; }
                        .print-table th { text-align: center; }
                        body { background: #f0f2f5; }
                        .border-none { border: none !important; }
                        .border-left { border-left: 1px solid #000 !important; }
                        .border-right { border-right: 1px solid #000 !important; }
                        .border-top { border-top: 1px solid #000 !important; }
                        .border-bottom { border-bottom: 1px solid #000 !important; }
                    }
                    * { box-sizing: border-box; }
                `}
            </style>

            <div className="no-print" style={{ 
                padding: '0.8rem 1.5rem', 
                display: 'flex', 
                alignItems: 'center',
                gap: '1rem',
                background: '#111', 
                color: 'white', 
                position: 'fixed', 
                top: 0, 
                left: 0,
                right: 0,
                zIndex: 1000,
                borderBottom: '1px solid #333'
            }}>
                <button 
                    onClick={() => navigate('/dashboard/quotations')} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> ย้อนกลับ
                </button>
                
                <button 
                    onClick={handlePrint} 
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: '#3b82f6', border: 'none', color: 'white', 
                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Printer size={18} /> พิมพ์ใบเสนอราคา
                </button>
            </div>
            {/* Spacer for fixed header */}
            <div className="no-print" style={{ height: '60px' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
                {company.logoUrl && (
                    <img src={company.logoUrl} alt="Company Logo" style={{ height: '90px', maxWidth: '250px', objectFit: 'contain' }} />
                )}
                <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
                    {company.nameEn && <div style={{ fontSize: '16pt', fontFamily: 'serif' }}>{company.nameEn}</div>}
                    <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>{company.name}</div>
                    <div style={{ fontSize: '13pt' }}>
                        {[
                            company.address,
                            company.phone && `โทรศัพท์ ${company.phone}`,
                            company.fax && `โทรสาร ${company.fax}`
                        ].filter(Boolean).join(' ')}
                    </div>
                    {company.email && <div style={{ fontSize: '13pt' }}>E-mail : {company.email}</div>}
                </div>
            </div>

            <div style={{ marginTop: '5px', marginBottom: '10px' }}>
                <svg width="100%" height="2">
                    <line x1="10%" y1="1" x2="90%" y2="1" stroke="black" strokeWidth="1" />
                </svg>
            </div>

            <div style={{ border: '1px solid #000', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', fontSize: '15pt', borderBottom: '1px solid #000', padding: '8px 0' }}>
                    ใบเสนอราคา &nbsp;&nbsp;&nbsp; QUOTATION
                </div>

                <div style={{ display: 'flex', minHeight: '140px' }}>
                    <div style={{ width: '55%', padding: '10px 15px', borderRight: '1px solid #000', fontSize: '13pt', lineHeight: '1.6' }}>
                        <div className="flex">
                            <div style={{ width: '50px' }}>ATTN</div>
                            <div>{quotation.attnName ? `คุณ ${quotation.attnName}` : ''}</div>
                        </div>
                        <div className="flex">
                            <div style={{ width: '50px' }}>บริษัท</div>
                            <div>{cust.name} {cust.branch && `(สาขา ${cust.branch})`}</div>
                        </div>
                        <div style={{ display: 'flex', marginTop: '5px' }}>
                            <div style={{ width: '50px' }}></div>
                            <div className="flex-1">{cust.address}</div>
                        </div>
                        <div className="flex">
                            <div style={{ width: '50px' }}>TEL.</div>
                            <div>{cust.phone || '-'}</div>
                            {cust.fax && (
                                <>
                                    <div style={{ width: '50px', marginLeft: '20px' }}>FAX.</div>
                                    <div>{cust.fax}</div>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ width: '45%', padding: '10px 15px', fontSize: '13pt', lineHeight: '1.6' }}>
                        <div className="flex justify-between">
                            <div style={{ width: '220px' }}>วันที่ ( DATE )</div>
                            <div>{new Date(quotation.date).toLocaleDateString('th-TH')}</div>
                        </div>
                        <div className="flex justify-between">
                            <div style={{ width: '220px' }}>เลขที่ ( QT/NO. )</div>
                            <div>{quotation.quotationNo}</div>
                        </div>
                        <div className="flex justify-between">
                            <div style={{ width: '220px' }}>ยืนราคา ( VALIDITY )</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <span>{quotation.validityDays}</span>
                                <span>วัน</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <div style={{ width: '220px' }}>กำหนดชำระเงิน ( PAYMENT TIME )</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <span>{quotation.paymentCondition}</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <div style={{ width: '220px' }}>กำหนดส่งสินค้า ( DELIVERY TIME )</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <span>{quotation.deliveryTime}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '8%', fontWeight: 'normal' }}>
                            ลำดับ<br />NO.
                        </th>
                        <th style={{ width: '47%', fontWeight: 'normal' }}>
                            รายการ<br />DESCRIPTION
                        </th>
                        <th style={{ width: '15%', fontWeight: 'normal' }}>
                            จำนวน<br />QUANTITY
                        </th>
                        <th style={{ width: '15%', fontWeight: 'normal' }}>
                            ราคา : หน่วย<br />UNIT PRICE (฿)
                        </th>
                        <th style={{ width: '15%', fontWeight: 'normal' }}>
                            จำนวนเงิน<br />AMOUNT (฿)
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filledItems.map((item, index) => (
                        <tr key={item.id || `empty-${index}`} style={{ height: '28px' }}>
                            <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>
                                {!item.isEmpty && (index + 1)}
                            </td>
                            <td style={{ borderBottom: 'none', borderTop: 'none', paddingLeft: '10px' }}>
                                {!item.isEmpty && item.productName}
                            </td>
                            <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>
                                {!item.isEmpty && item.quantity}
                            </td>
                            <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>
                                {!item.isEmpty && item.pricePerUnit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>
                                {!item.isEmpty && item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}

                    {/* Totals Section */}
                    <tr>
                        <td rowSpan={4} colSpan={2} style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000', verticalAlign: 'top', padding: '10px' }}>
                            {quotation.notes && (
                                <div>
                                    <div style={{ textDecoration: 'underline', marginBottom: '4px' }}>หมายเหตุ:</div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                                </div>
                            )}
                        </td>
                        <td colSpan={2} style={{ paddingLeft: '10px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            รวมเงิน &nbsp; (SUB TOTAL)
                        </td>
                        <td style={{ textAlign: 'right', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            {quotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={{ paddingLeft: '10px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            หักส่วนลด
                        </td>
                        <td style={{ textAlign: 'right', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            {quotation.discount > 0 ? quotation.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={{ paddingLeft: '10px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            ภาษีมูลค่าเพิ่ม ( VAT {quotation.vatRate}% )
                        </td>
                        <td style={{ textAlign: 'right', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            {quotation.vatAmount > 0 ? quotation.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={{ paddingLeft: '10px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            ยอดเงินสุทธิ ( TOTAL )
                        </td>
                        <td style={{ textAlign: 'right', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                            {quotation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style={{ marginTop: '30px', fontSize: '12pt', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '30px' }}>
                    <div style={{ width: '400px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                        <div style={{ width: '160px' }}>ผู้เสนอราคา ( ISSUED BY. )</div>
                        <div style={{ flex: 1, borderBottom: '1px solid #000', height: '20px' }}></div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '30px' }}>
                    <div style={{ width: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div>( {company.name} )</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div>
                        <div style={{ marginBottom: '15px' }}>ลูกค้าอนุมัติการสั่งซื้อ ( CUSTOMER APPROVED )</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
                            <div>ผู้อนุมัติ</div>
                            <div style={{ width: '250px', borderBottom: '1px solid #000', height: '20px' }}></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '300px', marginLeft: '10px', marginTop: '15px' }}>
                            <div>(</div>
                            <div>)</div>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '30px' }}>
                            <div style={{ width: '160px' }}>ผู้อนุมัติ ( APPROVER BY. )</div>
                            <div style={{ width: '232px', borderBottom: '1px solid #000', height: '20px' }}></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: '30px', marginTop: '10px' }}>
                            <div style={{ width: '400px', textAlign: 'center' }}>( {company.name} )</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationPrintTemplate;
