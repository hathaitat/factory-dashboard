import XLSX from 'xlsx-js-style';

/**
 * Creates and downloads a Delivery Schedule Excel file
 * @param {Array} pos - Array of Purchase Orders with their items
 * @param {Object} customer - Customer data
 * @param {Object} company - Company data (supplier)
 */
export const exportDeliverySchedule = (pos, customer, company) => {
    // 1. Prepare Data Rows
    const dataRows = [];
    
    // Calculate max deliveries to know how many "ส่งรอบ" columns we need
    let maxDeliveries = 0;
    
    pos.forEach(po => {
        if (po.purchase_order_items) {
            po.purchase_order_items.forEach(item => {
                if (item.delivery_schedule && Array.isArray(item.delivery_schedule)) {
                    maxDeliveries = Math.max(maxDeliveries, item.delivery_schedule.length);
                }
            });
        }
    });
    
    // Ensure at least 3 delivery rounds for template consistency, even if less
    maxDeliveries = Math.max(3, maxDeliveries);

    // Group items by PO
    pos.forEach((po) => {
        if (!po.purchase_order_items || po.purchase_order_items.length === 0) return;
        
        po.purchase_order_items.forEach((item, itemIndex) => {
            const schedule = Array.isArray(item.delivery_schedule) ? item.delivery_schedule : [];
            const deliveredQty = Number(item.delivered_quantity) || 0;
            const poQty = Number(item.quantity) || 0;
            const balance = poQty - deliveredQty;
            
            const rowData = {
                no: itemIndex + 1,
                poNumber: po.po_number,
                sku: item.sku || '-',
                productName: item.product_name,
                poQuantity: poQty,
                unit: item.unit,
                totalDelivered: deliveredQty,
                balance: balance > 0 ? balance : 0,
                status: balance <= 0 ? 'ครบ' : 'ค้างส่ง'
            };
            
            // Add schedule columns
            for (let i = 0; i < maxDeliveries; i++) {
                if (i < schedule.length) {
                    rowData[`delivery_${i+1}`] = Number(schedule[i].quantity);
                    rowData[`delivery_date_${i+1}`] = schedule[i].date ? new Date(schedule[i].date).toLocaleDateString('th-TH') : '-';
                } else {
                    rowData[`delivery_${i+1}`] = '-';
                    rowData[`delivery_date_${i+1}`] = '-';
                }
            }
            
            dataRows.push(rowData);
        });
    });

    // 2. Build Excel Structure
    const wsData = [];
    
    // Header Style
    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
        fill: { fgColor: { rgb: "1E3A8A" } }, // Dark blue
        alignment: { horizontal: "center", vertical: "center" }
    };
    
    const subHeaderStyle = {
        font: { bold: true, sz: 11 },
        alignment: { horizontal: "left", vertical: "center" }
    };
    
    const thStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    };
    
    const thStyleGreen = {
        ...thStyle,
        fill: { fgColor: { rgb: "166534" } }, // Dark green for deliveries
    };
    
    const cellStyle = {
        font: { sz: 11 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    };
    
    const cellStyleCenter = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyleRight = { ...cellStyle, alignment: { horizontal: "right", vertical: "center" } };
    
    const cellStyleZebra = {
        ...cellStyle,
        fill: { fgColor: { rgb: "F3F4F6" } } // Light gray
    };
    const cellStyleCenterZebra = { ...cellStyleZebra, alignment: { horizontal: "center", vertical: "center" } };
    const cellStyleRightZebra = { ...cellStyleZebra, alignment: { horizontal: "right", vertical: "center" } };

    // Row 1: Main Title
    wsData.push([{ v: "แผนการจัดส่งสินค้า (DELIVERY SCHEDULE)", s: headerStyle }]);
    
    // Row 2: Customer Info
    const customerName = customer?.name || 'ไม่ระบุลูกค้า';
    wsData.push([
        { v: `ลูกค้า / Customer: ${customerName}`, s: subHeaderStyle }
    ]);
    
    // Row 3: Supplier Info & PO Ref
    const supplierName = company?.name || 'ไม่ระบุผู้ขาย';
    const poRefs = pos.map(p => p.po_number).join(', ');
    wsData.push([
        { v: `ผู้ขาย / Supplier: ${supplierName}`, s: subHeaderStyle },
        null, null, null,
        { v: `อ้างอิงใบสั่งซื้อ PO: ${poRefs}`, s: subHeaderStyle }
    ]);
    
    // Row 4: Contact & Payment terms
    const contactPerson = customer?.contact_person || '-';
    const creditTerm = customer?.credit_term || '-';
    wsData.push([
        { v: `ผู้สั่งซื้อ / Contact: ${contactPerson}`, s: subHeaderStyle },
        null, null, null,
        { v: `เงื่อนไขการชำระเงิน: ${creditTerm} วัน`, s: subHeaderStyle }
    ]);
    
    // Empty row
    wsData.push([]);
    
    // Table Header Row 1
    const thRow = [
        { v: "ลำดับ\nNo.", s: thStyle },
        { v: "เลขที่ PO", s: thStyle },
        { v: "รหัสสินค้า\nSKU", s: thStyle },
        { v: "รายการสินค้า\nDescription", s: thStyle },
        { v: "จำนวนตาม PO\nQty", s: thStyle }
    ];
    
    for (let i = 0; i < maxDeliveries; i++) {
        thRow.push({ v: `ส่งรอบ ${i+1}`, s: thStyleGreen });
    }
    
    thRow.push({ v: "รวมจัดส่ง\nDelivered", s: thStyle });
    thRow.push({ v: "คงเหลือ\nBalance", s: thStyle });
    thRow.push({ v: "หน่วย\nUnit", s: thStyle });
    thRow.push({ v: "สถานะ\nStatus", s: thStyle });
    
    wsData.push(thRow);
    
    // Table Data Rows
    let totalPoQty = 0;
    let totalDelivered = 0;
    let totalBalance = 0;
    
    dataRows.forEach((row, index) => {
        const isZebra = index % 2 === 1;
        const cStyle = isZebra ? cellStyleZebra : cellStyle;
        const cCenter = isZebra ? cellStyleCenterZebra : cellStyleCenter;
        const cRight = isZebra ? cellStyleRightZebra : cellStyleRight;
        
        totalPoQty += row.poQuantity;
        totalDelivered += row.totalDelivered;
        totalBalance += row.balance;
        
        const dataRow = [
            { v: row.no, s: cCenter },
            { v: row.poNumber, s: cCenter },
            { v: row.sku, s: cCenter },
            { v: row.productName, s: cStyle },
            { v: row.poQuantity, t: "n", z: "#,##0.00", s: cRight }
        ];
        
        for (let i = 0; i < maxDeliveries; i++) {
            const qty = row[`delivery_${i+1}`];
            const date = row[`delivery_date_${i+1}`];
            if (qty !== '-') {
                dataRow.push({ v: `${Number(qty).toLocaleString()}\n(${date})`, s: cCenter });
            } else {
                dataRow.push({ v: "-", s: cCenter });
            }
        }
        
        dataRow.push({ v: row.totalDelivered, t: "n", z: "#,##0.00", s: cRight });
        dataRow.push({ v: row.balance, t: "n", z: "#,##0.00", s: cRight });
        dataRow.push({ v: row.unit, s: cCenter });
        
        // Status with color
        const statusStyle = { ...cCenter };
        if (row.status === 'ครบ') {
            statusStyle.font = { ...statusStyle.font, color: { rgb: "166534" }, bold: true }; // Green
        } else {
            statusStyle.font = { ...statusStyle.font, color: { rgb: "B91C1C" }, bold: true }; // Red
        }
        dataRow.push({ v: row.status, s: statusStyle });
        
        wsData.push(dataRow);
    });
    
    // Footer Row
    const footerStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: "E5E7EB" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        }
    };
    
    const fRow = [
        { v: "ยอดรวมทั้งหมด", s: footerStyle },
        { v: "", s: footerStyle },
        { v: "", s: footerStyle },
        { v: "", s: footerStyle },
        { v: totalPoQty, t: "n", z: "#,##0.00", s: footerStyle }
    ];
    
    for (let i = 0; i < maxDeliveries; i++) {
        fRow.push({ v: "", s: footerStyle });
    }
    
    fRow.push({ v: totalDelivered, t: "n", z: "#,##0.00", s: footerStyle });
    fRow.push({ v: totalBalance, t: "n", z: "#,##0.00", s: footerStyle });
    fRow.push({ v: "", s: footerStyle });
    fRow.push({ v: "", s: footerStyle });
    
    wsData.push(fRow);
    
    // 3. Create Workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Merges
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + maxDeliveries + 4 } }, // Title across all columns
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + maxDeliveries + 4 } }, // Customer across all columns
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Supplier
        { s: { r: 2, c: 4 }, e: { r: 2, c: 4 + maxDeliveries + 4 } }, // PO Ref
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // Contact
        { s: { r: 3, c: 4 }, e: { r: 3, c: 4 + maxDeliveries + 4 } }, // Payment Term
        { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 3 } } // Footer total label
    ];
    
    // Column Widths
    const colWidths = [
        { wch: 8 },  // No
        { wch: 15 }, // PO No
        { wch: 15 }, // SKU
        { wch: 40 }, // Desc
        { wch: 12 }, // PO Qty
    ];
    for (let i = 0; i < maxDeliveries; i++) {
        colWidths.push({ wch: 15 }); // Delivery slots (need space for date)
    }
    colWidths.push({ wch: 12 }); // Delivered
    colWidths.push({ wch: 12 }); // Balance
    colWidths.push({ wch: 8 });  // Unit
    colWidths.push({ wch: 10 }); // Status
    
    ws["!cols"] = colWidths;
    
    // Row Heights for data rows to fit multi-line delivery
    ws["!rows"] = [];
    wsData.forEach((r, idx) => {
        if (idx === 0) ws["!rows"].push({ hpt: 30 }); // Title
        else if (idx === 5) ws["!rows"].push({ hpt: 30 }); // Header
        else if (idx > 5 && idx < wsData.length - 1) ws["!rows"].push({ hpt: 35 }); // Data rows with newlines
        else ws["!rows"].push({ hpt: 20 }); // Others
    });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Delivery_Schedule");
    
    // Generate filename
    const sanitizedCustomer = customerName.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Delivery_Schedule_${sanitizedCustomer}_${dateStr}.xlsx`);
};
