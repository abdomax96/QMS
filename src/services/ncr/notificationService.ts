/**
 * Notification Types and Service
 * نظام الإشعارات للتفاعل بين الأقسام
 */

import { supabase } from '../../config/supabase';

const NOTIFICATIONS_TABLE = 'ncr_notifications';

// Notification types
export type NotificationType =
    | 'ncr_created'           // NCR جديد
    | 'ncr_assigned'          // تم تكليفك
    | 'approval_needed'       // مطلوب موافقتك
    | 'root_cause_proposed'   // اقتراح سبب جذري
    | 'root_cause_approved'   // تمت الموافقة على السبب
    | 'root_cause_rejected'   // تم رفض السبب
    | 'capa_assigned'         // تكليف بإجراء CAPA
    | 'capa_due_soon'         // موعد CAPA قريب
    | 'capa_completed'        // اكتمل الإجراء
    | 'stage_changed'         // تغيرت المرحلة
    | 'comment_added'         // تعليق جديد
    | 'ncr_closed';           // تم إغلاق NCR

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    ncrId: string;
    ncrNumber?: string;
    recipientId: string;
    recipientDepartment?: string;
    senderId?: string;
    senderName?: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string;
}

export interface CreateNotificationInput {
    type: NotificationType;
    title: string;
    message: string;
    ncrId: string;
    ncrNumber?: string;
    recipientId: string;
    recipientDepartment?: string;
    senderId?: string;
    senderName?: string;
}

// Create notification
export async function createNotification(input: CreateNotificationInput): Promise<void> {
    await supabase.from(NOTIFICATIONS_TABLE).insert({
        type: input.type,
        title: input.title,
        message: input.message,
        ncr_id: input.ncrId,
        ncr_number: input.ncrNumber,
        recipient_id: input.recipientId,
        recipient_department: input.recipientDepartment,
        sender_id: input.senderId,
        sender_name: input.senderName,
        read: false,
        created_at: new Date().toISOString(),
        action_url: `/ncr/${input.ncrId}`
    });
}

// Create notifications for department
export async function notifyDepartment(
    department: string,
    input: Omit<CreateNotificationInput, 'recipientId'>
): Promise<void> {
    await supabase.from(NOTIFICATIONS_TABLE).insert({
        type: input.type,
        title: input.title,
        message: input.message,
        ncr_id: input.ncrId,
        ncr_number: input.ncrNumber,
        recipient_id: `dept_${department}`,
        recipient_department: department,
        sender_id: input.senderId,
        sender_name: input.senderName,
        read: false,
        created_at: new Date().toISOString(),
        action_url: `/ncr/${input.ncrId}`
    });
}

// Mark as read
export async function markAsRead(notificationId: string): Promise<void> {
    await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq('id', notificationId);
}

// Mark all as read
export async function markAllAsRead(recipientId: string): Promise<void> {
    await supabase.from(NOTIFICATIONS_TABLE)
        .update({ read: true })
        .eq('recipient_id', recipientId)
        .eq('read', false);
}

// Get unread count
export async function getUnreadCount(recipientId: string, department?: string): Promise<number> {
    // Query for personal notifications
    const { count: personalCount } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .eq('read', false);

    let count = personalCount || 0;

    if (department) {
        const { count: deptCount } = await supabase
            .from(NOTIFICATIONS_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('recipient_department', department)
            .eq('read', false);
        count += deptCount || 0;
    }

    return count;
}

// Subscribe to notifications
export function subscribeToNotifications(
    recipientId: string,
    department: string | undefined,
    callback: (notifications: Notification[]) => void
): () => void {
    // Initial load
    const loadNotifications = async () => {
        const recipientIds = [recipientId];
        if (department) recipientIds.push(`dept_${department}`);

        const { data } = await supabase
            .from(NOTIFICATIONS_TABLE)
            .select('id, type, title, message, ncr_id, ncr_number, recipient_id, recipient_department, sender_id, sender_name, read, created_at, action_url')
            .in('recipient_id', recipientIds)
            .order('created_at', { ascending: false })
            .limit(50);

        const notifications: Notification[] = (data || []).map((d: any) => ({
            id: d.id,
            type: d.type,
            title: d.title,
            message: d.message,
            ncrId: d.ncr_id,
            ncrNumber: d.ncr_number,
            recipientId: d.recipient_id,
            recipientDepartment: d.recipient_department,
            senderId: d.sender_id,
            senderName: d.sender_name,
            read: d.read,
            createdAt: d.created_at,
            actionUrl: d.action_url
        }));

        callback(notifications);
    };

    loadNotifications();

    // Subscribe to real-time changes
    const channel = supabase
        .channel('notifications-channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: NOTIFICATIONS_TABLE
            },
            () => {
                loadNotifications();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Helper: Get notification icon based on type
export function getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
        ncr_created: '📄',
        ncr_assigned: '📌',
        approval_needed: '✋',
        root_cause_proposed: '🔍',
        root_cause_approved: '✅',
        root_cause_rejected: '❌',
        capa_assigned: '📋',
        capa_due_soon: '⏰',
        capa_completed: '🎉',
        stage_changed: '➡️',
        comment_added: '💬',
        ncr_closed: '🔒'
    };
    return icons[type] || '🔔';
}
