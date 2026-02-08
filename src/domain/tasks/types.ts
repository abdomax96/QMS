/**
 * Task Management Types & DTOs
 * نظام إدارة المهام - الأنواع والواجهات
 */

import { formatDateWithAppSettings } from '../../hooks/useDateFormat';

// ============ Enums ============

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'general' | 'ncr' | 'quality' | 'maintenance' | 'safety' | 'training' | 'audit';

// ============ Interfaces ============

export interface TaskAssignee {
    userId: string;
    userName: string;
    assignedAt: string;
    assignedBy: string;
}

export interface TaskChecklist {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
}

export interface TaskComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

export interface TaskAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
}

export interface TaskActivity {
    id: string;
    type: 'created' | 'updated' | 'status_changed' | 'assigned' | 'comment' | 'attachment' | 'checklist';
    userId: string;
    userName: string;
    description: string;
    oldValue?: string;
    newValue?: string;
    timestamp: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    category: TaskCategory;

    // Dates
    createdAt: string;
    createdBy: string;
    createdByName: string;
    updatedAt: string;
    dueDate?: string;
    completedAt?: string;

    // Assignments
    assignees: TaskAssignee[];
    department?: string;

    // Related entities - الكيانات المرتبطة
    relatedNcrId?: string;
    relatedReportId?: string;
    relatedLabTestId?: string;          // ربط مع فحص معملي
    relatedLabTestNumber?: string;      // رقم الفحص للعرض
    relatedMaterialReceivingId?: string; // ربط مع استلام مادة
    relatedMaterialName?: string;       // اسم المادة للعرض
    relatedSupplierId?: string;         // ربط مع مورد
    relatedSupplierName?: string;       // اسم المورد للعرض
    relatedControlPointId?: string;     // ربط مع نقطة تحكم (Food Safety)

    // Sub-items
    checklist: TaskChecklist[];
    comments: TaskComment[];
    attachments: TaskAttachment[];
    activities: TaskActivity[];

    // Metadata
    tags?: string[];
    estimatedHours?: number;
    actualHours?: number;
}

// ============ DTOs ============

export interface CreateTaskInput {
    title: string;
    description: string;
    priority: TaskPriority;
    category: TaskCategory;
    dueDate?: string;
    assigneeIds?: string[];
    department?: string;
    relatedNcrId?: string;
    relatedReportId?: string;
    relatedLabTestId?: string;
    relatedLabTestNumber?: string;
    relatedMaterialReceivingId?: string;
    relatedMaterialName?: string;
    relatedSupplierId?: string;
    relatedSupplierName?: string;
    relatedControlPointId?: string;
    checklist?: string[];
    tags?: string[];
    estimatedHours?: number;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    category?: TaskCategory;
    status?: TaskStatus;
    dueDate?: string;
    tags?: string[];
    estimatedHours?: number;
    actualHours?: number;
}

export interface TaskFilters {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    category?: TaskCategory[];
    assigneeId?: string;
    createdBy?: string;
    department?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
}

// ============ Helper Functions ============

export const taskStatusLabels: Record<TaskStatus, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    review: 'قيد المراجعة',
    completed: 'مكتمل',
    cancelled: 'ملغي'
};

export const taskStatusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300' },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' },
    review: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300' },
    completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', border: 'border-green-300' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', border: 'border-red-300' }
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'مرتفعة',
    urgent: 'عاجلة'
};

export const taskPriorityColors: Record<TaskPriority, { bg: string; text: string }> = {
    low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    medium: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-400' },
    urgent: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' }
};

export const taskCategoryLabels: Record<TaskCategory, string> = {
    general: 'عامة',
    ncr: 'عدم مطابقة',
    quality: 'جودة',
    maintenance: 'صيانة',
    safety: 'سلامة',
    training: 'تدريب',
    audit: 'تدقيق'
};

export const taskCategoryIcons: Record<TaskCategory, string> = {
    general: 'clipboard-document-list',
    ncr: 'exclamation-triangle',
    quality: 'check-badge',
    maintenance: 'wrench-screwdriver',
    safety: 'shield-check',
    training: 'academic-cap',
    audit: 'document-magnifying-glass'
};

// Calculate task progress
export function getTaskProgress(task: Task): number {
    if (task.checklist.length === 0) return 0;
    const completed = task.checklist.filter(item => item.completed).length;
    return Math.round((completed / task.checklist.length) * 100);
}

// Check if task is overdue
export function isTaskOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDate) < new Date();
}

// Get days until due
export function getDaysUntilDue(task: Task): number | null {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format time ago
export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDateWithAppSettings(date);
}

// Generate unique ID
export function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
