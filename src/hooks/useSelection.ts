import { useState, useCallback } from 'react';

export interface SelectionState<T = string> {
    selectedItems: Set<T>;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
}

export interface UseSelectionReturn<T = string> {
    selectedItems: Set<T>;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    select: (id: T) => void;
    deselect: (id: T) => void;
    toggle: (id: T) => void;
    selectRange: (targetId: T, allItems: T[]) => void;
    selectAll: (items: T[]) => void;
    deselectAll: () => void;
    toggleAll: (items: T[]) => void;
    isSelected: (id: T) => boolean;
    setSelection: (items: T[]) => void;
    selectedCount: number;
}

/**
 * Hook for managing multi-selection state
 */
export function useSelection<T = string>(initialSelected: T[] = []): UseSelectionReturn<T> {
    const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set(initialSelected));
    const [totalItems, setTotalItems] = useState(0);
    const [lastSelected, setLastSelected] = useState<T | null>(null);

    const select = useCallback((id: T) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
        setLastSelected(id);
    }, []);

    const deselect = useCallback((id: T) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        setLastSelected(null);
    }, []);

    const toggle = useCallback((id: T) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                setLastSelected(null);
            } else {
                next.add(id);
                setLastSelected(id);
            }
            return next;
        });
    }, []);

    const selectRange = useCallback((targetId: T, allItems: T[]) => {
        if (!lastSelected || !allItems.includes(lastSelected)) {
            // If no last selected, just select the target
            select(targetId);
            return;
        }

        const startIndex = allItems.indexOf(lastSelected);
        const endIndex = allItems.indexOf(targetId);

        if (startIndex === -1 || endIndex === -1) return;

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        const rangeItems = allItems.slice(start, end + 1);

        setSelectedItems(prev => {
            const next = new Set(prev);
            rangeItems.forEach(item => next.add(item));
            return next;
        });

        // Don't update lastSelected during range select to allow extending range from same anchor?
        // Usually clicking a new item updates the anchor.
        setLastSelected(targetId);
    }, [lastSelected, select]);

    const selectAll = useCallback((items: T[]) => {
        setTotalItems(items.length);
        setSelectedItems(new Set(items));
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedItems(new Set());
        setLastSelected(null);
    }, []);

    const toggleAll = useCallback((items: T[]) => {
        setTotalItems(items.length);
        setSelectedItems(prev => {
            if (prev.size === items.length) {
                setLastSelected(null);
                return new Set();
            }
            return new Set(items);
        });
    }, []);

    const isSelected = useCallback((id: T) => {
        return selectedItems.has(id);
    }, [selectedItems]);

    // Set selection manually (e.g. for single select)
    const setSelection = useCallback((items: T[]) => {
        setSelectedItems(new Set(items));
        if (items.length === 1) {
            setLastSelected(items[0]);
        } else {
            setLastSelected(null); // or last item?
        }
    }, []);

    const selectedCount = selectedItems.size;
    const isAllSelected = totalItems > 0 && selectedCount === totalItems;
    const isPartiallySelected = selectedCount > 0 && selectedCount < totalItems;

    return {
        selectedItems,
        isAllSelected,
        isPartiallySelected,
        select,
        deselect,
        toggle,
        selectRange,
        selectAll,
        deselectAll,
        toggleAll,
        isSelected,
        setSelection,
        selectedCount,
    };
}

export default useSelection;
