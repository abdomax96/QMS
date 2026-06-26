/**
 * useNcrStagePermissions Hook
 * 
 * Stage-based permission wrapper for NCR module.
 * Source of truth: ncr_stage_permissions (role_id + stage_code).
 * 
 * This hook follows the approved architecture:
 * - NCR has 4 logical stages: initiation, investigation, disposition, closure
 * - Actions are enforced from stage rows only
 * 
 * Usage:
 *   const { canProposeRootCause, canApprove, currentStageActions } = useNcrStagePermissions(stage);
 * 
 * Created: 2025-12-31
 */

import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useModulePermissions } from '../useModulePermissions';
import type { NcrStage } from '../../types/stagePermissions';

/**
 * Map current NCR stage code to architecture stage
 */
const NCR_CURRENT_STAGE_MAP: Record<string, NcrStage> = {
    'initial_report': 'initiation',
    'root_cause_analysis': 'investigation',
    'capa_planning': 'disposition',
    'capa_execution': 'disposition',
    'verification_closure': 'closure',
};

// Map semantic hook action names to canonical stage action codes stored in DB.
const ACTION_CODES: Record<string, string[]> = {
    view: ['view'],
    create: ['create'],
    edit: ['edit'],
    propose_root_cause: ['root_cause.propose'],
    assign_investigator: ['assign'],
    approve_disposition: ['approve'],
    release_hold: ['release_hold'],
    reject: ['reject'],
    close: ['verify_close'],
    export: ['export'],
    reopen: ['reopen'],
    add_capa: ['capa.add'],
    complete_capa: ['capa.complete'],
};

// ==================== Hook Interface ====================

export interface NcrStagePermissionsResult {
    // Loading state
    loading: boolean;

    // Current stage info
    currentStage: NcrStage | null;

    // Stage actions
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;

    // Investigation actions
    canProposeRootCause: boolean;
    canAssignInvestigator: boolean;

    // Disposition actions
    canApproveDisposition: boolean;
    canApproveRootCause: boolean;
    canReleaseHold: boolean;
    canReject: boolean;

    // Closure actions
    canClose: boolean;
    canVerifyAndClose: boolean;
    canExport: boolean;
    canReopen: boolean;

    // CAPA actions
    canAddCapa: boolean;
    canCompleteCapa: boolean;

    // Workflow progression
    canProgressWorkflow: boolean;

    // Cross-department (per architecture: NCR is cross-dept readable)
    canViewCrossDepartment: boolean;
    isReadOnlyMode: boolean;

    // Admin override
    isAdmin: boolean;

    // Check any action for a stage
    hasStageAction: (stage: NcrStage, action: string) => boolean;
}

// ==================== Hook Implementation ====================

/**
 * Get NCR stage-based permissions
 * 
 * @param currentNcrStage - The current stage code from NCR record (e.g., 'initial_report')
 * @returns Object with permission booleans for all NCR actions
 */
export function useNcrStagePermissions(currentNcrStage?: string): NcrStagePermissionsResult {
    const {
        loading,
        isAdmin,
        isSuperAdmin
    } = usePermissions();

    // Load stage-level permissions from DB
    const { ncrPermissions } = useModulePermissions();

    return useMemo(() => {
        // Map current NCR stage to architecture stage
        const currentStage = currentNcrStage
            ? NCR_CURRENT_STAGE_MAP[currentNcrStage] || null
            : null;

        // Stage-specific record from DB (role/department aware)
        const stagePermRecord = currentNcrStage
            ? ncrPermissions.find(p => p.stage_code === currentNcrStage)
            : undefined;
        const hasStageRecord = Boolean(stagePermRecord);

        const hasStageAllowed = (action: string): boolean => {
            if (!stagePermRecord?.allowed_actions) return false;
            return stagePermRecord.allowed_actions.includes(action);
        };

        const hasAnyStageAllowed = (actions: string[]): boolean => {
            if (!actions.length) return false;
            return actions.some(hasStageAllowed);
        };

        // Helper to check if user has any of the required permissions for an action
        const checkAction = (stage: NcrStage, action: string): boolean => {
            if (isAdmin || isSuperAdmin) return true;

            const isCurrentStage = currentNcrStage && NCR_CURRENT_STAGE_MAP[currentNcrStage] === stage;
            if (!isCurrentStage) return false;

            // Strict role+stage source of truth: ncr_stage_permissions only.
            if (!hasStageRecord) return false;

            const codes = ACTION_CODES[action] || [action];
            return hasAnyStageAllowed(codes);
        };

        // Generic stage action checker
        const hasStageAction = (stage: NcrStage, action: string): boolean => {
            return checkAction(stage, action);
        };

        // Pre-compute common permissions
        const canView = currentStage ? checkAction(currentStage, 'view') : (isAdmin || isSuperAdmin);
        const canCreate = currentStage ? checkAction(currentStage, 'create') : (isAdmin || isSuperAdmin);
        const canEdit = currentStage ? checkAction(currentStage, 'edit') : (isAdmin || isSuperAdmin);

        // Investigation permissions
        const canProposeRootCause = checkAction('investigation', 'propose_root_cause');
        const canAssignInvestigator = checkAction('investigation', 'assign_investigator');

        // Disposition permissions
        const canApproveRootCause = checkAction('disposition', 'approve_disposition') || checkAction('investigation', 'approve_disposition');
        const canApproveDisposition = canApproveRootCause;
        const canReleaseHold = checkAction('disposition', 'release_hold') || checkAction('closure', 'release_hold');
        const canReject = checkAction('disposition', 'reject') || checkAction('investigation', 'reject');

        // Closure permissions
        const canClose = checkAction('closure', 'close');
        const canVerifyAndClose = canClose;
        const canExport = checkAction('closure', 'export');
        const canReturnByMatrix =
            isAdmin ||
            isSuperAdmin ||
            (hasStageRecord ? Boolean(stagePermRecord?.can_return) : false);
        const canReopen = currentStage
            ? (checkAction(currentStage, 'reopen') || canReturnByMatrix)
            : (canEdit || canReturnByMatrix);

        // CAPA permissions
        const canAddCapa = checkAction('disposition', 'add_capa');
        const canCompleteCapa = checkAction('disposition', 'complete_capa');

        // Workflow progression
        const canProgressWorkflow =
            isAdmin ||
            isSuperAdmin ||
            (hasStageRecord
                ? Boolean(stagePermRecord?.can_advance)
                : false);

        // Cross-department visibility (per architecture: NCR is cross-dept visible, read-only)
        const canViewCrossDepartment = true; // Always true per architecture
        const isReadOnlyMode = !canEdit && canView; // Read-only if can view but not edit

        return {
            loading,
            currentStage,

            canView,
            canCreate,
            canEdit,

            canProposeRootCause,
            canAssignInvestigator,

            canApproveDisposition,
            canApproveRootCause,
            canReleaseHold,
            canReject,

            canClose,
            canVerifyAndClose,
            canExport,
            canReopen,

            canAddCapa,
            canCompleteCapa,

            canProgressWorkflow,

            canViewCrossDepartment,
            isReadOnlyMode,

            isAdmin: isAdmin || isSuperAdmin,

            hasStageAction,
        };
    }, [loading, isAdmin, isSuperAdmin, currentNcrStage, ncrPermissions]);
}

export default useNcrStagePermissions;
