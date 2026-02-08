/**
 * Notification Center Component
 * Enhanced version with grouping, animations, and better UX
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BellIcon,
    XMarkIcon,
    CheckIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    TrashIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationIcons, NotificationColors } from '../../domain/notifications/types';
import { formatDateWithAppSettings } from '../../hooks/useDateFormat';
import type { Notification } from '../../domain/notifications/types';

// Individual Notification Item with improved styling
const NotificationItem: React.FC<{
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onRemove: (id: string) => void;
    onClose: () => void;
}> = ({ notification, onMarkAsRead, onRemove, onClose }) => {
    const icon = NotificationIcons[notification.type];
    const colorClass = NotificationColors[notification.priority];
    const timeAgo = getTimeAgo(notification.createdAt);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.link) {
            onClose();
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRemoving(true);
        // Wait for animation before actually removing
        setTimeout(() => onRemove(notification.id), 200);
    };

    const content = (
        <div
            className={`
                p-3.5 border-b border-gray-100 dark:border-gray-700/50 
                hover:bg-gray-50 dark:hover:bg-gray-700/30 
                transition-all duration-200 cursor-pointer group
                ${!notification.read ? 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-900/20' : ''}
                ${isRemoving ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}
            `}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                {/* Icon with priority-based background */}
                <span className={`
                    w-9 h-9 rounded-xl flex items-center justify-center text-lg
                    shadow-sm ${colorClass}
                `}>
                    {icon}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={`
                            text-sm text-gray-900 dark:text-white line-clamp-1
                            ${!notification.read ? 'font-semibold' : 'font-medium'}
                        `}>
                            {notification.title}
                        </h4>
                        <button
                            onClick={handleRemove}
                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="حذف"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo}</span>
                        {notification.linkLabel && (
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                                {notification.linkLabel}
                                <span className="group-hover:translate-x-1 transition-transform">←</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Unread indicator - pulsing dot */}
                {!notification.read && (
                    <div className="relative flex-shrink-0 mt-2">
                        <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                        <div className="absolute inset-0 w-2.5 h-2.5 bg-primary-500 rounded-full animate-ping" />
                    </div>
                )}
            </div>
        </div>
    );

    if (notification.link) {
        return <Link to={notification.link}>{content}</Link>;
    }

    return content;
};

// Date group header component
const DateGroupHeader: React.FC<{ label: string }> = ({ label }) => (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-500 dark:text-gray-400 sticky top-0 z-10 backdrop-blur-sm">
        {label}
    </div>
);

// Main Notification Center
export const NotificationCenter: React.FC = () => {
    const {
        notifications,
        unreadCount,
        isOpen,
        soundEnabled,
        toggleOpen,
        setOpen,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        setSoundEnabled
    } = useNotificationStore();

    const panelRef = useRef<HTMLDivElement>(null);
    const [isClearing, setIsClearing] = useState(false);

    // Group notifications by date
    const groupedNotifications = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups: { label: string; notifications: Notification[] }[] = [
            { label: 'اليوم', notifications: [] },
            { label: 'أمس', notifications: [] },
            { label: 'سابقاً', notifications: [] }
        ];

        notifications.forEach(notif => {
            const notifDate = new Date(notif.createdAt);
            notifDate.setHours(0, 0, 0, 0);

            if (notifDate.getTime() === today.getTime()) {
                groups[0].notifications.push(notif);
            } else if (notifDate.getTime() === yesterday.getTime()) {
                groups[1].notifications.push(notif);
            } else {
                groups[2].notifications.push(notif);
            }
        });

        // Filter out empty groups
        return groups.filter(g => g.notifications.length > 0);
    }, [notifications]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setOpen]);

    // Handle clear all with animation
    const handleClearAll = () => {
        setIsClearing(true);
        setTimeout(() => {
            clearAll();
            setIsClearing(false);
        }, 300);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button with improved animation */}
            <button
                onClick={toggleOpen}
                className={`
                    relative p-2 rounded-xl transition-all duration-200
                    ${isOpen
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'}
                `}
                aria-label="الإشعارات"
            >
                <BellIcon className={`w-6 h-6 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel with slide animation */}
            {isOpen && (
                <div
                    className={`
                        absolute left-0 mt-2 w-80 sm:w-96 
                        bg-white dark:bg-gray-800 rounded-2xl 
                        shadow-2xl border border-gray-200 dark:border-gray-700 
                        z-50 max-h-[80vh] overflow-hidden
                        animate-in slide-in-from-top-2 duration-200
                        ${isClearing ? 'opacity-50 scale-95' : ''}
                    `}
                >
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BellIcon className="w-5 h-5 text-primary-500" />
                                الإشعارات
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-semibold rounded-full">
                                        {unreadCount} جديد
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                {/* Sound Toggle */}
                                <button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className={`
                                        p-1.5 rounded-lg transition-all
                                        ${soundEnabled
                                            ? 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30'
                                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                                    `}
                                    title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
                                >
                                    {soundEnabled ? (
                                        <SpeakerWaveIcon className="w-4 h-4" />
                                    ) : (
                                        <SpeakerXMarkIcon className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Mark all as read */}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 transition-all"
                                        title="تحديد الكل كمقروء"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <BellIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="font-medium text-gray-600 dark:text-gray-300">لا توجد إشعارات</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    ستظهر هنا الإشعارات الجديدة
                                </p>
                            </div>
                        ) : (
                            groupedNotifications.map((group) => (
                                <div key={group.label}>
                                    <DateGroupHeader label={group.label} />
                                    {group.notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkAsRead={markAsRead}
                                            onRemove={removeNotification}
                                            onClose={() => setOpen(false)}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={handleClearAll}
                                disabled={isClearing}
                                className="w-full py-2 px-4 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isClearing ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <TrashIcon className="w-4 h-4" />
                                )}
                                مسح جميع الإشعارات
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper function with improved Arabic formatting
function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 60) return 'الآن';
    if (minutes === 1) return 'منذ دقيقة';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours === 1) return 'منذ ساعة';
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return 'منذ يوم';
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;

    return formatDateWithAppSettings(date);
}

export default NotificationCenter;

