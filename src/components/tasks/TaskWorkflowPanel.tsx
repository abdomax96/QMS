/**
 * Task Workflow Panel - Visual stage progression
 * شريط تقدم مراحل المهمة مع أزرار التقدم والرجوع
 */

import React, { useState } from 'react';
import {
    CheckCircleIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import type { Task, TaskStage } from '../../types/task';
import { TASK_STAGE_ORDER, TASK_STAGE_LABELS } from '../../types/task';
import { useTaskStagePermissions } from '../../hooks/tasks/useTaskStagePermissions';

interface TaskWorkflowPanelProps {
    task: Task;
    onAdvance: (notes?: string) => Promise<void>;
    onReturn: (notes?: string) => Promise<void>;
    loading?: boolean;
}

const TaskWorkflowPanel: React.FC<TaskWorkflowPanelProps> = ({
    task,
    onAdvance,
    onReturn,
    loading = false,
}) => {
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [actionType, setActionType] = useState<'advance' | 'return' | null>(null);

    const { canProgressWorkflow, canReturnWorkflow } = useTaskStagePermissions(task.current_stage);

    const currentIndex = TASK_STAGE_ORDER.indexOf(task.current_stage);
    const isFirstStage = currentIndex === 0;
    const isLastStage = currentIndex === TASK_STAGE_ORDER.length - 1;

    const handleAction = async () => {
        if (actionType === 'advance') {
            await onAdvance(notes || undefined);
        } else if (actionType === 'return') {
            await onReturn(notes || undefined);
        }
        setNotes('');
        setShowNotes(false);
        setActionType(null);
    };

    const initiateAction = (type: 'advance' | 'return') => {
        setActionType(type);
        setShowNotes(true);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            {/* Stage Progress Bar */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    سير العمل
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {TASK_STAGE_LABELS[task.current_stage]?.ar || task.current_stage}
                </span>
            </div>

            {/* Stages Visualization */}
            <div className="flex items-center gap-1 mb-5">
                {TASK_STAGE_ORDER.map((stage, idx) => {
                    const stageInfo = TASK_STAGE_LABELS[stage];
                    const isCompleted = (task.completed_stages || []).includes(stage) || idx < currentIndex;
                    const isCurrent = stage === task.current_stage;

                    return (
                        <React.Fragment key={stage}>
                            {idx > 0 && (
                                <div
                                    className={`flex-1 h-0.5 transition-colors ${
                                        isCompleted ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                />
                            )}
                            <div className="flex flex-col items-center min-w-0">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        isCompleted
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                            : isCurrent
                                                ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800'
                                                : 'bg-gray-100 dark:bg-gray-700'
                                    }`}
                                    style={isCurrent
                                        ? ({ backgroundColor: `${stageInfo.color}20`, '--tw-ring-color': stageInfo.color } as React.CSSProperties)
                                        : undefined}
                                >
                                    {isCompleted ? (
                                        <CheckCircleSolid className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : isCurrent ? (
                                        <ClockIcon className="h-4 w-4" style={{ color: stageInfo.color }} />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500" />
                                    )}
                                </div>
                                <span
                                    className={`text-[10px] mt-1 text-center leading-tight ${
                                        isCurrent
                                            ? 'font-semibold text-gray-900 dark:text-white'
                                            : isCompleted
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    {stageInfo.ar}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Action Buttons */}
            {task.current_stage !== 'closed' && (
                <div className="flex items-center gap-3">
                    {/* Return Button */}
                    {!isFirstStage && canReturnWorkflow && (
                        <button
                            onClick={() => initiateAction('return')}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 transition-colors"
                        >
                            <ChevronDoubleLeftIcon className="h-4 w-4" />
                            إرجاع
                        </button>
                    )}

                    {/* Advance Button */}
                    {!isLastStage && canProgressWorkflow && (
                        <button
                            onClick={() => initiateAction('advance')}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition-colors mr-auto"
                        >
                            تقدم للمرحلة التالية
                            <ChevronDoubleRightIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Notes Input */}
            {showNotes && (
                <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={actionType === 'advance' ? 'ملاحظات التقدم (اختياري)...' : 'سبب الإرجاع (اختياري)...'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                        rows={2}
                    />
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => { setShowNotes(false); setActionType(null); setNotes(''); }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleAction}
                            disabled={loading}
                            className={`px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 ${
                                actionType === 'advance'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                        >
                            {loading ? 'جارٍ...' : actionType === 'advance' ? 'تأكيد التقدم' : 'تأكيد الإرجاع'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskWorkflowPanel;
