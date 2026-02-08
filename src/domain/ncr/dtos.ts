/**
 * NCR Domain DTOs (Data Transfer Objects)
 * Separates business logic from data layer
 */

// ============ Input DTOs (what comes from UI) ============

export interface CreateNcrInput {
    number: string;
    department: string;
    date: string;
    discoveredBy: string;
    description: string;
    product?: string;
    batchNumber?: string;
    quantity?: number;
    severity: 'low' | 'medium' | 'high';
    source: string;
    defectType: string;
    immediateAction?: string;
}

export interface UpdateNcrInput {
    description?: string;
    severity?: 'low' | 'medium' | 'high';
    immediateAction?: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    assignedTo?: string;
    dueDate?: string;
}

export interface CloseNcrInput {
    closedBy: string;
    closureNotes?: string;
    verificationDate?: string;
}

// ============ Output DTOs (what goes to UI) ============

export interface NcrSummaryDto {
    id: string;
    number: string;
    department: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'pending_verification' | 'closed';
    daysOpen: number;
    isOverdue: boolean;
}

export interface NcrDetailDto extends NcrSummaryDto {
    discoveredBy: string;
    description: string;
    product?: string;
    batchNumber?: string;
    quantity?: number;
    source: string;
    defectType: string;
    immediateAction?: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    assignedTo?: string;
    dueDate?: string;
    closedAt?: string;
    closedBy?: string;
    closureNotes?: string;
    currentStage: number;
    stages: NcrStageDto[];
    createdAt: string;
    updatedAt: string;
}

export interface NcrStageDto {
    name: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
}

export interface NcrStatsDto {
    total: number;
    open: number;
    inProgress: number;
    pendingVerification: number;
    closed: number;
    highSeverity: number;
    overdue: number;
    avgResolutionDays: number;
}

export interface NcrFilterDto {
    department?: string;
    status?: 'open' | 'closed' | '';
    severity?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    assignedTo?: string;
}

// ============ Mappers ============

export function mapToNcrStatus(closedAt?: string, currentStage?: number): NcrSummaryDto['status'] {
    if (closedAt) return 'closed';
    if (currentStage && currentStage >= 4) return 'pending_verification';
    if (currentStage && currentStage >= 2) return 'in_progress';
    return 'open';
}

export function calculateDaysOpen(date: string, closedAt?: string): number {
    const start = new Date(date);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate?: string, closedAt?: string): boolean {
    if (!dueDate || closedAt) return false;
    return new Date(dueDate) < new Date();
}
