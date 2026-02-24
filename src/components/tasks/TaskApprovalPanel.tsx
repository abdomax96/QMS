/**
 * Task Approval Panel
 * لوحة اعتماد/رفض المهمة - تظهر فقط في مرحلة الاعتماد
 */

import React, { useState } from 'react';
import {
    CheckBadgeIcon,
    XCircleIcon,
    ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import type { Task, TaskStage } from '../../types/task';
import { useTaskStagePermissions } from '../../hooks/tasks/useTaskStagePermissions';

interface TaskApprovalPanelProps {
    task: Task;
    onApprove: (notes?: string) => Promise<void>;
    onReject: (reason: string, returnToStage?: TaskStage) => Promise<void>;
    loading?: boolean;
}

const TaskApprovalPanel: React.FC<TaskApprovalPanelProps> = ({
    task,
    onApprove,
    onReject,
    loading = false,
}) => {
    const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');

    const { canApprove, canReject } = useTaskStagePermissions(task.current_stage);

    // Only show in approval or review stage
    if (task.current_stage !== 'approval' && task.current_stage !== 'review') {
        return null;
    }

    // Show approval info if already approved
    if (task.approved_by) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        تمت الموافقة
                    </h3>
                </div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                    <p>المعتمد: {task.approved_by_name}</p>
                    {task.approved_at && (
                        <p>التاريخ: {new Date(task.approved_at).toLocaleDateString('ar-SA')}</p>
                    )}
                    {task.approval_notes && <p>ملاحظات: {task.approval_notes}</p>}
                </div>
            </div>
        );
    }

    // Show rejection info if rejected
    if (task.rejected_by) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                        تم الرفض
                    </h3>
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {task.rejected_at && (
                        <p>التاريخ: {new Date(task.rejected_at).toLocaleDateString('ar-SA')}</p>
                    )}
                    {task.rejection_reason && <p>السبب: {task.rejection_reason}</p>}
                </div>
            </div>
        );
    }

    const handleApprove = async () => {
        await onApprove(notes || undefined);
        setMode('idle');
        setNotes('');
    };

    const handleReject = async () => {
        if (!reason.trim()) return;
        await onReject(reason);
        setMode('idle');
        setReason('');
    };

    if (!canApprove && !canReject) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-amber-300 dark:border-amber-700 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {task.current_stage === 'approval' ? 'الاعتماد مطلوب' : 'المراجعة مطلوبة'}
                </h3>
            </div>

            {mode === 'idle' && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {canApprove && (
                        <button
                            onClick={() => setMode('approve')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                        >
                            <CheckBadgeIcon className="h-5 w-5" />
                            {task.current_stage === 'approval' ? 'اعتماد' : 'موافقة'}
                        </button>
                    )}
                    {canReject && (
                        <button
                            onClick={() => setMode('reject')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            <XCircleIcon className="h-5 w-5" />
                            رفض
                        </button>
                    )}
                </div>
            )}

            {mode === 'approve' && (
                <div className="space-y-3">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ملاحظات الاعتماد (اختياري)..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                        rows={2}
                    />
                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                        <button
                            onClick={() => { setMode('idle'); setNotes(''); }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={loading}
                            className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {loading ? 'جارٍ...' : 'تأكيد الاعتماد'}
                        </button>
                    </div>
                </div>
            )}

            {mode === 'reject' && (
                <div className="space-y-3">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="سبب الرفض (مطلوب)..."
                        className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                        rows={2}
                        required
                    />
                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                        <button
                            onClick={() => { setMode('idle'); setReason(''); }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={loading || !reason.trim()}
                            className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'جارٍ...' : 'تأكيد الرفض'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskApprovalPanel;
