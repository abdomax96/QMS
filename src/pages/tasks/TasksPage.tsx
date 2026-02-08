/**
 * Tasks Page
 * صفحة إدارة المهام الرئيسية
 */

import React, { useState, useMemo } from 'react';
import {
    PlusIcon,
    FunnelIcon,
    Squares2X2Icon,
    ListBulletIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useTaskStore } from '../../store/taskStore';
import TaskCard from '../../components/tasks/TaskCard';
import TaskForm from '../../components/tasks/TaskForm';
import type { Task, TaskStatus, TaskPriority, CreateTaskInput } from '../../domain/tasks/types';
import { taskStatusLabels, taskStatusColors, taskPriorityLabels } from '../../domain/tasks/types';
import useStore from '../../store';

const TasksPage: React.FC = () => {
    const { user } = useStore();
    const {
        tasks,
        viewMode,
        filters,
        addTask,
        setViewMode,
        setFilters,
        clearFilters,
        getFilteredTasks
    } = useTaskStore();

    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTasks = useMemo(() => {
        let result = getFilteredTasks();
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }
        return result;
    }, [getFilteredTasks, searchQuery, tasks, filters]);

    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            pending: [],
            in_progress: [],
            review: [],
            completed: [],
            cancelled: []
        };
        filteredTasks.forEach(task => {
            grouped[task.status].push(task);
        });
        return grouped;
    }, [filteredTasks]);

    const stats = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < new Date()).length
    }), [tasks]);

    const handleCreateTask = (data: CreateTaskInput) => {
        addTask(data, user?.id || 'current-user', user?.name || 'المستخدم');
        setShowNewTaskModal(false);
    };

    const toggleStatusFilter = (status: TaskStatus) => {
        const current = filters.status || [];
        if (current.includes(status)) {
            setFilters({ ...filters, status: current.filter(s => s !== status) });
        } else {
            setFilters({ ...filters, status: [...current, status] });
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <ListBulletIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                            <div className="text-xs text-gray-500">إجمالي المهام</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</div>
                            <div className="text-xs text-gray-500">قيد الانتظار</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <ArrowPathIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</div>
                            <div className="text-xs text-gray-500">قيد التنفيذ</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
                            <div className="text-xs text-gray-500">مكتملة</div>
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
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${showFilters || Object.keys(filters).some(k => filters[k as keyof typeof filters]?.length)
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                        فلتر
                    </button>

                    <div className="flex border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 transition-colors ${viewMode === 'list'
                                    ? 'bg-primary-600 text-white'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-3 transition-colors ${viewMode === 'kanban'
                                    ? 'bg-primary-600 text-white'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
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
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(taskStatusLabels) as [TaskStatus, string][]).map(([status, label]) => (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatusFilter(status)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filters.status?.includes(status)
                                                ? `${taskStatusColors[status].bg} ${taskStatusColors[status].text} font-medium`
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
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
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filters.priority?.includes(priority)
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

            {/* Task List / Kanban View */}
            {filteredTasks.length === 0 ? (
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
            ) : viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </div>
            ) : (
                /* Kanban View */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                    {(['pending', 'in_progress', 'review', 'completed'] as TaskStatus[]).map(status => (
                        <div key={status} className="min-w-[280px]">
                            <div className={`flex items-center gap-2 mb-3 p-3 rounded-lg ${taskStatusColors[status].bg}`}>
                                <span className={`font-medium ${taskStatusColors[status].text}`}>
                                    {taskStatusLabels[status]}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({tasksByStatus[status].length})
                                </span>
                            </div>
                            <div className="space-y-3">
                                {tasksByStatus[status].map(task => (
                                    <TaskCard key={task.id} task={task} compact />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Task Modal */}
            {showNewTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
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
                                onSubmit={handleCreateTask}
                                onCancel={() => setShowNewTaskModal(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
