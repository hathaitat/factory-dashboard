export const thaiBaht = (num) => {
    if (!num && num !== 0) return '';
    if (num === 0) return 'ศูนย์บาทถ้วน';

    const numStr = Number(num).toFixed(2).split('.');
    let integer = numStr[0];
    let decimal = numStr[1];

    const thaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    const convert = (s) => {
        let res = '';
        for (let i = 0; i < s.length; i++) {
            let n = parseInt(s[i]);
            let u = s.length - 1 - i;
            if (n !== 0) {
                if (u === 1 && n === 1) res += 'สิบ';
                else if (u === 1 && n === 2) res += 'ยี่สิบ';
                else if (u === 0 && n === 1 && s.length > 1) res += 'เอ็ด';
                else res += thaiNumbers[n] + thaiUnits[u];
            }
        }
        return res;
    };

    let result = convert(integer) + 'บาท';
    if (parseInt(decimal) === 0) {
        result += 'ถ้วน';
    } else {
        result += convert(decimal) + 'สตางค์';
    }
    return result;
};
