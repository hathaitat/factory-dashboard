import React from 'react';
import { thaiBaht } from '../utils/thaiBaht';
import '../styles/SupplierPoPrint.css';

const SupplierPoPrintTemplate = ({ po, company }) => {
    if (!po || !company) return null;

    const supplier = po.suppliers || {};
    const items = po.supplier_po_items || [];

    return (
        <div className="po-print-paper">
            {/* 1. Header Section (Outside the box) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                    src="/images/logo-nobg.png"
                    alt="MAW Logo"
                    style={{ width: '120px', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    onError={(e) => e.target.style.display = 'none'}
                />
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'serif' }}>MULTIPLY AUTO WORKS CO.,LTD.</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '5px' }}>บริษัท มัลติพลายส์ ออโต้ เวิร์ค จำกัด</div>
                </div>
                <div style={{ width: '120px' }}></div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '10px' }}>
                {company.address} โทรศัพท์ {company.phone} โทรสาร {company.fax || '-'}
            </div>

            {/* 2. Main Outer Box */}
            <div style={{ border: '1px solid #000' }}>

                {/* Title */}
                <div style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 'bold', padding: '8px', borderBottom: '1px solid #000' }}>
                    ใบสั่งซื้อ PURCHASE ORDER
                </div>

                {/* PO Info */}
                <div style={{ display: 'flex', padding: '10px', fontSize: '0.85rem', borderBottom: '1px solid #000' }}>
                    {/* Left (Vendor) */}
                    <div style={{ flex: 1.4, paddingRight: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '22px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50px', verticalAlign: 'top' }}>ATTN :</td>
                                    <td>{po.contact_person || '-'}</td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td style={{ paddingTop: '5px' }}><strong>{supplier.name}</strong></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td style={{ paddingTop: '5px' }}>{supplier.address || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>TEL .</td>
                                    <td style={{ paddingTop: '5px' }}>{supplier.phone || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>FAX .</td>
                                    <td style={{ paddingTop: '5px' }}>{supplier.fax || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Right (Meta) */}
                    <div style={{ flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '22px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '110px', verticalAlign: 'top' }}>วันที่ ( DATE )</td>
                                    <td>{new Date(po.date).toLocaleDateString('th-TH')}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>เลขที่ ( PO/NO. )</td>
                                    <td style={{ paddingTop: '5px' }}>{po.po_number}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>กำหนดชำระเงิน</td>
                                    <td style={{ paddingTop: '5px' }}>{po.credit_term || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>วันที่ส่งสินค้า</td>
                                    <td style={{ paddingTop: '5px' }}>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>อ้างอิง</td>
                                    <td style={{ paddingTop: '5px' }}>{po.reference_doc || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '6%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>ลำดับ<br />NO.</th>
                            <th style={{ width: '38%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px', textAlign: 'left', paddingLeft: '10px' }}>รายการ<br />DESCRIPTION</th>
                            <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>กำหนดส่ง<br />DUE DATE</th>
                            <th colSpan="2" style={{ width: '14%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>รวมจำนวน<br />TOTAL</th>
                            <th style={{ width: '15%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>ราคา : หน่วย<br />UNIT PRICE</th>
                            <th style={{ width: '15%', borderBottom: '1px solid #000', padding: '5px' }}>จำนวนเงิน<br />AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} style={{ height: '30px' }}>
                                <td style={{ borderRight: '1px solid #000', verticalAlign: 'top', paddingTop: '5px' }}>{index + 1}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'left', paddingLeft: '10px', verticalAlign: 'top', paddingTop: '5px' }}>
                                    {item.description}
                                    {item.note && <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '2px' }}>{item.note}</div>}
                                    {item.image_url && (
                                        <div style={{ marginTop: '8px', marginBottom: '5px' }}>
                                            <img 
                                                src={item.image_url} 
                                                alt="item" 
                                                style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain', borderRadius: '2px', border: '1px solid #ddd' }} 
                                            />
                                        </div>
                                    )}
                                </td>
                                <td style={{ borderRight: '1px solid #000', verticalAlign: 'top', paddingTop: '5px' }}>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'right', paddingRight: '5px', verticalAlign: 'top', paddingTop: '5px' }}>{item.quantity.toLocaleString()}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'left', paddingLeft: '5px', verticalAlign: 'top', paddingTop: '5px' }}>{item.unit}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'right', paddingRight: '10px', verticalAlign: 'top', paddingTop: '5px' }}>{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', verticalAlign: 'top', paddingTop: '5px' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                        {[...Array(Math.max(0, 3 - items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} style={{ height: '30px' }}>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="5" style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '5px' }}>
                                {thaiBaht(po.grand_total || 0)}
                            </td>
                            <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left', paddingLeft: '5px' }}>รวมเงิน<br /> ( SUB TOTAL )</td>
                            <td style={{ borderTop: '1px solid #000', textAlign: 'right', paddingRight: '10px' }}>{po.sub_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan="5" style={{ borderRight: '1px solid #000', borderTop: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left', paddingLeft: '5px' }}>ภาษีมูลค่าเพิ่ม<br /> ( VAT {po.vat_rate}% )</td>
                            <td style={{ borderTop: '1px solid #000', textAlign: 'right', paddingRight: '10px' }}>{po.vat_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan="5" style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}></td>
                            <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'left', paddingLeft: '5px' }}>ยอดเงินสุทธิ <br /> ( TOTAL )</td>
                            <td style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'right', paddingRight: '10px' }}>{po.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Below Table Section */}
                <div style={{ padding: '15px 20px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                            <div>REMARK</div>
                            <div style={{ paddingLeft: '20px', color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                {po.remark || '-'}
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                                <div style={{ width: '120px' }}>ผู้สั่งซื้อ <br /> ( PURCHASE BY. )</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
                                    <div style={{ borderBottom: '1px solid #000', width: '100%', height: '25px', textAlign: 'center', fontWeight: 'bold' }}>
                                        {po.purchased_by || ''}
                                    </div>
                                    <div style={{ marginTop: '5px' }}>( {po.purchased_by || '......................................'} )</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                                <div style={{ width: '120px' }}>ผู้อนุมัติ <br />( APPROVER BY. )</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
                                    <div style={{ borderBottom: '1px solid #000', width: '100%', height: '25px', textAlign: 'center', fontWeight: 'bold' }}>
                                        {po.approved_by || ''}
                                    </div>
                                    <div style={{ marginTop: '5px' }}>( {po.approved_by || '......................................'} )</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <div><strong>ยืนยันการจัดส่ง</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <div style={{ width: '16px', height: '16px', border: '1px solid #000' }}></div>
                            <div>สามารถจัดส่งได้</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <div style={{ width: '16px', height: '16px', border: '1px solid #000' }}></div>
                            <div>ไม่สามารถจัดส่งได้ เพราะ........................................................................................................................</div>
                        </div>
                    </div>

                    <div style={{ border: '1px solid #000', padding: '8px', marginTop: '15px', width: 'max-content' }}>
                        <div>เมื่อได้รับเอกสารแล้วกรุณาเซ็นรับและส่งกลับ โดยทันที</div>
                        <div style={{ marginTop: '15px' }}>
                            SIGNATURE : .............................................................. DATE : .....................................................
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierPoPrintTemplate;
