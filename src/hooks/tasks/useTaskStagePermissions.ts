/**
 * useTaskStagePermissions Hook
 *
 * Stage-based permission wrapper for Task module.
 * Source of truth: task_stage_permissions (role_id + stage_code).
 *
 * Mirrors the NCR stage permission pattern (useNcrStagePermissions).
 *
 * Usage:
 *   const { canAssign, canApprove, canProgressWorkflow } = useTaskStagePermissions(stage);
 */

import { useMemo } from 'react';
import { usePermissions } from '../ncr/usePermissions';
import { useModulePermissions } from '../useModulePermissions';
import type { TaskStage } from '../../types/task';

// ==================== Hook Interface ====================

export interface TaskStagePermissionsResult {
    loading: boolean;
    currentStage: TaskStage | null;

    // Assignment stage actions
    canView: boolean;
    canCreate: boolean;
    canAssign: boolean;
    canDelegate: boolean;

    // Execution stage actions
    canUpdate: boolean;
    canComplete: boolean;
    canRequestHelp: boolean;

    // Review stage actions
    canVerify: boolean;

    // Approval stage actions
    canApprove: boolean;
    canReject: boolean;

    // Cross-stage actions
    canComment: boolean;
    canAttach: boolean;
    canDelete: boolean;

    // Workflow progression
    canProgressWorkflow: boolean;
    canReturnWorkflow: boolean;

    // Mode flags
    isReadOnlyMode: boolean;
    isAdmin: boolean;

    // Generic checker
    hasStageAction: (stage: TaskStage, action: string) => boolean;
}

// ==================== Hook Implementation ====================

export function useTaskStagePermissions(currentTaskStage?: string): TaskStagePermissionsResult {
    const { loading, isAdmin, isSuperAdmin } = usePermissions();
    const { taskPermissions } = useModulePermissions();

    return useMemo(() => {
        const currentStage = (currentTaskStage as TaskStage) || null;

        // Find the permission record for the current stage
        const stagePermRecord = currentTaskStage
            ? taskPermissions.find(p => p.stage_code === currentTaskStage)
            : undefined;
        const hasStageRecord = Boolean(stagePermRecord);

        const hasStageAllowed = (action: string): boolean => {
            if (!stagePermRecord?.allowed_actions) return false;
            return stagePermRecord.allowed_actions.includes(action);
        };

        // Check if user has permission for a specific action in a specific stage
        const checkAction = (stage: TaskStage, action: string): boolean => {
            if (isAdmin || isSuperAdmin) return true;

            // Only check against current stage
            if (currentTaskStage !== stage) return false;

            if (!hasStageRecord) return false;

            return hasStageAllowed(action);
        };

        // Generic stage action checker
        const hasStageAction = (stage: TaskStage, action: string): boolean => {
            if (isAdmin || isSuperAdmin) return true;

            const record = taskPermissions.find(p => p.stage_code === stage);
            if (!record) return false;
            return record.allowed_actions.includes(action);
        };

        // Pre-compute common permissions
        const canView = currentStage ? checkAction(currentStage, 'view') : (isAdmin || isSuperAdmin);
        const canCreate = currentStage ? checkAction(currentStage, 'create') : (isAdmin || isSuperAdmin);

        // Assignment actions
        const canAssign = checkAction('assignment', 'assign') || (currentStage === 'assignment' && hasStageAllowed('assign'));
        const canDelegate = checkAction('assignment', 'delegate') || (currentStage === 'assignment' && hasStageAllowed('delegate'));

        // Execution actions
        const canUpdate = checkAction('in_progress', 'update') || (currentStage === 'in_progress' && hasStageAllowed('update'));
        const canComplete = checkAction('in_progress', 'complete') || (currentStage === 'in_progress' && hasStageAllowed('complete'));
        const canRequestHelp = checkAction('in_progress', 'request_help') || (currentStage === 'in_progress' && hasStageAllowed('request_help'));

        // Review actions
        const canVerify = checkAction('review', 'verify') || (currentStage === 'review' && hasStageAllowed('verify'));

        // Approval actions
        const canApprove = checkAction('approval', 'approve') || (currentStage === 'approval' && hasStageAllowed('approve'));
        const canReject = checkAction('approval', 'reject') || checkAction('review', 'reject')
            || (currentStage && hasStageAllowed('reject'));

        // Cross-stage actions
        const canComment = currentStage ? hasStageAllowed('comment') : (isAdmin || isSuperAdmin);
        const canAttach = currentStage ? hasStageAllowed('attach') : (isAdmin || isSuperAdmin);
        const canDelete = currentStage ? hasStageAllowed('delete') : (isAdmin || isSuperAdmin);

        // Workflow progression
        const canProgressWorkflow =
            isAdmin ||
            isSuperAdmin ||
            (hasStageRecord ? Boolean(stagePermRecord?.can_advance) : false);

        const canReturnWorkflow =
            isAdmin ||
            isSuperAdmin ||
            (hasStageRecord ? Boolean(stagePermRecord?.can_return) : false);

        const isReadOnlyMode = !canUpdate && !canAssign && !canApprove && canView;

        return {
            loading,
            currentStage,

            canView,
            canCreate,
            canAssign,
            canDelegate,

            canUpdate,
            canComplete,
            canRequestHelp,

            canVerify,

            canApprove,
            canReject,

            canComment,
            canAttach,
            canDelete,

            canProgressWorkflow,
            canReturnWorkflow,

            isReadOnlyMode,
            isAdmin: isAdmin || isSuperAdmin,

            hasStageAction,
        };
    }, [loading, isAdmin, isSuperAdmin, currentTaskStage, taskPermissions]);
}

export default useTaskStagePermissions;
