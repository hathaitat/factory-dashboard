import React from 'react';
import { thaiBaht } from '../utils/thaiBaht';
import '../styles/SupplierPoPrint.css';

const SupplierPoPrintTemplate = ({ po, company }) => {
    if (!po || !company) return null;

    const supplier = po.suppliers || {};
    const items = po.supplier_po_items || [];

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('th-TH') : '-';
    const formatCurrency = (amount, decimals = 2) => Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const formatQty = (qty) => Number(qty || 0).toLocaleString();

    const emptyRowsCount = Math.max(0, 4 - items.length);

    return (
        <div className="po-print-paper">
            {/* 1. Header Section (Outside the box) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                {company.logoUrl && (
                    <img src={company.logoUrl} alt="Company Logo" style={{ height: '80px', maxWidth: '250px', objectFit: 'contain' }} />
                )}


            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{company.name}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '20px' }}>
                <br /> {company.address} โทรศัพท์ {company.phone} โทรสาร {company.fax || '-'} <br />
                E-mail : {company.email || '-'}
            </div>

            {/* 2. Main Outer Box */}
            <div style={{ border: '1px solid #000' }}>

                {/* Title */}
                <div style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #000' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', letterSpacing: '0.5px', lineHeight: '1.2' }}>ใบสั่งซื้อ (PURCHASE ORDER)</div>
                </div>

                {/* PO Info */}
                <div style={{ display: 'flex', padding: '20px', fontSize: '0.85rem', borderBottom: '1px solid #000' }}>
                    {/* Left (Vendor) */}
                    <div style={{ flex: 1.4, paddingRight: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '22px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50px', verticalAlign: 'top' }}>ATTN :</td>
                                    <td>{supplier.contact_name || '-'}</td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td style={{ paddingTop: '5px' }}><strong>{supplier.name} {supplier.branch && `(สาขา ${supplier.branch})`}</strong></td>
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
                                    <td>{formatDate(po.date)}</td>
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
                                    <td style={{ paddingTop: '5px' }}>{formatDate(po.delivery_date)}</td>
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
                                <td style={{ borderRight: '1px solid #000', textAlign: 'left', paddingLeft: '10px', verticalAlign: 'top', paddingTop: '5px', wordBreak: 'break-word' }}>
                                    {item.description}
                                    {item.note && <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{item.note}</div>}
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
                                <td style={{ borderRight: '1px solid #000', verticalAlign: 'top', paddingTop: '5px' }}>{formatDate(item.due_date || po.delivery_date)}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'right', paddingRight: '5px', verticalAlign: 'top', paddingTop: '5px' }}>{formatQty(item.quantity)}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'left', paddingLeft: '5px', verticalAlign: 'top', paddingTop: '5px' }}>{item.unit}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'right', paddingRight: '10px', verticalAlign: 'top', paddingTop: '5px' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ textAlign: 'right', paddingRight: '10px', verticalAlign: 'top', paddingTop: '5px' }}>{formatCurrency(item.amount)}</td>
                            </tr>
                        ))}
                        {[...Array(emptyRowsCount)].map((_, i) => (
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
                            <td colSpan="5" style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '8px' }}>
                                <span style={{ fontWeight: '500' }}>{thaiBaht(po.grand_total || 0)}</span>
                            </td>
                            <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left', padding: '6px 10px', lineHeight: '1.2' }}>
                                <div style={{ fontWeight: '600', color: '#1f2937' }}>รวมเงิน</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.5px', marginTop: '2px' }}>SUB TOTAL</div>
                            </td>
                            <td style={{ borderTop: '1px solid #000', textAlign: 'right', paddingRight: '10px', fontWeight: '500' }}>{formatCurrency(po.sub_total)}</td>
                        </tr>
                        <tr>
                            <td colSpan="5" style={{ borderRight: 'none', borderTop: 'none' }}></td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: '1px solid #000', textAlign: 'left', padding: '6px 10px', lineHeight: '1.2' }}>
                                <div style={{ fontWeight: '600', color: '#1f2937' }}>ภาษีมูลค่าเพิ่ม {po.vat_rate}%</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.5px', marginTop: '2px' }}>VAT</div>
                            </td>
                            <td style={{ borderTop: '1px solid #000', textAlign: 'right', paddingRight: '10px', fontWeight: '500' }}>{formatCurrency(po.vat_amount)}</td>
                        </tr>
                        <tr>
                            <td colSpan="5" style={{ borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}></td>
                            <td style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', borderTop: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'left', padding: '8px 10px', lineHeight: '1.2', backgroundColor: '#f8f9fa' }}>
                                <div style={{ fontWeight: '700', color: '#111827' }}>ยอดเงินสุทธิ</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.5px', marginTop: '2px' }}>GRAND TOTAL</div>
                            </td>
                            <td style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', textAlign: 'right', paddingRight: '10px', fontWeight: '700', fontSize: '0.95rem', backgroundColor: '#f8f9fa' }}>{formatCurrency(po.grand_total)}</td>
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
