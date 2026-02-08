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

    // Refresh
    refresh: () => Promise<void>;
}

// ==================== Default Modules ====================
const DEFAULT_MODULES = ['forms_reports', 'tasks', 'lab', 'ncr'];

// ==================== Hook ====================
export function useModulePermissions(): UseModulePermissionsReturn {
    const { profile } = useSupabaseAuth();
    const [permissions, setPermissions] = useState<ModulePermission[]>([]);
    const [ncrPermissions, setNcrPermissions] = useState<NcrStagePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AbortController ref to cancel in-flight requests on timeout or unmount
    const abortControllerRef = useRef<AbortController | null>(null);

    // Helper to add timeout to promises
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))
        ]);
    };

    // Maximum time to wait for permission loading before forcing completion
    const LOAD_TIMEOUT_MS = 12000;

    // Load permissions using unified RPC (Phase 3 migration)
    const loadPermissions = useCallback(async () => {
        if (!profile?.uid) {
            setPermissions([]);
            setNcrPermissions([]);
            setLoading(false);
            return;
        }

        // Abort any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new AbortController for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setLoading(true);
        setError(null);

        // Safety timeout - ensures loading ALWAYS resolves, preventing infinite loading
        const safetyTimeoutId = setTimeout(() => {
            console.warn('[Permissions] ⚠️ Load timeout reached after', LOAD_TIMEOUT_MS, 'ms - forcing completion');
            abortController.abort(); // Cancel the request on timeout
            setError('انتهت مهلة تحميل الصلاحيات');
            setLoading(false);
        }, LOAD_TIMEOUT_MS);

        try {
            // Check if already aborted before starting
            if (abortController.signal.aborted) {
                clearTimeout(safetyTimeoutId);
                return;
            }

            let baseModulePermissions: ModulePermission[] = [];

            // ==================== PRIMARY PATH: Use new optimized RPC ====================
            // Using get_user_module_permissions from migration 20260103_create_permissions_rpc.sql
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_module_permissions', { user_uuid: profile.uid })
                .abortSignal(abortController.signal) as any;

            if (!rpcError && rpcData && rpcData.length > 0) {
                // RPC succeeded - convert to ModulePermission format
                console.log('[Permissions] ✅ Raw RPC data:', rpcData);

                // Filter out modules with no actual permissions (null or empty granted_actions)
                // Also filter out entries where granted_actions only contains null values
                const modulePerms: ModulePermission[] = rpcData
                    .map((item: any) => {
                        // Clean granted_actions: remove nulls and empty strings
                        const cleanedActions = (item.granted_actions || [])
                            .filter((action: any) => action != null && action !== '');

                        return {
                            module_code: item.module_code,
                            granted_actions: cleanedActions,
                            data_isolation_mode: item.data_isolation_mode || 'shared',
                            can_see_all_departments: item.can_see_all_departments || false
                        };
                    })
                    // Only keep modules that have at least one granted action
                    .filter((perm: ModulePermission) => perm.granted_actions.length > 0)
                    // NCR permissions are sourced from ncr_stage_permissions only.
                    .filter((perm: ModulePermission) => perm.module_code !== 'ncr');

                console.log('[Permissions] Final filtered permissions from RPC:', modulePerms);
                baseModulePermissions = modulePerms;

            } else {
                // ==================== FALLBACK: Direct role_module_permissions path ====================
                // Module visibility derived from role_module_permissions table (same as SimplePermissionMatrix)
                console.warn('[Permissions] RPC not available, using role_module_permissions fallback. Error:', rpcError?.message);

                // Always get roles from user_roles table (profile.roles contains role names, not IDs)
                const { data: userRolesData, error: userRolesError } = await supabase
                    .from('user_roles')
                    .select('role_id')
                    .eq('user_id', profile.uid);

                if (userRolesError) {
                    console.error('[Permissions] Error fetching user_roles:', userRolesError.message);
                }

                const roleIds = userRolesData?.map(r => r.role_id).filter(Boolean) || [];
                console.log('[Permissions] User role IDs from user_roles table:', roleIds);

                if (roleIds.length === 0) {
                    console.warn('[Permissions] User has no roles in user_roles table, no permissions granted');
                    setPermissions([]);
                    setLoading(false);
                    return;
                }

                // Get permissions from role_module_permissions table (same table SimplePermissionMatrix uses)
                const { data: roleModulePermsData, error: roleModulePermsError } = await supabase
                    .from('role_module_permissions')
                    .select('module_code, granted_actions, can_see_all_departments')
                    .in('role_id', roleIds);

                if (roleModulePermsError) {
                    console.error('[Permissions] Error loading role_module_permissions:', roleModulePermsError);
                }

                console.log('[Permissions] Raw role_module_permissions data:', roleModulePermsData);

                // Aggregate permissions from all roles
                const modulePermissions = new Map<string, ModulePermission>();

                roleModulePermsData?.forEach(perm => {
                    if (!perm.module_code) return;
                    if (perm.module_code === 'ncr') return;

                    const existing = modulePermissions.get(perm.module_code);
                    const grantedActions = perm.granted_actions || [];

                    if (existing) {
                        // Merge actions from multiple roles
                        existing.granted_actions = [...new Set([...existing.granted_actions, ...grantedActions])];
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

                const finalPermissions = Array.from(modulePermissions.values());
                console.log('[Permissions] Final permissions from role_module_permissions:', finalPermissions);
                baseModulePermissions = finalPermissions;
            }


            // ==================== NCR Stage Permissions ====================
            // Role-only source: ncr_stage_permissions (role_id + stage_code).
            const { data: userRolesRows, error: userRolesRowsError } = await supabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', profile.uid);

            if (userRolesRowsError) {
                console.warn('[Permissions] Error fetching user roles for NCR stage permissions:', userRolesRowsError.message);
            }

            const roleIds = (userRolesRows || []).map(row => row.role_id).filter(Boolean);

            let stageRows: {
                stage_code: string | null;
                allowed_actions: string[] | null;
                can_advance: boolean | null;
                can_return: boolean | null;
            }[] = [];

            if (roleIds.length > 0) {
                const { data: nspRows, error: nspRowsError } = await supabase
                    .from('ncr_stage_permissions')
                    .select('stage_code, allowed_actions, can_advance, can_return')
                    .eq('is_active', true)
                    .is('department_id', null)
                    .in('role_id', roleIds);

                if (nspRowsError) {
                    console.warn('[Permissions] Error fetching role-based NCR stage permissions:', nspRowsError.message);
                } else if (nspRows?.length) {
                    stageRows = nspRows;
                }
            }

            const ncrMap = new Map<string, NcrStagePermission>();
            stageRows.forEach(row => {
                const stageCode = (row.stage_code || '').trim();
                if (!stageCode) return;

                const allowedActions = Array.from(new Set((row.allowed_actions || []).filter(Boolean)));
                const canAdvance = Boolean(row.can_advance);
                const canReturn = Boolean(row.can_return);

                if (!allowedActions.includes('view')) {
                    allowedActions.unshift('view');
                }

                const existing = ncrMap.get(stageCode);
                if (existing) {
                    existing.allowed_actions = Array.from(new Set([...existing.allowed_actions, ...allowedActions]));
                    existing.can_advance = existing.can_advance || canAdvance;
                    existing.can_return = existing.can_return || canReturn;
                } else {
                    ncrMap.set(stageCode, {
                        stage_code: stageCode,
                        allowed_actions: allowedActions,
                        can_advance: canAdvance,
                        can_return: canReturn,
                    });
                }
            });

            const stagePermissions = Array.from(ncrMap.values());
            setNcrPermissions(stagePermissions);

            // Derive NCR module visibility/actions strictly from role-stage rows.
            const ncrModuleActions = Array.from(new Set(
                stagePermissions.flatMap(stagePerm => [
                    ...stagePerm.allowed_actions,
                    ...(stagePerm.can_advance ? ['workflow.progress'] : []),
                    ...(stagePerm.can_return ? ['workflow.return'] : []),
                ])
            )).sort();

            const mergedPermissions = [...baseModulePermissions];
            if (ncrModuleActions.length > 0) {
                mergedPermissions.push({
                    module_code: 'ncr',
                    granted_actions: ncrModuleActions,
                    data_isolation_mode: 'hybrid',
                    can_see_all_departments: false,
                });
            }
            setPermissions(mergedPermissions);

        } catch (err) {
            console.error('Error loading permissions:', err);
            setError('فشل في تحميل الصلاحيات');
            setPermissions([]);
            setNcrPermissions([]);
        } finally {
            // Clear safety timeout and ensure loading is always set to false
            clearTimeout(safetyTimeoutId);
            setLoading(false);
        }
    }, [profile?.uid]);

    // Load on mount and user change
    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    // Listen for permission changes from other parts of the app
    useEffect(() => {
        const handlePermissionsChanged = () => {
            console.log('[Permissions] Received permissions-changed event, refreshing...');
            loadPermissions();
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
        refresh: loadPermissions,
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
