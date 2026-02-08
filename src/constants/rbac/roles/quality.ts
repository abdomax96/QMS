// ==================== Quality Assurance Department Roles ====================

import type { Role } from '../../../types/rbac';
import { SYSTEM_MODULES } from '../modules';
import { createFullPermissionMatrix, grantPermissions, grantAllPermissions, createBaseRole } from './helpers';

export const QUALITY_ROLES: Role[] = [
    // QA Manager
    {
        ...createBaseRole(
            'role_qa_manager',
            'QA_MANAGER',
            'QA Manager',
            'مدير ضمان الجودة',
            'Quality Assurance Manager with department-level authority.',
            'مدير ضمان الجودة مع صلاحيات على مستوى القسم.',
            'quality',
            '#047857',
            'Award',
            15,
            {
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 12,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['forms_reports', 'tasks', 'ncr']);
            grantPermissions(matrix, ['lab'], ['view', 'approve', 'export']);
            grantPermissions(matrix, ['settings'], ['view']);
            return matrix;
        })(),
    },

    // QA Supervisor
    {
        ...createBaseRole(
            'role_qa_supervisor',
            'QA_SUPERVISOR',
            'QA Supervisor',
            'مشرف ضمان الجودة',
            'Quality Assurance Supervisor / QA Lead.',
            'مشرف ضمان الجودة / قائد فريق الجودة.',
            'quality',
            '#059669',
            'UserCheck',
            20,
            {
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 15,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, ['forms_reports', 'tasks', 'ncr'], ['view', 'create', 'edit', 'approve', 'export']);
            grantPermissions(matrix, ['lab'], ['view', 'approve', 'export']);
            return matrix;
        })(),
    },

    // QA Inspector
    {
        ...createBaseRole(
            'role_qa_inspector',
            'QA_INSPECTOR',
            'QA Inspector',
            'مفتش الجودة',
            'Quality Inspector performing inspections and creating NCRs.',
            'مفتش الجودة يقوم بالفحوصات وإنشاء تقارير عدم المطابقة.',
            'quality',
            '#10B981',
            'Search',
            30,
            {
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 25,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantPermissions(matrix, ['forms_reports', 'tasks', 'ncr'], ['view', 'create', 'edit', 'export']);
            grantPermissions(matrix, ['lab'], ['view', 'export']);
            return matrix;
        })(),
    },

    // Document Controller
    {
        ...createBaseRole(
            'role_document_controller',
            'DOCUMENT_CONTROLLER',
            'Document Controller',
            'مسؤول الوثائق',
            'Document Control Specialist managing document lifecycle.',
            'أخصائي التحكم في الوثائق يدير دورة حياة الوثائق.',
            'quality',
            '#6B7280',
            'FileStack',
            25,
            {
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 20,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['forms_reports']);
            grantPermissions(matrix, ['tasks'], ['view', 'create', 'edit', 'export']);
            grantPermissions(matrix, Object.keys(matrix), ['view']);
            return matrix;
        })(),
    },
];
