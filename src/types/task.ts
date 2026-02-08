/**
 * Task Types
 * أنواع المهام
 */

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

export interface Task {
    id: string;
    title: string;
    description?: string;
    task_number?: string;
    task_type: TaskType;
    priority: TaskPriority;
    status: TaskStatus;

    // Assignment
    assigned_to?: string;
    assigned_to_name?: string;
    assigned_by?: string;
    assigned_by_name?: string;
    assigned_at?: string;

    // Organization
    department?: string;
    company_id?: string;

    // Related Entity
    related_entity_type?: string;
    related_entity_id?: string;

    // Dates
    due_date?: string;
    start_date?: string;
    completed_at?: string;

    // Completion
    completion_notes?: string;
    completed_by?: string;
    completed_by_name?: string;

    // Verification
    requires_verification: boolean;
    verified_by?: string;
    verified_by_name?: string;
    verified_at?: string;
    verification_notes?: string;

    // Attachments
    attachments?: any[];

    // Metadata
    created_at: string;
    updated_at: string;
    created_by?: string;
    created_by_name?: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    content: string;
    author_id?: string;
    author_name?: string;
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

export interface CreateTaskInput {
    title: string;
    description?: string;
    task_type?: TaskType;
    priority?: TaskPriority;
    assigned_to?: string;
    department?: string;
    company_id?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    due_date?: string;
    start_date?: string;
    requires_verification?: boolean;
}
