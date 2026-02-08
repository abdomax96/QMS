import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Folder, FolderType } from '../../types';
import { generateId } from '../../utils';
import useStore from '../../store';
import { foldersService } from '../../services/supabaseService';

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: Folder | null;
  parentId?: string | null;
  //   folderCategory?: 'template' | 'report' | 'legacy'; // Deprecated
  onSuccess?: (action: 'create' | 'update', item: Folder, originalItem?: Folder) => void;
}

const FolderDialog: React.FC<FolderDialogProps> = ({
  isOpen,
  onClose,
  folder,
  parentId,
  // folderCategory // Deprecated
  onSuccess
}) => {
  const { addFolder, updateFolder, folders, user } = useStore();

  const [formData, setFormData] = useState({
    name: '',
    type: 'standard' as FolderType,
    icon: 'fas fa-folder',
    color: '#4F46E5',
    description: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name,
        type: folder.type,
        icon: folder.icon,
        color: folder.color,
        description: folder.metadata.description || '',
        tags: folder.metadata.tags || [],
      });
    } else {
      setFormData({
        name: '',
        type: 'standard',
        icon: 'fas fa-folder',
        color: '#4F46E5',
        description: '',
        tags: [],
      });
    }
  }, [folder, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم المجلد مطلوب';
    }

    // Check for duplicate names in same parent
    const siblings = Object.values(folders).filter(f =>
      f.parent_id === (folder ? folder.parent_id : parentId) &&
      f.id !== folder?.id &&
      !f.archived
    );

    if (siblings.some(f => f.name === formData.name)) {
      newErrors.name = 'يوجد مجلد بنفس الاسم في هذا المستوى';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (folder) {
      // Store original for undo
      const originalFolder = { ...folder };

      // Update existing folder
      updateFolder(folder.id, {
        name: formData.name,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        metadata: {
          ...folder.metadata,
          description: formData.description,
          tags: formData.tags,
        },
      });
      // Also update in DB
      await foldersService.updateFolder(folder.id, {
        name: formData.name,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        metadata: {
          ...folder.metadata,
          description: formData.description,
          tags: formData.tags,
        },
      });

      onSuccess?.('update', { ...folder, name: formData.name }, originalFolder);

    } else {
      // Create new folder
      const now = new Date().toISOString();
      const folderId = generateId();
      const parent = parentId ? folders[parentId] : null;
      const path = parent ? `${parent.path}/${formData.name}` : `/${formData.name}`;

      const newFolder: Folder = {
        id: folderId,
        name: formData.name,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        parent_id: parentId || null,
        path: path,
        created_at: now,
        created_by: user?.id || 'system',
        modified_at: now,
        permissions: {
          owner: user?.id || 'system',
          editors: [],
          viewers: [],
        },
        metadata: {
          description: formData.description,
          tags: formData.tags,
        },
        stats: {
          form_templates_count: 0,
          reports_count: 0,
          storage_used_mb: 0,
        },
      };

      try {
        await foldersService.saveFolder(newFolder);
        addFolder(newFolder);
        onSuccess?.('create', newFolder);
      } catch (error) {
        console.error("Failed to create folder", error);
        alert("Failed to create folder");
        return;
      }
    }

    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const folderTypes: { value: FolderType; label: string; icon: string }[] = [
    { value: 'standard', label: 'عادي', icon: 'fas fa-folder' },
    { value: 'project', label: 'مشروع', icon: 'fas fa-project-diagram' },
    { value: 'department', label: 'قسم', icon: 'fas fa-building' },
    { value: 'client', label: 'عميل', icon: 'fas fa-user-tie' },
    { value: 'date-based', label: 'تاريخ', icon: 'fas fa-calendar-alt' },
  ];

  const colors = [
    '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B',
    '#10B981', '#3B82F6', '#EF4444', '#6B7280',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {folder ? 'تعديل المجلد' : 'مجلد جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Folder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اسم المجلد *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
                errors.name && 'border-red-500'
              )}
              placeholder="أدخل اسم المجلد"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Folder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع المجلد
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FolderType })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              {folderTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اللون
            </label>
            <div className="flex gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-lg border-2',
                    formData.color === color ? 'border-gray-900 dark:border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الوصف
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="أدخل وصف المجلد (اختياري)"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              العلامات
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="أدخل علامة واضغط Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                إضافة
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {folder ? 'حفظ التغييرات' : 'إنشاء المجلد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderDialog;

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}