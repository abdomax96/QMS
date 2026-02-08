import { useState, useCallback, useEffect } from 'react';

export type ActionType = 'copy' | 'cut' | 'paste' | 'delete' | 'move' | 'create' | 'rename';

export interface UndoableAction {
    id: string;
    type: ActionType;
    timestamp: number;
    description: string;
    // Data needed to undo/redo
    data: {
        itemIds: string[];
        itemTypes: Map<string, 'folder' | 'template' | 'instance'>;
        sourceFolder: string | null;
        targetFolder: string | null;
        // For delete - store the deleted items data for restore
        deletedItems?: any[];
        // For rename - store old and new names
        oldName?: string;
        newName?: string;
        itemId?: string;
        itemType?: 'folder' | 'template' | 'instance';
        // For copy - store created item IDs
        createdIds?: string[];
        // Was this a cut operation (for paste undo/redo)
        wasCut?: boolean;
    };
    // Whether this action can be undone
    canUndo: boolean;
    // Whether this has been undone
    undone: boolean;
}

interface UseUndoRedoOptions {
    maxHistorySize?: number;
    userId?: string;
    sessionId?: string;
}

const STORAGE_KEY_PREFIX = 'qms_undo_history_';

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
    const { maxHistorySize = 50, userId = 'default', sessionId } = options;

    const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${sessionId || 'session'}`;

    const [history, setHistory] = useState<UndoableAction[]>(() => {
        // Load from session storage
        try {
            const stored = sessionStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert Maps back from arrays
                return parsed.map((action: any) => ({
                    ...action,
                    data: {
                        ...action.data,
                        itemTypes: new Map(action.data.itemTypes || [])
                    }
                }));
            }
        } catch (e) {
            console.error('Failed to load undo history:', e);
        }
        return [];
    });

    const [currentIndex, setCurrentIndex] = useState(() => {
        // Find the index of the last non-undone action
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const lastNonUndone = parsed.findLastIndex((a: any) => !a.undone);
                return lastNonUndone >= 0 ? lastNonUndone : -1;
            } catch (e) {
                return -1;
            }
        }
        return -1;
    });

    // Save to session storage whenever history changes
    useEffect(() => {
        try {
            const serializable = history.map(action => ({
                ...action,
                data: {
                    ...action.data,
                    itemTypes: Array.from(action.data.itemTypes?.entries() || []),
                    // Don't store large deletedItems data - use recycle bin instead
                    deletedItems: undefined
                }
            }));

            // Try to save, if quota exceeded, clear some old entries
            const dataStr = JSON.stringify(serializable);

            // Limit data size to prevent quota issues (max 100KB)
            if (dataStr.length > 100000) {
                // Clear oldest entries until under limit
                const trimmed = serializable.slice(-10); // Keep only last 10
                sessionStorage.setItem(storageKey, JSON.stringify(trimmed));
                console.warn('[UndoRedo] History trimmed due to size limit');
            } else {
                sessionStorage.setItem(storageKey, dataStr);
            }
        } catch (e) {
            if ((e as Error).name === 'QuotaExceededError') {
                // Clear all undo history keys to free space
                const keysToRemove: string[] = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => sessionStorage.removeItem(k));
                console.warn('[UndoRedo] Cleared all undo history due to quota exceeded');
            } else {
                console.error('Failed to save undo history:', e);
            }
        }
    }, [history, storageKey]);

    // Add a new action to history
    const addAction = useCallback((action: Omit<UndoableAction, 'id' | 'timestamp' | 'undone'>) => {
        const newAction: UndoableAction = {
            ...action,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            undone: false,
        };

        setHistory(prev => {
            // Remove any actions after current index (they were undone and we're adding new action)
            const newHistory = prev.slice(0, currentIndex + 1);
            newHistory.push(newAction);

            // Trim to max size
            if (newHistory.length > maxHistorySize) {
                newHistory.shift();
            }

            return newHistory;
        });

        setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));

        return newAction.id;
    }, [currentIndex, maxHistorySize]);

    // Check if undo is available
    const canUndo = currentIndex >= 0 && history[currentIndex]?.canUndo && !history[currentIndex]?.undone;

    // Check if redo is available
    const canRedo = currentIndex < history.length - 1 && history[currentIndex + 1]?.undone;

    // Get the action to undo
    const getUndoAction = useCallback((): UndoableAction | null => {
        if (!canUndo) return null;
        return history[currentIndex];
    }, [canUndo, currentIndex, history]);

    // Get the action to redo
    const getRedoAction = useCallback((): UndoableAction | null => {
        if (!canRedo) return null;
        return history[currentIndex + 1];
    }, [canRedo, currentIndex, history]);

    // Mark current action as undone
    const markUndone = useCallback(() => {
        if (!canUndo) return;

        setHistory(prev => {
            const newHistory = [...prev];
            if (newHistory[currentIndex]) {
                newHistory[currentIndex] = { ...newHistory[currentIndex], undone: true };
            }
            return newHistory;
        });

        setCurrentIndex(prev => prev - 1);
    }, [canUndo, currentIndex]);

    // Mark next action as redone
    const markRedone = useCallback(() => {
        if (!canRedo) return;

        setHistory(prev => {
            const newHistory = [...prev];
            if (newHistory[currentIndex + 1]) {
                newHistory[currentIndex + 1] = { ...newHistory[currentIndex + 1], undone: false };
            }
            return newHistory;
        });

        setCurrentIndex(prev => prev + 1);
    }, [canRedo, currentIndex]);

    // Clear all history
    const clearHistory = useCallback(() => {
        setHistory([]);
        setCurrentIndex(-1);
        sessionStorage.removeItem(storageKey);
    }, [storageKey]);

    // Get recent actions for display
    const getRecentActions = useCallback((count: number = 10): UndoableAction[] => {
        return history.slice(-count).reverse();
    }, [history]);

    return {
        history,
        currentIndex,
        canUndo,
        canRedo,
        addAction,
        getUndoAction,
        getRedoAction,
        markUndone,
        markRedone,
        clearHistory,
        getRecentActions,
    };
}

export default useUndoRedo;


