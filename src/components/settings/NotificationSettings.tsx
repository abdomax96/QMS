/**
 * Notification Settings Component
 * مكون إعدادات الإشعارات
 * 
 * Allows users to configure their notification preferences.
 * 
 * Created: 2025-12-31
 */

import React, { useState, useEffect } from 'react';
import {
    BellIcon,
    EnvelopeIcon,
    DevicePhoneMobileIcon,
    ClockIcon,
    CheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    BeakerIcon,
    ClipboardDocumentCheckIcon,
    ShieldCheckIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { notificationService } from '../../services/notificationService';
import type { NotificationPreferences, NotificationCategory } from '../../services/notificationService';
import { SettingsSkeleton } from '../common/LoadingStates';

// Category configuration
const CATEGORIES: Array<{
    code: NotificationCategory;
    name: string;
    nameAr: string;
    icon: React.ElementType;
    color: string;
}> = [
        { code: 'system', name: 'System', nameAr: 'النظام', icon: Cog6ToothIcon, color: 'text-gray-600' },
        { code: 'ncr', name: 'NCR', nameAr: 'تقارير عدم المطابقة', icon: ExclamationTriangleIcon, color: 'text-red-600' },
        { code: 'lab', name: 'Lab', nameAr: 'المختبر', icon: BeakerIcon, color: 'text-blue-600' },
        { code: 'task', name: 'Tasks', nameAr: 'المهام', icon: ClipboardDocumentCheckIcon, color: 'text-green-600' },
        { code: 'approval', name: 'Approvals', nameAr: 'الموافقات', icon: ShieldCheckIcon, color: 'text-purple-600' },
        { code: 'alert', name: 'Alerts', nameAr: 'التنبيهات', icon: BellIcon, color: 'text-orange-600' },
    ];

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [usingLocalStorage, setUsingLocalStorage] = useState(false);

    // Default preferences when DB is not available
    const getDefaultPreferences = (): NotificationPreferences => ({
        id: 'local',
        user_id: 'local',
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
        },
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        daily_digest_enabled: false,
        digest_time: '08:00'
    });

    // Load from localStorage
    const loadFromLocalStorage = (): NotificationPreferences => {
        try {
            const saved = localStorage.getItem('notification_preferences');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load notification preferences from localStorage');
        }
        return getDefaultPreferences();
    };

    // Save to localStorage
    const saveToLocalStorage = (prefs: NotificationPreferences) => {
        try {
            localStorage.setItem('notification_preferences', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Failed to save notification preferences to localStorage');
        }
    };

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const prefs = await notificationService.getPreferences();
            if (prefs) {
                setPreferences(prefs);
                setUsingLocalStorage(false);
            } else {
                // Fallback to localStorage
                console.log('[NotificationSettings] Using localStorage fallback');
                setPreferences(loadFromLocalStorage());
                setUsingLocalStorage(true);
            }
        } catch (error) {
            console.error('Error loading preferences, using localStorage:', error);
            setPreferences(loadFromLocalStorage());
            setUsingLocalStorage(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!preferences) return;

        const updates = { [key]: value };
        setPreferences({ ...preferences, ...updates });
        await savePreferences(updates);
    };

    const handleCategoryToggle = async (
        category: NotificationCategory,
        field: 'enabled' | 'email' | 'push',
        value: boolean
    ) => {
        if (!preferences) return;

        const newSettings = {
            ...preferences.category_settings,
            [category]: {
                ...preferences.category_settings[category],
                [field]: value
            }
        };

        setPreferences({ ...preferences, category_settings: newSettings });
        await savePreferences({ category_settings: newSettings } as any);
    };

    const savePreferences = async (updates: Partial<NotificationPreferences>) => {
        if (!preferences) return;

        setIsSaving(true);
        setSaveStatus('idle');

        // Update the full preferences object
        const updatedPrefs = { ...preferences, ...updates };

        // Always save to localStorage as backup
        saveToLocalStorage(updatedPrefs);

        if (usingLocalStorage) {
            // Only using localStorage, show success immediately
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
            setIsSaving(false);
            return;
        }

        try {
            const success = await notificationService.updatePreferences(updates);
            setSaveStatus(success ? 'success' : 'error');

            // Reset status after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving preferences:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <SettingsSkeleton />;
    }

    if (!preferences) {
        return (
            <div className="text-center py-8">
                <BellIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لم يتم العثور على إعدادات الإشعارات</p>
                <button
                    onClick={loadPreferences}
                    className="mt-4 px-4 py-2 text-primary-600 hover:underline"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Save Status Indicator */}
            {saveStatus !== 'idle' && (
                <div className={`fixed top-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${saveStatus === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {saveStatus === 'success' ? (
                        <>
                            <CheckIcon className="w-5 h-5" />
                            تم الحفظ
                        </>
                    ) : (
                        <>
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            فشل الحفظ
                        </>
                    )}
                </div>
            )}

            {/* General Channels */}
            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BellIcon className="w-5 h-5 text-primary-600" />
                    قنوات الإشعارات
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
                    {/* In-App Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BellIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">الإشعارات داخل التطبيق</p>
                                <p className="text-sm text-gray-500">إظهار الإشعارات في النظام</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.in_app_enabled}
                            onChange={(value) => handleToggle('in_app_enabled', value)}
                        />
                    </div>

                    {/* Email Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <EnvelopeIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">إشعارات البريد الإلكتروني</p>
                                <p className="text-sm text-gray-500">إرسال الإشعارات للبريد</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.email_enabled}
                            onChange={(value) => handleToggle('email_enabled', value)}
                        />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <DevicePhoneMobileIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">الإشعارات الفورية</p>
                                <p className="text-sm text-gray-500">إشعارات متصفح/جوال</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.push_enabled}
                            onChange={(value) => handleToggle('push_enabled', value)}
                        />
                    </div>
                </div>
            </section>

            {/* Category Preferences */}
            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-primary-600" />
                    إعدادات حسب الفئة
                </h3>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الفئة</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تفعيل</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">البريد</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">فوري</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {CATEGORIES.map((cat) => {
                                const settings = preferences.category_settings[cat.code] || { enabled: true, email: true, push: true };
                                return (
                                    <tr key={cat.code} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <cat.icon className={`w-5 h-5 ${cat.color}`} />
                                                <span className="font-medium text-gray-900 dark:text-white">{cat.nameAr}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ToggleSwitch
                                                enabled={settings.enabled}
                                                onChange={(v) => handleCategoryToggle(cat.code, 'enabled', v)}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ToggleSwitch
                                                enabled={settings.email && settings.enabled}
                                                onChange={(v) => handleCategoryToggle(cat.code, 'email', v)}
                                                disabled={!settings.enabled || !preferences.email_enabled}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ToggleSwitch
                                                enabled={settings.push && settings.enabled}
                                                onChange={(v) => handleCategoryToggle(cat.code, 'push', v)}
                                                disabled={!settings.enabled || !preferences.push_enabled}
                                                size="sm"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Quiet Hours */}
            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-primary-600" />
                    ساعات الهدوء
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">تفعيل ساعات الهدوء</p>
                            <p className="text-sm text-gray-500">إيقاف الإشعارات خلال فترة محددة</p>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.quiet_hours_enabled}
                            onChange={(value) => handleToggle('quiet_hours_enabled', value)}
                        />
                    </div>

                    {preferences.quiet_hours_enabled && (
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">من:</label>
                                <input
                                    type="time"
                                    value={preferences.quiet_hours_start}
                                    onChange={(e) => {
                                        setPreferences({ ...preferences, quiet_hours_start: e.target.value });
                                        savePreferences({ quiet_hours_start: e.target.value } as any);
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">إلى:</label>
                                <input
                                    type="time"
                                    value={preferences.quiet_hours_end}
                                    onChange={(e) => {
                                        setPreferences({ ...preferences, quiet_hours_end: e.target.value });
                                        savePreferences({ quiet_hours_end: e.target.value } as any);
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Daily Digest */}
            <section>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">ملخص يومي</p>
                                <p className="text-sm text-gray-500">استلام ملخص يومي بجميع الإشعارات</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.daily_digest_enabled}
                            onChange={(value) => handleToggle('daily_digest_enabled', value)}
                        />
                    </div>

                    {preferences.daily_digest_enabled && (
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">وقت الإرسال:</label>
                            <input
                                type="time"
                                value={preferences.digest_time}
                                onChange={(e) => {
                                    setPreferences({ ...preferences, digest_time: e.target.value });
                                    savePreferences({ digest_time: e.target.value } as any);
                                }}
                                className="px-3 py-1.5 border border-blue-300 dark:border-blue-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

// Toggle Switch Component
function ToggleSwitch({
    enabled,
    onChange,
    disabled = false,
    size = 'md'
}: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}) {
    const sizeClasses = size === 'sm'
        ? 'w-9 h-5'
        : 'w-11 h-6';

    const dotClasses = size === 'sm'
        ? 'w-4 h-4 ' + (enabled ? 'translate-x-4' : 'translate-x-0.5')
        : 'w-5 h-5 ' + (enabled ? 'translate-x-5' : 'translate-x-0.5');

    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`
                relative inline-flex shrink-0 cursor-pointer rounded-full
                transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${sizeClasses}
                ${enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block rounded-full bg-white shadow ring-0
                    transition-transform duration-200 ease-in-out
                    ${dotClasses}
                    ${size === 'sm' ? 'mt-0.5' : 'mt-0.5'}
                `}
            />
        </button>
    );
}
