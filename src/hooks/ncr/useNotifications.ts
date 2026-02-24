/**
 * useNotifications Hook
 * الاشتراك في الإشعارات وإدارتها
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import notificationService, { type Notification as ServerNotification } from '../../services/notificationService';

interface UiNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string | null;
}

function notificationTimestamp(createdAt: string): number {
    const timestamp = Date.parse(createdAt || '');
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function dedupeUiNotifications(items: UiNotification[]): UiNotification[] {
    const byId = new Map<string, UiNotification>();
    items.forEach((item) => {
        byId.set(item.id, item);
    });

    return Array.from(byId.values())
        .sort((a, b) => notificationTimestamp(b.createdAt) - notificationTimestamp(a.createdAt))
        .slice(0, 50);
}

export function useNotifications() {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Get user ID
    const userId = profile?.uid || '';

    // Fetch + subscribe
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        let unsubscribe: (() => void) | null = null;
        const load = async () => {
            setLoading(true);
            const data = await notificationService.getNotifications(userId, 50, true);
            const normalized: UiNotification[] = data.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                read: n.read,
                createdAt: (n as any).created_at || (n as any).createdAt,
                actionUrl: (n as any).action_url || (n as any).actionUrl || null
            }));
            setNotifications(dedupeUiNotifications(normalized));
            setLoading(false);
            unsubscribe = notificationService.subscribeToNotifications(userId, (notif) => {
                const incoming: UiNotification = {
                    id: notif.id,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    read: notif.read,
                    createdAt: (notif as any).created_at || (notif as any).createdAt,
                    actionUrl: (notif as any).action_url || (notif as any).actionUrl || null
                };

                setNotifications(prev =>
                    dedupeUiNotifications([incoming, ...prev])
                );
            });
        };
        load();

        return () => unsubscribe?.();
    }, [userId]);

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Mark single notification as read
    const handleMarkAsRead = useCallback(async (id: string) => {
        await notificationService.markAsRead([id]);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    // Mark all as read
    const handleMarkAllAsRead = useCallback(async () => {
        if (!userId) return;
        await notificationService.markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, [userId]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead
    };
}
