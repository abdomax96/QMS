import React from 'react';
import { cn } from '../../utils';

// Base Skeleton Component with Accessibility and Animation
interface SkeletonProps {
    className?: string; // Additional classes for width/height/margin
    variant?: 'text' | 'rect' | 'circle'; // Shape variant
    width?: string | number; // Exact width if needed
    height?: string | number; // Exact height if needed
    style?: React.CSSProperties; // Allow custom styles
}

export const SkeletonBase: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    style
}) => {
    // Base classes including the shimmer effect
    const baseClasses = 'skeleton-shimmer bg-slate-200 dark:bg-slate-700 relative overflow-hidden';

    // Variant specific shapes
    const variantClasses = {
        text: 'rounded',
        rect: 'rounded-corporate',
        circle: 'rounded-full',
    };

    const combinedStyle = {
        width: width,
        height: height,
        ...style
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={combinedStyle}
            role="status"
            aria-label="Loading content"
            aria-busy="true"
        />
    );
};

// --- Atomic Skeletons ---

export const TextSkeleton: React.FC<{ className?: string; width?: string | number; }> = (props) => (
    <SkeletonBase variant="text" height="1em" {...props} />
);

export const ButtonSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <SkeletonBase variant="rect" className={`h-10 w-32 ${className}`} />
);

export const AvatarSkeleton: React.FC<{ size?: number; className?: string }> = ({ size = 10, className = '' }) => (
    <SkeletonBase variant="circle" className={`${className}`} style={{ height: `${size / 4}rem`, width: `${size / 4}rem` }} /> // Tailwind size map approximation or use style
);

// --- Composite Skeletons ---

// Card Skeleton
export const CardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 rounded-corporate-lg border border-slate-200/60 dark:border-slate-700/60 p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <SkeletonBase variant="circle" className="h-10 w-10" />
                <SkeletonBase className="h-6 w-24" />
            </div>
            <SkeletonBase className="h-6 w-6 rounded-full" />
        </div>
        <SkeletonBase className="h-4 w-3/4 mb-2" />
        <SkeletonBase className="h-4 w-1/2" />
    </div>
);

// Stats Card Skeleton (Dashboard)
export const StatsCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-corporate-lg p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-card">
                <div className="flex items-center gap-3">
                    <SkeletonBase variant="rect" className="h-10 w-10 rounded-corporate-lg" />
                    <div className="flex-1">
                        <SkeletonBase className="h-8 w-16 mb-2" />
                        <SkeletonBase className="h-3 w-24" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Chart Skeleton (Dashboard)
export const ChartSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full">
        <SkeletonBase className="h-6 w-48 mb-6" />
        <div className="flex items-end justify-between gap-2 h-64 px-4">
            {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonBase
                    key={i}
                    variant="rect"
                    className="flex-1"
                    height={`${Math.random() * 60 + 20}%`}
                />
            ))}
        </div>
        <div className="flex justify-between mt-4">
            <SkeletonBase className="h-3 w-8" />
            <SkeletonBase className="h-3 w-8" />
            <SkeletonBase className="h-3 w-8" />
            <SkeletonBase className="h-3 w-8" />
        </div>
    </div>
);

// List Skeleton (Recent Items)
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <SkeletonBase className="h-6 w-32" />
            <SkeletonBase className="h-4 w-16" />
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                        <SkeletonBase className="h-5 w-48 mb-2" />
                        <SkeletonBase className="h-3 w-24" />
                    </div>
                    <SkeletonBase variant="rect" className="h-6 w-16 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex gap-4 border-b border-gray-200 dark:border-gray-600">
            {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBase key={i} className={`h-4 ${i === 0 ? 'w-24' : 'flex-1'}`} />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4 border-t border-gray-200 dark:border-gray-700">
                {Array.from({ length: 5 }).map((_, j) => (
                    <SkeletonBase key={j} className={`h-4 ${j === 0 ? 'w-24' : 'flex-1'}`} />
                ))}
            </div>
        ))}
    </div>
);

// Form Skeleton
export const FormSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <SkeletonBase className="h-7 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                    <SkeletonBase className="h-4 w-24 mb-2" />
                    <SkeletonBase className="h-10 w-full" variant="rect" />
                </div>
            ))}
        </div>
        <div>
            <SkeletonBase className="h-4 w-32 mb-2" />
            <SkeletonBase className="h-32 w-full" variant="rect" />
        </div>
    </div>
);

// Sidebar Skeleton
export const SidebarSkeleton: React.FC = () => (
    <div className="space-y-4 px-2 py-4">
        {/* Nav Items */}
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
                <SkeletonBase variant="rect" className="h-6 w-6" />
                <SkeletonBase className="h-4 w-32" />
            </div>
        ))}
        {/* Section Divider */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2">
                <SkeletonBase className="h-3 w-16 mb-3" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <SkeletonBase variant="rect" className="h-6 w-6" />
                    <SkeletonBase className="h-4 w-24" />
                </div>
            ))}
        </div>
    </div>
);

// Page Loading Skeleton
export const PageSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <SkeletonBase className="h-8 w-64 mb-2" />
                <SkeletonBase className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
                <ButtonSkeleton className="w-24" />
                <ButtonSkeleton className="w-32" />
            </div>
        </div>
        {/* Stats */}
        <StatsCardsSkeleton count={4} />
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ListSkeleton />
        </div>
    </div>
);

// Detail Page Skeleton
export const DetailPageSkeleton: React.FC = () => (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <SkeletonBase className="h-4 w-24 mb-2" />
                <SkeletonBase className="h-8 w-48" />
            </div>
            <div className="flex gap-2">
                <ButtonSkeleton className="w-28" />
                <ButtonSkeleton className="w-24" />
            </div>
        </div>
        {/* Status Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between mb-6">
                <SkeletonBase className="h-6 w-32" />
                <SkeletonBase className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-8">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <SkeletonBase variant="circle" className="h-8 w-8" />
                        <SkeletonBase className="h-3 w-12" />
                    </div>
                ))}
            </div>
        </div>
        {/* Main Content */}
        <FormSkeleton />
    </div>
);

// Inline Loading (Spinner replacement for small areas)
export const InlineLoading: React.FC<{ text?: string; className?: string }> = ({ text = 'جاري التحميل...', className }) => (
    <div className={cn("flex items-center gap-2 text-gray-500 animate-in fade-in duration-200", className)}>
        <SkeletonBase variant="circle" className="h-4 w-4" />
        <SkeletonBase className="h-4 w-24" />
    </div>
);

// Full Page Loading - Shows a proper page skeleton structure
export const FullPageLoading: React.FC<{ text?: string }> = ({ text = 'جاري تحميل البيانات...' }) => (
    <div className="min-h-screen flex flex-col animate-in fade-in duration-200" dir="rtl">
        {/* Header skeleton */}
        <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <SkeletonBase className="h-10 w-10 rounded-lg" />
                <SkeletonBase className="h-6 w-32" />
            </div>
            <div className="flex items-center gap-3">
                <SkeletonBase className="h-8 w-8 rounded-full" />
                <SkeletonBase className="h-8 w-8 rounded-full" />
                <SkeletonBase className="h-8 w-24 rounded-lg" />
            </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex">
            {/* Sidebar skeleton */}
            <div className="w-64 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 space-y-3 hidden md:block">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <SkeletonBase className="h-5 w-5 rounded" />
                        <SkeletonBase className="h-4 flex-1 rounded" />
                    </div>
                ))}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 mt-3">
                            <SkeletonBase className="h-5 w-5 rounded" />
                            <SkeletonBase className="h-4 w-20 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Page content skeleton */}
            <div className="flex-1 p-6 space-y-6">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <SkeletonBase className="h-8 w-48" />
                        <SkeletonBase className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <SkeletonBase className="h-10 w-24 rounded-lg" />
                        <SkeletonBase className="h-10 w-32 rounded-lg" />
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <SkeletonBase className="h-10 w-10 rounded-lg" />
                                <div className="space-y-2 flex-1">
                                    <SkeletonBase className="h-6 w-12" />
                                    <SkeletonBase className="h-3 w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <SkeletonBase className="h-6 w-40 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <SkeletonBase className="h-4 w-24" />
                                <SkeletonBase className="h-4 flex-1" />
                                <SkeletonBase className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const LabDashboardSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
                <SkeletonBase className="h-8 w-48 rounded-lg" />
                <SkeletonBase className="h-4 w-64 rounded" />
            </div>
            <SkeletonBase className="h-10 w-48 rounded-lg" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
            <SkeletonBase className="h-10 w-32 rounded-lg" />
            <SkeletonBase className="h-10 w-32 rounded-lg" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <SkeletonBase className="h-12 w-12 rounded-lg" />
                        <div className="space-y-2 flex-1">
                            <SkeletonBase className="h-8 w-16" />
                            <SkeletonBase className="h-3 w-24" />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonBase key={i} className="h-24 rounded-xl" />
            ))}
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center mb-4">
                    <SkeletonBase className="h-6 w-32" />
                    <SkeletonBase className="h-4 w-16" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="space-y-2">
                                <SkeletonBase className="h-5 w-40" />
                                <SkeletonBase className="h-3 w-32" />
                            </div>
                            <SkeletonBase className="h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center mb-4">
                    <SkeletonBase className="h-6 w-32" />
                    <SkeletonBase className="h-4 w-16" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="space-y-2">
                                <SkeletonBase className="h-5 w-40" />
                                <SkeletonBase className="h-3 w-32" />
                            </div>
                            <SkeletonBase className="h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const SettingsSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
            <SkeletonBase className="w-8 h-8 rounded-lg" />
            <div className="space-y-2">
                <SkeletonBase className="h-8 w-48 rounded-lg" />
                <SkeletonBase className="h-4 w-32 rounded" />
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonBase key={i} className="h-10 w-32 rounded-lg" />
            ))}
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-[500px]">
            <div className="space-y-6">
                <SkeletonBase className="h-8 w-64 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <SkeletonBase className="h-4 w-32" />
                        <SkeletonBase className="h-12 w-full rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <SkeletonBase className="h-4 w-32" />
                        <SkeletonBase className="h-12 w-full rounded-lg" />
                    </div>
                </div>
                <div className="space-y-4 pt-4">
                    <SkeletonBase className="h-4 w-full" />
                    <SkeletonBase className="h-4 w-full" />
                    <SkeletonBase className="h-4 w-3/4" />
                </div>
            </div>
        </div>
    </div>
);

// NCR Stage Permissions Skeleton (mimics actual NCR permissions page)
export const NcrPermissionsSkeleton: React.FC = () => (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-300" dir="rtl">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center gap-3">
                <SkeletonBase className="w-10 h-10 rounded-xl" />
                <div className="space-y-2">
                    <SkeletonBase className="h-6 w-40" />
                    <SkeletonBase className="h-4 w-64" />
                </div>
            </div>
            <SkeletonBase className="h-10 w-24 rounded-lg" />
        </div>

        {/* Workflow Stages */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <SkeletonBase className="h-8 w-24 rounded-lg" />
                        {i < 8 && <SkeletonBase className="w-4 h-4 rounded" />}
                    </div>
                ))}
            </div>
        </div>

        {/* Permissions Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
            {[1, 2, 3].map((stageIdx) => (
                <div key={stageIdx} className="rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Stage Header */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SkeletonBase className="w-8 h-8 rounded-lg" />
                            <div className="space-y-1">
                                <SkeletonBase className="h-5 w-28" />
                                <SkeletonBase className="h-3 w-20" />
                            </div>
                        </div>
                        <SkeletonBase className="w-5 h-5 rounded" />
                    </div>

                    {/* Department Rows */}
                    {[1, 2, 3].map((deptIdx) => (
                        <div key={deptIdx} className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <SkeletonBase className="w-6 h-6 rounded" />
                                    <SkeletonBase className="h-4 w-32" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <SkeletonBase className="h-6 w-14 rounded-lg" />
                                    <SkeletonBase className="h-6 w-14 rounded-lg" />
                                </div>
                            </div>
                            {/* Action Pills */}
                            <div className="flex flex-wrap gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((actionIdx) => (
                                    <SkeletonBase key={actionIdx} className="h-5 w-12 rounded" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

// Progress Loading - For Progressive Loading state
export const ProgressLoading: React.FC<{ progress: number; message: string; stage?: string }> = ({
    progress = 0,
    message = 'جاري التحميل...',
    stage = 'essential'
}) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
        <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in-95 duration-300">
            {/* Logo or Icon */}
            <div className="mx-auto w-24 h-24 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">جاري إعداد النظام</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg">{message}</p>

                {/* Progress Bar */}
                <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="absolute h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex justify-between text-sm text-gray-400">
                    <span>{stage === 'essential' ? 'البيانات الأساسية' : stage === 'secondary' ? 'البيانات الثانوية' : 'اكتمال'}</span>
                    <span>{progress}%</span>
                </div>
            </div>

            {/* Tips / Info */}
            <div className="pt-8 text-sm text-gray-400">
                <p>يتم استخدام تقنية التحميل التدريجي لأفضل أداء 🚀</p>
            </div>
        </div>
    </div>
);

export default {
    SkeletonBase,
    TextSkeleton,
    ButtonSkeleton,
    AvatarSkeleton,
    CardSkeleton,
    TableSkeleton,
    StatsCardsSkeleton,
    ChartSkeleton,
    ListSkeleton,
    FormSkeleton,
    SidebarSkeleton,
    PageSkeleton,
    DetailPageSkeleton,
    InlineLoading,
    FullPageLoading,
    LabDashboardSkeleton,
    SettingsSkeleton,
    NcrPermissionsSkeleton,
    ProgressLoading
};
