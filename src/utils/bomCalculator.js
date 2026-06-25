export const calculateSubcontractTotal = (items, inventoryBomRules, subcontractInventoryId, supplierProducts) => {
    if (!subcontractInventoryId) return { qty: '', note: '' };

    let totalRawQty = 0;
    let calculationDetails = [];

    items.forEach((it) => {
        let currentRawQty = parseFloat(it.raw_material_qty) || 0;
        
        // If raw_material_qty is already calculated, we still want to show a nice ratio in the note if possible
        if (currentRawQty > 0) {
            const matchingRule = inventoryBomRules?.find(rule => 
                rule.supplier_product_id === it.supplier_product_id && 
                rule.inventory_id === subcontractInventoryId
            );

            if (matchingRule) {
                const ratio = Number(matchingRule.raw_material_qty) / Number(matchingRule.finished_product_qty);
                const exactRawQty = (it.quantity || 0) * ratio;
                
                let roundingText = '';
                if (matchingRule.rounding_mode === 'up' && currentRawQty !== exactRawQty) {
                    roundingText = ` ปัดขึ้นเป็น ${currentRawQty}`;
                } else if (matchingRule.rounding_mode === 'down' && currentRawQty !== exactRawQty) {
                    roundingText = ` ปัดลงเป็น ${currentRawQty}`;
                }
                
                calculationDetails.push(`${it.description || 'สินค้า'} (${it.quantity || 0} x ${ratio.toFixed(4)} = ${exactRawQty.toFixed(4)}${roundingText})`);
            } else {
                const selectedProduct = supplierProducts.find(p => p.id === it.supplier_product_id);
                if (selectedProduct && selectedProduct.raw_material_ratio > 0) {
                    calculationDetails.push(`${it.description || 'สินค้า'} (${it.quantity || 0} x ${selectedProduct.raw_material_ratio})`);
                } else {
                    calculationDetails.push(`${it.description || 'รายการอื่น'} (${currentRawQty})`);
                }
            }
            totalRawQty += currentRawQty;
        }
    });

    if (totalRawQty > 0) {
        return {
            qty: totalRawQty.toFixed(4),
            note: `(คำนวณจากสูตร: ${calculationDetails.join(' + ')} = ${totalRawQty.toFixed(4)})`
        };
    }

    return { qty: '', note: '' };
};
