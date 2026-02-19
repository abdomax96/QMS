/**
 * Task Types - Supabase Schema
 * أنواع المهام - مخطط قاعدة البيانات
 */

// ============ Stage Workflow ============

export type TaskStage = 'assignment' | 'in_progress' | 'review' | 'approval' | 'closed';

export const TASK_STAGE_ORDER: TaskStage[] = ['assignment', 'in_progress', 'review', 'approval', 'closed'];

export const TASK_STAGE_LABELS: Record<TaskStage, { ar: string; en: string; color: string }> = {
    assignment:  { ar: 'التعيين',     en: 'Assignment',   color: '#3b82f6' },
    in_progress: { ar: 'قيد التنفيذ',  en: 'In Progress',  color: '#8b5cf6' },
    review:      { ar: 'المراجعة',    en: 'Review',       color: '#f59e0b' },
    approval:    { ar: 'الاعتماد',    en: 'Approval',     color: '#10b981' },
    closed:      { ar: 'مغلقة',       en: 'Closed',       color: '#6b7280' },
};

// ============ Assignment Types ============

export type TaskAssignmentType = 'individual' | 'role' | 'department';

export const TASK_ASSIGNMENT_TYPE_LABELS: Record<TaskAssignmentType, { ar: string; en: string }> = {
    individual: { ar: 'إسناد فردي',   en: 'Individual' },
    role:       { ar: 'حسب الدور',    en: 'By Role' },
    department: { ar: 'حسب القسم',    en: 'By Department' },
};

// ============ Stage Actions ============

export type TaskStageAction =
    | 'view' | 'create' | 'assign' | 'delegate'
    | 'update' | 'complete' | 'request_help'
    | 'verify' | 'approve' | 'reject'
    | 'comment' | 'attach' | 'delete';

// ============ Enums ============

export type TaskType =
    | 'general'
    | 'corrective_action'
    | 'preventive_action'
    | 'audit'
    | 'inspection'
    | 'maintenance'
    | 'training'
    | 'documentation'
    | 'review'
    | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus =
    | 'pending'
    | 'in_progress'
    | 'on_hold'
    | 'completed'
    | 'cancelled'
    | 'overdue';

export type TaskCategory = 'general' | 'ncr' | 'quality' | 'maintenance' | 'safety' | 'training' | 'audit';

// ============ Labels ============

export const TASK_TYPE_LABELS: Record<TaskType, { ar: string; en: string }> = {
    general: { ar: 'مهمة عامة', en: 'General' },
    corrective_action: { ar: 'إجراء تصحيحي', en: 'Corrective Action' },
    preventive_action: { ar: 'إجراء وقائي', en: 'Preventive Action' },
    audit: { ar: 'تدقيق', en: 'Audit' },
    inspection: { ar: 'فحص', en: 'Inspection' },
    maintenance: { ar: 'صيانة', en: 'Maintenance' },
    training: { ar: 'تدريب', en: 'Training' },
    documentation: { ar: 'توثيق', en: 'Documentation' },
    review: { ar: 'مراجعة', en: 'Review' },
    other: { ar: 'أخرى', en: 'Other' }
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { ar: string; en: string; color: string }> = {
    low: { ar: 'منخفض', en: 'Low', color: 'gray' },
    medium: { ar: 'متوسط', en: 'Medium', color: 'blue' },
    high: { ar: 'عالي', en: 'High', color: 'orange' },
    urgent: { ar: 'عاجل', en: 'Urgent', color: 'red' }
};

export const TASK_STATUS_LABELS: Record<TaskStatus, { ar: string; en: string; color: string }> = {
    pending: { ar: 'معلق', en: 'Pending', color: 'gray' },
    in_progress: { ar: 'قيد التنفيذ', en: 'In Progress', color: 'blue' },
    on_hold: { ar: 'معلق مؤقتاً', en: 'On Hold', color: 'yellow' },
    completed: { ar: 'مكتمل', en: 'Completed', color: 'green' },
    cancelled: { ar: 'ملغى', en: 'Cancelled', color: 'gray' },
    overdue: { ar: 'متأخر', en: 'Overdue', color: 'red' }
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, { ar: string; en: string }> = {
    general: { ar: 'عامة', en: 'General' },
    ncr: { ar: 'عدم مطابقة', en: 'NCR' },
    quality: { ar: 'جودة', en: 'Quality' },
    maintenance: { ar: 'صيانة', en: 'Maintenance' },
    safety: { ar: 'سلامة', en: 'Safety' },
    training: { ar: 'تدريب', en: 'Training' },
    audit: { ar: 'تدقيق', en: 'Audit' }
};

// ============ Core Interfaces ============

export interface Task {
    id: string;
    task_number?: string;
    title: string;
    description?: string;
    task_type: TaskType;
    category: TaskCategory;
    priority: TaskPriority;
    status: TaskStatus;

    // Stage workflow
    current_stage: TaskStage;
    completed_stages: string[];

    // Assignment
    assignment_type: TaskAssignmentType;
    primary_assignee_id?: string;
    assigned_role_id?: string;
    assigned_department_id?: string;
    assigned_to?: string;
    assigned_to_name?: string;
    assigned_by?: string;
    assigned_by_name?: string;
    assigned_at?: string;

    // Approval
    requires_approval: boolean;
    approved_by?: string;
    approved_by_name?: string;
    approved_at?: string;
    approval_notes?: string;
    rejected_by?: string;
    rejected_at?: string;
    rejection_reason?: string;

    // Dates
    due_date?: string;
    start_date?: string;
    completed_at?: string;

    // Completion
    completed_by?: string;
    completed_by_name?: string;
    completion_notes?: string;

    // Verification
    requires_verification: boolean;
    verified_by?: string;
    verified_by_name?: string;
    verified_at?: string;
    verification_notes?: string;

    // Organization
    department?: string;
    company_id?: string;

    // Related entities
    related_entity_type?: string;
    related_entity_id?: string;
    related_ncr_id?: string;
    related_report_id?: string;
    related_lab_test_id?: string;
    related_lab_test_number?: string;
    related_material_receiving_id?: string;
    related_material_name?: string;
    related_supplier_id?: string;
    related_supplier_name?: string;
    related_control_point_id?: string;

    // Sub-items
    checklist: TaskChecklist[];
    tags: string[];
    estimated_hours?: number;
    actual_hours?: number;
    attachments?: any[];

    // Metadata
    created_at: string;
    updated_at: string;
    created_by?: string;
    created_by_name?: string;
}

export interface TaskAssignment {
    id: string;
    task_id: string;
    user_id: string;
    user_name?: string;
    is_primary: boolean;
    assigned_by?: string;
    assigned_by_name?: string;
    assigned_at: string;
    accepted_at?: string;
    completed_at?: string;
    status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'declined';
    notes?: string;
    company_id: string;
}

export interface TaskChecklist {
    id: string;
    text: string;
    completed: boolean;
    completed_at?: string;
    completed_by?: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    content: string;
    author_id?: string;
    author_name?: string;
    edited: boolean;
    edited_at?: string;
    attachments: any[];
    company_id?: string;
    created_at: string;
}

export interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_path: string;
    file_size?: number;
    file_type?: string;
    uploaded_by?: string;
    uploaded_by_name?: string;
    company_id: string;
    created_at: string;
}

export interface TaskStageHistory {
    id: string;
    task_id: string;
    from_stage?: string;
    to_stage: string;
    action: string;
    changed_by?: string;
    changed_by_name?: string;
    notes?: string;
    metadata?: any;
    company_id: string;
    created_at: string;
}

export interface TaskHistory {
    id: string;
    task_id: string;
    action: string;
    old_value?: any;
    new_value?: any;
    changed_by?: string;
    changed_by_name?: string;
    created_at: string;
}

export interface UserTaskStats {
    user_id: string;
    user_name: string;
    email: string;
    department?: string;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
    avg_completion_hours?: number;
}

// ============ DTOs ============

export interface CreateTaskInput {
    title: string;
    description?: string;
    task_type?: TaskType;
    category?: TaskCategory;
    priority?: TaskPriority;

    // Assignment
    assignment_type: TaskAssignmentType;
    assignee_ids?: string[];
    primary_assignee_id?: string;
    assigned_role_id?: string;
    assigned_department_id?: string;
    assigned_to?: string;

    // Organization
    department?: string;
    company_id?: string;

    // Dates
    due_date?: string;
    start_date?: string;

    // Options
    requires_approval?: boolean;
    requires_verification?: boolean;

    // Sub-items
    checklist?: string[];
    tags?: string[];
    estimated_hours?: number;

    // Related entities
    related_entity_type?: string;
    related_entity_id?: string;
    related_ncr_id?: string;
    related_report_id?: string;
    related_lab_test_id?: string;
    related_lab_test_number?: string;
    related_material_receiving_id?: string;
    related_material_name?: string;
    related_supplier_id?: string;
    related_supplier_name?: string;
    related_control_point_id?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    task_type?: TaskType;
    category?: TaskCategory;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string;
    tags?: string[];
    estimated_hours?: number;
    actual_hours?: number;
    requires_approval?: boolean;
    requires_verification?: boolean;
}

export interface TaskFilters {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    category?: TaskCategory[];
    stage?: TaskStage[];
    assignment_type?: TaskAssignmentType[];
    assignee_id?: string;
    created_by?: string;
    department?: string;
    due_date_from?: string;
    due_date_to?: string;
    search?: string;
}
