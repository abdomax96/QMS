/**
 * User Performance Page
 * صفحة متابعة أداء المستخدمين
 */

import React, { useState, useEffect } from 'react';
import {
    ChartBarIcon,
    UserIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    CalendarIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import * as taskService from '../../services/taskService';
import { FormattedDate } from '../../components/common/FormattedDate';
import type { UserTaskStats, Task } from '../../types/task';
import { TASK_STATUS_LABELS } from '../../types/task';

const UserPerformancePage: React.FC = () => {
    const [userStats, setUserStats] = useState<UserTaskStats[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            loadUserTasks(selectedUser);
        }
    }, [selectedUser]);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const stats = await taskService.getUserTaskStats();
            setUserStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserTasks = async (userId: string) => {
        const tasks = await taskService.getMyTasks(userId);
        setUserTasks(tasks);
    };

    const getBestPerformer = () => {
        if (userStats.length === 0) return null;
        return userStats.reduce((best, current) =>
            current.completion_rate > best.completion_rate ? current : best
        );
    };

    const getTotalStats = () => {
        return userStats.reduce((acc, stat) => ({
            total: acc.total + stat.total_tasks,
            completed: acc.completed + stat.completed_tasks,
            overdue: acc.overdue + stat.overdue_tasks,
            inProgress: acc.inProgress + stat.in_progress_tasks
        }), { total: 0, completed: 0, overdue: 0, inProgress: 0 });
    };

    const bestPerformer = getBestPerformer();
    const totalStats = getTotalStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-8 h-8 text-primary-600" />
                        أداء المستخدمين
                    </h1>
                    <p className="text-gray-500 mt-1">متابعة أداء الفريق في إنجاز المهام</p>
                </div>
                <div className="flex gap-2">
                    {['week', 'month', 'year'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as typeof period)}
                            className={`px-4 py-2 rounded-lg ${period === p
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : 'سنة'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <UserIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{userStats.length}</p>
                            <p className="text-sm text-gray-500">مستخدم نشط</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.completed}</p>
                            <p className="text-sm text-gray-500">مهمة مكتملة</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-xl">
                            <ClockIcon className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.inProgress}</p>
                            <p className="text-sm text-gray-500">قيد التنفيذ</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.overdue}</p>
                            <p className="text-sm text-gray-500">متأخرة</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Best Performer */}
            {bestPerformer && bestPerformer.total_tasks > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-400 rounded-xl">
                            <TrophyIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">أفضل أداء</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{bestPerformer.user_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                نسبة إنجاز {bestPerformer.completion_rate}% • {bestPerformer.completed_tasks} مهمة مكتملة
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Performance Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل أداء المستخدمين</h2>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المستخدم</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">إجمالي المهام</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">مكتملة</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">قيد التنفيذ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">متأخرة</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">نسبة الإنجاز</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">متوسط الوقت</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {userStats.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    لا توجد بيانات
                                </td>
                            </tr>
                        ) : (
                            userStats.map(stat => (
                                <tr
                                    key={stat.user_id}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer ${selectedUser === stat.user_id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                        }`}
                                    onClick={() => setSelectedUser(stat.user_id)}
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {stat.user_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{stat.user_name}</div>
                                                <div className="text-xs text-gray-500">{stat.department || stat.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="text-lg font-bold text-gray-900 dark:text-white">{stat.total_tasks}</span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                            {stat.completed_tasks}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                            {stat.in_progress_tasks}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full font-medium ${stat.overdue_tasks > 0
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {stat.overdue_tasks}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-24 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${stat.completion_rate >= 80 ? 'bg-green-500' :
                                                        stat.completion_rate >= 50 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${stat.completion_rate}%` }}
                                                />
                                            </div>
                                            <span className={`text-sm font-bold ${stat.completion_rate >= 80 ? 'text-green-600' :
                                                stat.completion_rate >= 50 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {stat.completion_rate}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                        {stat.avg_completion_hours ? (
                                            <span className="flex items-center justify-center gap-1">
                                                <ClockIcon className="w-4 h-4" />
                                                {stat.avg_completion_hours} ساعة
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Selected User Tasks */}
            {selectedUser && userTasks.length > 0 && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            مهام {userStats.find(s => s.user_id === selectedUser)?.user_name}
                        </h2>
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            إغلاق
                        </button>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {userTasks.slice(0, 10).map(task => (
                            <div key={task.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                                    <p className="text-sm text-gray-500">{task.task_number}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {task.due_date && (
                                        <span className={`text-sm flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'completed'
                                            ? 'text-red-600'
                                            : 'text-gray-500'
                                            }`}>
                                            <CalendarIcon className="w-4 h-4" />
                                            <FormattedDate date={task.due_date} />
                                        </span>
                                    )}
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                            task.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {TASK_STATUS_LABELS[task.status]?.ar || task.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserPerformancePage;
