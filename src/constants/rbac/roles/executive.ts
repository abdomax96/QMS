// ==================== Executive & Strategic Management Roles ====================

import type { Role } from '../../../types/rbac';
import { SYSTEM_MODULES } from '../modules';
import { createFullPermissionMatrix, grantPermissions, grantAllPermissions, createBaseRole } from './helpers';

export const EXECUTIVE_ROLES: Role[] = [
    // System Administrator
    {
        ...createBaseRole(
            'role_system_admin',
            'SYSTEM_ADMIN',
            'System Administrator',
            'مدير النظام',
            'Full system access with all permissions. Super-user role.',
            'وصول كامل للنظام مع جميع الصلاحيات. دور المسؤول الأعلى.',
            'executive',
            '#1E40AF',
            'ShieldCheck',
            1,
            {
                is_locked: true,
                min_edit_priority: 0
            }
        ),
        permissions: createFullPermissionMatrix(SYSTEM_MODULES, true),
    },

    // Quality Director
    {
        ...createBaseRole(
            'role_quality_director',
            'QUALITY_DIRECTOR',
            'Quality Director',
            'مدير الجودة',
            'VP Quality / Quality Director with full QA/QC access and approval authority.',
            'نائب رئيس الجودة / مدير الجودة مع وصول كامل لضمان ومراقبة الجودة.',
            'executive',
            '#047857',
            'Award',
            5,
            {
                is_locked: true,
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 3,
                minimum_required_permissions: ['ncr.view', 'ncr.approve', 'capa.view', 'capa.approve'],
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, [
                'forms_reports', 'tasks', 'lab', 'ncr', 'settings', 'audit', 'users'
            ]);
            return matrix;
        })(),
    },

    // Plant Manager
    {
        ...createBaseRole(
            'role_plant_manager',
            'PLANT_MANAGER',
            'Plant Manager',
            'مدير المصنع',
            'Operations Director / Plant Manager with oversight of all manufacturing operations.',
            'مدير العمليات / مدير المصنع مع الإشراف على جميع عمليات التصنيع.',
            'executive',
            '#1E40AF',
            'Factory',
            5,
            {
                is_locked: true,
                department: 'Operations',
                department_ar: 'العمليات',
                min_edit_priority: 3,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, [
                'forms_reports', 'tasks', 'lab', 'settings'
            ]);
            grantPermissions(matrix, ['ncr'], ['view', 'create', 'edit', 'approve', 'export']);
            grantPermissions(matrix, ['audit'], ['view', 'export']);
            return matrix;
        })(),
    },

    // Manufacturing Director
    {
        ...createBaseRole(
            'role_manufacturing_director',
            'MANUFACTURING_DIRECTOR',
            'Manufacturing Director',
            'مدير التصنيع',
            'Senior manufacturing leadership with production approval authority.',
            'قيادة تصنيع عليا مع صلاحية الموافقة على الإنتاج.',
            'executive',
            '#B45309',
            'Factory',
            7,
            {
                department: 'Manufacturing',
                department_ar: 'التصنيع',
                min_edit_priority: 5,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['forms_reports', 'tasks']);
            grantPermissions(matrix, ['lab', 'ncr'], ['view', 'create', 'edit', 'approve', 'export']);
            return matrix;
        })(),
    },

    // Compliance Officer
    {
        ...createBaseRole(
            'role_compliance_officer',
            'COMPLIANCE_OFFICER',
            'Compliance Officer',
            'مسؤول الامتثال',
            'Regulatory Affairs Manager ensuring compliance with FDA, ISO, FSSC requirements.',
            'مدير الشؤون التنظيمية لضمان الامتثال لمتطلبات FDA و ISO و FSSC.',
            'executive',
            '#7C3AED',
            'Scale',
            10,
            {
                department: 'Quality',
                department_ar: 'الجودة',
                min_edit_priority: 8,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['forms_reports', 'audit', 'settings']);
            grantPermissions(matrix, ['tasks', 'lab', 'ncr', 'users'], ['view', 'export']);
            return matrix;
        })(),
    },

    // EHS Manager
    {
        ...createBaseRole(
            'role_ehs_manager',
            'EHS_MANAGER',
            'EHS Manager',
            'مدير السلامة والصحة والبيئة',
            'Environmental, Health & Safety Manager.',
            'مدير السلامة والصحة المهنية والبيئة.',
            'executive',
            '#059669',
            'Shield',
            12,
            {
                department: 'EHS',
                department_ar: 'السلامة',
                min_edit_priority: 10,
            }
        ),
        permissions: (() => {
            const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
            grantAllPermissions(matrix, ['forms_reports', 'tasks']);
            grantPermissions(matrix, ['ncr', 'lab'], ['view', 'create', 'edit', 'export']);
            grantPermissions(matrix, ['settings', 'audit'], ['view', 'export']);
            return matrix;
        })(),
    },
];
