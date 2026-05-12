import React from 'react';
import { thaiBaht } from '../utils/thaiBaht';
import '../styles/SupplierPoPrint.css';

const SupplierPoPrintTemplate = ({ po, company }) => {
    if (!po || !company) return null;

    const supplier = po.suppliers || {};
    const items = po.supplier_po_items || [];

    return (
        <div className="po-print-paper">
            {/* Header Section */}
            <div className="po-header-section">
                <div className="company-info-box">
                    <div className="company-name">{company.name}</div>
                    <div className="company-detail">{company.address}</div>
                    <div className="company-detail">
                        {[
                            company.phone && `TEL: ${company.phone}`,
                            company.fax && `FAX: ${company.fax}`,
                            company.email && `E-mail: ${company.email}`
                        ].filter(Boolean).join(' | ')}
                    </div>
                    <div className="company-detail">เลขประจำตัวผู้เสียภาษี: {company.taxId}</div>
                </div>
                <div className="doc-title-section">
                    <div className="doc-title-main">ใบสั่งซื้อ (PURCHASE ORDER)</div>
                </div>
            </div>

            {/* Details Section */}
            <div className="po-details-section">
                <div className="vendor-info">
                    <div className="info-row">
                        <span className="info-label">ผู้ขาย (VENDOR)</span>
                        <span className="info-value-bold">{supplier.name}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">ที่อยู่ (ADDRESS)</span>
                        <span className="info-value" style={{ fontSize: '0.9rem' }}>{supplier.address || '-'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">โทร (TEL)</span>
                        <span className="info-value">{supplier.phone || '-'}</span>
                        {po.reference_doc && (
                            <>
                                <span className="info-label" style={{ marginLeft: '1.5rem' }}>อ้างอิง</span>
                                <span className="info-value">{po.reference_doc}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="po-meta-info">
                    <div className="info-row">
                        <span className="info-label">เลขที่ PO</span>
                        <span className="info-value-bold">{po.po_number}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">วันที่</span>
                        <span className="info-value">{new Date(po.date).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">เครดิต</span>
                        <span className="info-value">{po.credit_term || '-'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">กำหนดส่ง</span>
                        <span className="info-value">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString('th-TH') : '-'}</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="po-items-table">
                <thead>
                    <tr>
                        <th style={{ width: '8%' }}>ลำดับ</th>
                        <th style={{ width: '45%' }}>รายการ / รายละเอียด</th>
                        <th style={{ width: '15%' }}>จำนวน</th>
                        <th style={{ width: '15%' }}>ราคา/หน่วย</th>
                        <th style={{ width: '17%' }}>จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} className="data-row">
                            <td className="text-center">{index + 1}</td>
                            <td style={{ verticalAlign: 'top', padding: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.description}</div>
                                {item.note && (
                                    <div style={{ 
                                        fontSize: '0.85rem', 
                                        marginTop: '4px', 
                                        whiteSpace: 'pre-wrap',
                                        paddingLeft: '10px',
                                        color: '#444'
                                    }}>
                                        {item.note}
                                    </div>
                                )}
                                {item.image_url && (
                                    <div style={{ marginTop: '8px', paddingLeft: '10px' }}>
                                        <img 
                                            src={item.image_url} 
                                            alt="item spec" 
                                            style={{ maxWidth: '180px', maxHeight: '150px', objectFit: 'contain', borderRadius: '2px', border: '1px solid #eee' }} 
                                        />
                                    </div>
                                )}
                            </td>
                            <td className="text-right">{item.quantity.toLocaleString()} {item.unit}</td>
                            <td className="text-right">{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    {/* Fill gap with empty rows */}
                    {[...Array(Math.max(0, 10 - items.length))].map((_, i) => (
                        <tr key={`empty-${i}`} className="empty-row">
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
                        <td colSpan="2" rowSpan={3} style={{ borderRight: '1px solid #000', borderBottom: 'none', verticalAlign: 'top', padding: '10px' }}>
                            <div style={{ fontSize: '0.9rem' }}>
                                <strong>หมายเหตุ:</strong><br />
                                {po.remark || '-'}
                            </div>
                        </td>
                        <td colSpan="2" className="summary-label">รวมเงิน</td>
                        <td className="summary-value">{po.sub_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td colSpan="2" className="summary-label">ภาษีมูลค่าเพิ่ม {po.vat_rate}%</td>
                        <td className="summary-value">{po.vat_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="baht-text-row">
                        <td colSpan="2" className="summary-total-label" style={{ borderTop: '1.5px solid #000', background: '#f8f9fa' }}>ยอดเงินสุทธิ (GRAND TOTAL)</td>
                        <td colSpan="2" className="summary-total-value" style={{ borderTop: '1.5px solid #000', background: '#f8f9fa', textAlign: 'center', fontSize: '0.9rem' }}>({thaiBaht(po.grand_total || 0)})</td>
                        <td className="summary-total-value" style={{ borderTop: '1.5px solid #000', background: '#f8f9fa', fontWeight: 'bold' }}>{po.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Footer / Signatures */}
            <div className="signature-grid">
                <div className="signature-item">
                    <div className="sig-line"></div>
                    <div className="sig-label">ผู้สั่งซื้อ (PURCHASED BY)</div>
                    <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>{po.purchased_by || '......................................'}</div>
                </div>
                <div className="signature-item">
                    <div className="sig-line"></div>
                    <div className="sig-label">ผู้อนุมัติ (APPROVED BY)</div>
                    <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>{po.approved_by || '......................................'}</div>
                </div>
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.85rem', color: '#666', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                เมื่อได้รับใบสั่งซื้อแล้ว กรุณายืนยันการสั่งซื้อและส่งกลับมายังบริษัทฯ ทันที ขอบคุณครับ
            </div>
        </div>
    );
};

export default SupplierPoPrintTemplate;
