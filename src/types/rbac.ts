// ==================== RBAC Type Definitions ====================
// Enterprise-Grade Role-Based Access Control for QMS/Manufacturing

// ==================== Core Enums ====================
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'export'
  | 'print'
  | 'archive'
  | 'sign'
  | 'release'
  | 'reassign'
  | 'configure'
  | 'admin';

export type RoleType = 'system' | 'custom';

export type RoleCategory =
  | 'executive'
  | 'quality'
  | 'production'
  | 'maintenance'
  | 'supply_chain'
  | 'laboratory'
  | 'support'
  | 'special';

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

export type PermissionState = 'granted' | 'denied' | 'inherited' | 'locked' | 'conditional';

export type ConflictResolutionStrategy = 'permissive_union' | 'explicit_deny_wins';

// ==================== Permission Types ====================
export interface Permission {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  action: PermissionAction;
  display_order: number;
  requires_permissions?: string[]; // Permission codes that this requires
  is_dangerous?: boolean; // High-risk permission requiring confirmation
}

export interface PermissionGrant {
  permission_id: string;
  permission_code: string;
  is_granted: boolean;
  state: PermissionState;
  granted_by?: string;
  granted_at?: string;
  condition?: string; // For conditional permissions
  expires_at?: string;
}

// ==================== Module Types ====================
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
  is_department_scoped?: boolean; // If true, data is isolated by department
  requires_license?: boolean;
  parent_module_id?: string;
  available_permissions: PermissionAction[];
  description?: string;
  description_ar?: string;
}

export interface ModuleGroup {
  category: ModuleCategory;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  modules: Module[];
}

// ==================== Role Types ====================
export interface Role {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  category: RoleCategory;
  type: RoleType;
  color: string;
  icon: string;
  priority: number; // Lower = higher authority
  is_system: boolean;
  is_locked: boolean;
  is_active: boolean;
  is_deprecated: boolean;
  deprecated_at?: string;
  replacement_role_id?: string;
  deprecation_message?: string;
  department?: string;
  department_ar?: string;
  min_edit_priority: number; // Minimum priority required to edit this role
  created_at: string;
  updated_at: string;
  permissions: RolePermissionMatrix;
  minimum_required_permissions?: string[]; // Cannot be revoked
}

export interface RolePermissionMatrix {
  [moduleCode: string]: {
    [action in PermissionAction]?: PermissionGrant;
  };
}

// ==================== User Role Assignment ====================
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role: Role;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_temporary: boolean;
  reason?: string;
}

export interface UserEffectivePermissions {
  user_id: string;
  roles: Role[];
  effective_permissions: RolePermissionMatrix;
  conflict_resolution: ConflictResolutionStrategy;
  computed_at: string;
}

// ==================== Audit Types ====================
export interface PermissionChangeLog {
  id: string;
  role_id: string;
  role_name: string;
  module_code: string;
  permission_code: string;
  action: 'grant' | 'revoke' | 'bulk_grant' | 'bulk_revoke';
  previous_state: boolean;
  new_state: boolean;
  changed_by: string;
  changed_by_email: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  batch_id?: string;
}

// ==================== Role Conflict Types ====================
export interface RoleConflict {
  id: string;
  role_a_id: string;
  role_b_id: string;
  role_a_name: string;
  role_b_name: string;
  conflict_reason: string;
  severity: 'warning' | 'error' | 'critical';
  created_at: string;
}

// ==================== Permission Validation ====================
export interface PermissionValidationRule {
  id: string;
  name: string;
  description: string;
  check: (matrix: RolePermissionMatrix) => ValidationResult;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  module_code: string;
  permission_code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  module_code: string;
  permission_code: string;
  message: string;
  risk_level: 'low' | 'medium' | 'high';
}

// ==================== Permission Hierarchy ====================
export interface PermissionHierarchy {
  permission_code: string;
  requires_permissions: string[];
  implies_permissions?: string[];
}

// ==================== UI State Types ====================
export interface PermissionMatrixUIState {
  selectedRoles: string[];
  expandedCategories: Set<ModuleCategory>;
  expandedModules: Set<string>;
  filterText: string;
  filterRoleCategory: RoleCategory | 'all';
  filterModuleCategory: ModuleCategory | 'all';
  filterPermissionState: PermissionState | 'all';
  viewMode: 'matrix' | 'compare' | 'audit';
  compareRoles: [string, string] | null;
  isEditing: boolean;
  pendingChanges: PendingPermissionChange[];
  showInheritedPermissions: boolean;
  showLockedPermissions: boolean;
}

export interface PendingPermissionChange {
  role_id: string;
  module_code: string;
  permission_action: PermissionAction;
  new_value: boolean;
  previous_value: boolean;
  timestamp: string;
}

// ==================== Batch Operations ====================
export interface BatchPermissionOperation {
  operation_id: string;
  operation_type: 'grant_all' | 'revoke_all' | 'copy_from_role' | 'reset_to_default';
  target_role_ids: string[];
  source_role_id?: string;
  affected_modules?: string[];
  affected_permissions?: PermissionAction[];
  reason: string;
  requires_confirmation: boolean;
}

// ==================== Permission Templates ====================
export interface PermissionTemplate {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  category: RoleCategory;
  permissions: RolePermissionMatrix;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== Export Types ====================
export interface PermissionExport {
  export_date: string;
  exported_by: string;
  format: 'csv' | 'pdf' | 'json';
  roles: Role[];
  modules: Module[];
  audit_trail?: PermissionChangeLog[];
  digital_signature?: string;
}

// ==================== Permission Check Result ====================
export interface PermissionCheckResult {
  is_allowed: boolean;
  checked_at: string;
  user_id: string;
  module_code: string;
  action: PermissionAction;
  granted_by_role?: string;
  denied_reason?: string;
}

