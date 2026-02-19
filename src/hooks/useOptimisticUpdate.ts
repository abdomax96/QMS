/**
 * useOptimisticUpdate Hook
 * خطاف التحديث المتفائل مع دعم التراجع
 * 
 * Provides a consistent pattern for optimistic updates with:
 * - Immediate UI update
 * - Background server sync
 * - Automatic rollback on failure
 * - Version conflict detection
 */

import { useState, useCallback, useRef } from 'react';
import { optimisticLockService, type ConflictError, type UpdateResult } from '../services/optimisticLockService';
import { useToastStore } from '../store/toastStore';

export interface OptimisticUpdateOptions<T> {
    /** Entity table name */
    table: Parameters<typeof optimisticLockService.updateWithLock>[0];
    /** Callback when conflict is detected */
    onConflict?: (error: ConflictError) => void;
    /** Callback on successful update */
    onSuccess?: (data: T) => void;
    /** Callback on error (non-conflict) */
    onError?: (error: any) => void;
}

export interface OptimisticUpdateState<T> {
    /** Current data */
    data: T | null;
    /** Version number for conflict detection */
    version: number;
    /** Whether an update is in progress */
    isUpdating: boolean;
    /** Last error encountered */
    error: any | null;
    /** Whether a conflict was detected */
    hasConflict: boolean;
    /** Conflict details if any */
    conflictInfo: ConflictError | null;
}

export function useOptimisticUpdate<T extends { id: string }>(
    initialData: T | null,
    initialVersion: number,
    options: OptimisticUpdateOptions<T>
) {
    const { table, onConflict, onSuccess, onError } = options;
    const { addToast } = useToastStore();

    const [state, setState] = useState<OptimisticUpdateState<T>>({
        data: initialData,
        version: initialVersion,
        isUpdating: false,
        error: null,
        hasConflict: false,
        conflictInfo: null
    });

    // Keep track of pending rollback data
    const rollbackRef = useRef<T | null>(null);

    /**
     * Update data optimistically
     */
    const update = useCallback(async (updates: Partial<T>): Promise<boolean> => {
        if (!state.data) return false;

        // Store current data for potential rollback
        rollbackRef.current = state.data;

        // Optimistic update - update UI immediately
        setState(prev => ({
            ...prev,
            data: { ...prev.data!, ...updates },
            isUpdating: true,
            error: null,
            hasConflict: false,
            conflictInfo: null
        }));

        try {
            // Attempt server update with version check
            const result = await optimisticLockService.updateWithLock<T>(
                table,
                state.data.id,
                state.version,
                updates
            );

            if (!result.success) {
                // Rollback optimistic update
                setState(prev => ({
                    ...prev,
                    data: rollbackRef.current,
                    isUpdating: false,
                    error: result.error
                }));

                // Handle conflict specifically
                if (result.error?.type === 'VERSION_CONFLICT') {
                    const conflictError = result.error as ConflictError;
                    setState(prev => ({
                        ...prev,
                        hasConflict: true,
                        conflictInfo: conflictError
                    }));
                    onConflict?.(conflictError);
                    return false;
                }

                // Other errors
                onError?.(result.error);
                addToast({
                    type: 'error',
                    title: 'خطأ',
                    message: result.error?.message || 'فشل التحديث'
                });
                return false;
            }

            // Success - update with server response
            setState(prev => ({
                ...prev,
                data: result.data!,
                version: (result.data as any).version || (result.data as any).version_number || prev.version + 1,
                isUpdating: false
            }));

            onSuccess?.(result.data!);
            return true;

        } catch (err) {
            // Exception - rollback
            setState(prev => ({
                ...prev,
                data: rollbackRef.current,
                isUpdating: false,
                error: err
            }));
            onError?.(err);
            return false;
        }
    }, [state.data, state.version, table, onConflict, onSuccess, onError, addToast]);

    /**
     * Refresh data from server
     */
    const refresh = useCallback(async (): Promise<boolean> => {
        if (!state.data) return false;

        setState(prev => ({ ...prev, isUpdating: true }));

        try {
            const freshData = await optimisticLockService.getWithVersion<T>(
                table,
                state.data.id
            );

            if (!freshData) {
                setState(prev => ({
                    ...prev,
                    isUpdating: false,
                    error: { type: 'NOT_FOUND', message: 'Entity not found' }
                }));
                return false;
            }

            setState({
                data: freshData,
                version: freshData.version,
                isUpdating: false,
                error: null,
                hasConflict: false,
                conflictInfo: null
            });

            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
                isUpdating: false,
                error: err
            }));
            return false;
        }
    }, [state.data, table]);

    /**
     * Force update (ignore version conflict)
     * WARNING: This will overwrite server data
     */
    const forceUpdate = useCallback(async (updates: Partial<T>): Promise<boolean> => {
        if (!state.data) return false;

        setState(prev => ({ ...prev, isUpdating: true }));

        try {
            // Get current version and update with it
            const currentVersion = await optimisticLockService.getVersion(table, state.data.id);

            if (currentVersion === null) {
                setState(prev => ({
                    ...prev,
                    isUpdating: false,
                    error: { type: 'NOT_FOUND', message: 'Entity not found' }
                }));
                return false;
            }

            const result = await optimisticLockService.updateWithLock<T>(
                table,
                state.data.id,
                currentVersion,
                updates
            );

            if (!result.success) {
                setState(prev => ({
                    ...prev,
                    isUpdating: false,
                    error: result.error
                }));
                return false;
            }

            setState(prev => ({
                ...prev,
                data: result.data!,
                version: (result.data as any).version || (result.data as any).version_number || currentVersion + 1,
                isUpdating: false,
                hasConflict: false,
                conflictInfo: null
            }));

            onSuccess?.(result.data!);
            return true;
        } catch (err) {
            setState(prev => ({
                ...prev,
                isUpdating: false,
                error: err
            }));
            return false;
        }
    }, [state.data, table, onSuccess]);

    /**
     * Clear conflict state
     */
    const clearConflict = useCallback(() => {
        setState(prev => ({
            ...prev,
            hasConflict: false,
            conflictInfo: null
        }));
    }, []);

    /**
     * Set data directly (for initial load or external updates)
     */
    const setData = useCallback((data: T, version: number) => {
        setState({
            data,
            version,
            isUpdating: false,
            error: null,
            hasConflict: false,
            conflictInfo: null
        });
    }, []);

    return {
        ...state,
        update,
        refresh,
        forceUpdate,
        clearConflict,
        setData
    };
}

export default useOptimisticUpdate;















