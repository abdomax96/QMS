/**
 * FolderCard Component
 * Modern card component for displaying a single folder with stats and actions
 */

import React from 'react';
import { FolderIcon, StarIcon, ShareIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../utils';
import type { UnifiedFolder } from '../../services/unifiedFoldersService';
import { useLanguageStore, getDisplayName } from '../../store/languageStore';

export interface FolderCardProps {
    folder: UnifiedFolder;
    onOpen?: (folder: UnifiedFolder) => void;
    onToggleFavorite?: (folder: UnifiedFolder) => void;
    onShare?: (folder: UnifiedFolder) => void;
    onContextMenu?: (e: React.MouseEvent, folder: UnifiedFolder) => void;
    isShared?: boolean;
    shareSource?: string;
    className?: string;
}

export const FolderCard: React.FC<FolderCardProps> = ({
    folder,
    onOpen,
    onToggleFavorite,
    onShare,
    onContextMenu,
    isShared = false,
    shareSource,
    className,
}) => {
    const { displayLanguage } = useLanguageStore();

    // Parse stats
    const stats = typeof folder.stats === 'object' ? folder.stats : {};
    const totalItems = (stats as any).total_items || 0;
    const formsCount = (stats as any).forms_count || 0;
    const reportsCount = (stats as any).reports_count || 0;

    const handleClick = () => {
        if (onOpen) {
            onOpen(folder);
        }
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleFavorite) {
            onToggleFavorite(folder);
        }
    };

    const handleShareClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onShare) {
            onShare(folder);
        }
    };

    const handleContextMenuClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onContextMenu) {
            onContextMenu(e, folder);
        }
    };

    return (
        <div
            onClick={handleClick}
            onContextMenu={handleContextMenuClick}
            className={cn(
                'group relative bg-white dark:bg-slate-800 rounded-corporate-lg border-2 border-slate-200 dark:border-slate-700',
                'hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-soft-lg',
                'transition-all duration-200 cursor-pointer overflow-hidden',
                className
            )}
        >
            {/* Header */}
            <div
                className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-850/50"
                style={{
                    backgroundColor: folder.color ? `${folder.color}10` : undefined,
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            className="flex-shrink-0 w-12 h-12 rounded-corporate flex items-center justify-center text-2xl shadow-sm"
                            style={{
                                backgroundColor: folder.color || '#6B7280',
                                color: 'white',
                            }}
                        >
                            {folder.icon || '📁'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate text-base">
                                {getDisplayName(folder.name, folder.name_en, displayLanguage)}
                            </h3>
                            {folder.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {folder.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {/* Favorite */}
                        <button
                            onClick={handleFavoriteClick}
                            className={cn(
                                'p-1.5 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                                folder.is_favorite
                                    ? 'text-amber-500'
                                    : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100'
                            )}
                            title={folder.is_favorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                            {folder.is_favorite ? (
                                <StarIconSolid className="w-5 h-5" />
                            ) : (
                                <StarIcon className="w-5 h-5" />
                            )}
                        </button>

                        {/* Share */}
                        {onShare && (
                            <button
                                onClick={handleShareClick}
                                className="p-1.5 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100"
                                title="مشاركة"
                            >
                                <ShareIcon className="w-5 h-5" />
                            </button>
                        )}

                        {/* Menu */}
                        {onContextMenu && (
                            <button
                                onClick={handleContextMenuClick}
                                className="p-1.5 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100"
                                title="المزيد"
                            >
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="p-4">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <span className="text-lg">📋</span>
                            <span className="font-medium">{formsCount}</span>
                            <span className="text-xs">نموذج</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <span className="text-lg">📊</span>
                            <span className="font-medium">{reportsCount}</span>
                            <span className="text-xs">تقرير</span>
                        </div>
                    </div>

                    <div className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {totalItems} عنصر
                    </div>
                </div>
            </div>

            {/* Shared Badge */}
            {isShared && shareSource && (
                <div className="absolute top-2 left-2 z-10">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-medium shadow-sm">
                        <ShareIcon className="w-3.5 h-3.5" />
                        <span>من {shareSource}</span>
                    </div>
                </div>
            )}

            {/* System Badge */}
            {folder.is_system && (
                <div className="absolute bottom-2 left-2 z-10">
                    <div className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
                        نظام
                    </div>
                </div>
            )}

            {/* New Content Indicator */}
            {/* You can add logic to show a "new" badge if there's recent activity */}
        </div>
    );
};

export default FolderCard;
