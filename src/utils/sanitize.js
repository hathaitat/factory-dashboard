import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * @param {string} content - The dirty HTML content.
 * @returns {string} - The sanitized HTML content.
 */
export const sanitizeInput = (content) => {
    if (!content) return '';
    return DOMPurify.sanitize(content);
};
