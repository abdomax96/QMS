// ==================== Re-exports from other type files ====================
export * from './permission';

// ==================== Template Types ====================
export type TemplateType = 'quality-control' | 'inspection' | 'data-collection' | 'audit' | 'checklist' | 'report' | 'policy' | 'procedure' | 'form' | 'risk-assessment' | 'manual';

export interface TemplateTypeConfig {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  color: string;
  default_sections: string[];
  available_tools: TemplateTool[];
  required_properties: string[];
  optional_properties: string[];
}

export interface TemplateTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'data' | 'analysis' | 'validation' | 'workflow' | 'reporting';
  configurable: boolean;
  default_settings?: any;
}

export interface TemplateProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'file';
  required: boolean;
  default_value?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
}

// ==================== Folder Types ====================
export type FolderType = 'project' | 'department' | 'client' | 'date-based' | 'standard';

export interface FolderPermissions {
  owner: string;
  editors: string[];
  viewers: string[];
}

export interface FolderMetadata {
  description?: string;
  tags?: string[];
  project_timeline?: any;
  department_info?: any;
  client_info?: any;
  isSmartFiling?: boolean;
  templateId?: string;
  shift?: string;
  isMirrored?: boolean;
  sourceTemplateFolderId?: string;
}

export interface FolderStats {
  form_templates_count: number;
  reports_count: number;
  storage_used_mb: number;
}


export interface Folder {
  // Timestamps
  modified_at?: string;
  updated_at?: string;
  id: string;
  name: string;
  name_en?: string;  // English name for bilingual display
  type: FolderType;
  icon: string;
  color: string;
  parent_id: string | null;
  path: string;
  created_at: string;
  created_by: string;

  permissions: FolderPermissions;
  metadata: FolderMetadata;
  stats: FolderStats;
  archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  children?: Folder[];
  // Added from consolidation
  is_system?: boolean;
  company_id?: string;
  department_id?: string;  // قسم المجلد للعزل
  sort_order?: number;
  description?: string;
  tags?: string[] | null;
}


// ==================== Form Template Types ====================
export interface BasicInfo {
  company_id?: string;     // معرف الشركة/العميل المرتبط بالتقرير
  company_name?: string;   // اسم الشركة للعرض في التقارير
  product_id?: string;     // معرف المنتج (لنماذج مراقبة الجودة)
  product_name?: string;   // اسم المنتج للعرض في التقارير
  standard_weight?: number;
  shelf_life_months?: number;
  cartons_per_pallet?: number;
  packs_per_box?: number;
  boxes_per_carton?: number;
  empty_box_weight?: number;
  empty_carton_weight?: number;
  aql_level?: string;  // MIL-STD-105E AQL levels (0.010 to 1000)
  inspection_level?: 'I' | 'II' | 'III' | 'S-1' | 'S-2' | 'S-3' | 'S-4';  // MIL-STD-105E inspection levels
  inspection_type?: 'normal' | 'tightened' | 'reduced';  // MIL-STD-105E inspection types
  lot_size?: number;  // Optional lot size for reference
}

export interface DocumentControl {
  doc_code: string;
  issue_no: string;
  review_no: string;
  issue_date: string;
  review_date: string;
}

export interface BatchConfiguration {
  batch_code: string;
  day_format: string;
  month_format: string;
  year_format?: 'YY' | 'YYYY' | 'none';
  separator?: string;
  prefix?: string;
  suffix?: string;
  reset_frequency?: 'daily' | 'monthly' | 'yearly' | 'never';
  auto_increment?: boolean;
  start_number?: number;
  current_number?: number;
  padding?: number;
  // ترتيب المكونات الرئيسية (الافتراضي: code → date → number)
  component_order?: ('code' | 'date' | 'number')[];
  // ترتيب أجزاء التاريخ (الافتراضي: year → month → day)
  date_order?: ('year' | 'month' | 'day')[];
}

export interface CustomVariable {
  name: string;
  value: number | string;
  unit?: string;
  description?: string;
}

// ==================== Table Types ====================
export type TableType = 'parameters' | 'sample' | 'custom' | 'printing_verification' | 'checklist' | 'recipe' | 'recipe-traceability';

// Data types for table cells
export type CellDataType =
  | 'text'           // نص
  | 'integer'        // عدد صحيح
  | 'decimal'        // عدد عشري
  | 'date'           // تاريخ
  | 'time'           // وقت
  | 'datetime'       // تاريخ ووقت
  | 'boolean-check'  // ✔ مقبول / ✖ مرفوض
  | 'boolean-yesno'  // نعم / لا
  | 'dropdown'       // قائمة منسدلة
  | 'user-directory' // دليل المستخدمين
  | 'image'          // صورة
  | 'long-text';     // نص طويل

export interface TableParameter {
  name: string;
  limits: string;
  type: CellDataType;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  unit?: string;
  critical_level?: 'ccp' | 'oprp' | 'normal';
  options?: string[]; // For dropdown type
  user_directory_department_id?: string;
  user_directory_role_id?: string;
  default_value?: any;
  formula?: string; // معادلة حسابية، مثل: "{معلمة2} * {ثابت1}" أو "{جدول1.معلمة1} + {جدول2.معلمة3}"
  is_calculated?: boolean; // هل هذه معلمة محسوبة تلقائياً
  format?: string; // تنسيق التاريخ/الوقت (مثل DD/MM/YYYY أو HH:mm)
  enable_abc_logic?: boolean; // تفعيل منطق التقييم ABC
}

export interface TableColumn {
  key: string;
  label: string;
  type: CellDataType;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  options?: string[];
  user_directory_department_id?: string;
  user_directory_role_id?: string;
  compute?: string;
  width?: number;
  align?: 'right' | 'center' | 'left';
  required?: boolean;
  default_value?: any;
  format?: string; // تنسيق التاريخ/الوقت
  enable_abc_logic?: boolean; // تفعيل منطق التقييم ABC
}

export interface TableHeaderCell {
  label: string;
  col_span?: number;
  row_span?: number;
  align?: 'right' | 'center' | 'left';
  background_color?: string;
  text_color?: string;
  class_name?: string;
}

export interface TableFeatures {
  show_avg?: boolean;
  show_std?: boolean;
  show_tare?: boolean;
  calculate_tare1?: boolean;
  calculate_tare2?: boolean;
  calculate_average?: boolean;
  calculate_std?: boolean;
  auto_acceptance?: boolean;
  conditional_formatting?: any;
  aql_rules?: {
    acceptance: number;
    rejection: number;
  };
  use_mil_std_105?: boolean;  // Enable MIL-STD-105E validation
  inspection_type?: 'normal' | 'tightened' | 'reduced';  // Override global inspection type
  // خصائص جدول تتبع الوصفات
  show_mixing_steps?: boolean;       // عرض خطوات الخلط
  allow_multiple_batches?: boolean;  // السماح بأكثر من باتش للخامة
  show_expiry_warning?: boolean;     // تحذير عند قرب الانتهاء
  auto_calculate_total?: boolean;    // حساب إجمالي الكميات تلقائياً
}

export interface Table {
  id: string;
  name: string;
  type: TableType;
  inspection_period?: number;
  parameters?: TableParameter[];
  columns?: TableColumn[];
  rows?: number;
  allowDynamicRows?: boolean; // Allow user to add/remove rows dynamically
  sample_size?: number;
  aql_level?: string;
  max_std?: number;
  number_constraints?: {
    allow_negative?: boolean;
    step?: number;
    min?: number;
    max?: number;
  };
  features?: TableFeatures;
  header_rows?: TableHeaderCell[][];
  show_row_numbers?: boolean;
  row_header_label?: string;
  sections?: Array<{ title: string; rows: number }>;
  items?: ChecklistItem[];
  ingredients?: RecipeItem[];
  linked_stop_group?: string; // Group ID to link stop status between tables
  // خصائص جدول تتبع الوصفات
  expiry_warning_days?: number; // أيام التحذير قبل الانتهاء
}

export interface ChecklistItem {
  text: string;
  required: boolean;
  status?: 'ok' | 'not_ok' | 'na';
  notes?: string;
}

export interface FormSection {
  id: string;
  name: string;
  icon: string;
  order: number;
  description?: string;
  tables: Table[];
  quality_criteria?: QualityCriteria[];  // معايير الجودة للقسم
}

// ==================== Quality Criteria ====================
export interface QualityCriteriaItem {
  parameter: string;
  specification: string;
  result?: string;
}

export interface QualityCriteria {
  id: string;
  title: string;
  icon: string;
  color: string;
  acceptance: string;
  items: QualityCriteriaItem[];
}

// ==================== Recipe ====================
export interface RecipeItem {
  ingredient: string;
  materialId?: string;              // الربط مع الخامة (RawMaterial.id)
  quantity: number;
  unit: string;
  percentage?: number;
  // مأخوذة من الخامة المرتبطة تلقائياً
  containsAllergens?: string[];
  mayContainAllergens?: string[];
}

// ==================== Signatures ====================
export interface Signature {
  role: string;
  name?: string;
  timestamp?: string;
  signature_data?: string;
}

// ==================== Form Template ====================
export interface FormTemplate {
  id: string;
  name: string;
  name_en?: string;  // English name for bilingual display
  version: number;
  created_at: string;
  type: TemplateType;
  folder_id: string | null;
  unified_folder_id?: string | null;
  template_type_config: TemplateTypeConfig;
  custom_properties: Record<string, any>;

  basic_info?: BasicInfo;
  document_control?: DocumentControl;
  batch_configuration?: BatchConfiguration;
  custom_variables?: CustomVariable[];
  sections: Record<string, FormSection>;
  quality_criteria?: QualityCriteria[];
  notes?: string;
  signatures?: Signature[];
  recipe?: RecipeItem[];
  department_id?: string;  // قسم النموذج للعزل
  archived?: boolean;
  archived_at?: string;
  archived_by?: string | null;
}

// ==================== Form Instance (Report) ====================

/** Report workflow status */
export type ReportStatus =
  | 'draft'          // Being edited
  | 'in_progress'    // Being filled
  | 'submitted'      // Waiting for reviewer
  | 'under_review'   // Actively being reviewed
  | 'approved'       // Review complete, locked
  | 'rejected'       // Returned for correction
  | 'archived'       // Historical record
  | 'cancelled';     // Cancelled

/** Review status for filtering */
export type ReviewStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

/** Report review history entry */
export interface ReportReviewHistoryEntry {
  id: string;
  reportId: string;
  action: 'created' | 'submitted' | 'claimed' | 'approved' | 'rejected' | 'resubmitted' | 'reopened' | 'edited_by_reviewer' | 'archived';
  fromStatus: string | null;
  toStatus: string;
  performedBy: string | null;
  performedByName: string;
  performedByEmail?: string;
  performedByRole?: string;
  performedAt: string;
  notes?: string;
  fieldChanges?: Record<string, { old: any; new: any }>;
}

export interface FormInstance {
  id?: string; // Mapped from instance_id
  name?: string; // Display name
  instance_id: string;
  template_id: string;
  template_version: string;
  folder_id: string | null;
  status: ReportStatus;
  created_at: string;
  created_by: string;
  submitted_at?: string;
  submitted_by?: string;

  // Review workflow fields
  review_status?: ReviewStatus;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  is_locked?: boolean;
  locked_at?: string;
  locked_by?: string;
  rejection_count?: number;
  last_rejection_reason?: string;
  workflow_history?: Array<{
    from: string;
    to: string;
    by: string;
    by_name: string;
    at: string;
  }>;

  form_data: {
    report_date: string;
    shift?: string;
    shift_duration?: number;
    inspection_start_time?: string;
    batch_number?: string;
    production_line?: string;
    operator?: string;
    stopped_times?: Record<string, string[]>; // Group ID -> Array of stopped time strings (HH:MM)
    sections: Record<string, {
      tables: Record<string, {
        data: any[][];
        notes?: string; // User notes for the table
      }>;
    }>;
    table_notes?: Record<string, string>; // Global table notes keyed by table ID
  };

  calculations?: {
    results: any;
  };

  signatures?: Signature[];
  attachments?: Array<{
    type: 'photo' | 'file';
    url: string;
    filename: string;
  }>;

  workflow?: {
    current_step: string;
    approvals: Array<{
      step: string;
      approved_by?: string;
      approved_at?: string;
      comments?: string;
      status: 'pending' | 'approved' | 'rejected';
    }>;
  };

  department_id?: string;  // قسم التقرير للعزل
  archived?: boolean;
  archived_at?: string;
  archived_by?: string | null;
}

// ==================== User & Permission Types ====================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'manager' | 'user' | 'viewer';
  avatar?: string;
  department?: string;
  phone?: string;
}

export interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
}

// ==================== App State Types ====================
export interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  sidebarCollapsed: boolean;
}

// ==================== Calculation Types ====================
export interface CalculationStep {
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'divide' | 'multiply' | 'subtract' | 'add';
  source?: string;
  operands?: string[];
  result_variable: string;
}

export interface Calculation {
  type: 'builder' | 'formula';
  steps?: CalculationStep[];
  formula?: string;
  variables?: Record<string, any>;
}

// ==================== View Types ====================
export type ViewMode = 'tree' | 'list' | 'card';
export type EditorMode = 'design' | 'data-entry' | 'view';

// ==================== Filter & Sort Types ====================
export interface FilterCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: any;
}

export interface SortCriteria {
  field: string;
  direction: 'asc' | 'desc';
}
