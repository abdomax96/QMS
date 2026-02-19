/**
 * Tasks Page
 * صفحة إدارة المهام الرئيسية - مدعومة بـ Supabase مع Kanban بالمراحل
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
    PlusIcon,
    FunnelIcon,
    ListBulletIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import TaskForm from '../../components/tasks/TaskForm';
import type { TaskPriority, CreateTaskInput, TaskStage, Task } from '../../types/task';
import { TASK_STAGE_ORDER, TASK_STAGE_LABELS } from '../../types/task';
import { taskStageColors, taskPriorityLabels, taskPriorityColors, taskStatusColors, taskStatusLabels } from '../../domain/tasks/types';
import useStore from '../../store';
import { useNavigate } from 'react-router-dom';

const TasksPage: React.FC = () => {
    const { user } = useStore();
    const navigate = useNavigate();
    const {
        tasks,
        filters,
        isLoading,
        fetchTasks,
        createTask,
        updateTask,
        setFilters,
        clearFilters,
        getFilteredTasks,
    } = useTaskStore();

    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    // Load tasks on mount
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const filteredTasks = useMemo(() => {
        let result = getFilteredTasks();
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(query) ||
                (t.description || '').toLowerCase().includes(query)
            );
        }
        return result;
    }, [getFilteredTasks, searchQuery, tasks, filters]);

    const stats = useMemo(() => ({
        total: tasks.length,
        assignment: tasks.filter(t => t.current_stage === 'assignment').length,
        inProgress: tasks.filter(t => t.current_stage === 'in_progress').length,
        review: tasks.filter(t => t.current_stage === 'review' || t.current_stage === 'approval').length,
        closed: tasks.filter(t => t.current_stage === 'closed').length,
        overdue: tasks.filter(t => t.due_date && t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.due_date) < new Date()).length,
    }), [tasks]);

    const handleCreateTask = async (data: CreateTaskInput) => {
        if (!user) return;
        setCreateLoading(true);
        try {
            const task = await createTask(data, { id: user.id, name: user.name || '' });
            if (task) {
                setShowNewTaskModal(false);
            }
        } finally {
            setCreateLoading(false);
        }
    };

    const mapTaskToFormData = (task: Task): Partial<CreateTaskInput> => ({
        title: task.title,
        description: task.description || '',
        task_type: task.task_type,
        priority: task.priority,
        category: task.category,
        assignment_type: task.assignment_type,
        assignee_ids: task.assigned_to ? [task.assigned_to] : [],
        primary_assignee_id: task.primary_assignee_id || task.assigned_to,
        assigned_role_id: task.assigned_role_id,
        assigned_department_id: task.assigned_department_id,
        due_date: task.due_date || '',
        tags: task.tags || [],
        estimated_hours: task.estimated_hours,
        requires_approval: task.requires_approval,
        requires_verification: task.requires_verification,
    });

    const handleOpenEditTask = (task: Task) => {
        setEditingTask(task);
        setShowEditTaskModal(true);
    };

    const handleEditTask = async (data: CreateTaskInput) => {
        if (!user || !editingTask) return;
        setEditLoading(true);
        try {
            const success = await updateTask(
                editingTask.id,
                {
                    title: data.title,
                    description: data.description,
                    task_type: data.task_type,
                    category: data.category,
                    priority: data.priority,
                    due_date: data.due_date,
                    tags: data.tags,
                    estimated_hours: data.estimated_hours,
                    requires_approval: data.requires_approval,
                    requires_verification: data.requires_verification,
                },
                { id: user.id, name: user.name || '' }
            );

            if (success) {
                setShowEditTaskModal(false);
                setEditingTask(null);
                await fetchTasks();
            }
        } finally {
            setEditLoading(false);
        }
    };

    const toggleStageFilter = (stage: TaskStage) => {
        const current = filters.stage || [];
        if (current.includes(stage)) {
            setFilters({ ...filters, stage: current.filter(s => s !== stage) });
        } else {
            setFilters({ ...filters, stage: [...current, stage] });
        }
    };

    const togglePriorityFilter = (priority: TaskPriority) => {
        const current = filters.priority || [];
        if (current.includes(priority)) {
            setFilters({ ...filters, priority: current.filter(p => p !== priority) });
        } else {
            setFilters({ ...filters, priority: [...current, priority] });
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">المهام</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة وتتبع مهام الفريق</p>
                </div>
                <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <PlusIcon className="w-5 h-5" />
                    مهمة جديدة
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <ListBulletIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                            <div className="text-xs text-gray-500">إجمالي</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.assignment}</div>
                            <div className="text-xs text-gray-500">التعيين</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <ArrowPathIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</div>
                            <div className="text-xs text-gray-500">قيد التنفيذ</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.review}</div>
                            <div className="text-xs text-gray-500">مراجعة/اعتماد</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.closed}</div>
                            <div className="text-xs text-gray-500">مغلقة</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</div>
                            <div className="text-xs text-gray-500">متأخرة</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث في المهام..."
                        className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Filter & View Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchTasks()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title="تحديث"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
                            showFilters || (filters.stage?.length || filters.priority?.length)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                        فلتر
                    </button>

                    <div className="flex border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                        <div className="p-3 bg-primary-600 text-white">
                            <ListBulletIcon className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">الفلاتر</h3>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-primary-600 hover:underline"
                        >
                            مسح الكل
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Stage Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المرحلة</label>
                            <div className="flex flex-wrap gap-2">
                                {TASK_STAGE_ORDER.map(stage => {
                                    const colors = taskStageColors[stage];
                                    return (
                                        <button
                                            key={stage}
                                            onClick={() => toggleStageFilter(stage)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                                filters.stage?.includes(stage)
                                                    ? `${colors.bg} ${colors.text} font-medium`
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                            }`}
                                        >
                                            {TASK_STAGE_LABELS[stage].ar}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Priority Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الأولوية</label>
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(taskPriorityLabels) as [TaskPriority, string][]).map(([priority, label]) => (
                                    <button
                                        key={priority}
                                        onClick={() => togglePriorityFilter(priority)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                            filters.priority?.includes(priority)
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 font-medium'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && tasks.length === 0 && (
                <div className="text-center py-16">
                    <ArrowPathIcon className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">جاري تحميل المهام...</p>
                </div>
            )}

            {/* Task Table View */}
            {!isLoading && filteredTasks.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <ListBulletIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">لا توجد مهام</h3>
                    <p className="text-gray-500 mb-6">ابدأ بإنشاء مهمة جديدة لفريقك</p>
                    <button
                        onClick={() => setShowNewTaskModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        إنشاء مهمة
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr className="text-right text-gray-600 dark:text-gray-300">
                                <th className="px-4 py-3 font-medium">رقم</th>
                                <th className="px-4 py-3 font-medium">العنوان</th>
                                <th className="px-4 py-3 font-medium">المرحلة</th>
                                <th className="px-4 py-3 font-medium">الحالة</th>
                                <th className="px-4 py-3 font-medium">الأولوية</th>
                                <th className="px-4 py-3 font-medium">المسؤول</th>
                                <th className="px-4 py-3 font-medium">الموعد النهائي</th>
                                <th className="px-4 py-3 font-medium">آخر تحديث</th>
                                <th className="px-4 py-3 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredTasks.map(task => {
                                const stageColor = taskStageColors[task.current_stage] || taskStageColors.assignment;
                                const statusColor = taskStatusColors[task.status] || taskStatusColors.pending;
                                const priorityColor = taskPriorityColors[task.priority] || taskPriorityColors.medium;
                                const isOverdue = !!(
                                    task.due_date &&
                                    task.status !== 'completed' &&
                                    task.status !== 'cancelled' &&
                                    new Date(task.due_date) < new Date()
                                );

                                const assigneeLabel =
                                    task.assigned_to_name ||
                                    (task.assignment_type === 'role'
                                        ? 'حسب الدور'
                                        : task.assignment_type === 'department'
                                            ? 'حسب القسم'
                                            : 'غير محدد');

                                return (
                                    <tr
                                        key={task.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                    >
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {task.task_number || '-'}
                                        </td>
                                        <td className="px-4 py-3 min-w-[260px]">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {task.title}
                                            </div>
                                            {task.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[320px]">
                                                    {task.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${stageColor.bg} ${stageColor.text}`}>
                                                {TASK_STAGE_LABELS[task.current_stage]?.ar || task.current_stage}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                                                {taskStatusLabels[task.status] || task.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                                                {taskPriorityLabels[task.priority] || task.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {assigneeLabel}
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(task.updated_at || task.created_at).toLocaleDateString('ar-EG')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditTask(task);
                                                    }}
                                                    className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                >
                                                    تعديل
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/tasks/${task.id}`);
                                                    }}
                                                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    فتح
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Task Modal */}
            {showEditTaskModal && editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">تعديل المهمة</h2>
                                <button
                                    onClick={() => {
                                        setShowEditTaskModal(false);
                                        setEditingTask(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <TaskForm
                                mode="edit"
                                initialData={mapTaskToFormData(editingTask)}
                                onSubmit={handleEditTask}
                                onCancel={() => {
                                    setShowEditTaskModal(false);
                                    setEditingTask(null);
                                }}
                                isLoading={editLoading}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* New Task Modal */}
            {showNewTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">مهمة جديدة</h2>
                                <button
                                    onClick={() => setShowNewTaskModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <TaskForm
                                mode="create"
                                onSubmit={handleCreateTask}
                                onCancel={() => setShowNewTaskModal(false)}
                                isLoading={createLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
