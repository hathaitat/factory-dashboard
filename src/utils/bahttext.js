const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

// แปลงจำนวนเต็มไม่เกิน 6 หลัก (0 - 999,999)
function convertBelowMillion(num) {
    if (num === 0) return '';

    const str = String(num);
    const len = str.length;
    let result = '';

    for (let i = 0; i < len; i++) {
        const digit = Number(str[i]);
        const pos = len - 1 - i;
        if (digit === 0) continue;

        if (pos === 1) {
            // หลักสิบ: 10 = สิบ, 20 = ยี่สิบ, 30 = สามสิบ
            if (digit === 1) result += 'สิบ';
            else if (digit === 2) result += 'ยี่สิบ';
            else result += THAI_DIGITS[digit] + 'สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
            // หลักหน่วยเป็น 1 และมีหลักอื่นนำหน้า อ่านว่า "เอ็ด" (เช่น 101 = หนึ่งร้อยเอ็ด)
            result += 'เอ็ด';
        } else {
            result += THAI_DIGITS[digit] + THAI_PLACES[pos];
        }
    }

    return result;
}

// แปลงจำนวนเต็มใดๆ โดยตัดทีละ 6 หลักแล้วต่อด้วย "ล้าน"
function convertInteger(num) {
    if (num === 0) return '';
    if (num < 1000000) return convertBelowMillion(num);

    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    return convertInteger(millions) + 'ล้าน' + convertBelowMillion(remainder);
}

export function numberToThaiText(number) {
    const value = Number(number);
    if (!Number.isFinite(value) || value === 0) return 'ศูนย์บาทถ้วน';

    const isNegative = value < 0;
    const fixed = Math.abs(value).toFixed(2);
    const [bahtPart, satangPart] = fixed.split('.');
    const baht = parseInt(bahtPart, 10);
    const satang = parseInt(satangPart, 10);

    // ปัดเศษแล้วอาจเหลือศูนย์ทั้งจำนวน เช่น 0.001
    if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน';

    let result = isNegative ? 'ลบ' : '';
    result += baht > 0 ? convertInteger(baht) + 'บาท' : 'ศูนย์บาท';
    result += satang > 0 ? convertBelowMillion(satang) + 'สตางค์' : 'ถ้วน';

    return result;
}
