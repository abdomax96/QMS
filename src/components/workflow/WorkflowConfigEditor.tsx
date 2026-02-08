import React, { useState } from 'react';
import {
    PlusIcon,
    TrashIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface WorkflowStep {
    id: string;
    name: string;
    description?: string;
    role: string;
    required: boolean;
    auto_approve?: boolean;
    timeout_hours?: number;
    order: number;
}

export interface WorkflowConfig {
    enabled: boolean;
    steps: WorkflowStep[];
    require_all_steps: boolean;
    allow_skip?: boolean;
    notification_enabled: boolean;
}

interface WorkflowConfigEditorProps {
    config: WorkflowConfig;
    onChange: (config: WorkflowConfig) => void;
    availableRoles?: string[];
}

const WorkflowConfigEditor: React.FC<WorkflowConfigEditorProps> = ({
    config,
    onChange,
    availableRoles = ['Quality Manager', 'Production Manager', 'Supervisor', 'Operator']
}) => {
    const [newStepName, setNewStepName] = useState('');
    const [selectedRole, setSelectedRole] = useState(availableRoles[0]);

    const updateConfig = (updates: Partial<WorkflowConfig>) => {
        onChange({ ...config, ...updates });
    };

    const addStep = () => {
        if (!newStepName.trim()) return;

        const newStep: WorkflowStep = {
            id: `step-${Date.now()}`,
            name: newStepName,
            role: selectedRole,
            required: true,
            order: config.steps.length,
            timeout_hours: 24
        };

        updateConfig({
            steps: [...config.steps, newStep]
        });

        setNewStepName('');
    };

    const removeStep = (stepId: string) => {
        updateConfig({
            steps: config.steps.filter(s => s.id !== stepId).map((s, idx) => ({ ...s, order: idx }))
        });
    };

    const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
        updateConfig({
            steps: config.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
        });
    };

    const moveStep = (stepId: string, direction: 'up' | 'down') => {
        const currentIndex = config.steps.findIndex(s => s.id === stepId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= config.steps.length) return;

        const newSteps = [...config.steps];
        [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];

        updateConfig({
            steps: newSteps.map((s, idx) => ({ ...s, order: idx }))
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-lg text-white">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircleIcon className="w-8 h-8" />
                    <div>
                        <h2 className="text-2xl font-bold">تكوين سير العمل</h2>
                        <p className="text-purple-100 text-sm mt-1">
                            إعداد خطوات الموافقة والمراجعة
                        </p>
                    </div>
                </div>

                {/* Enable Workflow Toggle */}
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                    <span className="font-medium">تفعيل سير العمل</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </div>

            {config.enabled && (
                <>
                    {/* Workflow Options */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            إعدادات عامة
                        </h3>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                اشتراط جميع الخطوات
                            </span>
                            <input
                                type="checkbox"
                                checked={config.require_all_steps}
                                onChange={(e) => updateConfig({ require_all_steps: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                السماح بتخطي الخطوات
                            </span>
                            <input
                                type="checkbox"
                                checked={config.allow_skip}
                                onChange={(e) => updateConfig({ allow_skip: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                تفعيل الإشعارات
                            </span>
                            <input
                                type="checkbox"
                                checked={config.notification_enabled}
                                onChange={(e) => updateConfig({ notification_enabled: e.target.checked })}
                                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Add New Step */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                            إضافة خطوة جديدة
                        </h3>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newStepName}
                                onChange={(e) => setNewStepName(e.target.value)}
                                placeholder="اسم الخطوة (مثال: موافقة مدير الجودة)"
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                                onKeyPress={(e) => e.key === 'Enter' && addStep()}
                            />
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                            >
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            <button
                                onClick={addStep}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                                إضافة
                            </button>
                        </div>
                    </div>

                    {/* Workflow Steps List */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            خطوات سير العمل ({config.steps.length})
                        </h3>

                        {config.steps.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    لم يتم إضافة أي خطوات بعد
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {config.steps.map((step, index) => (
                                    <div
                                        key={step.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Step Number */}
                                            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                                <span className="text-purple-700 dark:text-purple-300 font-bold">
                                                    {index + 1}
                                                </span>
                                            </div>

                                            {/* Step Details */}
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={step.name}
                                                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                                        className="font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 w-full"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.description || ''}
                                                        onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                                        placeholder="وصف اختياري..."
                                                        className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 w-full mt-1"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                            الدور المسؤول
                                                        </label>
                                                        <select
                                                            value={step.role}
                                                            onChange={(e) => updateStep(step.id, { role: e.target.value })}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                        >
                                                            {availableRoles.map(role => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                            المهلة الزمنية (ساعات)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={step.timeout_hours || 24}
                                                            onChange={(e) => updateStep(step.id, { timeout_hours: parseInt(e.target.value) })}
                                                            min="1"
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={step.required}
                                                            onChange={(e) => updateStep(step.id, { required: e.target.checked })}
                                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                        <span className="text-gray-700 dark:text-gray-300">خطوة إلزامية</span>
                                                    </label>

                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={step.auto_approve}
                                                            onChange={(e) => updateStep(step.id, { auto_approve: e.target.checked })}
                                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                                        />
                                                        <span className="text-gray-700 dark:text-gray-300">موافقة تلقائية</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => moveStep(step.id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="تحريك لأعلى"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    onClick={() => moveStep(step.id, 'down')}
                                                    disabled={index === config.steps.length - 1}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="تحريك لأسفل"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    onClick={() => removeStep(step.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                    title="حذف"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Arrow to next step */}
                                        {index < config.steps.length - 1 && (
                                            <div className="flex justify-center mt-3">
                                                <ArrowRightIcon className="w-6 h-6 text-gray-400 rotate-90" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Workflow Preview */}
                    {config.steps.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">
                                معاينة سير العمل
                            </h3>
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                {config.steps.map((step, index) => (
                                    <React.Fragment key={step.id}>
                                        <div className="flex-shrink-0 text-center">
                                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-2">
                                                <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-gray-900 dark:text-white max-w-[100px]">
                                                {step.name}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {step.role}
                                            </p>
                                        </div>
                                        {index < config.steps.length - 1 && (
                                            <ArrowRightIcon className="w-6 h-6 text-purple-400 flex-shrink-0" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WorkflowConfigEditor;
