/**
 * NCR Stage History Timeline Component
 * عرض تاريخ مراحل التقرير
 */

import { WORKFLOW_STAGES } from '../../types/ncr';
import type { StageTransition, WorkflowStage } from '../../types/ncr';

interface Props {
    currentStage: string;
    completedStages: string[];
    stageHistory?: StageTransition[];
}

function formatDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

export default function NcrStageHistory({ currentStage, completedStages, stageHistory = [] }: Props) {
    const stages = Object.values(WORKFLOW_STAGES).sort((a, b) => a.order - b.order);
    const progress = ((completedStages.length) / stages.length) * 100;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">مراحل سير العمل</h2>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>التقدم</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-primary-500 to-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Stages Timeline */}
            <div className="space-y-4">
                {stages.map((stage, index) => {
                    const isCompleted = completedStages.includes(stage.id);
                    const isCurrent = stage.id === currentStage;
                    const historyItem = stageHistory?.find(h => h.to === stage.id);

                    return (
                        <div key={stage.id} className="flex gap-4">
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg
                                    ${isCompleted ? 'bg-green-500 text-white' :
                                        isCurrent ? 'bg-primary-500 text-white ring-4 ring-primary-200' :
                                            'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
                                >
                                    {isCompleted ? '✓' : stage.icon}
                                </div>
                                {index < stages.length - 1 && (
                                    <div className={`w-0.5 h-8 mt-1
                                        ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    />
                                )}
                            </div>

                            {/* Stage info */}
                            <div className="flex-1 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' :
                                        isCurrent ? 'text-primary-600 dark:text-primary-400' :
                                            'text-gray-500'}`}
                                    >
                                        {stage.name}
                                    </span>
                                    {isCurrent && (
                                        <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full animate-pulse">
                                            جارية
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{stage.description}</p>

                                {/* History details */}
                                {historyItem && (
                                    <div className="mt-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                                        <span>بواسطة: {historyItem.transitionedByName}</span>
                                        <span className="mx-2">•</span>
                                        <span>{formatDate(historyItem.transitionedAt)}</span>
                                        {historyItem.notes && (
                                            <p className="mt-1 text-gray-500">{historyItem.notes}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
