import React, { useEffect, useState } from 'react';
import { XMarkIcon, TableCellsIcon, ListBulletIcon, BeakerIcon, CodeBracketIcon, ClipboardDocumentListIcon, BookOpenIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { Table, TableType, TableColumn, TableParameter, FormTemplate, TableHeaderCell } from '../../types';
import { generateId, cn } from '../../utils';
import AdvancedFormulaBuilder from '../formula/AdvancedFormulaBuilder';
import { supabase } from '../../config/supabase';

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

const QUICK_HEADER_EXAMPLE = `الوقت|طباعة البيانات||اسم مهندس الجودة|اسم مسؤول الطباعة (علب&كرتون)|أسماء مشرفين الإنتاج|أسماء مشغلين تعبئة الخط
|مطابق|غير مطابق||||`;

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

interface MouseHeaderGridCell {
    label: string;
    colSpan: number;
    rowSpan: number;
    align: 'right' | 'center' | 'left';
    hidden: boolean;
    masterRow: number;
    masterCol: number;
}

interface DirectoryDepartment {
    id: string;
    name?: string;
    name_ar?: string;
}

interface DirectoryRole {
    id: string;
    name?: string;
    name_ar?: string;
}

interface DirectoryDepartmentRoleLink {
    department_id: string;
    role_id: string;
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
    const [quickHeaderText, setQuickHeaderText] = useState<string>('');
    const [quickHeaderError, setQuickHeaderError] = useState<string>('');
    const [easyHeaderGroups, setEasyHeaderGroups] = useState<Record<string, string>>({});
    const [easyHeaderMode, setEasyHeaderMode] = useState<'single' | 'grouped'>('grouped');
    const [easyHeaderError, setEasyHeaderError] = useState<string>('');
    const [mouseGridRows, setMouseGridRows] = useState<number>(Math.max(table?.header_rows?.length || 0, 2));
    const [mouseGrid, setMouseGrid] = useState<MouseHeaderGridCell[][]>([]);
    const [mouseSelectStart, setMouseSelectStart] = useState<{ row: number; col: number } | null>(null);
    const [mouseSelectEnd, setMouseSelectEnd] = useState<{ row: number; col: number } | null>(null);
    const [mouseSelecting, setMouseSelecting] = useState(false);
    const [mouseGridError, setMouseGridError] = useState<string>('');
    const [directoryDepartments, setDirectoryDepartments] = useState<DirectoryDepartment[]>([]);
    const [directoryRoles, setDirectoryRoles] = useState<DirectoryRole[]>([]);
    const [directoryDepartmentRoles, setDirectoryDepartmentRoles] = useState<DirectoryDepartmentRoleLink[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadUserDirectoryFilters = async () => {
            const [departmentsRes, rolesRes, departmentRolesRes] = await Promise.all([
                supabase
                    .from('departments')
                    .select('id, name, name_ar')
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('roles')
                    .select('id, name, name_ar')
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('department_roles')
                    .select('department_id, role_id'),
            ]);

            if (cancelled) return;

            if (departmentsRes.error) {
                console.error('Failed to load departments for user-directory type:', departmentsRes.error);
            } else {
                setDirectoryDepartments((departmentsRes.data as DirectoryDepartment[]) || []);
            }

            if (rolesRes.error) {
                console.error('Failed to load roles for user-directory type:', rolesRes.error);
            } else {
                setDirectoryRoles((rolesRes.data as DirectoryRole[]) || []);
            }

            if (departmentRolesRes.error) {
                console.error('Failed to load department_roles for user-directory type:', departmentRolesRes.error);
            } else {
                setDirectoryDepartmentRoles((departmentRolesRes.data as DirectoryDepartmentRoleLink[]) || []);
            }
        };

        loadUserDirectoryFilters();

        return () => {
            cancelled = true;
        };
    }, []);

    const getAvailableRolesForDepartment = (departmentId?: string) => {
        if (!departmentId) return directoryRoles;

        const linkedRoleIds = new Set(
            directoryDepartmentRoles
                .filter((link) => link.department_id === departmentId)
                .map((link) => link.role_id)
        );

        if (linkedRoleIds.size === 0) {
            return directoryRoles;
        }

        return directoryRoles.filter((role) => linkedRoleIds.has(role.id));
    };

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
                                    <option value="user-directory">دليل المستخدمين</option>
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

                            {param.type === 'user-directory' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                فلتر القسم
                                            </label>
                                            <select
                                                value={param.user_directory_department_id || ''}
                                                onChange={(e) => {
                                                    const nextDepartmentId = e.target.value;
                                                    const updated = [...(tableData.parameters || [])];

                                                    let nextRoleId = param.user_directory_role_id || '';
                                                    if (nextRoleId && nextDepartmentId) {
                                                        const allowedRoles = getAvailableRolesForDepartment(nextDepartmentId);
                                                        const isAllowed = allowedRoles.some((role) => role.id === nextRoleId);
                                                        if (!isAllowed) {
                                                            nextRoleId = '';
                                                        }
                                                    }

                                                    updated[index] = {
                                                        ...param,
                                                        user_directory_department_id: nextDepartmentId || undefined,
                                                        user_directory_role_id: nextRoleId || undefined,
                                                    };
                                                    setTableData({ ...tableData, parameters: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="">كل الأقسام</option>
                                                {directoryDepartments.map((department) => (
                                                    <option key={department.id} value={department.id}>
                                                        {department.name_ar || department.name || department.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                فلتر الدور
                                            </label>
                                            <select
                                                value={param.user_directory_role_id || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.parameters || [])];
                                                    updated[index] = {
                                                        ...param,
                                                        user_directory_role_id: e.target.value || undefined,
                                                    };
                                                    setTableData({ ...tableData, parameters: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="">كل الأدوار</option>
                                                {getAvailableRolesForDepartment(param.user_directory_department_id).map((role) => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name_ar || role.name || role.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        عند الإدخال سيظهر للمستخدم أسماء الموظفين من دليل المستخدمين حسب الفلاتر المختارة.
                                    </p>
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

    const cloneHeaderRows = (rows?: TableHeaderCell[][]): TableHeaderCell[][] =>
        (rows || []).map((row) => (row || []).map((cell) => ({ ...cell })));

    const updateHeaderRows = (updater: (rows: TableHeaderCell[][]) => TableHeaderCell[][]) => {
        const nextRows = updater(cloneHeaderRows(tableData.header_rows));
        setTableData({ ...tableData, header_rows: nextRows });
    };

    const generateHeaderRowsFromColumns = () => {
        const columns = tableData.columns || [];
        const generated: TableHeaderCell[][] =
            columns.length > 0
                ? [
                    columns.map((column) => ({
                        label: column.label || column.key,
                        col_span: 1,
                        row_span: 1,
                        align: column.align || 'center',
                    })),
                ]
                : [];

        setTableData({ ...tableData, header_rows: generated });
    };

    const parseQuickHeaderTemplate = (input: string): {
        rows: TableHeaderCell[][];
        parsedColumnCount: number;
        columnLabels: string[];
        error?: string;
    } => {
        const lines = input
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            return {
                rows: [],
                parsedColumnCount: 0,
                columnLabels: [],
                error: 'أدخل سطور الترويسة أولاً.',
            };
        }

        const matrix = lines.map((line) => line.split('|').map((cell) => cell.trim()));
        const parsedColumnCount = Math.max(...matrix.map((row) => row.length));

        if (!Number.isFinite(parsedColumnCount) || parsedColumnCount <= 0) {
            return {
                rows: [],
                parsedColumnCount: 0,
                columnLabels: [],
                error: 'صيغة الترويسة غير صالحة.',
            };
        }

        const padded = matrix.map((row) => {
            if (row.length >= parsedColumnCount) return row;
            return [...row, ...Array.from({ length: parsedColumnCount - row.length }, () => '')];
        });

        const rows: TableHeaderCell[][] = [];
        const totalRows = padded.length;

        for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
            const sourceRow = padded[rowIndex];
            const headerRow: TableHeaderCell[] = [];
            let colIndex = 0;

            while (colIndex < parsedColumnCount) {
                const label = sourceRow[colIndex];

                if (!label) {
                    colIndex += 1;
                    continue;
                }

                let colSpan = 1;
                while (
                    colIndex + colSpan < parsedColumnCount &&
                    !sourceRow[colIndex + colSpan]
                ) {
                    colSpan += 1;
                }

                let rowSpan = 1;
                for (let nextRow = rowIndex + 1; nextRow < totalRows; nextRow += 1) {
                    let canExtend = true;
                    for (let c = colIndex; c < colIndex + colSpan; c += 1) {
                        if ((padded[nextRow]?.[c] || '').length > 0) {
                            canExtend = false;
                            break;
                        }
                    }
                    if (!canExtend) break;
                    rowSpan += 1;
                }

                headerRow.push({
                    label,
                    col_span: colSpan,
                    row_span: rowSpan,
                    align: 'center',
                });

                colIndex += colSpan;
            }

            if (headerRow.length > 0) {
                rows.push(headerRow);
            }
        }

        if (rows.length === 0) {
            return {
                rows: [],
                parsedColumnCount,
                columnLabels: [],
                error: 'لم يتم العثور على خلايا عنوان صالحة. تأكد من كتابة نص داخل الخلايا.',
            };
        }

        const columnLabels = Array.from({ length: parsedColumnCount }).map((_, c) => {
            for (let r = padded.length - 1; r >= 0; r -= 1) {
                const token = (padded[r]?.[c] || '').trim();
                if (token) return token;
            }
            return `عمود ${c + 1}`;
        });

        return { rows, parsedColumnCount, columnLabels };
    };

    const applyQuickHeaderTemplate = () => {
        const parsed = parseQuickHeaderTemplate(quickHeaderText);
        if (parsed.error) {
            setQuickHeaderError(parsed.error);
            return;
        }

        const existingColumns = tableData.columns || [];
        let nextColumns = [...existingColumns];
        let nextHeaderRows = parsed.rows;

        if (parsed.parsedColumnCount > existingColumns.length) {
            const extraColumns = Array.from({
                length: parsed.parsedColumnCount - existingColumns.length,
            }).map((_, idx) => {
                const absoluteIndex = existingColumns.length + idx;
                return {
                    key: `col_${Date.now()}_${absoluteIndex}`,
                    label: parsed.columnLabels[absoluteIndex] || `عمود ${absoluteIndex + 1}`,
                    type: 'text' as const,
                    align: 'center' as const,
                    width: 140,
                };
            });
            nextColumns = [...existingColumns, ...extraColumns];
        } else if (parsed.parsedColumnCount < existingColumns.length) {
            const extraCount = existingColumns.length - parsed.parsedColumnCount;
            const firstRow = [...(nextHeaderRows[0] || [])];
            for (let i = 0; i < extraCount; i += 1) {
                const sourceCol = existingColumns[parsed.parsedColumnCount + i];
                firstRow.push({
                    label: sourceCol?.label || sourceCol?.key || `عمود ${parsed.parsedColumnCount + i + 1}`,
                    col_span: 1,
                    row_span: Math.max(nextHeaderRows.length, 1),
                    align: sourceCol?.align || 'center',
                });
            }
            nextHeaderRows = nextHeaderRows.length > 0
                ? [firstRow, ...nextHeaderRows.slice(1)]
                : [firstRow];
        }

        setQuickHeaderError('');
        setTableData({
            ...tableData,
            columns: nextColumns,
            header_rows: nextHeaderRows,
        });
    };

    const applyEasyHeaderBuilder = () => {
        const columns = tableData.columns || [];
        if (columns.length === 0) {
            setEasyHeaderError('أضف الأعمدة أولاً ثم استخدم الطريقة السهلة.');
            return;
        }

        if (easyHeaderMode === 'single') {
            setEasyHeaderError('');
            setTableData({
                ...tableData,
                header_rows: [
                    columns.map((column) => ({
                        label: column.label || column.key,
                        col_span: 1,
                        row_span: 1,
                        align: column.align || 'center',
                    })),
                ],
            });
            return;
        }

        const topRow: TableHeaderCell[] = [];
        const secondRow: TableHeaderCell[] = [];
        let index = 0;

        while (index < columns.length) {
            const currentColumn = columns[index];
            const currentGroup = (easyHeaderGroups[currentColumn.key] || '').trim();

            if (!currentGroup) {
                topRow.push({
                    label: currentColumn.label || currentColumn.key,
                    col_span: 1,
                    row_span: 2,
                    align: currentColumn.align || 'center',
                });
                index += 1;
                continue;
            }

            let span = 1;
            while (index + span < columns.length) {
                const nextGroup = (easyHeaderGroups[columns[index + span].key] || '').trim();
                if (nextGroup !== currentGroup) break;
                span += 1;
            }

            topRow.push({
                label: currentGroup,
                col_span: span,
                row_span: 1,
                align: 'center',
            });

            for (let offset = 0; offset < span; offset += 1) {
                const groupedColumn = columns[index + offset];
                secondRow.push({
                    label: groupedColumn.label || groupedColumn.key,
                    col_span: 1,
                    row_span: 1,
                    align: groupedColumn.align || 'center',
                });
            }

            index += span;
        }

        const rows = secondRow.length > 0 ? [topRow, secondRow] : [topRow];
        setEasyHeaderError('');
        setTableData({
            ...tableData,
            header_rows: rows,
        });
    };

    const createStandaloneMouseCell = (
        row: number,
        col: number,
        label = '',
        align: 'right' | 'center' | 'left' = 'center'
    ): MouseHeaderGridCell => ({
        label,
        colSpan: 1,
        rowSpan: 1,
        align,
        hidden: false,
        masterRow: row,
        masterCol: col,
    });

    const cloneMouseGrid = (grid: MouseHeaderGridCell[][]): MouseHeaderGridCell[][] =>
        grid.map((row) => row.map((cell) => ({ ...cell })));

    const buildMouseGridFromHeaderRows = (
        rowsCount: number,
        columns: TableColumn[],
        headerRows?: TableHeaderCell[][]
    ): MouseHeaderGridCell[][] => {
        const safeRows = Math.max(rowsCount, 1);
        const colCount = columns.length;
        if (colCount === 0) return [];

        const grid: MouseHeaderGridCell[][] = Array.from({ length: safeRows }, (_, rowIndex) =>
            Array.from({ length: colCount }, (_, colIndex) =>
                createStandaloneMouseCell(rowIndex, colIndex, '', columns[colIndex]?.align || 'center')
            )
        );

        if (!headerRows || headerRows.length === 0) {
            const lastRowIndex = safeRows - 1;
            for (let col = 0; col < colCount; col += 1) {
                grid[lastRowIndex][col].label = columns[col]?.label || columns[col]?.key || `عمود ${col + 1}`;
            }
            return grid;
        }

        const maxRowsToApply = Math.min(headerRows.length, safeRows);
        for (let rowIndex = 0; rowIndex < maxRowsToApply; rowIndex += 1) {
            const rowCells = headerRows[rowIndex] || [];
            let colCursor = 0;

            for (const rowCell of rowCells) {
                while (colCursor < colCount && grid[rowIndex][colCursor].hidden) {
                    colCursor += 1;
                }
                if (colCursor >= colCount) break;

                const colSpan = Math.max(1, Math.min(rowCell.col_span || 1, colCount - colCursor));
                const rowSpan = Math.max(1, Math.min(rowCell.row_span || 1, safeRows - rowIndex));
                const align = rowCell.align || columns[colCursor]?.align || 'center';

                grid[rowIndex][colCursor] = {
                    label: rowCell.label || '',
                    colSpan,
                    rowSpan,
                    align,
                    hidden: false,
                    masterRow: rowIndex,
                    masterCol: colCursor,
                };

                for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
                    for (let c = colCursor; c < colCursor + colSpan; c += 1) {
                        if (r === rowIndex && c === colCursor) continue;
                        grid[r][c] = {
                            ...grid[r][c],
                            label: '',
                            colSpan: 1,
                            rowSpan: 1,
                            hidden: true,
                            masterRow: rowIndex,
                            masterCol: colCursor,
                        };
                    }
                }

                colCursor += colSpan;
            }
        }

        const lastRowIndex = safeRows - 1;
        for (let col = 0; col < colCount; col += 1) {
            const cell = grid[lastRowIndex][col];
            if (!cell.hidden && !cell.label) {
                cell.label = columns[col]?.label || columns[col]?.key || `عمود ${col + 1}`;
            }
        }

        return grid;
    };

    const convertMouseGridToHeaderRows = (grid: MouseHeaderGridCell[][]): TableHeaderCell[][] =>
        grid
            .map((row) =>
                row
                    .filter((cell) => !cell.hidden)
                    .map((cell) => ({
                        label: cell.label || '',
                        col_span: cell.colSpan,
                        row_span: cell.rowSpan,
                        align: cell.align,
                    }))
            )
            .filter((row) => row.length > 0);

    const getMouseSelectionRect = () => {
        if (!mouseSelectStart || !mouseSelectEnd) return null;
        return {
            rowStart: Math.min(mouseSelectStart.row, mouseSelectEnd.row),
            rowEnd: Math.max(mouseSelectStart.row, mouseSelectEnd.row),
            colStart: Math.min(mouseSelectStart.col, mouseSelectEnd.col),
            colEnd: Math.max(mouseSelectStart.col, mouseSelectEnd.col),
        };
    };

    const reloadMouseGridFromCurrentHeader = (rowsOverride?: number) => {
        const columns = tableData.columns || [];
        if (columns.length === 0) {
            setMouseGrid([]);
            setMouseSelectStart(null);
            setMouseSelectEnd(null);
            return;
        }

        const targetRows = Math.max(rowsOverride ?? mouseGridRows, tableData.header_rows?.length || 0, 1);
        setMouseGridRows(targetRows);
        setMouseGrid(buildMouseGridFromHeaderRows(targetRows, columns, tableData.header_rows));
        setMouseGridError('');
        setMouseSelectStart(null);
        setMouseSelectEnd(null);
    };

    const resizeMouseGridRows = (nextRows: number) => {
        const columns = tableData.columns || [];
        if (columns.length === 0) return;

        const safeRows = Math.max(nextRows, 1);
        const currentAsHeaderRows = convertMouseGridToHeaderRows(mouseGrid);
        setMouseGridRows(safeRows);
        setMouseGrid(buildMouseGridFromHeaderRows(safeRows, columns, currentAsHeaderRows));
        setMouseSelectStart(null);
        setMouseSelectEnd(null);
        setMouseGridError('');
    };

    const mergeMouseSelectedArea = () => {
        const rect = getMouseSelectionRect();
        if (!rect || mouseGrid.length === 0) {
            setMouseGridError('حدّد مساحة أولاً بالماوس.');
            return;
        }

        const { rowStart, rowEnd, colStart, colEnd } = rect;
        const seenMasters = new Set<string>();

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let col = colStart; col <= colEnd; col += 1) {
                const cell = mouseGrid[row][col];
                const masterKey = `${cell.masterRow}:${cell.masterCol}`;
                if (seenMasters.has(masterKey)) continue;
                seenMasters.add(masterKey);

                const master = mouseGrid[cell.masterRow][cell.masterCol];
                const masterRowEnd = cell.masterRow + master.rowSpan - 1;
                const masterColEnd = cell.masterCol + master.colSpan - 1;

                if (
                    cell.masterRow < rowStart ||
                    cell.masterCol < colStart ||
                    masterRowEnd > rowEnd ||
                    masterColEnd > colEnd
                ) {
                    setMouseGridError('التحديد يحتوي على خلية مدمجة جزئيًا. فك الدمج أولاً أو حدّدها كاملة.');
                    return;
                }
            }
        }

        const next = cloneMouseGrid(mouseGrid);
        const anchorSource = mouseGrid[rowStart][colStart];
        const anchorMaster = mouseGrid[anchorSource.masterRow][anchorSource.masterCol];
        const mergedAlign = anchorMaster.align || 'center';
        const mergedLabel = anchorMaster.label || '';

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let col = colStart; col <= colEnd; col += 1) {
                next[row][col] = createStandaloneMouseCell(
                    row,
                    col,
                    '',
                    tableData.columns?.[col]?.align || 'center'
                );
            }
        }

        next[rowStart][colStart] = {
            label: mergedLabel,
            colSpan: colEnd - colStart + 1,
            rowSpan: rowEnd - rowStart + 1,
            align: mergedAlign,
            hidden: false,
            masterRow: rowStart,
            masterCol: colStart,
        };

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let col = colStart; col <= colEnd; col += 1) {
                if (row === rowStart && col === colStart) continue;
                next[row][col] = {
                    ...next[row][col],
                    hidden: true,
                    masterRow: rowStart,
                    masterCol: colStart,
                };
            }
        }

        setMouseGrid(next);
        setMouseGridError('');
        setMouseSelectStart({ row: rowStart, col: colStart });
        setMouseSelectEnd({ row: rowEnd, col: colEnd });
    };

    const splitMouseSelectedCell = () => {
        if (!mouseSelectStart || mouseGrid.length === 0) {
            setMouseGridError('اختر خلية أولاً.');
            return;
        }

        const source = mouseGrid[mouseSelectStart.row][mouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const master = mouseGrid[masterRow][masterCol];

        if (master.colSpan === 1 && master.rowSpan === 1) {
            setMouseGridError('الخلية المحددة غير مدمجة.');
            return;
        }

        const next = cloneMouseGrid(mouseGrid);
        for (let row = masterRow; row < masterRow + master.rowSpan; row += 1) {
            for (let col = masterCol; col < masterCol + master.colSpan; col += 1) {
                next[row][col] = createStandaloneMouseCell(
                    row,
                    col,
                    row === masterRow && col === masterCol ? master.label : '',
                    tableData.columns?.[col]?.align || master.align || 'center'
                );
            }
        }

        setMouseGrid(next);
        setMouseGridError('');
        setMouseSelectStart({ row: masterRow, col: masterCol });
        setMouseSelectEnd({ row: masterRow, col: masterCol });
    };

    const updateMouseSelectedMasterLabel = (value: string) => {
        if (!mouseSelectStart || mouseGrid.length === 0) return;
        const source = mouseGrid[mouseSelectStart.row][mouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(mouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            label: value,
        };
        setMouseGrid(next);
    };

    const applyMouseGridHeader = () => {
        if (!mouseGrid.length) {
            setMouseGridError('لا يوجد مخطط لتطبيقه.');
            return;
        }

        setTableData({
            ...tableData,
            header_rows: convertMouseGridToHeaderRows(mouseGrid),
        });
        setMouseGridError('');
    };

    useEffect(() => {
        const stopMouseSelection = () => setMouseSelecting(false);
        window.addEventListener('mouseup', stopMouseSelection);
        return () => window.removeEventListener('mouseup', stopMouseSelection);
    }, []);

    useEffect(() => {
        const columns = tableData.columns || [];
        if (columns.length === 0) {
            setMouseGrid([]);
            setMouseSelectStart(null);
            setMouseSelectEnd(null);
            return;
        }

        if (mouseGrid.length === 0 || mouseGrid[0]?.length !== columns.length) {
            const targetRows = Math.max(mouseGridRows, tableData.header_rows?.length || 2);
            setMouseGridRows(targetRows);
            setMouseGrid(buildMouseGridFromHeaderRows(targetRows, columns, tableData.header_rows));
        }
    }, [tableData.columns, tableData.header_rows]);

    const getPreviewAlignClass = (align?: 'right' | 'center' | 'left') => {
        if (align === 'left') return 'text-left';
        if (align === 'right') return 'text-right';
        return 'text-center';
    };

    const getPreviewCellValue = (column: TableColumn, rowIndex: number) => {
        switch (column.type) {
            case 'integer':
                return String((rowIndex + 1) * 10);
            case 'decimal':
                return ((rowIndex + 1) * 1.25).toFixed(2);
            case 'date':
                return `2026-02-0${Math.min(rowIndex + 1, 9)}`;
            case 'time':
                return `${String(8 + rowIndex).padStart(2, '0')}:30`;
            case 'datetime':
                return `2026-02-0${Math.min(rowIndex + 1, 9)} 08:30`;
            case 'boolean-check':
                return rowIndex % 2 === 0 ? '✓' : '✗';
            case 'boolean-yesno':
                return rowIndex % 2 === 0 ? 'نعم' : 'لا';
            case 'dropdown':
                return column.options?.[0] || 'A';
            case 'user-directory':
                return 'موظف من الدليل';
            case 'image':
                return 'صورة';
            case 'long-text':
                return 'ملاحظات توضيحية...';
            default:
                return `قيمة ${rowIndex + 1}`;
        }
    };

    const renderCustomLivePreview = () => {
        const columns = tableData.columns || [];
        const headerRows = tableData.header_rows || [];
        const hasCustomHeaderRows = headerRows.length > 0;
        const showRowNumbers = tableData.show_row_numbers !== false;
        const rowHeaderLabel = tableData.row_header_label || '#';
        const previewRowsCount = Math.min(Math.max(tableData.rows || 3, 1), 4);

        if (columns.length === 0) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    أضف أعمدة لرؤية المعاينة الفورية للجدول.
                </div>
            );
        }

        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    معاينة فورية
                </div>
                <div className="overflow-x-auto">
                    <table className="border-collapse table-fixed" style={{ minWidth: 'max-content' }}>
                        <colgroup>
                            {showRowNumbers && <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />}
                            {columns.map((column) => {
                                const width = column.width || 140;
                                return (
                                    <col
                                        key={`preview-col-${column.key}`}
                                        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
                                    />
                                );
                            })}
                        </colgroup>
                        <thead>
                            {hasCustomHeaderRows ? (
                                headerRows.map((headerRow, headerRowIndex) => (
                                    <tr key={`preview-header-row-${headerRowIndex}`} className="bg-gray-100 dark:bg-gray-700">
                                        {showRowNumbers && headerRowIndex === 0 && (
                                            <th
                                                rowSpan={headerRows.length}
                                                className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-center"
                                            >
                                                {rowHeaderLabel}
                                            </th>
                                        )}
                                        {headerRow.map((cell, cellIndex) => (
                                            <th
                                                key={`preview-header-cell-${headerRowIndex}-${cellIndex}`}
                                                colSpan={cell.col_span || 1}
                                                rowSpan={cell.row_span || 1}
                                                className={cn(
                                                    'border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium',
                                                    getPreviewAlignClass(cell.align),
                                                    cell.class_name
                                                )}
                                                style={{
                                                    backgroundColor: cell.background_color || undefined,
                                                    color: cell.text_color || undefined,
                                                }}
                                            >
                                                {cell.label || '...'}
                                            </th>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    {showRowNumbers && (
                                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-center">
                                            {rowHeaderLabel}
                                        </th>
                                    )}
                                    {columns.map((column) => (
                                        <th
                                            key={`preview-header-${column.key}`}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium',
                                                getPreviewAlignClass(column.align)
                                            )}
                                        >
                                            {column.label || column.key}
                                        </th>
                                    ))}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {Array.from({ length: previewRowsCount }).map((_, rowIndex) => (
                                <tr key={`preview-row-${rowIndex}`} className="bg-white dark:bg-gray-800">
                                    {showRowNumbers && (
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-center text-gray-500">
                                            {rowIndex + 1}
                                        </td>
                                    )}
                                    {columns.map((column) => (
                                        <td
                                            key={`preview-cell-${rowIndex}-${column.key}`}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-gray-700 dark:text-gray-200',
                                                getPreviewAlignClass(column.align)
                                            )}
                                        >
                                            {getPreviewCellValue(column, rowIndex)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCustomConfig = () => {
        const selectionRect = getMouseSelectionRect();
        const selectedMouseMaster = (() => {
            if (!mouseSelectStart || mouseGrid.length === 0) return null;
            const source = mouseGrid[mouseSelectStart.row]?.[mouseSelectStart.col];
            if (!source) return null;
            return mouseGrid[source.masterRow]?.[source.masterCol] || null;
        })();

        return (
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
                                    className="col-span-5 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
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
                                    <option value="user-directory">دليل المستخدمين</option>
                                    <option value="image">صورة / ملف</option>
                                    <option value="long-text">نص طويل (ملاحظات)</option>
                                </select>
                                <select
                                    value={col.align || 'center'}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = { ...col, align: e.target.value as 'right' | 'center' | 'left' };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-2 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    title="محاذاة النص"
                                >
                                    <option value="right">يمين</option>
                                    <option value="center">وسط</option>
                                    <option value="left">يسار</option>
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

                            <div className="grid grid-cols-12 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={col.key}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = { ...col, key: e.target.value };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-5 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="المفتاح (key)"
                                    dir="ltr"
                                />
                                <input
                                    type="number"
                                    min={60}
                                    value={col.width || ''}
                                    onChange={(e) => {
                                        const updated = [...(tableData.columns || [])];
                                        updated[index] = {
                                            ...col,
                                            width: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                        };
                                        setTableData({ ...tableData, columns: updated });
                                    }}
                                    className="col-span-3 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="عرض px"
                                />
                                <label className="col-span-4 inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={col.required || false}
                                        onChange={(e) => {
                                            const updated = [...(tableData.columns || [])];
                                            updated[index] = { ...col, required: e.target.checked };
                                            setTableData({ ...tableData, columns: updated });
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    حقل إلزامي
                                </label>
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

                            {col.type === 'user-directory' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                فلتر القسم
                                            </label>
                                            <select
                                                value={col.user_directory_department_id || ''}
                                                onChange={(e) => {
                                                    const nextDepartmentId = e.target.value;
                                                    const updated = [...(tableData.columns || [])];

                                                    let nextRoleId = col.user_directory_role_id || '';
                                                    if (nextRoleId && nextDepartmentId) {
                                                        const allowedRoles = getAvailableRolesForDepartment(nextDepartmentId);
                                                        const isAllowed = allowedRoles.some((role) => role.id === nextRoleId);
                                                        if (!isAllowed) {
                                                            nextRoleId = '';
                                                        }
                                                    }

                                                    updated[index] = {
                                                        ...col,
                                                        user_directory_department_id: nextDepartmentId || undefined,
                                                        user_directory_role_id: nextRoleId || undefined,
                                                    };
                                                    setTableData({ ...tableData, columns: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="">كل الأقسام</option>
                                                {directoryDepartments.map((department) => (
                                                    <option key={department.id} value={department.id}>
                                                        {department.name_ar || department.name || department.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                فلتر الدور
                                            </label>
                                            <select
                                                value={col.user_directory_role_id || ''}
                                                onChange={(e) => {
                                                    const updated = [...(tableData.columns || [])];
                                                    updated[index] = {
                                                        ...col,
                                                        user_directory_role_id: e.target.value || undefined,
                                                    };
                                                    setTableData({ ...tableData, columns: updated });
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="">كل الأدوار</option>
                                                {getAvailableRolesForDepartment(col.user_directory_department_id).map((role) => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name_ar || role.name || role.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        ستظهر قائمة أسماء الموظفين للمستخدم النهائي بناءً على الفلاتر أعلاه.
                                    </p>
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

            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">رأس جدول متعدد الصفوف</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            يدعم دمج الخلايا (col span / row span) لإنشاء رؤوس جداول معقدة مثل النماذج الورقية.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={generateHeaderRowsFromColumns}
                            className="px-2 py-1 text-xs border border-primary-300 text-primary-700 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        >
                            توليد من الأعمدة
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                updateHeaderRows((rows) => [
                                    ...rows,
                                    [{ label: '', col_span: 1, row_span: 1, align: 'center' }],
                                ])
                            }
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            + صف عنوان
                        </button>
                    </div>
                </div>

                <div className="rounded-md border border-primary-200 dark:border-primary-800 p-3 bg-primary-50/50 dark:bg-primary-900/20 space-y-3">
                    <div>
                        <h5 className="text-xs font-semibold text-primary-800 dark:text-primary-300">طريقة سهلة جدًا (جديدة)</h5>
                        <p className="text-[11px] text-primary-700/90 dark:text-primary-300/90">
                            لا تحتاج دمج يدوي. فقط حدّد مجموعة لكل عمود ثم اضغط تطبيق.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setEasyHeaderMode('grouped')}
                            className={cn(
                                'px-2 py-1.5 text-xs rounded border',
                                easyHeaderMode === 'grouped'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                        >
                            صفّين مع مجموعات
                        </button>
                        <button
                            type="button"
                            onClick={() => setEasyHeaderMode('single')}
                            className={cn(
                                'px-2 py-1.5 text-xs rounded border',
                                easyHeaderMode === 'single'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                        >
                            صف واحد فقط
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setEasyHeaderGroups({});
                                setEasyHeaderError('');
                            }}
                            className="px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            مسح أسماء المجموعات
                        </button>
                    </div>

                    {easyHeaderMode === 'grouped' && (
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {(tableData.columns || []).map((column) => (
                                <div key={`easy-group-${column.key}`} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5 text-xs text-gray-700 dark:text-gray-300 truncate">
                                        {column.label || column.key}
                                    </div>
                                    <input
                                        type="text"
                                        value={easyHeaderGroups[column.key] || ''}
                                        onChange={(e) => {
                                            setEasyHeaderGroups((prev) => ({ ...prev, [column.key]: e.target.value }));
                                            if (easyHeaderError) setEasyHeaderError('');
                                        }}
                                        className="col-span-7 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="اسم المجموعة (اختياري)"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {easyHeaderError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{easyHeaderError}</p>
                    )}

                    <button
                        type="button"
                        onClick={applyEasyHeaderBuilder}
                        className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                        تطبيق الطريقة السهلة
                    </button>
                </div>

                <div className="rounded-md border border-emerald-200 dark:border-emerald-800 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 space-y-3">
                    <div>
                        <h5 className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">بناء بالماوس (تحديد صفوف/أعمدة)</h5>
                        <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90">
                            اسحب بالماوس لتحديد مستطيل ثم اختر دمج/فك دمج. بهذه الطريقة تبني الترويسة بصريًا.
                        </p>
                    </div>

                    {(tableData.columns || []).length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            أضف أعمدة أولًا لتفعيل البناء بالماوس.
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => resizeMouseGridRows(mouseGridRows - 1)}
                                    disabled={mouseGridRows <= 1}
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    - صف عنوان
                                </button>
                                <span className="text-xs text-gray-700 dark:text-gray-300">عدد صفوف العنوان: {mouseGridRows}</span>
                                <button
                                    type="button"
                                    onClick={() => resizeMouseGridRows(mouseGridRows + 1)}
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    + صف عنوان
                                </button>

                                <button
                                    type="button"
                                    onClick={() => reloadMouseGridFromCurrentHeader()}
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    تحميل من الحالي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMouseSelectStart(null);
                                        setMouseSelectEnd(null);
                                        setMouseGridError('');
                                    }}
                                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    إلغاء التحديد
                                </button>
                                <button
                                    type="button"
                                    onClick={mergeMouseSelectedArea}
                                    className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                    دمج التحديد
                                </button>
                                <button
                                    type="button"
                                    onClick={splitMouseSelectedCell}
                                    className="px-2 py-1 text-xs border border-amber-300 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                >
                                    فك دمج
                                </button>
                                <button
                                    type="button"
                                    onClick={applyMouseGridHeader}
                                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                                >
                                    تطبيق على الترويسة
                                </button>
                            </div>

                            {selectedMouseMaster && (
                                <div className="grid grid-cols-12 gap-2 items-center">
                                    <label className="col-span-3 text-xs text-gray-700 dark:text-gray-300">عنوان الخلية المحددة</label>
                                    <input
                                        type="text"
                                        value={selectedMouseMaster.label || ''}
                                        onChange={(e) => updateMouseSelectedMasterLabel(e.target.value)}
                                        className="col-span-9 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="اكتب عنوان الخلية"
                                    />
                                </div>
                            )}

                            {mouseGridError && (
                                <p className="text-xs text-red-600 dark:text-red-400">{mouseGridError}</p>
                            )}

                            <div className="overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                <div className="inline-block min-w-full p-2 select-none">
                                    {mouseGrid.map((row, rowIndex) => (
                                        <div
                                            key={`mouse-grid-row-${rowIndex}`}
                                            className="grid"
                                            style={{
                                                gridTemplateColumns: `repeat(${(tableData.columns || []).length}, minmax(120px, 1fr))`,
                                            }}
                                        >
                                            {row.map((cell, colIndex) => {
                                                const isSelected = !!selectionRect
                                                    && rowIndex >= selectionRect.rowStart
                                                    && rowIndex <= selectionRect.rowEnd
                                                    && colIndex >= selectionRect.colStart
                                                    && colIndex <= selectionRect.colEnd;
                                                const isMaster = !cell.hidden;
                                                const masterCell = mouseGrid[cell.masterRow]?.[cell.masterCol];
                                                const mergeBadge = masterCell && (masterCell.colSpan > 1 || masterCell.rowSpan > 1)
                                                    ? `${masterCell.colSpan}x${masterCell.rowSpan}`
                                                    : '';

                                                return (
                                                    <div
                                                        key={`mouse-grid-cell-${rowIndex}-${colIndex}`}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setMouseSelecting(true);
                                                            setMouseSelectStart({ row: rowIndex, col: colIndex });
                                                            setMouseSelectEnd({ row: rowIndex, col: colIndex });
                                                            setMouseGridError('');
                                                        }}
                                                        onMouseEnter={() => {
                                                            if (!mouseSelecting) return;
                                                            setMouseSelectEnd({ row: rowIndex, col: colIndex });
                                                        }}
                                                        onMouseUp={() => setMouseSelecting(false)}
                                                        className={cn(
                                                            'min-h-[56px] border p-1.5 text-xs cursor-cell transition-colors',
                                                            isSelected
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400'
                                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                                                            cell.hidden && 'bg-gray-100 dark:bg-gray-800/40 text-gray-400'
                                                        )}
                                                        title={`صف ${rowIndex + 1} - عمود ${colIndex + 1}`}
                                                    >
                                                        {isMaster ? (
                                                            <div className="h-full flex flex-col justify-between gap-1">
                                                                <div className="font-semibold text-gray-700 dark:text-gray-200 truncate">
                                                                    {cell.label || '...'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                    {mergeBadge || `1x1`}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-[10px]">
                                                                تابع ({cell.masterRow + 1},{cell.masterCol + 1})
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 p-3 bg-white/70 dark:bg-gray-800/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">مصمم سريع للترويسة</h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                اكتب كل صف في سطر، وافصل الخلايا بـ <span dir="ltr">|</span>. اترك خلية فارغة لإنشاء الدمج تلقائيًا.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setQuickHeaderText(QUICK_HEADER_EXAMPLE);
                                setQuickHeaderError('');
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            إدراج مثال
                        </button>
                    </div>

                    <textarea
                        value={quickHeaderText}
                        onChange={(e) => {
                            setQuickHeaderText(e.target.value);
                            if (quickHeaderError) setQuickHeaderError('');
                        }}
                        className="w-full min-h-[90px] px-2 py-2 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                        placeholder="الوقت|طباعة البيانات||اسم مهندس الجودة
|مطابق|غير مطابق|"
                        dir="rtl"
                    />

                    {quickHeaderError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{quickHeaderError}</p>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={applyQuickHeaderTemplate}
                            className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                            توليد الترويسة تلقائيًا
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setQuickHeaderText('');
                                setQuickHeaderError('');
                            }}
                            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            مسح
                        </button>
                    </div>
                </div>

                {(!tableData.header_rows || tableData.header_rows.length === 0) ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        لم يتم تعريف رأس مخصص بعد. يمكنك بناء الرأس يدويًا أو توليده من الأعمدة الحالية.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {(tableData.header_rows || []).map((row, rowIndex) => (
                            <div key={rowIndex} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-2 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">صف عنوان {rowIndex + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateHeaderRows((rows) => {
                                                    const nextRows = [...rows];
                                                    const targetRow = [...(nextRows[rowIndex] || [])];
                                                    targetRow.push({ label: '', col_span: 1, row_span: 1, align: 'center' });
                                                    nextRows[rowIndex] = targetRow;
                                                    return nextRows;
                                                })
                                            }
                                            className="px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            + خلية
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateHeaderRows((rows) => rows.filter((_, index) => index !== rowIndex))
                                            }
                                            className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            حذف الصف
                                        </button>
                                    </div>
                                </div>

                                {(row || []).map((cell, cellIndex) => (
                                    <div key={cellIndex} className="space-y-1.5">
                                        <div className="grid grid-cols-12 gap-2">
                                            <input
                                                type="text"
                                                value={cell.label || ''}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = { ...targetRow[cellIndex], label: e.target.value };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-5 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="عنوان الخلية"
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                value={cell.col_span || 1}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = {
                                                            ...targetRow[cellIndex],
                                                            col_span: Math.max(1, parseInt(e.target.value || '1', 10)),
                                                        };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-2 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                title="عدد الأعمدة المدمجة"
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                value={cell.row_span || 1}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = {
                                                            ...targetRow[cellIndex],
                                                            row_span: Math.max(1, parseInt(e.target.value || '1', 10)),
                                                        };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-2 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                                title="عدد الصفوف المدمجة"
                                            />
                                            <select
                                                value={cell.align || 'center'}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = {
                                                            ...targetRow[cellIndex],
                                                            align: e.target.value as 'right' | 'center' | 'left',
                                                        };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-2 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="right">يمين</option>
                                                <option value="center">وسط</option>
                                                <option value="left">يسار</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        nextRows[rowIndex] = (nextRows[rowIndex] || []).filter((_, index) => index !== cellIndex);
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-1 text-red-600 text-sm border border-red-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="حذف الخلية"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-12 gap-2">
                                            <input
                                                type="text"
                                                value={cell.background_color || ''}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = { ...targetRow[cellIndex], background_color: e.target.value || undefined };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-4 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="خلفية (مثال #f3f4f6)"
                                                dir="ltr"
                                            />
                                            <input
                                                type="text"
                                                value={cell.text_color || ''}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = { ...targetRow[cellIndex], text_color: e.target.value || undefined };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-3 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="لون النص"
                                                dir="ltr"
                                            />
                                            <input
                                                type="text"
                                                value={cell.class_name || ''}
                                                onChange={(e) =>
                                                    updateHeaderRows((rows) => {
                                                        const nextRows = [...rows];
                                                        const targetRow = [...(nextRows[rowIndex] || [])];
                                                        targetRow[cellIndex] = { ...targetRow[cellIndex], class_name: e.target.value || undefined };
                                                        nextRows[rowIndex] = targetRow;
                                                        return nextRows;
                                                    })
                                                }
                                                className="col-span-5 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="Class إضافي (اختياري)"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={tableData.show_row_numbers !== false}
                        onChange={(e) => setTableData({ ...tableData, show_row_numbers: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    إظهار عمود ترقيم الصفوف
                </label>
                {tableData.show_row_numbers !== false && (
                    <input
                        type="text"
                        value={tableData.row_header_label || '#'}
                        onChange={(e) => setTableData({ ...tableData, row_header_label: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="عنوان عمود الترقيم"
                    />
                )}
            </div>

            {renderCustomLivePreview()}

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
    };

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
