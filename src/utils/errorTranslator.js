export const translateError = (errorMsg) => {
    if (!errorMsg) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    const message = typeof errorMsg === 'string' ? errorMsg : (errorMsg.message || '');
    
    const lowerMsg = message.toLowerCase();

    // Unique constraints
    if (lowerMsg.includes('duplicate key value') || lowerMsg.includes('unique constraint')) {
        if (lowerMsg.includes('purchase_orders_po_number_key') || lowerMsg.includes('po_number')) {
            return 'เลขที่เอกสารนี้ (PO Number) มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('invoices_invoice_number_key') || lowerMsg.includes('invoice_number')) {
            return 'เลขที่ใบกำกับภาษีนี้มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('quotations_quotation_number_key')) {
            return 'เลขที่ใบเสนอราคานี้มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('billing_notes_billing_number_key')) {
            return 'เลขที่ใบวางบิลนี้มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('receipts_receipt_number_key')) {
            return 'เลขที่ใบเสร็จรับเงินนี้มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('supplier_pos_po_number_key')) {
            return 'เลขที่ใบสั่งซื้อ (Vendor PO) นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น';
        }
        if (lowerMsg.includes('tax_id')) {
            return 'เลขประจำตัวผู้เสียภาษีนี้มีอยู่ในระบบแล้ว';
        }
        return 'ข้อมูลนี้มีอยู่ในระบบแล้ว (ข้อมูลซ้ำซ้อน) กรุณาตรวจสอบอีกครั้ง';
    }

    if (lowerMsg.includes('violates foreign key constraint') || lowerMsg.includes('foreign key')) {
        return 'ไม่สามารถบันทึกหรือลบข้อมูลได้ เนื่องจากข้อมูลนี้ถูกใช้งานหรืออ้างอิงอยู่ส่วนอื่นของระบบ';
    }

    if (lowerMsg.includes('jwt') || lowerMsg.includes('auth')) {
        return 'เซสชันการใช้งานหมดอายุ หรือไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่';
    }

    if (lowerMsg.includes('failed to fetch')) {
        return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }

    if (lowerMsg.includes('row level security') || lowerMsg.includes('rls')) {
        return 'คุณไม่มีสิทธิ์เข้าถึงหรือจัดการข้อมูลนี้ (Permission Denied)';
    }

    // Return original message if no translation found
    return message;
};
