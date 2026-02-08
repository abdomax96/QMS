/**
 * CreateFolderDialog Component
 * Dialog for creating new folders with validation and customization
 */

import React, { useState } from 'react';
import { XMarkIcon, FolderIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (folderData: FolderFormData) => Promise<void>;
    parentFolder?: { id: string; name: string } | null;
    departmentId: string;
}

export interface FolderFormData {
    name: string;
    name_en: string;
    type: 'department' | 'custom';
    department_id: string;
    parent_id?: string | null;
    icon: string;
    color: string;
    description?: string;
    content_types: string[];
}

const PRESET_COLORS = [
    { name: 'أزرق', value: '#3B82F6' },
    { name: 'أخضر', value: '#10B981' },
    { name: 'أرجواني', value: '#8B5CF6' },
    { name: 'وردي', value: '#EC4899' },
    { name: 'برتقالي', value: '#F59E0B' },
    { name: 'أحمر', value: '#EF4444' },
    { name: 'رمادي', value: '#6B7280' },
];

const PRESET_ICONS = ['📁', '📂', '📋', '📊', '📑', '📄', '🗂️', '📦', '🎯', '⭐'];

const CONTENT_TYPES = [
    { value: 'forms', label: 'نماذج' },
    { value: 'reports', label: 'تقارير' },
    { value: 'documents', label: 'مستندات' },
];

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    parentFolder,
    departmentId,
}) => {
    const [formData, setFormData] = useState<FolderFormData>({
        name: '',
        name_en: '',
        type: 'custom',
        department_id: departmentId,
        parent_id: parentFolder?.id || null,
        icon: '📁',
        color: '#3B82F6',
        description: '',
        content_types: ['forms', 'reports'],
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'الاسم بالعربية مطلوب';
        }

        if (formData.content_types.length === 0) {
            newErrors.content_types = 'يجب اختيار نوع محتوى واحد على الأقل';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
            // Reset form
            setFormData({
                name: '',
                name_en: '',
                type: 'custom',
                department_id: departmentId,
                parent_id: parentFolder?.id || null,
                icon: '📁',
                color: '#3B82F6',
                description: '',
                content_types: ['forms', 'reports'],
            });
        } catch (error) {
            console.error('Error creating folder:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleContentType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            content_types: prev.content_types.includes(type)
                ? prev.content_types.filter(t => t !== type)
                : [...prev.content_types, type],
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-corporate-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-corporate bg-gradient-primary flex items-center justify-center shadow-glow-primary">
                            <FolderIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                إنشاء مجلد جديد
                            </h2>
                            {parentFolder && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    داخل: {parentFolder.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Folder Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            اسم المجلد (عربي) *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={cn(
                                'w-full px-4 py-2 rounded-corporate border',
                                errors.name
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-slate-300 dark:border-slate-600 focus:ring-primary-500',
                                'bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
                                'focus:ring-2 focus:outline-none'
                            )}
                            placeholder="مثال: مجلد الجودة"
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Folder Name (English) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            اسم المجلد (إنجليزي)
                        </label>
                        <input
                            type="text"
                            value={formData.name_en}
                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                            className="w-full px-4 py-2 rounded-corporate border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="Quality Folder"
                        />
                    </div>

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            أيقونة المجلد
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {PRESET_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={cn(
                                        'w-12 h-12 rounded-corporate text-2xl transition-all',
                                        formData.icon === icon
                                            ? 'bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-500 scale-110'
                                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    )}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            لون المجلد
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={cn(
                                        'w-10 h-10 rounded-corporate transition-all',
                                        formData.color === color.value
                                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-slate-100 scale-110'
                                            : 'hover:scale-105'
                                    )}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content Types */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            أنواع المحتوى *
                        </label>
                        <div className="space-y-2">
                            {CONTENT_TYPES.map((type) => (
                                <label
                                    key={type.value}
                                    className="flex items-center gap-3 p-3 rounded-corporate bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.content_types.includes(type.value)}
                                        onChange={() => toggleContentType(type.value)}
                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {type.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.content_types && (
                            <p className="text-sm text-red-500 mt-1">{errors.content_types}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            الوصف
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 rounded-corporate border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="وصف مختصر للمجلد..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-corporate-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 rounded-corporate-lg bg-gradient-primary text-white hover:shadow-glow-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'جاري الإنشاء...' : 'إنشاء المجلد'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderDialog;
