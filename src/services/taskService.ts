/**
 * Task Service v2 - Full Supabase Backend
 * خدمة إدارة المهام - Supabase بالكامل مع مراحل وإسناد واعتماد
 */

import { supabase } from '../config/supabase';
import type {
    Task,
    TaskAssignment,
    TaskComment,
    TaskAttachment,
    TaskStageHistory,
    TaskHistory,
    UserTaskStats,
    CreateTaskInput,
    UpdateTaskInput,
    TaskFilters,
    TaskStage,
    TaskStatus,
    TaskChecklist,
} from '../types/task';
import { TASK_STAGE_ORDER } from '../types/task';

export interface TaskAssignableUser {
    id: string;
    name: string;
    email: string;
    department?: string;
}

export interface TaskAssignableDepartment {
    id: string;
    name: string;
    name_ar?: string;
}

export interface TaskAssignmentScope {
    departmentIds: string[];
    users: TaskAssignableUser[];
    departments: TaskAssignableDepartment[];
}

let taskHistoryWriteDisabled = false;
let taskHistoryDisableLogged = false;

function shouldDisableTaskHistoryWrites(error: { code?: string | null; message?: string | null }): boolean {
    const code = (error?.code || '').toString();
    const message = (error?.message || '').toLowerCase();

    // RLS/permission errors or missing relation/schema cache states.
    return (
        code === '42501' ||
        code === '42P01' ||
        code === 'PGRST204' ||
        message.includes('row-level security') ||
        message.includes('permission denied') ||
        message.includes('forbidden') ||
        message.includes('could not find the table')
    );
}

async function resolveCurrentUserId(explicitUserId?: string): Promise<string | null> {
    if (explicitUserId) return explicitUserId;
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error resolving current user:', error);
    }
    return data.user?.id || null;
}

export async function getCurrentUserDepartmentIds(explicitUserId?: string): Promise<string[]> {
    const userId = await resolveCurrentUserId(explicitUserId);
    if (!userId) return [];

    const { data: linkRows, error: linkError } = await supabase
        .from('user_departments')
        .select('department_id')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (linkError) {
        console.error('Error fetching user department links:', linkError);
    }

    const linkedDepartmentIds: string[] = Array.from(
        new Set((linkRows || []).map((row: any) => row.department_id).filter((id: any): id is string => typeof id === 'string' && id.length > 0))
    );

    if (linkedDepartmentIds.length > 0) {
        return linkedDepartmentIds;
    }

    // Fallback for environments still relying on users.department_id.
    const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', userId)
        .maybeSingle();

    if (userError) {
        console.error('Error fetching fallback user department_id:', userError);
        return [];
    }

    return userRow?.department_id ? [userRow.department_id] : [];
}

export async function getTaskAssignmentScope(explicitUserId?: string): Promise<TaskAssignmentScope> {
    const departmentIds = await getCurrentUserDepartmentIds(explicitUserId);
    if (departmentIds.length === 0) {
        return { departmentIds: [], users: [], departments: [] };
    }

    const [departmentsRes, membershipRes, usersByDeptRes] = await Promise.all([
        supabase
            .from('departments')
            .select('id, name, name_ar')
            .in('id', departmentIds)
            .order('name', { ascending: true }),
        supabase
            .from('user_departments')
            .select('user_id')
            .in('department_id', departmentIds)
            .eq('is_active', true),
        supabase
            .from('users')
            .select('id, name, email, department')
            .eq('is_active', true)
            .in('department_id', departmentIds)
            .order('name', { ascending: true }),
    ]);

    if (departmentsRes.error) {
        console.error('Error fetching assignable departments:', departmentsRes.error);
    }
    if (membershipRes.error) {
        console.error('Error fetching assignable user memberships:', membershipRes.error);
    }
    if (usersByDeptRes.error) {
        console.error('Error fetching users by department_id:', usersByDeptRes.error);
    }

    const linkedUserIds = Array.from(
        new Set((membershipRes.data || []).map((row: any) => row.user_id).filter(Boolean))
    );

    let usersByLink: Array<{ id: string; name: string | null; email: string; department?: string | null }> = [];
    if (linkedUserIds.length > 0) {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, department')
            .eq('is_active', true)
            .in('id', linkedUserIds)
            .order('name', { ascending: true });
        if (error) {
            console.error('Error fetching users by user_departments:', error);
        } else {
            usersByLink = data || [];
        }
    }

    const usersMap = new Map<string, TaskAssignableUser>();
    [...(usersByDeptRes.data || []), ...usersByLink].forEach((userRow: any) => {
        if (!userRow?.id) return;
        usersMap.set(userRow.id, {
            id: userRow.id,
            name: userRow.name || userRow.email,
            email: userRow.email,
            department: userRow.department || undefined,
        });
    });

    const users = Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const departments = (departmentsRes.data || []).map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        name_ar: dept.name_ar || undefined,
    }));

    return {
        departmentIds,
        users,
        departments,
    };
}

// ==================== Task CRUD ====================

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
    let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (filters?.status?.length) {
        query = query.in('status', filters.status);
    }
    if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
    }
    if (filters?.category?.length) {
        query = query.in('category', filters.category);
    }
    if (filters?.stage?.length) {
        query = query.in('current_stage', filters.stage);
    }
    if (filters?.assignment_type?.length) {
        query = query.in('assignment_type', filters.assignment_type);
    }
    if (filters?.assignee_id) {
        query = query.eq('assigned_to', filters.assignee_id);
    }
    if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
    }
    if (filters?.department) {
        query = query.eq('department', filters.department);
    }
    if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
    }
    if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
    }
    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }

    // Parse checklist JSON for each task
    return (data || []).map(normalizeTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching task:', error);
        return null;
    }
    return data ? normalizeTask(data) : null;
}

export async function getMyTasks(userId: string): Promise<Task[]> {
    // Get tasks assigned to user directly or via task_assignments
    const { data: directTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true })
        .limit(100);

    const { data: assignmentTaskIds } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', userId)
        .neq('status', 'declined');

    const assignedIds = (assignmentTaskIds || []).map(a => a.task_id);
    const directIds = (directTasks || []).map(t => t.id);
    const allIds = [...new Set([...directIds, ...assignedIds])];

    if (allIds.length === 0) return (directTasks || []).map(normalizeTask);

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('id', allIds)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching my tasks:', error);
        return (directTasks || []).map(normalizeTask);
    }
    return (data || []).map(normalizeTask);
}

export async function createTask(
    input: CreateTaskInput,
    createdBy?: { id: string; name: string }
): Promise<Task | null> {
    // Generate task number
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .like('task_number', `TASK-${year}-%`);

    const taskNumber = `TASK-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Build checklist JSON
    const checklist: TaskChecklist[] = (input.checklist || []).map((text, i) => ({
        id: `cl_${Date.now()}_${i}`,
        text,
        completed: false,
    }));

    const insertData: any = {
        task_number: taskNumber,
        title: input.title,
        description: input.description || '',
        task_type: input.task_type || 'general',
        category: input.category || 'general',
        priority: input.priority || 'medium',
        status: 'pending' as TaskStatus,
        current_stage: 'assignment' as TaskStage,
        completed_stages: [],
        assignment_type: input.assignment_type || 'individual',
        assigned_role_id: input.assigned_role_id || null,
        assigned_department_id: input.assigned_department_id || null,
        primary_assignee_id: input.primary_assignee_id || null,
        assigned_to: input.assigned_to || null,
        requires_approval: input.requires_approval !== false,
        requires_verification: input.requires_verification || false,
        department: input.department || null,
        company_id: input.company_id || null,
        due_date: input.due_date || null,
        start_date: input.start_date || null,
        tags: input.tags || [],
        estimated_hours: input.estimated_hours || null,
        checklist: JSON.stringify(checklist),
        related_entity_type: input.related_entity_type || null,
        related_entity_id: input.related_entity_id || null,
        related_ncr_id: input.related_ncr_id || null,
        related_report_id: input.related_report_id || null,
        related_lab_test_id: input.related_lab_test_id || null,
        related_lab_test_number: input.related_lab_test_number || null,
        related_material_receiving_id: input.related_material_receiving_id || null,
        related_material_name: input.related_material_name || null,
        related_supplier_id: input.related_supplier_id || null,
        related_supplier_name: input.related_supplier_name || null,
        related_control_point_id: input.related_control_point_id || null,
        created_by: createdBy?.id,
        created_by_name: createdBy?.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        return null;
    }

    if (!data) {
        return null;
    }

    // Record stage history
    await addStageHistory(data.id, null, 'assignment', 'created', createdBy, data.company_id);

    // Log history
    await addTaskHistory(data.id, 'created', null, data, createdBy);

    // Create assignments if provided
    if (input.assignee_ids?.length) {
        await assignToUsers(
            data.id,
            input.assignee_ids,
            input.primary_assignee_id || input.assignee_ids[0],
            createdBy,
            data.company_id
        );
    }

    // Return a fresh copy so UI reflects synced assignee fields.
    const refreshedTask = await getTaskById(data.id);
    return refreshedTask || normalizeTask(data);
}

export async function updateTask(
    id: string,
    updates: UpdateTaskInput,
    updatedBy?: { id: string; name: string }
): Promise<boolean> {
    const oldTask = await getTaskById(id);

    const { error } = await supabase
        .from('tasks')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating task:', error);
        return false;
    }

    if (oldTask) {
        await addTaskHistory(id, 'updated', oldTask, updates, updatedBy);
    }

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

// ==================== Stage Transitions ====================

export async function advanceTaskStage(
    taskId: string,
    user: { id: string; name: string },
    notes?: string
): Promise<{ success: boolean; newStage?: TaskStage; error?: string }> {
    const task = await getTaskById(taskId);
    if (!task) return { success: false, error: 'المهمة غير موجودة' };

    const currentIndex = TASK_STAGE_ORDER.indexOf(task.current_stage);
    if (currentIndex < 0 || currentIndex >= TASK_STAGE_ORDER.length - 1) {
        return { success: false, error: 'لا يمكن التقدم من هذه المرحلة' };
    }

    const nextStage = TASK_STAGE_ORDER[currentIndex + 1];

    // Validation rules
    if (task.current_stage === 'assignment') {
        // Must have at least one assignee
        const { count } = await supabase
            .from('task_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', taskId)
            .neq('status', 'declined');

        if (!count && !task.assigned_to) {
            return { success: false, error: 'يجب تعيين مُنفذ واحد على الأقل قبل بدء التنفيذ' };
        }
    }

    // Map stage to status
    const statusMap: Record<string, TaskStatus> = {
        in_progress: 'in_progress',
        review: 'in_progress',
        approval: 'in_progress',
        closed: 'completed',
    };

    const completedStages = [...(task.completed_stages || [])];
    if (!completedStages.includes(task.current_stage)) {
        completedStages.push(task.current_stage);
    }

    const updateData: any = {
        current_stage: nextStage,
        completed_stages: completedStages,
        status: statusMap[nextStage] || task.status,
        updated_at: new Date().toISOString(),
    };

    if (nextStage === 'closed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
        updateData.completed_by_name = user.name;
    }

    const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

    if (error) {
        console.error('Error advancing task stage:', error);
        return { success: false, error: 'فشل في تقديم المرحلة' };
    }

    await addStageHistory(taskId, task.current_stage, nextStage, 'advance', user, task.company_id || '', notes);
    await addTaskHistory(taskId, 'stage_advanced', { stage: task.current_stage }, { stage: nextStage, notes }, user);

    return { success: true, newStage: nextStage };
}

export async function returnTaskStage(
    taskId: string,
    user: { id: string; name: string },
    notes?: string
): Promise<{ success: boolean; newStage?: TaskStage; error?: string }> {
    const task = await getTaskById(taskId);
    if (!task) return { success: false, error: 'المهمة غير موجودة' };

    const currentIndex = TASK_STAGE_ORDER.indexOf(task.current_stage);
    if (currentIndex <= 0) {
        return { success: false, error: 'لا يمكن الرجوع من هذه المرحلة' };
    }

    const prevStage = TASK_STAGE_ORDER[currentIndex - 1];

    const completedStages = (task.completed_stages || []).filter(s => s !== task.current_stage);

    const { error } = await supabase
        .from('tasks')
        .update({
            current_stage: prevStage,
            completed_stages: completedStages,
            status: prevStage === 'assignment' ? 'pending' : 'in_progress',
            // Clear approval data if returning from approval
            ...(task.current_stage === 'approval' ? {
                approved_by: null,
                approved_by_name: null,
                approved_at: null,
                approval_notes: null,
            } : {}),
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error returning task stage:', error);
        return { success: false, error: 'فشل في إرجاع المرحلة' };
    }

    await addStageHistory(taskId, task.current_stage, prevStage, 'return', user, task.company_id || '', notes);
    await addTaskHistory(taskId, 'stage_returned', { stage: task.current_stage }, { stage: prevStage, notes }, user);

    return { success: true, newStage: prevStage };
}

// ==================== Assignments ====================

export async function assignToUsers(
    taskId: string,
    userIds: string[],
    primaryUserId: string,
    assignedBy?: { id: string; name: string },
    companyId?: string
): Promise<boolean> {
    if (!userIds.length) return false;

    const resolvedPrimaryUserId = userIds.includes(primaryUserId) ? primaryUserId : userIds[0];
    const userNamesById = new Map<string, string>();

    const assignerId = await resolveCurrentUserId(assignedBy?.id);
    if (assignerId) {
        const scope = await getTaskAssignmentScope(assignerId);
        if (scope.departmentIds.length === 0) {
            console.error('Task assignment denied: assigner has no active department');
            return false;
        }

        const allowedUserIds = new Set(scope.users.map(user => user.id));
        const invalidUserIds = userIds.filter(userId => !allowedUserIds.has(userId));
        if (invalidUserIds.length > 0) {
            console.error('Task assignment denied: assignees are outside assigner departments', {
                assignerId,
                invalidUserIds,
            });
            return false;
        }

        for (const user of scope.users) {
            userNamesById.set(user.id, user.name || user.email);
        }
    }

    // Get company_id from task if not provided
    if (!companyId) {
        const task = await getTaskById(taskId);
        companyId = task?.company_id || undefined;
    }

    if (!companyId) {
        console.error('Error assigning users: missing company_id', { taskId });
        return false;
    }

    if (userNamesById.size === 0 || userIds.some((id) => !userNamesById.has(id))) {
        const { data: userRows, error: usersError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);

        if (usersError) {
            console.error('Error resolving assignee names:', usersError);
        } else {
            for (const row of userRows || []) {
                userNamesById.set(row.id, row.name || row.email || row.id);
            }
        }
    }

    const assignments = userIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        user_name: userNamesById.get(userId) || userId,
        is_primary: userId === resolvedPrimaryUserId,
        assigned_by: assignedBy?.id,
        assigned_by_name: assignedBy?.name,
        status: 'assigned' as const,
        company_id: companyId,
    }));

    const { error } = await supabase
        .from('task_assignments')
        .upsert(assignments, { onConflict: 'task_id,user_id' });

    if (error) {
        console.error('Error assigning users:', error);
        return false;
    }

    const primaryAssigneeName = userNamesById.get(resolvedPrimaryUserId) || resolvedPrimaryUserId;

    // Update primary assignee on task
    const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
            primary_assignee_id: resolvedPrimaryUserId,
            assigned_to: resolvedPrimaryUserId,
            assigned_to_name: primaryAssigneeName,
            assigned_role_id: null,
            assigned_department_id: null,
            assignment_type: 'individual',
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (taskUpdateError) {
        console.error('Error updating task assignee fields:', taskUpdateError);
        return false;
    }

    await addTaskHistory(
        taskId,
        'assigned',
        null,
        { user_ids: userIds, primary: resolvedPrimaryUserId, primary_name: primaryAssigneeName },
        assignedBy
    );

    return true;
}

export async function assignToRole(
    taskId: string,
    roleId: string,
    assignedBy?: { id: string; name: string }
): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({
            assigned_role_id: roleId,
            assignment_type: 'role',
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error assigning to role:', error);
        return false;
    }

    await addTaskHistory(taskId, 'assigned_to_role', null, { role_id: roleId }, assignedBy);
    return true;
}

export async function assignToDepartment(
    taskId: string,
    departmentId: string,
    assignedBy?: { id: string; name: string }
): Promise<boolean> {
    const assignerId = await resolveCurrentUserId(assignedBy?.id);
    if (assignerId) {
        const allowedDepartmentIds = await getCurrentUserDepartmentIds(assignerId);
        if (allowedDepartmentIds.length === 0 || !allowedDepartmentIds.includes(departmentId)) {
            console.error('Task department assignment denied: department is outside assigner departments', {
                assignerId,
                departmentId,
            });
            return false;
        }
    }

    const { error } = await supabase
        .from('tasks')
        .update({
            assigned_department_id: departmentId,
            assignment_type: 'department',
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error assigning to department:', error);
        return false;
    }

    await addTaskHistory(taskId, 'assigned_to_department', null, { department_id: departmentId }, assignedBy);
    return true;
}

export async function acceptTask(
    taskId: string,
    user: { id: string; name: string },
    companyId: string
): Promise<boolean> {
    // Check if assignment exists
    const { data: existing } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        // Update existing assignment
        const { error } = await supabase
            .from('task_assignments')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('task_id', taskId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error accepting task:', error);
            return false;
        }
    } else {
        // Create new assignment (role/department pickup)
        const { error } = await supabase
            .from('task_assignments')
            .insert({
                task_id: taskId,
                user_id: user.id,
                user_name: user.name,
                is_primary: true,
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                company_id: companyId,
            });

        if (error) {
            console.error('Error creating task acceptance:', error);
            return false;
        }
    }

    // Update task primary assignee
    await supabase
        .from('tasks')
        .update({
            primary_assignee_id: user.id,
            assigned_to: user.id,
            assigned_to_name: user.name,
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    await addTaskHistory(taskId, 'accepted', null, { user_id: user.id, user_name: user.name }, user);
    return true;
}

export async function declineTask(
    taskId: string,
    user: { id: string; name: string },
    reason?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('task_assignments')
        .update({
            status: 'declined',
            notes: reason,
            updated_at: new Date().toISOString(),
        })
        .eq('task_id', taskId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error declining task:', error);
        return false;
    }

    await addTaskHistory(taskId, 'declined', null, { user_id: user.id, reason }, user);
    return true;
}

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
    const { data, error } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('task_id', taskId)
        .order('assigned_at', { ascending: true });

    if (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
    return data || [];
}

export async function removeAssignment(taskId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error removing assignment:', error);
        return false;
    }
    return true;
}

// ==================== Approval ====================

export async function approveTask(
    taskId: string,
    user: { id: string; name: string },
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    const task = await getTaskById(taskId);
    if (!task) return { success: false, error: 'المهمة غير موجودة' };

    if (task.current_stage !== 'approval') {
        return { success: false, error: 'المهمة ليست في مرحلة الاعتماد' };
    }

    const { error } = await supabase
        .from('tasks')
        .update({
            approved_by: user.id,
            approved_by_name: user.name,
            approved_at: new Date().toISOString(),
            approval_notes: notes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error approving task:', error);
        return { success: false, error: 'فشل في اعتماد المهمة' };
    }

    await addStageHistory(taskId, 'approval', 'approval', 'approved', user, task.company_id || '', notes);
    await addTaskHistory(taskId, 'approved', null, { approved_by_name: user.name, notes }, user);

    // Advance to closed stage
    return advanceTaskStage(taskId, user, notes);
}

export async function rejectTask(
    taskId: string,
    user: { id: string; name: string },
    reason: string,
    returnToStage?: TaskStage
): Promise<{ success: boolean; error?: string }> {
    const task = await getTaskById(taskId);
    if (!task) return { success: false, error: 'المهمة غير موجودة' };

    if (task.current_stage !== 'approval' && task.current_stage !== 'review') {
        return { success: false, error: 'المهمة ليست في مرحلة الاعتماد أو المراجعة' };
    }

    const targetStage = returnToStage || 'in_progress';

    const { error } = await supabase
        .from('tasks')
        .update({
            current_stage: targetStage,
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error rejecting task:', error);
        return { success: false, error: 'فشل في رفض المهمة' };
    }

    await addStageHistory(taskId, task.current_stage, targetStage, 'rejected', user, task.company_id || '', reason);
    await addTaskHistory(taskId, 'rejected', null, { rejected_by_name: user.name, reason, return_to: targetStage }, user);

    return { success: true };
}

// ==================== Comments ====================

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
    return (data || []).map(c => ({
        ...c,
        edited: c.edited || false,
        attachments: c.attachments || [],
    }));
}

export async function addTaskComment(
    taskId: string,
    content: string,
    author?: { id: string; name: string },
    companyId?: string
): Promise<TaskComment | null> {
    if (!companyId) {
        const task = await getTaskById(taskId);
        companyId = task?.company_id || undefined;
    }

    const { data, error } = await supabase
        .from('task_comments')
        .insert({
            task_id: taskId,
            content,
            author_id: author?.id,
            author_name: author?.name,
            company_id: companyId,
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding comment:', error);
        return null;
    }
    return data;
}

export async function editTaskComment(commentId: string, content: string): Promise<boolean> {
    const { error } = await supabase
        .from('task_comments')
        .update({
            content,
            edited: true,
            edited_at: new Date().toISOString(),
        })
        .eq('id', commentId);

    if (error) {
        console.error('Error editing comment:', error);
        return false;
    }
    return true;
}

export async function deleteTaskComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        console.error('Error deleting comment:', error);
        return false;
    }
    return true;
}

// ==================== Attachments ====================

export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching attachments:', error);
        return [];
    }
    return data || [];
}

export async function uploadTaskAttachment(
    taskId: string,
    file: File,
    user: { id: string; name: string },
    companyId: string
): Promise<TaskAttachment | null> {
    const filePath = `${companyId}/${taskId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
    }

    const { data, error } = await supabase
        .from('task_attachments')
        .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
            uploaded_by_name: user.name,
            company_id: companyId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating attachment record:', error);
        return null;
    }
    return data;
}

export async function deleteTaskAttachment(attachmentId: string, filePath: string): Promise<boolean> {
    // Delete from storage
    await supabase.storage.from('task-attachments').remove([filePath]);

    // Delete record
    const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

    if (error) {
        console.error('Error deleting attachment:', error);
        return false;
    }
    return true;
}

// ==================== Stage History ====================

export async function getTaskStageHistory(taskId: string): Promise<TaskStageHistory[]> {
    const { data, error } = await supabase
        .from('task_stage_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching stage history:', error);
        return [];
    }
    return data || [];
}

async function addStageHistory(
    taskId: string,
    fromStage: string | null,
    toStage: string,
    action: string,
    user?: { id: string; name: string },
    companyId?: string,
    notes?: string
): Promise<void> {
    await supabase.from('task_stage_history').insert({
        task_id: taskId,
        from_stage: fromStage,
        to_stage: toStage,
        action,
        changed_by: user?.id,
        changed_by_name: user?.name,
        notes,
        company_id: companyId || '',
        created_at: new Date().toISOString(),
    });
}

// ==================== Task History ====================

export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const { data, error } = await supabase
        .from('task_history')
        .select('*')
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
    if (taskHistoryWriteDisabled) {
        return;
    }

    const { error } = await supabase.from('task_history').insert({
        task_id: taskId,
        action,
        old_value: oldValue,
        new_value: newValue,
        changed_by: changedBy?.id,
        changed_by_name: changedBy?.name,
        created_at: new Date().toISOString(),
    });

    if (!error) {
        return;
    }

    if (shouldDisableTaskHistoryWrites(error)) {
        taskHistoryWriteDisabled = true;
        if (!taskHistoryDisableLogged) {
            taskHistoryDisableLogged = true;
            console.warn('[Tasks] task_history writes disabled for this session due to backend policy/schema issue.', error);
        }
        return;
    }

    console.error('Error adding task history:', error);
}

// ==================== Checklist ====================

export async function updateTaskChecklist(
    taskId: string,
    checklist: TaskChecklist[]
): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({
            checklist: JSON.stringify(checklist),
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error updating checklist:', error);
        return false;
    }
    return true;
}

// ==================== Status Update ====================

export async function updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updatedBy?: { id: string; name: string },
    notes?: string
): Promise<boolean> {
    const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
    };

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
            updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error verifying task:', error);
        return false;
    }

    await addTaskHistory(taskId, 'verified', null, { verified_by_name: verifiedBy.name, notes }, verifiedBy);
    return true;
}

export async function assignTask(
    taskId: string,
    assignedTo: string,
    assignedToName: string,
    assignedBy?: { id: string; name: string }
): Promise<boolean> {
    const assignerId = await resolveCurrentUserId(assignedBy?.id);
    if (assignerId) {
        const scope = await getTaskAssignmentScope(assignerId);
        const allowedUserIds = new Set(scope.users.map(user => user.id));
        if (scope.departmentIds.length === 0 || !allowedUserIds.has(assignedTo)) {
            console.error('Direct task assignment denied: target user is outside assigner departments', {
                assignerId,
                assignedTo,
            });
            return false;
        }
    }

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

    await addTaskHistory(taskId, 'assigned', null, { assigned_to: assignedTo, assigned_to_name: assignedToName }, assignedBy);
    return true;
}

// ==================== Real-time Subscriptions ====================

export function subscribeToTasks(
    callback: (payload: any) => void
) {
    return supabase
        .channel('tasks-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
        .subscribe();
}

export function subscribeToTaskComments(
    taskId: string,
    callback: (payload: any) => void
) {
    return supabase
        .channel(`task-comments-${taskId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${taskId}`,
        }, callback)
        .subscribe();
}

// ==================== User Performance ====================

export async function getUserTaskStats(userId?: string): Promise<UserTaskStats[]> {
    const { data, error } = await supabase
        .from('v_user_task_stats')
        .select('user_id, user_name, department, total_tasks, completed_tasks, in_progress_tasks, overdue_tasks, completion_rate, avg_completion_days');

    if (error) {
        console.error('Error fetching user stats:', error);
        return calculateUserStatsManually(userId);
    }

    if (userId) {
        return data?.filter(s => s.user_id === userId) || [];
    }
    return data || [];
}

async function calculateUserStatsManually(userId?: string): Promise<UserTaskStats[]> {
    let usersQuery = supabase.from('users').select('id, name, email, department');
    if (userId) {
        usersQuery = usersQuery.eq('id', userId);
    }
    const { data: users } = await usersQuery;
    if (!users) return [];

    const stats: UserTaskStats[] = [];
    for (const user of users) {
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
            t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status)
        ).length;

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
        });
    }
    return stats;
}

export async function getOverdueTasks(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .lt('due_date', today)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching overdue tasks:', error);
        return [];
    }
    return (data || []).map(normalizeTask);
}

export async function getTasksDueSoon(days: number = 7): Promise<Task[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error fetching due soon tasks:', error);
        return [];
    }
    return (data || []).map(normalizeTask);
}

// ==================== Helpers ====================

function normalizeTask(data: any): Task {
    let checklist = data.checklist || [];
    if (typeof checklist === 'string') {
        try {
            checklist = JSON.parse(checklist);
        } catch {
            checklist = [];
        }
    }

    return {
        ...data,
        checklist: Array.isArray(checklist) ? checklist : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        completed_stages: Array.isArray(data.completed_stages) ? data.completed_stages : [],
        current_stage: data.current_stage || 'assignment',
        assignment_type: data.assignment_type || 'individual',
        requires_approval: data.requires_approval !== false,
        requires_verification: data.requires_verification || false,
        task_type: data.task_type || 'general',
        category: data.category || 'general',
        priority: data.priority || 'medium',
        status: data.status || 'pending',
    };
}
