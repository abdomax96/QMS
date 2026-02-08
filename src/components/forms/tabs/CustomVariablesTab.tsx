import React, { useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FormTemplate, CustomVariable } from '../../../types';
import { generateId } from '../../../utils';
import { variableService } from '../../../services/variableService';
import type { Variable } from '../../../types/supabase';

interface CustomVariablesTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const CustomVariablesTab: React.FC<CustomVariablesTabProps> = ({ template, onChange }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newVariable, setNewVariable] = useState<Partial<CustomVariable>>({
        name: '',
        value: '',
        unit: '',
        description: '',
    });
    const [globalVariables, setGlobalVariables] = useState<Variable[]>([]);

    React.useEffect(() => {
        const fetchGlobalVars = async () => {
            try {
                const data = await variableService.getVariables();
                setGlobalVariables(data.map(v => ({
                    ...v,
                    unit: v.unit ?? null,
                    source_document_id: v.source_document_id ?? null,
                    description: v.description ?? null
                })));
            } catch (error) {
                console.error('Error fetching global variables:', error);
            }
        };
        fetchGlobalVars();
    }, []);

    // Ensure variables is always an array, even if the data from DB is malformed
    const rawVariables = template.custom_variables;
    const variables: CustomVariable[] = Array.isArray(rawVariables) ? rawVariables : [];

    const handleAddVariable = () => {
        if (!newVariable.name) return;

        const variable: CustomVariable = {
            name: newVariable.name.toUpperCase().replace(/\s+/g, '_'),
            value: typeof newVariable.value === 'string' ? (parseFloat(newVariable.value) || newVariable.value || '') : (newVariable.value ?? ''),
            unit: newVariable.unit,
            description: newVariable.description,
        };

        onChange({
            custom_variables: [...variables, variable],
        });

        setNewVariable({ name: '', value: '', unit: '', description: '' });
    };

    const handleDeleteVariable = (name: string) => {
        onChange({
            custom_variables: variables.filter(v => v.name !== name),
        });
    };

    const handleUpdateVariable = (name: string, updates: Partial<CustomVariable>) => {
        onChange({
            custom_variables: variables.map(v =>
                v.name === name ? { ...v, ...updates } : v
            ),
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        المتغيرات المخصصة
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {variables.length} متغير
                    </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    استخدم المتغيرات في الصيغ والحسابات. يمكن الإشارة إليها بالاسم مثل: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">VAR_NAME</code>
                </p>

                {/* Variables List */}
                <div className="space-y-2 mb-4">
                    {variables.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لم يتم إضافة متغيرات بعد
                        </div>
                    ) : (
                        variables.map((variable) => (
                            <div
                                key={variable.name}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                            >
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">الاسم</span>
                                        <div className="font-mono text-primary-600 dark:text-primary-400">
                                            {variable.name}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">القيمة</span>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {variable.value} {variable.unit && <span className="text-gray-500">{variable.unit}</span>}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">الوصف</span>
                                        <div className="text-gray-600 dark:text-gray-300 text-sm truncate">
                                            {variable.description || '-'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteVariable(variable.name)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add New Variable */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        إضافة متغير جديد
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <input
                                type="text"
                                value={newVariable.name}
                                onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white uppercase"
                                placeholder="VAR_NAME"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                value={newVariable.value}
                                onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="القيمة"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                value={newVariable.unit}
                                onChange={(e) => setNewVariable({ ...newVariable, unit: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="الوحدة (اختياري)"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newVariable.description}
                                onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="الوصف"
                            />
                            <button
                                onClick={handleAddVariable}
                                disabled={!newVariable.name}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Variables Reference */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        المتغيرات العامة (من الوثائق)
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {globalVariables.length} متغير
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    يمكنك استخدام المتغيرات المعرفة في الوثائق. سيتم تحديث قيمها تلقائياً عند تعديل الوثيقة.
                    الاستخدام: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{`{Global:Name}`}</code> أو <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{`{Name}`}</code>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {globalVariables.length === 0 ? (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                            لا توجد متغيرات عامة. قم بإنشائها من صفحة تفاصيل الوثيقة.
                        </div>
                    ) : (
                        globalVariables.map((v) => (
                            <div
                                key={v.id}
                                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <code className="text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded select-all cursor-pointer" title="انقر للنسخ">
                                            {`{Global:${v.name}}`}
                                        </code>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={v.value}>
                                            {v.value} <span className="text-xs text-gray-500 font-normal">{v.unit}</span>
                                        </span>
                                    </div>
                                    {v.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {v.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Common Variables Reference */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    متغيرات شائعة الاستخدام
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { name: 'TOLERANCE', desc: 'نسبة التسامح المسموحة', example: '5%' },
                        { name: 'TARE_WEIGHT', desc: 'وزن العبوة الفارغة', example: '10 g' },
                        { name: 'MIN_WEIGHT', desc: 'الحد الأدنى للوزن', example: '95 g' },
                        { name: 'MAX_WEIGHT', desc: 'الحد الأقصى للوزن', example: '105 g' },
                        { name: 'SAMPLE_SIZE', desc: 'حجم العينة', example: '20' },
                        { name: 'DEFECT_RATE', desc: 'نسبة العيوب المقبولة', example: '1%' },
                    ].map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setNewVariable({ ...newVariable, name: item.name, description: item.desc })}
                            className="flex items-start gap-3 p-3 text-right hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-sm font-mono">
                                {item.name}
                            </code>
                            <div className="flex-1">
                                <div className="text-sm text-gray-900 dark:text-white">{item.desc}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">مثال: {item.example}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomVariablesTab;
