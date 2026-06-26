/**
 * Permissions System - Unified Exports
 * تصدير موحد لنظام الصلاحيات
 */

// ==================== Hooks ====================
export { useModulePermissions, useCanPerform, useModuleAccess } from '../../hooks/useModulePermissions';
export { useDataIsolation, useFormsDataIsolation, useTasksDataIsolation, useLabDataIsolation, useNcrDataIsolation, applyDataIsolationFilter } from '../../hooks/useDataIsolation';

// ==================== Components ====================
export { default as PermissionGate, NcrStageGate, PermissionButton, withPermission } from '../../components/common/PermissionGate';
export { default as ModuleRoute, ModuleAccessDenied, FormsReportsRoute, TasksRoute, LabRoute, NcrRoute, ChatRoute, withModulePermission } from '../../components/auth/ModuleRoute';
export { default as ShareButton } from '../../components/common/ShareButton';
export { default as NcrPermissionActions, NcrActionButton, NcrStageInfo } from '../../components/ncr/NcrPermissionActions';

// ==================== Types ====================
export type { ModulePermission, NcrStagePermission, TaskStagePermission, UseModulePermissionsReturn } from '../../hooks/useModulePermissions';
export type { DataIsolationConfig, UseDataIsolationReturn } from '../../hooks/useDataIsolation';

// ==================== Constants ====================
export const MODULE_CODES = {
    FORMS_REPORTS: 'forms_reports',
    TASKS: 'tasks',
    LAB: 'lab',
    NCR: 'ncr',
    CHAT: 'chat',
    AI_ASSISTANT: 'ai_assistant',
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
    ROOT_CAUSE_PROPOSE: 'root_cause.propose',
    RELEASE_HOLD: 'release_hold',
    VERIFY_CLOSE: 'verify_close',
    CAPA_ADD: 'capa.add',
    CAPA_COMPLETE: 'capa.complete',
    WORKFLOW_PROGRESS: 'workflow.progress',
} as const;

export const TASK_STAGES = {
    ASSIGNMENT: 'assignment',
    IN_PROGRESS: 'in_progress',
    REVIEW: 'review',
    APPROVAL: 'approval',
    CLOSED: 'closed',
} as const;

export const TASK_STAGE_ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    ASSIGN: 'assign',
    DELEGATE: 'delegate',
    UPDATE: 'update',
    COMPLETE: 'complete',
    REQUEST_HELP: 'request_help',
    VERIFY: 'verify',
    APPROVE: 'approve',
    REJECT: 'reject',
    COMMENT: 'comment',
    ATTACH: 'attach',
    DELETE: 'delete',
} as const;

export const DATA_ISOLATION_MODES = {
    SHARED: 'shared',
    ISOLATED: 'isolated',
    HYBRID: 'hybrid',
} as const;











