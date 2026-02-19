/**
 * Task Form Component
 * نموذج إنشاء وتعديل المهام - مع دعم أنواع الإسناد والاعتماد
 */

import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    PlusIcon,
    CalendarIcon,
    FlagIcon,
    TagIcon,
    ClockIcon,
    TrashIcon,
    UserIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    ShieldCheckIcon,
    CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { InlineLoading } from '../common/LoadingStates';
import type { CreateTaskInput, TaskPriority, TaskCategory, TaskAssignmentType, TaskType } from '../../types/task';
import {
    TASK_PRIORITY_LABELS,
    TASK_CATEGORY_LABELS,
    TASK_TYPE_LABELS,
    TASK_ASSIGNMENT_TYPE_LABELS,
} from '../../types/task';
import { supabase } from '../../config/supabase';
import { getTaskAssignmentScope } from '../../services/taskService';

interface TaskFormProps {
    onSubmit: (data: CreateTaskInput) => void;
    onCancel: () => void;
    initialData?: Partial<CreateTaskInput>;
    isLoading?: boolean;
    mode?: 'create' | 'edit';
}

interface UserOption {
    id: string;
    name: string;
    email: string;
    department?: string;
}

interface RoleOption {
    id: string;
    name: string;
    name_ar?: string;
}

interface DepartmentOption {
    id: string;
    name: string;
    name_ar?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
    onSubmit,
    onCancel,
    initialData,
    isLoading,
    mode = 'create',
}) => {
    const [users, setUsers] = useState<UserOption[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    const [formData, setFormData] = useState<CreateTaskInput>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        task_type: initialData?.task_type || 'general',
        priority: initialData?.priority || 'medium',
        category: initialData?.category || 'general',
        assignment_type: initialData?.assignment_type || 'individual',
        assignee_ids: initialData?.assignee_ids || [],
        primary_assignee_id: initialData?.primary_assignee_id,
        assigned_role_id: initialData?.assigned_role_id,
        assigned_department_id: initialData?.assigned_department_id,
        due_date: initialData?.due_date || '',
        checklist: initialData?.checklist || [],
        tags: initialData?.tags || [],
        estimated_hours: initialData?.estimated_hours,
        requires_approval: initialData?.requires_approval ?? true,
        requires_verification: initialData?.requires_verification ?? false,
    });

    useEffect(() => {
        if (mode === 'create') {
            loadOptions();
        } else {
            setLoadingOptions(false);
        }
    }, [mode]);

    useEffect(() => {
        setFormData({
            title: initialData?.title || '',
            description: initialData?.description || '',
            task_type: initialData?.task_type || 'general',
            priority: initialData?.priority || 'medium',
            category: initialData?.category || 'general',
            assignment_type: initialData?.assignment_type || 'individual',
            assignee_ids: initialData?.assignee_ids || [],
            primary_assignee_id: initialData?.primary_assignee_id,
            assigned_role_id: initialData?.assigned_role_id,
            assigned_department_id: initialData?.assigned_department_id,
            due_date: initialData?.due_date || '',
            checklist: initialData?.checklist || [],
            tags: initialData?.tags || [],
            estimated_hours: initialData?.estimated_hours,
            requires_approval: initialData?.requires_approval ?? true,
            requires_verification: initialData?.requires_verification ?? false,
        });
    }, [initialData]);

    const loadOptions = async () => {
        setLoadingOptions(true);
        try {
            const [scope, rolesRes] = await Promise.all([
                getTaskAssignmentScope(),
                supabase.from('roles').select('id, name, name_ar').order('name'),
            ]);

            setUsers(scope.users);
            setRoles((rolesRes.data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                name_ar: r.name_ar,
            })));
            setDepartments(scope.departments);
        } catch (error) {
            console.error('Error loading form options:', error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newTag, setNewTag] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        onSubmit(formData);
    };

    const updateField = <K extends keyof CreateTaskInput>(key: K, value: CreateTaskInput[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        updateField('checklist', [...(formData.checklist || []), newChecklistItem.trim()]);
        setNewChecklistItem('');
    };

    const removeChecklistItem = (index: number) => {
        updateField('checklist', formData.checklist?.filter((_, i) => i !== index));
    };

    const addTag = () => {
        if (!newTag.trim() || formData.tags?.includes(newTag.trim())) return;
        updateField('tags', [...(formData.tags || []), newTag.trim()]);
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        updateField('tags', formData.tags?.filter(t => t !== tag));
    };

    const toggleAssignee = (userId: string) => {
        const current = formData.assignee_ids || [];
        if (current.includes(userId)) {
            const filtered = current.filter(id => id !== userId);
            updateField('assignee_ids', filtered);
            if (formData.primary_assignee_id === userId) {
                updateField('primary_assignee_id', filtered[0] || undefined);
            }
        } else {
            const updated = [...current, userId];
            updateField('assignee_ids', updated);
            if (updated.length === 1) {
                updateField('primary_assignee_id', userId);
            }
        }
    };

    const assignmentTypeIcon = {
        individual: UserGroupIcon,
        role: ShieldCheckIcon,
        department: BuildingOfficeIcon,
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    عنوان المهمة *
                </label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="أدخل عنوان المهمة..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 text-lg"
                    autoFocus
                    required
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الوصف
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="وصف تفصيلي للمهمة..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 resize-none"
                />
            </div>

            {/* Task Type & Priority & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Task Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        نوع المهمة
                    </label>
                    <select
                        value={formData.task_type}
                        onChange={(e) => updateField('task_type', e.target.value as TaskType)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label.ar}</option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FlagIcon className="w-4 h-4 inline ml-1" />
                        الأولوية
                    </label>
                    <select
                        value={formData.priority}
                        onChange={(e) => updateField('priority', e.target.value as TaskPriority)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label.ar}</option>
                        ))}
                    </select>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        التصنيف
                    </label>
                    <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value as TaskCategory)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        {Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label.ar}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Assignment Type */}
            {mode === 'create' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <UserGroupIcon className="w-4 h-4 inline ml-1" />
                    نوع الإسناد
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(TASK_ASSIGNMENT_TYPE_LABELS) as [TaskAssignmentType, { ar: string; en: string }][]).map(([type, label]) => {
                        const Icon = assignmentTypeIcon[type];
                        const isSelected = formData.assignment_type === type;
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    updateField('assignment_type', type);
                                    // Clear other assignment fields
                                    updateField('assignee_ids', []);
                                    updateField('primary_assignee_id', undefined);
                                    updateField('assigned_role_id', undefined);
                                    updateField('assigned_department_id', undefined);
                                }}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    isSelected
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{label.ar}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Assignment Target */}
            {mode === 'create' && (
            <div>
                {loadingOptions ? (
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500">
                        جاري تحميل البيانات...
                    </div>
                ) : formData.assignment_type === 'individual' ? (
                    /* Individual / Multi-user assignment */
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <UserIcon className="w-4 h-4 inline ml-1" />
                            اختر المستخدمين
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
                            {users.length === 0 && (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                    لا يوجد موظفون متاحون في قسمك للتعيين
                                </div>
                            )}
                            {users.map(user => {
                                const selected = formData.assignee_ids?.includes(user.id);
                                const isPrimary = formData.primary_assignee_id === user.id;
                                return (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                            selected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                                        }`}
                                        onClick={() => toggleAssignee(user.id)}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            selected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 dark:border-gray-500'
                                        }`}>
                                            {selected && <CheckBadgeIcon className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm text-gray-900 dark:text-white">{user.name}</span>
                                            {user.department && (
                                                <span className="text-xs text-gray-500 mr-2">({user.department})</span>
                                            )}
                                        </div>
                                        {selected && (formData.assignee_ids?.length || 0) > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateField('primary_assignee_id', user.id);
                                                }}
                                                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                                    isPrimary
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-primary-100'
                                                }`}
                                            >
                                                {isPrimary ? 'رئيسي' : 'تعيين رئيسي'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {formData.assignee_ids && formData.assignee_ids.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {formData.assignee_ids.map(id => {
                                    const user = users.find(u => u.id === id);
                                    return user ? (
                                        <span
                                            key={id}
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                                                formData.primary_assignee_id === id
                                                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            <UserIcon className="w-3 h-3" />
                                            {user.name}
                                            <button
                                                type="button"
                                                onClick={() => toggleAssignee(id)}
                                                className="hover:text-red-600 mr-1"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                ) : formData.assignment_type === 'role' ? (
                    /* Role-based assignment */
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <ShieldCheckIcon className="w-4 h-4 inline ml-1" />
                            اختر الدور
                        </label>
                        <select
                            value={formData.assigned_role_id || ''}
                            onChange={(e) => updateField('assigned_role_id', e.target.value || undefined)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                        >
                            <option value="">-- اختر الدور --</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name_ar || role.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            سيتم إسناد المهمة لجميع المستخدمين بهذا الدور
                        </p>
                    </div>
                ) : (
                    /* Department-based assignment */
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <BuildingOfficeIcon className="w-4 h-4 inline ml-1" />
                            اختر القسم
                        </label>
                        <select
                            value={formData.assigned_department_id || ''}
                            onChange={(e) => updateField('assigned_department_id', e.target.value || undefined)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                        >
                            <option value="">-- اختر القسم --</option>
                            {departments.length === 0 && (
                                <option value="" disabled>لا يوجد قسم متاح</option>
                            )}
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name_ar || dept.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            سيتم إسناد المهمة لجميع أعضاء القسم
                        </p>
                    </div>
                )}
            </div>
            )}

            {/* Due Date & Estimated Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <CalendarIcon className="w-4 h-4 inline ml-1" />
                        الموعد النهائي
                    </label>
                    <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => updateField('due_date', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <ClockIcon className="w-4 h-4 inline ml-1" />
                        الوقت المقدر (ساعات)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimated_hours || ''}
                        onChange={(e) => updateField('estimated_hours', parseFloat(e.target.value) || undefined)}
                        placeholder="مثال: 4"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                </div>
            </div>

            {/* Approval & Verification toggles */}
            <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.requires_approval}
                        onChange={(e) => updateField('requires_approval', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <CheckBadgeIcon className="w-4 h-4 text-emerald-600" />
                            يتطلب اعتماداً
                        </span>
                        <span className="text-xs text-gray-500">يجب اعتماد المهمة قبل إغلاقها</span>
                    </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.requires_verification}
                        onChange={(e) => updateField('requires_verification', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <ShieldCheckIcon className="w-4 h-4 text-amber-600" />
                            يتطلب مراجعة
                        </span>
                        <span className="text-xs text-gray-500">يجب مراجعة المهمة قبل الاعتماد</span>
                    </div>
                </label>
            </div>

            {/* Checklist */}
            {mode === 'create' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    قائمة المهام الفرعية
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                        placeholder="أضف مهمة فرعية..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                    <button
                        type="button"
                        onClick={addChecklistItem}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                {formData.checklist && formData.checklist.length > 0 && (
                    <ul className="space-y-2">
                        {formData.checklist.map((item, index) => (
                            <li key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="flex-1 text-gray-700 dark:text-gray-300">{item}</span>
                                <button
                                    type="button"
                                    onClick={() => removeChecklistItem(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            )}

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <TagIcon className="w-4 h-4 inline ml-1" />
                    الوسوم
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="أضف وسم..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="hover:text-primary-900"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    إلغاء
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !formData.title.trim()}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <InlineLoading text={mode === 'edit' ? 'جاري التحديث...' : 'جاري الحفظ...'} className="text-white" />
                    ) : (
                        <>
                            <PlusIcon className="w-5 h-5" />
                            {mode === 'edit' ? 'تحديث المهمة' : 'إنشاء المهمة'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default TaskForm;
