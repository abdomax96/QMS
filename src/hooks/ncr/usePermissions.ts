import { useCallback, useMemo } from 'react';
import { usePermissions as useMatrixPermissions } from '../usePermissions';
import { useSupabaseAuth } from '../useSupabaseAuth';

interface LegacyRoleData {
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    isLocked: boolean;
    priority: number;
}

type PermissionParts = {
    moduleCode: string;
    action: string;
};

const MODULE_ALIAS: Record<string, string> = {
    forms: 'forms_reports',
    reports: 'forms_reports',
    explorer: 'forms_reports',
    settings: 'access_management',
};

const ACTION_ALIAS: Record<string, string> = {
    manage_permissions: 'edit',
    read: 'view',
    update: 'edit',
};

function parsePermission(permission: string): PermissionParts | null {
    const value = (permission || '').trim();
    if (!value) return null;

    if (!value.includes('.')) {
        return { moduleCode: 'ncr', action: value };
    }

    const segments = value.split('.');
    const rawModule = segments.shift() || '';
    const rawAction = segments.join('.');
    if (!rawModule || !rawAction) return null;

    const moduleCode = MODULE_ALIAS[rawModule] || rawModule;
    const action = ACTION_ALIAS[rawAction] || rawAction;
    return { moduleCode, action };
}

export function usePermissions() {
    const { profile } = useSupabaseAuth();
    const {
        can,
        canAny,
        canAll,
        hasAnyAccess,
        isAdmin: isMatrixAdmin,
        loading,
    } = useMatrixPermissions();

    const roles = useMemo(
        () => (Array.isArray(profile?.roles) ? profile.roles.filter(Boolean) : []),
        [profile?.roles]
    );

    const isSuperAdmin = useMemo(
        () => roles.some(role => {
            const normalized = String(role).toLowerCase();
            return normalized === 'super_admin' || normalized === 'super-admin';
        }),
        [roles]
    );

    const isAdmin = isMatrixAdmin || isSuperAdmin;

    const hasPermission = useCallback((permission: string): boolean => {
        if (isAdmin) return true;

        const parsed = parsePermission(permission);
        if (!parsed) return false;

        if (parsed.action === '*') {
            return hasAnyAccess(parsed.moduleCode);
        }

        return can(parsed.moduleCode, parsed.action);
    }, [can, hasAnyAccess, isAdmin]);

    const hasAnyPermission = useCallback((permissions: string[]): boolean => {
        if (isAdmin) return true;
        if (!permissions?.length) return false;

        const grouped = new Map<string, string[]>();
        for (const permission of permissions) {
            const parsed = parsePermission(permission);
            if (!parsed || parsed.action === '*') {
                if (parsed?.action === '*' && hasAnyAccess(parsed.moduleCode)) {
                    return true;
                }
                continue;
            }

            const actions = grouped.get(parsed.moduleCode) || [];
            actions.push(parsed.action);
            grouped.set(parsed.moduleCode, actions);
        }

        if (grouped.size === 0) {
            return permissions.some(hasPermission);
        }

        for (const [moduleCode, actions] of grouped.entries()) {
            if (canAny(moduleCode, actions)) return true;
        }

        return false;
    }, [canAny, hasAnyAccess, hasPermission, isAdmin]);

    const hasAllPermissions = useCallback((permissions: string[]): boolean => {
        if (isAdmin) return true;
        if (!permissions?.length) return false;

        const grouped = new Map<string, string[]>();
        for (const permission of permissions) {
            const parsed = parsePermission(permission);
            if (!parsed || parsed.action === '*') {
                if (!(parsed?.action === '*' && hasAnyAccess(parsed.moduleCode))) {
                    return false;
                }
                continue;
            }

            const actions = grouped.get(parsed.moduleCode) || [];
            actions.push(parsed.action);
            grouped.set(parsed.moduleCode, actions);
        }

        for (const [moduleCode, actions] of grouped.entries()) {
            if (!canAll(moduleCode, actions)) return false;
        }

        return true;
    }, [canAll, hasAnyAccess, isAdmin]);

    const hasRole = useCallback((role: string): boolean => {
        const target = (role || '').toLowerCase();
        if (!target) return false;
        if (isSuperAdmin) return true;
        return roles.some(r => String(r).toLowerCase() === target);
    }, [isSuperAdmin, roles]);

    const hasAnyRole = useCallback((roleList: string[]): boolean => {
        if (!roleList?.length) return false;
        return roleList.some(hasRole);
    }, [hasRole]);

    const validatePermissionServer = useCallback(async (permission: string): Promise<boolean> => {
        return hasPermission(permission);
    }, [hasPermission]);

    const validateHierarchyServer = useCallback(async (permission: string): Promise<boolean> => {
        return hasPermission(permission);
    }, [hasPermission]);

    const logAction = useCallback(async () => true, []);

    const refresh = useCallback(async () => {
        window.dispatchEvent(new CustomEvent('permissions-changed'));
    }, []);

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,

        validatePermissionServer,
        validateHierarchyServer,

        hasRole,
        hasAnyRole,

        canModifyRole: () => isAdmin,
        isRoleLocked: () => false,
        getMissingRequirements: () => [] as string[],
        getCascadeRevoke: () => [] as string[],

        logAction,
        refresh,

        isAdmin,
        isSuperAdmin,
        loading,
        userPriority: 999,

        roles,
        roleData: [] as LegacyRoleData[],
        permissions: [] as string[],
        permissionSet: new Set<string>(),
    };
}

export default usePermissions;
