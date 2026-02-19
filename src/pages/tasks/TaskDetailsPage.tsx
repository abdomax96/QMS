/**
 * Task Details Page
 * صفحة تفاصيل المهمة - مع سير العمل والإسناد والاعتماد
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowRightIcon,
    TrashIcon,
    CalendarIcon,
    ClockIcon,
    ChatBubbleLeftIcon,
    PaperClipIcon,
    CheckCircleIcon,
    PlusIcon,
    FlagIcon,
    TagIcon,
    XMarkIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import useStore from '../../store';
import type { TaskChecklist } from '../../types/task';
import {
    taskStageLabels,
    taskStageColors,
    taskPriorityLabels,
    taskPriorityColors,
    taskCategoryLabels,
    getTaskProgress,
    isTaskOverdue,
    formatTimeAgo,
} from '../../domain/tasks/types';
import { useDateFormat } from '../../hooks/useDateFormat';
import TaskWorkflowPanel from '../../components/tasks/TaskWorkflowPanel';
import TaskAssignments from '../../components/tasks/TaskAssignments';
import TaskApprovalPanel from '../../components/tasks/TaskApprovalPanel';

const TaskDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useStore();
    const {
        currentTask: task,
        comments,
        stageHistory,
        assignments,
        isLoading,
        fetchTaskById,
        fetchComments,
        fetchStageHistory,
        fetchAssignments,
        assignUsers,
        assignRole,
        assignDepartment,
        acceptTask,
        declineTask,
        removeAssignment,
        updateChecklist,
        addComment,
        deleteTask,
        advanceStage,
        returnStage,
        approveTask,
        rejectTask,
    } = useTaskStore();
    const { formatDate } = useDateFormat();

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newComment, setNewComment] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Load task and related data
    useEffect(() => {
        if (id) {
            fetchTaskById(id);
            fetchComments(id);
            fetchStageHistory(id);
            fetchAssignments(id);
        }
    }, [id, fetchTaskById, fetchComments, fetchStageHistory, fetchAssignments]);

    const progress = useMemo(() => task ? getTaskProgress(task) : 0, [task]);
    const overdue = useMemo(() => task ? isTaskOverdue(task) : false, [task]);

    if (isLoading && !task) {
        return (
            <div className="p-6 text-center">
                <ArrowPathIcon className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">جاري تحميل المهمة...</p>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">المهمة غير موجودة</h2>
                <Link to="/tasks" className="text-primary-600 hover:underline">العودة لقائمة المهام</Link>
            </div>
        );
    }

    const priorityColors = taskPriorityColors[task.priority];
    const actor = { id: user?.id || '', name: user?.name || user?.email || 'User' };
    const companyId = task.company_id || 'a0000001-0000-0000-0000-000000000001';

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim()) return;
        const newItem: TaskChecklist = {
            id: `cl_${Date.now()}`,
            text: newChecklistItem.trim(),
            completed: false,
        };
        await updateChecklist(task.id, [...task.checklist, newItem]);
        setNewChecklistItem('');
    };

    const handleToggleChecklistItem = async (itemId: string) => {
        const updated = task.checklist.map(item =>
            item.id === itemId
                ? {
                      ...item,
                      completed: !item.completed,
                      completed_at: !item.completed ? new Date().toISOString() : undefined,
                      completed_by: !item.completed ? user?.id : undefined,
                  }
                : item
        );
        await updateChecklist(task.id, updated);
    };

    const handleRemoveChecklistItem = async (itemId: string) => {
        await updateChecklist(task.id, task.checklist.filter(item => item.id !== itemId));
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;
        await addComment(task.id, newComment.trim(), { id: user.id, name: user.name || '' });
        setNewComment('');
    };

    const handleDelete = async () => {
        await deleteTask(task.id);
        navigate('/tasks');
    };

    const handleAdvanceStage = async (notes?: string) => {
        if (!user) return;
        setActionLoading(true);
        try {
            const result = await advanceStage(task.id, { id: user.id, name: user.name || '' }, notes);
            if (!result.success && result.error) {
                alert(result.error);
            }
            // Re-fetch stage history
            await fetchStageHistory(task.id);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturnStage = async (notes?: string) => {
        if (!user) return;
        setActionLoading(true);
        try {
            const result = await returnStage(task.id, { id: user.id, name: user.name || '' }, notes);
            if (!result.success && result.error) {
                alert(result.error);
            }
            await fetchStageHistory(task.id);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async (notes?: string) => {
        if (!user) return;
        setActionLoading(true);
        try {
            const result = await approveTask(task.id, { id: user.id, name: user.name || '' }, notes);
            if (!result.success && result.error) {
                alert(result.error);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!user) return;
        setActionLoading(true);
        try {
            const result = await rejectTask(task.id, { id: user.id, name: user.name || '' }, reason);
            if (!result.success && result.error) {
                alert(result.error);
            }
        } finally {
            setActionLoading(false);
        }
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
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                        {task.task_number && (
                            <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                #{task.task_number}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {task.created_by_name && <span>أنشأها {task.created_by_name}</span>}
                        <span>•</span>
                        <span>{formatTimeAgo(task.created_at)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Workflow Panel */}
            <div className="mb-6">
                <TaskWorkflowPanel
                    task={task}
                    onAdvance={handleAdvanceStage}
                    onReturn={handleReturnStage}
                    loading={actionLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Approval Panel */}
                    <TaskApprovalPanel
                        task={task}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        loading={actionLoading}
                    />

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
                                        onClick={() => handleToggleChecklistItem(item.id)}
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
                                        onClick={() => handleRemoveChecklistItem(item.id)}
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
                            التعليقات ({comments.length})
                        </h3>

                        {/* Comment List */}
                        <div className="space-y-4 mb-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                        {(comment.author_name || '؟').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">{comment.author_name || 'مجهول'}</span>
                                            <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                                            {comment.edited && (
                                                <span className="text-xs text-gray-400">(معدّل)</span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">لا توجد تعليقات بعد</p>
                            )}
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

                    {/* Stage History */}
                    {stageHistory.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">سجل المراحل</h3>
                            <div className="space-y-3">
                                {stageHistory.map((entry) => (
                                    <div key={entry.id} className="flex items-start gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0"></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {entry.changed_by_name || 'النظام'}
                                                </span>
                                                <span className="text-gray-500">
                                                    {entry.action === 'advance' ? 'نقل من' : entry.action === 'return' ? 'أرجع من' : entry.action}
                                                </span>
                                                {entry.from_stage && (
                                                    <>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${taskStageColors[entry.from_stage]?.bg || ''} ${taskStageColors[entry.from_stage]?.text || ''}`}>
                                                            {taskStageLabels[entry.from_stage] || entry.from_stage}
                                                        </span>
                                                        <span className="text-gray-400">←</span>
                                                    </>
                                                )}
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${taskStageColors[entry.to_stage]?.bg || ''} ${taskStageColors[entry.to_stage]?.text || ''}`}>
                                                    {taskStageLabels[entry.to_stage] || entry.to_stage}
                                                </span>
                                            </div>
                                            {entry.notes && (
                                                <p className="text-gray-500 mt-1">{entry.notes}</p>
                                            )}
                                            <span className="text-xs text-gray-400">{formatTimeAgo(entry.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stage Badge */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">المرحلة الحالية</h4>
                        <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-medium ${taskStageColors[task.current_stage]?.bg || ''} ${taskStageColors[task.current_stage]?.text || ''}`}>
                            {taskStageLabels[task.current_stage] || task.current_stage}
                        </span>
                    </div>

                    {/* Assignments */}
                    <TaskAssignments
                        task={task}
                        assignments={assignments}
                        currentUserId={actor.id}
                        companyId={companyId}
                        onAssignUsers={async (userIds, primaryId) => {
                            if (!id || !actor.id) return;
                            await assignUsers(id, userIds, primaryId, actor, companyId);
                            await fetchAssignments(id);
                            await fetchTaskById(id);
                        }}
                        onAssignRole={async (roleId) => {
                            if (!id || !actor.id) return;
                            await assignRole(id, roleId, actor);
                            await fetchTaskById(id);
                        }}
                        onAssignDepartment={async (departmentId) => {
                            if (!id || !actor.id) return;
                            await assignDepartment(id, departmentId, actor);
                            await fetchTaskById(id);
                        }}
                        onAccept={async () => {
                            if (!id || !actor.id) return;
                            await acceptTask(id, actor, companyId);
                            await fetchAssignments(id);
                            await fetchTaskById(id);
                        }}
                        onDecline={async (reason) => {
                            if (!id || !actor.id) return;
                            await declineTask(id, actor, reason);
                            await fetchAssignments(id);
                        }}
                        onRemoveAssignment={async (userId) => {
                            if (!id || !actor.id) return;
                            await removeAssignment(id, userId);
                            await fetchAssignments(id);
                        }}
                    />

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
                                {task.due_date ? formatDate(task.due_date) : 'غير محدد'}
                                {overdue && ' (متأخر)'}
                            </span>
                        </div>

                        {/* Estimated Hours */}
                        {task.estimated_hours && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" /> الوقت المقدر
                                </h4>
                                <span className="text-gray-600 dark:text-gray-400">{task.estimated_hours} ساعة</span>
                            </div>
                        )}

                        {/* Approval Status */}
                        {task.requires_approval && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                    <CheckCircleIcon className="w-4 h-4" /> الاعتماد
                                </h4>
                                {task.approved_by ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        معتمد بواسطة {task.approved_by_name}
                                    </span>
                                ) : task.rejected_by ? (
                                    <span className="text-red-600 dark:text-red-400">
                                        مرفوض
                                    </span>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        في انتظار الاعتماد
                                    </span>
                                )}
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

                    {/* Attachments */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                            <PaperClipIcon className="w-4 h-4" /> المرفقات ({task.attachments?.length || 0})
                        </h4>
                        {(!task.attachments || task.attachments.length === 0) ? (
                            <p className="text-sm text-gray-500">لا توجد مرفقات</p>
                        ) : (
                            <div className="space-y-2">
                                {task.attachments.map((att: any) => (
                                    <a
                                        key={att.id}
                                        href={att.file_path || att.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                                    >
                                        {att.file_name || att.fileName}
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
