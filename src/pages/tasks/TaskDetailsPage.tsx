/**
 * Task Details Page
 * صفحة تفاصيل المهمة
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowRightIcon,
    PencilIcon,
    TrashIcon,
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    ChatBubbleLeftIcon,
    PaperClipIcon,
    CheckCircleIcon,
    PlusIcon,
    FlagIcon,
    TagIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import useStore from '../../store';
import type { TaskStatus } from '../../domain/tasks/types';
import {
    taskStatusLabels,
    taskStatusColors,
    taskPriorityLabels,
    taskPriorityColors,
    taskCategoryLabels,
    getTaskProgress,
    isTaskOverdue,
    formatTimeAgo
} from '../../domain/tasks/types';
import { useDateFormat } from '../../hooks/useDateFormat';

const TaskDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useStore();
    const {
        getTaskById,
        updateTaskStatus,
        addChecklistItem,
        toggleChecklistItem,
        removeChecklistItem,
        addComment,
        deleteTask
    } = useTaskStore();
    const { formatDate } = useDateFormat();

    const task = getTaskById(id || '');

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newComment, setNewComment] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const progress = useMemo(() => task ? getTaskProgress(task) : 0, [task]);
    const overdue = useMemo(() => task ? isTaskOverdue(task) : false, [task]);

    if (!task) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">المهمة غير موجودة</h2>
                <Link to="/tasks" className="text-primary-600 hover:underline">العودة لقائمة المهام</Link>
            </div>
        );
    }

    const statusColors = taskStatusColors[task.status];
    const priorityColors = taskPriorityColors[task.priority];

    const handleStatusChange = (newStatus: TaskStatus) => {
        updateTaskStatus(task.id, newStatus, user?.id || '', user?.name || '');
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        addChecklistItem(task.id, newChecklistItem.trim());
        setNewChecklistItem('');
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        addComment(task.id, newComment.trim(), user?.id || '', user?.name || '');
        setNewComment('');
    };

    const handleDelete = () => {
        deleteTask(task.id);
        navigate('/tasks');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/tasks')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>أنشأها {task.createdByName}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(task.createdAt)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">الوصف</h3>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {task.description || 'لا يوجد وصف'}
                        </p>
                    </div>

                    {/* Checklist */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" />
                                قائمة المهام ({task.checklist.filter(c => c.completed).length}/{task.checklist.length})
                            </h3>
                            {task.checklist.length > 0 && (
                                <span className="text-sm text-gray-500">{progress}%</span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {task.checklist.length > 0 && (
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        {/* Checklist Items */}
                        <div className="space-y-2 mb-4">
                            {task.checklist.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                                >
                                    <button
                                        onClick={() => toggleChecklistItem(task.id, item.id, user?.id || '', user?.name || '')}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.completed
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-gray-300 hover:border-green-500'
                                            }`}
                                    >
                                        {item.completed && <CheckCircleIcon className="w-3 h-3" />}
                                    </button>
                                    <span className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {item.text}
                                    </span>
                                    <button
                                        onClick={() => removeChecklistItem(task.id, item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Checklist Item */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newChecklistItem}
                                onChange={(e) => setNewChecklistItem(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                placeholder="أضف مهمة فرعية..."
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                            />
                            <button
                                onClick={handleAddChecklistItem}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <ChatBubbleLeftIcon className="w-5 h-5" />
                            التعليقات ({task.comments.length})
                        </h3>

                        {/* Comment List */}
                        <div className="space-y-4 mb-4">
                            {task.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                        {comment.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">{comment.userName}</span>
                                            <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Comment */}
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                {(user?.name || 'م').split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="أضف تعليقاً..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 resize-none"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        إرسال
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">النشاط</h3>
                        <div className="space-y-3">
                            {task.activities.slice(0, 10).map((activity) => (
                                <div key={activity.id} className="flex items-center gap-3 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{activity.userName}</span>
                                    <span className="text-gray-500">{activity.description}</span>
                                    <span className="text-gray-400 mr-auto">{formatTimeAgo(activity.timestamp)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">الحالة</h4>
                        <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                            className={`w-full px-4 py-2 rounded-lg border-2 font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                        >
                            {Object.entries(taskStatusLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                        {/* Priority */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <FlagIcon className="w-4 h-4" /> الأولوية
                            </h4>
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${priorityColors.bg} ${priorityColors.text}`}>
                                {taskPriorityLabels[task.priority]}
                            </span>
                        </div>

                        {/* Category */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التصنيف</h4>
                            <span className="text-gray-600 dark:text-gray-400">{taskCategoryLabels[task.category]}</span>
                        </div>

                        {/* Due Date */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" /> الموعد النهائي
                            </h4>
                            <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                {task.dueDate ? formatDate(task.dueDate) : 'غير محدد'}
                                {overdue && ' (متأخر)'}
                            </span>
                        </div>

                        {/* Estimated Hours */}
                        {task.estimatedHours && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" /> الوقت المقدر
                                </h4>
                                <span className="text-gray-600 dark:text-gray-400">{task.estimatedHours} ساعة</span>
                            </div>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                    <TagIcon className="w-4 h-4" /> الوسوم
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {task.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assignees */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                            <UserGroupIcon className="w-4 h-4" /> المعينون ({task.assignees.length})
                        </h4>
                        {task.assignees.length === 0 ? (
                            <p className="text-sm text-gray-500">لم يتم تعيين أحد</p>
                        ) : (
                            <div className="space-y-2">
                                {task.assignees.map(assignee => (
                                    <div key={assignee.userId} className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                            {assignee.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300">{assignee.userName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                            <PaperClipIcon className="w-4 h-4" /> المرفقات ({task.attachments.length})
                        </h4>
                        {task.attachments.length === 0 ? (
                            <p className="text-sm text-gray-500">لا توجد مرفقات</p>
                        ) : (
                            <div className="space-y-2">
                                {task.attachments.map(att => (
                                    <a
                                        key={att.id}
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                                    >
                                        {att.fileName}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">حذف المهمة</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetailsPage;
