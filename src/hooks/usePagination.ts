/**
 * usePagination - Generic pagination hook for large data sets
 * 
 * Provides pagination controls for displaying items in pages, useful for:
 * - Large folder contents
 * - Search results
 * - Reports/instances lists
 */

import { useState, useMemo, useCallback } from 'react';

export interface PaginationOptions {
    /** Initial page size (default: 50) */
    initialPageSize?: number;
    /** Available page size options */
    pageSizeOptions?: number[];
    /** Initial page number (0-indexed, default: 0) */
    initialPage?: number;
}

export interface PaginationState<T> {
    /** Current page items */
    items: T[];
    /** Current page (0-indexed) */
    currentPage: number;
    /** Items per page */
    pageSize: number;
    /** Total number of items */
    totalItems: number;
    /** Total number of pages */
    totalPages: number;
    /** Is there a previous page? */
    hasPrevious: boolean;
    /** Is there a next page? */
    hasNext: boolean;
    /** Go to next page */
    nextPage: () => void;
    /** Go to previous page */
    previousPage: () => void;
    /** Go to specific page */
    goToPage: (page: number) => void;
    /** Change page size */
    setPageSize: (size: number) => void;
    /** Start index of current page (1-indexed for display) */
    startIndex: number;
    /** End index of current page (1-indexed for display) */
    endIndex: number;
    /** Available page size options */
    pageSizeOptions: number[];
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export function usePagination<T>(
    allItems: T[],
    options: PaginationOptions = {}
): PaginationState<T> {
    const {
        initialPageSize = DEFAULT_PAGE_SIZE,
        pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
        initialPage = 0,
    } = options;

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Reset to page 0 if current page is out of bounds
    const validCurrentPage = useMemo(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            return totalPages - 1;
        }
        return Math.max(0, currentPage);
    }, [currentPage, totalPages]);

    // Get items for current page
    const items = useMemo(() => {
        const start = validCurrentPage * pageSize;
        const end = start + pageSize;
        return allItems.slice(start, end);
    }, [allItems, validCurrentPage, pageSize]);

    const hasPrevious = validCurrentPage > 0;
    const hasNext = validCurrentPage < totalPages - 1;

    const nextPage = useCallback(() => {
        if (hasNext) {
            setCurrentPage(prev => prev + 1);
        }
    }, [hasNext]);

    const previousPage = useCallback(() => {
        if (hasPrevious) {
            setCurrentPage(prev => prev - 1);
        }
    }, [hasPrevious]);

    const goToPage = useCallback((page: number) => {
        const validPage = Math.max(0, Math.min(page, totalPages - 1));
        setCurrentPage(validPage);
    }, [totalPages]);

    const setPageSize = useCallback((size: number) => {
        setPageSizeState(size);
        setCurrentPage(0); // Reset to first page when changing size
    }, []);

    // Calculate display indices (1-indexed for UI)
    const startIndex = totalItems === 0 ? 0 : (validCurrentPage * pageSize) + 1;
    const endIndex = Math.min((validCurrentPage + 1) * pageSize, totalItems);

    return {
        items,
        currentPage: validCurrentPage,
        pageSize,
        totalItems,
        totalPages,
        hasPrevious,
        hasNext,
        nextPage,
        previousPage,
        goToPage,
        setPageSize,
        startIndex,
        endIndex,
        pageSizeOptions,
    };
}

export default usePagination;
