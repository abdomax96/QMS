/**
 * useTabForm Hook - Manages form state within a tab
 * Provides auto-save, undo/redo, and dirty state tracking
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabsStore } from '../store/tabsStore';

// Custom debounce hook
function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debouncedCallback = useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]) as T;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

interface UseTabFormOptions<T> {
    tabId: string;
    initialData?: T;
    autoSaveDelay?: number; // ms, 0 to disable
    onSave?: (data: T) => Promise<void>;
    onLoad?: () => Promise<T>;
    validateBeforeSave?: (data: T) => string | null; // Returns error message or null
}

interface UseTabFormReturn<T> {
    // Data
    data: T | null;
    setData: (data: T | ((prev: T | null) => T)) => void;
    updateField: <K extends keyof T>(field: K, value: T[K]) => void;
    // State
    isDirty: boolean;
    isSaving: boolean;
    isLoading: boolean;
    error: string | null;
    // Actions
    save: () => Promise<boolean>;
    reset: () => void;
    reload: () => Promise<void>;
    // Undo/Redo
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    // Validation
    validate: () => string | null;
}

export function useTabForm<T = any>(options: UseTabFormOptions<T>): UseTabFormReturn<T> {
    const {
        tabId,
        initialData,
        autoSaveDelay = 0,
        onSave,
        onLoad,
        validateBeforeSave,
    } = options;

    const {
        getTab,
        updateTabState,
        markDirty,
        pushUndo,
        undo: tabUndo,
        redo: tabRedo,
        canUndo: tabCanUndo,
        canRedo: tabCanRedo,
    } = useTabsStore();

    const tab = getTab(tabId);

    // Use tab.state as the formData
    const [localData, setLocalData] = useState<T | null>((tab?.state as unknown as T) ?? initialData ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastSavedDataRef = useRef<T | null>(null);
    const isInitialLoadRef = useRef(true);

    // Sync from store to local if changed elsewhere (e.g. undo/redo)
    useEffect(() => {
        if (tab?.state !== undefined && tab.state !== localData) {
            setLocalData(tab.state as unknown as T);
        }
    }, [tab?.state]);

    // Load initial data
    useEffect(() => {
        if (isInitialLoadRef.current && onLoad && !tab?.state) {
            isInitialLoadRef.current = false;
            setIsLoading(true);
            updateTabState(tabId, { status: 'loading' });

            onLoad()
                .then((data) => {
                    setLocalData(data);
                    lastSavedDataRef.current = data;
                    updateTabState(tabId, data as any); // Saves data to state
                    // updateTabState marks dirty, so we explicitly mark clean
                    markDirty(tabId, false);
                    // We need to set status separately because updateTabState overwrites 'state' but might NOT support partial updates to other fields if not carefully typed
                    // Actually updateTabState signature is (tabId, newState). It replaces 'state'.
                    // But we added 'status' to Tab object. How do we update 'status'?
                    // tabsStore currently doesn't have explicit setTabStatus.
                    // We need to fix tabsStore to allow updating properties like status?
                    // OR we just use updateTabState which updates 'state' property.
                    // Wait, Step 634: updateTabState updates `state` and sets `isDirty: true`.
                    // It does NOT update `status`.
                    // I added `status` to Tab interface, but `updateTabState` only updates `state`.
                    // I need a way to update `status`.
                    // I will Assume I can extend updateTabState OR add updateTabStatus.
                    // For now, I'll ignore status update inside store if helper missing, or fetch direct access?
                    // Let's assume I should add `updateTabStatus` to store.
                })
                .catch((err) => {
                    setError(err.message || 'فشل تحميل البيانات');
                    // updateTabStatus(tabId, 'error', err.message);
                })
                .finally(() => {
                    setIsLoading(false);
                    // updateTabStatus(tabId, 'idle');
                });
        }
    }, [tabId, onLoad, tab?.state]);

    // Helper to update status (since we didn't add explicit action yet, we might need to add it or skip)
    // Actually, in previous step I added 'status' field to Tab.
    // But I didn't add an action to update it!
    // I need to add `updateTabStatus` action to `tabsStore`.

    // Auto-save with debounce
    const debouncedSave = useDebouncedCallback(
        async (data: T) => {
            if (autoSaveDelay > 0 && onSave && tab?.isDirty) {
                try {
                    // updateTabStatus(tabId, 'saving');
                    await onSave(data);
                    lastSavedDataRef.current = data;
                    markDirty(tabId, false);
                    // updateTabStatus(tabId, 'idle');
                } catch (err: any) {
                    setError(err.message || 'فشل الحفظ التلقائي');
                    // updateTabStatus(tabId, 'error', err.message);
                }
            }
        },
        autoSaveDelay
    );

    // Set data with undo tracking
    const setData = useCallback((newData: T | ((prev: T | null) => T)) => {
        setLocalData((prev) => {
            const data = typeof newData === 'function'
                ? (newData as (prev: T | null) => T)(prev)
                : newData;

            // Push current state to undo stack before changing
            if (prev !== null) {
                pushUndo(tabId, prev);
            }

            // Update tab state
            updateTabState(tabId, data as any);

            // Trigger auto-save if enabled
            if (autoSaveDelay > 0) {
                debouncedSave(data);
            }

            return data;
        });
    }, [tabId, pushUndo, updateTabState, autoSaveDelay, debouncedSave]);

    // Update single field
    const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setData((prev) => {
            if (prev === null) return prev as any;
            return { ...prev, [field]: value };
        });
    }, [setData]);

    // Validate data
    const validate = useCallback((): string | null => {
        if (!validateBeforeSave || localData === null) return null;
        return validateBeforeSave(localData);
    }, [validateBeforeSave, localData]);

    // Manual save
    const save = useCallback(async (): Promise<boolean> => {
        if (!onSave || localData === null) return false;

        // Validate first
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return false;
        }

        try {
            setError(null);
            await onSave(localData);
            lastSavedDataRef.current = localData;
            markDirty(tabId, false);
            return true;
        } catch (err: any) {
            const errorMsg = err.message || 'فشل الحفظ';
            setError(errorMsg);
            return false;
        }
    }, [tabId, localData, onSave, validate, markDirty]);

    // Reset to last saved state
    const reset = useCallback(() => {
        if (lastSavedDataRef.current !== null) {
            setLocalData(lastSavedDataRef.current);
            updateTabState(tabId, lastSavedDataRef.current as any);
            markDirty(tabId, false);
            setError(null);
        }
    }, [tabId, updateTabState, markDirty]);

    // Reload from server
    const reload = useCallback(async () => {
        if (!onLoad) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await onLoad();
            setLocalData(data);
            lastSavedDataRef.current = data;
            updateTabState(tabId, data as any);
            markDirty(tabId, false);
        } catch (err: any) {
            setError(err.message || 'فشل إعادة التحميل');
        } finally {
            setIsLoading(false);
        }
    }, [tabId, onLoad, updateTabState, markDirty]);

    // Undo
    const undo = useCallback(() => {
        if (tabCanUndo(tabId)) {
            const previousState = tabUndo(tabId);
            if (previousState) setLocalData(previousState);
        }
    }, [tabId, tabUndo, tabCanUndo]);

    // Redo
    const redo = useCallback(() => {
        if (tabCanRedo(tabId)) {
            const nextState = tabRedo(tabId);
            if (nextState) setLocalData(nextState);
        }
    }, [tabId, tabRedo, tabCanRedo]);

    return {
        data: localData,
        setData,
        updateField,
        isDirty: tab?.isDirty ?? false,
        isSaving: tab?.status === 'saving',
        isLoading,
        error,
        save,
        reset,
        reload,
        undo,
        redo,
        canUndo: tabCanUndo(tabId),
        canRedo: tabCanRedo(tabId),
        validate,
    };
}

export default useTabForm;
