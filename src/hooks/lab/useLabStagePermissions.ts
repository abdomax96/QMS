/**
 * useLabStagePermissions Hook
 * 
 * Stage-based permission wrapper for Lab module.
 * Provides stage-aware permission checks following the architecture redesign.
 * 
 * Lab has 4 stages: sample_receipt, testing, review, release
 * 
 * Usage:
 *   const { canPerformTest, canApprove, currentStage } = useLabStagePermissions(testStatus);
 * 
 * Created: 2025-12-31
 * Note: This hook is created for future integration. Lab pages don't currently 
 *       have permission checks but this enables gradual adoption.
 */

import { useMemo } from 'react';
import { usePermissions } from '../ncr/usePermissions';
import type { LabStage } from '../../types/stagePermissions';

// ==================== Stage to Permission Mapping ====================

/**
 * Maps Lab test status to architecture stages
 */
const LAB_STATUS_TO_STAGE: Record<string, LabStage> = {
    'pending': 'sample_receipt',
    'received': 'sample_receipt',
    'in_progress': 'testing',
    'completed': 'review',
    'approved': 'release',
    'released': 'release',
    'rejected': 'release',
};

/**
 * Maps Lab stages to their allowed actions and required permission codes
 */
const LAB_STAGE_PERMISSIONS: Record<LabStage, {
    actions: string[];
    permissions: Record<string, string[]>;
}> = {
    sample_receipt: {
        actions: ['view', 'create', 'receive', 'reject_sample'],
        permissions: {
            view: ['lab.view', 'lab_tests.view', 'lab.*'],
            create: ['lab.create', 'lab_tests.create', 'lab.*'],
            receive: ['lab.receive', 'lab_tests.create', 'lab.*'],
            reject_sample: ['lab.reject', 'lab_tests.edit', 'lab.*'],
        }
    },
    testing: {
        actions: ['view', 'perform_test', 'enter_results'],
        permissions: {
            view: ['lab.view', 'lab_tests.view', 'lab.*'],
            perform_test: ['lab.test', 'lab_tests.edit', 'lab.*'],
            enter_results: ['lab.results', 'lab_tests.edit', 'lab.*'],
        }
    },
    review: {
        actions: ['view', 'review', 'approve', 'request_retest'],
        permissions: {
            view: ['lab.view', 'lab_tests.view', 'lab.*'],
            review: ['lab.review', 'lab_tests.view', 'lab.*'],
            approve: ['lab.approve', 'lab_tests.approve', 'lab.*'],
            request_retest: ['lab.retest', 'lab_tests.edit', 'lab.*'],
        }
    },
    release: {
        actions: ['view', 'release', 'reject'],
        permissions: {
            view: ['lab.view', 'lab_tests.view', 'lab.*'],
            release: ['lab.release', 'lab_tests.approve', 'lab.*'],
            reject: ['lab.reject', 'lab_tests.approve', 'lab.*'],
        }
    }
};

// ==================== Hook Interface ====================

export interface LabStagePermissionsResult {
    // Loading state
    loading: boolean;

    // Current stage info
    currentStage: LabStage | null;

    // Basic actions
    canView: boolean;
    canCreate: boolean;

    // Sample Receipt actions
    canReceiveSample: boolean;
    canRejectSample: boolean;

    // Testing actions
    canPerformTest: boolean;
    canEnterResults: boolean;

    // Review actions
    canReview: boolean;
    canApprove: boolean;
    canRequestRetest: boolean;

    // Release actions
    canRelease: boolean;
    canReject: boolean;

    // Admin status
    isAdmin: boolean;

    // Check any action for a stage
    hasStageAction: (stage: LabStage, action: string) => boolean;
}

// ==================== Hook Implementation ====================

/**
 * Get Lab stage-based permissions
 * 
 * @param testStatus - The current test status (e.g., 'pending', 'in_progress', 'completed')
 * @returns Object with permission booleans for all Lab actions
 */
export function useLabStagePermissions(testStatus?: string): LabStagePermissionsResult {
    const {
        loading,
        hasAnyPermission,
        isAdmin,
        isSuperAdmin
    } = usePermissions();

    return useMemo(() => {
        // Map test status to architecture stage
        const currentStage = testStatus
            ? LAB_STATUS_TO_STAGE[testStatus] || null
            : null;

        // Helper to check if user has any of the required permissions for an action
        const checkAction = (stage: LabStage, action: string): boolean => {
            if (isAdmin || isSuperAdmin) return true;

            const stageConfig = LAB_STAGE_PERMISSIONS[stage];
            const requiredPermissions = stageConfig?.permissions[action];

            if (!requiredPermissions) return false;
            return hasAnyPermission(requiredPermissions);
        };

        // Generic stage action checker
        const hasStageAction = (stage: LabStage, action: string): boolean => {
            return checkAction(stage, action);
        };

        // Pre-compute common permissions
        const canView = hasAnyPermission(['lab.view', 'lab_tests.view', 'lab.*']) || isAdmin;
        const canCreate = hasAnyPermission(['lab.create', 'lab_tests.create', 'lab.*']) || isAdmin;

        // Sample Receipt permissions
        const canReceiveSample = hasAnyPermission(['lab.receive', 'lab_tests.create', 'lab.*']) || isAdmin;
        const canRejectSample = hasAnyPermission(['lab.reject', 'lab_tests.edit', 'lab.*']) || isAdmin;

        // Testing permissions
        const canPerformTest = hasAnyPermission(['lab.test', 'lab_tests.edit', 'lab.*']) || isAdmin;
        const canEnterResults = hasAnyPermission(['lab.results', 'lab_tests.edit', 'lab.*']) || isAdmin;

        // Review permissions
        const canReview = hasAnyPermission(['lab.review', 'lab_tests.view', 'lab.*']) || isAdmin;
        const canApprove = hasAnyPermission(['lab.approve', 'lab_tests.approve', 'lab.*']) || isAdmin;
        const canRequestRetest = hasAnyPermission(['lab.retest', 'lab_tests.edit', 'lab.*']) || isAdmin;

        // Release permissions
        const canRelease = hasAnyPermission(['lab.release', 'lab_tests.approve', 'lab.*']) || isAdmin;
        const canReject = hasAnyPermission(['lab.reject', 'lab_tests.approve', 'lab.*']) || isAdmin;

        return {
            loading,
            currentStage,

            canView,
            canCreate,

            canReceiveSample,
            canRejectSample,

            canPerformTest,
            canEnterResults,

            canReview,
            canApprove,
            canRequestRetest,

            canRelease,
            canReject,

            isAdmin: isAdmin || isSuperAdmin,

            hasStageAction,
        };
    }, [loading, hasAnyPermission, isAdmin, isSuperAdmin, testStatus]);
}

export default useLabStagePermissions;
