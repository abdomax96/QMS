/**
 * NCR State Machine
 * 
 * Enforces valid state transitions for NCR workflow.
 * Per architecture redesign: NCR has 4 logical stages mapped to 5 database stages.
 * 
 * Architecture Stages: initiation, investigation, disposition, closure
 * Database Stages: initial_report, root_cause_analysis, capa_planning, capa_execution, verification_closure
 * 
 * Created: 2025-12-31
 */

// ==================== Stage Definitions ====================

/**
 * NCR database stage codes (matches ncr_reports.current_stage column)
 */
export type NcrDatabaseStage =
    | 'initial_report'
    | 'root_cause_analysis'
    | 'capa_planning'
    | 'capa_execution'
    | 'verification_closure';

/**
 * Stage order for progression
 */
export const NCR_STAGE_ORDER: readonly NcrDatabaseStage[] = [
    'initial_report',
    'root_cause_analysis',
    'capa_planning',
    'capa_execution',
    'verification_closure'
] as const;

/**
 * Stage display names (Arabic)
 */
export const NCR_STAGE_LABELS: Record<NcrDatabaseStage, string> = {
    'initial_report': 'التقرير الأولي',
    'root_cause_analysis': 'تحليل السبب الجذري',
    'capa_planning': 'تخطيط الإجراءات',
    'capa_execution': 'تنفيذ الإجراءات',
    'verification_closure': 'التحقق والإغلاق'
};

// ==================== Transition Rules ====================

/**
 * Valid transitions from each stage
 * Key = current stage, Value = array of valid next stages
 */
export const NCR_VALID_TRANSITIONS: Record<NcrDatabaseStage, NcrDatabaseStage[]> = {
    'initial_report': ['root_cause_analysis'],
    'root_cause_analysis': ['capa_planning'],
    'capa_planning': ['capa_execution'],
    'capa_execution': ['verification_closure'],
    'verification_closure': [] // Terminal stage
};

/**
 * Conditions required to leave each stage
 */
export const NCR_TRANSITION_CONDITIONS: Record<NcrDatabaseStage, {
    required: string[];
    description: string;
    description_ar: string;
}> = {
    'initial_report': {
        required: ['description', 'department', 'severity'],
        description: 'Initial report must have description, department, and severity',
        description_ar: 'يجب أن يحتوي التقرير الأولي على الوصف والقسم والشدة'
    },
    'root_cause_analysis': {
        required: ['rootCauseApproval.status=approved'],
        description: 'Root cause must be proposed and approved by an authorized reviewer',
        description_ar: 'يجب اقتراح السبب الجذري والموافقة عليه من صاحب الصلاحية'
    },
    'capa_planning': {
        required: ['actions.length>0'],
        description: 'At least one CAPA action must be defined',
        description_ar: 'يجب تحديد إجراء تصحيحي/وقائي واحد على الأقل'
    },
    'capa_execution': {
        required: ['actions.allCompleted'],
        description: 'All CAPA actions must be completed',
        description_ar: 'يجب إكمال جميع الإجراءات التصحيحية/الوقائية'
    },
    'verification_closure': {
        required: [], // Terminal stage
        description: 'Terminal stage - NCR is closed',
        description_ar: 'المرحلة النهائية - تم إغلاق التقرير'
    }
};

// ==================== State Machine Result Types ====================

export interface TransitionValidationResult {
    isValid: boolean;
    from: NcrDatabaseStage;
    to: NcrDatabaseStage | null;
    blockedReason?: string;
    blockedReason_ar?: string;
    missingConditions?: string[];
}

export interface StageInfo {
    stage: NcrDatabaseStage;
    label: string;
    label_ar: string;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    canProgress: boolean;
    nextStage: NcrDatabaseStage | null;
    prevStage: NcrDatabaseStage | null;
}

// ==================== State Machine Functions ====================

/**
 * Check if a transition from one stage to another is valid
 */
export function canTransition(
    from: NcrDatabaseStage,
    to: NcrDatabaseStage
): boolean {
    const validNextStages = NCR_VALID_TRANSITIONS[from];
    return validNextStages.includes(to);
}

/**
 * Get the next valid stage (for linear progression)
 */
export function getNextStage(current: NcrDatabaseStage): NcrDatabaseStage | null {
    const currentIndex = NCR_STAGE_ORDER.indexOf(current);
    if (currentIndex === -1 || currentIndex >= NCR_STAGE_ORDER.length - 1) {
        return null;
    }
    return NCR_STAGE_ORDER[currentIndex + 1];
}

/**
 * Get detailed info about a stage
 */
export function getStageInfo(stage: NcrDatabaseStage): StageInfo {
    const index = NCR_STAGE_ORDER.indexOf(stage);
    return {
        stage,
        label: NCR_STAGE_LABELS[stage],
        label_ar: NCR_STAGE_LABELS[stage],
        index,
        isFirst: index === 0,
        isLast: index === NCR_STAGE_ORDER.length - 1,
        canProgress: NCR_VALID_TRANSITIONS[stage].length > 0,
        nextStage: getNextStage(stage),
        prevStage: index > 0 ? NCR_STAGE_ORDER[index - 1] : null
    };
}

/**
 * Validate transition with detailed NCR data check
 * This is the main function for enforcing state machine rules
 */
export function validateTransition(
    ncr: {
        currentStage: NcrDatabaseStage;
        description?: string;
        department?: string;
        severity?: string;
        rootCauseApproval?: { status?: string };
        actions?: { status: string }[];
        verification?: { result?: string };
    },
    targetStage?: NcrDatabaseStage
): TransitionValidationResult {
    const from = ncr.currentStage;
    const to = targetStage || getNextStage(from);

    // No next stage available
    if (!to) {
        return {
            isValid: false,
            from,
            to: null,
            blockedReason: 'Terminal stage - this is the final stage',
            blockedReason_ar: 'هذه هي المرحلة النهائية'
        };
    }

    // Check if transition is structurally valid
    if (!canTransition(from, to)) {
        return {
            isValid: false,
            from,
            to,
            blockedReason: `Cannot transition from ${from} to ${to}`,
            blockedReason_ar: `لا يمكن الانتقال من ${NCR_STAGE_LABELS[from]} إلى ${NCR_STAGE_LABELS[to]}`
        };
    }

    // Check conditions for leaving current stage
    const conditions = NCR_TRANSITION_CONDITIONS[from];
    const missingConditions: string[] = [];

    for (const condition of conditions.required) {
        if (condition === 'description' && !ncr.description) {
            missingConditions.push('description');
        }
        if (condition === 'department' && !ncr.department) {
            missingConditions.push('department');
        }
        if (condition === 'severity' && !ncr.severity) {
            missingConditions.push('severity');
        }
        if (condition === 'rootCauseApproval.status=approved') {
            if (ncr.rootCauseApproval?.status !== 'approved') {
                missingConditions.push('root_cause_approval');
            }
        }
        if (condition === 'actions.length>0') {
            if (!ncr.actions || ncr.actions.length === 0) {
                missingConditions.push('capa_actions');
            }
        }
        if (condition === 'actions.allCompleted') {
            if (!ncr.actions || ncr.actions.length === 0) {
                missingConditions.push('capa_actions');
            } else if (!ncr.actions.every(a => a.status === 'completed')) {
                missingConditions.push('capa_completion');
            }
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
 * Get completion percentage based on current stage
 */
export function getStageProgress(stage: NcrDatabaseStage): number {
    const index = NCR_STAGE_ORDER.indexOf(stage);
    if (index === -1) return 0;
    // Progress should start at 0% for the first stage and end at 100% for the last stage.
    if (NCR_STAGE_ORDER.length <= 1) return 100;
    return Math.round((index / (NCR_STAGE_ORDER.length - 1)) * 100);
}

/**
 * Check if NCR is in a terminal (closed) state
 */
export function isTerminal(stage: NcrDatabaseStage): boolean {
    return NCR_VALID_TRANSITIONS[stage].length === 0;
}

/**
 * Get all stages with their status relative to current stage
 */
export function getStagesWithStatus(currentStage: NcrDatabaseStage): Array<{
    stage: NcrDatabaseStage;
    label: string;
    status: 'completed' | 'current' | 'pending';
}> {
    const currentIndex = NCR_STAGE_ORDER.indexOf(currentStage);

    return NCR_STAGE_ORDER.map((stage, index) => ({
        stage,
        label: NCR_STAGE_LABELS[stage],
        status: index < currentIndex ? 'completed' :
            index === currentIndex ? 'current' : 'pending'
    }));
}

export default {
    NCR_STAGE_ORDER,
    NCR_STAGE_LABELS,
    NCR_VALID_TRANSITIONS,
    NCR_TRANSITION_CONDITIONS,
    canTransition,
    getNextStage,
    getStageInfo,
    validateTransition,
    getStageProgress,
    isTerminal,
    getStagesWithStatus
};
