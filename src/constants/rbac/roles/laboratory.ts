// ==================== Laboratory & Testing Roles ====================

import type { Role } from '../../../types/rbac';
import { SYSTEM_MODULES } from '../modules';
import { createFullPermissionMatrix, grantPermissions, grantAllPermissions, createBaseRole } from './helpers';

export const LABORATORY_ROLES: Role[] = [
    // Lab Director
    {
        ...createBaseRole(
            'role_lab_director',
            'LAB_DIRECTOR',
            'Laboratory Director',
            'مدير المختبر',
            'Laboratory Director with full testing authority.',
            'مدير المختبر مع صلاحيات كاملة للاختبارات.',
            'laboratory',
            '#BE185D',
            'Beaker',
            15,
            {
                department: 'Laboratory',
                department_ar: 'المختبر',
                min_edit_priority: 12,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['lab', 'forms_reports', 'tasks']);
            grantPermissions(matrix, ['ncr'], ['view', 'create', 'edit', 'approve', 'export']);
            grantPermissions(matrix, ['settings'], ['view']);
            return matrix;
        })(),
    },

    // Lab Analyst
    {
        ...createBaseRole(
            'role_lab_analyst',
            'LAB_ANALYST',
            'Laboratory Analyst',
            'محلل مختبر',
            'Laboratory Analyst performing tests and analyses.',
            'محلل مختبر يقوم بإجراء الاختبارات والتحليلات.',
            'laboratory',
            '#EC4899',
            'Flask',
            30,
            {
                department: 'Laboratory',
                department_ar: 'المختبر',
                min_edit_priority: 25,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, ['lab'], ['view', 'create', 'edit', 'export']);
            grantPermissions(matrix, ['forms_reports', 'tasks'], ['view', 'create', 'edit']);
            grantPermissions(matrix, ['ncr'], ['view', 'create']);
            return matrix;
        })(),
    },

    // Lab Technician
    {
        ...createBaseRole(
            'role_lab_technician',
            'LAB_TECHNICIAN',
            'Laboratory Technician',
            'فني مختبر',
            'Laboratory Technician assisting with sample testing.',
            'فني مختبر يساعد في اختبار العينات.',
            'laboratory',
            '#F472B6',
            'TestTube',
            40,
            {
                department: 'Laboratory',
                department_ar: 'المختبر',
                min_edit_priority: 35,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, ['lab'], ['view', 'create', 'edit']);
            grantPermissions(matrix, ['forms_reports', 'tasks'], ['view', 'create']);
            return matrix;
        })(),
    },
];
