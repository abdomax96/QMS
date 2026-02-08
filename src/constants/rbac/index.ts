// ==================== RBAC Constants - Enterprise QMS/Manufacturing ====================
// Centralized export for all RBAC-related constants

// Export all permission-related constants
export {
  PERMISSION_ACTIONS,
  PERMISSION_HIERARCHY,
  DANGEROUS_PERMISSION_COMBINATIONS,
  PERMISSION_CATEGORIES,
  type PermissionCategory,
} from './permissions';

// Export all module-related constants
export {
  SYSTEM_MODULES,
  MODULE_GROUPS,
  MODULE_STATS,
} from './modules';

// Export all role-related constants (from new organized structure)
export {
  DEFAULT_SYSTEM_ROLES,
  ROLE_CATEGORY_COLORS,
  ROLE_CATEGORY_LABELS,
  ROLE_STATS,
  createFullPermissionMatrix,
  // Also export individual categories
  EXECUTIVE_ROLES,
  QUALITY_ROLES,
  LABORATORY_ROLES,
  SUPPORT_ROLES,
} from './roles/index';

// ==================== Combined Statistics ====================
import { MODULE_STATS } from './modules';
import { ROLE_STATS } from './roles/index';
import { PERMISSION_ACTIONS } from './permissions';

export const RBAC_STATISTICS = {
  modules: MODULE_STATS,
  roles: ROLE_STATS,
  permissions: {
    total: PERMISSION_ACTIONS.length,
    dangerous: PERMISSION_ACTIONS.filter(p => p.is_dangerous).length,
  },
  summary: {
    totalModules: MODULE_STATS.total,
    totalRoles: ROLE_STATS.total,
    totalPermissions: PERMISSION_ACTIONS.length,
    systemRoles: ROLE_STATS.systemRoles,
    lockedRoles: ROLE_STATS.lockedRoles,
  },
};

// ==================== Quick Reference ====================
// Use this for documentation and admin UI

export const RBAC_QUICK_REFERENCE = {
  permissionTypes: PERMISSION_ACTIONS.map(p => ({
    code: p.code,
    name: p.name,
    nameAr: p.name_ar,
    isDangerous: p.is_dangerous || false,
  })),
  moduleCategories: [
    { code: 'core_system', name: 'Core System', nameAr: 'النظام الأساسي' },
    { code: 'document_management', name: 'Document Management', nameAr: 'إدارة الوثائق' },
    { code: 'quality_management', name: 'Quality Management', nameAr: 'إدارة الجودة' },
    { code: 'training', name: 'Training & Competency', nameAr: 'التدريب والكفاءة' },
    { code: 'manufacturing', name: 'Manufacturing & Production', nameAr: 'التصنيع والإنتاج' },
    { code: 'maintenance', name: 'Equipment & Maintenance', nameAr: 'المعدات والصيانة' },
    { code: 'inventory', name: 'Inventory & Materials', nameAr: 'المخزون والمواد' },
    { code: 'supplier_management', name: 'Supplier Management', nameAr: 'إدارة الموردين' },
    { code: 'laboratory', name: 'Laboratory & Testing', nameAr: 'المختبر والفحص' },
    { code: 'food_safety', name: 'Food Safety & HACCP', nameAr: 'سلامة الغذاء' },
  ],
  roleCategories: [
    { code: 'executive', name: 'Executive & Management', nameAr: 'الإدارة التنفيذية' },
    { code: 'quality', name: 'Quality Assurance', nameAr: 'ضمان الجودة' },
    { code: 'production', name: 'Production / Manufacturing', nameAr: 'الإنتاج / التصنيع' },
    { code: 'maintenance', name: 'Maintenance & Engineering', nameAr: 'الصيانة والهندسة' },
    { code: 'supply_chain', name: 'Supply Chain & Logistics', nameAr: 'سلسلة التوريد' },
    { code: 'laboratory', name: 'Laboratory & Testing', nameAr: 'المختبر والفحص' },
    { code: 'support', name: 'Support & Administrative', nameAr: 'الدعم والإدارة' },
    { code: 'special', name: 'Special Access', nameAr: 'الوصول الخاص' },
  ],
};

