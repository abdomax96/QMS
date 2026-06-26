/**
 * useModulePermissions Hook
 * Hook للتحقق من صلاحيات الموديولز وعزل البيانات
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';

// ==================== Types ====================
export interface ModulePermission {
    module_code: string;
    granted_actions: string[];
    data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
    can_see_all_departments: boolean;
}

export interface NcrStagePermission {
    stage_code: string;
    allowed_actions: string[];
    can_advance: boolean;
    can_return: boolean;
}

export interface TaskStagePermission {
    stage_code: string;
    allowed_actions: string[];
    can_advance: boolean;
    can_return: boolean;
}

export interface UseModulePermissionsReturn {
    // Module permissions
    permissions: ModulePermission[];
    loading: boolean;
    error: string | null;

    // Permission checks
    canAccess: (moduleCode: string) => boolean;
    canPerform: (moduleCode: string, action: string) => boolean;
    canPerformAll: (moduleCode: string, actions: string[]) => boolean;
    canPerformAny: (moduleCode: string, actions: string[]) => boolean;
    getModuleActions: (moduleCode: string) => string[];
    getIsolationMode: (moduleCode: string) => 'shared' | 'isolated' | 'hybrid';
    canSeeAllDepartments: (moduleCode: string) => boolean;

    // NCR specific
    ncrPermissions: NcrStagePermission[];
    canPerformNcrAction: (stageCode: string, action: string) => boolean;
    canAdvanceNcr: (stageCode: string) => boolean;
    canReturnNcr: (stageCode: string) => boolean;

    // Task stage permissions
    taskPermissions: TaskStagePermission[];
    canPerformTaskAction: (stageCode: string, action: string) => boolean;
    canAdvanceTask: (stageCode: string) => boolean;
    canReturnTask: (stageCode: string) => boolean;

    // Refresh
    refresh: () => Promise<void>;
}

interface PermissionsBundle {
    userId: string;
    permissions: ModulePermission[];
    ncrPermissions: NcrStagePermission[];
    taskPermissions: TaskStagePermission[];
    taskStagePermissionsMissing: boolean;
    fetchedAt: number;
}

const PERMISSIONS_CACHE_TTL_MS = 10 * 60 * 1000;
const LOAD_TIMEOUT_MS = 12000;

let globalTaskStagePermissionsMissing = false;
let permissionsBundleCache: PermissionsBundle | null = null;
let permissionsBundleInFlight: Promise<PermissionsBundle> | null = null;
let permissionsBundleInFlightUserId: string | null = null;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))
    ]);
};

const isMissingTableError = (err: unknown, tableName: string): boolean => {
    const e = err as { code?: string; message?: string; details?: string } | null;
    const code = (e?.code || '').toUpperCase();
    const message = (e?.message || '').toLowerCase();
    const details = (e?.details || '').toLowerCase();
    const table = tableName.toLowerCase();

    return (
        code === 'PGRST205' ||
        (message.includes(table) && message.includes('schema cache')) ||
        details.includes('schema cache')
    );
};

function aggregateStagePermissions(rows: Array<{
    stage_code: string | null;
    allowed_actions: string[] | null;
    can_advance: boolean | null;
    can_return: boolean | null;
}>): NcrStagePermission[] {
    const map = new Map<string, NcrStagePermission>();

    rows.forEach((row) => {
        const stageCode = (row.stage_code || '').trim();
        if (!stageCode) return;

        const allowedActions = Array.from(new Set((row.allowed_actions || []).filter(Boolean)));
        const canAdvance = Boolean(row.can_advance);
        const canReturn = Boolean(row.can_return);

        if (!allowedActions.includes('view')) {
            allowedActions.unshift('view');
        }

        const existing = map.get(stageCode);
        if (existing) {
            existing.allowed_actions = Array.from(new Set([...existing.allowed_actions, ...allowedActions]));
            existing.can_advance = existing.can_advance || canAdvance;
            existing.can_return = existing.can_return || canReturn;
        } else {
            map.set(stageCode, {
                stage_code: stageCode,
                allowed_actions: allowedActions,
                can_advance: canAdvance,
                can_return: canReturn,
            });
        }
    });

    return Array.from(map.values());
}

function aggregateTaskPermissions(rows: Array<{
    stage_code: string | null;
    allowed_actions: string[] | null;
    can_advance: boolean | null;
    can_return: boolean | null;
}>): TaskStagePermission[] {
    const map = new Map<string, TaskStagePermission>();

    rows.forEach((row) => {
        const stageCode = (row.stage_code || '').trim();
        if (!stageCode) return;

        const allowedActions = Array.from(new Set((row.allowed_actions || []).filter(Boolean)));
        const canAdvance = Boolean(row.can_advance);
        const canReturn = Boolean(row.can_return);

        if (!allowedActions.includes('view')) {
            allowedActions.unshift('view');
        }

        const existing = map.get(stageCode);
        if (existing) {
            existing.allowed_actions = Array.from(new Set([...existing.allowed_actions, ...allowedActions]));
            existing.can_advance = existing.can_advance || canAdvance;
            existing.can_return = existing.can_return || canReturn;
        } else {
            map.set(stageCode, {
                stage_code: stageCode,
                allowed_actions: allowedActions,
                can_advance: canAdvance,
                can_return: canReturn,
            });
        }
    });

    return Array.from(map.values());
}

// Base CRUD actions are authoritatively controlled by the Main Module Matrix
// (role_module_permissions), NOT by NCR stage permissions. They must never be
// promoted from ncr_stage_permissions into the module-level grants, otherwise
// a role configured in the NCR Stage matrix would silently gain create/edit/
// delete/etc. that bypass the module matrix (the Phase 2 enforcement bug).
const NCR_BASE_CRUD_ACTIONS = new Set<string>([
    'view',
    'create',
    'edit',
    'delete',
    'export',
]);

function mergeNcrModuleActions(
    baseModulePermissions: ModulePermission[],
    stagePermissions: NcrStagePermission[]
): ModulePermission[] {
    // Only workflow-specific actions may be surfaced at the module level from
    // stage permissions (for module-access/visibility purposes). Base CRUD is
    // excluded so the Main Module Matrix stays the single source of truth.
    const ncrModuleActions = Array.from(new Set(
        stagePermissions.flatMap((stagePerm) => [
            ...stagePerm.allowed_actions.filter((action) => !NCR_BASE_CRUD_ACTIONS.has(action)),
            ...(stagePerm.can_advance ? ['workflow.progress'] : []),
            ...(stagePerm.can_return ? ['workflow.return'] : []),
        ])
    )).sort();

    const mergedPermissions = [...baseModulePermissions];
    const ncrPermission = mergedPermissions.find((perm) => perm.module_code === 'ncr');

    if (ncrModuleActions.length > 0) {
        if (ncrPermission) {
            ncrPermission.granted_actions = Array.from(new Set([
                ...ncrPermission.granted_actions,
                ...ncrModuleActions,
            ])).sort();
        } else {
            mergedPermissions.push({
                module_code: 'ncr',
                granted_actions: ncrModuleActions,
                data_isolation_mode: 'hybrid',
                can_see_all_departments: false,
            });
        }
    }

    return mergedPermissions;
}

async function fetchPermissionsBundle(
    userId: string,
    options?: { forceRefresh?: boolean }
): Promise<PermissionsBundle> {
    const forceRefresh = options?.forceRefresh === true;
    const now = Date.now();

    if (!forceRefresh && permissionsBundleCache && permissionsBundleCache.userId === userId) {
        if (now - permissionsBundleCache.fetchedAt < PERMISSIONS_CACHE_TTL_MS) {
            return permissionsBundleCache;
        }
    }

    if (permissionsBundleInFlight && permissionsBundleInFlightUserId === userId) {
        return permissionsBundleInFlight;
    }

    if (forceRefresh && permissionsBundleCache?.userId === userId) {
        permissionsBundleCache = null;
    }

    const loadPromise = (async (): Promise<PermissionsBundle> => {
        let baseModulePermissions: ModulePermission[] = [];

        // Primary permissions source (optimized RPC).
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_user_module_permissions', { user_uuid: userId }) as any;

        // Resolve role IDs once; used by fallback + stage permissions.
        const { data: userRolesRows, error: userRolesRowsError } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', userId);

        if (userRolesRowsError) {
            console.warn('[Permissions] Error fetching user roles:', userRolesRowsError.message);
        }
        const roleIds = (userRolesRows || []).map((row: any) => row.role_id).filter(Boolean);

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
            baseModulePermissions = rpcData
                .map((item: any) => {
                    const cleanedActions = (item.granted_actions || [])
                        .filter((action: any) => action != null && action !== '');

                    return {
                        module_code: item.module_code,
                        granted_actions: cleanedActions,
                        data_isolation_mode: item.data_isolation_mode || 'shared',
                        can_see_all_departments: item.can_see_all_departments || false
                    } as ModulePermission;
                })
                .filter((perm: ModulePermission) => perm.granted_actions.length > 0);
        } else {
            if (rpcError) {
                console.warn('[Permissions] RPC not available, using role_module_permissions fallback. Error:', rpcError?.message);
            }

            if (roleIds.length === 0) {
                console.warn('[Permissions] User has no roles in user_roles table, no permissions granted');
            } else {
                const { data: roleModulePermsData, error: roleModulePermsError } = await supabase
                    .from('role_module_permissions')
                    .select('module_code, granted_actions, can_see_all_departments')
                    .in('role_id', roleIds);

                if (roleModulePermsError) {
                    console.error('[Permissions] Error loading role_module_permissions:', roleModulePermsError);
                }

                const modulePermissions = new Map<string, ModulePermission>();

                (roleModulePermsData || []).forEach((perm: any) => {
                    if (!perm.module_code) return;

                    const existing = modulePermissions.get(perm.module_code);
                    const grantedActions = perm.granted_actions || [];

                    if (existing) {
                        existing.granted_actions = Array.from(new Set([...existing.granted_actions, ...grantedActions]));
                        existing.can_see_all_departments = existing.can_see_all_departments || perm.can_see_all_departments || false;
                    } else if (grantedActions.length > 0) {
                        modulePermissions.set(perm.module_code, {
                            module_code: perm.module_code,
                            granted_actions: grantedActions,
                            data_isolation_mode: 'shared',
                            can_see_all_departments: perm.can_see_all_departments || false,
                        });
                    }
                });

                baseModulePermissions = Array.from(modulePermissions.values());
            }
        }

        // NCR stage permissions.
        let ncrStageRows: Array<{
            stage_code: string | null;
            allowed_actions: string[] | null;
            can_advance: boolean | null;
            can_return: boolean | null;
        }> = [];

        if (roleIds.length > 0) {
            const { data: rows, error } = await supabase
                .from('ncr_stage_permissions')
                .select('stage_code, allowed_actions, can_advance, can_return')
                .eq('is_active', true)
                .is('department_id', null)
                .in('role_id', roleIds);

            if (error) {
                console.warn('[Permissions] Error fetching role-based NCR stage permissions:', error.message);
            } else if (rows?.length) {
                ncrStageRows = rows;
            }
        }

        const ncrPermissions = aggregateStagePermissions(ncrStageRows);

        // Task stage permissions.
        let taskStageRows: Array<{
            stage_code: string | null;
            allowed_actions: string[] | null;
            can_advance: boolean | null;
            can_return: boolean | null;
        }> = [];
        let taskStagePermissionsMissing = globalTaskStagePermissionsMissing;

        if (roleIds.length > 0 && !taskStagePermissionsMissing) {
            const { data: rows, error } = await supabase
                .from('task_stage_permissions')
                .select('stage_code, allowed_actions, can_advance, can_return')
                .eq('is_active', true)
                .is('department_id', null)
                .in('role_id', roleIds);

            if (error) {
                if (isMissingTableError(error, 'task_stage_permissions')) {
                    taskStagePermissionsMissing = true;
                    globalTaskStagePermissionsMissing = true;
                    console.info('[Permissions] task_stage_permissions table is missing in this environment. Apply migration 20260216000000_task_management_v2.sql to enable task workflow permissions.');
                } else {
                    console.warn('[Permissions] Error fetching task stage permissions:', error.message);
                }
            } else if (rows?.length) {
                taskStageRows = rows;
            }
        }

        const taskPermissions = aggregateTaskPermissions(taskStageRows);
        const permissions = mergeNcrModuleActions(baseModulePermissions, ncrPermissions);

        const bundle: PermissionsBundle = {
            userId,
            permissions,
            ncrPermissions,
            taskPermissions,
            taskStagePermissionsMissing,
            fetchedAt: Date.now(),
        };

        permissionsBundleCache = bundle;
        return bundle;
    })();

    permissionsBundleInFlight = loadPromise;
    permissionsBundleInFlightUserId = userId;

    try {
        return await loadPromise;
    } finally {
        if (permissionsBundleInFlight === loadPromise) {
            permissionsBundleInFlight = null;
            permissionsBundleInFlightUserId = null;
        }
    }
}

// ==================== Hook ====================
export function useModulePermissions(): UseModulePermissionsReturn {
    const { profile } = useSupabaseAuth();
    const [permissions, setPermissions] = useState<ModulePermission[]>([]);
    const [ncrPermissions, setNcrPermissions] = useState<NcrStagePermission[]>([]);
    const [taskPermissions, setTaskPermissions] = useState<TaskStagePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Monotonic request id to prevent stale requests from updating state.
    const requestIdRef = useRef(0);

    const loadPermissions = useCallback(async (options?: { forceRefresh?: boolean }) => {
        const userId = profile?.uid;
        if (!userId) {
            setPermissions([]);
            setNcrPermissions([]);
            setTaskPermissions([]);
            setLoading(false);
            setError(null);
            return;
        }

        const requestId = ++requestIdRef.current;
        const isCurrentRequest = () => requestId === requestIdRef.current;

        setLoading(true);
        setError(null);

        try {
            const bundle = await withTimeout(
                fetchPermissionsBundle(userId, { forceRefresh: options?.forceRefresh === true }),
                LOAD_TIMEOUT_MS
            );
            if (!isCurrentRequest()) return;

            setPermissions(bundle.permissions);
            setNcrPermissions(bundle.ncrPermissions);
            setTaskPermissions(bundle.taskPermissions);
        } catch (err) {
            if (!isCurrentRequest()) return;
            console.error('Error loading permissions:', err);
            setError('فشل في تحميل الصلاحيات');
            setPermissions([]);
            setNcrPermissions([]);
            setTaskPermissions([]);
        } finally {
            if (isCurrentRequest()) {
                setLoading(false);
            }
        }
    }, [profile?.uid]);

    // Load on mount and user change
    useEffect(() => {
        void loadPermissions();
    }, [loadPermissions]);

    // Listen for permission changes from other parts of the app
    useEffect(() => {
        const handlePermissionsChanged = () => {
            console.log('[Permissions] Received permissions-changed event, refreshing...');
            void loadPermissions({ forceRefresh: true });
        };

        window.addEventListener('permissions-changed', handlePermissionsChanged);
        return () => window.removeEventListener('permissions-changed', handlePermissionsChanged);
    }, [loadPermissions]);

    // Permission check functions
    const canAccess = useCallback((moduleCode: string): boolean => {
        const perm = permissions.find(p => p.module_code === moduleCode);
        return perm !== undefined && perm.granted_actions.length > 0;
    }, [permissions]);

    const canPerform = useCallback((moduleCode: string, action: string): boolean => {
        const perm = permissions.find(p => p.module_code === moduleCode);
        return perm?.granted_actions.includes(action) ?? false;
    }, [permissions]);

    const canPerformAll = useCallback((moduleCode: string, actions: string[]): boolean => {
        return actions.every(action => canPerform(moduleCode, action));
    }, [canPerform]);

    const canPerformAny = useCallback((moduleCode: string, actions: string[]): boolean => {
        return actions.some(action => canPerform(moduleCode, action));
    }, [canPerform]);

    const getModuleActions = useCallback((moduleCode: string): string[] => {
        const perm = permissions.find(p => p.module_code === moduleCode);
        return perm?.granted_actions ?? [];
    }, [permissions]);

    const getIsolationMode = useCallback((moduleCode: string): 'shared' | 'isolated' | 'hybrid' => {
        const perm = permissions.find(p => p.module_code === moduleCode);
        return perm?.data_isolation_mode ?? 'isolated';
    }, [permissions]);

    const canSeeAllDepartments = useCallback((moduleCode: string): boolean => {
        const perm = permissions.find(p => p.module_code === moduleCode);
        return perm?.can_see_all_departments ?? false;
    }, [permissions]);

    // NCR permission checks
    const canPerformNcrAction = useCallback((stageCode: string, action: string): boolean => {
        const perm = ncrPermissions.find(p => p.stage_code === stageCode);
        return perm?.allowed_actions.includes(action) ?? false;
    }, [ncrPermissions]);

    const canAdvanceNcr = useCallback((stageCode: string): boolean => {
        const perm = ncrPermissions.find(p => p.stage_code === stageCode);
        return perm?.can_advance ?? false;
    }, [ncrPermissions]);

    const canReturnNcr = useCallback((stageCode: string): boolean => {
        const perm = ncrPermissions.find(p => p.stage_code === stageCode);
        return perm?.can_return ?? false;
    }, [ncrPermissions]);

    // Task stage permission checks
    const canPerformTaskAction = useCallback((stageCode: string, action: string): boolean => {
        const perm = taskPermissions.find(p => p.stage_code === stageCode);
        return perm?.allowed_actions.includes(action) ?? false;
    }, [taskPermissions]);

    const canAdvanceTask = useCallback((stageCode: string): boolean => {
        const perm = taskPermissions.find(p => p.stage_code === stageCode);
        return perm?.can_advance ?? false;
    }, [taskPermissions]);

    const canReturnTask = useCallback((stageCode: string): boolean => {
        const perm = taskPermissions.find(p => p.stage_code === stageCode);
        return perm?.can_return ?? false;
    }, [taskPermissions]);

    return {
        permissions,
        loading,
        error,
        canAccess,
        canPerform,
        canPerformAll,
        canPerformAny,
        getModuleActions,
        getIsolationMode,
        canSeeAllDepartments,
        ncrPermissions,
        canPerformNcrAction,
        canAdvanceNcr,
        canReturnNcr,
        taskPermissions,
        canPerformTaskAction,
        canAdvanceTask,
        canReturnTask,
        refresh: () => loadPermissions({ forceRefresh: true }),
    };
}

// ==================== Simple Permission Check Hook ====================
export function useCanPerform(moduleCode: string, action: string): boolean {
    const { canPerform, loading } = useModulePermissions();
    return !loading && canPerform(moduleCode, action);
}

// ==================== Module Access Hook ====================
export function useModuleAccess(moduleCode: string) {
    const {
        canAccess,
        canPerform,
        getModuleActions,
        getIsolationMode,
        canSeeAllDepartments,
        loading,
    } = useModulePermissions();

    return useMemo(() => ({
        hasAccess: canAccess(moduleCode),
        actions: getModuleActions(moduleCode),
        isolationMode: getIsolationMode(moduleCode),
        canSeeAll: canSeeAllDepartments(moduleCode),
        can: (action: string) => canPerform(moduleCode, action),
        loading,
    }), [moduleCode, canAccess, canPerform, getModuleActions, getIsolationMode, canSeeAllDepartments, loading]);
}

export default useModulePermissions;
