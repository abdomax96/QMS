/**
 * ShareDialog Component
 * Advanced sharing dialog with 3-level sharing (Department/User/Role)
 */

import React, { useState } from 'react';
import {
    XMarkIcon,
    ShareIcon,
    BuildingOfficeIcon,
    UserIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import type { ShareType, PermissionLevel, SharePermissions } from '../../services/contentSharingService';

export interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    contentName: string;
    contentType: 'folder' | 'form_template' | 'form_instance' | 'report';
    onShare: (config: ShareConfig) => Promise<void>;
}

export interface ShareConfig {
    shareType: ShareType;
    departments?: string[];
    users?: string[];
    roles?: string[];
    permissionLevel: PermissionLevel;
    customPermissions?: SharePermissions;
    expiresAt?: string | null;
    note?: string;
}

const shareLevels = [
    {
        type: 'department' as ShareType,
        icon: BuildingOfficeIcon,
        title: 'مشاركة بين الأقسام',
        titleEn: 'Department Level',
        description: 'مشاركة مع قسم أو أقسام محددة',
        color: 'blue',
    },
    {
        type: 'user' as ShareType,
        icon: UserIcon,
        title: 'مشاركة مع مستخدمين',
        titleEn: 'User Level',
        description: 'مشاركة مع مستخدمين محددين',
        color: 'green',
    },
    {
        type: 'role' as ShareType,
        icon: ShieldCheckIcon,
        title: 'مشاركة حسب الدور',
        titleEn: 'Role Level',
        description: 'مشاركة مع أدوار وظيفية محددة',
        color: 'purple',
    },
];

const permissionLevels: { value: PermissionLevel; label: string; color: string }[] = [
    { value: 'view', label: 'عرض فقط', color: 'slate' },
    { value: 'comment', label: 'عرض + تعليق', color: 'blue' },
    { value: 'edit', label: 'عرض + تعديل', color: 'amber' },
    { value: 'full', label: 'صلاحيات كاملة', color: 'red' },
];

const SHARE_LEVEL_STYLES: Record<ShareType, { selected: string; icon: string }> = {
    department: {
        selected: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
        icon: 'text-blue-600 dark:text-blue-400',
    },
    user: {
        selected: 'border-green-500 bg-green-50 dark:bg-green-900/20',
        icon: 'text-green-600 dark:text-green-400',
    },
    role: {
        selected: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
        icon: 'text-purple-600 dark:text-purple-400',
    },
    public: {
        selected: 'border-slate-500 bg-slate-100 dark:bg-slate-900/30',
        icon: 'text-slate-600 dark:text-slate-300',
    },
};

const PERMISSION_LEVEL_STYLES: Record<PermissionLevel, string> = {
    view: 'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-2 border-slate-500',
    comment: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-2 border-blue-500',
    edit: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-2 border-amber-500',
    full: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-2 border-red-500',
};

export const ShareDialog: React.FC<ShareDialogProps> = ({
    isOpen,
    onClose,
    contentName,
    contentType,
    onShare,
}) => {
    const [shareType, setShareType] = useState<ShareType>('department');
    const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view');
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleShare = async () => {
        setLoading(true);
        try {
            await onShare({
                shareType,
                departments: shareType === 'department' ? selectedDepartments : undefined,
                users: shareType === 'user' ? selectedUsers : undefined,
                roles: shareType === 'role' ? selectedRoles : undefined,
                permissionLevel,
                expiresAt: expiresAt || null,
                note: note || undefined,
            });
            onClose();
        } catch (error) {
            console.error('Error sharing:', error);
        } finally {
            setLoading(false);
        }
    };

    const getContentIcon = () => {
        switch (contentType) {
            case 'folder':
                return '📁';
            case 'form_template':
                return '📋';
            case 'form_instance':
            case 'report':
                return '📊';
            default:
                return '📄';
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="relative w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] bg-white dark:bg-slate-800 rounded-none sm:rounded-corporate-lg shadow-soft-xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-corporate bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-xl">
                                <ShareIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                    مشاركة المحتوى
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                                    <span>{getContentIcon()}</span>
                                    <span className="truncate">{contentName}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="min-h-[40px] min-w-[40px] p-2 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
                        {/* Share Level Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                مستوى المشاركة
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {shareLevels.map((level) => (
                                    <button
                                        key={level.type}
                                        onClick={() => setShareType(level.type)}
                                        className={cn(
                                            'p-3 sm:p-4 rounded-corporate-lg border-2 transition-all duration-200 text-right sm:text-center',
                                            shareType === level.type
                                                ? SHARE_LEVEL_STYLES[level.type].selected
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        )}
                                    >
                                        <level.icon
                                            className={cn(
                                                'w-5 h-5 sm:w-6 sm:h-6 mb-2',
                                                shareType === level.type
                                                    ? SHARE_LEVEL_STYLES[level.type].icon
                                                    : 'text-slate-400',
                                                'mx-0 sm:mx-auto'
                                            )}
                                        />
                                        <div className="text-xs font-medium text-slate-900 dark:text-white mb-1">
                                            {level.title}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {level.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Selection (simplified - you'll need to add actual selectors) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {shareType === 'department' && 'اختر الأقسام'}
                                {shareType === 'user' && 'اختر المستخدمين'}
                                {shareType === 'role' && 'اختر الأدوار'}
                            </label>
                            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-corporate text-center text-sm text-slate-500">
                                سيتم إضافة selector هنا
                            </div>
                        </div>

                        {/* Permission Level */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                مستوى الصلاحيات
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {permissionLevels.map((level) => (
                                    <button
                                        key={level.value}
                                        onClick={() => setPermissionLevel(level.value)}
                                        className={cn(
                                            'min-h-[40px] p-2 rounded-corporate text-xs sm:text-sm font-medium transition-all',
                                            permissionLevel === level.value
                                                ? PERMISSION_LEVEL_STYLES[level.value]
                                                : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-transparent hover:border-slate-300'
                                        )}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Expiry Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                تاريخ انتهاء الصلاحية (اختياري)
                            </label>
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-corporate bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                            />
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                ملاحظة (اختياري)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                placeholder="أضف ملاحظة للمستلمين..."
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-corporate bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-corporate transition-colors disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={loading}
                            className="min-h-[40px] px-6 py-2 text-sm font-medium text-white bg-gradient-primary hover:shadow-glow-primary rounded-corporate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'جاري المشاركة...' : 'مشاركة'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareDialog;
