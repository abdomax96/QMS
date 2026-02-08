// ==================== Support & Administrative Roles ====================

import type { Role } from '../../../types/rbac';
import { SYSTEM_MODULES } from '../modules';
import { createFullPermissionMatrix, grantPermissions, grantAllPermissions, createBaseRole } from './helpers';

export const SUPPORT_ROLES: Role[] = [
    // Task Manager
    {
        ...createBaseRole(
            'role_task_manager',
            'TASK_MANAGER',
            'Task Manager',
            'مدير المهام',
            'Manages and assigns tasks across departments.',
            'يدير ويعين المهام عبر الأقسام.',
            'support',
            '#3B82F6',
            'ClipboardList',
            30,
            {
                department: 'Administration',
                department_ar: 'الإدارة',
                min_edit_priority: 25,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['tasks']);
            grantPermissions(matrix, ['forms_reports'], ['view', 'create', 'edit', 'export']);
            grantPermissions(matrix, ['ncr', 'lab'], ['view']);
            return matrix;
        })(),
    },

    // Read Only User
    {
        ...createBaseRole(
            'role_read_only',
            'READ_ONLY',
            'Read Only User',
            'مستخدم قراءة فقط',
            'View-only access to most modules.',
            'وصول للقراءة فقط لمعظم الوحدات.',
            'support',
            '#9CA3AF',
            'Eye',
            50,
            {
                min_edit_priority: 45,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, Object.keys(matrix), ['view']);
            return matrix;
        })(),
    },

    // Guest User
    {
        ...createBaseRole(
            'role_guest',
            'GUEST',
            'Guest User',
            'مستخدم ضيف',
            'Limited guest access.',
            'وصول محدود للضيف.',
            'support',
            '#D1D5DB',
            'User',
            60,
            {
                min_edit_priority: 55,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, ['forms_reports'], ['view']);
            return matrix;
        })(),
    },
];
