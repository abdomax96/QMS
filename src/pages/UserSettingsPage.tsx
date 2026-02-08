/**
 * User Settings Page
 * Appearance, Language, Notifications settings
 */

import React, { useState } from 'react';
import {
    SunIcon,
    MoonIcon,
    ComputerDesktopIcon,
    BellIcon,
    GlobeAltIcon,
    KeyIcon,
    ShieldCheckIcon,
    TrashIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import useStore from '../store';
import { PasswordChangeForm } from '../components/settings/PasswordChangeForm';
import { supabase } from '../config/supabase';

type ThemeMode = 'light' | 'dark' | 'system';

const UserSettingsPage: React.FC = () => {
    const { theme, toggleTheme } = useStore();
    const [currentTab, setCurrentTab] = useState<'appearance' | 'notifications' | 'security'>('appearance');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [loggingOutAll, setLoggingOutAll] = useState(false);

    // Settings state
    const [settings, setSettings] = useState({
        themeMode: (theme || 'light') as ThemeMode,
        language: 'ar',
        fontSize: 'medium',
        notifications: {
            email: true,
            push: true,
            ncrUpdates: true,
            reportApprovals: true,
            systemAlerts: true
        }
    });

    const handleThemeChange = (mode: ThemeMode) => {
        setSettings({ ...settings, themeMode: mode });
        if (mode === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark && theme === 'light') toggleTheme();
            if (!prefersDark && theme === 'dark') toggleTheme();
        } else if (mode === 'dark' && theme === 'light') {
            toggleTheme();
        } else if (mode === 'light' && theme === 'dark') {
            toggleTheme();
        }
        localStorage.setItem('themeMode', mode);
    };

    const tabs = [
        { id: 'appearance', label: 'المظهر', icon: SunIcon },
        { id: 'notifications', label: 'الإشعارات', icon: BellIcon },
        { id: 'security', label: 'الأمان', icon: ShieldCheckIcon }
    ] as const;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الإعدادات</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">تخصيص تجربتك في النظام</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${currentTab === tab.id
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-600'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        {/* Appearance Tab */}
                        {currentTab === 'appearance' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">المظهر</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">اختر وضع العرض المفضل لديك</p>

                                    {/* Theme Selection */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => handleThemeChange('light')}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.themeMode === 'light'
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                                <SunIcon className="w-8 h-8 text-yellow-500" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">فاتح</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('dark')}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.themeMode === 'dark'
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center shadow-sm">
                                                <MoonIcon className="w-8 h-8 text-purple-400" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">داكن</span>
                                        </button>

                                        <button
                                            onClick={() => handleThemeChange('system')}
                                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.themeMode === 'system'
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white to-gray-900 border border-gray-300 flex items-center justify-center shadow-sm">
                                                <ComputerDesktopIcon className="w-8 h-8 text-gray-600" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">تلقائي</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Language */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <GlobeAltIcon className="w-5 h-5" />
                                        اللغة
                                    </h3>
                                    <select
                                        value={settings.language}
                                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                        className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="ar">العربية</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>

                                {/* Font Size */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">حجم الخط</h3>
                                    <div className="flex gap-4">
                                        {['small', 'medium', 'large'].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setSettings({ ...settings, fontSize: size })}
                                                className={`px-4 py-2 rounded-lg border transition-colors ${settings.fontSize === size
                                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                                    }`}
                                            >
                                                {size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط' : 'كبير'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {currentTab === 'notifications' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">الإشعارات</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">تحكم في الإشعارات التي تتلقاها</p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { key: 'email', label: 'إشعارات البريد الإلكتروني', desc: 'تلقي الإشعارات عبر البريد' },
                                        { key: 'push', label: 'إشعارات الدفع', desc: 'إشعارات فورية في المتصفح' },
                                        { key: 'ncrUpdates', label: 'تحديثات NCR', desc: 'عند تحديث تقارير عدم المطابقة' },
                                        { key: 'reportApprovals', label: 'اعتماد التقارير', desc: 'عند اعتماد أو رفض تقاريرك' },
                                        { key: 'systemAlerts', label: 'تنبيهات النظام', desc: 'تحديثات وصيانة النظام' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        notifications: {
                                                            ...settings.notifications,
                                                            [item.key]: e.target.checked
                                                        }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {currentTab === 'security' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">الأمان</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">إعدادات أمان حسابك</p>
                                </div>

                                {/* Change Password */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <KeyIcon className="w-6 h-6 text-gray-500" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">تغيير كلمة المرور</p>
                                                <p className="text-sm text-gray-500">ينصح بتغييرها بشكل دوري</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            className="px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        >
                                            تغيير
                                        </button>
                                    </div>
                                </div>

                                {/* Sessions */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ComputerDesktopIcon className="w-6 h-6 text-gray-500" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">الجلسات النشطة</p>
                                                <p className="text-sm text-gray-500">إدارة الأجهزة المتصلة</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowSessionModal(true)}
                                            className="px-4 py-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        >
                                            إدارة
                                        </button>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                    <h3 className="font-medium text-red-600 mb-4">منطقة الخطر</h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={async () => {
                                                if (loggingOutAll) return;
                                                if (!confirm('سيتم تسجيل خروجك من جميع الأجهزة بما في ذلك هذا الجهاز. هل أنت متأكد؟')) return;
                                                setLoggingOutAll(true);
                                                try {
                                                    await supabase.auth.signOut({ scope: 'global' });
                                                    window.location.href = '/login';
                                                } catch (e) {
                                                    console.error('Failed to logout all sessions:', e);
                                                    setLoggingOutAll(false);
                                                }
                                            }}
                                            disabled={loggingOutAll}
                                            className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                            {loggingOutAll ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج من جميع الأجهزة'}
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <TrashIcon className="w-5 h-5" />
                                            حذف الحساب
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">تغيير كلمة المرور</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <PasswordChangeForm onSuccess={() => setShowPasswordModal(false)} />
                    </div>
                </div>
            )}

            {/* Session Management Modal */}
            {showSessionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSessionModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">الجلسات النشطة</h3>
                            <button onClick={() => setShowSessionModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <ComputerDesktopIcon className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">الجهاز الحالي</p>
                                        <p className="text-sm text-gray-500">متصفح الويب - نشط الآن</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 text-center">
                                يمكنك تسجيل الخروج من جميع الأجهزة من خلال زر "تسجيل الخروج من جميع الأجهزة" في الأسفل
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSessionModal(false)}
                            className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserSettingsPage;
