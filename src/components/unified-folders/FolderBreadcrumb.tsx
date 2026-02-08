/**
 * FolderBreadcrumb Component
 * Navigation breadcrumb for folder hierarchy
 */

import React from 'react';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';

interface FolderBreadcrumbProps {
    path: Array<{ id: string; name: string; icon?: string }>;
    onNavigate: (folderId: string | null) => void;
    className?: string;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
    path,
    onNavigate,
    className,
}) => {
    return (
        <nav className={cn('flex items-center gap-2 text-sm', className)}>
            {/* Home */}
            <button
                onClick={() => onNavigate(null)}
                className="flex items-center gap-1 px-2 py-1 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                title="الصفحة الرئيسية"
            >
                <HomeIcon className="w-4 h-4" />
                <span>الرئيسية</span>
            </button>

            {/* Path segments */}
            {path.map((folder, index) => {
                const isLast = index === path.length - 1;

                return (
                    <React.Fragment key={folder.id}>
                        <ChevronRightIcon className="w-4 h-4 text-slate-400 dark:text-slate-600" />

                        <button
                            onClick={() => !isLast && onNavigate(folder.id)}
                            disabled={isLast}
                            className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded-corporate transition-colors',
                                isLast
                                    ? 'text-slate-900 dark:text-white font-medium cursor-default'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                            )}
                        >
                            {folder.icon && <span>{folder.icon}</span>}
                            <span className="max-w-[150px] truncate">
                                {folder.name}
                            </span>
                        </button>
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default FolderBreadcrumb;
