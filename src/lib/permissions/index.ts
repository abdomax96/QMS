/**
 * Permissions System - Unified Exports
 * تصدير موحد لنظام الصلاحيات
 */

// ==================== Hooks ====================
export { useModulePermissions, useCanPerform, useModuleAccess } from '../../hooks/useModulePermissions';
export { useDataIsolation, useFormsDataIsolation, useTasksDataIsolation, useLabDataIsolation, useNcrDataIsolation, applyDataIsolationFilter } from '../../hooks/useDataIsolation';

// ==================== Components ====================
export { default as PermissionGate, NcrStageGate, PermissionButton, withPermission } from '../../components/common/PermissionGate';
export { default as ModuleRoute, ModuleAccessDenied, FormsReportsRoute, TasksRoute, LabRoute, NcrRoute, withModulePermission } from '../../components/auth/ModuleRoute';
export { default as ShareButton } from '../../components/common/ShareButton';
export { default as NcrPermissionActions, NcrActionButton, NcrStageInfo } from '../../components/ncr/NcrPermissionActions';

// ==================== Services ====================
export { default as modulePermissionsService, moduleService, departmentModuleService, ncrWorkflowService, roleModuleService, documentShareService } from '../../services/modulePermissionsService';

// ==================== Types ====================
export type { ModulePermission, NcrStagePermission, UseModulePermissionsReturn } from '../../hooks/useModulePermissions';
export type { DataIsolationConfig, UseDataIsolationReturn } from '../../hooks/useDataIsolation';
export type { AppModule, DepartmentModuleAccess, NcrWorkflowStage, NcrStagePermission as NcrStagePermissionDB, RoleModulePermission, DocumentShare } from '../../services/modulePermissionsService';

// ==================== Constants ====================
export const MODULE_CODES = {
    FORMS_REPORTS: 'forms_reports',
    TASKS: 'tasks',
    LAB: 'lab',
    NCR: 'ncr',
} as const;

export const PERMISSION_ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
    APPROVE: 'approve',
    EXPORT: 'export',
    PRINT: 'print',
    SHARE: 'share',
    ASSIGN: 'assign',
    COMPLETE: 'complete',
    RELEASE: 'release',
    REVIEW: 'review',
    INVESTIGATE: 'investigate',
    DECIDE: 'decide',
    CLOSE: 'close',
    HOLD_ADD: 'hold_add',
    HOLD_RELEASE: 'hold_release',
} as const;

export const NCR_STAGES = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    INVESTIGATION: 'investigation',
    PENDING_DECISION: 'pending_decision',
    IN_PROGRESS: 'in_progress',
    PENDING_VERIFICATION: 'pending_verification',
    CLOSED: 'closed',
    CANCELLED: 'cancelled',
} as const;

export const DATA_ISOLATION_MODES = {
    SHARED: 'shared',
    ISOLATED: 'isolated',
    HYBRID: 'hybrid',
} as const;









