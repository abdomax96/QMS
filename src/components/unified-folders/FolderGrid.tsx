/**
 * FolderGrid Component
 * Grid layout for displaying multiple folders
 */

import React from 'react';
import { FolderPlusIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import FolderCard from './FolderCard';
import type { UnifiedFolder } from '../../services/unifiedFoldersService';

export interface FolderGridProps {
    folders: UnifiedFolder[];
    loading?: boolean;
    onFolderOpen?: (folder: UnifiedFolder) => void;
    onFolderCreate?: () => void;
    onToggleFavorite?: (folder: UnifiedFolder) => void;
    onShare?: (folder: UnifiedFolder) => void;
    onContextMenu?: (e: React.MouseEvent, folder: UnifiedFolder) => void;
    showCreateButton?: boolean;
    emptyMessage?: string;
    className?: string;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
    folders,
    loading = false,
    onFolderOpen,
    onFolderCreate,
    onToggleFavorite,
    onShare,
    onContextMenu,
    showCreateButton = true,
    emptyMessage = 'لا توجد مجلدات',
    className,
}) => {
    if (loading) {
        return (
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
                {[...Array(8)].map((_, i) => (
                    <FolderCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (folders.length === 0 && !showCreateButton) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <span className="text-4xl">📁</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
            {/* Create Button */}
            {showCreateButton && onFolderCreate && (
                <button
                    onClick={onFolderCreate}
                    className={cn(
                        'group relative bg-white dark:bg-slate-800 rounded-corporate-lg border-2 border-dashed border-slate-300 dark:border-slate-600',
                        'hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-soft-lg',
                        'transition-all duration-200 cursor-pointer overflow-hidden',
                        'min-h-[180px] flex flex-col items-center justify-center gap-3',
                        'hover:bg-primary-50/50 dark:hover:bg-primary-900/20'
                    )}
                >
                    <div className="w-12 h-12 rounded-corporate bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                        <FolderPlusIcon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        إنشاء مجلد جديد
                    </span>
                </button>
            )}

            {/* Folders */}
            {folders.map((folder) => (
                <FolderCard
                    key={folder.id}
                    folder={folder}
                    onOpen={onFolderOpen}
                    onToggleFavorite={onToggleFavorite}
                    onShare={onShare}
                    onContextMenu={onContextMenu}
                />
            ))}
        </div>
    );
};

/**
 * Folder Card Skeleton Loader
 */
const FolderCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-corporate-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850/50">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-corporate bg-slate-200 dark:bg-slate-700" />
                        <div className="flex-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                </div>
            </div>
        </div>
    );
};

export default FolderGrid;
