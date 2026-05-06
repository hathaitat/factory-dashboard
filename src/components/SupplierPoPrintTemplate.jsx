import React from 'react';
import { thaiBaht } from '../utils/thaiBaht';

const SupplierPoPrintTemplate = ({ po }) => {
    if (!po) return null;

    const supplier = po.suppliers || {};
    const items = po.supplier_po_items || [];
    const warehouse = po.warehouses || {};

    return (
        <div className="po-print-template" style={{
            padding: '15mm',
            fontFamily: '"Sarabun", sans-serif',
            color: '#000',
            background: 'white',
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
                .po-print-template * { box-sizing: border-box; }
                .po-print-template table { width: 100%; border-collapse: collapse; }
                .po-print-template th, .po-print-template td { border: 1px solid #000; padding: 6px 8px; font-size: 13px; line-height: 1.4; }
                .po-print-template .no-border { border: none !important; }
                .po-print-template .text-center { text-align: center; }
                .po-print-template .text-right { text-align: right; }
                .po-print-template .bold { font-weight: 600; }
                `}
            </style>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ width: '130px', height: '65px', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', letterSpacing: '2px' }}>
                    MAW
                </div>
                <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>MULTIPLY AUTO WORKS CO.,LTD.</h2>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด</h3>
                    <p style={{ margin: '0', fontSize: '11px', color: '#333' }}>
                        3/312 หมู่ 9 ถนนสุวินทวงศ์ แขวงลำผักชี เขตหนองจอก กรุงเทพฯ 10530
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#333' }}>
                        โทรศัพท์ 0-2543-5532 โทรสาร 0-2543-5533
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#333' }}>
                        Web site : www.multiplyautoworks.com  E-mail : Multiplyautoworks@gmail.com
                    </p>
                </div>
                <div style={{ width: '130px', textAlign: 'right', fontSize: '11px' }}>
                    <div style={{ fontWeight: '600' }}>FM-PC-06</div>
                    <div>REV : 01</div>
                    <div>07/08/09</div>
                </div>
            </div>

            {/* Document Title */}
            <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', backgroundColor: '#f9f9f9' }}>
                ใบสั่งซื้อ ( PURCHASE ORDER )
            </div>

            {/* Info Section */}
            <div style={{ border: '1px solid #000', borderTop: 'none', display: 'flex', fontSize: '13px' }}>
                {/* Supplier Side */}
                <div style={{ flex: '1.2', borderRight: '1px solid #000', padding: '12px' }}>
                    <div style={{ display: 'flex', marginBottom: '6px' }}>
                        <div style={{ width: '65px', fontWeight: '600' }}>ATTN :</div>
                        <div style={{ fontWeight: '600' }}>{supplier.contact_person ? `คุณ ${supplier.contact_person}` : '-'}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '6px' }}>
                        <div style={{ width: '65px', fontWeight: '600' }}>VENDOR :</div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{supplier.name}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '6px' }}>
                        <div style={{ width: '65px', fontWeight: '600' }}>ADDRESS :</div>
                        <div style={{ flex: 1, paddingRight: '10px' }}>{supplier.address || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '2px' }}>
                        <div style={{ width: '65px', fontWeight: '600' }}>TEL :</div>
                        <div style={{ width: '120px' }}>{supplier.phone || '-'}</div>
                        <div style={{ width: '45px', fontWeight: '600', marginLeft: '10px' }}>FAX :</div>
                        <div>-</div>
                    </div>
                </div>

                {/* PO Metadata Side */}
                <div style={{ flex: '0.8', padding: '12px' }}>
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                        <div style={{ width: '120px', fontWeight: '600' }}>วันที่ ( DATE ) :</div>
                        <div>{new Date(po.date).toLocaleDateString('th-TH')}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                        <div style={{ width: '120px', fontWeight: '600' }}>เลขที่ ( PO/NO. ) :</div>
                        <div style={{ fontWeight: '700' }}>{po.po_number}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                        <div style={{ width: '120px', fontWeight: '600' }}>เงื่อนไขชำระเงิน :</div>
                        <div>{po.credit_term || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                        <div style={{ width: '120px', fontWeight: '600' }}>วันที่ส่งสินค้า :</div>
                        <div>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</div>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div style={{ width: '120px', fontWeight: '600' }}>อ้างอิงเลขที่ :</div>
                        <div>{po.reference_doc || '-'}</div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table style={{ borderTop: 'none' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ width: '45px', textAlign: 'center' }}>ลำดับ<br/>NO.</th>
                        <th style={{ textAlign: 'left' }}>รายการ<br/>DESCRIPTION</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>กำหนดส่ง<br/>DUE DATE</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>จำนวน<br/>QTY</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>ราคา / หน่วย<br/>UNIT PRICE</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>จำนวนเงิน<br/>AMOUNT</th>
                    </tr>
                </thead>
                <tbody style={{ height: '350px' }}>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ textAlign: 'left', fontWeight: '500' }}>{item.description}</td>
                            <td style={{ textAlign: 'center' }}>
                                {item.due_date ? new Date(item.due_date).toLocaleDateString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.quantity.toLocaleString()} {item.unit}</td>
                            <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    {/* Fill gap with empty rows */}
                    {[...Array(Math.max(0, 10 - items.length))].map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td style={{ height: '30px' }}></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="3" rowSpan="3" style={{ verticalAlign: 'middle', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{thaiBaht(po.grand_total || 0)}</div>
                        </td>
                        <td colSpan="2" style={{ textAlign: 'left', fontWeight: '600' }}>รวมเงิน ( SUB TOTAL )</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{po.sub_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td colSpan="2" style={{ textAlign: 'left', fontWeight: '600' }}>ภาษีมูลค่าเพิ่ม ( VAT {po.vat_rate}% )</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{po.vat_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <td colSpan="2" style={{ textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>ยอดเงินสุทธิ ( TOTAL )</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>{po.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Bottom Section */}
            <div style={{ marginTop: '12px', fontSize: '13px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontWeight: '700' }}>หมายเหตุ ( REMARK ) : </span>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{po.remark || '-'}</span>
                </div>

                {/* Signatures Area */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {/* Confirmation Result (Vendor Side) */}
                    <div style={{ width: '45%', border: '1px solid #000', padding: '10px' }}>
                        <div style={{ fontWeight: '700', marginBottom: '10px', textDecoration: 'underline' }}>ผลยืนยันการจัดส่ง ( VENDOR CONFIRMATION )</div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ width: '16px', height: '16px', border: '1px solid #000', marginRight: '10px' }}></div>
                            <div>สามารถจัดส่งได้ตามกำหนด</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <div style={{ width: '16px', height: '16px', border: '1px solid #000', marginRight: '10px', marginTop: '3px' }}></div>
                            <div style={{ flex: 1 }}>ไม่สามารถจัดส่งได้ เพราะ ......................................................</div>
                        </div>
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <div style={{ marginBottom: '5px' }}>..................................................................</div>
                            <div style={{ fontSize: '11px' }}>ผู้รับเรื่อง / วันที่ ( SIGNATURE / DATE )</div>
                        </div>
                    </div>

                    {/* Internal Signatures */}
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                            <div style={{ textAlign: 'center', width: '200px' }}>
                                <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontWeight: '600', height: '24px' }}>{po.purchased_by}</div>
                                <div style={{ fontWeight: '600' }}>ผู้สั่งซื้อ ( PURCHASE BY )</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                            <div style={{ textAlign: 'center', width: '200px' }}>
                                <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontWeight: '600', height: '24px' }}>{po.approved_by}</div>
                                <div style={{ fontWeight: '600' }}>ผู้อนุมัติ ( APPROVED BY )</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ border: '1px dashed #000', padding: '8px', marginTop: '25px', textAlign: 'center', fontSize: '11px' }}>
                    เมื่อได้รับใบสั่งซื้อแล้ว กรุณายืนยันการสั่งซื้อและส่งกลับมายังบริษัทฯ ทันที ขอบคุณครับ
                </div>
            </div>
        </div>
    );
};

export default SupplierPoPrintTemplate;
