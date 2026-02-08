/**
 * ReportTimeline Component
 * Visual timeline of report review history
 * 
 * Created: 2026-01-06
 */

import React from 'react';
import {
    FileEdit,
    Send,
    UserCheck,
    CheckCircle,
    XCircle,
    RotateCcw,
    Edit3,
    Archive,
    Clock
} from 'lucide-react';
import type { ReportReviewHistoryEntry } from '../../types';

interface ReportTimelineProps {
    history: ReportReviewHistoryEntry[];
    isLoading?: boolean;
    className?: string;
}

const actionConfig: Record<string, {
    label: string;
    labelAr: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}> = {
    created: {
        label: 'Created',
        labelAr: 'تم الإنشاء',
        icon: FileEdit,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100'
    },
    submitted: {
        label: 'Submitted',
        labelAr: 'تم الإرسال',
        icon: Send,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
    },
    claimed: {
        label: 'Claimed for Review',
        labelAr: 'تم الاستلام للمراجعة',
        icon: UserCheck,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100'
    },
    approved: {
        label: 'Approved',
        labelAr: 'تم الاعتماد',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100'
    },
    rejected: {
        label: 'Rejected',
        labelAr: 'تم الرفض',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    },
    resubmitted: {
        label: 'Resubmitted',
        labelAr: 'تمت إعادة الإرسال',
        icon: RotateCcw,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100'
    },
    reopened: {
        label: 'Reopened',
        labelAr: 'تمت إعادة الفتح',
        icon: RotateCcw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
    },
    edited_by_reviewer: {
        label: 'Edited by Reviewer',
        labelAr: 'تم التعديل بواسطة المراجع',
        icon: Edit3,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
    },
    archived: {
        label: 'Archived',
        labelAr: 'تمت الأرشفة',
        icon: Archive,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
    }
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDate(dateString);
};

export const ReportTimeline: React.FC<ReportTimelineProps> = ({
    history,
    isLoading = false,
    className = ''
}) => {
    if (isLoading) {
        return (
            <div className={`space-y-4 ${className}`}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-1/3" />
                            <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className={`text-center py-8 text-slate-500 ${className}`}>
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا يوجد سجل للتقرير</p>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Timeline line */}
            <div className="absolute right-4 top-8 bottom-8 w-0.5 bg-slate-200" />

            {/* Timeline entries */}
            <div className="space-y-6">
                {history.map((entry, index) => {
                    const config = actionConfig[entry.action] || actionConfig.created;
                    const Icon = config.icon;

                    return (
                        <div key={entry.id} className="relative flex gap-4 pr-8">
                            {/* Icon */}
                            <div className={`
                absolute right-0 w-8 h-8 rounded-full flex items-center justify-center
                ${config.bgColor} ${config.color} z-10
                ring-4 ring-white
              `}>
                                <Icon className="w-4 h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pr-8">
                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className={`font-medium text-sm ${config.color}`}>
                                            {config.labelAr}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {formatRelativeTime(entry.performedAt)}
                                        </span>
                                    </div>

                                    {/* Performer */}
                                    <p className="text-sm text-slate-600">
                                        بواسطة: <span className="font-medium">{entry.performedByName}</span>
                                        {entry.performedByRole && (
                                            <span className="text-slate-400"> ({entry.performedByRole})</span>
                                        )}
                                    </p>

                                    {/* Notes */}
                                    {entry.notes && (
                                        <p className="mt-2 text-sm text-slate-700 bg-slate-50 rounded p-2">
                                            {entry.notes}
                                        </p>
                                    )}

                                    {/* Field changes */}
                                    {entry.fieldChanges && Object.keys(entry.fieldChanges).length > 0 && (
                                        <div className="mt-2 text-xs">
                                            <p className="text-slate-500 mb-1">التغييرات:</p>
                                            <ul className="space-y-1">
                                                {Object.entries(entry.fieldChanges).map(([field, change]) => (
                                                    <li key={field} className="text-slate-600">
                                                        <span className="font-medium">{field}:</span>{' '}
                                                        <span className="text-red-500 line-through">{String(change.old)}</span>{' '}
                                                        <span className="text-emerald-600">→ {String(change.new)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Timestamp tooltip */}
                                    <p className="text-xs text-slate-400 mt-2">
                                        {formatDate(entry.performedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReportTimeline;
