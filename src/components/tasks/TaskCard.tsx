/**
 * Task Card Component
 * بطاقة عرض المهمة
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    CalendarIcon,
    UserGroupIcon,
    ChatBubbleLeftIcon,
    PaperClipIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    FlagIcon
} from '@heroicons/react/24/outline';
import type { Task } from '../../domain/tasks/types';
import { FormattedDate } from '../common/FormattedDate';
import {
    taskStatusLabels,
    taskStatusColors,
    taskPriorityLabels,
    taskPriorityColors,
    getTaskProgress,
    isTaskOverdue,
    getDaysUntilDue
} from '../../domain/tasks/types';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
    compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, compact = false }) => {
    const progress = getTaskProgress(task);
    const overdue = isTaskOverdue(task);
    const daysUntil = getDaysUntilDue(task);
    const statusColors = taskStatusColors[task.status];
    const priorityColors = taskPriorityColors[task.priority];

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
                    {task.dueDate && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600' : ''}`}>
                            <CalendarIcon className="w-3 h-3" />
                            <FormattedDate date={task.dueDate} />
                        </span>
                    )}
                    {task.assignees.length > 0 && (
                        <span className="flex items-center gap-1">
                            <UserGroupIcon className="w-3 h-3" />
                            {task.assignees.length}
                        </span>
                    )}
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
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                        to={`/tasks/${task.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 line-clamp-2"
                    >
                        {task.title}
                    </Link>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                        {taskStatusLabels[task.status]}
                    </span>
                </div>

                {/* Description */}
                {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {task.description}
                    </p>
                )}

                {/* Progress Bar */}
                {task.checklist.length > 0 && (
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
                    {task.dueDate && (
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
                    {task.checklist.length > 0 && (
                        <span className="flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" />
                            {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                        </span>
                    )}

                    {/* Comments */}
                    {task.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                            {task.comments.length}
                        </span>
                    )}

                    {/* Attachments */}
                    {task.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                            <PaperClipIcon className="w-4 h-4" />
                            {task.attachments.length}
                        </span>
                    )}
                </div>

                {/* Assignees */}
                {task.assignees.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                            {task.assignees.slice(0, 4).map((assignee) => (
                                <div
                                    key={assignee.userId}
                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800"
                                    title={assignee.userName}
                                >
                                    {assignee.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                            ))}
                            {task.assignees.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800">
                                    +{task.assignees.length - 4}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">
                            {task.assignees.length === 1 ? task.assignees[0].userName : `${task.assignees.length} أشخاص`}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskCard;
