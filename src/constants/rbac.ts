// ==================== RBAC Constants & Default Data ====================
// Enterprise-Grade Role-Based Access Control for QMS/Manufacturing
//
// NOTE: This file re-exports from the new modular structure in ./rbac/
// The modular structure provides better organization for 60+ roles and 70+ modules

// Re-export everything from the new modular structure
export * from './rbac/index';

// Legacy imports for backwards compatibility
import type {
  Module,
  ModuleCategory,
  ModuleGroup,
  Permission,
  PermissionAction,
  PermissionHierarchy,
  Role,
  RoleCategory,
  RolePermissionMatrix
} from '../types/rbac';

// ==================== Permission Actions ====================
export const PERMISSION_ACTIONS: Permission[] = [
  {
    id: 'perm_view',
    code: 'view',
    name: 'View',
    name_ar: 'عرض',
    description: 'View and read data',
    description_ar: 'عرض وقراءة البيانات',
    action: 'view',
    display_order: 1,
  },
  {
    id: 'perm_create',
    code: 'create',
    name: 'Create',
    name_ar: 'إنشاء',
    description: 'Create new records',
    description_ar: 'إنشاء سجلات جديدة',
    action: 'create',
    display_order: 2,
    requires_permissions: ['view'],
  },
  {
    id: 'perm_edit',
    code: 'edit',
    name: 'Edit',
    name_ar: 'تعديل',
    description: 'Modify existing records',
    description_ar: 'تعديل السجلات الموجودة',
    action: 'edit',
    display_order: 3,
    requires_permissions: ['view', 'create'],
  },
  {
    id: 'perm_delete',
    code: 'delete',
    name: 'Delete',
    name_ar: 'حذف',
    description: 'Delete records permanently',
    description_ar: 'حذف السجلات نهائياً',
    action: 'delete',
    display_order: 4,
    requires_permissions: ['view', 'edit'],
    is_dangerous: true,
  },
  {
    id: 'perm_approve',
    code: 'approve',
    name: 'Approve',
    name_ar: 'موافقة',
    description: 'Approve submissions and changes',
    description_ar: 'الموافقة على الطلبات والتغييرات',
    action: 'approve',
    display_order: 5,
    requires_permissions: ['view'],
    is_dangerous: true,
  },
  {
    id: 'perm_export',
    code: 'export',
    name: 'Export',
    name_ar: 'تصدير',
    description: 'Export data to files',
    description_ar: 'تصدير البيانات إلى ملفات',
    action: 'export',
    display_order: 6,
    requires_permissions: ['view'],
  },
  {
    id: 'perm_archive',
    code: 'archive',
    name: 'Archive',
    name_ar: 'أرشفة',
    description: 'Archive records',
    description_ar: 'أرشفة السجلات',
    action: 'archive',
    display_order: 7,
    requires_permissions: ['view', 'edit'],
  },
];

// ==================== Permission Hierarchy ====================
export const PERMISSION_HIERARCHY: PermissionHierarchy[] = [
  { permission_code: 'view', requires_permissions: [] },
  { permission_code: 'create', requires_permissions: ['view'] },
  { permission_code: 'edit', requires_permissions: ['view', 'create'] },
  { permission_code: 'delete', requires_permissions: ['view', 'edit'] },
  { permission_code: 'archive', requires_permissions: ['view', 'edit'] },
  { permission_code: 'approve', requires_permissions: ['view'] },
  { permission_code: 'export', requires_permissions: ['view'] },
];

// ==================== System Modules ====================
// SIMPLIFIED: Only 7 active modules matching app_modules table and actual app usage
// Unused modules are deactivated in database, not defined here
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
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'],
    description: 'Forms, templates, and report management',
  },
  // Document Control Module
  {
    id: 'mod_documents',
    code: 'documents',
    name: 'Document Control',
    name_ar: 'التحكم بالوثائق',
    category: 'core_system',
    icon: 'BookOpen',
    color: '#3B82F6',
    display_order: 1,
    is_active: true,
    available_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'],
    description: 'SOPs, Work Instructions, and Manuals',
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
    display_order: 2,
    is_active: true,
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
    display_order: 3,
    is_active: true,
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
    display_order: 4,
    is_active: true,
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
    display_order: 5,
    is_active: true,
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
    display_order: 6,
    is_active: true,
    available_permissions: ['view', 'export'],
    description: 'System audit trail and history',
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
    display_order: 7,
    is_active: true,
    available_permissions: ['view', 'create', 'edit', 'delete'],
    description: 'User accounts and profiles',
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
    icon: 'Award',
    color: '#10B981',
    modules: SYSTEM_MODULES.filter(m => m.category === 'quality_management'),
  },
  {
    category: 'manufacturing',
    name: 'Manufacturing & Operations',
    name_ar: 'التصنيع والعمليات',
    icon: 'Factory',
    color: '#8B5CF6',
    modules: SYSTEM_MODULES.filter(m => m.category === 'manufacturing'),
  },
];

// ==================== Role Category Colors ====================
export const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
  executive: '#1E40AF',
  quality: '#047857',
  production: '#B45309',
  maintenance: '#7C3AED',
  supply_chain: '#0E7490',
  laboratory: '#BE185D',
  support: '#6B7280',
  special: '#DC2626',
};

// ==================== Role Category Labels ====================
export const ROLE_CATEGORY_LABELS: Record<RoleCategory, { en: string; ar: string }> = {
  executive: { en: 'Executive & Management', ar: 'الإدارة التنفيذية' },
  quality: { en: 'Quality Assurance', ar: 'ضمان الجودة' },
  production: { en: 'Production / Manufacturing', ar: 'الإنتاج / التصنيع' },
  maintenance: { en: 'Maintenance & Engineering', ar: 'الصيانة والهندسة' },
  supply_chain: { en: 'Supply Chain & Logistics', ar: 'سلسلة التوريد واللوجستيات' },
  laboratory: { en: 'Laboratory & Testing', ar: 'المختبر والفحص' },
  support: { en: 'Support & Administrative', ar: 'الدعم والإدارة' },
  special: { en: 'Special Access', ar: 'الوصول الخاص' },
};

// ==================== Helper Functions ====================
export const createDefaultPermissionGrant = (isGranted: boolean): {
  is_granted: boolean;
  state: 'granted' | 'denied';
} => ({
  is_granted: isGranted,
  state: isGranted ? 'granted' : 'denied',
});

export const createFullPermissionMatrix = (
  modules: Module[],
  defaultValue: boolean = false
): RolePermissionMatrix => {
  const matrix: RolePermissionMatrix = {};
  modules.forEach(module => {
    matrix[module.code] = {};
    module.available_permissions.forEach(action => {
      matrix[module.code][action] = {
        permission_id: `perm_${action}`,
        permission_code: action,
        is_granted: defaultValue,
        state: defaultValue ? 'granted' : 'denied',
      };
    });
  });
  return matrix;
};

// ==================== Default System Roles ====================
const createSystemAdmin = (): Role => ({
  id: 'role_system_admin',
  code: 'SYSTEM_ADMIN',
  name: 'System Administrator',
  name_ar: 'مدير النظام',
  description: 'Full system access with all permissions',
  description_ar: 'وصول كامل للنظام مع جميع الصلاحيات',
  category: 'executive',
  type: 'system',
  color: '#1E40AF',
  icon: 'ShieldCheck',
  priority: 1,
  is_system: true,
  is_locked: true,
  is_active: true,
  is_deprecated: false,
  min_edit_priority: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: createFullPermissionMatrix(SYSTEM_MODULES, true),
});

const createQualityDirector = (): Role => ({
  id: 'role_quality_director',
  code: 'QUALITY_DIRECTOR',
  name: 'Quality Director',
  name_ar: 'مدير الجودة',
  description: 'Quality department head with full QA/QC access',
  description_ar: 'رئيس قسم الجودة مع وصول كامل لضمان ومراقبة الجودة',
  category: 'executive',
  type: 'system',
  color: '#047857',
  icon: 'Award',
  priority: 5,
  is_system: true,
  is_locked: true,
  is_active: true,
  is_deprecated: false,
  department: 'Quality',
  department_ar: 'الجودة',
  min_edit_priority: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Full access to quality modules
    ['dashboard', 'documents', 'reports', 'folders', 'audit_logs', 'notifications',
      'capa', 'ncr', 'change_control', 'deviations', 'internal_audits',
      'supplier_quality', 'risk_management', 'training', 'lab_tests', 'tasks'].forEach(mod => {
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
    // View access to manufacturing
    ['production_orders', 'batch_records', 'haccp', 'sanitation', 'material_receiving',
      'raw_materials', 'finished_goods'].forEach(mod => {
        if (matrix[mod]) {
          matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
          matrix[mod]['export'] = { permission_id: 'perm_export', permission_code: 'export', is_granted: true, state: 'granted' };
        }
      });
    return matrix;
  })(),
  minimum_required_permissions: ['ncr.view', 'ncr.approve', 'capa.view', 'capa.approve'],
});

const createProductionManager = (): Role => ({
  id: 'role_production_manager',
  code: 'PRODUCTION_MANAGER',
  name: 'Production Manager',
  name_ar: 'مدير الإنتاج',
  description: 'Production department head with full manufacturing access',
  description_ar: 'رئيس قسم الإنتاج مع وصول كامل للتصنيع',
  category: 'executive',
  type: 'system',
  color: '#B45309',
  icon: 'Factory',
  priority: 5,
  is_system: true,
  is_locked: true,
  is_active: true,
  is_deprecated: false,
  department: 'Production',
  department_ar: 'الإنتاج',
  min_edit_priority: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Full access to manufacturing modules
    ['dashboard', 'documents', 'reports', 'folders', 'notifications',
      'production_orders', 'batch_records', 'equipment', 'inventory',
      'raw_materials', 'material_receiving', 'finished_goods', 'work_orders',
      'line_clearance', 'scheduling', 'haccp', 'sanitation', 'recipes', 'tasks'].forEach(mod => {
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
    // View access to quality modules
    ['ncr', 'capa', 'deviations'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
  minimum_required_permissions: ['production_orders.view', 'batch_records.view'],
});

// Generate more roles following the pattern...
const createQAInspector = (): Role => ({
  id: 'role_qa_inspector',
  code: 'QA_INSPECTOR',
  name: 'QA Inspector',
  name_ar: 'مفتش الجودة',
  description: 'Quality inspection and NCR creation',
  description_ar: 'فحص الجودة وإنشاء تقارير عدم المطابقة',
  category: 'quality',
  type: 'system',
  color: '#059669',
  icon: 'Search',
  priority: 30,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Quality',
  department_ar: 'الجودة',
  min_edit_priority: 20,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Inspection permissions
    ['dashboard', 'ncr', 'deviations', 'lab_tests', 'haccp', 'sanitation'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
      }
    });
    // View only
    ['documents', 'reports', 'batch_records', 'material_receiving'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
});

const createProductionOperator = (): Role => ({
  id: 'role_production_operator',
  code: 'PRODUCTION_OPERATOR',
  name: 'Production Operator',
  name_ar: 'مشغل الإنتاج',
  description: 'Production line operation and data entry',
  description_ar: 'تشغيل خط الإنتاج وإدخال البيانات',
  category: 'production',
  type: 'system',
  color: '#D97706',
  icon: 'Cog',
  priority: 40,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Production',
  department_ar: 'الإنتاج',
  min_edit_priority: 30,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Data entry permissions
    ['batch_records', 'line_clearance', 'haccp', 'sanitation'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
      }
    });
    // View only
    ['dashboard', 'production_orders', 'work_orders', 'recipes'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    // NCR creation only
    if (matrix['ncr']) {
      matrix['ncr']['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      matrix['ncr']['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
    }
    return matrix;
  })(),
});

const createViewer = (): Role => ({
  id: 'role_viewer',
  code: 'VIEWER',
  name: 'Viewer',
  name_ar: 'مشاهد',
  description: 'Read-only access across all modules',
  description_ar: 'وصول للقراءة فقط عبر جميع الوحدات',
  category: 'support',
  type: 'system',
  color: '#6B7280',
  icon: 'Eye',
  priority: 100,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  min_edit_priority: 50,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // View only for all modules
    Object.keys(matrix).forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    // No access to sensitive modules
    ['roles', 'users', 'settings'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: false, state: 'denied' };
      }
    });
    return matrix;
  })(),
});

const createExternalAuditor = (): Role => ({
  id: 'role_external_auditor',
  code: 'EXTERNAL_AUDITOR',
  name: 'External Auditor',
  name_ar: 'مدقق خارجي',
  description: 'Read-only access for external audits',
  description_ar: 'وصول للقراءة فقط للمراجعات الخارجية',
  category: 'special',
  type: 'system',
  color: '#7C3AED',
  icon: 'UserCheck',
  priority: 90,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  min_edit_priority: 50,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // View + Export for audit-relevant modules
    ['documents', 'reports', 'audit_logs', 'capa', 'ncr', 'change_control',
      'deviations', 'internal_audits', 'training', 'batch_records', 'haccp'].forEach(mod => {
        if (matrix[mod]) {
          matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
          matrix[mod]['export'] = { permission_id: 'perm_export', permission_code: 'export', is_granted: true, state: 'granted' };
        }
      });
    return matrix;
  })(),
});

const createMaintenanceTechnician = (): Role => ({
  id: 'role_maintenance_tech',
  code: 'MAINTENANCE_TECHNICIAN',
  name: 'Maintenance Technician',
  name_ar: 'فني الصيانة',
  description: 'Equipment maintenance and calibration',
  description_ar: 'صيانة المعدات والمعايرة',
  category: 'maintenance',
  type: 'system',
  color: '#7C3AED',
  icon: 'Wrench',
  priority: 35,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Maintenance',
  department_ar: 'الصيانة',
  min_edit_priority: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Maintenance permissions
    ['equipment', 'calibration'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
      }
    });
    // View only
    ['dashboard', 'work_orders', 'tasks'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
});

const createWarehouseOperator = (): Role => ({
  id: 'role_warehouse_operator',
  code: 'WAREHOUSE_OPERATOR',
  name: 'Warehouse Operator',
  name_ar: 'مشغل المستودع',
  description: 'Inventory and material management',
  description_ar: 'إدارة المخزون والمواد',
  category: 'supply_chain',
  type: 'system',
  color: '#0E7490',
  icon: 'Warehouse',
  priority: 40,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Warehouse',
  department_ar: 'المستودع',
  min_edit_priority: 30,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Warehouse permissions
    ['inventory', 'raw_materials', 'material_receiving', 'finished_goods'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
      }
    });
    // View only
    ['dashboard', 'production_orders'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
});

const createLabAnalyst = (): Role => ({
  id: 'role_lab_analyst',
  code: 'LAB_ANALYST',
  name: 'Lab Analyst',
  name_ar: 'محلل مختبر',
  description: 'Laboratory testing and analysis',
  description_ar: 'الاختبارات والتحليل المعملي',
  category: 'laboratory',
  type: 'system',
  color: '#BE185D',
  icon: 'FlaskConical',
  priority: 35,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Laboratory',
  department_ar: 'المختبر',
  min_edit_priority: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Lab permissions
    ['lab_tests'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
        matrix[mod]['export'] = { permission_id: 'perm_export', permission_code: 'export', is_granted: true, state: 'granted' };
      }
    });
    // View/Create for related
    ['material_receiving', 'raw_materials'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    // NCR
    if (matrix['ncr']) {
      matrix['ncr']['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      matrix['ncr']['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
    }
    return matrix;
  })(),
});

const createDocumentController = (): Role => ({
  id: 'role_document_controller',
  code: 'DOCUMENT_CONTROLLER',
  name: 'Document Controller',
  name_ar: 'مسؤول الوثائق',
  description: 'Document management and control',
  description_ar: 'إدارة الوثائق والتحكم فيها',
  category: 'support',
  type: 'system',
  color: '#6B7280',
  icon: 'FileStack',
  priority: 25,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  department: 'Quality',
  department_ar: 'الجودة',
  min_edit_priority: 20,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Document permissions
    ['documents', 'folders', 'reports'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['create'] = { permission_id: 'perm_create', permission_code: 'create', is_granted: true, state: 'granted' };
        matrix[mod]['edit'] = { permission_id: 'perm_edit', permission_code: 'edit', is_granted: true, state: 'granted' };
        matrix[mod]['archive'] = { permission_id: 'perm_archive', permission_code: 'archive', is_granted: true, state: 'granted' };
        matrix[mod]['export'] = { permission_id: 'perm_export', permission_code: 'export', is_granted: true, state: 'granted' };
      }
    });
    // View all modules for reference
    Object.keys(matrix).forEach(mod => {
      if (!['roles', 'users', 'settings'].includes(mod)) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
});

const createQualityApprover = (): Role => ({
  id: 'role_quality_approver',
  code: 'QUALITY_APPROVER',
  name: 'Quality Approver',
  name_ar: 'معتمد الجودة',
  description: 'Quality approval authority',
  description_ar: 'صلاحية اعتماد الجودة',
  category: 'special',
  type: 'system',
  color: '#047857',
  icon: 'BadgeCheck',
  priority: 15,
  is_system: true,
  is_locked: false,
  is_active: true,
  is_deprecated: false,
  min_edit_priority: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: (() => {
    const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
    // Approval permissions for quality modules
    ['ncr', 'capa', 'change_control', 'deviations', 'lab_tests', 'batch_records', 'material_receiving'].forEach(mod => {
      if (matrix[mod]) {
        matrix[mod]['view'] = { permission_id: 'perm_view', permission_code: 'view', is_granted: true, state: 'granted' };
        matrix[mod]['approve'] = { permission_id: 'perm_approve', permission_code: 'approve', is_granted: true, state: 'granted' };
      }
    });
    return matrix;
  })(),
});

const createEmergencyAccess = (): Role => ({
  id: 'role_emergency_access',
  code: 'EMERGENCY_ACCESS',
  name: 'Emergency Access',
  name_ar: 'وصول الطوارئ',
  description: 'Break-glass emergency access role',
  description_ar: 'دور الوصول الطارئ (كسر الزجاج)',
  category: 'special',
  type: 'system',
  color: '#DC2626',
  icon: 'AlertOctagon',
  priority: 2,
  is_system: true,
  is_locked: true,
  is_active: true,
  is_deprecated: false,
  min_edit_priority: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  permissions: createFullPermissionMatrix(SYSTEM_MODULES, true),
});

// ==================== Export Default Roles ====================
export const DEFAULT_SYSTEM_ROLES: Role[] = [
  createSystemAdmin(),
  createQualityDirector(),
  createProductionManager(),
  createQAInspector(),
  createProductionOperator(),
  createViewer(),
  createExternalAuditor(),
  createMaintenanceTechnician(),
  createWarehouseOperator(),
  createLabAnalyst(),
  createDocumentController(),
  createQualityApprover(),
  createEmergencyAccess(),
];

// ==================== Permission Validation Rules ====================
export const DANGEROUS_PERMISSION_COMBINATIONS = [
  {
    module: 'audit_logs',
    action: 'delete' as PermissionAction,
    warning: 'Deleting audit logs violates compliance requirements',
    risk: 'critical',
  },
  {
    module: 'roles',
    action: 'edit' as PermissionAction,
    warning: 'Editing roles requires elevated privileges',
    risk: 'high',
  },
  {
    module: 'users',
    action: 'delete' as PermissionAction,
    warning: 'Deleting users may affect audit trails',
    risk: 'high',
  },
];

