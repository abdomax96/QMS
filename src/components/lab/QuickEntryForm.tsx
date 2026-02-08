/**
 * Quick Test Entry Form Component
 * نموذج الإدخال السريع للفحوصات
 */

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, XCircle, Search, Package } from 'lucide-react';
import { labTestExecutionService } from '../../services/labTestExecutionService';
import { labTestConfigService } from '../../services/labTestConfigService';
import type { LabTestConfig, QuickEntryDefaults, TestFieldType } from '../../types/labTests';

const QuickEntryForm: React.FC = () => {
    const [selectedConfig, setSelectedConfig] = useState<string>('');
    const [configs, setConfigs] = useState<LabTestConfig[]>([]);
    const [defaults, setDefaults] = useState<QuickEntryDefaults | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
    const [batchId, setBatchId] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        loadConfigs();
    }, []);

    useEffect(() => {
        if (selectedConfig) {
            loadDefaults();
        }
    }, [selectedConfig, batchId]);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await labTestConfigService.getAllConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDefaults = async () => {
        setLoading(true);
        try {
            const data = await labTestExecutionService.getQuickEntryDefaults(
                selectedConfig,
                batchId ? { batchId } : undefined
            );
            setDefaults(data);
            setFieldValues(data.last_values || {});
        } catch (error) {
            console.error('Failed to load defaults:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);

        try {
            const testRun = await labTestExecutionService.quickCreateAndSubmit(
                selectedConfig,
                fieldValues,
                {
                    batchId: batchId || undefined,
                    notes: notes || undefined
                }
            );

            setResult(testRun);

            // Show success message
            setTimeout(() => {
                // Reset form
                setFieldValues(defaults?.last_values || {});
                setNotes('');
                setResult(null);
            }, 3000);
        } catch (error) {
            console.error('Failed to submit test:', error);
            alert('فشل إرسال الفحص');
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field: any) => {
        const value = fieldValues[field.field_key] ?? field.default_value ?? '';
        const lastValue = defaults?.last_values[field.field_key];
        const hasChanged = lastValue !== undefined && value !== lastValue;

        const commonClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${hasChanged ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`;

        switch (field.field_type as TestFieldType) {
            case 'number':
                return (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                            {field.spec_unit && <span className="text-gray-500"> ({field.spec_unit})</span>}
                        </label>
                        <input
                            type="number"
                            required={field.is_required}
                            value={value}
                            onChange={(e) => setFieldValues({ ...fieldValues, [field.field_key]: e.target.value })}
                            className={commonClasses}
                            step={field.field_options?.step || 'any'}
                            min={field.field_options?.min}
                            max={field.field_options?.max}
                            placeholder={field.field_options?.placeholder}
                        />
                        {lastValue !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                                Last: {lastValue} {hasChanged && <span className="text-yellow-600">(Changed)</span>}
                            </p>
                        )}
                        {field.is_evaluable && (
                            <p className="text-xs text-gray-500 mt-1">
                                Spec: {field.spec_min_value ?? '-'} to {field.spec_max_value ?? '-'}
                            </p>
                        )}
                    </div>
                );

            case 'text':
                return (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            required={field.is_required}
                            value={value}
                            onChange={(e) => setFieldValues({ ...fieldValues, [field.field_key]: e.target.value })}
                            className={commonClasses}
                            placeholder={field.field_options?.placeholder}
                        />
                        {lastValue !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">Last: {lastValue}</p>
                        )}
                    </div>
                );

            case 'select':
                return (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            required={field.is_required}
                            value={value}
                            onChange={(e) => setFieldValues({ ...fieldValues, [field.field_key]: e.target.value })}
                            className={commonClasses}
                        >
                            <option value="">Select...</option>
                            {field.field_options?.choices?.map((choice: any) => (
                                <option key={choice.value} value={choice.value}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'boolean':
                return (
                    <div key={field.id} className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={value === true || value === 'true'}
                            onChange={(e) => setFieldValues({ ...fieldValues, [field.field_key]: e.target.checked })}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label className="text-sm font-medium text-gray-700">
                            {field.label}
                        </label>
                    </div>
                );

            default:
                return (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                        </label>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => setFieldValues({ ...fieldValues, [field.field_key]: e.target.value })}
                            className={commonClasses}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-bold">Quick Test Entry</h1>
                        <p className="text-purple-100 mt-1">إدخال سريع للفحوصات المتكررة</p>
                    </div>
                </div>
            </div>

            {/* Test Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Test *
                        </label>
                        <select
                            value={selectedConfig}
                            onChange={(e) => setSelectedConfig(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Choose test...</option>
                            {configs.map((config) => (
                                <option key={config.id} value={config.id}>
                                    {config.name} ({config.name_ar})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number (Optional)
                        </label>
                        <input
                            type="text"
                            value={batchId}
                            onChange={(e) => setBatchId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Leave empty for general test"
                        />
                    </div>
                </div>

                {defaults?.last_run && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="text-blue-800">
                            📊 Last test: {new Date(defaults.last_run.created_at).toLocaleString()}
                            {' '}- Result: {defaults.last_run.evaluation_result?.toUpperCase()}
                        </p>
                    </div>
                )}
            </div>

            {/* Form */}
            {selectedConfig && defaults && (
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Test Fields
                    </h3>

                    <div className="space-y-4 mb-6">
                        {defaults.test_config.fields?.map(renderField)}
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={3}
                            placeholder="Add any additional notes..."
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="h-5 w-5" />
                                <span>Submit Test</span>
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* Result */}
            {result && (
                <div className="mt-6 bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Test Result</h3>
                        <span className="text-sm text-gray-500">#{result.run_number}</span>
                    </div>

                    <div className={`p-4 rounded-lg flex items-center gap-3 ${result.evaluation_result === 'pass'
                            ? 'bg-green-50 border-2 border-green-500'
                            : result.evaluation_result === 'fail'
                                ? 'bg-red-50 border-2 border-red-500'
                                : 'bg-gray-50 border-2 border-gray-300'
                        }`}>
                        {result.evaluation_result === 'pass' ? (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : result.evaluation_result === 'fail' ? (
                            <XCircle className="h-8 w-8 text-red-600" />
                        ) : null}

                        <div>
                            <p className={`font-bold text-lg ${result.evaluation_result === 'pass'
                                    ? 'text-green-900'
                                    : result.evaluation_result === 'fail'
                                        ? 'text-red-900'
                                        : 'text-gray-900'
                                }`}>
                                {result.evaluation_result === 'pass' ? '✓ PASS' : result.evaluation_result === 'fail' ? '✗ FAIL' : 'COMPLETED'}
                            </p>
                            <p className="text-sm text-gray-600">
                                Test submitted successfully
                            </p>
                        </div>
                    </div>

                    {result.failed_fields && result.failed_fields.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800 font-medium">
                                Failed fields: {result.failed_fields.join(', ')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuickEntryForm;
