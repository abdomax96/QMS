/**
 * Task Card Component
 * بطاقة عرض المهمة - مع شارة المرحلة ومؤشر نوع الإسناد
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarIcon,
    UserGroupIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    FlagIcon,
    UserIcon,
    ShieldCheckIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import type { Task } from '../../types/task';
import { TASK_STAGE_LABELS, TASK_ASSIGNMENT_TYPE_LABELS } from '../../types/task';
import {
    taskStageColors,
    taskStageLabels,
    taskPriorityLabels,
    taskPriorityColors,
    getTaskProgress,
    isTaskOverdue,
    getDaysUntilDue,
} from '../../domain/tasks/types';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
    compact?: boolean;
}

const assignmentIcon = {
    individual: UserIcon,
    role: ShieldCheckIcon,
    department: BuildingOfficeIcon,
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, compact = false }) => {
    const progress = getTaskProgress(task);
    const overdue = isTaskOverdue(task);
    const daysUntil = getDaysUntilDue(task);
    const stageColors = taskStageColors[task.current_stage] || taskStageColors.assignment;
    const priorityColors = taskPriorityColors[task.priority] || taskPriorityColors.medium;
    const AssignIcon = assignmentIcon[task.assignment_type] || UserIcon;

    if (compact) {
        return (
            <Link
                to={`/tasks/${task.id}`}
                onClick={onClick}
                className="block p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
            >
                <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 truncate">
                        {task.title}
                    </h4>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors.bg} ${priorityColors.text}`}>
                        {taskPriorityLabels[task.priority]}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {task.due_date && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600' : ''}`}>
                            <CalendarIcon className="w-3 h-3" />
                            {overdue ? 'متأخر' : daysUntil === 0 ? 'اليوم' : daysUntil === 1 ? 'غداً' : `${daysUntil} يوم`}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <AssignIcon className="w-3 h-3" />
                        {TASK_ASSIGNMENT_TYPE_LABELS[task.assignment_type]?.ar || 'فردي'}
                    </span>
                </div>
            </Link>
        );
    }

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
        >
            {/* Priority Indicator */}
            {task.priority === 'urgent' && (
                <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            )}
            {task.priority === 'high' && (
                <div className="h-1 bg-gradient-to-r from-orange-400 to-yellow-400"></div>
            )}

            <div className="p-4">
                {/* Header: title + stage badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                        to={`/tasks/${task.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 line-clamp-2"
                    >
                        {task.title}
                    </Link>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${stageColors.bg} ${stageColors.text}`}>
                        {taskStageLabels[task.current_stage] || task.current_stage}
                    </span>
                </div>

                {/* Description */}
                {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {task.description}
                    </p>
                )}

                {/* Progress Bar */}
                {task.checklist && task.checklist.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">التقدم</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' :
                                    progress >= 50 ? 'bg-blue-500' : 'bg-primary-500'
                                    }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    {/* Priority */}
                    <span className={`flex items-center gap-1 ${priorityColors.text}`}>
                        <FlagIcon className="w-4 h-4" />
                        {taskPriorityLabels[task.priority]}
                    </span>

                    {/* Due Date */}
                    {task.due_date && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                            {overdue ? (
                                <ExclamationTriangleIcon className="w-4 h-4" />
                            ) : (
                                <CalendarIcon className="w-4 h-4" />
                            )}
                            {overdue ? 'متأخر' : daysUntil === 0 ? 'اليوم' : daysUntil === 1 ? 'غداً' : `${daysUntil} يوم`}
                        </span>
                    )}

                    {/* Checklist */}
                    {task.checklist && task.checklist.length > 0 && (
                        <span className="flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" />
                            {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                        </span>
                    )}

                    {/* Assignment type indicator */}
                    <span className="flex items-center gap-1">
                        <AssignIcon className="w-4 h-4" />
                        {TASK_ASSIGNMENT_TYPE_LABELS[task.assignment_type]?.ar || 'فردي'}
                    </span>

                    {/* Approval indicator */}
                    {task.requires_approval && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircleIcon className="w-4 h-4" />
                            اعتماد
                        </span>
                    )}
                </div>

                {/* Assignee info */}
                {task.assigned_to_name && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800">
                            {task.assigned_to_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs text-gray-500">
                            {task.assigned_to_name}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
