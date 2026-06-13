import React from 'react';
import '../styles/SupplierPoPrint.css'; // Reusing the same print styles for A4 layout

const InternalRequisitionPrintTemplate = ({ requisition, company }) => {
    if (!requisition || !company) return null;

    const items = requisition.items || [];
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('th-TH') : '-';
    const formatQty = (qty) => Number(qty || 0).toLocaleString();

    const emptyRowsCount = Math.max(0, 15 - items.length);

    return (
        <div className="po-print-paper">
            {/* 1. Header Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                {company.logoUrl && (
                    <img src={company.logoUrl} alt="Company Logo" style={{ height: '80px', maxWidth: '250px', objectFit: 'contain' }} />
                )}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{company.name}</div>
                </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '20px' }}>
                {company.address} โทรศัพท์ {company.phone} โทรสาร {company.fax || '-'}
            </div>

            {/* 2. Main Outer Box */}
            <div style={{ border: '1px solid #000' }}>
                {/* Title */}
                <div style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #000', backgroundColor: '#f8f9fa' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', letterSpacing: '0.5px', lineHeight: '1.2' }}>ใบเบิกสินค้าภายใน</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280', letterSpacing: '2px', marginTop: '2px' }}>INTERNAL REQUISITION</div>
                </div>

                {/* Info */}
                <div style={{ display: 'flex', padding: '10px', fontSize: '0.85rem', borderBottom: '1px solid #000' }}>
                    <div style={{ flex: 1.4, paddingRight: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '22px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '100px', verticalAlign: 'top' }}>ผู้ขอเบิก :</td>
                                    <td><strong>{requisition.requested_by || '-'}</strong></td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top', paddingTop: '5px' }}>สถานะ :</td>
                                    <td style={{ paddingTop: '5px' }}>{requisition.status || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ verticalAlign: 'top', paddingTop: '5px' }}>หมายเหตุ :</td>
                                    <td style={{ paddingTop: '5px', whiteSpace: 'pre-wrap' }}>{requisition.remark || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '22px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '110px', verticalAlign: 'top' }}>วันที่ ( DATE )</td>
                                    <td>{formatDate(requisition.date)}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>เลขที่ ( REQ. NO. )</td>
                                    <td style={{ paddingTop: '5px' }}>{requisition.requisition_number}</td>
                                </tr>
                                <tr>
                                    <td style={{ paddingTop: '5px' }}>อ้างอิง</td>
                                    <td style={{ paddingTop: '5px' }}>-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '10%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>ลำดับ<br />NO.</th>
                            <th style={{ width: '45%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px', textAlign: 'left', paddingLeft: '10px' }}>รายการ<br />DESCRIPTION</th>
                            <th style={{ width: '15%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>ขอเบิก<br />REQUESTED</th>
                            <th style={{ width: '15%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '5px' }}>อนุมัติแล้ว<br />APPROVED</th>
                            <th style={{ width: '15%', borderBottom: '1px solid #000', padding: '5px' }}>หน่วย<br />UNIT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const requested = Number(item.quantity) || 0;
                            const approved = Number(item.approved_quantity) || 0;
                            return (
                                <tr key={index} style={{ height: '30px' }}>
                                    <td style={{ borderRight: '1px solid #000', verticalAlign: 'top', paddingTop: '5px' }}>{index + 1}</td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'left', paddingLeft: '10px', verticalAlign: 'top', paddingTop: '5px', wordBreak: 'break-word' }}>
                                        {item.item_name}
                                    </td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center', verticalAlign: 'top', paddingTop: '5px' }}>{formatQty(requested)}</td>
                                    <td style={{ borderRight: '1px solid #000', textAlign: 'center', verticalAlign: 'top', paddingTop: '5px' }}>{formatQty(approved)}</td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '5px' }}>{item.unit || '-'}</td>
                                </tr>
                            );
                        })}
                        {[...Array(emptyRowsCount)].map((_, i) => (
                            <tr key={`empty-${i}`} style={{ height: '30px' }}>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer Signatures */}
                <div style={{ padding: '30px 20px', fontSize: '0.85rem', borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ borderBottom: '1px dotted #000', width: '150px', height: '25px' }}></div>
                        <div style={{ marginTop: '5px' }}>ผู้ขอเบิก</div>
                        <div style={{ marginTop: '5px' }}>( {requisition.requested_by || '......................................'} )</div>
                        <div style={{ marginTop: '5px' }}>วันที่ ....... / ....... / .......</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ borderBottom: '1px dotted #000', width: '150px', height: '25px' }}></div>
                        <div style={{ marginTop: '5px' }}>ผู้อนุมัติ</div>
                        <div style={{ marginTop: '5px' }}>( {requisition.approved_by || '......................................'} )</div>
                        <div style={{ marginTop: '5px' }}>วันที่ ....... / ....... / .......</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ borderBottom: '1px dotted #000', width: '150px', height: '25px' }}></div>
                        <div style={{ marginTop: '5px' }}>ผู้รับของ</div>
                        <div style={{ marginTop: '5px' }}>( ...................................... )</div>
                        <div style={{ marginTop: '5px' }}>วันที่ ....... / ....... / .......</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InternalRequisitionPrintTemplate;
