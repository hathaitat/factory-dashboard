import { useState, useCallback, useEffect, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';

/**
 * Custom hook for server-side pagination with Supabase
 * @param {Function} fetchFunction - The API function to call (must accept params: page, itemsPerPage, filters)
 * @param {Object} defaultFilters - Default filter values
 * @param {number} defaultPerPage - Default items per page (50)
 * @returns Pagination state, data, and helpers
 */
export const useServerPagination = (fetchFunction, defaultFilters = {}, defaultPerPage = 50) => {
    const [data, setData] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState(defaultFilters);
    const [error, setError] = useState(null);
    const { showToast } = useDialog();
    const abortControllerRef = useRef(null);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const loadData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setError(null);
        try {
            const result = await fetchFunction({
                page: currentPage,
                limit: itemsPerPage,
                signal: abortController.signal,
                ...filters
            });

            if (abortController.signal.aborted) return;

            if (result && !result.error) {
                const fetchedTotal = result.total || 0;
                const newTotalPages = Math.max(1, Math.ceil(fetchedTotal / itemsPerPage));
                
                // Safety check: if current page is beyond total pages
                if (currentPage > newTotalPages) {
                    setCurrentPage(1);
                    if (fetchedTotal > 0) {
                        // If there is data but we were out of bounds, return early
                        // to prevent setting empty data and flashing the UI before the re-fetch completes.
                        return;
                    }
                }

                setData(result.data || []);
                setTotalItems(fetchedTotal);
            } else {
                throw new Error(result?.error?.message || 'Failed to fetch data');
            }
        } catch (err) {
            if (abortController.signal.aborted || err.name === 'AbortError') return;
            
            console.error('Pagination fetch error:', err);
            setError(err);
            setData([]);
            setTotalItems(0);
            showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
        } finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [fetchFunction, currentPage, itemsPerPage, filters, showToast]);

    // Fetch data when dependencies change
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Helper to update filters and reset to page 1
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => {
            // Check if filters actually changed to avoid unnecessary re-renders
            const isChanged = Object.keys(newFilters).some(key => prev[key] !== newFilters[key]);
            if (isChanged) {
                setCurrentPage(1); // Reset to first page on filter change
                return { ...prev, ...newFilters };
            }
            return prev;
        });
    }, []);

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return {
        data,
        totalItems,
        totalPages,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        isLoading,
        error,
        filters,
        updateFilters,
        startItem,
        endItem,
        refresh: loadData // expose manual refresh
    };
};
