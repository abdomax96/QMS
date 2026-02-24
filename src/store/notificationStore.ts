/**
 * Notification Store
 * Unified notification state backed by Supabase + realtime.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, CreateNotificationInput } from '../domain/notifications/types';
import { notificationSound } from '../utils/notificationSound';
import notificationService, { type Notification as ServerNotification } from '../services/notificationService';

interface NotificationState {
    userId: string | null;
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    soundEnabled: boolean;

    // Actions
    initialize: (userId: string | null) => Promise<void>;
    refresh: () => Promise<void>;
    addNotification: (notification: CreateNotificationInput) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
    setSoundEnabled: (enabled: boolean) => void;
}

let unsubscribeRealtime: (() => void) | null = null;
const MAX_NOTIFICATIONS = 50;
const NOTIFICATION_DEDUP_WINDOW_MS = 30_000;

function resolvePriorityFromType(type?: string): Notification['priority'] {
    switch (type) {
        case 'error':
            return 'urgent';
        case 'warning':
            return 'high';
        case 'ncr_assigned':
        case 'ncr_overdue':
        case 'chat_mention':
            return 'high';
        case 'success':
            return 'low';
        default:
            return 'normal';
    }
}

function mapServerNotification(server: ServerNotification): Notification {
    return {
        id: server.id,
        type: server.type || 'info',
        priority: resolvePriorityFromType(server.type),
        title: server.title || 'إشعار',
        message: server.message || '',
        link: server.action_url || undefined,
        entityId: server.entity_id || undefined,
        entityType: (server.entity_type as Notification['entityType']) || undefined,
        read: Boolean(server.read),
        createdAt: server.created_at,
        expiresAt: server.expires_at || undefined
    };
}

function normalizeNotificationText(value?: string): string {
    return (value || '').trim();
}

function notificationTimestamp(notification: Notification): number {
    const timestamp = Date.parse(notification.createdAt || '');
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildNotificationDedupKey(notification: Notification): string {
    return [
        notification.type,
        normalizeNotificationText(notification.title),
        normalizeNotificationText(notification.message),
        notification.entityType || '',
        notification.entityId || '',
        notification.link || '',
    ].join('|');
}

function dedupeNotifications(notifications: Notification[]): Notification[] {
    const sorted = [...notifications].sort(
        (a, b) => notificationTimestamp(b) - notificationTimestamp(a)
    );

    const deduped: Notification[] = [];
    const seenIds = new Set<string>();
    const latestByKey = new Map<string, number>();

    for (const notification of sorted) {
        if (seenIds.has(notification.id)) {
            continue;
        }
        seenIds.add(notification.id);

        const key = buildNotificationDedupKey(notification);
        const currentTs = notificationTimestamp(notification);
        const latestTs = latestByKey.get(key);

        if (
            latestTs !== undefined &&
            latestTs - currentTs <= NOTIFICATION_DEDUP_WINDOW_MS
        ) {
            continue;
        }

        latestByKey.set(key, currentTs);
        deduped.push(notification);

        if (deduped.length >= MAX_NOTIFICATIONS) {
            break;
        }
    }

    return deduped;
}

function playSoundIfNeeded(enabled: boolean, notification: Notification): void {
    if (enabled && !notification.read) {
        notificationSound.play();
    }
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            userId: null,
            notifications: [],
            unreadCount: 0,
            isOpen: false,
            isLoading: false,
            isInitialized: false,
            soundEnabled: notificationSound.getEnabled(),

            initialize: async (userId) => {
                if (unsubscribeRealtime) {
                    unsubscribeRealtime();
                    unsubscribeRealtime = null;
                }

                if (!userId) {
                    set({
                        userId: null,
                        notifications: [],
                        unreadCount: 0,
                        isLoading: false,
                        isInitialized: false
                    });
                    return;
                }

                set({ userId, isLoading: true });

                try {
                    const list = await notificationService.getNotifications(userId, 50, true);
                    const mapped = dedupeNotifications(list.map(mapServerNotification));
                    const unreadCount = mapped.filter((item) => !item.read).length;

                    set({
                        userId,
                        notifications: mapped,
                        unreadCount,
                        isLoading: false,
                        isInitialized: true
                    });

                    unsubscribeRealtime = notificationService.subscribeToNotifications(userId, (payload) => {
                        const incoming = mapServerNotification(payload);
                        const soundEnabled = get().soundEnabled;

                        set((state) => {
                            const wasExistingById = state.notifications.some(
                                (item) => item.id === incoming.id
                            );

                            const next = dedupeNotifications([
                                incoming,
                                ...state.notifications.filter((item) => item.id !== incoming.id),
                            ]);

                            const incomingPersisted = next.some(
                                (item) => item.id === incoming.id
                            );
                            if (!wasExistingById && incomingPersisted) {
                                playSoundIfNeeded(soundEnabled, incoming);
                            }

                            return {
                                notifications: next,
                                unreadCount: next.filter((item) => !item.read).length
                            };
                        });
                    });
                } catch (error) {
                    console.error('Failed to initialize notifications:', error);
                    set({
                        notifications: [],
                        unreadCount: 0,
                        isLoading: false,
                        isInitialized: true
                    });
                }
            },

            refresh: async () => {
                const userId = get().userId;
                if (!userId) return;

                set({ isLoading: true });
                try {
                    const list = await notificationService.getNotifications(userId, 50, true);
                    const mapped = dedupeNotifications(list.map(mapServerNotification));
                    set({
                        notifications: mapped,
                        unreadCount: mapped.filter((item) => !item.read).length,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Failed to refresh notifications:', error);
                    set({ isLoading: false });
                }
            },

            addNotification: async (input) => {
                const userId = input.userId || get().userId;
                if (!userId) return;

                const created = await notificationService.createNotification({
                    userId,
                    title: input.title,
                    message: input.message,
                    type: input.type as any,
                    category: 'system',
                    entityType: input.entityType,
                    entityId: input.entityId,
                    actionUrl: input.link,
                    expiresAt: input.expiresAt
                });

                if (!created) return;

                const mapped = mapServerNotification(created);
                playSoundIfNeeded(get().soundEnabled, mapped);

                set((state) => {
                    const next = dedupeNotifications([mapped, ...state.notifications]);
                    return {
                        notifications: next,
                        unreadCount: next.filter((item) => !item.read).length
                    };
                });
            },

            markAsRead: async (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    if (!notification || notification.read) return state;

                    return {
                        notifications: state.notifications.map(n =>
                            n.id === id ? { ...n, read: true } : n
                        ),
                        unreadCount: Math.max(0, state.unreadCount - 1)
                    };
                });
                await notificationService.markAsRead([id]);
            },

            markAllAsRead: async () => {
                const userId = get().userId;
                if (!userId) return;

                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0
                }));
                await notificationService.markAllAsRead(userId);
            },

            removeNotification: async (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    const wasUnread = notification && !notification.read;

                    return {
                        notifications: state.notifications.filter(n => n.id !== id),
                        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
                    };
                });
                await notificationService.deleteNotification(id);
            },

            clearAll: async () => {
                const userId = get().userId;
                if (!userId) return;

                await notificationService.markAllAsRead(userId);
                await notificationService.deleteAllRead(userId);
                set({ notifications: [], unreadCount: 0 });
            },

            toggleOpen: () => {
                set((state) => ({ isOpen: !state.isOpen }));
            },

            setOpen: (open) => {
                set({ isOpen: open });
            },

            setSoundEnabled: (enabled) => {
                notificationSound.setEnabled(enabled);
                set({ soundEnabled: enabled });
            }
        }),
        {
            name: 'notifications-storage',
            partialize: (state) => ({
                soundEnabled: state.soundEnabled
            })
        }
    )
);

// Helper hook to get recent notifications
export function useRecentNotifications(limit: number = 5) {
    const notifications = useNotificationStore(state => state.notifications);
    return notifications.slice(0, limit);
}

// Helper hook to get unread notifications
export function useUnreadNotifications() {
    const notifications = useNotificationStore(state => state.notifications);
    return notifications.filter(n => !n.read);
}

export default useNotificationStore;
