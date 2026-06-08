import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook for client-side pagination
 * @param {Array} data - The full filtered data array
 * @param {number} defaultPerPage - Default items per page (50)
 * @returns Pagination state and helpers
 */
export const usePagination = (data = [], defaultPerPage = 50) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage);

    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // Reset to page 1 when data changes (search/filter)
    useEffect(() => {
        setCurrentPage(1);
    }, [totalItems]);

    // Ensure currentPage doesn't exceed totalPages
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    }, [data, currentPage, itemsPerPage]);

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        paginatedData,
        totalItems,
        totalPages,
        startItem,
        endItem
    };
};
