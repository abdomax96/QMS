/**
 * Lab Test State Machine
 * 
 * Enforces valid state transitions for Lab test workflow.
 * Per architecture redesign: Lab has 4 stages mapped to database statuses.
 * 
 * Architecture Stages: sample_receipt, testing, review, release
 * Database Statuses: pending, in_progress, completed, approved, released, rejected
 * 
 * Created: 2025-12-31
 */

// ==================== Stage Definitions ====================

/**
 * Lab test database status (matches lab_tests.status column)
 */
export type LabTestStatus =
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'approved'
    | 'released'
    | 'rejected';

/**
 * Status order for progression (main happy path)
 */
export const LAB_STATUS_ORDER: readonly LabTestStatus[] = [
    'pending',
    'in_progress',
    'completed',
    'approved',
    'released'
] as const;

/**
 * Status display names (Arabic)
 */
export const LAB_STATUS_LABELS: Record<LabTestStatus, string> = {
    'pending': 'قيد الانتظار',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'approved': 'معتمد',
    'released': 'صادر',
    'rejected': 'مرفوض'
};

/**
 * Status colors for UI
 */
export const LAB_STATUS_COLORS: Record<LabTestStatus, { bg: string; text: string }> = {
    'pending': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'in_progress': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'completed': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'approved': { bg: 'bg-green-100', text: 'text-green-800' },
    'released': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    'rejected': { bg: 'bg-red-100', text: 'text-red-800' }
};

// ==================== Transition Rules ====================

/**
 * Valid transitions from each status
 */
export const LAB_VALID_TRANSITIONS: Record<LabTestStatus, LabTestStatus[]> = {
    'pending': ['in_progress'],
    'in_progress': ['completed'],
    'completed': ['approved', 'rejected'],
    'approved': ['released'],
    'released': [], // Terminal
    'rejected': ['in_progress'] // Can be retested
};

/**
 * Conditions required to move from each status
 */
export const LAB_TRANSITION_CONDITIONS: Record<LabTestStatus, {
    required: string[];
    description: string;
    description_ar: string;
}> = {
    'pending': {
        required: ['sample', 'testType'],
        description: 'Sample and test type must be defined',
        description_ar: 'يجب تحديد العينة ونوع الفحص'
    },
    'in_progress': {
        required: ['parameters.hasResults'],
        description: 'All parameters must have results entered',
        description_ar: 'يجب إدخال نتائج جميع المعايير'
    },
    'completed': {
        required: ['reviewer'],
        description: 'A reviewer must approve or reject',
        description_ar: 'يجب أن يعتمد أو يرفض المراجع'
    },
    'approved': {
        required: [],
        description: 'Ready for release',
        description_ar: 'جاهز للإصدار'
    },
    'released': {
        required: [],
        description: 'Test is released - terminal state',
        description_ar: 'تم إصدار الفحص - الحالة النهائية'
    },
    'rejected': {
        required: ['rejectionReason'],
        description: 'Rejection reason must be provided',
        description_ar: 'يجب تحديد سبب الرفض'
    }
};

// ==================== State Machine Result Types ====================

export interface LabTransitionResult {
    isValid: boolean;
    from: LabTestStatus;
    to: LabTestStatus | null;
    blockedReason?: string;
    blockedReason_ar?: string;
    missingConditions?: string[];
}

export interface LabStatusInfo {
    status: LabTestStatus;
    label: string;
    label_ar: string;
    index: number;
    isTerminal: boolean;
    canProgress: boolean;
    nextStatuses: LabTestStatus[];
}

// ==================== State Machine Functions ====================

/**
 * Check if a transition is valid
 */
export function canTransition(
    from: LabTestStatus,
    to: LabTestStatus
): boolean {
    return LAB_VALID_TRANSITIONS[from].includes(to);
}

/**
 * Get next valid statuses
 */
export function getNextStatuses(current: LabTestStatus): LabTestStatus[] {
    return LAB_VALID_TRANSITIONS[current];
}

/**
 * Get detailed status info
 */
export function getStatusInfo(status: LabTestStatus): LabStatusInfo {
    const index = LAB_STATUS_ORDER.indexOf(status);
    return {
        status,
        label: LAB_STATUS_LABELS[status],
        label_ar: LAB_STATUS_LABELS[status],
        index: index === -1 ? LAB_STATUS_ORDER.length : index,
        isTerminal: LAB_VALID_TRANSITIONS[status].length === 0,
        canProgress: LAB_VALID_TRANSITIONS[status].length > 0,
        nextStatuses: LAB_VALID_TRANSITIONS[status]
    };
}

/**
 * Validate transition with lab test data
 */
export function validateTransition(
    labTest: {
        status: LabTestStatus;
        sample?: { sampleNumber?: string };
        testType?: string;
        parameters?: { result?: string | number }[];
        approvedBy?: string;
        approvalNotes?: string;
    },
    targetStatus?: LabTestStatus
): LabTransitionResult {
    const from = labTest.status;
    const nextStatuses = getNextStatuses(from);
    const to = targetStatus || (nextStatuses.length === 1 ? nextStatuses[0] : null);

    // No target status
    if (!to) {
        if (nextStatuses.length === 0) {
            return {
                isValid: false,
                from,
                to: null,
                blockedReason: 'This is a terminal status',
                blockedReason_ar: 'هذه حالة نهائية'
            };
        }
        return {
            isValid: false,
            from,
            to: null,
            blockedReason: 'Multiple next statuses available - must specify target',
            blockedReason_ar: 'توجد عدة حالات تالية - يجب تحديد الهدف'
        };
    }

    // Check structural validity
    if (!canTransition(from, to)) {
        return {
            isValid: false,
            from,
            to,
            blockedReason: `Cannot transition from ${from} to ${to}`,
            blockedReason_ar: `لا يمكن الانتقال من ${LAB_STATUS_LABELS[from]} إلى ${LAB_STATUS_LABELS[to]}`
        };
    }

    // Check conditions
    const conditions = LAB_TRANSITION_CONDITIONS[from];
    const missingConditions: string[] = [];

    for (const condition of conditions.required) {
        if (condition === 'sample' && !labTest.sample?.sampleNumber) {
            missingConditions.push('sample');
        }
        if (condition === 'testType' && !labTest.testType) {
            missingConditions.push('testType');
        }
        if (condition === 'parameters.hasResults') {
            if (!labTest.parameters || labTest.parameters.length === 0) {
                missingConditions.push('parameters');
            } else {
                const hasAllResults = labTest.parameters.every(
                    p => p.result !== undefined && p.result !== ''
                );
                if (!hasAllResults) {
                    missingConditions.push('parameters_incomplete');
                }
            }
        }
        if (condition === 'reviewer' && !labTest.approvedBy) {
            missingConditions.push('reviewer');
        }
    }

    if (missingConditions.length > 0) {
        return {
            isValid: false,
            from,
            to,
            blockedReason: conditions.description,
            blockedReason_ar: conditions.description_ar,
            missingConditions
        };
    }

    return {
        isValid: true,
        from,
        to
    };
}

/**
 * Get progress percentage
 */
export function getStatusProgress(status: LabTestStatus): number {
    const index = LAB_STATUS_ORDER.indexOf(status);
    if (index === -1) {
        return status === 'rejected' ? 60 : 0; // Rejected is after completed
    }
    return Math.round(((index + 1) / LAB_STATUS_ORDER.length) * 100);
}

/**
 * Check if terminal
 */
export function isTerminal(status: LabTestStatus): boolean {
    return LAB_VALID_TRANSITIONS[status].length === 0;
}

/**
 * Get all statuses with their state relative to current
 */
export function getStatusesWithState(currentStatus: LabTestStatus): Array<{
    status: LabTestStatus;
    label: string;
    state: 'completed' | 'current' | 'pending' | 'skipped';
}> {
    const currentIndex = LAB_STATUS_ORDER.indexOf(currentStatus);
    const isRejected = currentStatus === 'rejected';

    return LAB_STATUS_ORDER.map((status, index) => {
        let state: 'completed' | 'current' | 'pending' | 'skipped';

        if (isRejected && status === 'rejected') {
            state = 'current';
        } else if (isRejected && (status === 'approved' || status === 'released')) {
            state = 'skipped';
        } else if (index < currentIndex) {
            state = 'completed';
        } else if (index === currentIndex) {
            state = 'current';
        } else {
            state = 'pending';
        }

        return { status, label: LAB_STATUS_LABELS[status], state };
    });
}

export default {
    LAB_STATUS_ORDER,
    LAB_STATUS_LABELS,
    LAB_STATUS_COLORS,
    LAB_VALID_TRANSITIONS,
    LAB_TRANSITION_CONDITIONS,
    canTransition,
    getNextStatuses,
    getStatusInfo,
    validateTransition,
    getStatusProgress,
    isTerminal,
    getStatusesWithState
};
