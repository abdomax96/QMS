/**
 * Task Store - Zustand
 * إدارة حالة المهام
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Task,
    TaskStatus,
    TaskFilters,
    CreateTaskInput,
    UpdateTaskInput,
    TaskComment,
    TaskChecklist
} from '../domain/tasks/types';
import { generateTaskId } from '../domain/tasks/types';

interface TaskState {
    tasks: Task[];
    filters: TaskFilters;
    viewMode: 'list' | 'kanban';
    isLoading: boolean;
    selectedTaskId: string | null;
}

interface TaskActions {
    // Task CRUD
    addTask: (input: CreateTaskInput, userId: string, userName: string) => Task;
    updateTask: (taskId: string, input: UpdateTaskInput, userId: string, userName: string) => void;
    deleteTask: (taskId: string) => void;

    // Status management
    updateTaskStatus: (taskId: string, status: TaskStatus, userId: string, userName: string) => void;

    // Assignments
    assignTask: (taskId: string, userId: string, userName: string, assignedBy: string) => void;
    unassignTask: (taskId: string, userId: string) => void;

    // Checklist
    addChecklistItem: (taskId: string, text: string) => void;
    toggleChecklistItem: (taskId: string, itemId: string, userId: string, userName: string) => void;
    removeChecklistItem: (taskId: string, itemId: string) => void;

    // Comments
    addComment: (taskId: string, content: string, userId: string, userName: string) => void;
    updateComment: (taskId: string, commentId: string, content: string) => void;
    deleteComment: (taskId: string, commentId: string) => void;

    // Filters & View
    setFilters: (filters: TaskFilters) => void;
    clearFilters: () => void;
    setViewMode: (mode: 'list' | 'kanban') => void;
    setSelectedTask: (taskId: string | null) => void;

    // Getters
    getTaskById: (taskId: string) => Task | undefined;
    getFilteredTasks: () => Task[];
    getTasksByStatus: (status: TaskStatus) => Task[];
    getTasksByAssignee: (userId: string) => Task[];
    getMyTasks: (userId: string) => Task[];
    getOverdueTasks: () => Task[];
}

const initialState: TaskState = {
    tasks: [],
    filters: {},
    viewMode: 'list',
    isLoading: false,
    selectedTaskId: null
};

export const useTaskStore = create<TaskState & TaskActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Task CRUD ============

            addTask: (input, userId, userName) => {
                const now = new Date().toISOString();
                const newTask: Task = {
                    id: generateTaskId(),
                    title: input.title,
                    description: input.description,
                    status: 'pending',
                    priority: input.priority,
                    category: input.category,
                    createdAt: now,
                    createdBy: userId,
                    createdByName: userName,
                    updatedAt: now,
                    dueDate: input.dueDate,
                    department: input.department,
                    relatedNcrId: input.relatedNcrId,
                    relatedReportId: input.relatedReportId,
                    tags: input.tags || [],
                    estimatedHours: input.estimatedHours,
                    assignees: [],
                    checklist: (input.checklist || []).map((text, i) => ({
                        id: `checklist_${Date.now()}_${i}`,
                        text,
                        completed: false
                    })),
                    comments: [],
                    attachments: [],
                    activities: [{
                        id: `activity_${Date.now()}`,
                        type: 'created',
                        userId,
                        userName,
                        description: 'أنشأ المهمة',
                        timestamp: now
                    }]
                };

                set(state => ({ tasks: [newTask, ...state.tasks] }));
                return newTask;
            },

            updateTask: (taskId, input, userId, userName) => {
                const now = new Date().toISOString();
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;

                        const changes: string[] = [];
                        if (input.title && input.title !== task.title) changes.push('العنوان');
                        if (input.priority && input.priority !== task.priority) changes.push('الأولوية');
                        if (input.dueDate && input.dueDate !== task.dueDate) changes.push('الموعد النهائي');

                        return {
                            ...task,
                            ...input,
                            updatedAt: now,
                            activities: changes.length > 0 ? [{
                                id: `activity_${Date.now()}`,
                                type: 'updated' as const,
                                userId,
                                userName,
                                description: `عدّل ${changes.join('، ')}`,
                                timestamp: now
                            }, ...task.activities] : task.activities
                        };
                    })
                }));
            },

            deleteTask: (taskId) => {
                set(state => ({
                    tasks: state.tasks.filter(t => t.id !== taskId)
                }));
            },

            // ============ Status Management ============

            updateTaskStatus: (taskId, status, userId, userName) => {
                const now = new Date().toISOString();
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;

                        return {
                            ...task,
                            status,
                            updatedAt: now,
                            completedAt: status === 'completed' ? now : task.completedAt,
                            activities: [{
                                id: `activity_${Date.now()}`,
                                type: 'status_changed' as const,
                                userId,
                                userName,
                                description: `غيّر الحالة`,
                                oldValue: task.status,
                                newValue: status,
                                timestamp: now
                            }, ...task.activities]
                        };
                    })
                }));
            },

            // ============ Assignments ============

            assignTask: (taskId, userId, userName, assignedBy) => {
                const now = new Date().toISOString();
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        if (task.assignees.some(a => a.userId === userId)) return task;

                        return {
                            ...task,
                            updatedAt: now,
                            assignees: [...task.assignees, {
                                userId,
                                userName,
                                assignedAt: now,
                                assignedBy
                            }],
                            activities: [{
                                id: `activity_${Date.now()}`,
                                type: 'assigned' as const,
                                userId: assignedBy,
                                userName: assignedBy,
                                description: `عيّن المهمة إلى ${userName}`,
                                timestamp: now
                            }, ...task.activities]
                        };
                    })
                }));
            },

            unassignTask: (taskId, userId) => {
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            updatedAt: new Date().toISOString(),
                            assignees: task.assignees.filter(a => a.userId !== userId)
                        };
                    })
                }));
            },

            // ============ Checklist ============

            addChecklistItem: (taskId, text) => {
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            updatedAt: new Date().toISOString(),
                            checklist: [...task.checklist, {
                                id: `checklist_${Date.now()}`,
                                text,
                                completed: false
                            }]
                        };
                    })
                }));
            },

            toggleChecklistItem: (taskId, itemId, userId, userName) => {
                const now = new Date().toISOString();
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            updatedAt: now,
                            checklist: task.checklist.map(item => {
                                if (item.id !== itemId) return item;
                                return {
                                    ...item,
                                    completed: !item.completed,
                                    completedAt: !item.completed ? now : undefined,
                                    completedBy: !item.completed ? userName : undefined
                                };
                            })
                        };
                    })
                }));
            },

            removeChecklistItem: (taskId, itemId) => {
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            updatedAt: new Date().toISOString(),
                            checklist: task.checklist.filter(item => item.id !== itemId)
                        };
                    })
                }));
            },

            // ============ Comments ============

            addComment: (taskId, content, userId, userName) => {
                const now = new Date().toISOString();
                const newComment: TaskComment = {
                    id: `comment_${Date.now()}`,
                    userId,
                    userName,
                    content,
                    createdAt: now
                };

                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            updatedAt: now,
                            comments: [...task.comments, newComment],
                            activities: [{
                                id: `activity_${Date.now()}`,
                                type: 'comment' as const,
                                userId,
                                userName,
                                description: 'أضاف تعليقاً',
                                timestamp: now
                            }, ...task.activities]
                        };
                    })
                }));
            },

            updateComment: (taskId, commentId, content) => {
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            comments: task.comments.map(c =>
                                c.id === commentId ? { ...c, content, updatedAt: new Date().toISOString() } : c
                            )
                        };
                    })
                }));
            },

            deleteComment: (taskId, commentId) => {
                set(state => ({
                    tasks: state.tasks.map(task => {
                        if (task.id !== taskId) return task;
                        return {
                            ...task,
                            comments: task.comments.filter(c => c.id !== commentId)
                        };
                    })
                }));
            },

            // ============ Filters & View ============

            setFilters: (filters) => set({ filters }),
            clearFilters: () => set({ filters: {} }),
            setViewMode: (viewMode) => set({ viewMode }),
            setSelectedTask: (selectedTaskId) => set({ selectedTaskId }),

            // ============ Getters ============

            getTaskById: (taskId) => get().tasks.find(t => t.id === taskId),

            getFilteredTasks: () => {
                const { tasks, filters } = get();

                return tasks.filter(task => {
                    if (filters.status?.length && !filters.status.includes(task.status)) return false;
                    if (filters.priority?.length && !filters.priority.includes(task.priority)) return false;
                    if (filters.category?.length && !filters.category.includes(task.category)) return false;
                    if (filters.assigneeId && !task.assignees.some(a => a.userId === filters.assigneeId)) return false;
                    if (filters.createdBy && task.createdBy !== filters.createdBy) return false;
                    if (filters.department && task.department !== filters.department) return false;
                    if (filters.search) {
                        const search = filters.search.toLowerCase();
                        if (!task.title.toLowerCase().includes(search) &&
                            !task.description.toLowerCase().includes(search)) return false;
                    }
                    return true;
                });
            },

            getTasksByStatus: (status) => get().tasks.filter(t => t.status === status),
            getTasksByAssignee: (userId) => get().tasks.filter(t => t.assignees.some(a => a.userId === userId)),
            getMyTasks: (userId) => get().tasks.filter(t =>
                t.assignees.some(a => a.userId === userId) || t.createdBy === userId
            ),
            getOverdueTasks: () => {
                const now = new Date();
                return get().tasks.filter(t =>
                    t.dueDate &&
                    t.status !== 'completed' &&
                    t.status !== 'cancelled' &&
                    new Date(t.dueDate) < now
                );
            }
        }),
        {
            name: 'task-store',
            partialize: (state) => ({
                tasks: state.tasks,
                viewMode: state.viewMode
            })
        }
    )
);

export default useTaskStore;
