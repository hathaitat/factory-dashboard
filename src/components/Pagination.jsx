import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Shared Pagination component
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @param {number} totalPages - Total number of pages
 * @param {number} startItem - First item number on current page
 * @param {number} endItem - Last item number on current page
 * @param {function} onPageChange - Callback when page changes
 * @param {function} onItemsPerPageChange - Callback when items per page changes
 */
const Pagination = ({
    currentPage,
    totalItems,
    itemsPerPage,
    totalPages,
    startItem,
    endItem,
    onPageChange,
    onItemsPerPageChange
}) => {
    if (totalItems === 0) return null;

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    const baseBtnClass = "inline-flex items-center justify-center border border-solid transition-all duration-200 text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed rounded-lg";
    const defaultStateClass = "border-border bg-cardBg text-textMain hover:not(:disabled):bg-blue-500/10 hover:not(:disabled):border-blue-500/30 hover:not(:disabled):text-blue-500";
    const activeStateClass = "bg-blue-500 border-blue-500 text-white font-bold shadow-md shadow-blue-500/30";

    const navBtnClass = `${baseBtnClass} ${defaultStateClass} w-7 h-7 md:w-8 md:h-8 min-w-[28px] md:min-w-[32px]`;
    const getPageBtnClass = (isActive) => `${baseBtnClass} h-7 md:h-8 min-w-[28px] md:min-w-[32px] px-1.5 md:px-1.5 ${isActive ? activeStateClass : defaultStateClass}`;

    return (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 py-3 md:px-6 md:py-4 border-t border-border bg-cardBg flex-wrap gap-4">
            <div className="flex items-center justify-between md:justify-start gap-6 flex-wrap">
                <span className="text-sm text-textMuted">
                    แสดง <strong className="text-textMain font-semibold">{startItem.toLocaleString()}-{endItem.toLocaleString()}</strong> จาก <strong className="text-textMain font-semibold">{totalItems.toLocaleString()}</strong> รายการ
                </span>
                <div className="flex items-center gap-2 text-sm text-textMuted">
                    <span>แสดง</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 rounded-md border border-border bg-bgMain text-textMain text-sm cursor-pointer outline-none transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                        {PAGE_SIZE_OPTIONS.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                    <span>รายการ/หน้า</span>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center md:justify-start gap-1">
                    <button
                        className={navBtnClass}
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        title="หน้าแรก"
                    >
                        <ChevronsLeft size={16} />
                    </button>
                    <button
                        className={navBtnClass}
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="ก่อนหน้า"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="inline-flex items-center justify-center h-7 md:h-8 min-w-[28px] md:min-w-[32px] text-textMuted text-sm tracking-[2px] select-none">...</span>
                        ) : (
                            <button
                                key={page}
                                className={getPageBtnClass(currentPage === page)}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    ))}

                    <button
                        className={navBtnClass}
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="ถัดไป"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        className={navBtnClass}
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        title="หน้าสุดท้าย"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Pagination;
