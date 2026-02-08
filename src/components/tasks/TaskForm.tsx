/**
 * Task Form Component
 * نموذج إنشاء وتعديل المهام
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
    UserIcon
} from '@heroicons/react/24/outline';
import { InlineLoading } from '../common/LoadingStates';
import type { CreateTaskInput, TaskPriority, TaskCategory } from '../../domain/tasks/types';
import { taskPriorityLabels, taskCategoryLabels } from '../../domain/tasks/types';
import { supabase } from '../../config/supabase';

interface TaskFormProps {
    onSubmit: (data: CreateTaskInput) => void;
    onCancel: () => void;
    initialData?: Partial<CreateTaskInput>;
    isLoading?: boolean;
}

interface User {
    id: string;
    name: string;
    email: string;
    department?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, initialData, isLoading }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const [formData, setFormData] = useState<CreateTaskInput>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        priority: initialData?.priority || 'medium',
        category: initialData?.category || 'general',
        dueDate: initialData?.dueDate || '',
        checklist: initialData?.checklist || [],
        tags: initialData?.tags || [],
        estimatedHours: initialData?.estimatedHours,
        assigneeIds: initialData?.assigneeIds || []
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data } = await supabase
                .from('users')
                .select('id, name, email, department')
                .eq('is_active', true)
                .order('name');

            setUsers((data || []).map((u: { id: string; name: string; email: string; department?: string }) => ({
                id: u.id,
                name: u.name || u.email,
                email: u.email,
                department: u.department
            })));
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newTag, setNewTag] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        onSubmit(formData);
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        setFormData({
            ...formData,
            checklist: [...(formData.checklist || []), newChecklistItem.trim()]
        });
        setNewChecklistItem('');
    };

    const removeChecklistItem = (index: number) => {
        setFormData({
            ...formData,
            checklist: formData.checklist?.filter((_, i) => i !== index)
        });
    };

    const addTag = () => {
        if (!newTag.trim() || formData.tags?.includes(newTag.trim())) return;
        setFormData({
            ...formData,
            tags: [...(formData.tags || []), newTag.trim()]
        });
        setNewTag('');
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter(t => t !== tag)
        });
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
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي للمهمة..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 resize-none"
                />
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <FlagIcon className="w-4 h-4 inline ml-1" />
                        الأولوية
                    </label>
                    <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        {Object.entries(taskPriorityLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
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
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        {Object.entries(taskCategoryLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Assignee Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserIcon className="w-4 h-4 inline ml-1" />
                    إسناد المهمة إلى
                </label>
                {loadingUsers ? (
                    <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500">
                        جاري تحميل المستخدمين...
                    </div>
                ) : (
                    <select
                        value={formData.assigneeIds?.[0] || ''}
                        onChange={(e) => setFormData({
                            ...formData,
                            assigneeIds: e.target.value ? [e.target.value] : []
                        })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    >
                        <option value="">-- اختر المستخدم --</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name} {user.department ? `(${user.department})` : ''}
                            </option>
                        ))}
                    </select>
                )}
                {formData.assigneeIds && formData.assigneeIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {formData.assigneeIds.map(id => {
                            const user = users.find(u => u.id === id);
                            return user ? (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                                >
                                    <UserIcon className="w-3 h-3" />
                                    {user.name}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            assigneeIds: formData.assigneeIds?.filter(a => a !== id)
                                        })}
                                        className="hover:text-primary-900 mr-1"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ) : null;
                        })}
                    </div>
                )}
            </div>

            {/* Due Date & Estimated Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <CalendarIcon className="w-4 h-4 inline ml-1" />
                        الموعد النهائي
                    </label>
                    <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                </div>

                {/* Estimated Hours */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <ClockIcon className="w-4 h-4 inline ml-1" />
                        الوقت المقدر (ساعات)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimatedHours || ''}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || undefined })}
                        placeholder="مثال: 4"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                    />
                </div>
            </div>

            {/* Checklist */}
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
                        <InlineLoading text="جاري الحفظ..." className="text-white" />
                    ) : (
                        <>
                            <PlusIcon className="w-5 h-5" />
                            إنشاء المهمة
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default TaskForm;
