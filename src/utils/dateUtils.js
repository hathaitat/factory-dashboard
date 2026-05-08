/**
 * Date utility functions for Thailand timezone (UTC+7)
 * ใช้แทน new Date().toISOString().split('T')[0] ทุกจุด
 * เพราะ toISOString() แปลงเป็น UTC ทำให้วันที่ผิดช่วง 00:00-06:59 น. เวลาไทย
 */

/**
 * Get current local date string in YYYY-MM-DD format
 * @param {Date} date - Date object (default: now)
 * @returns {string} e.g. "2026-05-06"
 */
export function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
