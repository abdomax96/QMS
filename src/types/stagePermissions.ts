// ==================== Stage-Based Permission Types ====================
// Architecture Redesign - Phase 1
// Created: 2025-12-31

/**
 * Defines a stage/phase within a module
 * Example: NCR has stages: initiation, investigation, disposition, closure
 */
export interface ModuleStage {
    id: string;
    module_code: string;
    stage_code: string;
    stage_name: string;
    stage_name_ar?: string;
    description?: string;
    description_ar?: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Permission grant for a specific stage within a module
 */
export interface StagePermission {
    id: string;
    role_id: string;
    module_code: string;
    stage_code: string;
    action: StageAction;
    is_granted: boolean;
    granted_at: string;
    granted_by?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Data visibility configuration per module per department
 */
export interface ModuleDataVisibility {
    id: string;
    module_code: string;
    department_id: string;
    visibility_scope: VisibilityScope;
    cross_dept_read_only: boolean;
    shared_with_departments: string[];
    created_at: string;
    updated_at: string;
    created_by?: string;
}

// ==================== Stage Actions per Module ====================

/**
 * NCR & Holds module actions
 */
export type NcrStageAction =
    // Initiation stage
    | 'view' | 'create' | 'edit'
    // Investigation stage
    | 'propose_root_cause' | 'assign_investigator'
    // Disposition stage
    | 'approve_disposition' | 'release_hold' | 'reject'
    // Closure stage
    | 'close' | 'export' | 'reopen';

/**
 * Lab module actions
 */
export type LabStageAction =
    // Sample Receipt stage
    | 'view' | 'create' | 'receive' | 'reject_sample'
    // Testing stage
    | 'perform_test' | 'enter_results'
    // Review stage
    | 'review' | 'approve' | 'request_retest'
    // Release stage
    | 'release' | 'reject';

/**
 * Forms & Reports module actions
 */
export type FormsStageAction =
    // Templates stage
    | 'view' | 'create' | 'edit' | 'delete' | 'publish'
    // Entry stage
    | 'fill' | 'submit' | 'save_draft'
    // Review stage
    | 'approve' | 'reject' | 'request_revision'
    // Archive stage
    | 'archive' | 'export';

/**
 * Tasks module actions
 */
export type TasksStageAction =
    // Assignment stage
    | 'view' | 'create' | 'assign' | 'delegate'
    // Execution stage
    | 'update' | 'complete' | 'request_help'
    // Review stage
    | 'verify' | 'approve' | 'reject';

/**
 * Union of all stage actions
 */
export type StageAction =
    | NcrStageAction
    | LabStageAction
    | FormsStageAction
    | TasksStageAction;

// ==================== Visibility Types ====================

export type VisibilityScope = 'private' | 'shared' | 'all';

// ==================== Module Codes ====================

export type CoreModuleCode = 'ncr_holds' | 'lab' | 'forms_reports' | 'tasks';

// ==================== Stage Codes per Module ====================

export type NcrStage = 'initiation' | 'investigation' | 'disposition' | 'closure';
export type LabStage = 'sample_receipt' | 'testing' | 'review' | 'release';
export type FormsStage = 'templates' | 'entry' | 'review' | 'archive';
export type TasksStage = 'assignment' | 'execution' | 'review';

export type StageCode = NcrStage | LabStage | FormsStage | TasksStage;

// ==================== Permission Check Result ====================

export interface StagePermissionCheck {
    module_code: CoreModuleCode;
    stage_code: StageCode;
    action: StageAction;
    department_id?: string;
}

export interface StagePermissionResult {
    has_access: boolean;
    is_read_only: boolean; // For cross-department NCR visibility
    module_code: string;
    stage_code: string;
    action: string;
    reason?: string;
}

// ==================== Department Hierarchy ====================

export interface DepartmentHierarchyInfo {
    department_id: string;
    parent_id: string | null;
    depth: number; // 0 = root, 1 = child (max allowed)
    inherits_permissions: boolean;
    explicit_overrides: StagePermissionOverride[];
}

export interface StagePermissionOverride {
    module_code: string;
    stage_code: string;
    action: string;
    is_granted: boolean; // Explicit grant or deny
}
