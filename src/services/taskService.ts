/**
 * Task Service
 * خدمة إدارة المهام
 */

import { supabase } from '../config/supabase';
import type { Task, TaskComment, TaskHistory, UserTaskStats, CreateTaskInput, TaskStatus } from '../types/task';

// ==================== Tasks CRUD ====================

export async function getTasks(filters?: {
    status?: TaskStatus;
    assigned_to?: string;
    company_id?: string;
    task_type?: string;
    overdue_only?: boolean;
}): Promise<Task[]> {
    let query = supabase
        .from('tasks')
        .select('id, task_number, title, description, task_type, priority, status, assigned_to, assigned_to_name, due_date, created_at, company_id')
        .order('created_at', { ascending: false })
        .limit(100);

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id);
    }
    if (filters?.task_type) {
        query = query.eq('task_type', filters.task_type);
    }
    if (filters?.overdue_only) {
        query = query.or(`status.eq.overdue,and(due_date.lt.${new Date().toISOString().split('T')[0]},status.in.(pending,in_progress))`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
    return data || [];
}

export async function getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, task_number, title, description, task_type, priority, status, assigned_to, assigned_to_name, assigned_by, assigned_by_name, assigned_at, due_date, start_date, completed_at, completed_by, completed_by_name, completion_notes, requires_verification, verified_by, verified_by_name, verified_at, verification_notes, department, company_id, related_entity_type, related_entity_id, attachments, created_at, updated_at, created_by, created_by_name')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching task:', error);
        return null;
    }
    return data;
}

export async function getMyTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, task_number, title, task_type, priority, status, due_date, created_at')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true })
        .limit(100);

    if (error) {
        console.error('Error fetching my tasks:', error);
        return [];
    }
    return data || [];
}

export async function createTask(input: CreateTaskInput, createdBy?: { id: string; name: string }): Promise<Task | null> {
    // Generate task number
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .like('task_number', `TASK-${year}-%`);

    const taskNumber = `TASK-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data, error } = await supabase
        .from('tasks')
        .insert({
            ...input,
            task_number: taskNumber,
            status: 'pending',
            created_by: createdBy?.id,
            created_by_name: createdBy?.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        return null;
    }

    // Log history
    if (data) {
        await addTaskHistory(data.id, 'created', null, data, createdBy);
    }

    return data;
}

export async function updateTask(id: string, updates: Partial<Task>, updatedBy?: { id: string; name: string }): Promise<boolean> {
    // Get old task for history
    const oldTask = await getTaskById(id);

    const { error } = await supabase
        .from('tasks')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating task:', error);
        return false;
    }

    // Log history
    if (oldTask) {
        await addTaskHistory(id, 'updated', oldTask, updates, updatedBy);
    }

    return true;
}

export async function assignTask(
    taskId: string,
    assignedTo: string,
    assignedToName: string,
    assignedBy?: { id: string; name: string }
): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({
            assigned_to: assignedTo,
            assigned_to_name: assignedToName,
            assigned_by: assignedBy?.id,
            assigned_by_name: assignedBy?.name,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error assigning task:', error);
        return false;
    }

    // Log history
    await addTaskHistory(taskId, 'assigned', null, { assigned_to: assignedTo, assigned_to_name: assignedToName }, assignedBy);

    return true;
}

export async function updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updatedBy?: { id: string; name: string },
    notes?: string
): Promise<boolean> {
    const updateData: Partial<Task> = {
        status,
        updated_at: new Date().toISOString()
    };

    // If completing, add completion info
    if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = updatedBy?.id;
        updateData.completed_by_name = updatedBy?.name;
        updateData.completion_notes = notes;
    }

    const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task status:', error);
        return false;
    }

    // Log history
    await addTaskHistory(taskId, 'status_changed', null, { status, notes }, updatedBy);

    return true;
}

export async function verifyTask(
    taskId: string,
    verifiedBy: { id: string; name: string },
    notes?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({
            verified_by: verifiedBy.id,
            verified_by_name: verifiedBy.name,
            verified_at: new Date().toISOString(),
            verification_notes: notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error verifying task:', error);
        return false;
    }

    // Log history
    await addTaskHistory(taskId, 'verified', null, { verified_by_name: verifiedBy.name, notes }, verifiedBy);

    return true;
}

export async function deleteTask(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
        return false;
    }
    return true;
}

// ==================== Task Comments ====================

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
        .from('task_comments')
        .select('id, task_id, content, author_id, author_name, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
    return data || [];
}

export async function addTaskComment(
    taskId: string,
    content: string,
    author?: { id: string; name: string }
): Promise<TaskComment | null> {
    const { data, error } = await supabase
        .from('task_comments')
        .insert({
            task_id: taskId,
            content,
            author_id: author?.id,
            author_name: author?.name,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding comment:', error);
        return null;
    }
    return data;
}

// ==================== Task History ====================

export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const { data, error } = await supabase
        .from('task_history')
        .select('id, task_id, action, old_value, new_value, changed_by, changed_by_name, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }
    return data || [];
}

async function addTaskHistory(
    taskId: string,
    action: string,
    oldValue: any,
    newValue: any,
    changedBy?: { id: string; name: string }
): Promise<void> {
    await supabase
        .from('task_history')
        .insert({
            task_id: taskId,
            action,
            old_value: oldValue,
            new_value: newValue,
            changed_by: changedBy?.id,
            changed_by_name: changedBy?.name,
            created_at: new Date().toISOString()
        });
}

// ==================== User Performance ====================

export async function getUserTaskStats(userId?: string): Promise<UserTaskStats[]> {
    const { data, error } = await supabase
        .from('v_user_task_stats')
        .select('user_id, user_name, department, total_tasks, completed_tasks, in_progress_tasks, overdue_tasks, completion_rate, avg_completion_days');

    if (error) {
        console.error('Error fetching user stats:', error);

        // Fallback: calculate stats manually
        return calculateUserStatsManually(userId);
    }

    if (userId) {
        return data?.filter(s => s.user_id === userId) || [];
    }
    return data || [];
}

async function calculateUserStatsManually(userId?: string): Promise<UserTaskStats[]> {
    // Get users
    let usersQuery = supabase.from('users').select('id, name, email, department');
    if (userId) {
        usersQuery = usersQuery.eq('id', userId);
    }
    const { data: users } = await usersQuery;

    if (!users) return [];

    const stats: UserTaskStats[] = [];

    for (const user of users) {
        // Get tasks for this user
        const { data: tasks } = await supabase
            .from('tasks')
            .select('status, due_date, assigned_at, completed_at')
            .eq('assigned_to', user.id);

        const taskList = tasks || [];
        const total = taskList.length;
        const completed = taskList.filter(t => t.status === 'completed').length;
        const pending = taskList.filter(t => t.status === 'pending').length;
        const inProgress = taskList.filter(t => t.status === 'in_progress').length;
        const overdue = taskList.filter(t =>
            t.status === 'overdue' ||
            (t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status))
        ).length;

        // Calculate avg completion time
        const completedTasks = taskList.filter(t => t.status === 'completed' && t.completed_at && t.assigned_at);
        let avgHours = 0;
        if (completedTasks.length > 0) {
            const totalHours = completedTasks.reduce((sum, t) => {
                const diff = new Date(t.completed_at!).getTime() - new Date(t.assigned_at!).getTime();
                return sum + (diff / (1000 * 60 * 60));
            }, 0);
            avgHours = Math.round(totalHours / completedTasks.length);
        }

        stats.push({
            user_id: user.id,
            user_name: user.name || user.email,
            email: user.email,
            department: user.department,
            total_tasks: total,
            completed_tasks: completed,
            pending_tasks: pending,
            in_progress_tasks: inProgress,
            overdue_tasks: overdue,
            completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
            avg_completion_hours: avgHours
        });
    }

    return stats;
}

export async function getOverdueTasks(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('tasks')
        .select('id, task_number, title, task_type, priority, status, assigned_to, assigned_to_name, due_date, created_at')
        .lt('due_date', today)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching overdue tasks:', error);
        return [];
    }
    return data || [];
}

export async function getTasksDueSoon(days: number = 7): Promise<Task[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
        .from('tasks')
        .select('id, task_number, title, task_type, priority, status, assigned_to, assigned_to_name, due_date, created_at')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching due soon tasks:', error);
        return [];
    }
    return data || [];
}
