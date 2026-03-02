/**
 * DocumentNumberHelper
 * Utility to generate and parse dynamic document numbers based on a template format.
 *
 * Supported Variables:
 * {YYYY} - 4 digit year
 * {YY}   - 2 digit year
 * {MM}   - 2 digit month (01-12)
 * {DD}   - 2 digit day (01-31)
 * {RUN}  - Auto-incrementing running number (default 4 digits)
 * {RUN3}, {RUN5} - Auto-incrementing running number with specific length
 */

export const documentNumberHelper = {
    getRunTokenInfo: (format) => {
        const match = format.match(/\{RUN(\d*)\}/);
        if (match) {
            return {
                token: match[0],
                length: match[1] ? parseInt(match[1], 10) : 4
            };
        }
        return { token: '{RUN}', length: 4 };
    },

    applyDateFormats: (format, date = new Date()) => {
        let result = format;
        const year = date.getFullYear().toString();
        const shortYear = year.slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        result = result.replace(/{YYYY}/g, year);
        result = result.replace(/{YY}/g, shortYear);
        result = result.replace(/{MM}/g, month);
        result = result.replace(/{DD}/g, day);

        return result;
    },

    getSearchPrefix: (formattedStr) => {
        const { token } = documentNumberHelper.getRunTokenInfo(formattedStr);
        return formattedStr.split(token)[0];
    },

    getSearchSuffix: (formattedStr) => {
        const { token } = documentNumberHelper.getRunTokenInfo(formattedStr);
        const parts = formattedStr.split(token);
        return parts.length > 1 ? parts[1] : '';
    },

    getNextRunNumberString: (latestNo, prefix, suffix = '', padLength = 4) => {
        if (!latestNo) return '1'.padStart(padLength, '0');

        let numStr = latestNo;
        if (numStr.startsWith(prefix)) numStr = numStr.slice(prefix.length);
        if (suffix && numStr.endsWith(suffix)) numStr = numStr.slice(0, -suffix.length);

        const currentSeq = parseInt(numStr, 10);
        if (isNaN(currentSeq)) return '1'.padStart(padLength, '0');

        const nextSeq = currentSeq + 1;
        const finalLength = Math.max(padLength, numStr.length);
        return nextSeq.toString().padStart(finalLength, '0');
    },

    getPreviewUrl: (format) => {
        let result = documentNumberHelper.applyDateFormats(format || '');
        const { token, length } = documentNumberHelper.getRunTokenInfo(result);
        // Replace ONLY the token part with properly padded preview
        return result.replace(token, '1'.padStart(length, '0'));
    },

    applyRunNumberToFormat: (runNumberStr, targetFormat, date = new Date()) => {
        let result = documentNumberHelper.applyDateFormats(targetFormat, date);
        const { token, length } = documentNumberHelper.getRunTokenInfo(result);
        const num = parseInt(runNumberStr, 10);
        const paddedRun = (!isNaN(num) ? num : 1).toString().padStart(length, '0');
        return result.replace(token, paddedRun);
    },

    extractRunNumber: (fullNumber, format, date = new Date()) => {
        if (!fullNumber) return '1';
        const dateFormatted = documentNumberHelper.applyDateFormats(format, date);
        const prefix = documentNumberHelper.getSearchPrefix(dateFormatted);
        const suffix = documentNumberHelper.getSearchSuffix(dateFormatted);

        let numStr = fullNumber;
        if (numStr.startsWith(prefix)) numStr = numStr.slice(prefix.length);
        if (suffix && numStr.endsWith(suffix)) numStr = numStr.slice(0, -suffix.length);

        return numStr; // e.g. "0001"
    },

    replaceRunToken: (formattedStr, newRunNumStr) => {
        const { token } = documentNumberHelper.getRunTokenInfo(formattedStr);
        return formattedStr.replace(token, newRunNumStr);
    }
};
