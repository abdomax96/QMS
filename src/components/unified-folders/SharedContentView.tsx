/**
 * SharedContentView Component
 * Displays content that has been shared with the current user
 */

import React, { useState } from 'react';
import { ShareIcon, BuildingOfficeIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import { useContentSharing } from '../../hooks/useContentSharing';

type ShareFilter = 'all' | 'department' | 'user' | 'role';

export const SharedContentView: React.FC = () => {
    const { sharedWithMe, loading } = useContentSharing();
    const [activeFilter, setActiveFilter] = useState<ShareFilter>('all');

    const filters: { value: ShareFilter; label: string; icon: any; count?: number }[] = [
        { value: 'all', label: 'الكل', icon: ShareIcon, count: sharedWithMe.length },
        {
            value: 'department',
            label: 'على مستوى القسم',
            icon: BuildingOfficeIcon,
            count: sharedWithMe.filter(s => s.share_type === 'department').length,
        },
        {
            value: 'user',
            label: 'مشترك معي شخصياً',
            icon: UserIcon,
            count: sharedWithMe.filter(s => s.share_type === 'user').length,
        },
        {
            value: 'role',
            label: 'على مستوى الدور',
            icon: ShieldCheckIcon,
            count: sharedWithMe.filter(s => s.share_type === 'role').length,
        },
    ];

    const filteredShares = activeFilter === 'all'
        ? sharedWithMe
        : sharedWithMe.filter(s => s.share_type === activeFilter);

    if (loading) {
        return (
            <div className="space-y-5 sm:space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="h-48 bg-slate-200 dark:bg-slate-700 rounded-corporate-lg animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-corporate bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <ShareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white truncate">
                            المحتوى المشترك معي
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {sharedWithMe.length} عنصر مشترك
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex items-center gap-2 min-w-max">
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                            className={cn(
                                'min-h-[40px] flex items-center gap-2 px-3 sm:px-4 py-2 rounded-corporate-lg border-2 transition-all whitespace-nowrap',
                                activeFilter === filter.value
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                            )}
                        >
                            <filter.icon className="w-4 h-4" />
                            <span className="text-xs sm:text-sm font-medium">{filter.label}</span>
                            {filter.count !== undefined && (
                                <span
                                    className={cn(
                                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                                        activeFilter === filter.value
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    )}
                                >
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            {filteredShares.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <ShareIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        لا يوجد محتوى مشترك
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        {activeFilter === 'all'
                            ? 'لم يتم مشاركة أي محتوى معك بعد'
                            : `لا يوجد محتوى مشترك ${filters.find(f => f.value === activeFilter)?.label}`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredShares.map((share) => (
                        <SharedItemCard key={share.id} share={share} />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Shared Item Card
 */
const SharedItemCard: React.FC<{ share: any }> = ({ share }) => {
    const getShareTypeLabel = () => {
        switch (share.share_type) {
            case 'department':
                return '👥 مستوى القسم';
            case 'user':
                return '👤 مشترك شخصياً';
            case 'role':
                return '🛡️ مستوى الدور';
            default:
                return '🌐 عام';
        }
    };

    const getPermissionLabel = () => {
        switch (share.permission_level) {
            case 'view':
                return 'عرض فقط';
            case 'comment':
                return 'عرض + تعليق';
            case 'edit':
                return 'عرض + تعديل';
            case 'full':
                return 'صلاحيات كاملة';
            default:
                return 'غير محدد';
        }
    };

    return (
        <div className="group relative bg-white dark:bg-slate-800 rounded-corporate-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-soft-lg transition-all duration-200 cursor-pointer overflow-hidden">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-800">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-corporate bg-blue-500 text-white flex items-center justify-center text-xl sm:text-2xl shadow-sm">
                            {share.content_type === 'folder' && '📁'}
                            {share.content_type === 'form_template' && '📋'}
                            {share.content_type === 'form_instance' && '📊'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                                {share.content_name || 'محتوى مشترك'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                من {share.shared_by_department_name || 'قسم آخر'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-3 sm:p-4 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{getShareTypeLabel()}</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-medium">
                        {getPermissionLabel()}
                    </span>
                </div>

                {share.note && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-750 p-2 rounded">
                        💬 {share.note}
                    </p>
                )}

                {share.expires_at && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⏰ ينتهي: {new Date(share.expires_at).toLocaleDateString('ar-EG')}
                    </p>
                )}
            </div>

            {/* Share Badge */}
            <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-medium shadow-sm">
                    <ShareIcon className="w-3.5 h-3.5" />
                    <span>مشترك</span>
                </div>
            </div>
        </div>
    );
};

export default SharedContentView;
