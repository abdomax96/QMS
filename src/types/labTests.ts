/**
 * Lab Tests Dynamic System - TypeScript Types
 * نظام فحوصات المعمل الديناميكي - الأنواع
 */

// =====================================================
// Enums
// =====================================================

export type TestFieldType =
    | 'number'
    | 'text'
    | 'select'
    | 'boolean'
    | 'date'
    | 'time'
    | 'datetime'
    | 'file'
    | 'image';

export type TestScheduleType =
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'on_batch'
    | 'on_material_receipt'
    | 'on_work_order_complete'
    | 'custom';

export type FrequencyUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type TestRunStatus =
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'approved'
    | 'rejected'
    | 'cancelled';

export type EvaluationResult = 'pass' | 'fail' | 'warning' | 'na';

export type SpecEvaluationMode =
    | 'range'
    | 'min_only'
    | 'max_only'
    | 'target_tolerance'
    | 'exact';

// =====================================================
// Test Configuration
// =====================================================

export interface LabTestCategory {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon: string;
    color: string;
    display_order: number;
    is_active: boolean;
    company_id: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;
}

export interface LabTestType {
    id: string;
    category_id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon: string;
    color: string;
    display_order: number;
    is_active: boolean;
    company_id: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    category?: LabTestCategory;
}

export interface LabTestConfigSummary {
    id: string;
    name: string;
    name_ar?: string;
}

export interface LabEquipment {
    id: string;
    code?: string;
    name: string;
    name_ar?: string;
    description?: string;
    location?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    is_active: boolean;
    company_id: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    linked_tests?: LabTestConfigSummary[];
}

export interface LabTestConfig {
    id: string;
    test_type_id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    method?: string;
    method_standard?: string;
    equipment_required?: string[];
    estimated_duration_minutes?: number;
    requires_approval: boolean;
    is_active: boolean;
    company_id: string;
    department_id?: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    test_type?: LabTestType;
    fields?: LabTestField[];
    equipment?: LabEquipment[];
}

export interface LabTestField {
    id: string;
    test_config_id: string;
    field_key: string;
    label: string;
    label_ar: string;
    field_type: TestFieldType;
    field_options: FieldOptions;
    display_order: number;
    is_required: boolean;
    default_value?: string;
    is_evaluable: boolean;

    // Specifications
    spec_min_value?: number;
    spec_max_value?: number;
    spec_target_value?: number;
    spec_unit?: string;
    spec_tolerance?: number;
    spec_evaluation_mode: SpecEvaluationMode;

    created_at: string;
}

export interface FieldOptions {
    choices?: { label: string; value: string }[];
    placeholder?: string;
    help_text?: string;
    unit?: string;
    step?: number;
    min?: number;
    max?: number;
}

// =====================================================
// Templates
// =====================================================

export interface LabTestTemplate {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    test_config_ids: string[];
    is_active: boolean;
    company_id: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    test_configs?: LabTestConfig[];
}

// =====================================================
// Scheduling
// =====================================================

export interface LabTestSchedule {
    id: string;
    test_config_id: string;
    schedule_type: TestScheduleType;

    // Time-based config
    frequency_value?: number;
    frequency_unit?: FrequencyUnit;
    start_time?: string;
    end_time?: string;
    days_of_week?: number[];

    // Entity linking
    linked_batch_id?: string;
    linked_product_id?: string;

    // Control
    is_active: boolean;
    paused_at?: string;
    paused_reason?: string;
    paused_by?: string;
    resumed_at?: string;

    // Assignment
    assigned_department_id?: string;
    assigned_user_ids?: string[];

    // Notifications
    notify_before_minutes: number;
    auto_create_run: boolean;

    // Last run
    last_run_at?: string;
    next_run_at?: string;

    company_id: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    test_config?: LabTestConfig;
}

// =====================================================
// Execution
// =====================================================

export interface LabTestRun {
    id: string;
    run_number: string;
    test_config_id: string;
    schedule_id?: string;

    // Status
    status: TestRunStatus;

    // Linking
    linked_batch_id?: string;
    batch_number?: string; // Manual batch number (text)
    linked_product_id?: string;
    linked_work_order_id?: string;
    linked_material_receipt_id?: string;

    // Timing
    scheduled_at?: string;
    started_at?: string;
    completed_at?: string;
    approved_at?: string;
    rejected_at?: string;

    // Personnel
    performed_by?: string;
    performed_by_name?: string;
    approved_by?: string;
    approved_by_name?: string;

    // Results
    field_values: Record<string, any>;
    evaluation_result?: EvaluationResult;
    failed_fields?: string[];

    // Notes
    notes?: string;
    approval_notes?: string;
    rejection_reason?: string;
    attachments?: Attachment[];

    company_id: string;
    department_id?: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;

    // Populated
    test_config?: LabTestConfig;
    schedule?: LabTestSchedule;
}

export interface Attachment {
    name: string;
    url: string;
    type: string;
    size?: number;
}

// =====================================================
// Form Data (for creation/updates)
// =====================================================

export interface CreateTestCategoryData {
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon?: string;
    color?: string;
    display_order?: number;
}

export interface CreateTestTypeData {
    category_id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    icon?: string;
    color?: string;
    display_order?: number;
}

export interface CreateTestConfigData {
    test_type_id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    method?: string;
    method_standard?: string;
    equipment_required?: string[];
    equipment_ids?: string[];
    estimated_duration_minutes?: number;
    requires_approval?: boolean;
    department_id?: string;
    fields: CreateTestFieldData[];
}

export interface CreateLabEquipmentData {
    code?: string;
    name: string;
    name_ar?: string;
    description?: string;
    location?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    is_active?: boolean;
}

export interface CreateTestFieldData {
    field_key: string;
    label: string;
    label_ar: string;
    field_type: TestFieldType;
    field_options?: FieldOptions;
    display_order?: number;
    is_required?: boolean;
    default_value?: string;
    is_evaluable?: boolean;
    spec_min_value?: number;
    spec_max_value?: number;
    spec_target_value?: number;
    spec_unit?: string;
    spec_tolerance?: number;
    spec_evaluation_mode?: SpecEvaluationMode;
}

export interface CreateTestScheduleData {
    test_config_id: string;
    schedule_type: TestScheduleType;
    frequency_value?: number;
    frequency_unit?: FrequencyUnit;
    start_time?: string;
    end_time?: string;
    days_of_week?: number[];
    linked_batch_id?: string;
    linked_product_id?: string;
    assigned_department_id?: string;
    assigned_user_ids?: string[];
    notify_before_minutes?: number;
    auto_create_run?: boolean;
}

export interface CreateTestRunData {
    test_config_id: string;
    schedule_id?: string;
    linked_batch_id?: string;
    linked_product_id?: string;
    linked_work_order_id?: string;
    linked_material_receipt_id?: string;
    scheduled_at?: string;
    notes?: string;
}

export interface SubmitTestRunData {
    field_values: Record<string, any>;
    notes?: string;
    attachments?: Attachment[];
}

export interface ApproveTestRunData {
    approval_notes?: string;
}

export interface RejectTestRunData {
    rejection_reason: string;
}

// =====================================================
// Response Types
// =====================================================

export interface TestConfigWithFields extends LabTestConfig {
    fields: LabTestField[];
}

export interface TestRunWithDetails extends LabTestRun {
    test_config: TestConfigWithFields;
}

export interface QuickEntryDefaults {
    test_config: TestConfigWithFields;
    last_values: Record<string, any>;
    last_run?: LabTestRun;
}

// =====================================================
// Statistics & Reports
// =====================================================

export interface TestStatistics {
    total_runs: number;
    pending: number;
    in_progress: number;
    completed: number;
    approved: number;
    rejected: number;
    pass_rate: number;
    fail_rate: number;
}

export interface TestTrendData {
    date: string;
    field_key: string;
    value: number;
    evaluation_result: EvaluationResult;
}
