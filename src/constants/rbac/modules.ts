// ==================== System Modules ====================
// Active modules matching app_modules table.

export type PermissionAction = string;

export type ModuleCategory =
  | 'core_system'
  | 'quality_management';

export interface Module {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  category: ModuleCategory;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  is_department_scoped: boolean;
  available_permissions: PermissionAction[];
  description?: string;
}

export interface ModuleGroup {
  category: ModuleCategory;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  modules: Module[];
}

// ==================== Active System Modules (7) ====================
export const SYSTEM_MODULES: Module[] = [
  // Forms & Reports Module
  {
    id: 'mod_forms_reports',
    code: 'forms_reports',
    name: 'Forms & Reports',
    name_ar: 'النماذج والتقارير',
    category: 'core_system',
    icon: 'DocumentText',
    color: '#3B82F6',
    display_order: 1,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'],
    description: 'Forms, templates, and report management',
  },
  // Production Module
  {
    id: 'mod_production',
    code: 'production',
    name: 'Production',
    name_ar: 'الإنتاج',
    category: 'core_system',
    icon: 'Factory',
    color: '#B45309',
    display_order: 2,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'approve', 'export', 'attendance.capture', 'attendance.adjust', 'attendance.review'],
    description: 'Production batches and operational attendance capture',
  },
  // HR Module
  {
    id: 'mod_hr',
    code: 'hr',
    name: 'Human Resources',
    name_ar: 'الموارد البشرية',
    category: 'core_system',
    icon: 'Users',
    color: '#0F766E',
    display_order: 3,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'approve', 'export', 'print', 'configure', 'archive', 'calculate', 'close', 'publish'],
    description: 'Employees, transport, shifts, requests, penalties, and payroll',
  },
  // Tasks Module
  {
    id: 'mod_tasks',
    code: 'tasks',
    name: 'Tasks',
    name_ar: 'المهام',
    category: 'core_system',
    icon: 'CheckCircle',
    color: '#10B981',
    display_order: 4,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
    description: 'Task assignment and tracking',
  },
  // Laboratory Module
  {
    id: 'mod_lab',
    code: 'lab',
    name: 'Laboratory',
    name_ar: 'المختبر',
    category: 'quality_management',
    icon: 'Beaker',
    color: '#8B5CF6',
    display_order: 5,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'],
    description: 'Laboratory testing and material receiving',
  },
  // NCR & Holds Module
  {
    id: 'mod_ncr',
    code: 'ncr',
    name: 'NCR & Holds',
    name_ar: 'NCR والمحتجزات',
    category: 'quality_management',
    icon: 'ExclamationTriangle',
    color: '#EF4444',
    display_order: 6,
    is_active: true,
    is_department_scoped: true,
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'],
    description: 'Non-Conformance Reports and product holds',
  },
  // Settings Module
  {
    id: 'mod_settings',
    code: 'settings',
    name: 'Settings',
    name_ar: 'الإعدادات',
    category: 'core_system',
    icon: 'Cog',
    color: '#6B7280',
    display_order: 7,
    is_active: true,
    is_department_scoped: false,
    available_permissions: ['view', 'edit'],
    description: 'System configuration and settings',
  },
  // Audit Log Module
  {
    id: 'mod_audit',
    code: 'audit',
    name: 'Audit Log',
    name_ar: 'سجل المراجعة',
    category: 'core_system',
    icon: 'ClipboardList',
    color: '#8B5CF6',
    display_order: 8,
    is_active: true,
    is_department_scoped: false,
    available_permissions: ['view', 'export'],
    description: 'System audit trail and history',
  },
  // Access Management Module
  {
    id: 'mod_access_management',
    code: 'access_management',
    name: 'Access Management',
    name_ar: 'إدارة الصلاحيات',
    category: 'core_system',
    icon: 'ShieldCheck',
    color: '#6366F1',
    display_order: 9,
    is_active: true,
    is_department_scoped: false,
    available_permissions: ['view', 'edit'],
    description: 'Manage roles and permissions matrix',
  },
  // User Management Module
  {
    id: 'mod_users',
    code: 'users',
    name: 'User Management',
    name_ar: 'إدارة المستخدمين',
    category: 'core_system',
    icon: 'Users',
    color: '#3B82F6',
    display_order: 10,
    is_active: true,
    is_department_scoped: false,
    available_permissions: ['view', 'create', 'edit', 'delete'],
    description: 'User accounts and profiles',
  },
  // System Module - EXPLICIT admin permission
  // Required for admin-only operations instead of inferring from other permissions
  {
    id: 'mod_system',
    code: 'system',
    name: 'System Administration',
    name_ar: 'إدارة النظام',
    category: 'core_system',
    icon: 'Shield',
    color: '#DC2626',
    display_order: 11,
    is_active: true,
    is_department_scoped: false,
    available_permissions: ['admin', 'configure'],
    description: 'System-level administrative operations',
  },
];

// ==================== Module Groups ====================
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    category: 'core_system',
    name: 'Core System',
    name_ar: 'النظام الأساسي',
    icon: 'Monitor',
    color: '#3B82F6',
    modules: SYSTEM_MODULES.filter(m => m.category === 'core_system'),
  },
  {
    category: 'quality_management',
    name: 'Quality Management',
    name_ar: 'إدارة الجودة',
    icon: 'Shield',
    color: '#EF4444',
    modules: SYSTEM_MODULES.filter(m => m.category === 'quality_management'),
  },
];

// ==================== Statistics ====================
export const MODULE_STATS = {
  total: SYSTEM_MODULES.length,
  active: SYSTEM_MODULES.filter(m => m.is_active).length,
  departmentScoped: SYSTEM_MODULES.filter(m => m.is_department_scoped).length,
  byCategory: MODULE_GROUPS.reduce((acc, g) => {
    acc[g.category] = g.modules.length;
    return acc;
  }, {} as Record<string, number>),
};
