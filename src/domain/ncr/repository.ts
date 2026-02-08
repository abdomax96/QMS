/**
 * NCR Domain Repository Interface
 * Business-focused operations, NOT generic CRUD
 */

import type {
    CreateNcrInput,
    UpdateNcrInput,
    CloseNcrInput,
    NcrSummaryDto,
    NcrDetailDto,
    NcrStatsDto,
    NcrFilterDto
} from './dtos';

/**
 * NCR Repository Interface
 * Defines business operations for NCR domain
 */
export interface INcrRepository {
    // ============ Query Operations ============

    /**
     * Get NCR details by ID
     */
    findById(id: string): Promise<NcrDetailDto | null>;

    /**
     * Get list of NCRs with filtering
     */
    findAll(filter?: NcrFilterDto): Promise<NcrSummaryDto[]>;

    /**
     * Get NCRs assigned to a specific user
     */
    findByAssignee(userId: string): Promise<NcrSummaryDto[]>;

    /**
     * Get overdue NCRs
     */
    findOverdue(): Promise<NcrSummaryDto[]>;

    /**
     * Get NCR statistics
     */
    getStats(filter?: NcrFilterDto): Promise<NcrStatsDto>;

    /**
     * Get recent NCRs (last N)
     */
    findRecent(limit: number): Promise<NcrSummaryDto[]>;

    /**
     * Search NCRs by text
     */
    search(query: string): Promise<NcrSummaryDto[]>;

    // ============ Command Operations ============

    /**
     * Create new NCR report
     */
    create(input: CreateNcrInput, createdBy: string): Promise<NcrDetailDto>;

    /**
     * Update NCR details
     */
    update(id: string, input: UpdateNcrInput, updatedBy: string): Promise<NcrDetailDto>;

    /**
     * Advance NCR to next stage
     */
    advanceStage(id: string, completedBy: string, notes?: string): Promise<NcrDetailDto>;

    /**
     * Assign NCR to user
     */
    assign(id: string, assigneeId: string, assignedBy: string): Promise<NcrDetailDto>;

    /**
     * Close NCR report
     */
    close(id: string, input: CloseNcrInput): Promise<NcrDetailDto>;

    /**
     * Reopen closed NCR
     */
    reopen(id: string, reopenedBy: string, reason: string): Promise<NcrDetailDto>;

    /**
     * Delete NCR (soft delete)
     */
    delete(id: string, deletedBy: string): Promise<void>;

    // ============ Real-time (optional) ============

    /**
     * Subscribe to NCR list changes
     */
    subscribe?(callback: (ncrs: NcrSummaryDto[]) => void, filter?: NcrFilterDto): () => void;

    /**
     * Subscribe to single NCR changes
     */
    subscribeToOne?(id: string, callback: (ncr: NcrDetailDto | null) => void): () => void;
}

/**
 * NCR Repository Capabilities
 * Used to check what features are available
 */
export interface NcrRepositoryCapabilities {
    supportsRealtime: boolean;
    supportsFullTextSearch: boolean;
    supportsTransactions: boolean;
    supportsOffline: boolean;
}
