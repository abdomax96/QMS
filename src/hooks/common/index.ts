import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for handling async operations with loading, error, and success states
 */
export function useAsync<T>() {
    const [state, setState] = useState<{
        loading: boolean;
        error: Error | null;
        data: T | null;
    }>({
        loading: false,
        error: null,
        data: null
    });

    const execute = useCallback(async (asyncFn: () => Promise<T>) => {
        setState({ loading: true, error: null, data: null });
        try {
            const result = await asyncFn();
            setState({ loading: false, error: null, data: result });
            return result;
        } catch (error) {
            setState({ loading: false, error: error as Error, data: null });
            throw error;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ loading: false, error: null, data: null });
    }, []);

    return { ...state, execute, reset };
}

/**
 * Hook for pagination
 */
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = items.slice(startIndex, endIndex);

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const prevPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const goToFirst = useCallback(() => goToPage(1), [goToPage]);
    const goToLast = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);

    // Reset to first page when items change
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [items.length, totalPages, currentPage]);

    return {
        currentItems,
        currentPage,
        totalPages,
        totalItems: items.length,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        goToPage,
        nextPage,
        prevPage,
        goToFirst,
        goToLast
    };
}

/**
 * Hook for filtering items
 */
export function useFilter<T>(
    items: T[],
    filterFn: (item: T, filters: Record<string, unknown>) => boolean
) {
    const [filters, setFilters] = useState<Record<string, unknown>>({});

    const filteredItems = items.filter(item => filterFn(item, filters));

    const setFilter = useCallback((key: string, value: unknown) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilter = useCallback((key: string) => {
        setFilters(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters({});
    }, []);

    return {
        filteredItems,
        filters,
        setFilter,
        clearFilter,
        clearAllFilters,
        hasFilters: Object.keys(filters).length > 0
    };
}

/**
 * Hook for handling confirmation dialogs
 */
export function useConfirm() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((msg: string): Promise<boolean> => {
        setMessage(msg);
        setIsOpen(true);
        return new Promise(resolve => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        resolveRef.current?.(true);
    }, []);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        resolveRef.current?.(false);
    }, []);

    return {
        isOpen,
        message,
        confirm,
        handleConfirm,
        handleCancel
    };
}

/**
 * Hook for tracking mounted state
 */
export function useMounted() {
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return mountedRef;
}

/**
 * Hook for previous value
 */
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

/**
 * Hook for toggling boolean state
 */
export function useToggle(initialValue: boolean = false) {
    const [value, setValue] = useState(initialValue);

    const toggle = useCallback(() => setValue(v => !v), []);
    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);

    return { value, toggle, setTrue, setFalse, setValue };
}
