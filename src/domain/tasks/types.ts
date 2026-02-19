/**
 * Task Management Domain Types & Helpers
 * نظام إدارة المهام - الأنواع والدوال المساعدة
 */

import { formatDateWithAppSettings } from '../../hooks/useDateFormat';

// Re-export all types from the main types file
export type {
    Task,
    TaskAssignment,
    TaskChecklist,
    TaskComment,
    TaskAttachment,
    TaskStageHistory,
    TaskHistory,
    UserTaskStats,
    CreateTaskInput,
    UpdateTaskInput,
    TaskFilters,
    TaskStage,
    TaskStageAction,
    TaskAssignmentType,
    TaskType,
    TaskPriority,
    TaskStatus,
    TaskCategory,
} from '../../types/task';

export {
    TASK_STAGE_ORDER,
    TASK_STAGE_LABELS,
    TASK_ASSIGNMENT_TYPE_LABELS,
    TASK_TYPE_LABELS,
    TASK_PRIORITY_LABELS,
    TASK_STATUS_LABELS,
    TASK_CATEGORY_LABELS,
} from '../../types/task';

// ============ UI Style Maps ============

export const taskStatusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    on_hold: 'معلق مؤقتاً',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    overdue: 'متأخر',
};

export const taskStatusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300' },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' },
    on_hold: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300' },
    completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', border: 'border-green-300' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', border: 'border-red-300' },
    overdue: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', border: 'border-red-300' },
};

export const taskStageColors: Record<string, { bg: string; text: string; border: string }> = {
    assignment: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' },
    in_progress: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300' },
    review: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300' },
    approval: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300' },
    closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300' },
};

export const taskStageLabels: Record<string, string> = {
    assignment: 'التعيين',
    in_progress: 'قيد التنفيذ',
    review: 'المراجعة',
    approval: 'الاعتماد',
    closed: 'مغلقة',
};

export const taskPriorityLabels: Record<string, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'مرتفعة',
    urgent: 'عاجلة'
};

export const taskPriorityColors: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    medium: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-400' },
    urgent: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' }
};

export const taskCategoryLabels: Record<string, string> = {
    general: 'عامة',
    ncr: 'عدم مطابقة',
    quality: 'جودة',
    maintenance: 'صيانة',
    safety: 'سلامة',
    training: 'تدريب',
    audit: 'تدقيق'
};

export const taskCategoryIcons: Record<string, string> = {
    general: 'clipboard-document-list',
    ncr: 'exclamation-triangle',
    quality: 'check-badge',
    maintenance: 'wrench-screwdriver',
    safety: 'shield-check',
    training: 'academic-cap',
    audit: 'document-magnifying-glass'
};

// ============ Helper Functions ============

import type { Task, TaskStage } from '../../types/task';
import { TASK_STAGE_ORDER } from '../../types/task';

/** Calculate task checklist progress */
export function getTaskProgress(task: Task): number {
    if (!task.checklist || task.checklist.length === 0) return 0;
    const completed = task.checklist.filter(item => item.completed).length;
    return Math.round((completed / task.checklist.length) * 100);
}

/** Check if task is overdue */
export function isTaskOverdue(task: Task): boolean {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
}

/** Get days until due */
export function getDaysUntilDue(task: Task): number | null {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/** Get next stage in workflow */
export function getNextStage(currentStage: TaskStage): TaskStage | null {
    const idx = TASK_STAGE_ORDER.indexOf(currentStage);
    if (idx < 0 || idx >= TASK_STAGE_ORDER.length - 1) return null;
    return TASK_STAGE_ORDER[idx + 1];
}

/** Get previous stage in workflow */
export function getPreviousStage(currentStage: TaskStage): TaskStage | null {
    const idx = TASK_STAGE_ORDER.indexOf(currentStage);
    if (idx <= 0) return null;
    return TASK_STAGE_ORDER[idx - 1];
}

/** Check if a stage is completed */
export function isStageCompleted(stage: TaskStage, completedStages: string[]): boolean {
    return completedStages.includes(stage);
}

/** Get stage index for progress calculation */
export function getStageIndex(stage: TaskStage): number {
    return TASK_STAGE_ORDER.indexOf(stage);
}

/** Format time ago */
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

/** Generate unique ID (for local use only, DB uses gen_random_uuid) */
export function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
