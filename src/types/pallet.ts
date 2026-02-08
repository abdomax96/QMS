/**
 * Pallet Management System - TypeScript Types & Interfaces
 * Comprehensive type definitions for pallet tracking and loading management
 */

// =====================================================
// ENUMS (as const objects for erasableSyntaxOnly compatibility)
// =====================================================

export const PalletStatus = {
    PARTIAL: 'partial',
    COMPLETE: 'complete',
    HOLD: 'hold',
    PARTIAL_HOLD: 'partial_hold',
    LOADED: 'loaded',
    PARTIAL_LOAD: 'partial_load',
    SCRAPPED: 'scrapped',
} as const;
export type PalletStatus = typeof PalletStatus[keyof typeof PalletStatus];

export const BatchStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;
export type BatchStatus = typeof BatchStatus[keyof typeof BatchStatus];

export const HoldStatus = {
    ACTIVE: 'active',
    RELEASED: 'released',
    SCRAPPED: 'scrapped',
    REWORKED: 'reworked',
} as const;
export type HoldStatus = typeof HoldStatus[keyof typeof HoldStatus];

export const DispositionType = {
    SCRAP: 'scrap',
    REWORK: 'rework',
    ACCEPT: 'accept',
} as const;
export type DispositionType = typeof DispositionType[keyof typeof DispositionType];

export const CombinationType = {
    VIRTUAL: 'virtual',
    MERGED: 'merged',
    RENUMBERED: 'renumbered',
} as const;
export type CombinationType = typeof CombinationType[keyof typeof CombinationType];

export const VehicleType = {
    REFRIGERATED: 'refrigerated',
    NON_REFRIGERATED: 'non_refrigerated',
} as const;
export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

export const VehicleStatus = {
    REGISTERED: 'registered',
    INSPECTED: 'inspected',
    LOADING: 'loading',
    LOADED: 'loaded',
    DISPATCHED: 'dispatched',
} as const;
export type VehicleStatus = typeof VehicleStatus[keyof typeof VehicleStatus];

export const InspectionStatus = {
    PENDING: 'pending',
    PASSED: 'passed',
    FAILED: 'failed',
} as const;
export type InspectionStatus = typeof InspectionStatus[keyof typeof InspectionStatus];

export const LoadingStrategy = {
    FIFO: 'fifo',
    LIFO: 'lifo',
    FEFO: 'fefo',
    RANDOM: 'random',
    SPECIFIC: 'specific',
} as const;
export type LoadingStrategy = typeof LoadingStrategy[keyof typeof LoadingStrategy];

export const LoadingOperationStatus = {
    PLANNED: 'planned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;
export type LoadingOperationStatus = typeof LoadingOperationStatus[keyof typeof LoadingOperationStatus];

// =====================================================
// CORE INTERFACES
// =====================================================

export interface PalletBatch {
    id: string;
    batch_number: string;
    company_id: string;
    product_id: string;
    production_date: string;
    expiry_date?: string;
    form_instance_id?: string;
    status: BatchStatus;
    is_rework: boolean;
    parent_batch_id?: string;
    total_pallets: number;
    total_cartons: number;
    notes?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface Pallet {
    id: string;
    pallet_number: string;
    sequence_number: number;
    batch_id: string;
    batch_number?: string;
    shift?: string;
    production_date?: string;
    company_id: string;
    product_id: string;
    standard_cartons_per_pallet: number;
    actual_cartons: number;
    target_cartons: number;
    status: PalletStatus;
    hold_quantity: number;
    ncr_id?: string;
    location?: string;
    notes?: string;
    created_at: string;
    finished_at?: string; // وقت انتهاء إنتاج البالتة
    completed_at?: string;
    released_at?: string;
}

export interface PalletContribution {
    id: string;
    pallet_id: string;
    shift: string;
    shift_date: string;
    form_instance_id?: string;
    cartons_added: number;
    operator_id?: string;
    operator_name?: string;
    added_at: string;
}

export interface PalletBatchSource {
    id: string;
    pallet_id: string;
    source_batch_id: string;
    cartons_from_batch: number;
    is_primary: boolean;
    added_at: string;
    notes?: string;
    source_batch?: {
        batch_number?: string | null;
    };
}

export interface PalletHold {
    id: string;
    pallet_id: string;
    ncr_id: string;
    hold_quantity: number;
    hold_reason?: string;
    status: HoldStatus;
    disposition_type?: DispositionType;
    scrapped_quantity: number;
    accepted_quantity: number;
    reworked_quantity: number;
    disposition_notes?: string;
    held_at: string;
    held_by?: string;
    resolved_at?: string;
    resolved_by?: string;
}

export interface PalletCombination {
    id: string;
    combined_pallet_id: string;
    combination_type: CombinationType;
    description?: string;
    reason?: string;
    created_at: string;
    created_by?: string;
}

export interface PalletCombinationSource {
    id: string;
    combination_id: string;
    source_type: 'pallet' | 'production';
    source_pallet_id?: string;
    cartons_taken: number;
    added_at: string;
}

// =====================================================
// LOADING SYSTEM INTERFACES
// =====================================================

export interface Vehicle {
    id: string;
    company_id: string;
    vehicle_number: string;
    vehicle_type: VehicleType;
    max_capacity_pallets?: number;
    max_capacity_cartons?: number;
    driver_name?: string;
    driver_phone?: string;
    driver_license?: string;
    status: VehicleStatus;
    registered_at: string;
    dispatched_at?: string;
}

export interface VehicleInspection {
    id: string;
    vehicle_id: string;
    cleanliness_status: 'pass' | 'fail';
    temperature_celsius?: number;
    general_condition: 'good' | 'acceptable' | 'poor';
    inspection_notes?: string;
    defects_found?: string[];
    photos_urls?: string[];
    overall_status: InspectionStatus;
    inspected_by?: string;
    inspected_at: string;
    inspector_signature?: string;
}

export interface LoadingOperation {
    id: string;
    vehicle_id: string;
    company_id: string;
    loading_strategy: LoadingStrategy;
    planned_pallets?: number;
    planned_cartons?: number;
    actual_pallets: number;
    actual_cartons: number;
    status: LoadingOperationStatus;
    planned_date: string;
    started_at?: string;
    completed_at?: string;
    created_by?: string;
    loaded_by?: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
}

export interface LoadedPallet {
    id: string;
    loading_operation_id: string;
    pallet_id: string;
    cartons_loaded: number;
    is_partial_load: boolean;
    is_confirmed?: boolean;
    load_sequence?: number;
    loaded_at: string;
    confirmed_at?: string | null;
}

// =====================================================
// SUPPORT INTERFACES
// =====================================================

export interface PalletAuditLog {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
    changes_summary?: string;
    performed_by?: string;
    performed_at: string;
    ip_address?: string;
    metadata?: Record<string, any>;
}

export interface PalletSettings {
    id: string;
    company_id: string;
    allow_multiple_batches_per_pallet: boolean;
    default_loading_strategy: LoadingStrategy;
    allow_partial_pallet_loading: boolean;
    require_inspection_before_loading: boolean;
    auto_complete_pallet_threshold: number;
    enable_low_stock_alerts: boolean;
    enable_expiry_alerts: boolean;
    alert_days_before_expiry: number;
    pallet_number_prefix: string;
    sequence_padding: number;
    updated_at: string;
    updated_by?: string;
}

// =====================================================
// EXTENDED TYPES WITH RELATIONS
// =====================================================

export interface PalletBatchWithRelations extends PalletBatch {
    pallets?: Pallet[];
    product?: {
        id: string;
        name: string;
        code?: string;
    };
    company?: {
        id: string;
        name: string;
    };
}



// =====================================================
// INPUT TYPES FOR API
// =====================================================

export interface CreatePalletBatchInput {
    company_id: string;
    product_id: string;
    batch_number: string;
    manufactured_date: string;
    expiry_date?: string;
    shift?: string;
    target_pallets?: number;
    standard_cartons_per_pallet: number;
    notes?: string;
    is_rework?: boolean;
}

// =====================================================
// SESSION MANAGEMENT (للـ UX Flow الجديد)
// =====================================================

export interface RegistrationSession {
    // السياق
    company_id: string;
    company_name: string;
    product_id: string;
    product_name: string;
    batch_id?: string; // إذا كان batch موجود مسبقاً
    batch_number: string;
    form_instance_id?: string;
    shift: string;
    shift_date: string;

    // الإعدادات
    standard_cartons_per_pallet: number;
    allow_multiple_batches: boolean;

    // البالتات المسجلة في الجلسة
    registered_pallets: Pallet[];

    // Metadata
    started_at: string;
    last_updated: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateSessionRequest {
    company_id: string;
    product_id: string;
    batch_number: string;
    form_instance_id?: string;
    shift: string;
    shift_date?: string;
    use_existing_batch?: boolean;
}

export interface CreateSessionResponse {
    session: RegistrationSession;
    next_pallet_number: string;
}

export interface RegisterPalletRequest {
    session: RegistrationSession;
    cartons: number;
    finished_at?: string; // وقت انتهاء البالتة
    is_partial: boolean;
    continue_existing_pallet_id?: string; // للاستكمال
    notes?: string;
}

export interface RegisterPalletResponse {
    pallet: Pallet;
    contribution: PalletContribution;
    next_pallet_number: string;
}

export interface GetPalletsRequest {
    company_id?: string;
    product_id?: string;
    batch_id?: string;
    status?: PalletStatus | PalletStatus[];
    from_date?: string;
    to_date?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface GetPalletsResponse {
    pallets: PalletWithDetails[];
    total: number;
    page: number;
    limit: number;
}

export interface HoldPalletRequest {
    pallet_id: string;
    ncr_id: string;
    hold_quantity: number;
    hold_reason?: string;
}

export interface DisposePalletHoldRequest {
    hold_id: string;
    disposition_type: DispositionType;
    quantity: number;
    notes?: string;
}

export interface CreateLoadingOperationRequest {
    vehicle_id: string;
    company_id: string;
    loading_strategy: LoadingStrategy;
    planned_pallets?: number;
    planned_cartons?: number;
    notes?: string;
    planned_date?: string;
}

export interface LoadPalletInput {
    loading_operation_id: string;
    pallet_id: string;
    cartons_loaded: number;
    is_partial_load: boolean;
}

export interface SuggestPalletsRequest {
    company_id: string;
    loading_strategy: LoadingStrategy;
    target_pallets?: number;
    target_cartons?: number;
    product_ids?: string[];
}

export interface CreateHoldInput {
    pallet_id: string;
    ncr_id?: string;
    hold_quantity: number;
    hold_reason?: string;
}

export interface ResolveHoldInput {
    hold_id: string;
    disposition_type: DispositionType;
    scrapped_quantity?: number;
    accepted_quantity?: number;
    reworked_quantity?: number;
    disposition_notes?: string;
}

export interface RegisterVehicleInput {
    vehicle_number: string;
    vehicle_type: VehicleType;
    driver_name?: string;
    driver_phone?: string;
    driver_license?: string;
    max_capacity_pallets?: number;
    max_capacity_cartons?: number;
}

export interface VehicleInspectionInput {
    vehicle_id: string;
    cleanliness_status: 'pass' | 'fail';
    temperature_celsius?: number;
    general_condition: 'good' | 'acceptable' | 'poor';
    inspection_notes?: string;
    overall_status: InspectionStatus;
    defects_found?: string[];
    photos_urls?: string[];
}

export interface SuggestPalletsResponse {
    suggested_pallets: PalletWithDetails[];
    total_cartons: number;
    total_pallets: number;
}

// =====================================================
// EXTENDED TYPES (مع معلومات إضافية)
// =====================================================

export interface PalletWithDetails extends Pallet {
    // معلومات مرتبطة
    batch?: PalletBatch;
    company_name?: string;
    product_name?: string;
    contributions?: PalletContribution[];
    batch_sources?: PalletBatchSource[];
    holds?: PalletHold[];

    // حسابات
    completion_percentage: number;
    is_complete: boolean;
    is_held: boolean;
    available_cartons: number;
    // اقتراحات التحميل
    suggested_cartons?: number;
    suggested_partial?: boolean;
}

export interface BatchWithPallets extends PalletBatch {
    pallets: Pallet[];
    product_name?: string;
    company_name?: string;
}

export interface LoadingOperationWithDetails extends LoadingOperation {
    vehicle?: Vehicle;
    inspection?: VehicleInspection;
    loaded_pallets?: (LoadedPallet & { pallet?: Pallet })[];
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type PalletSortField =
    | 'pallet_number'
    | 'created_at'
    | 'finished_at'
    | 'actual_cartons'
    | 'status';

export type SortDirection = 'asc' | 'desc';

export interface PalletFilters {
    company_id?: string;
    product_id?: string;
    batch_id?: string;
    status?: PalletStatus[];
    from_date?: string;
    to_date?: string;
    search?: string;
    has_hold?: boolean;
    min_cartons?: number;
    max_cartons?: number;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sort_by?: PalletSortField;
    sort_direction?: SortDirection;
}

// =====================================================
// CONSTANTS
// =====================================================

export const PALLET_STATUS_LABELS: Record<PalletStatus, { ar: string; en: string; color: string }> = {
    [PalletStatus.PARTIAL]: { ar: 'جزئية', en: 'Partial', color: 'orange' },
    [PalletStatus.COMPLETE]: { ar: 'مكتملة', en: 'Complete', color: 'green' },
    [PalletStatus.HOLD]: { ar: 'محجوزة', en: 'Hold', color: 'yellow' },
    [PalletStatus.PARTIAL_HOLD]: { ar: 'محجوزة جزئياً', en: 'Partial Hold', color: 'yellow' },
    [PalletStatus.LOADED]: { ar: 'محملة', en: 'Loaded', color: 'blue' },
    [PalletStatus.PARTIAL_LOAD]: { ar: 'محملة جزئياً', en: 'Partial Load', color: 'blue' },
    [PalletStatus.SCRAPPED]: { ar: 'مهلكة', en: 'Scrapped', color: 'red' },
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, { ar: string; en: string }> = {
    [BatchStatus.ACTIVE]: { ar: 'نشط', en: 'Active' },
    [BatchStatus.COMPLETED]: { ar: 'مكتمل', en: 'Completed' },
    [BatchStatus.CANCELLED]: { ar: 'ملغي', en: 'Cancelled' },
};

export const LOADING_STRATEGY_LABELS: Record<LoadingStrategy, { ar: string; en: string; description: string }> = {
    [LoadingStrategy.FIFO]: {
        ar: 'الأقدم أولاً',
        en: 'First In, First Out',
        description: 'Load oldest pallets first based on production date',
    },
    [LoadingStrategy.FEFO]: {
        ar: 'الأقرب للانتهاء أولاً',
        en: 'First Expired, First Out',
        description: 'Load pallets closest to expiry first',
    },
    [LoadingStrategy.LIFO]: {
        ar: 'الأحدث أولاً',
        en: 'Last In, First Out',
        description: 'Load newest pallets first',
    },
    [LoadingStrategy.RANDOM]: {
        ar: 'عشوائي',
        en: 'Random/Location-Based',
        description: 'Load based on proximity to loading bay',
    },
    [LoadingStrategy.SPECIFIC]: {
        ar: 'محدد',
        en: 'Specific Selection',
        description: 'Manually select specific pallets',
    },
};

// =====================================================
// STATISTICS TYPES
// =====================================================

export interface PalletStatistics {
    total_batches: number;
    active_batches: number;
    completed_batches: number;
    total_pallets: number;
    pallets_by_status: Record<PalletStatus, number>;
    total_cartons: number;
    average_cartons_per_pallet: number;
    holds_count: number;
    active_holds_count: number;
}

export interface LoadingStatistics {
    total_operations: number;
    operations_by_status: Record<LoadingOperationStatus, number>;
    total_pallets_loaded: number;
    total_cartons_loaded: number;
    average_pallets_per_load: number;
    vehicles_count: number;
}

