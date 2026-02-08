/**
 * useDataIsolation Hook
 * Hook لفلترة البيانات حسب إعدادات عزل الموديول
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './ncr/useAuth';
import { useModulePermissions } from './useModulePermissions';

// ==================== Types ====================
export interface DataIsolationConfig {
    /** Module code */
    moduleCode: string;
    /** Table name in Supabase */
    tableName: string;
    /** Column name for department filtering (default: 'department_id') */
    departmentColumn?: string;
    /** Column name for user filtering (default: 'created_by') */
    userColumn?: string;
}

export interface UseDataIsolationReturn<T> {
    /** Filtered data based on isolation settings */
    data: T[];
    /** Loading state */
    loading: boolean;
    /** Error message if any */
    error: string | null;
    /** User's department IDs */
    userDepartmentIds: string[];
    /** Current isolation mode */
    isolationMode: 'shared' | 'isolated' | 'hybrid';
    /** Whether user can see all departments */
    canSeeAll: boolean;
    /** Refresh data */
    refresh: () => Promise<void>;
    /** Get filter for Supabase query */
    getQueryFilter: () => { column: string; values: string[] } | null;
}

// ==================== Hook ====================
export function useDataIsolation<T = any>(config: DataIsolationConfig): UseDataIsolationReturn<T> {
    const { profile } = useAuth();
    const { getIsolationMode, canSeeAllDepartments } = useModulePermissions();

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userDepartmentIds, setUserDepartmentIds] = useState<string[]>([]);

    const isolationMode = getIsolationMode(config.moduleCode);
    const canSeeAll = canSeeAllDepartments(config.moduleCode);
    const departmentColumn = config.departmentColumn || 'department_id';

    // Use refs for stable values
    const canSeeAllRef = useRef(canSeeAll);
    const isolationModeRef = useRef(isolationMode);
    const userDepartmentIdsRef = useRef(userDepartmentIds);
    const loadingRef = useRef(false);
    const hasLoadedRef = useRef(false);

    // Keep refs in sync
    useEffect(() => {
        canSeeAllRef.current = canSeeAll;
        isolationModeRef.current = isolationMode;
        userDepartmentIdsRef.current = userDepartmentIds;
    }, [canSeeAll, isolationMode, userDepartmentIds]);

    // Load user's departments - only once per user
    useEffect(() => {
        const loadUserDepartments = async () => {
            if (!profile?.uid) {
                setUserDepartmentIds([]);
                return;
            }

            try {
                const { data: depts } = await supabase
                    .from('user_departments')
                    .select('department_id')
                    .eq('user_id', profile.uid)
                    .eq('is_active', true);

                setUserDepartmentIds(depts?.map(d => d.department_id) || []);
            } catch (err) {
                console.error('Error loading user departments:', err);
                setUserDepartmentIds([]);
            }
        };

        loadUserDepartments();
    }, [profile?.uid]);

    // Get query filter based on isolation settings (reads from refs)
    const getQueryFilter = useCallback(() => {
        const currentCanSeeAll = canSeeAllRef.current;
        const currentIsolationMode = isolationModeRef.current;
        const currentUserDeptIds = userDepartmentIdsRef.current;

        // If user can see all or mode is shared, no filter needed
        if (currentCanSeeAll || currentIsolationMode === 'shared') {
            return null;
        }

        // If isolated and user has departments, filter by them
        if (currentIsolationMode === 'isolated' && currentUserDeptIds.length > 0) {
            return {
                column: departmentColumn,
                values: currentUserDeptIds,
            };
        }

        // For hybrid (NCR), no automatic filter - handled by stage permissions
        return null;
    }, [departmentColumn]);

    // Load data with isolation - stable callback
    const loadData = useCallback(async () => {
        // Prevent duplicate calls
        if (loadingRef.current) {
            return;
        }

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            let query = supabase.from(config.tableName).select('*');

            const filter = getQueryFilter();
            if (filter) {
                query = query.in(filter.column, filter.values);
            }

            const { data: result, error: queryError } = await query;

            if (queryError) throw queryError;
            setData(result || []);
        } catch (err) {
            console.error(`Error loading ${config.tableName}:`, err);
            setError('فشل في تحميل البيانات');
            setData([]);
        }

        setLoading(false);
        loadingRef.current = false;
    }, [config.tableName, getQueryFilter]);

    // Load once when user is ready
    useEffect(() => {
        if (profile?.uid && !hasLoadedRef.current && userDepartmentIds !== undefined) {
            hasLoadedRef.current = true;
            loadData();
        }
    }, [profile?.uid, userDepartmentIds, loadData]);

    return {
        data,
        loading,
        error,
        userDepartmentIds,
        isolationMode,
        canSeeAll,
        refresh: loadData,
        getQueryFilter,
    };
}

// ==================== Supabase Query Builder Helper ====================
export function applyDataIsolationFilter<T extends { in: (column: string, values: string[]) => T }>(
    query: T,
    isolationMode: 'shared' | 'isolated' | 'hybrid',
    canSeeAll: boolean,
    userDepartmentIds: string[],
    departmentColumn: string = 'department_id'
): T {
    // If user can see all or mode is shared, no filter
    if (canSeeAll || isolationMode === 'shared') {
        return query;
    }

    // If isolated and user has departments, filter
    if (isolationMode === 'isolated' && userDepartmentIds.length > 0) {
        return query.in(departmentColumn, userDepartmentIds);
    }

    return query;
}

// ==================== Convenience Hooks for Each Module ====================

export function useFormsDataIsolation<T = any>(tableName: string) {
    return useDataIsolation<T>({
        moduleCode: 'forms_reports',
        tableName,
        departmentColumn: 'department_id',
    });
}

export function useTasksDataIsolation<T = any>(tableName: string = 'tasks') {
    return useDataIsolation<T>({
        moduleCode: 'tasks',
        tableName,
        departmentColumn: 'department_id',
    });
}

export function useLabDataIsolation<T = any>(tableName: string) {
    return useDataIsolation<T>({
        moduleCode: 'lab',
        tableName,
        departmentColumn: 'department_id',
    });
}

// NCR uses hybrid mode with stage-based permissions
export function useNcrDataIsolation<T = any>() {
    return useDataIsolation<T>({
        moduleCode: 'ncr',
        tableName: 'ncr_records',
        departmentColumn: 'responsible_department_id',
    });
}

export default useDataIsolation;









