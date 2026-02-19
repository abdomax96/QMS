// ==================== Department & Section Types ====================
// Food Industry (Biscuits Manufacturing) - Organizational Structure

export interface Department {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  color: string;
  icon: string;
  parent_department_id?: string;
  manager_user_id?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Computed/joined
  sections?: Section[];
  modules?: DepartmentModule[];
  user_count?: number;
}

// Helper shape used by org tree components
export interface DepartmentWithChildren extends Department {
  name_en?: string;
  children?: DepartmentWithChildren[];
  roles?: { id: string; name: string; name_ar?: string }[];
}

export interface Section {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  department_id: string;
  supervisor_user_id?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  department?: Department;
  user_count?: number;
}

export interface Module {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  category: ModuleCategory;
  icon: string;
  color: string;
  available_permissions: string[];
  is_active: boolean;
  is_department_scoped: boolean; // If true, data is isolated by department
  requires_license: boolean;
  display_order: number;
  parent_module_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentModule {
  id: string;
  department_id: string;
  module_id: string;
  is_active: boolean;
  granted_permissions: string[];
  granted_at: string;
  granted_by?: string;
  // Computed/joined
  module?: Module;
  department?: Department;
}

export interface UserDepartment {
  id: string;
  user_id: string;
  department_id: string;
  section_id?: string;
  is_primary: boolean;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
  // Computed/joined
  department?: Department;
  section?: Section;
}

// ==================== Module Categories ====================

export type ModuleCategory =
  | 'core_system'
  | 'document_management'
  | 'quality_management'
  | 'training'
  | 'manufacturing'
  | 'maintenance'
  | 'inventory'
  | 'supplier_management'
  | 'laboratory'
  | 'food_safety'
  | 'rnd'
  | 'sales'
  | 'hr'
  | 'environmental';

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, { en: string; ar: string }> = {
  core_system: { en: 'Core System', ar: 'النظام الأساسي' },
  document_management: { en: 'Document Management', ar: 'إدارة الوثائق' },
  quality_management: { en: 'Quality Management', ar: 'إدارة الجودة' },
  training: { en: 'Training & Competency', ar: 'التدريب والكفاءة' },
  manufacturing: { en: 'Manufacturing & Production', ar: 'التصنيع والإنتاج' },
  maintenance: { en: 'Equipment & Maintenance', ar: 'المعدات والصيانة' },
  inventory: { en: 'Inventory & Materials', ar: 'المخزون والمواد' },
  supplier_management: { en: 'Supplier Management', ar: 'إدارة الموردين' },
  laboratory: { en: 'Laboratory & Testing', ar: 'المختبر والفحص' },
  food_safety: { en: 'Food Safety & HACCP', ar: 'سلامة الغذاء' },
  rnd: { en: 'Research & Development', ar: 'البحث والتطوير' },
  sales: { en: 'Sales & Distribution', ar: 'المبيعات والتوزيع' },
  hr: { en: 'Human Resources', ar: 'الموارد البشرية' },
  environmental: { en: 'Environmental', ar: 'البيئة' },
};

// ==================== Department Code Constants ====================

export type DepartmentCode =
  | 'EXEC'
  | 'QA'
  | 'QC'
  | 'PROD'
  | 'MIXING'
  | 'BAKING'
  | 'PACKING'
  | 'MAINT'
  | 'UTIL'
  | 'WH'
  | 'PROC'
  | 'LOG'
  | 'LAB'
  | 'MICRO'
  | 'FS'
  | 'SAN'
  | 'HR'
  | 'TRAIN'
  | 'IT'
  | 'FIN'
  | 'ADMIN'
  | 'RND'
  | 'SALES'
  | 'MKT';

export const DEPARTMENT_LABELS: Record<DepartmentCode, { en: string; ar: string }> = {
  EXEC: { en: 'Executive Management', ar: 'الإدارة التنفيذية' },
  QA: { en: 'Quality Assurance', ar: 'ضمان الجودة' },
  QC: { en: 'Quality Control', ar: 'مراقبة الجودة' },
  PROD: { en: 'Production', ar: 'الإنتاج' },
  MIXING: { en: 'Mixing & Dough', ar: 'الخلط والعجين' },
  BAKING: { en: 'Baking & Oven', ar: 'الخبز والفرن' },
  PACKING: { en: 'Packaging', ar: 'التعبئة والتغليف' },
  MAINT: { en: 'Maintenance', ar: 'الصيانة' },
  UTIL: { en: 'Utilities', ar: 'المرافق' },
  WH: { en: 'Warehouse', ar: 'المستودع' },
  PROC: { en: 'Procurement', ar: 'المشتريات' },
  LOG: { en: 'Logistics', ar: 'اللوجستيات' },
  LAB: { en: 'Laboratory', ar: 'المختبر' },
  MICRO: { en: 'Microbiology', ar: 'الأحياء الدقيقة' },
  FS: { en: 'Food Safety', ar: 'سلامة الغذاء' },
  SAN: { en: 'Sanitation', ar: 'النظافة والتعقيم' },
  HR: { en: 'Human Resources', ar: 'الموارد البشرية' },
  TRAIN: { en: 'Training', ar: 'التدريب' },
  IT: { en: 'Information Technology', ar: 'تقنية المعلومات' },
  FIN: { en: 'Finance', ar: 'المالية' },
  ADMIN: { en: 'Administration', ar: 'الإدارة' },
  RND: { en: 'Research & Development', ar: 'البحث والتطوير' },
  SALES: { en: 'Sales', ar: 'المبيعات' },
  MKT: { en: 'Marketing', ar: 'التسويق' },
};

// ==================== Data Isolation Context ====================

export interface DepartmentContext {
  current_department_id: string | null;
  available_departments: Department[];
  can_switch_department: boolean;
  is_admin: boolean; // Can see all departments
}

// ==================== Permission Check with Department ====================

export interface DepartmentPermissionCheck {
  module_code: string;
  permission: string;
  department_id?: string; // If not provided, uses current department
}

export interface DepartmentPermissionResult {
  has_access: boolean;
  department_id: string;
  module_code: string;
  permission: string;
  reason?: string;
}












