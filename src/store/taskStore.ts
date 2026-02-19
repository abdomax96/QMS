/**
 * Task Store v2 - Zustand (Supabase-backed, no localStorage)
 * إدارة حالة المهام - مدعوم بالكامل من Supabase
 */

import { create } from 'zustand';
import type {
    Task,
    TaskAssignment,
    TaskComment,
    TaskStageHistory,
    TaskFilters,
    TaskStage,
    TaskChecklist,
    CreateTaskInput,
    UpdateTaskInput,
} from '../types/task';
import * as taskService from '../services/taskService';

interface TaskState {
    tasks: Task[];
    currentTask: Task | null;
    assignments: TaskAssignment[];
    comments: TaskComment[];
    stageHistory: TaskStageHistory[];
    filters: TaskFilters;
    viewMode: 'list' | 'kanban';
    isLoading: boolean;
    error: string | null;
}

interface TaskActions {
    // Fetch
    fetchTasks: (filters?: TaskFilters) => Promise<void>;
    fetchTaskById: (id: string) => Promise<Task | null>;
    fetchMyTasks: (userId: string) => Promise<void>;

    // CRUD
    createTask: (input: CreateTaskInput, user: { id: string; name: string }) => Promise<Task | null>;
    updateTask: (id: string, updates: UpdateTaskInput, user: { id: string; name: string }) => Promise<boolean>;
    deleteTask: (id: string) => Promise<boolean>;

    // Stage workflow
    advanceStage: (taskId: string, user: { id: string; name: string }, notes?: string) => Promise<{ success: boolean; error?: string }>;
    returnStage: (taskId: string, user: { id: string; name: string }, notes?: string) => Promise<{ success: boolean; error?: string }>;

    // Assignments
    assignUsers: (taskId: string, userIds: string[], primaryId: string, user: { id: string; name: string }, companyId: string) => Promise<boolean>;
    assignRole: (taskId: string, roleId: string, user: { id: string; name: string }) => Promise<boolean>;
    assignDepartment: (taskId: string, departmentId: string, user: { id: string; name: string }) => Promise<boolean>;
    acceptTask: (taskId: string, user: { id: string; name: string }, companyId: string) => Promise<boolean>;
    declineTask: (taskId: string, user: { id: string; name: string }, reason?: string) => Promise<boolean>;
    fetchAssignments: (taskId: string) => Promise<void>;
    removeAssignment: (taskId: string, userId: string) => Promise<boolean>;

    // Approval
    approveTask: (taskId: string, user: { id: string; name: string }, notes?: string) => Promise<{ success: boolean; error?: string }>;
    rejectTask: (taskId: string, user: { id: string; name: string }, reason: string, returnToStage?: TaskStage) => Promise<{ success: boolean; error?: string }>;

    // Comments
    fetchComments: (taskId: string) => Promise<void>;
    addComment: (taskId: string, content: string, user: { id: string; name: string }, companyId?: string) => Promise<boolean>;
    editComment: (commentId: string, content: string) => Promise<boolean>;
    deleteComment: (commentId: string) => Promise<boolean>;

    // Stage history
    fetchStageHistory: (taskId: string) => Promise<void>;

    // Checklist
    updateChecklist: (taskId: string, checklist: TaskChecklist[]) => Promise<boolean>;

    // Filters & View
    setFilters: (filters: TaskFilters) => void;
    clearFilters: () => void;
    setViewMode: (mode: 'list' | 'kanban') => void;
    setError: (error: string | null) => void;

    // Getters
    getTaskById: (taskId: string) => Task | undefined;
    getFilteredTasks: () => Task[];
    getTasksByStage: (stage: TaskStage) => Task[];
    getOverdueTasks: () => Task[];
}

const initialState: TaskState = {
    tasks: [],
    currentTask: null,
    assignments: [],
    comments: [],
    stageHistory: [],
    filters: {},
    viewMode: 'list',
    isLoading: false,
    error: null,
};

export const useTaskStore = create<TaskState & TaskActions>()(
    (set, get) => ({
        ...initialState,

        // ============ Fetch ============

        fetchTasks: async (filters) => {
            set({ isLoading: true, error: null });
            try {
                const tasks = await taskService.getTasks(filters || get().filters);
                set({ tasks, isLoading: false });
            } catch (err) {
                console.error('Error fetching tasks:', err);
                set({ isLoading: false, error: 'فشل في جلب المهام' });
            }
        },

        fetchTaskById: async (id) => {
            set({ isLoading: true, error: null });
            try {
                const task = await taskService.getTaskById(id);
                set({ currentTask: task, isLoading: false });
                return task;
            } catch (err) {
                console.error('Error fetching task:', err);
                set({ isLoading: false, error: 'فشل في جلب المهمة' });
                return null;
            }
        },

        fetchMyTasks: async (userId) => {
            set({ isLoading: true, error: null });
            try {
                const tasks = await taskService.getMyTasks(userId);
                set({ tasks, isLoading: false });
            } catch (err) {
                console.error('Error fetching my tasks:', err);
                set({ isLoading: false, error: 'فشل في جلب مهامي' });
            }
        },

        // ============ CRUD ============

        createTask: async (input, user) => {
            set({ isLoading: true, error: null });
            try {
                const task = await taskService.createTask(input, user);
                if (task) {
                    set(state => ({ tasks: [task, ...state.tasks], isLoading: false }));
                } else {
                    set({ isLoading: false, error: 'فشل في إنشاء المهمة' });
                }
                return task;
            } catch (err) {
                console.error('Error creating task:', err);
                set({ isLoading: false, error: 'فشل في إنشاء المهمة' });
                return null;
            }
        },

        updateTask: async (id, updates, user) => {
            try {
                const success = await taskService.updateTask(id, updates, user);
                if (success) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t),
                        currentTask: state.currentTask?.id === id ? { ...state.currentTask, ...updates, updated_at: new Date().toISOString() } : state.currentTask,
                    }));
                }
                return success;
            } catch (err) {
                console.error('Error updating task:', err);
                return false;
            }
        },

        deleteTask: async (id) => {
            try {
                const success = await taskService.deleteTask(id);
                if (success) {
                    set(state => ({
                        tasks: state.tasks.filter(t => t.id !== id),
                        currentTask: state.currentTask?.id === id ? null : state.currentTask,
                    }));
                }
                return success;
            } catch (err) {
                console.error('Error deleting task:', err);
                return false;
            }
        },

        // ============ Stage Workflow ============

        advanceStage: async (taskId, user, notes) => {
            const result = await taskService.advanceTaskStage(taskId, user, notes);
            if (result.success) {
                // Refresh the task
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return result;
        },

        returnStage: async (taskId, user, notes) => {
            const result = await taskService.returnTaskStage(taskId, user, notes);
            if (result.success) {
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return result;
        },

        // ============ Assignments ============

        assignUsers: async (taskId, userIds, primaryId, user, companyId) => {
            const success = await taskService.assignToUsers(taskId, userIds, primaryId, user, companyId);
            if (success) {
                await get().fetchAssignments(taskId);
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return success;
        },

        assignRole: async (taskId, roleId, user) => {
            const success = await taskService.assignToRole(taskId, roleId, user);
            if (success) {
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return success;
        },

        assignDepartment: async (taskId, departmentId, user) => {
            const success = await taskService.assignToDepartment(taskId, departmentId, user);
            if (success) {
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return success;
        },

        acceptTask: async (taskId, user, companyId) => {
            const success = await taskService.acceptTask(taskId, user, companyId);
            if (success) {
                await get().fetchAssignments(taskId);
                await get().fetchTaskById(taskId);
            }
            return success;
        },

        declineTask: async (taskId, user, reason) => {
            return taskService.declineTask(taskId, user, reason);
        },

        fetchAssignments: async (taskId) => {
            const assignments = await taskService.getTaskAssignments(taskId);
            set({ assignments });
        },

        removeAssignment: async (taskId, userId) => {
            const success = await taskService.removeAssignment(taskId, userId);
            if (success) {
                set(state => ({
                    assignments: state.assignments.filter(a => !(a.task_id === taskId && a.user_id === userId)),
                }));
            }
            return success;
        },

        // ============ Approval ============

        approveTask: async (taskId, user, notes) => {
            const result = await taskService.approveTask(taskId, user, notes);
            if (result.success) {
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return result;
        },

        rejectTask: async (taskId, user, reason, returnToStage) => {
            const result = await taskService.rejectTask(taskId, user, reason, returnToStage);
            if (result.success) {
                const task = await taskService.getTaskById(taskId);
                if (task) {
                    set(state => ({
                        tasks: state.tasks.map(t => t.id === taskId ? task : t),
                        currentTask: state.currentTask?.id === taskId ? task : state.currentTask,
                    }));
                }
            }
            return result;
        },

        // ============ Comments ============

        fetchComments: async (taskId) => {
            const comments = await taskService.getTaskComments(taskId);
            set({ comments });
        },

        addComment: async (taskId, content, user, companyId) => {
            const comment = await taskService.addTaskComment(taskId, content, user, companyId);
            if (comment) {
                set(state => ({ comments: [...state.comments, comment] }));
                return true;
            }
            return false;
        },

        editComment: async (commentId, content) => {
            const success = await taskService.editTaskComment(commentId, content);
            if (success) {
                set(state => ({
                    comments: state.comments.map(c =>
                        c.id === commentId ? { ...c, content, edited: true, edited_at: new Date().toISOString() } : c
                    ),
                }));
            }
            return success;
        },

        deleteComment: async (commentId) => {
            const success = await taskService.deleteTaskComment(commentId);
            if (success) {
                set(state => ({
                    comments: state.comments.filter(c => c.id !== commentId),
                }));
            }
            return success;
        },

        // ============ Stage History ============

        fetchStageHistory: async (taskId) => {
            const history = await taskService.getTaskStageHistory(taskId);
            set({ stageHistory: history });
        },

        // ============ Checklist ============

        updateChecklist: async (taskId, checklist) => {
            const success = await taskService.updateTaskChecklist(taskId, checklist);
            if (success) {
                set(state => ({
                    currentTask: state.currentTask?.id === taskId
                        ? { ...state.currentTask, checklist }
                        : state.currentTask,
                    tasks: state.tasks.map(t =>
                        t.id === taskId ? { ...t, checklist } : t
                    ),
                }));
            }
            return success;
        },

        // ============ Filters & View ============

        setFilters: (filters) => set({ filters }),
        clearFilters: () => set({ filters: {} }),
        setViewMode: (viewMode) => set({ viewMode }),
        setError: (error) => set({ error }),

        // ============ Getters ============

        getTaskById: (taskId) => get().tasks.find(t => t.id === taskId),

        getFilteredTasks: () => {
            const { tasks, filters } = get();
            return tasks.filter(task => {
                if (filters.status?.length && !filters.status.includes(task.status)) return false;
                if (filters.priority?.length && !filters.priority.includes(task.priority)) return false;
                if (filters.category?.length && !filters.category.includes(task.category)) return false;
                if (filters.stage?.length && !filters.stage.includes(task.current_stage)) return false;
                if (filters.assignment_type?.length && !filters.assignment_type.includes(task.assignment_type)) return false;
                if (filters.department && task.department !== filters.department) return false;
                if (filters.search) {
                    const search = filters.search.toLowerCase();
                    if (
                        !task.title.toLowerCase().includes(search) &&
                        !(task.description || '').toLowerCase().includes(search)
                    ) return false;
                }
                return true;
            });
        },

        getTasksByStage: (stage) => get().tasks.filter(t => t.current_stage === stage),

        getOverdueTasks: () => {
            const now = new Date();
            return get().tasks.filter(t =>
                t.due_date &&
                t.status !== 'completed' &&
                t.status !== 'cancelled' &&
                new Date(t.due_date) < now
            );
        },
    })
);

export default useTaskStore;
