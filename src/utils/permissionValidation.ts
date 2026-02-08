// ==================== Permission Validation Utilities ====================
// Validates permission matrices against hierarchy rules and dangerous combinations

import {
    PERMISSION_HIERARCHY,
    DANGEROUS_PERMISSION_COMBINATIONS,
    PERMISSION_ACTIONS
} from '../constants/rbac';
import type {
    RolePermissionMatrix,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    PermissionAction
} from '../types/rbac';

/**
 * Validates a permission matrix against hierarchy rules
 */
export const validatePermissionMatrix = (
    matrix: RolePermissionMatrix
): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check permission hierarchy
    PERMISSION_HIERARCHY.forEach(({ permission_code, requires_permissions }) => {
        Object.keys(matrix).forEach(moduleCode => {
            const modulePerms = matrix[moduleCode];

            // Check if permission is granted
            const permissionGranted = modulePerms[permission_code as PermissionAction]?.is_granted;

            if (permissionGranted) {
                // Check if all required permissions are granted
                requires_permissions.forEach(required => {
                    const requiredGranted = modulePerms[required as PermissionAction]?.is_granted;

                    if (!requiredGranted) {
                        errors.push({
                            module_code: moduleCode,
                            permission_code,
                            message: `Cannot grant '${permission_code}' without '${required}'`,
                            suggestion: `Grant '${required}' first, or revoke '${permission_code}'`
                        });
                    }
                });
            }
        });
    });

    // Check dangerous combinations
    DANGEROUS_PERMISSION_COMBINATIONS.forEach(danger => {
        const modulePerms = matrix[danger.module];
        if (modulePerms?.[danger.action as PermissionAction]?.is_granted) {
            warnings.push({
                module_code: danger.module,
                permission_code: danger.action,
                message: danger.warning,
                risk_level: danger.risk === 'critical' ? 'high' : danger.risk as 'low' | 'medium' | 'high'
            });
        }
    });

    return {
        is_valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validates a single permission change
 */
export const validatePermissionChange = (
    matrix: RolePermissionMatrix,
    moduleCode: string,
    action: PermissionAction,
    newValue: boolean
): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (newValue) {
        // Granting permission - check hierarchy
        const hierarchy = PERMISSION_HIERARCHY.find(h => h.permission_code === action);
        if (hierarchy) {
            hierarchy.requires_permissions.forEach(required => {
                const requiredGranted = matrix[moduleCode]?.[required as PermissionAction]?.is_granted;
                if (!requiredGranted) {
                    errors.push({
                        module_code: moduleCode,
                        permission_code: action,
                        message: `Cannot grant '${action}' without '${required}'`,
                        suggestion: `Grant '${required}' first`
                    });
                }
            });
        }

        // Check if it's dangerous
        const dangerousCombo = DANGEROUS_PERMISSION_COMBINATIONS.find(
            d => d.module === moduleCode && d.action === action
        );
        if (dangerousCombo) {
            warnings.push({
                module_code: moduleCode,
                permission_code: action,
                message: dangerousCombo.warning,
                risk_level: dangerousCombo.risk === 'critical' ? 'high' : 'medium'
            });
        }
    } else {
        // Revoking permission - check if other permissions depend on it
        PERMISSION_HIERARCHY.forEach(({ permission_code, requires_permissions }) => {
            if (requires_permissions.includes(action)) {
                // Check if the dependent permission is granted
                const dependentGranted = matrix[moduleCode]?.[permission_code as PermissionAction]?.is_granted;
                if (dependentGranted) {
                    errors.push({
                        module_code: moduleCode,
                        permission_code: action,
                        message: `Cannot revoke '${action}' while '${permission_code}' is granted`,
                        suggestion: `Revoke '${permission_code}' first`
                    });
                }
            }
        });
    }

    return {
        is_valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Auto-fixes permission hierarchy violations
 */
export const autoFixPermissionHierarchy = (
    matrix: RolePermissionMatrix
): RolePermissionMatrix => {
    const fixed = JSON.parse(JSON.stringify(matrix)); // Deep clone

    let changed = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    while (changed && iterations < MAX_ITERATIONS) {
        changed = false;
        iterations++;

        // Grant required permissions
        PERMISSION_HIERARCHY.forEach(({ permission_code, requires_permissions }) => {
            Object.keys(fixed).forEach(moduleCode => {
                const modulePerms = fixed[moduleCode];
                const permissionGranted = modulePerms[permission_code as PermissionAction]?.is_granted;

                if (permissionGranted) {
                    requires_permissions.forEach(required => {
                        const requiredGranted = modulePerms[required as PermissionAction]?.is_granted;
                        if (!requiredGranted && modulePerms[required as PermissionAction]) {
                            // Auto-grant the required permission
                            modulePerms[required as PermissionAction]!.is_granted = true;
                            changed = true;
                        }
                    });
                }
            });
        });
    }

    return fixed;
};

/**
 * Gets permissions that would be affected by a change
 */
export const getAffectedPermissions = (
    moduleCode: string,
    action: PermissionAction,
    isGranting: boolean
): { dependent: PermissionAction[], required: PermissionAction[] } => {
    const dependent: PermissionAction[] = [];
    const required: PermissionAction[] = [];

    if (isGranting) {
        // Find what this permission requires
        const hierarchy = PERMISSION_HIERARCHY.find(h => h.permission_code === action);
        if (hierarchy) {
            required.push(...hierarchy.requires_permissions as PermissionAction[]);
        }
    } else {
        // Find what depends on this permission
        PERMISSION_HIERARCHY.forEach(({ permission_code, requires_permissions }) => {
            if (requires_permissions.includes(action)) {
                dependent.push(permission_code as PermissionAction);
            }
        });
    }

    return { dependent, required };
};

/**
 * Checks if a permission is dangerous
 */
export const isDangerousPermission = (
    moduleCode: string,
    action: PermissionAction
): boolean => {
    return DANGEROUS_PERMISSION_COMBINATIONS.some(
        d => d.module === moduleCode && d.action === action
    );
};

/**
 * Gets the danger level for a permission
 */
export const getDangerLevel = (
    moduleCode: string,
    action: PermissionAction
): 'critical' | 'high' | 'medium' | 'low' | null => {
    const danger = DANGEROUS_PERMISSION_COMBINATIONS.find(
        d => d.module === moduleCode && d.action === action
    );

    if (!danger) return null;

    // Map from string to typed return
    if (danger.risk === 'critical') return 'critical';
    if (danger.risk === 'high') return 'high';
    return 'medium';
};

/**
 * Generates a human-readable explanation for a validation error
 */
export const explainValidationError = (error: ValidationError): string => {
    return `In module "${error.module_code}": ${error.message}. ${error.suggestion || ''}`;
};

/**
 * Generates a human-readable explanation for a validation warning
 */
export const explainValidationWarning = (warning: ValidationWarning): string => {
    const riskEmoji = {
        low: '⚠️',
        medium: '🟠',
        high: '🔴'
    };

    return `${riskEmoji[warning.risk_level]} ${warning.message}`;
};

/**
 * Validates multiple permission changes in a batch
 */
export const validateBatchChanges = (
    matrix: RolePermissionMatrix,
    changes: Array<{
        moduleCode: string;
        action: PermissionAction;
        newValue: boolean;
    }>
): ValidationResult => {
    // Apply all changes to a temporary matrix
    const tempMatrix = JSON.parse(JSON.stringify(matrix));

    changes.forEach(({ moduleCode, action, newValue }) => {
        if (tempMatrix[moduleCode]?.[action]) {
            tempMatrix[moduleCode][action]!.is_granted = newValue;
        }
    });

    // Validate the resulting matrix
    return validatePermissionMatrix(tempMatrix);
};

export default {
    validatePermissionMatrix,
    validatePermissionChange,
    autoFixPermissionHierarchy,
    getAffectedPermissions,
    isDangerousPermission,
    getDangerLevel,
    explainValidationError,
    explainValidationWarning,
    validateBatchChanges
};
