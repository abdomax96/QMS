/**
 * Notifications Bell Component
 * جرس الإشعارات مع القائمة المنسدلة
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useNotifications } from '../../hooks/ncr/useNotifications';
import { formatDateWithAppSettings } from '../../hooks/useDateFormat';

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} يوم`;
    return formatDateWithAppSettings(date);
}

const iconFor = (type: string) => {
    const map: Record<string, string> = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '⛔',
        task: '📝',
        workflow: '🔄',
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
    return map[type] || '🔔';
};

export default function NotificationsBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                {unreadCount > 0 ? (
                    <BellAlertIcon className="w-6 h-6 text-primary-600 animate-pulse" />
                ) : (
                    <BellIcon className="w-6 h-6" />
                )}

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <h3 className="font-semibold text-gray-900 dark:text-white">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                <CheckIcon className="w-4 h-4" />
                                تعيين الكل كمقروء
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>لا توجد إشعارات</p>
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={notification.actionUrl || '#'}
                                    onClick={() => {
                                        if (!notification.read) markAsRead(notification.id);
                                        setIsOpen(false);
                                    }}
                                    className={`block px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!notification.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* Icon */}
                                        <span className="text-2xl flex-shrink-0">
                                            {iconFor(notification.type)}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.read && (
                                            <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></span>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                to="/ncr"
                                onClick={() => setIsOpen(false)}
                                className="block text-center text-sm text-primary-600 hover:text-primary-700"
                            >
                                عرض جميع التقارير
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
