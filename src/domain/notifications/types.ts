/**
 * Notification Types and DTOs
 */

export type NotificationType = string;

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    linkLabel?: string;
    entityId?: string;
    entityType?: 'ncr' | 'report' | 'user' | 'chat_conversation' | string;
    read: boolean;
    createdAt: string;
    expiresAt?: string;
}

export interface CreateNotificationInput {
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    link?: string;
    linkLabel?: string;
    entityId?: string;
    entityType?: 'ncr' | 'report' | 'user' | 'chat_conversation' | string;
    userId?: string; // Target user (null = all users)
    expiresAt?: string;
}

// Notification Templates
export const NotificationTemplates = {
    ncrCreated: (ncrNumber: string, department: string): CreateNotificationInput => ({
        type: 'ncr_created',
        priority: 'normal',
        title: 'تقرير جديد',
        message: `تم إنشاء تقرير عدم مطابقة جديد ${ncrNumber} في قسم ${department}`,
        linkLabel: 'عرض التقرير'
    }),

    ncrAssigned: (ncrNumber: string, _assigneeName: string): CreateNotificationInput => ({
        type: 'ncr_assigned',
        priority: 'high',
        title: 'تم تعيين تقرير لك',
        message: `تم تعيينك للعمل على التقرير ${ncrNumber}`,
        linkLabel: 'عرض التقرير'
    }),

    ncrStageAdvanced: (ncrNumber: string, stageName: string): CreateNotificationInput => ({
        type: 'ncr_stage_advanced',
        priority: 'normal',
        title: 'تقدم في التقرير',
        message: `انتقل التقرير ${ncrNumber} إلى مرحلة "${stageName}"`,
        linkLabel: 'عرض التقرير'
    }),

    ncrClosed: (ncrNumber: string): CreateNotificationInput => ({
        type: 'ncr_closed',
        priority: 'normal',
        title: 'تم إغلاق التقرير',
        message: `تم إغلاق التقرير ${ncrNumber} بنجاح`,
        linkLabel: 'عرض التقرير'
    }),

    ncrOverdue: (ncrNumber: string, daysOverdue: number): CreateNotificationInput => ({
        type: 'ncr_overdue',
        priority: 'urgent',
        title: 'تقرير متأخر',
        message: `التقرير ${ncrNumber} متأخر بـ ${daysOverdue} يوم`,
        linkLabel: 'عرض التقرير'
    }),

    systemMessage: (title: string, message: string): CreateNotificationInput => ({
        type: 'system',
        priority: 'high',
        title,
        message
    })
};

// Icon mapping
export const NotificationIcons: Record<NotificationType, string> = {
    ncr_created: '📋',
    ncr_assigned: '👤',
    ncr_updated: '✏️',
    ncr_stage_advanced: '⏩',
    ncr_closed: '✅',
    ncr_overdue: '⏰',
    ncr_comment: '💬',
    system: '⚙️',
    task: '📝',
    workflow: '🔄',
    chat_message: '💬',
    chat_mention: '📣',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌'
};

// Color mapping
export const NotificationColors: Record<NotificationPriority, string> = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
};
