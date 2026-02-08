/**
 * ReportStatusBadge Component
 * Visual indicator for report workflow status
 * 
 * Created: 2026-01-06
 */

import React from 'react';
import {
    FileEdit,
    Clock,
    Search,
    CheckCircle,
    XCircle,
    Archive,
    AlertCircle,
    Loader2
} from 'lucide-react';
import type { ReportStatus } from '../../types';

interface ReportStatusBadgeProps {
    status: ReportStatus;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showLabel?: boolean;
    className?: string;
}

const statusConfig: Record<ReportStatus, {
    label: string;
    labelAr: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
}> = {
    draft: {
        label: 'Draft',
        labelAr: 'مسودة',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-300',
        icon: FileEdit
    },
    in_progress: {
        label: 'In Progress',
        labelAr: 'قيد التعبئة',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300',
        icon: Loader2
    },
    submitted: {
        label: 'Pending Review',
        labelAr: 'في انتظار المراجعة',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-300',
        icon: Clock
    },
    under_review: {
        label: 'Under Review',
        labelAr: 'قيد المراجعة',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-300',
        icon: Search
    },
    approved: {
        label: 'Approved',
        labelAr: 'معتمد',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-300',
        icon: CheckCircle
    },
    rejected: {
        label: 'Rejected',
        labelAr: 'مرفوض',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-300',
        icon: XCircle
    },
    archived: {
        label: 'Archived',
        labelAr: 'مؤرشف',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        icon: Archive
    },
    cancelled: {
        label: 'Cancelled',
        labelAr: 'ملغي',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-500',
        borderColor: 'border-gray-300',
        icon: AlertCircle
    }
};

const sizeConfig = {
    sm: {
        padding: 'px-2 py-0.5',
        text: 'text-xs',
        iconSize: 'w-3 h-3',
        gap: 'gap-1'
    },
    md: {
        padding: 'px-2.5 py-1',
        text: 'text-sm',
        iconSize: 'w-4 h-4',
        gap: 'gap-1.5'
    },
    lg: {
        padding: 'px-3 py-1.5',
        text: 'text-base',
        iconSize: 'w-5 h-5',
        gap: 'gap-2'
    }
};

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({
    status,
    size = 'md',
    showIcon = true,
    showLabel = true,
    className = ''
}) => {
    const config = statusConfig[status] || statusConfig.draft;
    const sizeStyles = sizeConfig[size];
    const Icon = config.icon;

    // Detect language from document or default to Arabic
    const isArabic = document.documentElement.lang === 'ar' ||
        document.documentElement.dir === 'rtl';
    const label = isArabic ? config.labelAr : config.label;

    return (
        <span
            className={`
        inline-flex items-center ${sizeStyles.gap} ${sizeStyles.padding}
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        border rounded-full font-medium
        ${sizeStyles.text}
        ${className}
      `}
        >
            {showIcon && (
                <Icon className={`${sizeStyles.iconSize} ${status === 'in_progress' ? 'animate-spin' : ''}`} />
            )}
            {showLabel && <span>{label}</span>}
        </span>
    );
};

export default ReportStatusBadge;
