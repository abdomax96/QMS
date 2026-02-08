/**
 * Notification Store
 * Manages notification state using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, CreateNotificationInput } from '../domain/notifications/types';
import { notificationSound } from '../utils/notificationSound';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    soundEnabled: boolean;

    // Actions
    addNotification: (notification: CreateNotificationInput) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
    setSoundEnabled: (enabled: boolean) => void;
}

function generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            isOpen: false,
            soundEnabled: true,

            addNotification: (input) => {
                const notification: Notification = {
                    id: generateId(),
                    type: input.type,
                    priority: input.priority || 'normal',
                    title: input.title,
                    message: input.message,
                    link: input.link,
                    linkLabel: input.linkLabel,
                    entityId: input.entityId,
                    entityType: input.entityType,
                    read: false,
                    createdAt: new Date().toISOString(),
                    expiresAt: input.expiresAt
                };

                // Play notification sound if enabled
                if (get().soundEnabled) {
                    notificationSound.play();
                }

                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 50),
                    unreadCount: state.unreadCount + 1
                }));
            },

            markAsRead: (id) => {
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
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0
                }));
            },

            removeNotification: (id) => {
                set((state) => {
                    const notification = state.notifications.find(n => n.id === id);
                    const wasUnread = notification && !notification.read;

                    return {
                        notifications: state.notifications.filter(n => n.id !== id),
                        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
                    };
                });
            },

            clearAll: () => {
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
                notifications: state.notifications,
                unreadCount: state.unreadCount,
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
