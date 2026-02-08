import React, { useState } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ChatBubbleLeftIcon,
    UserCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '../../utils';
import { cn } from '../../utils';
import type { WorkflowStep } from './WorkflowConfigEditor';

export interface ApprovalAction {
    step_id: string;
    action: 'approved' | 'rejected' | 'pending';
    user_id: string;
    user_name: string;
    timestamp: string;
    comments?: string;
}

interface ApprovalPanelProps {
    workflowSteps: WorkflowStep[];
    approvalHistory: ApprovalAction[];
    currentUserRole: string;
    onApprove: (stepId: string, comments?: string) => void;
    onReject: (stepId: string, comments: string) => void;
    readonly?: boolean;
}

const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
    workflowSteps,
    approvalHistory,
    currentUserRole,
    onApprove,
    onReject,
    readonly = false
}) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const [comments, setComments] = useState<Record<string, string>>({});

    const toggleStep = (stepId: string) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(stepId)) {
            newExpanded.delete(stepId);
        } else {
            newExpanded.add(stepId);
        }
        setExpandedSteps(newExpanded);
    };

    const getStepStatus = (step: WorkflowStep): ApprovalAction | undefined => {
        return approvalHistory.find(a => a.step_id === step.id);
    };

    const canApprove = (step: WorkflowStep): boolean => {
        if (readonly) return false;
        const status = getStepStatus(step);
        if (status && status.action !== 'pending') return false;
        return step.role === currentUserRole;
    };

    const handleApprove = (stepId: string) => {
        onApprove(stepId, comments[stepId]);
        setComments({ ...comments, [stepId]: '' });
    };

    const handleReject = (stepId: string) => {
        if (!comments[stepId]?.trim()) {
            alert('يجب إضافة تعليق عند الرفض');
            return;
        }
        onReject(stepId, comments[stepId]);
        setComments({ ...comments, [stepId]: '' });
    };

    const getStatusColor = (action?: 'approved' | 'rejected' | 'pending') => {
        switch (action) {
            case 'approved':
                return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'rejected':
                return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'pending':
            default:
                return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
        }
    };

    const getStatusIcon = (action?: 'approved' | 'rejected' | 'pending') => {
        switch (action) {
            case 'approved':
                return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
            case 'rejected':
                return <XCircleIcon className="w-6 h-6 text-red-600" />;
            case 'pending':
            default:
                return <ClockIcon className="w-6 h-6 text-amber-600" />;
        }
    };

    const getStatusText = (action?: 'approved' | 'rejected' | 'pending') => {
        switch (action) {
            case 'approved':
                return 'تمت الموافقة';
            case 'rejected':
                return 'مرفوض';
            case 'pending':
            default:
                return 'قيد الانتظار';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 rounded-lg text-white">
                <h2 className="text-2xl font-bold">لوحة الموافقات</h2>
                <p className="text-indigo-100 text-sm mt-1">
                    تتبع حالة الموافقات والمراجعات
                </p>
            </div>

            {/* Workflow Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        التقدم في سير العمل
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {approvalHistory.filter(a => a.action === 'approved').length} / {workflowSteps.length}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{
                            width: `${(approvalHistory.filter(a => a.action === 'approved').length / workflowSteps.length) * 100}%`
                        }}
                    />
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                    {workflowSteps.map((step, index) => {
                        const status = getStepStatus(step);
                        const isExpanded = expandedSteps.has(step.id);
                        const userCanApprove = canApprove(step);

                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    'border rounded-lg overflow-hidden transition-all',
                                    getStatusColor(status?.action || 'pending')
                                )}
                            >
                                {/* Step Header */}
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => toggleStep(step.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Step Number */}
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>

                                        {/* Step Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{step.name}</h4>
                                                {step.required && (
                                                    <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                                                        إلزامي
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm">
                                                <span className="flex items-center gap-1">
                                                    <UserCircleIcon className="w-4 h-4" />
                                                    {step.role}
                                                </span>
                                                {step.timeout_hours && (
                                                    <span className="flex items-center gap-1">
                                                        <ClockIcon className="w-4 h-4" />
                                                        {step.timeout_hours} ساعة
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(status?.action || 'pending')}
                                            <span className="font-medium">
                                                {getStatusText(status?.action || 'pending')}
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUpIcon className="w-5 h-5" />
                                            ) : (
                                                <ChevronDownIcon className="w-5 h-5" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-current/20">
                                        {/* Description */}
                                        {step.description && (
                                            <p className="text-sm mt-3 mb-4">
                                                {step.description}
                                            </p>
                                        )}

                                        {/* Approval History */}
                                        {status && (
                                            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    <UserCircleIcon className="w-6 h-6 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">{status.user_name}</span>
                                                            <span className="text-xs">
                                                                {formatDate(status.timestamp, 'dd/MM/yyyy HH:mm')}
                                                            </span>
                                                        </div>
                                                        {status.comments && (
                                                            <div className="mt-2 flex items-start gap-2">
                                                                <ChatBubbleLeftIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                <p className="text-sm">{status.comments}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons - Only if user can approve */}
                                        {userCanApprove && !status && (
                                            <div className="mt-4 space-y-3">
                                                <textarea
                                                    value={comments[step.id] || ''}
                                                    onChange={(e) => setComments({ ...comments, [step.id]: e.target.value })}
                                                    placeholder="إضافة تعليق (اختياري للموافقة، إلزامي للرفض)"
                                                    rows={3}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleApprove(step.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                        موافقة
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(step.id)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        <XCircleIcon className="w-5 h-5" />
                                                        رفض
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pending message for other users */}
                                        {!userCanApprove && !status && (
                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                                    بانتظار موافقة: {step.role}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="text-sm text-green-800 dark:text-green-200">موافق عليه</p>
                            <p className="text-2xl font-bold text-green-600">
                                {approvalHistory.filter(a => a.action === 'approved').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <ClockIcon className="w-8 h-8 text-amber-600" />
                        <div>
                            <p className="text-sm text-amber-800 dark:text-amber-200">قيد الانتظار</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {workflowSteps.length - approvalHistory.filter(a => a.action !== 'pending').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <XCircleIcon className="w-8 h-8 text-red-600" />
                        <div>
                            <p className="text-sm text-red-800 dark:text-red-200">مرفوض</p>
                            <p className="text-2xl font-bold text-red-600">
                                {approvalHistory.filter(a => a.action === 'rejected').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovalPanel;
