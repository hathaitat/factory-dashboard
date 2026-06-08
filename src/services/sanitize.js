/**
 * Sanitize search term for use in Supabase PostgREST .or() / .ilike() queries.
 * Removes characters that could break or manipulate the filter syntax.
 *
 * @param {string} term - Raw search term from user input
 * @returns {string} Sanitized search term safe for use in PostgREST filters
 */
export const sanitizeSearchTerm = (term) => {
    if (!term || typeof term !== 'string') return '';
    // Remove PostgREST filter syntax characters and SQL wildcards
    // Keeps Thai characters, alphanumerics, spaces, hyphens, dots, @, and slashes
    return term.replace(/[%_\\'"(),]/g, '').trim();
};
