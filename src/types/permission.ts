/**
 * Permission & RBAC Types
 * أنواع الصلاحيات والأدوار
 */

// ============ Role Types ============

export interface Role {
    id: string;
    companyId?: string | null;  // null = system role
    name: string;
    nameAr?: string;
    code: string;
    description?: string;
    descriptionAr?: string;
    color?: string;
    priority: number;
    isSystem: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ============ Permission Types ============

export interface Permission {
    id: string;
    code: string;  // e.g., 'ncr.create', 'lab.test.approve'
    name: string;
    nameAr?: string;
    category: PermissionCategory;
    categoryAr?: string;
    module?: string;
    description?: string;
    descriptionAr?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type PermissionCategory =
    | 'explorer'
    | 'quality'
    | 'lab'
    | 'production'
    | 'warehouse'
    | 'maintenance'
    | 'food_safety'
    | 'purchasing'
    | 'tasks'
    | 'masterdata'
    | 'analytics'
    | 'admin'
    | 'general';

// ============ Junction Types ============

export interface RolePermission {
    id: string;
    roleId: string;
    permissionId: string;
    permissionCode: string;
    granted: boolean;
    createdAt?: string;
}

export interface UserRole {
    id: string;
    userId: string;
    roleId: string;
    assignedAt: string;
    assignedBy?: string;
    expiresAt?: string;
}

// ============ System Role Codes ============

export const SYSTEM_ROLES = {
    // System
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',

    // Quality Department (قسم الجودة)
    QUALITY_MANAGER: 'quality_manager',
    QA_SUPERVISOR: 'qa_supervisor',
    QA_ENGINEER: 'qa_engineer',
    QC_SUPERVISOR: 'qc_supervisor',
    QC_INSPECTOR: 'qc_inspector',

    // Laboratory (المختبر)
    LAB_MANAGER: 'lab_manager',
    LAB_SUPERVISOR: 'lab_supervisor',
    LAB_ANALYST: 'lab_analyst',
    LAB_ASSISTANT: 'lab_assistant',

    // Production (الإنتاج)
    PRODUCTION_MANAGER: 'production_manager',
    PRODUCTION_SUPERVISOR: 'production_supervisor',
    LINE_LEADER: 'line_leader',
    MACHINE_OPERATOR: 'machine_operator',
    PRODUCTION_WORKER: 'production_worker',

    // Warehouse (المستودعات)
    WAREHOUSE_MANAGER: 'warehouse_manager',
    WAREHOUSE_SUPERVISOR: 'warehouse_supervisor',
    WAREHOUSE_CLERK: 'warehouse_clerk',
    RECEIVER: 'receiver',

    // Maintenance (الصيانة)
    MAINTENANCE_MANAGER: 'maintenance_manager',
    MAINTENANCE_SUPERVISOR: 'maintenance_supervisor',
    MAINTENANCE_TECHNICIAN: 'maintenance_technician',
    ELECTRICIAN: 'electrician',

    // Food Safety (سلامة الغذاء)
    FOOD_SAFETY_MANAGER: 'food_safety_manager',
    HACCP_COORDINATOR: 'haccp_coordinator',
    SANITATION_SUPERVISOR: 'sanitation_supervisor',

    // Purchasing (المشتريات)
    PURCHASING_MANAGER: 'purchasing_manager',
    BUYER: 'buyer',

    // HR (الموارد البشرية)
    HR_MANAGER: 'hr_manager',
    HR_OFFICER: 'hr_officer',

    // General
    DEPARTMENT_HEAD: 'department_head',
    EMPLOYEE: 'employee',
    VIEWER: 'viewer',

    // Legacy aliases
    MANAGER: 'manager',
    QA_MANAGER: 'qa_manager',
    LAB_TECH: 'lab_tech',
    USER: 'user',
    QC_ENGINEER: 'qc_engineer',
    LAB_ENGINEER: 'lab_engineer',
    DEPARTMENT_USER: 'department_user'
} as const;

export type SystemRoleCode = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

// ============ Permission Codes ============

export const PERMISSIONS = {
    // Explorer / File Management (AUDIT FIX: Added for folder/template/instance operations)
    EXPLORER_CREATE: 'explorer.create',
    EXPLORER_READ: 'explorer.read',
    EXPLORER_UPDATE: 'explorer.update',
    EXPLORER_DELETE: 'explorer.delete',
    EXPLORER_MOVE: 'explorer.move',

    // Folders
    FOLDERS_CREATE: 'folders.create',
    FOLDERS_READ: 'folders.read',
    FOLDERS_UPDATE: 'folders.update',
    FOLDERS_DELETE: 'folders.delete',

    // Templates
    TEMPLATES_CREATE: 'templates.create',
    TEMPLATES_READ: 'templates.read',
    TEMPLATES_UPDATE: 'templates.update',
    TEMPLATES_DELETE: 'templates.delete',

    // Instances / Reports
    INSTANCES_CREATE: 'instances.create',
    INSTANCES_READ: 'instances.read',
    INSTANCES_UPDATE: 'instances.update',
    INSTANCES_DELETE: 'instances.delete',
    REPORTS_CREATE: 'reports.create',
    REPORTS_READ: 'reports.read',
    REPORTS_UPDATE: 'reports.update',
    REPORTS_DELETE: 'reports.delete',

    // Report Workflow (Review System)
    REPORTS_EDIT_OWN: 'reports.edit.own',
    REPORTS_SUBMIT: 'reports.submit',
    REPORTS_VIEW_OWN: 'reports.view.own',
    REPORTS_VIEW_DEPARTMENT: 'reports.view.department',
    REPORTS_REVIEW_CLAIM: 'reports.review.claim',
    REPORTS_REVIEW_APPROVE: 'reports.review.approve',
    REPORTS_REVIEW_REJECT: 'reports.review.reject',
    REPORTS_REVIEW_EDIT: 'reports.review.edit',
    REPORTS_REOPEN: 'reports.reopen',
    REPORTS_ARCHIVE: 'reports.archive',

    // Recycle Bin
    RECYCLE_BIN_VIEW: 'admin.recycle_bin',
    RECYCLE_BIN_RESTORE: 'admin.recycle_bin.restore',
    RECYCLE_BIN_DELETE: 'admin.recycle_bin.delete',

    // NCR
    NCR_VIEW: 'ncr.view',
    NCR_CREATE: 'ncr.create',
    NCR_EDIT: 'ncr.edit',
    NCR_DELETE: 'ncr.delete',
    NCR_ASSIGN: 'ncr.assign',
    NCR_APPROVE: 'ncr.approve',
    NCR_COMMENT: 'ncr.comment',

    // Lab
    LAB_VIEW: 'lab.view',
    LAB_TEST_CREATE: 'lab.test.create',
    LAB_TEST_RUN: 'lab.test.run',
    LAB_TEST_APPROVE: 'lab.test.approve',
    LAB_RECEIVING_CREATE: 'lab.receiving.create',
    LAB_RECEIVING_INSPECT: 'lab.receiving.inspect',
    LAB_RECEIVING_APPROVE: 'lab.receiving.approve',

    // Food Safety / HACCP
    HACCP_VIEW: 'haccp.view',
    HACCP_MANAGE: 'haccp.manage',
    HACCP_MONITOR: 'haccp.monitor',
    HACCP_VERIFY: 'haccp.verify',
    HACCP_CORRECTIVE: 'haccp.corrective',

    // Forms
    FORMS_VIEW: 'forms.view',
    FORMS_TEMPLATE_CREATE: 'forms.template.create',
    FORMS_TEMPLATE_EDIT: 'forms.template.edit',
    FORMS_FILL: 'forms.fill',
    FORMS_SUBMIT: 'forms.submit',
    FORMS_APPROVE: 'forms.approve',

    // Tasks
    TASKS_VIEW: 'tasks.view',
    TASKS_CREATE: 'tasks.create',
    TASKS_ASSIGN: 'tasks.assign',
    TASKS_COMPLETE: 'tasks.complete',
    TASKS_VERIFY: 'tasks.verify',

    // Master Data
    MASTERDATA_VIEW: 'masterdata.view',
    MASTERDATA_MANAGE: 'masterdata.manage',

    // Admin
    ADMIN_USERS: 'admin.users',
    ADMIN_ROLES: 'admin.roles',
    ADMIN_SETTINGS: 'admin.settings',
    ADMIN_COMPANIES: 'admin.companies',
    ADMIN_DEPARTMENTS: 'admin.departments'
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'approve' | 'comment' | 'list' | 'fill' | 'submit';

// ============ Permission Groups ============
// Note: This is a simplified frontend grouping. Full permissions defined in SQL migration.

export const PERMISSION_GROUPS: Record<PermissionCategory, PermissionCode[]> = {
    explorer: [
        PERMISSIONS.EXPLORER_CREATE,
        PERMISSIONS.EXPLORER_READ,
        PERMISSIONS.EXPLORER_UPDATE,
        PERMISSIONS.EXPLORER_DELETE,
        PERMISSIONS.EXPLORER_MOVE,
        PERMISSIONS.FOLDERS_CREATE,
        PERMISSIONS.FOLDERS_READ,
        PERMISSIONS.FOLDERS_UPDATE,
        PERMISSIONS.FOLDERS_DELETE,
        PERMISSIONS.TEMPLATES_CREATE,
        PERMISSIONS.TEMPLATES_READ,
        PERMISSIONS.TEMPLATES_UPDATE,
        PERMISSIONS.TEMPLATES_DELETE,
        PERMISSIONS.INSTANCES_CREATE,
        PERMISSIONS.INSTANCES_READ,
        PERMISSIONS.INSTANCES_UPDATE,
        PERMISSIONS.INSTANCES_DELETE,
        PERMISSIONS.REPORTS_CREATE,
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.REPORTS_UPDATE,
        PERMISSIONS.REPORTS_DELETE
    ],
    quality: [
        PERMISSIONS.NCR_VIEW,
        PERMISSIONS.NCR_CREATE,
        PERMISSIONS.NCR_EDIT,
        PERMISSIONS.NCR_DELETE,
        PERMISSIONS.NCR_ASSIGN,
        PERMISSIONS.NCR_APPROVE,
        PERMISSIONS.NCR_COMMENT
    ],
    lab: [
        PERMISSIONS.LAB_VIEW,
        PERMISSIONS.LAB_TEST_CREATE,
        PERMISSIONS.LAB_TEST_RUN,
        PERMISSIONS.LAB_TEST_APPROVE,
        PERMISSIONS.LAB_RECEIVING_CREATE,
        PERMISSIONS.LAB_RECEIVING_INSPECT,
        PERMISSIONS.LAB_RECEIVING_APPROVE
    ],
    production: [],
    warehouse: [],
    maintenance: [],
    food_safety: [
        PERMISSIONS.HACCP_VIEW,
        PERMISSIONS.HACCP_MANAGE,
        PERMISSIONS.HACCP_MONITOR,
        PERMISSIONS.HACCP_VERIFY,
        PERMISSIONS.HACCP_CORRECTIVE
    ],
    purchasing: [],
    tasks: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_CREATE,
        PERMISSIONS.TASKS_ASSIGN,
        PERMISSIONS.TASKS_COMPLETE,
        PERMISSIONS.TASKS_VERIFY
    ],
    masterdata: [
        PERMISSIONS.MASTERDATA_VIEW,
        PERMISSIONS.MASTERDATA_MANAGE
    ],
    analytics: [],
    admin: [
        PERMISSIONS.ADMIN_USERS,
        PERMISSIONS.ADMIN_ROLES,
        PERMISSIONS.ADMIN_SETTINGS,
        PERMISSIONS.ADMIN_COMPANIES,
        PERMISSIONS.ADMIN_DEPARTMENTS,
        PERMISSIONS.RECYCLE_BIN_VIEW,
        PERMISSIONS.RECYCLE_BIN_RESTORE,
        PERMISSIONS.RECYCLE_BIN_DELETE
    ],
    general: []
};

// ============ Utility Functions ============

/**
 * Get permission category from permission code
 */
export function getPermissionCategory(code: string): PermissionCategory {
    const [category] = code.split('.');
    const categoryMap: Record<string, PermissionCategory> = {
        // Explorer
        explorer: 'explorer',
        folders: 'explorer',
        templates: 'explorer',
        instances: 'explorer',
        reports: 'explorer',
        // Quality
        ncr: 'quality',
        hold: 'quality',
        // Lab
        lab: 'lab',
        // Production
        production: 'production',
        // Warehouse
        receiving: 'warehouse',
        warehouse: 'warehouse',
        // Maintenance
        maintenance: 'maintenance',
        // Food Safety
        haccp: 'food_safety',
        food_safety: 'food_safety',
        sanitation: 'food_safety',
        preop: 'food_safety',
        allergen: 'food_safety',
        traceability: 'food_safety',
        // Purchasing
        purchasing: 'purchasing',
        // Tasks
        tasks: 'tasks',
        // Master Data
        masterdata: 'masterdata',
        // Analytics
        analytics: 'analytics',
        // Admin
        admin: 'admin'
    };
    return categoryMap[category] || 'general';
}

/**
 * Get category display label
 */
export function getCategoryLabel(category: PermissionCategory): { en: string; ar: string } {
    const labels: Record<PermissionCategory, { en: string; ar: string }> = {
        explorer: { en: 'File Explorer', ar: 'مستكشف الملفات' },
        quality: { en: 'Quality Management', ar: 'إدارة الجودة' },
        lab: { en: 'Laboratory', ar: 'المختبر' },
        production: { en: 'Production', ar: 'الإنتاج' },
        warehouse: { en: 'Warehouse & Receiving', ar: 'المستودعات والاستلام' },
        maintenance: { en: 'Maintenance', ar: 'الصيانة' },
        food_safety: { en: 'Food Safety / HACCP', ar: 'سلامة الغذاء' },
        purchasing: { en: 'Purchasing', ar: 'المشتريات' },
        tasks: { en: 'Tasks & Workflow', ar: 'المهام' },
        masterdata: { en: 'Master Data', ar: 'البيانات الرئيسية' },
        analytics: { en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
        admin: { en: 'Administration', ar: 'الإدارة' },
        general: { en: 'General', ar: 'عام' }
    };
    return labels[category];
}

/**
 * Get role display color
 */
export function getRoleColor(roleCode: string): string {
    const colors: Record<string, string> = {
        // System
        super_admin: '#DC2626',      // red-600
        admin: '#EA580C',            // orange-600

        // Quality (greens)
        quality_manager: '#16A34A',  // green-600
        qa_supervisor: '#22C55E',    // green-500
        qa_engineer: '#4ADE80',      // green-400
        qc_supervisor: '#86EFAC',    // green-300
        qc_inspector: '#BBF7D0',     // green-200

        // Lab (cyans)
        lab_manager: '#0891B2',      // cyan-600
        lab_supervisor: '#06B6D4',   // cyan-500
        lab_analyst: '#22D3EE',      // cyan-400
        lab_assistant: '#67E8F9',    // cyan-300

        // Production (ambers)
        production_manager: '#F59E0B', // amber-500
        production_supervisor: '#FBBF24', // amber-400
        line_leader: '#FCD34D',      // amber-300
        machine_operator: '#FDE68A', // amber-200
        production_worker: '#FEF3C7', // amber-100

        // Warehouse (purples)
        warehouse_manager: '#8B5CF6', // violet-500
        warehouse_supervisor: '#A78BFA', // violet-400
        warehouse_clerk: '#C4B5FD',  // violet-300
        receiver: '#DDD6FE',         // violet-200

        // Maintenance (pinks)
        maintenance_manager: '#EC4899', // pink-500
        maintenance_supervisor: '#F472B6', // pink-400
        maintenance_technician: '#F9A8D4', // pink-300
        electrician: '#FBCFE8',      // pink-200

        // Food Safety (reds)
        food_safety_manager: '#EF4444', // red-500
        haccp_coordinator: '#F87171', // red-400
        sanitation_supervisor: '#FCA5A5', // red-300

        // Purchasing (blues)
        purchasing_manager: '#3B82F6', // blue-500
        buyer: '#60A5FA',            // blue-400

        // HR (emeralds)
        hr_manager: '#10B981',       // emerald-500
        hr_officer: '#34D399',       // emerald-400

        // General (grays)
        department_head: '#6B7280',  // gray-500
        employee: '#9CA3AF',         // gray-400
        viewer: '#D1D5DB',           // gray-300

        // Legacy
        manager: '#CA8A04',
        qa_manager: '#16A34A',
        lab_tech: '#0891B2',
        user: '#2563EB'
    };
    return colors[roleCode] || '#6B7280';
}
