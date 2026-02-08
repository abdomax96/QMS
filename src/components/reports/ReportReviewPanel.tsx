/**
 * ReportReviewPanel Component
 * Review actions panel for reviewers - Modern Design
 * 
 * Created: 2026-01-06
 * Updated: 2026-01-06 - Improved design
 */

import React, { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Send,
    Loader2,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Shield
} from 'lucide-react';
import type { FormInstance } from '../../types';
import { useReportWorkflow } from '../../hooks/useReportWorkflow';

interface ReportReviewPanelProps {
    report: FormInstance;
    onActionComplete?: (action: string, success: boolean) => void;
    className?: string;
    compact?: boolean;
}

export const ReportReviewPanel: React.FC<ReportReviewPanelProps> = ({
    report,
    onActionComplete,
    className = '',
    compact = false
}) => {
    const { approveReport, rejectReport, isLoading, error } = useReportWorkflow();

    const [showNotes, setShowNotes] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const handleApprove = async () => {
        const result = await approveReport(report.id || report.instance_id, approvalNotes || undefined);
        onActionComplete?.('approve', result.success);
        if (result.success) {
            setApprovalNotes('');
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            return;
        }
        const result = await rejectReport(report.id || report.instance_id, rejectionReason);
        onActionComplete?.('reject', result.success);
        if (result.success) {
            setRejectionReason('');
            setShowRejectForm(false);
        }
    };

    // Only show for reports under review
    if (report.status !== 'under_review') {
        return null;
    }

    // Compact inline mode - just buttons
    if (compact) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 
                             text-white rounded-lg text-sm font-medium shadow-sm
                             hover:from-emerald-600 hover:to-emerald-700 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    اعتماد
                </button>
                <button
                    onClick={() => {
                        const reason = prompt('أدخل سبب الرفض:');
                        if (reason?.trim()) {
                            setRejectionReason(reason);
                            setTimeout(handleReject, 0);
                        }
                    }}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 
                             text-white rounded-lg text-sm font-medium shadow-sm
                             hover:from-red-600 hover:to-red-700 transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <XCircle className="w-3.5 h-3.5" />
                    رفض
                </button>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    إجراءات المراجعة
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">قم بمراجعة التقرير واتخاذ الإجراء المناسب</p>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Error display */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Main action buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleApprove}
                        disabled={isLoading || showRejectForm}
                        className="relative group px-4 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 
                                 text-white rounded-xl font-medium text-sm flex flex-col items-center gap-1.5
                                 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200
                                 shadow-md hover:shadow-lg hover:scale-[1.02]
                                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading && !showRejectForm ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        <span>اعتماد</span>
                        <span className="text-[10px] text-emerald-100 font-normal">الموافقة على التقرير</span>
                    </button>

                    <button
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        disabled={isLoading}
                        className={`relative group px-4 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1.5
                                  transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]
                                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                  ${showRejectForm
                                ? 'bg-red-600 text-white'
                                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-200 hover:from-red-500 hover:to-red-600 hover:text-white'
                            }`}
                    >
                        <XCircle className="w-5 h-5" />
                        <span>رفض</span>
                        <span className={`text-[10px] font-normal ${showRejectForm ? 'text-red-100' : 'text-slate-500 dark:text-slate-400 group-hover:text-red-100'}`}>
                            إرجاع للتعديل
                        </span>
                    </button>
                </div>

                {/* Optional notes toggle */}
                {!showRejectForm && (
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 dark:text-slate-400 
                                 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            إضافة ملاحظات (اختياري)
                        </span>
                        {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}

                {/* Approval notes */}
                {showNotes && !showRejectForm && (
                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                        <textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            placeholder="أضف ملاحظات على المراجعة..."
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm 
                                     bg-slate-50 dark:bg-slate-700/50
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                     placeholder:text-slate-400 resize-none"
                            rows={2}
                            disabled={isLoading}
                        />
                    </div>
                )}

                {/* Rejection form */}
                {showRejectForm && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                            <label className="text-sm font-medium">
                                سبب الرفض <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="يرجى توضيح سبب الرفض بالتفصيل ليتمكن المرسل من تصحيح الأخطاء..."
                            className="w-full px-3 py-2.5 border-2 border-red-200 dark:border-red-800 rounded-lg text-sm 
                                     focus:ring-2 focus:ring-red-500 focus:border-red-500
                                     placeholder:text-slate-400 resize-none bg-red-50 dark:bg-red-900/20"
                            rows={3}
                            disabled={isLoading}
                            required
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleReject}
                                disabled={isLoading || !rejectionReason.trim()}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg 
                                         font-medium text-sm flex items-center justify-center gap-2
                                         hover:from-red-700 hover:to-red-800 transition-all shadow-md
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        تأكيد الرفض
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectForm(false);
                                    setRejectionReason('');
                                }}
                                disabled={isLoading}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg 
                                         font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportReviewPanel;

