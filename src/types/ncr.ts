/**
 * NCR Types
 * أنواع تقارير عدم المطابقة
 */

// ============ Workflow Stages ============

export interface WorkflowStage {
    id: string;
    name: string;
    name_en: string;
    order: number;
    color: string;
    bgColor: string;
    icon?: string;
    description?: string;
}

export const WORKFLOW_STAGES: Record<string, WorkflowStage> = {
    initial_report: {
        id: 'initial_report',
        name: 'التقرير الأولي',
        name_en: 'Initial Report',
        order: 1,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'تم إنشاء التقرير'
    },
    root_cause_analysis: {
        id: 'root_cause_analysis',
        name: 'تحليل السبب الجذري',
        name_en: 'Root Cause Analysis',
        order: 2,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        description: 'جاري التحقيق في السبب الجذري'
    },
    capa_planning: {
        id: 'capa_planning',
        name: 'تخطيط CAPA',
        name_en: 'CAPA Planning',
        order: 3,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        description: 'تخطيط الإجراءات التصحيحية والوقائية'
    },
    capa_execution: {
        id: 'capa_execution',
        name: 'تنفيذ CAPA',
        name_en: 'CAPA Execution',
        order: 4,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'تنفيذ الإجراءات التصحيحية'
    },
    verification_closure: {
        id: 'verification_closure',
        name: 'التحقق والإغلاق',
        name_en: 'Verification & Closure',
        order: 5,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'التحقق من الفعالية وإغلاق التقرير'
    }
};

// Legacy stage mapping for backward compatibility
export const LEGACY_WORKFLOW_STAGES: Record<string, WorkflowStage> = {
    detection: WORKFLOW_STAGES.initial_report,
    investigation: WORKFLOW_STAGES.root_cause_analysis,
    correction: WORKFLOW_STAGES.capa_execution,
    verification: WORKFLOW_STAGES.verification_closure,
    closure: WORKFLOW_STAGES.verification_closure
};

// ============ Type Definitions ============

export type NcrSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NcrStatus = 'open' | 'analysis' | 'action' | 'verification' | 'closed' | 'cancelled';

export type NcrStage = 'initial_report' | 'root_cause_analysis' | 'capa_planning' | 'capa_execution' | 'verification_closure';

export type NcrCategory =
    | 'product_quality'
    | 'process_deviation'
    | 'equipment_failure'
    | 'documentation'
    | 'food_safety'
    | 'hygiene'
    | 'supplier'
    | 'customer_complaint'
    | 'other';

// ============ Sub-interfaces ============

export interface NcrAttachment {
    id: string;
    fileName: string;
    storagePath: string;
    downloadURL: string;
    uploadedAt: string;
}

export interface CapaAction {
    id: string;
    type: 'corrective' | 'preventive';
    description: string;
    responsibleDept: string;
    responsiblePerson: string;
    targetDate: string;
    status: 'pending' | 'in-progress' | 'completed';
}

export interface NcrHold {
    id: string;
    type: string;
    quantity: string;
    unit: string;
    location: string;
    status: 'held' | 'released' | 'disposed';
    heldAt: string;
    heldBy: string;
    releasedAt?: string;
    releasedBy?: string;
    notes?: string;
}

export interface NcrVerification {
    verifiedBy: string;
    date: string;
    notes: string;
    result: 'success' | 'fail';
}

export interface RootCauseApproval {
    proposedBy: string;
    proposedByName: string;
    proposedByEmail: string;
    proposedByRole: 'department' | 'quality';
    proposedAt: string;
    rootCauseText: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedByEmail?: string;
    reviewedByRole?: 'department' | 'quality';
    reviewedAt?: string;
    rejectionReason?: string;
}

export interface StageHistoryEntry {
    from: string | null;
    to: string;
    transitionedBy: string;
    transitionedByName: string;
    transitionedByEmail: string;
    transitionedAt: string;
    notes?: string;
}

// ============ Main NCR Record Interface ============

/**
 * NcrRecord - Full NCR record as used by the application
 * This matches the schema of the ncr_reports table after consolidation
 */
export interface NcrRecord {
    // Identity
    id: string;
    number: string;

    // Core Fields
    date: string;
    shift?: 'A' | 'B' | 'C';
    department: string;
    title?: string;
    productName?: string;
    lineOrArea?: string;
    reservedQty?: string;
    reservedUnit?: string;
    defectId?: string;
    defectType?: 'raw_material' | 'product' | 'process' | 'other';
    occurrence?: number;
    detection?: number;
    rpn?: number;
    riskBand?: string;
    severity: 'low' | 'medium' | 'high';
    standardDefect?: string;
    customType?: string;
    discoveredBy: string;
    createdBy: string;
    description: string;
    immediateAction?: string;

    // Status & Workflow
    status: NcrStatus;
    currentStage: NcrStage;
    completedStages: NcrStage[];
    stageHistory: StageHistoryEntry[];

    // Root Cause
    rootCause?: string;
    rootCauseApproval?: RootCauseApproval;

    // CAPA & Holds
    actions: CapaAction[];
    holds: NcrHold[];

    // Verification
    verification?: NcrVerification;

    // Attachments
    attachments: NcrAttachment[];

    // Timestamps
    createdAt: string;
    updatedAt: string;
    closedAt?: string;

    // Integration Links (Lab → NCR auto-generation)
    relatedLabTestId?: string;
    relatedLabTestNumber?: string;
    relatedMaterialReceivingId?: string;
    relatedMaterialName?: string;
    relatedBatchNumber?: string;
    relatedSupplierId?: string;
    relatedSupplierName?: string;
    autoGeneratedFromLab?: boolean;

    // Multi-tenancy
    companyId?: string;

    // Document Integration
    documentId?: string;
    documentTitle?: string;
}

// ============ Legacy Compatibility Interface ============

/**
 * LegacyNcrRecord - For backward compatibility with older code
 * @deprecated Use NcrRecord instead
 */
export interface LegacyNcrRecord {
    id: string;
    ncrNumber: string;
    title: string;
    description: string;
    category: NcrCategory;
    severity: NcrSeverity;
    currentStage: string;
    detectedBy: string;
    detectedAt: string;
    department: string;
    affectedProduct?: string;
    affectedBatch?: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    closedAt?: string;
    closedBy?: string;
    attachments?: string[];
    stageHistory?: { stage: string; enteredAt: string; enteredBy: string; notes?: string; exitedAt?: string; }[];
    companyId?: string;
    createdAt: string;
    updatedAt: string;
}

// ============ Utility Functions ============

/**
 * Convert severity to display text
 */
export function getSeverityLabel(severity: NcrSeverity | 'low' | 'medium' | 'high'): string {
    const labels: Record<string, string> = {
        low: 'منخفض',
        medium: 'متوسط',
        high: 'مرتفع',
        critical: 'حرج'
    };
    return labels[severity] || severity;
}

/**
 * Get stage display info
 */
export function getStageInfo(stage: string): WorkflowStage {
    return WORKFLOW_STAGES[stage] || LEGACY_WORKFLOW_STAGES[stage] || {
        id: stage,
        name: stage,
        name_en: stage,
        order: 0,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
    };
}

/**
 * Check if NCR is overdue (more than 7 days old and not closed)
 */
export function isNcrOverdue(ncr: NcrRecord, daysThreshold: number = 7): boolean {
    if (ncr.status === 'closed' || ncr.status === 'cancelled') return false;
    const createdDate = new Date(ncr.date || ncr.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > daysThreshold;
}

export type StageTransition = StageHistoryEntry;

export interface DefectCatalogItem {
    id: string;
    category: string;
    name: string;
    description?: string;
    isActive: boolean;
}

export interface UserProfile {
    name: string;
    title?: string;
    id?: string;
    email?: string;
    fullName?: string;
    role?: string;
    department?: string;
    avatarUrl?: string;
    isActive?: boolean;
}

export interface PermissionMatrix {
    [role: string]: {
        [permission: string]: boolean;
    };
}

export interface SystemSettings {
    // Flat structure to match settingsService.ts
    departments: string[];
    users: UserProfile[];
    defectCatalog: DefectCatalogItem[];
    products: string[];
    lines: string[];
    units: string[];
    qualityDepartments: string[];

    // Optional / Meta
    lastBackupAt?: string | null;
    permissionMatrix?: PermissionMatrix;
    holdsDisposalPolicy?: 'warning' | 'block';

    // NCR document print metadata
    ncrDocumentMeta?: {
        docCode: string;
        issueNo: string;
        revisionNo: string;
        issueDate: string;
        reviewDate: string;
    };

    // Legacy/Nested structure support (optional if needed, but primary is flat)
    general?: {
        companyName: string;
        timezone: string;
        dateFormat: string;
    };
    ncr?: {
        autoNumbering: boolean;
        prefix: string;
        defaultDeadlineDays: number;
    };
    notifications?: {
        emailEnabled: boolean;
        inAppEnabled: boolean;
    };
}
