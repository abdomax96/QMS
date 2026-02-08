// ==================== Enterprise Role Definitions ====================
// Complete Factory Role Coverage for QMS/Manufacturing

import type { Role, RoleCategory, RolePermissionMatrix, PermissionAction } from '../../types/rbac';
import { SYSTEM_MODULES } from './modules';

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

const grantPermissions = (
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

const grantAllPermissions = (
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

// ==================== DEFAULT SYSTEM ROLES ====================
// Organized by category for enterprise manufacturing

export const DEFAULT_SYSTEM_ROLES: Role[] = [
  // ========== EXECUTIVE & STRATEGIC MANAGEMENT ==========
  {
    id: 'role_system_admin',
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    name_ar: 'مدير النظام',
    description: 'Full system access with all permissions. Super-user role.',
    description_ar: 'وصول كامل للنظام مع جميع الصلاحيات. دور المسؤول الأعلى.',
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
  },
  {
    id: 'role_quality_director',
    code: 'QUALITY_DIRECTOR',
    name: 'Quality Director',
    name_ar: 'مدير الجودة',
    description: 'VP Quality / Quality Director with full QA/QC access and approval authority.',
    description_ar: 'نائب رئيس الجودة / مدير الجودة مع وصول كامل لضمان ومراقبة الجودة.',
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
      // Full access to quality, documents, training, lab
      grantAllPermissions(matrix, [
        'dashboard', 'search', 'notifications', 'audit_logs', 'help',
        'documents', 'folders', 'forms', 'sops', 'document_workflows', 'electronic_signatures', 'reports',
        'ncr', 'capa', 'deviations', 'change_control', 'risk_management',
        'internal_audits', 'external_audits', 'management_review', 'complaints', 'product_recalls', 'rca',
        'training', 'training_courses', 'competency', 'training_matrix',
        'lab_tests', 'test_methods', 'coa', 'oos', 'stability', 'lab_equipment', 'reference_standards',
        'supplier_qualification', 'supplier_performance', 'supplier_audits', 'supplier_capa',
        'tasks',
      ]);
      // View + export for manufacturing
      grantPermissions(matrix, [
        'production_orders', 'batch_records', 'line_clearance', 'in_process_inspection',
        'haccp', 'haccp_monitoring', 'sanitation', 'allergen', 'pre_op', 'temperature',
        'material_receiving', 'raw_materials', 'finished_goods', 'quarantine',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
    minimum_required_permissions: ['ncr.view', 'ncr.approve', 'capa.view', 'capa.approve'],
  },
  {
    id: 'role_plant_manager',
    code: 'PLANT_MANAGER',
    name: 'Plant Manager',
    name_ar: 'مدير المصنع',
    description: 'Operations Director / Plant Manager with oversight of all manufacturing operations.',
    description_ar: 'مدير العمليات / مدير المصنع مع الإشراف على جميع عمليات التصنيع.',
    category: 'executive',
    type: 'system',
    color: '#1E40AF',
    icon: 'Factory',
    priority: 5,
    is_system: true,
    is_locked: true,
    is_active: true,
    is_deprecated: false,
    department: 'Operations',
    department_ar: 'العمليات',
    min_edit_priority: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      // Full access to core, manufacturing, maintenance
      grantAllPermissions(matrix, [
        'dashboard', 'search', 'notifications', 'help', 'reports',
        'production_orders', 'batch_records', 'bom', 'scheduling', 'line_clearance',
        'work_orders', 'in_process_inspection', 'rework', 'downtime', 'yield', 'recipes',
        'equipment', 'preventive_maintenance', 'maintenance_work_orders',
        'raw_materials', 'material_receiving', 'inventory', 'wip', 'finished_goods',
        'haccp', 'haccp_monitoring', 'sanitation', 'allergen', 'pre_op', 'temperature',
        'tasks',
      ]);
      // View + approve for quality
      grantPermissions(matrix, [
        'ncr', 'capa', 'deviations', 'change_control',
        'lab_tests', 'coa', 'oos',
        'training', 'competency',
      ], ['view', 'approve', 'export', 'print']);
      // View audit logs
      grantPermissions(matrix, ['audit_logs'], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_manufacturing_director',
    code: 'MANUFACTURING_DIRECTOR',
    name: 'Manufacturing Director',
    name_ar: 'مدير التصنيع',
    description: 'Senior manufacturing leadership with production approval authority.',
    description_ar: 'قيادة تصنيع عليا مع صلاحية الموافقة على الإنتاج.',
    category: 'executive',
    type: 'system',
    color: '#B45309',
    icon: 'Factory',
    priority: 7,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Manufacturing',
    department_ar: 'التصنيع',
    min_edit_priority: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'search', 'notifications', 'reports',
        'production_orders', 'batch_records', 'bom', 'scheduling', 'line_clearance',
        'work_orders', 'in_process_inspection', 'rework', 'downtime', 'yield', 'recipes',
        'tasks',
      ]);
      grantPermissions(matrix, [
        'equipment', 'preventive_maintenance', 'maintenance_work_orders',
        'inventory', 'material_receiving', 'finished_goods',
        'ncr', 'deviations', 'training',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_compliance_officer',
    code: 'COMPLIANCE_OFFICER',
    name: 'Compliance Officer',
    name_ar: 'مسؤول الامتثال',
    description: 'Regulatory Affairs Manager ensuring compliance with FDA, ISO, FSSC requirements.',
    description_ar: 'مدير الشؤون التنظيمية لضمان الامتثال لمتطلبات FDA و ISO و FSSC.',
    category: 'executive',
    type: 'system',
    color: '#7C3AED',
    icon: 'Scale',
    priority: 10,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Quality',
    department_ar: 'الجودة',
    min_edit_priority: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      // Full access to compliance-related modules
      grantAllPermissions(matrix, [
        'dashboard', 'audit_logs', 'reports',
        'documents', 'sops', 'document_workflows', 'electronic_signatures',
        'internal_audits', 'external_audits', 'management_review',
        'change_control', 'risk_management',
        'training', 'competency', 'training_matrix',
      ]);
      // View + export for everything else
      grantPermissions(matrix, Object.keys(matrix), ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_ehs_manager',
    code: 'EHS_MANAGER',
    name: 'EHS Manager',
    name_ar: 'مدير السلامة والصحة والبيئة',
    description: 'Environmental, Health & Safety Manager.',
    description_ar: 'مدير السلامة والصحة المهنية والبيئة.',
    category: 'executive',
    type: 'system',
    color: '#059669',
    icon: 'Shield',
    priority: 12,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'EHS',
    department_ar: 'السلامة',
    min_edit_priority: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'haccp', 'haccp_monitoring', 'sanitation', 'allergen', 'pre_op', 'temperature',
        'training', 'training_courses', 'competency',
        'ncr', 'capa', 'deviations',
        'equipment_cleaning', 'equipment_failures',
      ]);
      grantPermissions(matrix, ['documents', 'sops', 'audit_logs'], ['view', 'export', 'print']);
      return matrix;
    })(),
  },

  // ========== QUALITY ASSURANCE DEPARTMENT ==========
  {
    id: 'role_qa_manager',
    code: 'QA_MANAGER',
    name: 'QA Manager',
    name_ar: 'مدير ضمان الجودة',
    description: 'Quality Assurance Manager with department-level authority.',
    description_ar: 'مدير ضمان الجودة مع صلاحيات على مستوى القسم.',
    category: 'quality',
    type: 'system',
    color: '#047857',
    icon: 'Award',
    priority: 15,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Quality',
    department_ar: 'الجودة',
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'notifications', 'reports', 'tasks',
        'documents', 'folders', 'forms', 'sops',
        'ncr', 'capa', 'deviations', 'change_control', 'risk_management',
        'internal_audits', 'complaints', 'rca',
        'training', 'competency',
        'supplier_qualification', 'supplier_audits', 'supplier_capa',
        'lab_tests', 'coa', 'oos',
      ]);
      grantPermissions(matrix, [
        'batch_records', 'in_process_inspection', 'material_receiving', 'quarantine',
        'haccp', 'sanitation', 'allergen',
      ], ['view', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_qa_supervisor',
    code: 'QA_SUPERVISOR',
    name: 'QA Supervisor',
    name_ar: 'مشرف ضمان الجودة',
    description: 'Quality Assurance Supervisor / QA Lead.',
    description_ar: 'مشرف ضمان الجودة / قائد فريق الجودة.',
    category: 'quality',
    type: 'system',
    color: '#059669',
    icon: 'UserCheck',
    priority: 20,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Quality',
    department_ar: 'الجودة',
    min_edit_priority: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'reports', 'tasks',
        'documents', 'forms',
        'ncr', 'capa', 'deviations', 'complaints', 'rca',
        'training',
        'lab_tests', 'coa', 'oos',
        'supplier_audits',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print', 'reassign']);
      grantPermissions(matrix, [
        'batch_records', 'in_process_inspection', 'material_receiving',
        'haccp_monitoring', 'sanitation', 'pre_op',
      ], ['view', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_qa_inspector',
    code: 'QA_INSPECTOR',
    name: 'QA Inspector',
    name_ar: 'مفتش الجودة',
    description: 'Quality Inspector performing inspections and creating NCRs.',
    description_ar: 'مفتش الجودة يقوم بالفحوصات وإنشاء تقارير عدم المطابقة.',
    category: 'quality',
    type: 'system',
    color: '#10B981',
    icon: 'Search',
    priority: 30,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Quality',
    department_ar: 'الجودة',
    min_edit_priority: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'tasks',
        'ncr', 'deviations',
        'in_process_inspection',
        'haccp_monitoring', 'sanitation', 'pre_op', 'temperature',
        'material_receiving',
      ], ['view', 'create', 'edit', 'export', 'print']);
      grantPermissions(matrix, [
        'documents', 'forms', 'sops',
        'batch_records', 'production_orders',
        'lab_tests', 'coa',
        'raw_materials', 'finished_goods',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_document_controller',
    code: 'DOCUMENT_CONTROLLER',
    name: 'Document Controller',
    name_ar: 'مسؤول الوثائق',
    description: 'Document Control Specialist managing document lifecycle.',
    description_ar: 'أخصائي التحكم في الوثائق يدير دورة حياة الوثائق.',
    category: 'quality',
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
      grantAllPermissions(matrix, [
        'documents', 'folders', 'forms', 'sops', 'document_workflows', 'reports',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'tasks', 'help',
        'training_courses',
      ], ['view', 'create', 'edit', 'export', 'print']);
      // View everything for document control context
      grantPermissions(matrix, Object.keys(matrix), ['view']);
      return matrix;
    })(),
  },
  {
    id: 'role_internal_auditor',
    code: 'INTERNAL_AUDITOR',
    name: 'Internal Auditor',
    name_ar: 'مدقق داخلي',
    description: 'Internal Auditor conducting quality system audits.',
    description_ar: 'مدقق داخلي يجري عمليات تدقيق نظام الجودة.',
    category: 'quality',
    type: 'system',
    color: '#8B5CF6',
    icon: 'ClipboardCheck',
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
      grantAllPermissions(matrix, [
        'internal_audits', 'external_audits', 'supplier_audits',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'ncr', 'capa', 'deviations', 'complaints', 'rca',
        'documents', 'sops', 'forms',
        'training', 'competency',
        'haccp', 'sanitation',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_capa_coordinator',
    code: 'CAPA_COORDINATOR',
    name: 'CAPA Coordinator',
    name_ar: 'منسق الإجراءات التصحيحية',
    description: 'CAPA Coordinator managing corrective and preventive actions.',
    description_ar: 'منسق الإجراءات التصحيحية والوقائية.',
    category: 'quality',
    type: 'system',
    color: '#EF4444',
    icon: 'AlertTriangle',
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
      grantAllPermissions(matrix, [
        'capa', 'rca',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'reports', 'tasks',
        'ncr', 'deviations', 'complaints', 'change_control',
        'documents', 'forms',
        'supplier_capa',
      ], ['view', 'create', 'edit', 'export', 'print', 'reassign']);
      return matrix;
    })(),
  },

  // ========== PRODUCTION / MANUFACTURING ==========
  {
    id: 'role_production_manager',
    code: 'PRODUCTION_MANAGER',
    name: 'Production Manager',
    name_ar: 'مدير الإنتاج',
    description: 'Production Manager with full manufacturing operations authority.',
    description_ar: 'مدير الإنتاج مع صلاحيات كاملة على عمليات التصنيع.',
    category: 'production',
    type: 'system',
    color: '#B45309',
    icon: 'Factory',
    priority: 15,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Production',
    department_ar: 'الإنتاج',
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'notifications', 'reports', 'tasks',
        'production_orders', 'batch_records', 'bom', 'scheduling', 'line_clearance',
        'work_orders', 'in_process_inspection', 'rework', 'downtime', 'yield', 'recipes',
        'haccp_monitoring', 'sanitation', 'pre_op', 'temperature',
      ]);
      grantPermissions(matrix, [
        'equipment', 'preventive_maintenance', 'maintenance_work_orders',
        'raw_materials', 'material_receiving', 'inventory', 'wip', 'finished_goods',
        'ncr', 'deviations',
        'training',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_production_supervisor',
    code: 'PRODUCTION_SUPERVISOR',
    name: 'Production Supervisor',
    name_ar: 'مشرف الإنتاج',
    description: 'Shift Supervisor overseeing production line operations.',
    description_ar: 'مشرف الوردية يشرف على عمليات خط الإنتاج.',
    category: 'production',
    type: 'system',
    color: '#D97706',
    icon: 'Users',
    priority: 25,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Production',
    department_ar: 'الإنتاج',
    min_edit_priority: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'tasks',
        'production_orders', 'batch_records', 'scheduling', 'line_clearance',
        'work_orders', 'in_process_inspection', 'rework', 'downtime',
        'haccp_monitoring', 'sanitation', 'pre_op', 'temperature',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print', 'sign']);
      grantPermissions(matrix, [
        'bom', 'recipes', 'yield',
        'raw_materials', 'inventory', 'wip',
        'equipment', 'maintenance_work_orders',
        'ncr', 'deviations',
      ], ['view', 'create', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_production_lead',
    code: 'PRODUCTION_LEAD',
    name: 'Production Lead',
    name_ar: 'قائد فريق الإنتاج',
    description: 'Team Leader coordinating production line workers.',
    description_ar: 'قائد الفريق ينسق عمال خط الإنتاج.',
    category: 'production',
    type: 'system',
    color: '#F59E0B',
    icon: 'User',
    priority: 35,
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
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'tasks',
        'batch_records', 'line_clearance', 'work_orders',
        'haccp_monitoring', 'sanitation', 'pre_op', 'temperature',
      ], ['view', 'create', 'edit', 'sign']);
      grantPermissions(matrix, [
        'production_orders', 'scheduling', 'recipes',
        'in_process_inspection', 'downtime',
        'raw_materials', 'inventory',
        'ncr',
      ], ['view', 'create']);
      return matrix;
    })(),
  },
  {
    id: 'role_production_operator',
    code: 'PRODUCTION_OPERATOR',
    name: 'Production Operator',
    name_ar: 'مشغل الإنتاج',
    description: 'Manufacturing Technician / Line Operator performing production tasks.',
    description_ar: 'فني تصنيع / مشغل خط يؤدي مهام الإنتاج.',
    category: 'production',
    type: 'system',
    color: '#FBBF24',
    icon: 'Cog',
    priority: 45,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Production',
    department_ar: 'الإنتاج',
    min_edit_priority: 40,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'tasks',
        'batch_records', 'line_clearance',
        'haccp_monitoring', 'sanitation', 'pre_op', 'temperature',
      ], ['view', 'create', 'edit']);
      grantPermissions(matrix, [
        'production_orders', 'work_orders', 'recipes',
        'ncr',
        'forms',
      ], ['view', 'create']);
      return matrix;
    })(),
  },
  {
    id: 'role_batch_record_reviewer',
    code: 'BATCH_RECORD_REVIEWER',
    name: 'Batch Record Reviewer',
    name_ar: 'مراجع سجلات الدفعات',
    description: 'Reviews and approves batch manufacturing records.',
    description_ar: 'مراجعة واعتماد سجلات تصنيع الدفعات.',
    category: 'production',
    type: 'system',
    color: '#047857',
    icon: 'FileCheck',
    priority: 22,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Production',
    department_ar: 'الإنتاج',
    min_edit_priority: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'batch_records',
      ], ['view', 'edit', 'approve', 'export', 'print', 'sign', 'release']);
      grantPermissions(matrix, [
        'production_orders', 'line_clearance', 'in_process_inspection',
        'lab_tests', 'coa',
        'ncr', 'deviations', 'rework',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_production_planner',
    code: 'PRODUCTION_PLANNER',
    name: 'Production Planner',
    name_ar: 'مخطط الإنتاج',
    description: 'Production Scheduler managing production plans.',
    description_ar: 'مخطط الإنتاج يدير خطط الإنتاج.',
    category: 'production',
    type: 'system',
    color: '#3B82F6',
    icon: 'Calendar',
    priority: 28,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Production',
    department_ar: 'الإنتاج',
    min_edit_priority: 23,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, ['scheduling']);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'production_orders', 'bom', 'work_orders',
      ], ['view', 'create', 'edit', 'export', 'print']);
      grantPermissions(matrix, [
        'inventory', 'raw_materials', 'finished_goods',
        'equipment', 'preventive_maintenance',
        'recipes',
      ], ['view', 'export']);
      return matrix;
    })(),
  },

  // ========== MAINTENANCE & ENGINEERING ==========
  {
    id: 'role_maintenance_manager',
    code: 'MAINTENANCE_MANAGER',
    name: 'Maintenance Manager',
    name_ar: 'مدير الصيانة',
    description: 'Maintenance department head with full equipment authority.',
    description_ar: 'رئيس قسم الصيانة مع صلاحيات كاملة على المعدات.',
    category: 'maintenance',
    type: 'system',
    color: '#7C3AED',
    icon: 'Wrench',
    priority: 15,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Maintenance',
    department_ar: 'الصيانة',
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'equipment', 'preventive_maintenance', 'maintenance_work_orders',
        'calibration', 'equipment_qualification', 'equipment_cleaning', 'equipment_failures',
      ]);
      grantPermissions(matrix, [
        'training', 'competency',
        'ncr', 'capa', 'deviations',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      grantPermissions(matrix, [
        'production_orders', 'scheduling', 'downtime',
        'inventory',
      ], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_maintenance_supervisor',
    code: 'MAINTENANCE_SUPERVISOR',
    name: 'Maintenance Supervisor',
    name_ar: 'مشرف الصيانة',
    description: 'Maintenance team supervisor coordinating work orders.',
    description_ar: 'مشرف فريق الصيانة ينسق أوامر العمل.',
    category: 'maintenance',
    type: 'system',
    color: '#8B5CF6',
    icon: 'UserCog',
    priority: 25,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Maintenance',
    department_ar: 'الصيانة',
    min_edit_priority: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'equipment', 'preventive_maintenance', 'maintenance_work_orders',
        'calibration', 'equipment_cleaning', 'equipment_failures',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print', 'reassign']);
      grantPermissions(matrix, [
        'equipment_qualification',
        'training',
        'ncr', 'deviations',
        'downtime',
      ], ['view', 'create', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_maintenance_technician',
    code: 'MAINTENANCE_TECHNICIAN',
    name: 'Maintenance Technician',
    name_ar: 'فني الصيانة',
    description: 'Technician performing equipment maintenance and repairs.',
    description_ar: 'فني يؤدي صيانة وإصلاح المعدات.',
    category: 'maintenance',
    type: 'system',
    color: '#A78BFA',
    icon: 'Wrench',
    priority: 40,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Maintenance',
    department_ar: 'الصيانة',
    min_edit_priority: 35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'maintenance_work_orders', 'equipment_cleaning', 'equipment_failures',
        'preventive_maintenance',
      ], ['view', 'create', 'edit']);
      grantPermissions(matrix, [
        'equipment', 'calibration',
      ], ['view']);
      return matrix;
    })(),
  },
  {
    id: 'role_calibration_technician',
    code: 'CALIBRATION_TECHNICIAN',
    name: 'Calibration Technician',
    name_ar: 'فني المعايرة',
    description: 'Specialist performing equipment calibration.',
    description_ar: 'أخصائي يؤدي معايرة المعدات.',
    category: 'maintenance',
    type: 'system',
    color: '#6366F1',
    icon: 'Ruler',
    priority: 35,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Maintenance',
    department_ar: 'الصيانة',
    min_edit_priority: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, ['calibration']);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'equipment', 'lab_equipment', 'reference_standards',
      ], ['view', 'create', 'edit', 'export', 'print']);
      return matrix;
    })(),
  },

  // ========== SUPPLY CHAIN & WAREHOUSE ==========
  {
    id: 'role_supply_chain_manager',
    code: 'SUPPLY_CHAIN_MANAGER',
    name: 'Supply Chain Manager',
    name_ar: 'مدير سلسلة التوريد',
    description: 'Supply Chain Manager overseeing procurement and logistics.',
    description_ar: 'مدير سلسلة التوريد يشرف على المشتريات واللوجستيات.',
    category: 'supply_chain',
    type: 'system',
    color: '#0E7490',
    icon: 'Truck',
    priority: 15,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Supply Chain',
    department_ar: 'سلسلة التوريد',
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'suppliers', 'supplier_qualification', 'supplier_performance', 'supplier_audits',
        'raw_materials', 'material_receiving', 'inventory', 'finished_goods',
        'lot_traceability', 'quarantine', 'expiry',
      ]);
      grantPermissions(matrix, [
        'production_orders', 'scheduling',
        'lab_tests', 'coa',
        'ncr',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_warehouse_manager',
    code: 'WAREHOUSE_MANAGER',
    name: 'Warehouse Manager',
    name_ar: 'مدير المستودع',
    description: 'Warehouse Manager with full inventory authority.',
    description_ar: 'مدير المستودع مع صلاحيات كاملة على المخزون.',
    category: 'supply_chain',
    type: 'system',
    color: '#06B6D4',
    icon: 'Warehouse',
    priority: 20,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Warehouse',
    department_ar: 'المستودع',
    min_edit_priority: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'raw_materials', 'material_receiving', 'inventory', 'wip', 'finished_goods',
        'lot_traceability', 'quarantine', 'expiry',
      ]);
      grantPermissions(matrix, [
        'suppliers',
        'production_orders',
        'lab_tests',
      ], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_warehouse_supervisor',
    code: 'WAREHOUSE_SUPERVISOR',
    name: 'Warehouse Supervisor',
    name_ar: 'مشرف المستودع',
    description: 'Warehouse Supervisor coordinating material handling.',
    description_ar: 'مشرف المستودع ينسق مناولة المواد.',
    category: 'supply_chain',
    type: 'system',
    color: '#0891B2',
    icon: 'ClipboardList',
    priority: 30,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Warehouse',
    department_ar: 'المستودع',
    min_edit_priority: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'material_receiving', 'inventory', 'wip', 'finished_goods',
        'lot_traceability', 'quarantine', 'expiry',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print', 'release']);
      grantPermissions(matrix, [
        'raw_materials', 'suppliers',
        'production_orders',
      ], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_warehouse_operator',
    code: 'WAREHOUSE_OPERATOR',
    name: 'Warehouse Operator',
    name_ar: 'مشغل المستودع',
    description: 'Material Handler performing warehouse operations.',
    description_ar: 'معالج المواد يؤدي عمليات المستودع.',
    category: 'supply_chain',
    type: 'system',
    color: '#22D3EE',
    icon: 'Package',
    priority: 45,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Warehouse',
    department_ar: 'المستودع',
    min_edit_priority: 40,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'material_receiving', 'inventory',
        'lot_traceability',
      ], ['view', 'create', 'edit']);
      grantPermissions(matrix, [
        'raw_materials', 'finished_goods',
        'production_orders',
      ], ['view']);
      return matrix;
    })(),
  },
  {
    id: 'role_procurement_officer',
    code: 'PROCUREMENT_OFFICER',
    name: 'Procurement Officer',
    name_ar: 'مسؤول المشتريات',
    description: 'Buyer managing supplier relationships and purchases.',
    description_ar: 'مشتري يدير علاقات الموردين والمشتريات.',
    category: 'supply_chain',
    type: 'system',
    color: '#14B8A6',
    icon: 'ShoppingCart',
    priority: 30,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Procurement',
    department_ar: 'المشتريات',
    min_edit_priority: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'suppliers', 'supplier_qualification', 'supplier_performance',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'raw_materials', 'material_receiving',
        'supplier_audits',
      ], ['view', 'create', 'edit', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_supplier_quality_engineer',
    code: 'SUPPLIER_QUALITY_ENGINEER',
    name: 'Supplier Quality Engineer',
    name_ar: 'مهندس جودة الموردين',
    description: 'Engineer ensuring supplier quality and compliance.',
    description_ar: 'مهندس يضمن جودة الموردين والامتثال.',
    category: 'supply_chain',
    type: 'system',
    color: '#059669',
    icon: 'Award',
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
      grantAllPermissions(matrix, [
        'supplier_qualification', 'supplier_performance', 'supplier_audits', 'supplier_capa',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'suppliers',
        'material_receiving', 'raw_materials',
        'ncr', 'capa',
        'lab_tests', 'coa',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },

  // ========== LABORATORY & TESTING ==========
  {
    id: 'role_laboratory_manager',
    code: 'LABORATORY_MANAGER',
    name: 'Laboratory Manager',
    name_ar: 'مدير المختبر',
    description: 'Laboratory department head with full testing authority.',
    description_ar: 'رئيس قسم المختبر مع صلاحيات كاملة على الاختبارات.',
    category: 'laboratory',
    type: 'system',
    color: '#BE185D',
    icon: 'FlaskConical',
    priority: 15,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Laboratory',
    department_ar: 'المختبر',
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'lab_tests', 'test_methods', 'coa', 'oos', 'stability',
        'lab_equipment', 'reference_standards', 'calibration',
      ]);
      grantPermissions(matrix, [
        'material_receiving', 'raw_materials', 'finished_goods', 'quarantine',
        'ncr', 'capa', 'deviations',
        'training', 'competency',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_lab_supervisor',
    code: 'LAB_SUPERVISOR',
    name: 'Lab Supervisor',
    name_ar: 'مشرف المختبر',
    description: 'Laboratory Supervisor overseeing testing operations.',
    description_ar: 'مشرف المختبر يشرف على عمليات الاختبار.',
    category: 'laboratory',
    type: 'system',
    color: '#DB2777',
    icon: 'Microscope',
    priority: 25,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Laboratory',
    department_ar: 'المختبر',
    min_edit_priority: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'lab_tests', 'coa', 'oos',
        'lab_equipment', 'reference_standards',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print', 'sign', 'release', 'reassign']);
      grantPermissions(matrix, [
        'test_methods', 'stability', 'calibration',
        'material_receiving', 'quarantine',
        'ncr',
      ], ['view', 'create', 'edit', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_lab_analyst',
    code: 'LAB_ANALYST',
    name: 'Lab Analyst',
    name_ar: 'محلل مختبر',
    description: 'Laboratory Technician performing tests and analyses.',
    description_ar: 'فني مختبر يؤدي الاختبارات والتحليلات.',
    category: 'laboratory',
    type: 'system',
    color: '#EC4899',
    icon: 'FlaskConical',
    priority: 40,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Laboratory',
    department_ar: 'المختبر',
    min_edit_priority: 35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'lab_tests',
      ], ['view', 'create', 'edit', 'export', 'print']);
      grantPermissions(matrix, [
        'test_methods', 'coa', 'oos',
        'lab_equipment', 'reference_standards', 'stability',
        'material_receiving',
        'ncr',
      ], ['view', 'create']);
      return matrix;
    })(),
  },
  {
    id: 'role_microbiologist',
    code: 'MICROBIOLOGIST',
    name: 'Microbiologist',
    name_ar: 'أخصائي أحياء دقيقة',
    description: 'Microbiologist performing microbial testing.',
    description_ar: 'أخصائي أحياء دقيقة يؤدي الاختبارات الميكروبية.',
    category: 'laboratory',
    type: 'system',
    color: '#A855F7',
    icon: 'Bug',
    priority: 35,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'Laboratory',
    department_ar: 'المختبر',
    min_edit_priority: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'lab_tests', 'oos', 'stability',
      ], ['view', 'create', 'edit', 'approve', 'export', 'print']);
      grantPermissions(matrix, [
        'test_methods', 'coa',
        'lab_equipment', 'reference_standards',
        'sanitation', 'allergen',
      ], ['view', 'export']);
      return matrix;
    })(),
  },

  // ========== SUPPORT & ADMINISTRATIVE ==========
  {
    id: 'role_training_manager',
    code: 'TRAINING_MANAGER',
    name: 'Training Manager',
    name_ar: 'مدير التدريب',
    description: 'Training Manager overseeing all training programs.',
    description_ar: 'مدير التدريب يشرف على جميع برامج التدريب.',
    category: 'support',
    type: 'system',
    color: '#6B7280',
    icon: 'GraduationCap',
    priority: 20,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'HR',
    department_ar: 'الموارد البشرية',
    min_edit_priority: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'training', 'training_courses', 'competency', 'training_matrix',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'documents', 'sops',
        'users',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_training_coordinator',
    code: 'TRAINING_COORDINATOR',
    name: 'Training Coordinator',
    name_ar: 'منسق التدريب',
    description: 'Coordinator managing training schedules and records.',
    description_ar: 'منسق يدير جداول التدريب والسجلات.',
    category: 'support',
    type: 'system',
    color: '#9CA3AF',
    icon: 'Calendar',
    priority: 30,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'HR',
    department_ar: 'الموارد البشرية',
    min_edit_priority: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'training', 'training_courses', 'competency',
      ], ['view', 'create', 'edit', 'export', 'print']);
      grantPermissions(matrix, [
        'training_matrix',
        'documents', 'sops',
      ], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_it_administrator',
    code: 'IT_ADMINISTRATOR',
    name: 'IT Administrator',
    name_ar: 'مدير تقنية المعلومات',
    description: 'IT Administrator managing system access (not business data).',
    description_ar: 'مدير تقنية المعلومات يدير الوصول للنظام.',
    category: 'support',
    type: 'system',
    color: '#374151',
    icon: 'Server',
    priority: 10,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    department: 'IT',
    department_ar: 'تقنية المعلومات',
    min_edit_priority: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantAllPermissions(matrix, [
        'users', 'roles', 'settings', 'audit_logs',
      ]);
      grantPermissions(matrix, [
        'dashboard', 'notifications', 'help',
      ], ['view', 'configure']);
      // No business data access
      return matrix;
    })(),
  },

  // ========== SPECIAL ACCESS ROLES ==========
  {
    id: 'role_external_auditor',
    code: 'EXTERNAL_AUDITOR',
    name: 'External Auditor',
    name_ar: 'مدقق خارجي',
    description: 'Read-only access for external regulatory/customer audits.',
    description_ar: 'وصول للقراءة فقط للمراجعات التنظيمية/العملاء الخارجية.',
    category: 'special',
    type: 'system',
    color: '#7C3AED',
    icon: 'UserCheck',
    priority: 80,
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
      grantPermissions(matrix, [
        'dashboard', 'audit_logs', 'reports',
        'documents', 'sops', 'forms',
        'ncr', 'capa', 'deviations', 'change_control',
        'internal_audits', 'external_audits', 'management_review',
        'training', 'competency',
        'batch_records', 'lab_tests', 'coa',
        'haccp', 'sanitation',
        'supplier_qualification', 'supplier_audits',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_viewer',
    code: 'VIEWER',
    name: 'General Viewer',
    name_ar: 'مشاهد عام',
    description: 'Read-only access across most modules.',
    description_ar: 'وصول للقراءة فقط عبر معظم الوحدات.',
    category: 'special',
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
      // View only for all modules except admin
      Object.keys(matrix).forEach(mod => {
        if (!['roles', 'users', 'settings'].includes(mod)) {
          grantPermissions(matrix, [mod], ['view']);
        }
      });
      return matrix;
    })(),
  },
  {
    id: 'role_contractor',
    code: 'CONTRACTOR',
    name: 'Contractor',
    name_ar: 'متعاقد',
    description: 'Limited, time-restricted access for external contractors.',
    description_ar: 'وصول محدود ومقيد بالوقت للمتعاقدين الخارجيين.',
    category: 'special',
    type: 'system',
    color: '#F59E0B',
    icon: 'HardHat',
    priority: 90,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    min_edit_priority: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'tasks',
        'maintenance_work_orders',
        'equipment',
      ], ['view', 'create', 'edit']);
      grantPermissions(matrix, ['training'], ['view']);
      return matrix;
    })(),
  },
  {
    id: 'role_intern',
    code: 'INTERN',
    name: 'Intern',
    name_ar: 'متدرب',
    description: 'Supervised, read-only access for interns/trainees.',
    description_ar: 'وصول للقراءة فقط تحت الإشراف للمتدربين.',
    category: 'special',
    type: 'system',
    color: '#10B981',
    icon: 'UserPlus',
    priority: 95,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    min_edit_priority: 70,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'dashboard', 'help',
        'documents', 'sops',
        'training',
      ], ['view']);
      return matrix;
    })(),
  },
  {
    id: 'role_quality_approver',
    code: 'QUALITY_APPROVER',
    name: 'Quality Approver',
    name_ar: 'معتمد الجودة',
    description: 'Cross-functional quality approval authority.',
    description_ar: 'صلاحية اعتماد الجودة متعددة الوظائف.',
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
      grantPermissions(matrix, [
        'ncr', 'capa', 'deviations', 'change_control',
        'batch_records', 'lab_tests', 'coa',
        'material_receiving', 'quarantine', 'finished_goods',
        'supplier_qualification',
      ], ['view', 'approve', 'sign', 'release', 'export', 'print']);
      grantPermissions(matrix, ['dashboard', 'reports', 'tasks'], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_production_approver',
    code: 'PRODUCTION_APPROVER',
    name: 'Production Approver',
    name_ar: 'معتمد الإنتاج',
    description: 'Production approval and release authority.',
    description_ar: 'صلاحية اعتماد وإفراج الإنتاج.',
    category: 'special',
    type: 'system',
    color: '#B45309',
    icon: 'BadgeCheck',
    priority: 18,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    min_edit_priority: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'production_orders', 'batch_records', 'line_clearance',
        'recipes', 'rework',
      ], ['view', 'approve', 'sign', 'release', 'export', 'print']);
      grantPermissions(matrix, ['dashboard', 'scheduling', 'tasks'], ['view', 'export']);
      return matrix;
    })(),
  },
  {
    id: 'role_final_release',
    code: 'FINAL_RELEASE_AUTHORITY',
    name: 'Final Release Authority',
    name_ar: 'صلاحية الإفراج النهائي',
    description: 'Final product release authority for QA-approved products.',
    description_ar: 'صلاحية الإفراج النهائي للمنتجات المعتمدة من الجودة.',
    category: 'special',
    type: 'system',
    color: '#DC2626',
    icon: 'ShieldCheck',
    priority: 8,
    is_system: true,
    is_locked: false,
    is_active: true,
    is_deprecated: false,
    min_edit_priority: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: (() => {
      const matrix = createFullPermissionMatrix(SYSTEM_MODULES, false);
      grantPermissions(matrix, [
        'batch_records', 'finished_goods', 'coa',
        'material_receiving', 'quarantine',
      ], ['view', 'approve', 'sign', 'release', 'export', 'print']);
      grantPermissions(matrix, [
        'dashboard', 'reports', 'tasks',
        'ncr', 'deviations', 'oos',
        'lab_tests',
      ], ['view', 'export', 'print']);
      return matrix;
    })(),
  },
  {
    id: 'role_emergency_access',
    code: 'EMERGENCY_ACCESS',
    name: 'Emergency Access',
    name_ar: 'وصول الطوارئ',
    description: 'Break-glass emergency access role. All actions are heavily audited.',
    description_ar: 'دور الوصول الطارئ. جميع الإجراءات تخضع للتدقيق المكثف.',
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
  },
];

// ==================== Role Stats ====================
export const ROLE_STATS = {
  total: DEFAULT_SYSTEM_ROLES.length,
  byCategory: DEFAULT_SYSTEM_ROLES.reduce((acc, role) => {
    acc[role.category] = (acc[role.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  systemRoles: DEFAULT_SYSTEM_ROLES.filter(r => r.is_system).length,
  lockedRoles: DEFAULT_SYSTEM_ROLES.filter(r => r.is_locked).length,
};

