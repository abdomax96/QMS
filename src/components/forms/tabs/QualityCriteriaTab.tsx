import React, { useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { FormTemplate, QualityCriteria, QualityCriteriaItem } from '../../../types';
import { generateId } from '../../../utils';

interface QualityCriteriaTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const gradeColors = [
    { id: 'green', label: 'أخضر', color: '#10B981', bgClass: 'bg-green-100 dark:bg-green-900' },
    { id: 'blue', label: 'أزرق', color: '#3B82F6', bgClass: 'bg-blue-100 dark:bg-blue-900' },
    { id: 'yellow', label: 'أصفر', color: '#F59E0B', bgClass: 'bg-yellow-100 dark:bg-yellow-900' },
    { id: 'red', label: 'أحمر', color: '#EF4444', bgClass: 'bg-red-100 dark:bg-red-900' },
    { id: 'purple', label: 'بنفسجي', color: '#8B5CF6', bgClass: 'bg-purple-100 dark:bg-purple-900' },
];

const QualityCriteriaTab: React.FC<QualityCriteriaTabProps> = ({ template, onChange }) => {
    const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newCriteria, setNewCriteria] = useState({
        title: '',
        acceptance: '',
        color: 'green',
    });

    const criteria = template.quality_criteria || [];

    const handleAddCriteria = () => {
        if (!newCriteria.title) return;

        const criterion: QualityCriteria = {
            id: generateId(),
            title: newCriteria.title,
            icon: 'fas fa-check-circle',
            color: newCriteria.color,
            acceptance: newCriteria.acceptance,
            items: [],
        };

        onChange({
            quality_criteria: [...criteria, criterion],
        });

        setNewCriteria({ title: '', acceptance: '', color: 'green' });
        setShowAddDialog(false);
    };

    const handleDeleteCriteria = (id: string) => {
        onChange({
            quality_criteria: criteria.filter(c => c.id !== id),
        });
    };

    const handleUpdateCriteria = (id: string, updates: Partial<QualityCriteria>) => {
        onChange({
            quality_criteria: criteria.map(c =>
                c.id === id ? { ...c, ...updates } : c
            ),
        });
    };

    const handleAddItem = (criteriaId: string) => {
        const criterion = criteria.find(c => c.id === criteriaId);
        if (!criterion) return;

        const newItem: QualityCriteriaItem = {
            parameter: '',
            specification: '',
        };

        handleUpdateCriteria(criteriaId, {
            items: [...criterion.items, newItem],
        });
    };

    const handleUpdateItem = (criteriaId: string, itemIndex: number, updates: Partial<QualityCriteriaItem>) => {
        const criterion = criteria.find(c => c.id === criteriaId);
        if (!criterion) return;

        const updatedItems = [...criterion.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };

        handleUpdateCriteria(criteriaId, { items: updatedItems });
    };

    const handleDeleteItem = (criteriaId: string, itemIndex: number) => {
        const criterion = criteria.find(c => c.id === criteriaId);
        if (!criterion) return;

        handleUpdateCriteria(criteriaId, {
            items: criterion.items.filter((_, i) => i !== itemIndex),
        });
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedCriteria);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedCriteria(newExpanded);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    معايير الجودة
                </h3>
                <button
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="w-4 h-4" />
                    معيار جديد
                </button>
            </div>

            {criteria.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم إضافة معايير جودة بعد</p>
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        إضافة معيار الجودة الأول
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {criteria.map((criterion) => {
                        const colorConfig = gradeColors.find(c => c.id === criterion.color) || gradeColors[0];
                        const isExpanded = expandedCriteria.has(criterion.id);

                        return (
                            <div
                                key={criterion.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <div
                                    className="flex items-center gap-3 p-4"
                                    style={{ borderRight: `4px solid ${colorConfig.color}` }}
                                >
                                    <button onClick={() => toggleExpand(criterion.id)} className="p-1">
                                        {isExpanded ? (
                                            <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>

                                    <div
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${colorConfig.bgClass}`}
                                        style={{ color: colorConfig.color }}
                                    >
                                        {criterion.title}
                                    </div>

                                    <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                                        {criterion.acceptance && `معيار القبول: ${criterion.acceptance}`}
                                    </div>

                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {criterion.items.length} عنصر
                                    </span>

                                    <button
                                        onClick={() => handleDeleteCriteria(criterion.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                معيار القبول
                                            </label>
                                            <input
                                                type="text"
                                                value={criterion.acceptance}
                                                onChange={(e) => handleUpdateCriteria(criterion.id, { acceptance: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="مثال: لا يقل عن 95%"
                                            />
                                        </div>

                                        {/* Quality Items */}
                                        <div className="space-y-2 mb-4">
                                            {criterion.items.map((item, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.parameter}
                                                        onChange={(e) => handleUpdateItem(criterion.id, index, { parameter: e.target.value })}
                                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                                        placeholder="المعلمة"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.specification}
                                                        onChange={(e) => handleUpdateItem(criterion.id, index, { specification: e.target.value })}
                                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                                        placeholder="المواصفة"
                                                    />
                                                    <button
                                                        onClick={() => handleDeleteItem(criterion.id, index)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handleAddItem(criterion.id)}
                                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            إضافة عنصر
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Criteria Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            معيار جودة جديد
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اسم المعيار
                                </label>
                                <input
                                    type="text"
                                    value={newCriteria.title}
                                    onChange={(e) => setNewCriteria({ ...newCriteria, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="مثال: GRADE A - منتج قياسي"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اللون
                                </label>
                                <div className="flex gap-2">
                                    {gradeColors.map((color) => (
                                        <button
                                            key={color.id}
                                            onClick={() => setNewCriteria({ ...newCriteria, color: color.id })}
                                            className={`w-10 h-10 rounded-lg border-2 ${newCriteria.color === color.id ? 'border-gray-900 dark:border-white' : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color.color }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    معيار القبول
                                </label>
                                <input
                                    type="text"
                                    value={newCriteria.acceptance}
                                    onChange={(e) => setNewCriteria({ ...newCriteria, acceptance: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="مثال: لا يقل عن 95%"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setNewCriteria({ title: '', acceptance: '', color: 'green' });
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddCriteria}
                                disabled={!newCriteria.title}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityCriteriaTab;
