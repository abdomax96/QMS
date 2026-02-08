import React, { useState } from 'react';
import { XMarkIcon, TableCellsIcon, ListBulletIcon, BeakerIcon, CodeBracketIcon, ClipboardDocumentListIcon, BookOpenIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { Table, TableType, TableColumn, TableParameter, FormTemplate } from '../../types';
import { generateId, cn } from '../../utils';
import AdvancedFormulaBuilder from '../formula/AdvancedFormulaBuilder';

const DATE_TIME_FORMATS = {
    date: [
        { label: 'YYYY-MM-DD (Standard)', value: 'YYYY-MM-DD' },
        { label: 'DD/MM/YYYY (UK/Arab)', value: 'DD/MM/YYYY' },
        { label: 'MM/DD/YYYY (US)', value: 'MM/DD/YYYY' },
        { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
        { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
        { label: 'YYYY-MM (Month)', value: 'YYYY-MM' },
        { label: 'MM/YYYY (Month)', value: 'MM/YYYY' },
    ],
    time: [
        { label: 'HH:mm (24h)', value: 'HH:mm' },
        { label: 'hh:mm a (12h)', value: 'hh:mm a' },
        { label: 'HH:mm:ss', value: 'HH:mm:ss' },
        { label: 'mm:ss', value: 'mm:ss' },
    ],
    datetime: [
        { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' },
        { label: 'DD/MM/YYYY HH:mm', value: 'DD/MM/YYYY HH:mm' },
        { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
    ]
};

const getInputTypeForFormat = (format: string, type: string) => {
    if (!format) return type === 'datetime' ? 'datetime-local' : type;

    // Strict mapping to browser native types
    if (format === 'YYYY-MM-DD') return 'date';
    if (format === 'YYYY-MM') return 'month';
    if (format === 'HH:mm') return 'time';

    // All other formats (DD/MM/YYYY, YYYY-MM-DD HH:mm, etc.) should use text input
    // so the user can enter the limit in the EXACT format selected.
    return 'text';
};

interface TableBuilderProps {
    table?: Table;
    onSave: (table: Table) => void;
    onClose: () => void;
    template?: FormTemplate;
    customVariables?: Record<string, any>;
}

// أنواع الجداول الأساسية
const baseTableTypes: { type: TableType; label: string; description: string; icon: React.ReactNode }[] = [
    {
        type: 'parameters',
        label: 'جدول المعلمات',
        description: 'لتسجيل المعلمات مع الحدود الدنيا والقصوى',
        icon: <BeakerIcon className="w-6 h-6" />,
    },
    {
        type: 'sample',
        label: 'جدول العينات (AQL)',
        description: 'لفحص العينات وفق معايير AQL',
        icon: <ListBulletIcon className="w-6 h-6" />,
    },
    {
        type: 'custom',
        label: 'جدول مخصص',
        description: 'تخصيص الأعمدة بالكامل',
        icon: <TableCellsIcon className="w-6 h-6" />,
    },
    {
        type: 'printing_verification',
        label: 'تحقق الطباعة',
        description: 'فحص طباعة (باكو/علبة/كرتونة) بالصور',
        icon: <CodeBracketIcon className="w-6 h-6" />, // Or CameraIcon if available, but staying safe
    },
    {
        type: 'checklist',
        label: 'قائمة تحقق',
        description: 'قائمة بنود للمراجعة',
        icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
    },
    {
        type: 'recipe-traceability',
        label: 'جدول تتبع الخامات',
        description: 'تتبع باتشات الخامات للوصفة مع تواريخ الإنتاج والانتهاء',
        icon: <TruckIcon className="w-6 h-6" />,
    },
];



const TableBuilder: React.FC<TableBuilderProps> = ({ table, onSave, onClose, template, customVariables }) => {
    const [step, setStep] = useState<'type' | 'config'>(table ? 'config' : 'type');
    const [tableData, setTableData] = useState<Table>(() => table || {
        id: generateId(),
        name: '',
        type: 'parameters',
        rows: 10,
        inspection_period: 60,
        parameters: [],
        columns: [],
        features: {
            show_avg: true,
            show_std: true,
        },
    });

    // State for formula builder
    const [formulaBuilderOpen, setFormulaBuilderOpen] = useState(false);
    const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);

    const handleTypeSelect = (type: TableType) => {
        // Auto-set name for recipe-traceability table or Printing Verification
        let autoName = tableData.name;
        let initialData: Partial<Table> = {};

        if (type === 'recipe-traceability') {
            autoName = 'متابعة منطقة التحضير';
        } else if (type === 'printing_verification') {
            autoName = 'تحقق بيانات الطباعة';
            initialData = {
                rows: 1, // Only 1 row
                columns: [
                    { key: 'pako', label: 'الباكو', type: 'image' },
                    { key: 'box', label: 'العلبة', type: 'image' },
                    { key: 'carton', label: 'الكرتونة', type: 'image' }
                ]
            };
        }

        setTableData({ ...tableData, type, name: autoName, ...initialData });
        setStep('config');
    };

    const handleSave = () => {
        if (!tableData.name.trim()) {
            alert('يرجى إدخال اسم الجدول');
            return;
        }
        onSave(tableData);
    };

    const renderTypeSelector = () => {
        // عرض جميع أنواع الجداول
        const tableTypes = baseTableTypes;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableTypes.map((typeConfig) => (
                    <button
                        key={typeConfig.type}
                        onClick={() => handleTypeSelect(typeConfig.type)}
                        className={cn(
                            'p-4 text-right rounded-lg border-2 transition-all hover:shadow-md',
                            tableData.type === typeConfig.type
                                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        )}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="text-primary-600 dark:text-primary-400">
                                {typeConfig.icon}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {typeConfig.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {typeConfig.description}
                        </p>
                    </button>
                ))}
            </div>
        );
    };

    const renderParametersConfig = () => (
        <div className="space-y-4">
            {/* Parameters List */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        المعلمات
                    </label>
                    <button
                        onClick={() => {
                            const newParam: TableParameter = {
                                name: '',
                                limits: '',
                                type: 'decimal',
                                min: undefined,
                                max: undefined,
                                unit: '',
                                critical_level: 'normal',
                            };
                            setTableData({
                                ...tableData,
                                parameters: [...(tableData.parameters || []), newParam],
                            });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                    >
                        + إضافة معلمة
                    </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(tableData.parameters || []).map((param, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-12 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={param.name}
                                    onChange={(e) => {
                                        const updated = [...(tableData.parameters || [])];
                                        updated[index] = { ...param, name: e.target.value };
                                        setTableData({ ...tableData, parameters: updated });
                                    }}
                                    className="col-span-5 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="اسم المعلمة"
                                />
                                <select
                                    value={param.type || 'decimal'}
                                    onChange={(e) => {
                                        const updated = [...(tableData.parameters || [])];
                                        updated[index] = { ...param, type: e.target.value as any };
                                        setTableData({ ...tableData, parameters: updated });
                                    }}
                                    className="col-span-3 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="text">نص</option>
                                    <option value="integer">عدد صحيح</option>
                                    <option value="decimal">عدد عشري</option>
                                    <option value="date">تاريخ</option>
                                    <option value="time">وقت</option>
                                    <option value="datetime">تاريخ ووقت</option>
                                    <option value="boolean-check">✔ مقبول / ✖ مرفوض</option>
                                    <option value="boolean-yesno">نعم / لا</option>
                                    <option value="dropdown">قائمة منسدلة</option>
                                    <option value="image">صورة / ملف</option>
                                    <option value="long-text">نص طويل (ملاحظات)</option>
                                </select>
                                <input
                                    type="text"
                                    value={param.unit || ''}
                                    onChange={(e) => {
                                        const updated = [...(tableData.parameters || [])];
                                        updated[index] = { ...param, unit: e.target.value };
                                        setTableData({ ...tableData, parameters: updated });
                                    }}
                                    className="col-span-3 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="الوحدة"
                                />
                                <button
                                    onClick={() => {
                                        if (window.confirm(`هل أنت متأكد من حذف المعلمة "${param.name || 'بدون اسم'}"؟`)) {
                                            const updated = (tableData.parameters || []).filter((_, i) => i !== index);
                                            setTableData({ ...tableData, parameters: updated });
                                        }
                                    }}
                                    className="col-span-1 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="حذف"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Conditional fields based on type */}
                            {(param.type === 'integer' || param.type === 'decimal') && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        value={param.min || ''}
                                        onChange={(e) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, min: parseFloat(e.target.value) || undefined };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="الحد الأدنى"
                                        step={param.type === 'decimal' ? '0.01' : '1'}
                                    />
                                    <input
                                        type="number"
                                        value={param.max || ''}
                                        onChange={(e) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, max: parseFloat(e.target.value) || undefined };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="الحد الأقصى"
                                        step={param.type === 'decimal' ? '0.01' : '1'}
                                    />
                                    <input
                                        type="number"
                                        value={param.step || ''}
                                        onChange={(e) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, step: parseFloat(e.target.value) || undefined };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="الخطوة (Step)"
                                        step={param.type === 'decimal' ? '0.01' : '1'}
                                    />
                                </div>
                            )}

                            {param.type === 'dropdown' && (
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            id={`dropdown-param-${index}`}
                                            className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="أدخل خيار ثم اضغط Enter أو +"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const input = e.target as HTMLInputElement;
                                                    const newOption = input.value.trim();
                                                    if (newOption && !(param.options || []).includes(newOption)) {
                                                        const updated = [...(tableData.parameters || [])];
                                                        updated[index] = {
                                                            ...param,
                                                            options: [...(param.options || []), newOption]
                                                        };
                                                        setTableData({ ...tableData, parameters: updated });
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(`dropdown-param-${index}`) as HTMLInputElement;
                                                const newOption = input?.value.trim();
                                                if (newOption && !(param.options || []).includes(newOption)) {
                                                    const updated = [...(tableData.parameters || [])];
                                                    updated[index] = {
                                                        ...param,
                                                        options: [...(param.options || []), newOption]
                                                    };
                                                    setTableData({ ...tableData, parameters: updated });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                                        >
                                            +
                                        </button>
                                    </div>
                                    {(param.options || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {(param.options || []).map((opt, optIndex) => (
                                                <span
                                                    key={optIndex}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-sm rounded-full"
                                                >
                                                    {opt}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(tableData.parameters || [])];
                                                            updated[index] = {
                                                                ...param,
                                                                options: (param.options || []).filter((_, i) => i !== optIndex)
                                                            };
                                                            setTableData({ ...tableData, parameters: updated });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={param.enable_abc_logic || false}
                                            onChange={(e) => {
                                                const updated = [...(tableData.parameters || [])];
                                                const newOptions = e.target.checked && (!param.options || param.options.length === 0)
                                                    ? ['A', 'B', 'C']
                                                    : (param.options || []);

                                                updated[index] = {
                                                    ...param,
                                                    enable_abc_logic: e.target.checked,
                                                    options: newOptions
                                                };
                                                setTableData({ ...tableData, parameters: updated });
                                            }}
                                            className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label className="text-sm text-gray-700 dark:text-gray-300">
                                            تطبيق منطق التقييم (A, B, C)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {(param.type === 'date' || param.type === 'time' || param.type === 'datetime') && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">تنسيق العرض</label>
                                        <select
                                            value={param.format || ''}
                                            onChange={(e) => {
                                                const updated = [...(tableData.parameters || [])];
                                                updated[index] = { ...param, format: e.target.value };
                                                setTableData({ ...tableData, parameters: updated });
                                            }}
                                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            dir="ltr"
                                        >
                                            <option value="">اختر التنسيق...</option>
                                            {DATE_TIME_FORMATS[param.type as keyof typeof DATE_TIME_FORMATS]?.map((fmt) => (
                                                <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى</label>
                                            <input
                                                type={getInputTypeForFormat(param.format || '', param.type)}
                                                value={param.min?.toString() || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.parameters || [])];
                                                    updated[index] = { ...param, min: e.target.value || undefined };
                                                    setTableData({ ...tableData, parameters: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder={param.format}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأقصى</label>
                                            <input
                                                type={getInputTypeForFormat(param.format || '', param.type)}
                                                value={param.max?.toString() || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.parameters || [])];
                                                    updated[index] = { ...param, max: e.target.value || undefined };
                                                    setTableData({ ...tableData, parameters: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder={param.format}
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                    {param.min && param.max && param.min > param.max && (
                                        <p className="text-red-500 text-xs mt-1">الحد الأدنى يجب أن يكون أصغر من الأقصى</p>
                                    )}
                                </div>
                            )}

                            {/* Formula field for calculated parameters */}
                            {(param.type === 'integer' || param.type === 'decimal') && (
                                <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={param.is_calculated || false}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.parameters || [])];
                                                    updated[index] = {
                                                        ...param,
                                                        is_calculated: e.target.checked,
                                                        formula: e.target.checked ? param.formula || '' : undefined
                                                    };
                                                    setTableData({ ...tableData, parameters: updated });
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                معلمة محسوبة تلقائياً
                                            </span>
                                        </label>
                                        {param.is_calculated && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingParamIndex(index);
                                                    setFormulaBuilderOpen(true);
                                                }}
                                                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
                                            >
                                                🧮 منشئ المعادلات
                                            </button>
                                        )}
                                    </div>

                                    {param.is_calculated && (
                                        <div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={param.formula || ''}
                                                    onChange={(e) => {
                                                        const updated = [...(tableData.parameters || [])];
                                                        updated[index] = { ...param, formula: e.target.value };
                                                        setTableData({ ...tableData, parameters: updated });
                                                    }}
                                                    className="flex-1 px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                                    placeholder="اضغط على 'إنشاء' لاختيار المعلمات..."
                                                    dir="ltr"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingParamIndex(index);
                                                        setFormulaBuilderOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors whitespace-nowrap"
                                                >
                                                    📐 إنشاء
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                💡 اضغط على "إنشاء" لاختيار المعلمات والمتغيرات بصرياً
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.show_avg || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, show_avg: e.target.checked },
                        })}
                        className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">إظهار المتوسط</span>
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.show_std || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, show_std: e.target.checked },
                        })}
                        className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">إظهار الانحراف المعياري</span>
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    فترة الفحص (دقائق)
                </label>
                <input
                    type="number"
                    value={tableData.inspection_period || 60}
                    onChange={(e) => setTableData({ ...tableData, inspection_period: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    مجموعة ربط التوقف (اختياري)
                </label>
                <input
                    type="text"
                    value={tableData.linked_stop_group || ''}
                    onChange={(e) => setTableData({ ...tableData, linked_stop_group: e.target.value || undefined })}
                    placeholder="مثال: group1"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    الجداول التي لها نفس اسم المجموعة سيتم ربط التوقف بينها بناءً على التوقيت
                </p>
            </div>
        </div>
    );

    const renderSampleConfig = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        حجم العينة (عدد الصفوف)
                    </label>
                    <input
                        type="number"
                        value={tableData.sample_size || 20}
                        onChange={(e) => setTableData({ ...tableData, sample_size: parseInt(e.target.value) || 20 })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        فترة الفحص (بالدقائق)
                    </label>
                    <input
                        type="number"
                        value={tableData.inspection_period || 30}
                        onChange={(e) => setTableData({ ...tableData, inspection_period: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>



            {/* Statistics and Validation Features */}
            <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.calculate_tare1 || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, calculate_tare1: e.target.checked },
                        })}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">حساب Tare 1</span>
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.calculate_tare2 || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, calculate_tare2: e.target.checked },
                        })}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">حساب Tare 2</span>
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.calculate_average || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, calculate_average: e.target.checked },
                        })}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">حساب المتوسط (Average)</span>
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tableData.features?.calculate_std || false}
                        onChange={(e) => setTableData({
                            ...tableData,
                            features: { ...tableData.features, calculate_std: e.target.checked },
                        })}
                        className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">حساب الانحراف المعياري (STD)</span>
                </label>
            </div>

            {/* Max STD Configuration */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الحد الأقصى للانحراف المعياري (Max STD) - اختياري
                </label>
                <input
                    type="number"
                    value={tableData.max_std || ''}
                    onChange={(e) => setTableData({
                        ...tableData,
                        max_std: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="مثال: 0.5"
                    step="0.01"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 إذا تم تحديده، سيتم مقارنة الانحراف المعياري به وعرض تنسيق لوني للقبول/الرفض
                </p>
            </div>

            {/* Numeric Constraints */}
            <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    قيود المدخلات الرقمية
                </h4>
                <div className="space-y-3">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={tableData.number_constraints?.allow_negative !== false}
                            onChange={(e) => setTableData({
                                ...tableData,
                                number_constraints: {
                                    ...tableData.number_constraints,
                                    allow_negative: e.target.checked
                                }
                            })}
                            className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">السماح بالأرقام السالبة</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                خطوة الزيادة (Step)
                            </label>
                            <input
                                type="number"
                                value={tableData.number_constraints?.step || ''}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        step: e.target.value ? parseFloat(e.target.value) : undefined
                                    }
                                })}
                                placeholder="0.1"
                                step="0.01"
                                className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                الحد الأدنى (Min)
                            </label>
                            <input
                                type="number"
                                value={tableData.number_constraints?.min !== undefined ? tableData.number_constraints.min : ''}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        min: e.target.value ? parseFloat(e.target.value) : undefined
                                    }
                                })}
                                placeholder="0"
                                className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                الحد الأقصى (Max)
                            </label>
                            <input
                                type="number"
                                value={tableData.number_constraints?.max !== undefined ? tableData.number_constraints.max : ''}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        max: e.target.value ? parseFloat(e.target.value) : undefined
                                    }
                                })}
                                placeholder="100"
                                className="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 سيتم مسح القيم التي تخرج عن النطاق تلقائيًا وعرض إشعار خطأ
                    </p>
                </div>
            </div>
        </div>
    );

    const renderCustomConfig = () => (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        الأعمدة
                    </label>
                    <button
                        onClick={() => {
                            const newCol: TableColumn = {
                                key: `col_${Date.now()}`,
                                label: '',
                                type: 'text',
                            };
                            setTableData({
                                ...tableData,
                                columns: [...(tableData.columns || []), newCol],
                            });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                    >
                        + إضافة عمود
                    </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(tableData.columns || []).map((col, index) => (
                        <div key={col.key} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-12 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={col.label}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = { ...col, label: e.target.value };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-7 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="اسم العمود"
                                />
                                <select
                                    value={col.type}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = { ...col, type: e.target.value as any };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-4 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="text">نص</option>
                                    <option value="integer">عدد صحيح</option>
                                    <option value="decimal">عدد عشري</option>
                                    <option value="date">تاريخ</option>
                                    <option value="time">وقت</option>
                                    <option value="datetime">تاريخ ووقت</option>
                                    <option value="boolean-check">✔ مقبول / ✖ مرفوض</option>
                                    <option value="boolean-yesno">نعم / لا</option>
                                    <option value="dropdown">قائمة منسدلة</option>
                                    <option value="image">صورة / ملف</option>
                                    <option value="long-text">نص طويل (ملاحظات)</option>
                                </select>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`هل أنت متأكد من حذف العمود "${col.label || 'بدون اسم'}"؟`)) {
                                            const updated = (tableData.columns || []).filter((_, i) => i !== index);
                                            setTableData({ ...tableData, columns: updated });
                                        }
                                    }}
                                    className="col-span-1 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    title="حذف"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Conditional fields based on type */}
                            {(col.type === 'integer' || col.type === 'decimal') && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        value={col.min || ''}
                                        onChange={(e) => {
                                            const updated = [...(tableData.columns || [])];
                                            updated[index] = { ...col, min: parseFloat(e.target.value) || undefined };
                                            setTableData({ ...tableData, columns: updated });
                                        }}
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="الحد الأدنى"
                                        step={col.type === 'decimal' ? '0.01' : '1'}
                                    />
                                    <input
                                        type="number"
                                        value={col.max || ''}
                                        onChange={(e) => {
                                            const updated = [...(tableData.columns || [])];
                                            updated[index] = { ...col, max: parseFloat(e.target.value) || undefined };
                                            setTableData({ ...tableData, columns: updated });
                                        }}
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="الحد الأقصى"
                                        step={col.type === 'decimal' ? '0.01' : '1'}
                                    />
                                </div>
                            )}

                            {col.type === 'dropdown' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            id={`dropdown-input-${col.key}`}
                                            className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="أدخل خيار ثم اضغط Enter أو +"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const input = e.target as HTMLInputElement;
                                                    const newOption = input.value.trim();
                                                    if (newOption && !(col.options || []).includes(newOption)) {
                                                        const updated = [...(tableData.columns || [])];
                                                        updated[index] = {
                                                            ...col,
                                                            options: [...(col.options || []), newOption]
                                                        };
                                                        setTableData({ ...tableData, columns: updated });
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(`dropdown-input-${col.key}`) as HTMLInputElement;
                                                const newOption = input?.value.trim();
                                                if (newOption && !(col.options || []).includes(newOption)) {
                                                    const updated = [...(tableData.columns || [])];
                                                    updated[index] = {
                                                        ...col,
                                                        options: [...(col.options || []), newOption]
                                                    };
                                                    setTableData({ ...tableData, columns: updated });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                                        >
                                            +
                                        </button>
                                    </div>
                                    {(col.options || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {(col.options || []).map((opt, optIndex) => (
                                                <span
                                                    key={optIndex}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-sm rounded-full"
                                                >
                                                    {opt}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(tableData.columns || [])];
                                                            updated[index] = {
                                                                ...col,
                                                                options: (col.options || []).filter((_, i) => i !== optIndex)
                                                            };
                                                            setTableData({ ...tableData, columns: updated });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={col.enable_abc_logic || false}
                                            onChange={(e) => {
                                                const updated = [...(tableData.columns || [])];
                                                const newOptions = e.target.checked && (!col.options || col.options.length === 0)
                                                    ? ['A', 'B', 'C']
                                                    : (col.options || []);

                                                updated[index] = {
                                                    ...col,
                                                    enable_abc_logic: e.target.checked,
                                                    options: newOptions
                                                };
                                                setTableData({ ...tableData, columns: updated });
                                            }}
                                            className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label className="text-sm text-gray-700 dark:text-gray-300">
                                            تطبيق منطق التقييم (A, B, C)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {(col.type === 'date' || col.type === 'time' || col.type === 'datetime') && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">تنسيق العرض</label>
                                        <select
                                            value={col.format || ''}
                                            onChange={(e) => {
                                                const updated = [...(tableData.columns || [])];
                                                updated[index] = { ...col, format: e.target.value };
                                                setTableData({ ...tableData, columns: updated });
                                            }}
                                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            dir="ltr"
                                        >
                                            <option value="">اختر التنسيق...</option>
                                            {DATE_TIME_FORMATS[col.type as keyof typeof DATE_TIME_FORMATS]?.map((fmt) => (
                                                <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <div className="flex gap-2 mb-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى</label>
                                                <input
                                                    type={getInputTypeForFormat(col.format || '', col.type)}
                                                    value={col.min?.toString() || ''}
                                                    onChange={(e) => {
                                                        const updated = [...(tableData.columns || [])];
                                                        updated[index] = { ...col, min: e.target.value || undefined };
                                                        setTableData({ ...tableData, columns: updated });
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    placeholder={col.format}
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأقصى</label>
                                                <input
                                                    type={getInputTypeForFormat(col.format || '', col.type)}
                                                    value={col.max?.toString() || ''}
                                                    onChange={(e) => {
                                                        const updated = [...(tableData.columns || [])];
                                                        updated[index] = { ...col, max: e.target.value || undefined };
                                                        setTableData({ ...tableData, columns: updated });
                                                    }}
                                                    className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    placeholder={col.format}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                        {col.min && col.max && col.min > col.max && (
                                            <p className="text-red-500 text-xs mt-1">الحد الأدنى يجب أن يكون أصغر من الأقصى</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(col.type === 'integer' || col.type === 'decimal') && (
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى</label>
                                            <input
                                                type="number"
                                                value={col.min?.toString() || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.columns || [])];
                                                    updated[index] = { ...col, min: e.target.value || undefined };
                                                    setTableData({ ...tableData, columns: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder={col.type === 'decimal' ? '0.00' : '0'}
                                                step={col.type === 'decimal' ? '0.01' : '1'}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأقصى</label>
                                            <input
                                                type="number"
                                                value={col.max?.toString() || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.columns || [])];
                                                    updated[index] = { ...col, max: e.target.value || undefined };
                                                    setTableData({ ...tableData, columns: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder={col.type === 'decimal' ? '0.00' : '0'}
                                                step={col.type === 'decimal' ? '0.01' : '1'}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الخطوة</label>
                                            <input
                                                type="number"
                                                value={col.step?.toString() || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.columns || [])];
                                                    updated[index] = { ...col, step: parseFloat(e.target.value) || undefined };
                                                    setTableData({ ...tableData, columns: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="Step"
                                                step={col.type === 'decimal' ? '0.01' : '1'}
                                            />
                                        </div>
                                    </div>
                                    {col.min && col.max && col.min > col.max && (
                                        <p className="text-red-500 text-xs mt-1">الحد الأدنى يجب أن يكون أصغر من الأقصى</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    عدد الصفوف الابتدائي
                </label>
                <input
                    type="number"
                    value={tableData.rows || 10}
                    onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    min={1}
                />
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <input
                    type="checkbox"
                    id="allowDynamicRows"
                    checked={tableData.allowDynamicRows || false}
                    onChange={(e) => setTableData({ ...tableData, allowDynamicRows: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="allowDynamicRows" className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">السماح بإضافة وحذف الصفوف</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                        يمكن للمستخدم إضافة صفوف جديدة أو حذف صفوف موجودة أثناء إدخال البيانات
                    </span>
                </label>
            </div>
        </div>
    );

    const renderChecklistConfig = () => (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        بنود القائمة
                    </label>
                    <button
                        onClick={() => {
                            const items = tableData.items || [];
                            setTableData({
                                ...tableData,
                                items: [...items, { text: '', required: true }],
                            });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                    >
                        + إضافة بند
                    </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(tableData.items || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            <input
                                type="text"
                                value={item.text}
                                onChange={(e) => {
                                    const updated = [...(tableData.items || [])];
                                    updated[index] = { ...item, text: e.target.value };
                                    setTableData({ ...tableData, items: updated });
                                }}
                                className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                placeholder="نص البند"
                            />
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={(e) => {
                                        const updated = [...(tableData.items || [])];
                                        updated[index] = { ...item, required: e.target.checked };
                                        setTableData({ ...tableData, items: updated });
                                    }}
                                    className="rounded border-gray-300"
                                />
                                مطلوب
                            </label>
                            <button
                                onClick={() => {
                                    const updated = (tableData.items || []).filter((_, i) => i !== index);
                                    setTableData({ ...tableData, items: updated });
                                }}
                                className="text-red-600 text-sm"
                            >
                                حذف
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAICodeConfig = () => (
        <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                جداول AI تسمح بإنشاء هياكل ديناميكية مع حسابات تلقائية. قم بتعريف الأعمدة مع صيغ حسابية.
            </p>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    عدد الصفوف
                </label>
                <input
                    type="number"
                    value={tableData.rows || 10}
                    onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        الأعمدة مع الصيغ
                    </label>
                    <button
                        onClick={() => {
                            const newCol: TableColumn = {
                                key: `col_${Date.now()}`,
                                label: '',
                                type: 'decimal',
                                compute: '',
                            };
                            setTableData({
                                ...tableData,
                                columns: [...(tableData.columns || []), newCol],
                            });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                    >
                        + إضافة عمود
                    </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(tableData.columns || []).map((col, index) => (
                        <div key={col.key} className="p-2 bg-gray-50 dark:bg-gray-900 rounded space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={col.label}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = { ...col, label: e.target.value };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-2 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="اسم العمود"
                                />
                                <button
                                    onClick={() => {
                                        const updated = (tableData.columns || []).filter((_, i) => i !== index);
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="text-red-600 text-sm"
                                >
                                    حذف
                                </button>
                            </div>
                            <input
                                type="text"
                                value={col.compute || ''}
                                onChange={(e) => {
                                    const updated = [...(tableData.columns || [])];
                                    updated[index] = { ...col, compute: e.target.value };
                                    setTableData({ ...tableData, columns: updated });
                                }}
                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                placeholder="صيغة (مثل: col1 + col2)"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // تكوين جدول تتبع الخامات والوصفات
    const renderRecipeTraceabilityConfig = () => (
        <div className="space-y-4">
            {/* Product Validation */}
            {!template?.basic_info?.product_id ? (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="font-medium">يجب اختيار منتج أولاً</p>
                            <p className="text-sm">اذهب إلى "المعلومات الأساسية" واختر المنتج لعرض الوصفات والخامات</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Selected Product Info */}
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                            <span className="text-xl">✅</span>
                            <div>
                                <p className="font-medium">المنتج المختار: {template?.basic_info?.product_name || 'غير معروف'}</p>
                                <p className="text-sm">سيتم جلب الوصفات والخامات لهذا المنتج تلقائياً عند إدخال البيانات</p>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={tableData.features?.show_mixing_steps !== false}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    features: { ...tableData.features, show_mixing_steps: e.target.checked },
                                })}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">عرض خطوات الخلط</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={tableData.features?.allow_multiple_batches !== false}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    features: { ...tableData.features, allow_multiple_batches: e.target.checked },
                                })}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">السماح بأكثر من باتش للخامة</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={tableData.features?.show_expiry_warning !== false}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    features: { ...tableData.features, show_expiry_warning: e.target.checked },
                                })}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">تحذير عند قرب الانتهاء</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={tableData.features?.auto_calculate_total !== false}
                                onChange={(e) => setTableData({
                                    ...tableData,
                                    features: { ...tableData.features, auto_calculate_total: e.target.checked },
                                })}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">حساب إجمالي الكميات تلقائياً</span>
                        </label>
                    </div>

                    {/* Expiry Warning Days */}
                    {tableData.features?.show_expiry_warning && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                أيام التحذير قبل الانتهاء
                            </label>
                            <input
                                type="number"
                                value={tableData.expiry_warning_days || 30}
                                onChange={(e) => setTableData({ ...tableData, expiry_warning_days: parseInt(e.target.value) || 30 })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                min={1}
                                max={365}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                سيتم عرض تحذير للخامات التي ستنتهي صلاحيتها خلال هذه الفترة
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const renderConfigStep = () => (
        <div className="space-y-6">
            {/* Common Fields - Hide name for recipe-traceability */}
            {tableData.type !== 'recipe-traceability' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        اسم الجدول *
                    </label>
                    <input
                        type="text"
                        value={tableData.name}
                        onChange={(e) => setTableData({ ...tableData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="أدخل اسم الجدول"
                    />
                </div>
            )}

            {/* Linked Stop Group - Only for tables with time-based columns */}
            {(tableData.type === 'parameters' || tableData.type === 'sample' || tableData.type === 'custom') && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        مجموعة ربط التوقف (اختياري)
                    </label>
                    <input
                        type="text"
                        value={tableData.linked_stop_group || ''}
                        onChange={(e) => setTableData({ ...tableData, linked_stop_group: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="مثال: group1"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        💡 الجداول التي لها نفس معرف المجموعة سيتم مزامنة حالة التوقف بينها. عند إيقاف ساعة معينة في أي جدول، سيتم إيقاف نفس الساعة في جميع الجداول المربوطة.
                    </p>
                </div>
            )}

            {/* Type-specific configuration */}
            {tableData.type === 'parameters' && renderParametersConfig()}
            {tableData.type === 'sample' && renderSampleConfig()}
            {tableData.type === 'custom' && renderCustomConfig()}
            {tableData.type === 'checklist' && renderChecklistConfig()}
            {tableData.type === 'printing_verification' && renderCustomConfig()}
            {tableData.type === 'recipe-traceability' && renderRecipeTraceabilityConfig()}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {table ? 'تعديل الجدول' : 'إضافة جدول جديد'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'type' ? renderTypeSelector() : renderConfigStep()}
                </div>

                {/* Footer */}
                <div className="flex justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    {step === 'config' && !table && (
                        <button
                            onClick={() => setStep('type')}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            الرجوع
                        </button>
                    )}
                    <div className="flex gap-3 mr-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            إلغاء
                        </button>
                        {step === 'config' && (
                            <button
                                onClick={handleSave}
                                disabled={!tableData.name.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                حفظ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Formula Builder Modal */}
            {formulaBuilderOpen && editingParamIndex !== null && template && (
                <AdvancedFormulaBuilder
                    formula={(tableData.parameters || [])[editingParamIndex]?.formula || ''}
                    onChange={(newFormula) => {
                        const updated = [...(tableData.parameters || [])];
                        if (updated[editingParamIndex]) {
                            updated[editingParamIndex] = {
                                ...updated[editingParamIndex],
                                formula: newFormula
                            };
                            setTableData({ ...tableData, parameters: updated });
                        }
                    }}
                    currentTableId={tableData.id}
                    currentTableName={tableData.name || 'الجدول الحالي'}
                    currentParameters={tableData.parameters || []}
                    template={template}
                    customVariables={customVariables}
                    onClose={() => {
                        setFormulaBuilderOpen(false);
                        setEditingParamIndex(null);
                    }}
                />
            )}
        </div>
    );
};

export default TableBuilder;
