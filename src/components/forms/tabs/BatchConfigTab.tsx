import React, { useState, useMemo } from 'react';
import {
    PlusIcon,
    ArrowPathIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { FormTemplate } from '../../../types';

interface BatchConfigTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

interface BatchPreview {
    full: string;
    parts: {
        prefix?: string;
        code?: string;
        date?: string;
        number?: string;
        suffix?: string;
    };
}

const BatchConfigTab: React.FC<BatchConfigTabProps> = ({ template, onChange }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);

    // Generate batch history (memoized & deterministic)
    const batchHistory = useMemo(() => {
        const config = template.batch_configuration;
        if (!config) return [];

        const history: { date: string; batchNumber: string; used: boolean }[] = [];
        const now = new Date();

        for (let i = 0; i < 10; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            if (config.auto_increment) {
                const dateStr = date.toISOString().split('T')[0];
                const batchParts = {
                    prefix: config.prefix || '',
                    code: config.batch_code || '',
                    date: '',
                    number: '',
                    suffix: config.suffix || ''
                };

                const dateParts: string[] = [];
                if (config.year_format && config.year_format !== 'none') {
                    const year = config.year_format === 'YY'
                        ? date.getFullYear().toString().slice(-2)
                        : date.getFullYear().toString();
                    dateParts.push(year);
                }

                let month = '';
                if (config.month_format === 'letter') {
                    month = String.fromCharCode(65 + date.getMonth());
                } else if (config.month_format === 'MM') {
                    month = String(date.getMonth() + 1).padStart(2, '0');
                } else {
                    month = String(date.getMonth() + 1);
                }
                dateParts.push(month);

                const day = config.day_format === 'DD'
                    ? String(date.getDate()).padStart(2, '0')
                    : String(date.getDate());
                dateParts.push(day);

                batchParts.date = dateParts.join(config.separator || '');

                if (config.current_number !== undefined) {
                    const padding = config.padding || 3;
                    // Deterministic pseudo-random number for history simulation based on index
                    const historyNum = Math.max(1, (config.current_number || 1) - i);
                    batchParts.number = String(historyNum).padStart(padding, '0');
                }

                const fullBatch = [batchParts.prefix, batchParts.code, batchParts.date, batchParts.number, batchParts.suffix]
                    .filter(Boolean)
                    .join(config.separator || '');

                history.push({
                    date: dateStr,
                    batchNumber: fullBatch,
                    used: (i + (config.current_number || 0)) % 3 !== 0 // Deterministic status
                });
            }
        }

        return history;
    }, [template.batch_configuration]);

    const handleBatchChange = (field: string, value: string | number | boolean | string[]) => {
        onChange({
            batch_configuration: {
                ...template.batch_configuration,
                [field]: value,
            } as any,
        });
    };

    // Generate preview batch number (memoized)
    const preview = useMemo((): BatchPreview => {
        const config = template.batch_configuration;
        if (!config) return { full: '-', parts: {} };

        const date = testDate ? new Date(testDate) : new Date();
        const separator = config.separator || '';

        const parts: BatchPreview['parts'] = {};

        if (config.prefix) parts.prefix = config.prefix;
        if (config.batch_code) parts.code = config.batch_code;

        const dateOrder = config.date_order || ['year', 'month', 'day'];
        const dateParts: string[] = [];

        for (const part of dateOrder) {
            if (part === 'year' && config.year_format && config.year_format !== 'none') {
                const year = config.year_format === 'YY'
                    ? date.getFullYear().toString().slice(-2)
                    : date.getFullYear().toString();
                dateParts.push(year);
            } else if (part === 'month') {
                let month = '';
                if (config.month_format === 'letter') {
                    month = String.fromCharCode(65 + date.getMonth());
                } else if (config.month_format === 'MM') {
                    month = String(date.getMonth() + 1).padStart(2, '0');
                } else {
                    month = String(date.getMonth() + 1);
                }
                dateParts.push(month);
            } else if (part === 'day') {
                const day = config.day_format === 'DD'
                    ? String(date.getDate()).padStart(2, '0')
                    : String(date.getDate());
                dateParts.push(day);
            }
        }

        if (dateParts.length > 0) parts.date = dateParts.join(separator);

        if (config.auto_increment && config.current_number !== undefined) {
            const padding = config.padding || 3;
            parts.number = String(config.current_number).padStart(padding, '0');
        }

        if (config.suffix) parts.suffix = config.suffix;

        const componentOrder = config.component_order || ['code', 'date', 'number'];
        const orderedParts: string[] = [];

        if (parts.prefix) orderedParts.push(parts.prefix);

        for (const comp of componentOrder) {
            if (comp === 'code' && parts.code) orderedParts.push(parts.code);
            if (comp === 'date' && parts.date) orderedParts.push(parts.date);
            if (comp === 'number' && parts.number) orderedParts.push(parts.number);
        }

        if (parts.suffix) orderedParts.push(parts.suffix);

        const full = orderedParts.join(separator);

        return { full, parts };
    }, [template.batch_configuration, testDate]);

    const handleResetCounter = () => {
        handleBatchChange('current_number', template.batch_configuration?.start_number || 1);
    };

    const handleIncrementCounter = () => {
        const current = template.batch_configuration?.current_number || 0;
        handleBatchChange('current_number', current + 1);
    };



    return (
        <div className="space-y-6">

            {/* Enhanced Preview - Moved to Top */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <InformationCircleIcon className="w-5 h-5 text-primary-500" />
                        معاينة رقم الدُفعة (مباشر)
                    </h3>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            تاريخ الاختبار:
                        </label>
                        <input
                            type="date"
                            value={testDate}
                            onChange={(e) => setTestDate(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Full Preview */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-center transition-all duration-300 ease-in-out border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800">
                            <span className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400">
                                {preview.full}
                            </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            <p>الرمز: <strong>{template.batch_configuration?.batch_code || 'XXX'}</strong></p>
                            <p>اليوم: <strong>{testDate ? new Date(testDate).getDate() : new Date().getDate()}</strong></p>
                            <p>الشهر: <strong>{testDate ? new Date(testDate).getMonth() + 1 : new Date().getMonth() + 1}</strong></p>
                            {template.batch_configuration?.year_format && template.batch_configuration.year_format !== 'none' && (
                                <p>السنة: <strong>{testDate ? new Date(testDate).getFullYear() : new Date().getFullYear()}</strong></p>
                            )}
                            {template.batch_configuration?.auto_increment && (
                                <p>الرقم: <strong>{template.batch_configuration.current_number || 1}</strong></p>
                            )}
                        </div>
                    </div>

                    {/* Parts Breakdown */}
                    {(preview.parts.prefix || preview.parts.code || preview.parts.date || preview.parts.number || preview.parts.suffix) && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تحليل المكونات:</h4>
                            <div className="flex flex-wrap gap-2">
                                {preview.parts.prefix && (
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm">
                                        بادئة: {preview.parts.prefix}
                                    </span>
                                )}
                                {preview.parts.code && (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm">
                                        رمز: {preview.parts.code}
                                    </span>
                                )}
                                {preview.parts.date && (
                                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-sm">
                                        تاريخ: {preview.parts.date}
                                    </span>
                                )}
                                {preview.parts.number && (
                                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-sm">
                                        رقم: {preview.parts.number}
                                    </span>
                                )}
                                {preview.parts.suffix && (
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm">
                                        لاحقة: {preview.parts.suffix}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Month reference */}
                    {template.batch_configuration?.month_format === 'letter' && (
                        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                            {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((month, i) => (
                                <div
                                    key={month}
                                    className={`text-center p-2 rounded text-xs ${i === (testDate ? new Date(testDate).getMonth() : new Date().getMonth())
                                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                        }`}
                                >
                                    <div className="font-mono text-lg">{String.fromCharCode(65 + i)}</div>
                                    <div className="text-gray-500 dark:text-gray-400">{month}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Component Order Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ترتيب مكونات رمز الدفعة
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Component Order */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            ترتيب المكونات الرئيسية
                        </label>
                        <div className="space-y-2">
                            {(template.batch_configuration?.component_order || ['code', 'date', 'number']).map((item, index, arr) => (
                                <div key={item} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                if (index === 0) return;
                                                const newOrder = [...arr];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                handleBatchChange('component_order', newOrder);
                                            }}
                                            disabled={index === 0}
                                            className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30"
                                            title="تحريك لأعلى"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (index === arr.length - 1) return;
                                                const newOrder = [...arr];
                                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                                handleBatchChange('component_order', newOrder);
                                            }}
                                            disabled={index === arr.length - 1}
                                            className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30"
                                            title="تحريك لأسفل"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                    <span className={`flex-1 font-medium ${item === 'code' ? 'text-green-700 dark:text-green-400' :
                                        item === 'date' ? 'text-yellow-700 dark:text-yellow-400' :
                                            'text-purple-700 dark:text-purple-400'
                                        }`}>
                                        {item === 'code' ? '🏷️ رمز الدُفعة' :
                                            item === 'date' ? '📅 التاريخ' :
                                                '🔢 الرقم التسلسلي'}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Date Order */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            ترتيب مكونات التاريخ
                        </label>
                        <div className="space-y-2">
                            {(template.batch_configuration?.date_order || ['year', 'month', 'day']).map((item, index, arr) => (
                                <div key={item} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                if (index === 0) return;
                                                const newOrder = [...arr];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                handleBatchChange('date_order', newOrder);
                                            }}
                                            disabled={index === 0}
                                            className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30"
                                            title="تحريك لأعلى"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (index === arr.length - 1) return;
                                                const newOrder = [...arr];
                                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                                handleBatchChange('date_order', newOrder);
                                            }}
                                            disabled={index === arr.length - 1}
                                            className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30"
                                            title="تحريك لأسفل"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                    <span className={`flex-1 font-medium ${item === 'year' ? 'text-blue-700 dark:text-blue-400' :
                                        item === 'month' ? 'text-orange-700 dark:text-orange-400' :
                                            'text-teal-700 dark:text-teal-400'
                                        }`}>
                                        {item === 'year' ? '📆 السنة' :
                                            item === 'month' ? '📅 الشهر' :
                                                '📋 اليوم'}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 استخدم الأسهم لتغيير ترتيب المكونات. سيظهر التغيير في المعاينة أدناه.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    تكوين الدُفعات
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            رمز الدُفعة
                        </label>
                        <input
                            type="text"
                            value={template.batch_configuration?.batch_code || ''}
                            onChange={(e) => handleBatchChange('batch_code', e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white uppercase"
                            placeholder="BBS"
                            maxLength={5}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            حروف تميز المنتج (3-5 أحرف)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            تنسيق اليوم
                        </label>
                        <select
                            value={template.batch_configuration?.day_format || 'DD'}
                            onChange={(e) => handleBatchChange('day_format', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="D">رقم بدون صفر (5)</option>
                            <option value="DD">رقم بصفر (05)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            تنسيق الشهر
                        </label>
                        <select
                            value={template.batch_configuration?.month_format || 'letter'}
                            onChange={(e) => handleBatchChange('month_format', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="letter">حرف (A-L)</option>
                            <option value="M">رقم بدون صفر (5)</option>
                            <option value="MM">رقم بصفر (05)</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Options Toggle */}
                <div className="mt-6">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                        {showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'عرض الخيارات المتقدمة'}
                    </button>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">الخيارات المتقدمة</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    تنسيق السنة
                                </label>
                                <select
                                    value={template.batch_configuration?.year_format || 'none'}
                                    onChange={(e) => handleBatchChange('year_format', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="none">بدون سنة</option>
                                    <option value="YY">سنة مختصرة (24)</option>
                                    <option value="YYYY">سنة كاملة (2024)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    الفاصل
                                </label>
                                <input
                                    type="text"
                                    value={template.batch_configuration?.separator || ''}
                                    onChange={(e) => handleBatchChange('separator', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="-"
                                    maxLength={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    بادئة
                                </label>
                                <input
                                    type="text"
                                    value={template.batch_configuration?.prefix || ''}
                                    onChange={(e) => handleBatchChange('prefix', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="PROD-"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    لاحقة
                                </label>
                                <input
                                    type="text"
                                    value={template.batch_configuration?.suffix || ''}
                                    onChange={(e) => handleBatchChange('suffix', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="-QC"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    تكرار إعادة التعيين
                                </label>
                                <select
                                    value={template.batch_configuration?.reset_frequency || 'never'}
                                    onChange={(e) => handleBatchChange('reset_frequency', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="never">لا يتم إعادة التعيين</option>
                                    <option value="daily">يومياً</option>
                                    <option value="monthly">شهرياً</option>
                                    <option value="yearly">سنوياً</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    أرقام تلقائية
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={template.batch_configuration?.auto_increment || false}
                                        onChange={(e) => handleBatchChange('auto_increment', e.target.checked)}
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">تفعيل الترقيم التلقائي</span>
                                </div>
                            </div>

                            {template.batch_configuration?.auto_increment && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            رقم البداية
                                        </label>
                                        <input
                                            type="number"
                                            value={template.batch_configuration?.start_number || 1}
                                            onChange={(e) => handleBatchChange('start_number', parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                            min="1"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            الرقم الحالي
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={template.batch_configuration?.current_number || 1}
                                                onChange={(e) => handleBatchChange('current_number', parseInt(e.target.value) || 1)}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                                min="1"
                                            />
                                            <button
                                                onClick={handleIncrementCounter}
                                                className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                                                title="زيادة الرقم"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleResetCounter}
                                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                                title="إعادة التعيين"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            الحشو (أصفار)
                                        </label>
                                        <input
                                            type="number"
                                            value={template.batch_configuration?.padding || 3}
                                            onChange={(e) => handleBatchChange('padding', parseInt(e.target.value) || 3)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Batch History Section */}
            {
                template.batch_configuration?.auto_increment && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            سجل الدُفعات الأخيرة
                        </h3>
                        <div className="space-y-2">
                            {batchHistory.length > 0 ? (
                                batchHistory.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${item.used ? 'bg-green-500' : 'bg-gray-300'
                                                }`} />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {item.batchNumber}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {item.date}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded ${item.used
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                            {item.used ? 'مستخدم' : 'متاح'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    لا يوجد سجل دُفعات حالي
                                </div>
                            )}
                        </div>
                    </div>
                )
            }


        </div >
    );
};

export default BatchConfigTab;
