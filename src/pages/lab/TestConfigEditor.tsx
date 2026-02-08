/**
 * Test Config Editor Component
 * محرر تكوين الفحوصات - المكون الأهم
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, X, Plus, Trash2, GripVertical, Settings2,
    FlaskConical, AlertCircle, Check
} from 'lucide-react';
import { labTestConfigService } from '../../services/labTestConfigService';
import { labEquipmentService } from '../../services/labEquipmentService';
import type {
    LabTestType,
    LabEquipment,
    CreateTestConfigData,
    CreateTestFieldData,
    TestFieldType,
    SpecEvaluationMode
} from '../../types/labTests';

const FIELD_TYPES: { value: TestFieldType; label: string }[] = [
    { value: 'number', label: 'Number' },
    { value: 'text', label: 'Text' },
    { value: 'select', label: 'Dropdown' },
    { value: 'boolean', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
];

const EVAL_MODES: { value: SpecEvaluationMode; label: string }[] = [
    { value: 'range', label: 'Range (Min-Max)' },
    { value: 'min_only', label: 'Minimum Only' },
    { value: 'max_only', label: 'Maximum Only' },
    { value: 'target_tolerance', label: 'Target ± Tolerance' },
    { value: 'exact', label: 'Exact Match' },
];

const TestConfigEditor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = id !== 'new';

    const [types, setTypes] = useState<LabTestType[]>([]);
    const [equipmentOptions, setEquipmentOptions] = useState<LabEquipment[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<CreateTestConfigData>({
        test_type_id: '',
        code: '',
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        method: '',
        method_standard: '',
        equipment_required: [],
        equipment_ids: [],
        estimated_duration_minutes: 0,
        requires_approval: true,
        fields: []
    });

    useEffect(() => {
        loadTypes();
        loadEquipment();
        if (isEdit) {
            loadConfig();
        }
    }, [id]);

    const loadEquipment = async () => {
        try {
            const data = await labEquipmentService.getEquipment();
            setEquipmentOptions(data);
        } catch (error) {
            console.error('Failed to load equipment:', error);
        }
    };

    const loadTypes = async () => {
        try {
            const data = await labTestConfigService.getAllTypes();
            setTypes(data);
        } catch (error) {
            console.error('Failed to load types:', error);
        }
    };

    const loadConfig = async () => {
        if (!id || id === 'new') return;

        setLoading(true);
        try {
            const config = await labTestConfigService.getConfigWithFields(id);
            if (config) {
                setFormData({
                    test_type_id: config.test_type_id,
                    code: config.code,
                    name: config.name,
                    name_ar: config.name_ar,
                    description: config.description,
                    description_ar: config.description_ar,
                    method: config.method,
                    method_standard: config.method_standard,
                    equipment_required: config.equipment_required || [],
                    equipment_ids: config.equipment?.map((eq) => eq.id) || [],
                    estimated_duration_minutes: config.estimated_duration_minutes,
                    requires_approval: config.requires_approval,
                    fields: config.fields || []
                });
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const equipmentNames = equipmentOptions.length > 0
                ? equipmentOptions
                    .filter((eq) => formData.equipment_ids?.includes(eq.id))
                    .map((eq) => eq.name_ar || eq.name)
                : (formData.equipment_required || []);

            const payload: CreateTestConfigData = {
                ...formData,
                equipment_required: equipmentNames
            };

            if (isEdit && id) {
                await labTestConfigService.updateConfig(id, payload);
            } else {
                await labTestConfigService.createConfig(payload);
            }

            alert('✓ Test configuration saved successfully!');
            navigate('/lab/tests/v1/settings');
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('فشل حفظ التكوين');
        } finally {
            setSaving(false);
        }
    };

    const addField = () => {
        const newField: CreateTestFieldData = {
            field_key: `field_${Date.now()}`,
            label: '',
            label_ar: '',
            field_type: 'text',
            display_order: formData.fields.length,
            is_required: false,
            is_evaluable: false,
            spec_evaluation_mode: 'range'
        };

        setFormData({
            ...formData,
            fields: [...formData.fields, newField]
        });
    };

    const toggleEquipment = (equipmentId: string) => {
        setFormData((prev) => {
            const current = prev.equipment_ids || [];
            const exists = current.includes(equipmentId);
            return {
                ...prev,
                equipment_ids: exists ? current.filter((id) => id !== equipmentId) : [...current, equipmentId]
            };
        });
    };

    const updateField = (index: number, updates: Partial<CreateTestFieldData>) => {
        const newFields = [...formData.fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFormData({ ...formData, fields: newFields });
    };

    const deleteField = (index: number) => {
        const newFields = formData.fields.filter((_, i) => i !== index);
        setFormData({ ...formData, fields: newFields });
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...formData.fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newFields.length) return;

        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        newFields.forEach((field, idx) => {
            field.display_order = idx;
        });

        setFormData({ ...formData, fields: newFields });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FlaskConical className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {isEdit ? 'Edit Test Configuration' : 'New Test Configuration'}
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {isEdit ? 'تعديل تكوين الفحص' : 'تكوين فحص جديد'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/lab/tests/v1/settings')}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-purple-600" />
                        Basic Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Type *
                            </label>
                            <select
                                required
                                value={formData.test_type_id}
                                onChange={(e) => setFormData({ ...formData, test_type_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Select type...</option>
                                {types.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.category?.name} → {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Code *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., ph_test"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Name (English) *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Name (Arabic) *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name_ar}
                                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Method
                            </label>
                            <input
                                type="text"
                                value={formData.method || ''}
                                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., pH meter, titration..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Standard
                            </label>
                            <input
                                type="text"
                                value={formData.method_standard || ''}
                                onChange={(e) => setFormData({ ...formData, method_standard: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., ISO 4833:2003"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estimated Duration (minutes)
                            </label>
                            <input
                                type="number"
                                value={formData.estimated_duration_minutes || ''}
                                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.requires_approval}
                                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <label className="text-sm font-medium text-gray-700">
                                Requires Approval
                            </label>
                        </div>
                    </div>
                </div>

                {/* Equipment Selection */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-purple-600" />
                        معدات المختبر
                    </h2>

                    {equipmentOptions.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500">
                            لا توجد أجهزة مسجلة. أضف جهازًا من إعدادات المختبر أولاً.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {equipmentOptions.map((equipment) => {
                                const isChecked = formData.equipment_ids?.includes(equipment.id);
                                return (
                                    <label
                                        key={equipment.id}
                                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                            isChecked
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleEquipment(equipment.id)}
                                            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {equipment.name_ar || equipment.name}
                                            </p>
                                            <div className="text-xs text-gray-500">
                                                {equipment.code || equipment.model || 'بدون كود'}
                                                {equipment.location ? ` • ${equipment.location}` : ''}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Fields Builder */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-purple-600" />
                            Test Fields ({formData.fields.length})
                        </h2>
                        <button
                            type="button"
                            onClick={addField}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            <Plus className="h-5 w-5" />
                            Add Field
                        </button>
                    </div>

                    {formData.fields.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No fields yet. Add your first field!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formData.fields.map((field, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col gap-1 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => moveField(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                ▲
                                            </button>
                                            <GripVertical className="h-5 w-5 text-gray-400" />
                                            <button
                                                type="button"
                                                onClick={() => moveField(index, 'down')}
                                                disabled={index === formData.fields.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                ▼
                                            </button>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Field Key */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Field Key *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={field.field_key}
                                                    onChange={(e) => updateField(index, { field_key: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                    placeholder="e.g., reading_value"
                                                />
                                            </div>

                                            {/* Field Type */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Type *
                                                </label>
                                                <select
                                                    value={field.field_type}
                                                    onChange={(e) => updateField(index, { field_type: e.target.value as TestFieldType })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                >
                                                    {FIELD_TYPES.map(ft => (
                                                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Label EN */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Label (EN) *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={field.label}
                                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>

                                            {/* Label AR */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Label (AR) *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={field.label_ar}
                                                    onChange={(e) => updateField(index, { label_ar: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                                    dir="rtl"
                                                />
                                            </div>

                                            {/* Checkboxes */}
                                            <div className="col-span-2 flex gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.is_required}
                                                        onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">Required</span>
                                                </label>

                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.is_evaluable}
                                                        onChange={(e) => updateField(index, { is_evaluable: e.target.checked })}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">Evaluable (Pass/Fail)</span>
                                                </label>
                                            </div>

                                            {/* Specifications (only if evaluable) */}
                                            {field.is_evaluable && (
                                                <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                                                    <p className="text-xs font-medium text-blue-900 mb-2">Specifications</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-700 mb-1">Min Value</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={field.spec_min_value || ''}
                                                                onChange={(e) => updateField(index, { spec_min_value: parseFloat(e.target.value) })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-700 mb-1">Max Value</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={field.spec_max_value || ''}
                                                                onChange={(e) => updateField(index, { spec_max_value: parseFloat(e.target.value) })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-700 mb-1">Target</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={field.spec_target_value || ''}
                                                                onChange={(e) => updateField(index, { spec_target_value: parseFloat(e.target.value) })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-700 mb-1">Tolerance</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={field.spec_tolerance || ''}
                                                                onChange={(e) => updateField(index, { spec_tolerance: parseFloat(e.target.value) })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs text-gray-700 mb-1">Unit</label>
                                                            <input
                                                                type="text"
                                                                value={field.spec_unit || ''}
                                                                onChange={(e) => updateField(index, { spec_unit: e.target.value })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                                placeholder="e.g., pH, %, °C"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs text-gray-700 mb-1">Evaluation Mode</label>
                                                            <select
                                                                value={field.spec_evaluation_mode || 'range'}
                                                                onChange={(e) => updateField(index, { spec_evaluation_mode: e.target.value as SpecEvaluationMode })}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                            >
                                                                {EVAL_MODES.map(em => (
                                                                    <option key={em.value} value={em.value}>{em.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => deleteField(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                <span>Save Test Configuration</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/lab/tests/v1/settings')}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TestConfigEditor;
