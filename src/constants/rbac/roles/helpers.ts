// ==================== Helper Functions for Role Creation ====================
// Shared utilities for creating permission matrices

import type { Role, RolePermissionMatrix, PermissionAction } from '../../../types/rbac';
import { SYSTEM_MODULES } from '../modules';

/**
 * Creates an empty permission matrix with all modules and actions set to denied
 */
export const createFullPermissionMatrix = (
    modules: typeof SYSTEM_MODULES,
    defaultValue: boolean = false
): RolePermissionMatrix => {
    const matrix: RolePermissionMatrix = {};
    modules.forEach(module => {
        matrix[module.code] = {};
        module.available_permissions.forEach(action => {
            matrix[module.code][action as PermissionAction] = {
                permission_id: `perm_${action}`,
                permission_code: action,
                is_granted: defaultValue,
                state: defaultValue ? 'granted' : 'denied',
            };
        });
    });
    return matrix;
};

/**
 * Grants specific permissions for specific modules
 */
export const grantPermissions = (
    matrix: RolePermissionMatrix,
    moduleCodes: string[],
    actions: PermissionAction[]
): void => {
    moduleCodes.forEach(mod => {
        if (matrix[mod]) {
            actions.forEach(action => {
                if (matrix[mod][action]) {
                    matrix[mod][action] = {
                        permission_id: `perm_${action}`,
                        permission_code: action,
                        is_granted: true,
                        state: 'granted',
                    };
                }
            });
        }
    });
};

/**
 * Grants all available permissions for specific modules
 */
export const grantAllPermissions = (
    matrix: RolePermissionMatrix,
    moduleCodes: string[]
): void => {
    moduleCodes.forEach(mod => {
        if (matrix[mod]) {
            Object.keys(matrix[mod]).forEach(action => {
                matrix[mod][action as PermissionAction] = {
                    permission_id: `perm_${action}`,
                    permission_code: action,
                    is_granted: true,
                    state: 'granted',
                };
            });
        }
    });
};

/**
 * Creates a base role object with common properties
 */
export const createBaseRole = (
    id: string,
    code: string,
    name: string,
    name_ar: string,
    description: string,
    description_ar: string,
    category: Role['category'],
    color: string,
    icon: string,
    priority: number,
    options: Partial<Role> = {}
): Omit<Role, 'permissions'> => ({
    id,
    code,
    name,
    name_ar,
    description,
    description_ar,
    category,
    type: 'system',
    color,
    icon,
    priority,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    min_edit_priority: priority - 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...options
});
