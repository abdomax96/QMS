/**
 * Notification Service
 * خدمة الإشعارات
 * 
 * Features:
 * - CRUD operations for notifications
 * - Real-time subscription support
 * - User preferences management
 * - Template-based notification creation
 * 
 * Created: 2025-12-31
 */

import { supabase } from '../config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ==================== Types ====================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task' | 'workflow';
export type NotificationCategory = 'system' | 'ncr' | 'lab' | 'task' | 'approval' | 'alert';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    title_ar?: string;
    message: string;
    message_ar?: string;
    type: NotificationType;
    category: NotificationCategory;
    entity_type?: string;
    entity_id?: string;
    action_url?: string;
    read: boolean;
    read_at?: string;
    created_at: string;
    expires_at?: string;
    sender_id?: string;
    sender_name?: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    category_settings: Record<NotificationCategory, {
        enabled: boolean;
        email: boolean;
        push: boolean;
    }>;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    daily_digest_enabled: boolean;
    digest_time: string;
}

export interface CreateNotificationParams {
    userId: string;
    title: string;
    titleAr?: string;
    message: string;
    messageAr?: string;
    type?: NotificationType;
    category?: NotificationCategory;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
    senderId?: string;
    senderName?: string;
    expiresAt?: string;
}

export interface CreateFromTemplateParams {
    templateCode: string;
    userId: string;
    entityType?: string;
    entityId?: string;
    variables?: Record<string, string>;
    senderId?: string;
    senderName?: string;
}

// ==================== Service ====================

class NotificationService {
    private activeSubscription: RealtimeChannel | null = null;

    /**
     * Get all notifications for the current user
     */
    async getNotifications(userId: string, limit: number = 50, includeRead: boolean = true): Promise<Notification[]> {
        let query = supabase
            .from('notifications')
            .select('id, user_id, title, title_ar, message, message_ar, type, category, entity_type, entity_id, action_url, read, read_at, created_at, sender_name')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!includeRead) {
            query = query.eq('read', false);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }

        return count || 0;
    }

    /**
     * Get a single notification by ID
     */
    async getNotificationById(id: string): Promise<Notification | null> {
        const { data, error } = await supabase
            .from('notifications')
            .select('id, user_id, title, title_ar, message, message_ar, type, category, entity_type, entity_id, action_url, read, read_at, created_at, expires_at, sender_id, sender_name')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching notification:', error);
            return null;
        }

        return data;
    }

    /**
     * Create a new notification
     */
    async createNotification(params: CreateNotificationParams): Promise<Notification | null> {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: params.userId,
                title: params.title,
                title_ar: params.titleAr,
                message: params.message,
                message_ar: params.messageAr,
                type: params.type || 'info',
                category: params.category || 'system',
                entity_type: params.entityType,
                entity_id: params.entityId,
                action_url: params.actionUrl,
                sender_id: params.senderId,
                sender_name: params.senderName,
                expires_at: params.expiresAt
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            return null;
        }

        return data;
    }

    /**
     * Create notification from template
     */
    async createFromTemplate(params: CreateFromTemplateParams): Promise<string | null> {
        const { data, error } = await supabase.rpc('create_notification_from_template', {
            p_template_code: params.templateCode,
            p_user_id: params.userId,
            p_entity_type: params.entityType || null,
            p_entity_id: params.entityId || null,
            p_variables: params.variables || {},
            p_sender_id: params.senderId || null,
            p_sender_name: params.senderName || null
        });

        if (error) {
            console.error('Error creating notification from template:', error);
            return null;
        }

        return data;
    }

    /**
     * Mark notifications as read
     */
    async markAsRead(notificationIds: string[]): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .in('id', notificationIds);

        if (error) {
            console.error('Error marking notifications as read:', error);
            return false;
        }

        return true;
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('read', false)
            .eq('user_id', userId);

        if (error) {
            console.error('Error marking all as read:', error);
            return false;
        }

        return true;
    }

    /**
     * Delete a notification
     */
    async deleteNotification(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting notification:', error);
            return false;
        }

        return true;
    }

    /**
     * Delete all read notifications
     */
    async deleteAllRead(): Promise<boolean> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('read', true);

        if (error) {
            console.error('Error deleting read notifications:', error);
            return false;
        }

        return true;
    }

    // ==================== Preferences ====================

    /**
     * Get user notification preferences
     */
    async getPreferences(): Promise<NotificationPreferences | null> {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('id, user_id, email_enabled, push_enabled, in_app_enabled, category_settings, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, daily_digest_enabled, digest_time')
            .single();

        if (error) {
            // If no preferences exist, create defaults
            if (error.code === 'PGRST116') {
                return this.createDefaultPreferences();
            }
            console.error('Error fetching preferences:', error);
            return null;
        }

        return data;
    }

    /**
     * Create default preferences for user
     */
    private async createDefaultPreferences(): Promise<NotificationPreferences | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('notification_preferences')
            .insert({
                user_id: user.id,
                email_enabled: true,
                push_enabled: true,
                in_app_enabled: true,
                category_settings: {
                    system: { enabled: true, email: false, push: true },
                    ncr: { enabled: true, email: true, push: true },
                    lab: { enabled: true, email: true, push: true },
                    task: { enabled: true, email: true, push: true },
                    approval: { enabled: true, email: true, push: true },
                    alert: { enabled: true, email: true, push: true }
                }
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating default preferences:', error);
            return null;
        }

        return data;
    }

    /**
     * Update user preferences
     */
    async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
        const { error } = await supabase
            .from('notification_preferences')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (error) {
            console.error('Error updating preferences:', error);
            return false;
        }

        return true;
    }

    // ==================== Real-time Subscriptions ====================

    /**
     * Subscribe to real-time notification updates
     */
    subscribeToNotifications(
        userId: string,
        callback: (notification: Notification) => void
    ): () => void {
        // Unsubscribe from any existing subscription
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }

        this.activeSubscription = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const notif = payload.new as Notification;
                    if (notif.user_id === userId) {
                        callback(notif);
                    }
                }
            )
            .subscribe();

        // Return unsubscribe function
        return () => {
            if (this.activeSubscription) {
                this.activeSubscription.unsubscribe();
                this.activeSubscription = null;
            }
        };
    }

    // ==================== Notification Helpers ====================

    /**
     * Send NCR notification to relevant users
     */
    async notifyNcrCreated(
        ncrNumber: string,
        ncrId: string,
        description: string,
        departmentUserIds: string[]
    ): Promise<void> {
        for (const userId of departmentUserIds) {
            await this.createFromTemplate({
                templateCode: 'ncr_created',
                userId,
                entityType: 'ncr',
                entityId: ncrId,
                variables: {
                    number: ncrNumber,
                    description: description.substring(0, 100)
                }
            });
        }
    }

    /**
     * Send task assignment notification
     */
    async notifyTaskAssigned(
        taskId: string,
        taskTitle: string,
        assigneeId: string,
        assignerName: string
    ): Promise<void> {
        await this.createFromTemplate({
            templateCode: 'task_assigned',
            userId: assigneeId,
            entityType: 'task',
            entityId: taskId,
            variables: { title: taskTitle },
            senderName: assignerName
        });
    }

    /**
     * Send approval required notification
     */
    async notifyApprovalRequired(
        entityType: string,
        entityId: string,
        entityNumber: string,
        approverIds: string[]
    ): Promise<void> {
        for (const approverId of approverIds) {
            await this.createFromTemplate({
                templateCode: 'ncr_approval_required',
                userId: approverId,
                entityType,
                entityId,
                variables: { number: entityNumber }
            });
        }
    }

    /**
     * Send lab test completed notification
     */
    async notifyLabTestCompleted(
        testId: string,
        testNumber: string,
        reviewerIds: string[]
    ): Promise<void> {
        for (const reviewerId of reviewerIds) {
            await this.createFromTemplate({
                templateCode: 'lab_test_completed',
                userId: reviewerId,
                entityType: 'lab_test',
                entityId: testId,
                variables: { testNumber }
            });
        }
    }
}

export const notificationService = new NotificationService();
export default notificationService;
