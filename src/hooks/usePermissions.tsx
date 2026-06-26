// ==================== Permission Hooks ====================
// Enterprise-Grade Permission Checking Utilities
//
// SECURITY: This module enforces database-backed permissions ONLY.
// All legacy Zustand-based methods are DISABLED to prevent silent authorization bugs.

import React, { useMemo, useCallback } from 'react';
import { useModulePermissions } from './useModulePermissions';
import type { PermissionAction, Module } from '../constants/rbac/modules';
import { SYSTEM_MODULES } from '../constants/rbac/modules';

// Re-export the unified permission service for backend operations
export { checkPermission, requirePermission, PermissionError } from '../services/unifiedPermissionService';

// ==================== Strict Mode Configuration ====================
const STRICT_MODE = true; // Set to false only during migration testing

/**
 * Throws an error for deprecated API usage in strict mode
 */
function throwDeprecatedError(methodName: string, alternative: string): never {
    throw new Error(
        `[SECURITY] ${methodName} is DISABLED. ` +
        `This method used localStorage-based permissions which could be manipulated. ` +
        `Use ${alternative} instead for database-backed authorization.`
    );
}

/**
 * Hook to check user permissions
 * 
 * Uses database-backed useModulePermissions for all permission checks.
 * 
 * @param userId - Ignored (permissions loaded for current authenticated user)
 */
export const usePermissions = (_userId?: string) => {
    const {
        canAccess,
        canPerform,
        canPerformAll,
        canPerformAny,
        loading,
    } = useModulePermissions();

    // Get modules from constants
    const modules = SYSTEM_MODULES;

    // Check if user has a specific permission (DATABASE-BACKED)
    const can = useCallback(
        (moduleCode: string, action: PermissionAction | string): boolean => {
            return canPerform(moduleCode, action);
        },
        [canPerform]
    );

    // Check ALL permissions (DATABASE-BACKED)
    const canAll = useCallback(
        (moduleCode: string, actions: (PermissionAction | string)[]): boolean => {
            return canPerformAll(moduleCode, actions);
        },
        [canPerformAll]
    );

    // Check ANY permission (DATABASE-BACKED)
    const canAnyAction = useCallback(
        (moduleCode: string, actions: (PermissionAction | string)[]): boolean => {
            return canPerformAny(moduleCode, actions);
        },
        [canPerformAny]
    );

    // Check if user has full access to a module (DATABASE-BACKED)
    const hasFullAccess = useCallback(
        (moduleCode: string): boolean => {
            const module = modules.find(m => m.code === moduleCode);
            if (!module) return false;
            return module.available_permissions.every(action =>
                canPerform(moduleCode, action)
            );
        },
        [modules, canPerform]
    );

    // Check if user has any permission for a module (DATABASE-BACKED)
    const hasAnyAccess = useCallback(
        (moduleCode: string): boolean => {
            return canAccess(moduleCode);
        },
        [canAccess]
    );

    // Get list of all modules user has access to (DATABASE-BACKED)
    const accessibleModules = useMemo((): Module[] => {
        return modules.filter(module => canAccess(module.code));
    }, [modules, canAccess]);

    // EXPLICIT ADMIN CHECK: Uses dedicated system.admin permission
    // NOT inferred from other permissions to prevent privilege escalation
    const isAdmin = useMemo(() => {
        // Check for explicit admin permission in the system module
        return canPerform('system', 'admin');
    }, [canPerform]);

    // DISABLED: Role-based checks - use permission-based checks instead
    const hasRole = useCallback(
        (roleCode: string): boolean => {
            if (STRICT_MODE) {
                throwDeprecatedError('hasRole()', 'canPerform(module, action)');
            }
            return false;
        },
        []
    );

    return {
        // SAFE: Database-backed permission checks
        can,
        canAll,
        canAny: canAnyAction,
        hasFullAccess,
        hasAnyAccess,

        // EXPLICIT: Admin permission check (requires system.admin)
        isAdmin,

        // DEPRECATED: Will throw in strict mode
        hasRole,

        // SAFE: Database-backed module access
        accessibleModules,

        // Loading state
        loading,
    };
};

/**
 * Hook for component-level permission checking
 * Returns functions to wrap components with permission checks
 */
export const usePermissionGuard = (_userId?: string) => {
    const { can, isAdmin } = usePermissions();

    // Check permission and return null if not allowed
    const guardComponent = useCallback(
        <T extends object>(
            moduleCode: string,
            action: PermissionAction | string,
            Component: React.ComponentType<T>,
            props: T,
            fallback?: React.ReactNode
        ): React.ReactNode => {
            if (isAdmin || can(moduleCode, action as PermissionAction)) {
                return <Component {...props} />;
            }
            return fallback || null;
        },
        [can, isAdmin]
    );

    // Higher-order component for permission gating
    const withPermission = useCallback(
        <T extends object>(
            moduleCode: string,
            action: PermissionAction | string,
            fallback?: React.ReactNode
        ) => {
            return (Component: React.ComponentType<T>) => {
                const WrappedComponent = (props: T) => {
                    if (isAdmin || can(moduleCode, action as PermissionAction)) {
                        return <Component {...props} />;
                    }
                    return <>{fallback}</>;
                };
                WrappedComponent.displayName = `WithPermission(${Component.displayName || Component.name || 'Component'})`;
                return WrappedComponent;
            };
        },
        [can, isAdmin]
    );

    return {
        guardComponent,
        withPermission,
    };
};

/**
 * Hook to get permission state for UI rendering
 */
export const usePermissionState = (
    _userId: string,
    moduleCode: string
) => {
    const { can, hasFullAccess, hasAnyAccess, isAdmin } = usePermissions();

    return useMemo(() => ({
        canView: isAdmin || can(moduleCode, 'view'),
        canCreate: isAdmin || can(moduleCode, 'create'),
        canEdit: isAdmin || can(moduleCode, 'edit'),
        canDelete: isAdmin || can(moduleCode, 'delete'),
        canApprove: isAdmin || can(moduleCode, 'approve'),
        canExport: isAdmin || can(moduleCode, 'export'),
        canArchive: isAdmin || can(moduleCode, 'archive'),
        hasFullAccess: isAdmin || hasFullAccess(moduleCode),
        hasAnyAccess: isAdmin || hasAnyAccess(moduleCode),
        isAdmin,
    }), [moduleCode, can, hasFullAccess, hasAnyAccess, isAdmin]);
};

/**
 * @deprecated DISABLED - Throws in strict mode
 * Use async checkPermission from unifiedPermissionService
 */
export const checkPermissionSync = (
    _userId: string,
    _moduleCode: string,
    _action: PermissionAction
): boolean => {
    if (STRICT_MODE) {
        throwDeprecatedError('checkPermissionSync()', 'async checkPermission() from unifiedPermissionService');
    }
    return false;
};

/**
 * @deprecated DISABLED - Throws in strict mode
 * Use useModulePermissions().permissions instead
 */
export const getAllUserPermissions = (_userId: string) => {
    if (STRICT_MODE) {
        throwDeprecatedError('getAllUserPermissions()', 'useModulePermissions().permissions');
    }
    return {
        user_id: '',
        roles: [],
        effective_permissions: {},
        conflict_resolution: 'permissive_union' as const,
        computed_at: new Date().toISOString(),
    };
};

export default usePermissions;
