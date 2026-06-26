import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon, TableCellsIcon, ListBulletIcon, BeakerIcon, CodeBracketIcon, ClipboardDocumentListIcon, BookOpenIcon, TruckIcon } from '@heroicons/react/24/outline';
import type {
    CellDataType,
    CustomTableSchemaV2,
    FormTemplate,
    Table,
    TableColumn,
    TableHeaderCell,
    TableParameter,
    TableType,
    TableV2DataTypeConfig,
    TableV2DataTypeRule,
    TableV2DataTypeScope,
} from '../../types';
import { generateId, cn } from '../../utils';
import {
    buildCustomTypeCellKey,
    buildSideHeaderRenderModel,
    ensureCustomTableSchemaV2,
    expandSideHeaderRowsToMatrix,
    getCustomDataTypeConfigForRendering,
    getCustomColumnsForRendering,
    getCustomGridSettingsForRendering,
    getCustomHeaderRowsForRendering,
    getCustomSideHeaderLabelsForRendering,
    getCustomBoldColumnSeparatorsForRendering,
    getCustomBoldRowSeparatorsForRendering,
    getCustomSideHeaderRowsForRendering,
    getCustomSideHeaderTargetsForRendering,
    getCustomLayoutForRendering,
    sanitizeCustomDataTypeConfig,
    resolveCustomCellType,
} from '../../utils/customTableV2';
import AdvancedFormulaBuilder from '../formula/AdvancedFormulaBuilder';
import { supabase } from '../../config/supabase';
import NumericOrVariableInput from '../common/NumericOrVariableInput';
import { useProductDocumentVariables } from '../../hooks/useProductDocumentVariables';

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

const CUSTOM_DATA_TYPE_OPTIONS: Array<{ value: CellDataType; label: string }> = [
    { value: 'text', label: 'نص' },
    { value: 'integer', label: 'عدد صحيح' },
    { value: 'decimal', label: 'عدد عشري' },
    { value: 'date', label: 'تاريخ' },
    { value: 'time', label: 'وقت' },
    { value: 'datetime', label: 'تاريخ ووقت' },
    { value: 'boolean-check', label: '✔ / ✖' },
    { value: 'boolean-yesno', label: 'نعم / لا' },
    { value: 'dropdown', label: 'قائمة منسدلة' },
    { value: 'user-directory', label: 'دليل العاملين' },
    { value: 'image', label: 'صورة / ملف' },
    { value: 'long-text', label: 'نص طويل' },
];

const isNumericCellType = (value: unknown): value is CellDataType =>
    value === 'integer' || value === 'decimal';

const hasFiniteNumberValue = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return false;
    return Number.isFinite(Number(value));
};

const normalizeOptionsList = (options: unknown): string[] => {
    if (!Array.isArray(options)) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];
    options.forEach((raw) => {
        const value = String(raw ?? '').trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        normalized.push(value);
    });
    return normalized;
};

const parseOptionsInput = (raw: string): string[] => {
    return normalizeOptionsList(
        String(raw || '')
            .split(/[\n,،;]+/)
            .map((item) => item.trim())
            .filter(Boolean)
    );
};

const optionsToInputText = (options: unknown): string =>
    normalizeOptionsList(options).join(', ');

const parseSeparatorIndexesInput = (raw: string, maxCount: number): number[] => {
    const safeMax = Math.max(0, Math.floor(Number(maxCount) || 0));
    if (safeMax <= 0) return [];
    const seen = new Set<number>();
    const parsed: number[] = [];

    String(raw || '')
        .split(/[\n,،;]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => {
            const value = Math.floor(Number(token));
            if (!Number.isInteger(value)) return;
            if (value < 1 || value > safeMax) return;
            if (seen.has(value)) return;
            seen.add(value);
            parsed.push(value);
        });

    return parsed.sort((a, b) => a - b);
};

const separatorIndexesToText = (indexes: number[]): string =>
    indexes.join(', ');

const hasBoldClass = (className: string): boolean =>
    className
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .includes('font-bold');

const removeBoldClass = (className: string): string =>
    className
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item && item !== 'font-bold')
        .join(' ');

const composeHeaderClassName = (baseClassName?: string, bold?: boolean): string | undefined => {
    const normalizedBase = removeBoldClass(baseClassName || '');
    if (bold) {
        return [normalizedBase, 'font-bold'].filter(Boolean).join(' ');
    }
    return normalizedBase || undefined;
};

const generateTimeHeadersForPreview = (startTime: string, durationHours: number, intervalMinutes: number): string[] => {
    let safeStartTime = startTime;
    let safeDuration = durationHours;
    let safeInterval = intervalMinutes;

    if (!safeStartTime || typeof safeStartTime !== 'string' || !safeStartTime.includes(':')) {
        safeStartTime = '08:00';
    }
    if (!safeDuration || safeDuration <= 0) {
        safeDuration = 8;
    }
    if (!safeInterval || safeInterval <= 0) {
        safeInterval = 60;
    }

    const [startHour, startMinute] = safeStartTime.split(':').map(Number);
    const totalMinutes = safeDuration * 60;
    const columnsCount = Math.floor(totalMinutes / safeInterval);
    const headers: string[] = [];

    for (let index = 0; index < columnsCount; index += 1) {
        const minutesFromStart = index * safeInterval;
        const total = startHour * 60 + startMinute + minutesFromStart;
        const hour = Math.floor(total / 60) % 24;
        const minute = total % 60;
        headers.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    return headers;
};

const toExcelColumnLabel = (index: number): string => {
    let value = Math.max(0, Math.floor(Number(index) || 0)) + 1;
    let result = '';
    while (value > 0) {
        const remainder = (value - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result || 'A';
};

const CUSTOM_TABLE_FORMULA_META_KEY = 'cell_formulas';

const parseFormulaCellKey = (key: string): { rowIndex: number; colIndex: number } | null => {
    const parts = String(key || '').split(':');
    if (parts.length !== 2) return null;
    const rowIndex = Number(parts[0]);
    const colIndex = Number(parts[1]);
    if (!Number.isInteger(rowIndex) || rowIndex < 0) return null;
    if (!Number.isInteger(colIndex) || colIndex < 0) return null;
    return { rowIndex, colIndex };
};

const isExcelFormulaText = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().startsWith('=');

const getStoredFormulaCellsFromTable = (table: Table): Record<string, string> => {
    if (!table?.schema_v2 || table.schema_v2.version !== 2) return {};
    const rawMeta = table.schema_v2.meta as Record<string, unknown> | undefined;
    const rawFormulaCells = rawMeta?.[CUSTOM_TABLE_FORMULA_META_KEY];
    if (!rawFormulaCells || typeof rawFormulaCells !== 'object') return {};

    const normalized: Record<string, string> = {};
    Object.entries(rawFormulaCells as Record<string, unknown>).forEach(([key, rawValue]) => {
        const parsedKey = parseFormulaCellKey(key);
        if (!parsedKey) return;
        const text = String(rawValue ?? '').trim();
        if (!isExcelFormulaText(text)) return;
        normalized[buildCustomTypeCellKey(parsedKey.rowIndex, parsedKey.colIndex)] = text;
    });
    return normalized;
};

const buildPreviewDataFromStoredFormulaCells = (table: Table): any[][] => {
    const formulaCells = getStoredFormulaCellsFromTable(table);
    const safeRows = Math.max(1, Number(table.rows || 1));
    const safeCols = Math.max(1, (table.columns || []).length);
    const matrix: any[][] = [];

    Object.entries(formulaCells).forEach(([key, formula]) => {
        const parsedKey = parseFormulaCellKey(key);
        if (!parsedKey) return;
        if (parsedKey.rowIndex >= safeRows || parsedKey.colIndex >= safeCols) return;

        while (matrix.length <= parsedKey.rowIndex) {
            matrix.push([]);
        }
        const targetRow = Array.isArray(matrix[parsedKey.rowIndex]) ? [...matrix[parsedKey.rowIndex]] : [];
        targetRow[parsedKey.colIndex] = formula;
        matrix[parsedKey.rowIndex] = targetRow;
    });

    return matrix;
};

const extractFormulaCellsFromPreviewData = (
    previewData: any[][],
    maxRows: number,
    maxCols: number
): Record<string, string> => {
    const safeRows = Math.max(1, Number(maxRows) || 1);
    const safeCols = Math.max(1, Number(maxCols) || 1);
    const result: Record<string, string> = {};

    if (!Array.isArray(previewData)) return result;

    for (let rowIndex = 0; rowIndex < Math.min(previewData.length, safeRows); rowIndex += 1) {
        const row = previewData[rowIndex];
        if (!Array.isArray(row)) continue;
        for (let colIndex = 0; colIndex < Math.min(row.length, safeCols); colIndex += 1) {
            const raw = row[colIndex];
            if (!isExcelFormulaText(raw)) continue;
            result[buildCustomTypeCellKey(rowIndex, colIndex)] = String(raw).trim();
        }
    }

    return result;
};

const isSameDataTypeConfig = (
    left: TableV2DataTypeConfig | undefined,
    right: TableV2DataTypeConfig | undefined
) => {
    const leftScope = left?.scope || 'column';
    const rightScope = right?.scope || 'column';
    if (leftScope !== rightScope) return false;

    const leftRows = left?.row_types || [];
    const rightRows = right?.row_types || [];
    const maxRows = Math.max(leftRows.length, rightRows.length);
    for (let index = 0; index < maxRows; index += 1) {
        if ((leftRows[index] || '') !== (rightRows[index] || '')) {
            return false;
        }
    }

    const leftCells = left?.cell_types || {};
    const rightCells = right?.cell_types || {};
    const leftKeys = Object.keys(leftCells).sort();
    const rightKeys = Object.keys(rightCells).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
        const key = leftKeys[index];
        if (key !== rightKeys[index]) return false;
        if (leftCells[key] !== rightCells[key]) return false;
    }

    const leftRowRules = left?.row_rules || [];
    const rightRowRules = right?.row_rules || [];
    const maxRuleRows = Math.max(leftRowRules.length, rightRowRules.length);
    for (let index = 0; index < maxRuleRows; index += 1) {
        const leftRule = leftRowRules[index];
        const rightRule = rightRowRules[index];
        if ((leftRule?.min ?? '') !== (rightRule?.min ?? '')) return false;
        if ((leftRule?.max ?? '') !== (rightRule?.max ?? '')) return false;
        const leftOptions = leftRule?.options || [];
        const rightOptions = rightRule?.options || [];
        if (leftOptions.length !== rightOptions.length) return false;
        for (let optionIndex = 0; optionIndex < leftOptions.length; optionIndex += 1) {
            if ((leftOptions[optionIndex] || '') !== (rightOptions[optionIndex] || '')) return false;
        }
    }

    const leftCellRules = left?.cell_rules || {};
    const rightCellRules = right?.cell_rules || {};
    const leftRuleKeys = Object.keys(leftCellRules).sort();
    const rightRuleKeys = Object.keys(rightCellRules).sort();
    if (leftRuleKeys.length !== rightRuleKeys.length) return false;
    for (let index = 0; index < leftRuleKeys.length; index += 1) {
        const key = leftRuleKeys[index];
        if (key !== rightRuleKeys[index]) return false;
        const leftRule = leftCellRules[key];
        const rightRule = rightCellRules[key];
        if ((leftRule?.min ?? '') !== (rightRule?.min ?? '')) return false;
        if ((leftRule?.max ?? '') !== (rightRule?.max ?? '')) return false;
        const leftOptions = leftRule?.options || [];
        const rightOptions = rightRule?.options || [];
        if (leftOptions.length !== rightOptions.length) return false;
        for (let optionIndex = 0; optionIndex < leftOptions.length; optionIndex += 1) {
            if ((leftOptions[optionIndex] || '') !== (rightOptions[optionIndex] || '')) return false;
        }
    }

    return true;
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
    className?: string;
    bold?: boolean;
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
interface TableTypeOption {
    id: string;
    type: TableType;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const baseTableTypes: TableTypeOption[] = [
    {
        id: 'parameters',
        type: 'parameters',
        label: 'جدول المعلمات',
        description: 'لتسجيل المعلمات مع الحدود الدنيا والقصوى',
        icon: <BeakerIcon className="w-6 h-6" />,
    },
    {
        id: 'sample',
        type: 'sample',
        label: 'جدول العينات (AQL)',
        description: 'لفحص العينات وفق معايير AQL',
        icon: <ListBulletIcon className="w-6 h-6" />,
    },
    {
        id: 'custom-v2',
        type: 'custom',
        label: 'الجدول المخصص الجديد',
        description: 'محرك حديث يدعم الرؤوس المتعددة والبناء بالماوس',
        icon: <TableCellsIcon className="w-6 h-6" />,
    },
    {
        id: 'printing_verification',
        type: 'printing_verification',
        label: 'تحقق الطباعة',
        description: 'فحص طباعة (باكو/علبة/كرتونة) بالصور',
        icon: <CodeBracketIcon className="w-6 h-6" />, // Or CameraIcon if available, but staying safe
    },
    {
        id: 'checklist',
        type: 'checklist',
        label: 'قائمة تحقق',
        description: 'قائمة بنود للمراجعة',
        icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
    },
    {
        id: 'recipe-traceability',
        type: 'recipe-traceability',
        label: 'جدول تتبع الخامات',
        description: 'تتبع باتشات الخامات للوصفة مع تواريخ الإنتاج والانتهاء',
        icon: <TruckIcon className="w-6 h-6" />,
    },
];

const inferTypeOptionId = (source?: Table): string => {
    if (!source) return '';
    if (source.type === 'custom' && source.schema_v2?.version === 2) return 'custom-v2';
    return source.type;
};


const TableBuilder: React.FC<TableBuilderProps> = ({ table, onSave, onClose, template, customVariables }) => {
    const [step, setStep] = useState<'type' | 'config'>(table ? 'config' : 'type');
    const [selectedTypeId, setSelectedTypeId] = useState<string>(inferTypeOptionId(table));
    const [tableData, setTableData] = useState<Table>(() => {
        if (table) {
            const normalizedColumns = getCustomColumnsForRendering(table);
            const normalizedHeaderRows = getCustomHeaderRowsForRendering(table);
            const normalizedGrid = getCustomGridSettingsForRendering(table);

            return {
                ...table,
                columns: normalizedColumns.length > 0 ? normalizedColumns : (table.columns || []),
                header_rows: normalizedHeaderRows.length > 0 ? normalizedHeaderRows : (table.header_rows || []),
                rows: table.rows ?? normalizedGrid.rows,
                allowDynamicRows: table.allowDynamicRows ?? normalizedGrid.allowDynamicRows,
                show_row_numbers: table.show_row_numbers ?? normalizedGrid.showRowNumbers,
                row_header_label: table.row_header_label ?? normalizedGrid.rowHeaderLabel,
            };
        }

        return {
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
        };
    });
    const { variables: productDocumentVariables } = useProductDocumentVariables(template?.basic_info?.product_id);

    // State for formula builder
    const [formulaBuilderOpen, setFormulaBuilderOpen] = useState(false);
    const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
    const [quickHeaderText, setQuickHeaderText] = useState<string>('');
    const [quickHeaderError, setQuickHeaderError] = useState<string>('');
    const [easyHeaderGroups, setEasyHeaderGroups] = useState<Record<string, string>>({});
    const [easyHeaderMode, setEasyHeaderMode] = useState<'single' | 'grouped'>('grouped');
    const [easyHeaderError, setEasyHeaderError] = useState<string>('');
    const initialHeaderRowsCount = table ? getCustomHeaderRowsForRendering(table).length : 0;
    const initialSideHeaderRows = table ? getCustomSideHeaderRowsForRendering(table) : [];
    const initialSideHeaderModel = buildSideHeaderRenderModel(initialSideHeaderRows, Math.max(table?.rows || 2, 1));
    const [mouseGridRows, setMouseGridRows] = useState<number>(Math.max(initialHeaderRowsCount, 2));
    const [mouseGrid, setMouseGrid] = useState<MouseHeaderGridCell[][]>([]);
    const [mouseSelectStart, setMouseSelectStart] = useState<{ row: number; col: number } | null>(null);
    const [mouseSelectEnd, setMouseSelectEnd] = useState<{ row: number; col: number } | null>(null);
    const [mouseSelecting, setMouseSelecting] = useState(false);
    const [mouseGridError, setMouseGridError] = useState<string>('');
    const [sideMouseGridRows, setSideMouseGridRows] = useState<number>(Math.max(initialSideHeaderModel.rows.length, table?.rows || 2, 2));
    const [sideMouseGridCols, setSideMouseGridCols] = useState<number>(Math.max(initialSideHeaderModel.columnCount, 1));
    const [sideMouseGrid, setSideMouseGrid] = useState<MouseHeaderGridCell[][]>([]);
    const [sideMouseSelectStart, setSideMouseSelectStart] = useState<{ row: number; col: number } | null>(null);
    const [sideMouseSelectEnd, setSideMouseSelectEnd] = useState<{ row: number; col: number } | null>(null);
    const [sideMouseSelecting, setSideMouseSelecting] = useState(false);
    const [sideMouseGridError, setSideMouseGridError] = useState<string>('');
    const [directoryDepartments, setDirectoryDepartments] = useState<DirectoryDepartment[]>([]);
    const [directoryRoles, setDirectoryRoles] = useState<DirectoryRole[]>([]);
    const [directoryDepartmentRoles, setDirectoryDepartmentRoles] = useState<DirectoryDepartmentRoleLink[]>([]);
    const [dropdownOptionDrafts, setDropdownOptionDrafts] = useState<Record<string, string>>({});
    const [livePreviewData, setLivePreviewData] = useState<any[][]>([]);
    const [activeFormulaCell, setActiveFormulaCell] = useState<{
        row: number;
        col: number;
        selectionStart: number;
        selectionEnd: number;
    } | null>(null);
    const previewInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const getDropdownOptionsInputValue = (draftKey: string, options: unknown): string => {
        if (Object.prototype.hasOwnProperty.call(dropdownOptionDrafts, draftKey)) {
            return dropdownOptionDrafts[draftKey] || '';
        }
        return optionsToInputText(options);
    };

    const handleDropdownOptionsInputChange = (
        draftKey: string,
        raw: string,
        onParsedChange: (nextOptions: string[]) => void
    ) => {
        setDropdownOptionDrafts((prev) => ({
            ...prev,
            [draftKey]: raw,
        }));
        onParsedChange(parseOptionsInput(raw));
    };

    const clearDropdownOptionsDraft = (draftKey: string) => {
        setDropdownOptionDrafts((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, draftKey)) return prev;
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });
    };

    useEffect(() => {
        // Reset preview sample values when table structure/type changes significantly.
        setLivePreviewData(buildPreviewDataFromStoredFormulaCells(tableData));
        setActiveFormulaCell(null);
    }, [tableData.id, tableData.type, (tableData.columns || []).length, tableData.rows]);

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

    const getCustomDefaultColumn = (index: number, existingKeys: Set<string>): TableColumn => {
        let key = `col_${index + 1}`;
        let suffix = index + 1;

        while (existingKeys.has(key)) {
            suffix += 1;
            key = `col_${suffix}`;
        }

        return {
            key,
            label: `عمود ${index + 1}`,
            type: 'text',
            align: 'center',
            width: 140,
        };
    };

    const resizeCustomColumns = (currentColumns: TableColumn[], targetCount: number): TableColumn[] => {
        const safeTargetCount = Math.max(1, targetCount);
        const next = [...currentColumns];
        const existingKeys = new Set(next.map((col) => col.key));

        while (next.length < safeTargetCount) {
            const newColumn = getCustomDefaultColumn(next.length, existingKeys);
            next.push(newColumn);
            existingKeys.add(newColumn.key);
        }

        if (next.length > safeTargetCount) {
            return next.slice(0, safeTargetCount);
        }

        return next;
    };

    const handleTypeSelect = (typeConfig: TableTypeOption) => {
        const type = typeConfig.type;
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
        } else if (typeConfig.id === 'custom-v2') {
            autoName = autoName || 'جدول مخصص';
            initialData = {
                rows: 10,
                columns: resizeCustomColumns([], 6),
                header_rows: [],
                show_row_numbers: true,
                row_header_label: '#',
                allowDynamicRows: false,
                schema_v2: {
                    version: 2,
                    layout: {
                        direction: 'rtl',
                        top_header: false,
                        side_header: false,
                    },
                    grid: {
                        rows: 10,
                        allow_dynamic_rows: false,
                        show_row_numbers: true,
                        row_header_label: '#',
                    },
                    columns: [],
                    headers: {
                        top: [],
                        side: [],
                    },
                    meta: {
                        engine: 'custom_v2',
                    },
                } as CustomTableSchemaV2,
            };
        }

        setSelectedTypeId(typeConfig.id);
        setTableData({ ...tableData, type, name: autoName, ...initialData });
        setStep('config');
    };

    const validateTableBeforeSave = (candidate: Table): string | null => {
        if (!candidate.name.trim()) {
            return 'يرجى إدخال اسم الجدول';
        }

        if (candidate.type === 'parameters' || candidate.type === 'sample') {
            const parameters = candidate.parameters || [];
            for (let index = 0; index < parameters.length; index += 1) {
                const parameter = parameters[index];
                const parameterLabel = parameter.name?.trim() || `المعلمة ${index + 1}`;

                if (isNumericCellType(parameter.type)) {
                    const hasMin = hasFiniteNumberValue(parameter.min);
                    const hasMax = hasFiniteNumberValue(parameter.max);
                    if (hasMin && hasMax && Number(parameter.min) > Number(parameter.max)) {
                        return `المعلمة "${parameterLabel}": الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى.`;
                    }
                }

                if (parameter.type === 'dropdown') {
                    const options = normalizeOptionsList(parameter.options);
                    if (options.length === 0) {
                        return `المعلمة "${parameterLabel}" من نوع قائمة منسدلة ويجب إدخال خيارات.`;
                    }
                }
            }
        }

        if (candidate.type === 'custom' || candidate.type === 'printing_verification') {
            const columns = getCustomColumnsForRendering(candidate);
            if (columns.length === 0) {
                return 'يجب إضافة عمود واحد على الأقل.';
            }

            const rowCount = Math.max(1, Number(getCustomGridSettingsForRendering(candidate).rows || candidate.rows || 1));
            const dataTypeConfig = getCustomDataTypeConfigForRendering(candidate);
            const rowTypes = dataTypeConfig.row_types || [];
            const cellTypes = dataTypeConfig.cell_types || {};
            const rowRules = dataTypeConfig.row_rules || [];
            const cellRules = dataTypeConfig.cell_rules || {};

            for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
                const column = columns[colIndex];
                const columnLabel = column.label?.trim() || column.key?.trim() || `عمود ${colIndex + 1}`;
                for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
                    const cellKey = buildCustomTypeCellKey(rowIndex, colIndex);
                    const effectiveType =
                        candidate.type === 'custom'
                            ? resolveCustomCellType(candidate, rowIndex, colIndex, column.type || 'text')
                            : (column.type || 'text');

                    let requiredMin: unknown = column.min;
                    let requiredMax: unknown = column.max;
                    let requiredOptions: unknown = column.options;

                    if (candidate.type === 'custom' && dataTypeConfig.scope === 'row' && rowTypes[rowIndex]) {
                        requiredMin = rowRules[rowIndex]?.min;
                        requiredMax = rowRules[rowIndex]?.max;
                        requiredOptions = rowRules[rowIndex]?.options;
                    }

                    if (candidate.type === 'custom' && dataTypeConfig.scope === 'cell' && cellTypes[cellKey]) {
                        requiredMin = cellRules[cellKey]?.min;
                        requiredMax = cellRules[cellKey]?.max;
                        requiredOptions = cellRules[cellKey]?.options;
                    }

                    if (isNumericCellType(effectiveType)) {
                        const hasMin = hasFiniteNumberValue(requiredMin);
                        const hasMax = hasFiniteNumberValue(requiredMax);
                        if (hasMin && hasMax && Number(requiredMin) > Number(requiredMax)) {
                            if (dataTypeConfig.scope === 'row' && rowTypes[rowIndex]) {
                                return `الصف ${rowIndex + 1}: قيمة min يجب أن تكون أقل من أو تساوي max.`;
                            }
                            if (dataTypeConfig.scope === 'cell' && cellTypes[cellKey]) {
                                return `الخلية (صف ${rowIndex + 1} - "${columnLabel}"): قيمة min يجب أن تكون أقل من أو تساوي max.`;
                            }
                            return `العمود "${columnLabel}": قيمة min يجب أن تكون أقل من أو تساوي max.`;
                        }
                    }

                    if (effectiveType === 'dropdown') {
                        const options = normalizeOptionsList(requiredOptions);
                        if (options.length === 0) {
                            if (dataTypeConfig.scope === 'row' && rowTypes[rowIndex]) {
                                return `الصف ${rowIndex + 1} من نوع قائمة منسدلة ويجب إدخال الخيارات من نطاق نوع البيانات.`;
                            }
                            if (dataTypeConfig.scope === 'cell' && cellTypes[cellKey]) {
                                return `الخلية (صف ${rowIndex + 1} - "${columnLabel}") من نوع قائمة منسدلة ويجب إدخال الخيارات من نطاق نوع البيانات.`;
                            }
                            return `العمود "${columnLabel}" من نوع قائمة منسدلة ويجب إدخال خيارات.`;
                        }
                    }
                }
            }
        }

        return null;
    };

    const buildSanitizedTableForSave = (candidate: Table): Table => {
        if (candidate.type !== 'custom' && candidate.type !== 'printing_verification') {
            if (candidate.type === 'parameters' || candidate.type === 'sample') {
                return {
                    ...candidate,
                    parameters: (candidate.parameters || []).map((parameter) => ({
                        ...parameter,
                        options: parameter.type === 'dropdown' ? normalizeOptionsList(parameter.options) : parameter.options,
                    })),
                };
            }
            return candidate;
        }

        return {
            ...candidate,
            columns: (candidate.columns || []).map((column) => ({
                ...column,
                options: column.type === 'dropdown' ? normalizeOptionsList(column.options) : column.options,
            })),
        };
    };

    const handleSave = () => {
        const sanitizedCandidate = buildSanitizedTableForSave(tableData);
        const validationError = validateTableBeforeSave(sanitizedCandidate);
        if (validationError) {
            alert(validationError);
            return;
        }

        let tableForSave = ensureCustomTableSchemaV2(sanitizedCandidate);

        if (
            (tableForSave.type === 'custom' || tableForSave.type === 'printing_verification') &&
            tableForSave.schema_v2?.version === 2
        ) {
            const safeRows = Math.max(1, Number(tableForSave.rows || 1));
            const safeCols = Math.max(1, (tableForSave.columns || []).length);
            const formulaCells = extractFormulaCellsFromPreviewData(livePreviewData, safeRows, safeCols);
            const schema = tableForSave.schema_v2 as CustomTableSchemaV2;
            const nextMeta: Record<string, unknown> = { ...(schema.meta || {}) };

            if (Object.keys(formulaCells).length > 0) {
                nextMeta[CUSTOM_TABLE_FORMULA_META_KEY] = formulaCells;
            } else {
                delete nextMeta[CUSTOM_TABLE_FORMULA_META_KEY];
            }

            tableForSave = {
                ...tableForSave,
                schema_v2: {
                    ...schema,
                    meta: nextMeta,
                },
            };
        }

        onSave(tableForSave);
    };

    const renderTypeSelector = () => {
        const tableTypes = baseTableTypes;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableTypes.map((typeConfig) => (
                    <button
                        key={typeConfig.id}
                        onClick={() => handleTypeSelect(typeConfig)}
                        className={cn(
                            'p-4 text-right rounded-lg border-2 transition-all hover:shadow-md',
                            selectedTypeId === typeConfig.id
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
                                    <option value="user-directory">دليل العاملين</option>
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
                                    <NumericOrVariableInput
                                        value={param.min as number | string | undefined}
                                        onChange={(value) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, min: value };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        variables={productDocumentVariables}
                                        numericType={param.type === 'decimal' ? 'decimal' : 'integer'}
                                        placeholder="الحد الأدنى"
                                    />
                                    <NumericOrVariableInput
                                        value={param.max as number | string | undefined}
                                        onChange={(value) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, max: value };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        variables={productDocumentVariables}
                                        numericType={param.type === 'decimal' ? 'decimal' : 'integer'}
                                        placeholder="الحد الأقصى"
                                    />
                                    <NumericOrVariableInput
                                        value={param.step as number | string | undefined}
                                        onChange={(value) => {
                                            const updated = [...(tableData.parameters || [])];
                                            updated[index] = { ...param, step: value };
                                            setTableData({ ...tableData, parameters: updated });
                                        }}
                                        variables={productDocumentVariables}
                                        numericType={param.type === 'decimal' ? 'decimal' : 'integer'}
                                        placeholder="الخطوة (Step)"
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
                                        عند الإدخال سيظهر للمستخدم أسماء العاملين من دليل العاملين حسب الفلاتر المختارة.
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
                <NumericOrVariableInput
                    value={tableData.max_std as number | string | undefined}
                    onChange={(value) => setTableData({
                        ...tableData,
                        max_std: value
                    })}
                    variables={productDocumentVariables}
                    numericType="decimal"
                    placeholder="مثال: 0.5"
                    className="w-full"
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
                            <NumericOrVariableInput
                                value={tableData.number_constraints?.step as number | string | undefined}
                                onChange={(value) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        step: value
                                    }
                                })}
                                variables={productDocumentVariables}
                                numericType="decimal"
                                placeholder="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                الحد الأدنى (Min)
                            </label>
                            <NumericOrVariableInput
                                value={tableData.number_constraints?.min as number | string | undefined}
                                onChange={(value) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        min: value
                                    }
                                })}
                                variables={productDocumentVariables}
                                numericType="decimal"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                الحد الأقصى (Max)
                            </label>
                            <NumericOrVariableInput
                                value={tableData.number_constraints?.max as number | string | undefined}
                                onChange={(value) => setTableData({
                                    ...tableData,
                                    number_constraints: {
                                        ...tableData.number_constraints,
                                        max: value
                                    }
                                })}
                                variables={productDocumentVariables}
                                numericType="decimal"
                                placeholder="100"
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
        setTableData((prev) => {
            const nextRows = updater(cloneHeaderRows(prev.header_rows));
            return { ...prev, header_rows: nextRows };
        });
    };

    const updateCustomLayout = (patch: Partial<NonNullable<CustomTableSchemaV2['layout']>>) => {
        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    layout: {
                        direction: schema.layout?.direction === 'ltr' ? 'ltr' : 'rtl',
                        top_header: schema.layout?.top_header !== false,
                        side_header: schema.layout?.side_header === true,
                        ...patch,
                    },
                },
            };
        });
    };

    const updateCustomMeta = (patch: Record<string, unknown>) => {
        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    meta: {
                        ...(schema.meta || {}),
                        ...patch,
                    },
                },
            };
        });
    };

    const updateSideHeaderRows = (updater: (rows: TableHeaderCell[][]) => TableHeaderCell[][]) => {
        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;
            const currentSideRows = cloneHeaderRows(getCustomSideHeaderRowsForRendering(normalized));
            const nextSideRows = updater(currentSideRows);

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    headers: {
                        top: schema.headers?.top || [],
                        side: nextSideRows,
                    },
                },
            };
        });
    };

    const getCustomTypeConfigDimensions = (sourceTable: Table) => {
        const normalized = ensureCustomTableSchemaV2(sourceTable);
        const schema = normalized.schema_v2 as CustomTableSchemaV2;
        const rows = Math.max(1, Number(schema.grid?.rows || normalized.rows || 1));
        const cols = Math.max(
            1,
            Number((schema.columns && schema.columns.length) || (normalized.columns && normalized.columns.length) || 1)
        );
        return { rows, cols };
    };

    const updateCustomDataTypeConfig = (
        updater: (config: TableV2DataTypeConfig) => TableV2DataTypeConfig
    ) => {
        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;
            const { rows, cols } = getCustomTypeConfigDimensions(normalized);
            const currentConfig = sanitizeCustomDataTypeConfig(schema.meta?.data_type_config, rows, cols);
            const nextConfig = sanitizeCustomDataTypeConfig(updater(currentConfig), rows, cols);

            if (isSameDataTypeConfig(currentConfig, nextConfig)) {
                return prev;
            }

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    meta: {
                        ...(schema.meta || {}),
                        data_type_config: nextConfig,
                    },
                },
            };
        });
    };

    const updateSideHeaderTargets = (
        updater: (targets: number[]) => number[],
        sideHeaderColumnCount: number,
        dataColumnCount: number
    ) => {
        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;
            const currentTargets = getCustomSideHeaderTargetsForRendering(
                normalized,
                sideHeaderColumnCount,
                dataColumnCount
            );
            const nextTargetsRaw = updater([...currentTargets]);
            const nextTargets = Array.from({ length: sideHeaderColumnCount }).map((_, index) => {
                const parsed = Number(nextTargetsRaw[index]);
                if (Number.isInteger(parsed)) {
                    return Math.max(0, Math.min(dataColumnCount, parsed));
                }
                return currentTargets[index] ?? 0;
            });

            const hasChanged =
                nextTargets.length !== currentTargets.length ||
                nextTargets.some((target, index) => target !== currentTargets[index]);
            if (!hasChanged) return prev;

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    meta: {
                        ...(schema.meta || {}),
                        side_header_targets: nextTargets,
                    },
                },
            };
        });
    };

    const buildSimpleSideHeaderRows = (
        rowCount: number,
        colCount: number,
        sourceRows?: TableHeaderCell[][]
    ): TableHeaderCell[][] => {
        const safeRowCount = Math.max(1, rowCount);
        const safeColCount = Math.max(1, colCount);
        const normalizedSource = sourceRows || [];

        return Array.from({ length: safeRowCount }).map((_, rowIndex) =>
            Array.from({ length: safeColCount }).map((__, colIndex) => {
                const sourceCell = normalizedSource[rowIndex]?.[colIndex];
                return {
                    label: sourceCell?.label ?? (colIndex === 0 ? `صف ${rowIndex + 1}` : '-'),
                    col_span: 1,
                    row_span: 1,
                    align: sourceCell?.align || 'center',
                    background_color: sourceCell?.background_color,
                    text_color: sourceCell?.text_color,
                    class_name: sourceCell?.class_name,
                } as TableHeaderCell;
            })
        );
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
        align: 'right' | 'center' | 'left' = 'center',
        className = '',
        bold = false
    ): MouseHeaderGridCell => ({
        label,
        colSpan: 1,
        rowSpan: 1,
        align,
        className,
        bold,
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
                const className = removeBoldClass(rowCell.class_name || '');
                const bold = hasBoldClass(rowCell.class_name || '');

                grid[rowIndex][colCursor] = {
                    label: rowCell.label || '',
                    colSpan,
                    rowSpan,
                    align,
                    className,
                    bold,
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
                            className: '',
                            bold: false,
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
                        class_name: composeHeaderClassName(cell.className, cell.bold),
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
        const mergedClassName = anchorMaster.className || '';
        const mergedBold = Boolean(anchorMaster.bold);

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
            className: mergedClassName,
            bold: mergedBold,
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
                    tableData.columns?.[col]?.align || master.align || 'center',
                    row === masterRow && col === masterCol ? master.className || '' : '',
                    row === masterRow && col === masterCol ? Boolean(master.bold) : false
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

    const updateMouseSelectedMasterAlign = (align: 'right' | 'center' | 'left') => {
        if (!mouseSelectStart || mouseGrid.length === 0) return;
        const source = mouseGrid[mouseSelectStart.row][mouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(mouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            align,
        };
        setMouseGrid(next);
    };

    const updateMouseSelectedMasterBold = (bold: boolean) => {
        if (!mouseSelectStart || mouseGrid.length === 0) return;
        const source = mouseGrid[mouseSelectStart.row][mouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(mouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            bold,
            className: removeBoldClass(next[masterRow][masterCol].className || ''),
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

    const buildSideMouseGridFromHeaderRows = (
        rowsCount: number,
        colsCount: number,
        headerRows?: TableHeaderCell[][]
    ): MouseHeaderGridCell[][] => {
        const safeRows = Math.max(rowsCount, 1);
        const safeCols = Math.max(colsCount, 1);

        const grid: MouseHeaderGridCell[][] = Array.from({ length: safeRows }, (_, rowIndex) =>
            Array.from({ length: safeCols }, (_, colIndex) =>
                createStandaloneMouseCell(rowIndex, colIndex, '', 'center')
            )
        );

        if (!headerRows || headerRows.length === 0) {
            return grid;
        }

        const maxRowsToApply = Math.min(headerRows.length, safeRows);
        for (let rowIndex = 0; rowIndex < maxRowsToApply; rowIndex += 1) {
            const rowCells = headerRows[rowIndex] || [];
            let colCursor = 0;

            for (const rowCell of rowCells) {
                while (colCursor < safeCols && grid[rowIndex][colCursor].hidden) {
                    colCursor += 1;
                }
                if (colCursor >= safeCols) break;

                const colSpan = Math.max(1, Math.min(rowCell.col_span || 1, safeCols - colCursor));
                const rowSpan = Math.max(1, Math.min(rowCell.row_span || 1, safeRows - rowIndex));
                const align = rowCell.align || 'center';
                const className = removeBoldClass(rowCell.class_name || '');
                const bold = hasBoldClass(rowCell.class_name || '');

                grid[rowIndex][colCursor] = {
                    label: rowCell.label || '',
                    colSpan,
                    rowSpan,
                    align,
                    className,
                    bold,
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
                            className: '',
                            bold: false,
                            masterRow: rowIndex,
                            masterCol: colCursor,
                        };
                    }
                }

                colCursor += colSpan;
            }
        }

        return grid;
    };

    const getSideMouseSelectionRect = () => {
        if (!sideMouseSelectStart || !sideMouseSelectEnd) return null;
        return {
            rowStart: Math.min(sideMouseSelectStart.row, sideMouseSelectEnd.row),
            rowEnd: Math.max(sideMouseSelectStart.row, sideMouseSelectEnd.row),
            colStart: Math.min(sideMouseSelectStart.col, sideMouseSelectEnd.col),
            colEnd: Math.max(sideMouseSelectStart.col, sideMouseSelectEnd.col),
        };
    };

    const reloadSideMouseGridFromCurrentHeader = (rowsOverride?: number, colsOverride?: number) => {
        const currentSideRows = getCustomSideHeaderRowsForRendering(tableData);
        const targetRows = Math.max(rowsOverride ?? sideMouseGridRows, currentSideRows.length || 0, 1);
        const sideModel = buildSideHeaderRenderModel(currentSideRows, targetRows);
        const targetCols = Math.max(colsOverride ?? sideMouseGridCols, sideModel.columnCount, 1);

        setSideMouseGridRows(targetRows);
        setSideMouseGridCols(targetCols);
        setSideMouseGrid(buildSideMouseGridFromHeaderRows(targetRows, targetCols, currentSideRows));
        setSideMouseGridError('');
        setSideMouseSelectStart(null);
        setSideMouseSelectEnd(null);
    };

    const resizeSideMouseGridRows = (nextRows: number) => {
        const safeRows = Math.max(nextRows, 1);
        const currentAsHeaderRows = convertMouseGridToHeaderRows(sideMouseGrid);
        setSideMouseGridRows(safeRows);
        setSideMouseGrid(buildSideMouseGridFromHeaderRows(safeRows, sideMouseGridCols, currentAsHeaderRows));
        setSideMouseSelectStart(null);
        setSideMouseSelectEnd(null);
        setSideMouseGridError('');
    };

    const resizeSideMouseGridCols = (nextCols: number) => {
        const safeCols = Math.max(nextCols, 1);
        const currentAsHeaderRows = convertMouseGridToHeaderRows(sideMouseGrid);
        setSideMouseGridCols(safeCols);
        setSideMouseGrid(buildSideMouseGridFromHeaderRows(sideMouseGridRows, safeCols, currentAsHeaderRows));
        setSideMouseSelectStart(null);
        setSideMouseSelectEnd(null);
        setSideMouseGridError('');
    };

    const mergeSideMouseSelectedArea = () => {
        const rect = getSideMouseSelectionRect();
        if (!rect || sideMouseGrid.length === 0) {
            setSideMouseGridError('حدّد مساحة أولاً بالماوس.');
            return;
        }

        const { rowStart, rowEnd, colStart, colEnd } = rect;
        const seenMasters = new Set<string>();

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let col = colStart; col <= colEnd; col += 1) {
                const cell = sideMouseGrid[row][col];
                const masterKey = `${cell.masterRow}:${cell.masterCol}`;
                if (seenMasters.has(masterKey)) continue;
                seenMasters.add(masterKey);

                const master = sideMouseGrid[cell.masterRow][cell.masterCol];
                const masterRowEnd = cell.masterRow + master.rowSpan - 1;
                const masterColEnd = cell.masterCol + master.colSpan - 1;

                if (
                    cell.masterRow < rowStart ||
                    cell.masterCol < colStart ||
                    masterRowEnd > rowEnd ||
                    masterColEnd > colEnd
                ) {
                    setSideMouseGridError('التحديد يحتوي على خلية مدمجة جزئيًا. فك الدمج أولاً أو حدّدها كاملة.');
                    return;
                }
            }
        }

        const next = cloneMouseGrid(sideMouseGrid);
        const anchorSource = sideMouseGrid[rowStart][colStart];
        const anchorMaster = sideMouseGrid[anchorSource.masterRow][anchorSource.masterCol];
        const mergedAlign = anchorMaster.align || 'center';
        const mergedLabel = anchorMaster.label || '';
        const mergedClassName = anchorMaster.className || '';
        const mergedBold = Boolean(anchorMaster.bold);

        for (let row = rowStart; row <= rowEnd; row += 1) {
            for (let col = colStart; col <= colEnd; col += 1) {
                next[row][col] = createStandaloneMouseCell(row, col, '', 'center');
            }
        }

        next[rowStart][colStart] = {
            label: mergedLabel,
            colSpan: colEnd - colStart + 1,
            rowSpan: rowEnd - rowStart + 1,
            align: mergedAlign,
            className: mergedClassName,
            bold: mergedBold,
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

        setSideMouseGrid(next);
        setSideMouseGridError('');
        setSideMouseSelectStart({ row: rowStart, col: colStart });
        setSideMouseSelectEnd({ row: rowEnd, col: colEnd });
    };

    const splitSideMouseSelectedCell = () => {
        if (!sideMouseSelectStart || sideMouseGrid.length === 0) {
            setSideMouseGridError('اختر خلية أولاً.');
            return;
        }

        const source = sideMouseGrid[sideMouseSelectStart.row][sideMouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const master = sideMouseGrid[masterRow][masterCol];

        if (master.colSpan === 1 && master.rowSpan === 1) {
            setSideMouseGridError('الخلية المحددة غير مدمجة.');
            return;
        }

        const next = cloneMouseGrid(sideMouseGrid);
        for (let row = masterRow; row < masterRow + master.rowSpan; row += 1) {
            for (let col = masterCol; col < masterCol + master.colSpan; col += 1) {
                next[row][col] = createStandaloneMouseCell(
                    row,
                    col,
                    row === masterRow && col === masterCol ? master.label : '',
                    master.align || 'center',
                    row === masterRow && col === masterCol ? master.className || '' : '',
                    row === masterRow && col === masterCol ? Boolean(master.bold) : false
                );
            }
        }

        setSideMouseGrid(next);
        setSideMouseGridError('');
        setSideMouseSelectStart({ row: masterRow, col: masterCol });
        setSideMouseSelectEnd({ row: masterRow, col: masterCol });
    };

    const updateSideMouseSelectedMasterLabel = (value: string) => {
        if (!sideMouseSelectStart || sideMouseGrid.length === 0) return;
        const source = sideMouseGrid[sideMouseSelectStart.row][sideMouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(sideMouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            label: value,
        };
        setSideMouseGrid(next);
    };

    const updateSideMouseSelectedMasterAlign = (align: 'right' | 'center' | 'left') => {
        if (!sideMouseSelectStart || sideMouseGrid.length === 0) return;
        const source = sideMouseGrid[sideMouseSelectStart.row][sideMouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(sideMouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            align,
        };
        setSideMouseGrid(next);
    };

    const updateSideMouseSelectedMasterBold = (bold: boolean) => {
        if (!sideMouseSelectStart || sideMouseGrid.length === 0) return;
        const source = sideMouseGrid[sideMouseSelectStart.row][sideMouseSelectStart.col];
        const masterRow = source.masterRow;
        const masterCol = source.masterCol;
        const next = cloneMouseGrid(sideMouseGrid);
        next[masterRow][masterCol] = {
            ...next[masterRow][masterCol],
            bold,
            className: removeBoldClass(next[masterRow][masterCol].className || ''),
        };
        setSideMouseGrid(next);
    };

    const applySideMouseGridHeader = () => {
        if (!sideMouseGrid.length) {
            setSideMouseGridError('لا يوجد مخطط لتطبيقه.');
            return;
        }

        updateSideHeaderRows(() => convertMouseGridToHeaderRows(sideMouseGrid));
        setSideMouseGridError('');
    };

    useEffect(() => {
        const stopMouseSelection = () => {
            setMouseSelecting(false);
            setSideMouseSelecting(false);
        };
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

    useEffect(() => {
        const currentSideRows = getCustomSideHeaderRowsForRendering(tableData);
        const currentCols = Math.max(sideMouseGridCols, 1);

        if (sideMouseGrid.length === 0 || sideMouseGrid[0]?.length !== currentCols) {
            const targetRows = Math.max(sideMouseGridRows, currentSideRows.length || 2, 1);
            if (targetRows !== sideMouseGridRows) {
                setSideMouseGridRows(targetRows);
            }
            setSideMouseGrid(buildSideMouseGridFromHeaderRows(targetRows, currentCols, currentSideRows));
            setSideMouseSelectStart(null);
            setSideMouseSelectEnd(null);
            setSideMouseGridError('');
        }
    }, [tableData.schema_v2, sideMouseGridCols]);

    useEffect(() => {
        if (tableData.type !== 'custom') return;

        setTableData((prev) => {
            const normalized = ensureCustomTableSchemaV2(prev);
            const schema = normalized.schema_v2 as CustomTableSchemaV2;
            const { rows, cols } = getCustomTypeConfigDimensions(normalized);
            const rawConfig = schema.meta?.data_type_config as TableV2DataTypeConfig | undefined;
            const sanitizedConfig = sanitizeCustomDataTypeConfig(rawConfig, rows, cols);

            if (isSameDataTypeConfig(rawConfig, sanitizedConfig)) {
                return prev;
            }

            return {
                ...prev,
                schema_v2: {
                    ...schema,
                    meta: {
                        ...(schema.meta || {}),
                        data_type_config: sanitizedConfig,
                    },
                },
            };
        });
    }, [tableData.type, tableData.rows, (tableData.columns || []).length]);

    const getPreviewAlignClass = (align?: 'right' | 'center' | 'left') => {
        if (align === 'left') return 'text-left';
        if (align === 'right') return 'text-right';
        return 'text-center';
    };

    const getPreviewCellRawValue = (column: TableColumn, rowIndex: number, colIndex: number = 0) => {
        const cellType = resolveCustomCellType(tableData, rowIndex, colIndex, column.type || 'text');

        switch (cellType) {
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
        const layoutSettings = getCustomLayoutForRendering(tableData);
        const customMeta = (tableData.schema_v2?.meta as Record<string, unknown>) || {};
        const timeHeaderEnabled = Boolean(customMeta.time_header_enabled);
        const previewInterval = Math.max(1, Number(tableData.inspection_period || 60));
        const generatedTimeHeaders = timeHeaderEnabled
            ? generateTimeHeadersForPreview('08:00', 8, previewInterval)
            : [];
        const getPreviewColumnHeaderLabel = (colIndex: number) =>
            generatedTimeHeaders[colIndex] ||
            columns[colIndex]?.label ||
            columns[colIndex]?.key ||
            `عمود ${colIndex + 1}`;
        const rawSideHeaderRows = getCustomSideHeaderRowsForRendering(tableData);
        const showTopHeader = layoutSettings.topHeader !== false;
        const hasCustomHeaderRows = showTopHeader && headerRows.length > 0 && !timeHeaderEnabled;
        const showRowNumbers = tableData.show_row_numbers !== false;
        const rowHeaderLabel = tableData.row_header_label || '#';
        const basePreviewRowsCount = Math.min(Math.max(tableData.rows || 3, 1), 4);
        const sideHeaderModel = buildSideHeaderRenderModel(rawSideHeaderRows, basePreviewRowsCount);
        const hasSideHeaders = layoutSettings.sideHeader && sideHeaderModel.columnCount > 0;
        const sideHeaderColumnCount = hasSideHeaders ? sideHeaderModel.columnCount : 0;
        const sideHeaderColumnLabels = hasSideHeaders
            ? getCustomSideHeaderLabelsForRendering(tableData, sideHeaderColumnCount)
            : [];
        const sideHeaderRows = sideHeaderModel.rows;
        const sideHeaderMatrix = hasSideHeaders
            ? expandSideHeaderRowsToMatrix(sideHeaderRows, sideHeaderColumnCount)
            : [];
        const useDistributedSideHeaders = hasSideHeaders && !hasCustomHeaderRows;
        const sideHeaderTargets = hasSideHeaders
            ? getCustomSideHeaderTargetsForRendering(tableData, sideHeaderColumnCount, columns.length)
            : [];
        const sideHeaderIndexesByTarget = sideHeaderTargets.reduce<Record<number, number[]>>((acc, target, sideIndex) => {
            const normalizedTarget = Math.max(0, Math.min(columns.length, Number(target) || 0));
            if (!acc[normalizedTarget]) acc[normalizedTarget] = [];
            acc[normalizedTarget].push(sideIndex);
            return acc;
        }, {});
        const previewRowsCount = Math.max(basePreviewRowsCount, sideHeaderRows.length);
        const boldRowSeparators = getCustomBoldRowSeparatorsForRendering(tableData, previewRowsCount);
        const boldColumnSeparators = getCustomBoldColumnSeparatorsForRendering(tableData, columns.length);
        const previewDataMatrix = Array.from({ length: previewRowsCount }).map((_, rowIndex) =>
            columns.map((column, colIndex) => {
                const existing = livePreviewData?.[rowIndex]?.[colIndex];
                if (existing !== undefined) return existing;
                return getPreviewCellRawValue(column, rowIndex, colIndex);
            })
        );
        const getPreviewCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}:${colIndex}`;
        const isPreviewFormula = (value: unknown): value is string =>
            typeof value === 'string' && value.trim().startsWith('=');

        const handlePreviewCellInputChange = (
            rowIndex: number,
            colIndex: number,
            value: string,
            cursorPosition?: number | null
        ) => {
            setLivePreviewData((prev) => {
                const next = Array.isArray(prev) ? prev.map((row) => (Array.isArray(row) ? [...row] : [])) : [];
                while (next.length <= rowIndex) {
                    next.push([]);
                }
                const targetRow = Array.isArray(next[rowIndex]) ? [...next[rowIndex]] : [];
                targetRow[colIndex] = value;
                next[rowIndex] = targetRow;
                return next;
            });

            if (isPreviewFormula(value)) {
                const caret = Math.max(
                    0,
                    Math.min(
                        Number.isFinite(Number(cursorPosition)) ? Number(cursorPosition) : value.length,
                        value.length
                    )
                );
                setActiveFormulaCell({
                    row: rowIndex,
                    col: colIndex,
                    selectionStart: caret,
                    selectionEnd: caret,
                });
            } else {
                setActiveFormulaCell((prev) =>
                    prev && prev.row === rowIndex && prev.col === colIndex ? null : prev
                );
            }
        };

        const updateActiveFormulaSelectionFromInput = (
            rowIndex: number,
            colIndex: number,
            input: HTMLInputElement | null
        ) => {
            if (!input) return;
            const selectionStart = input.selectionStart ?? input.value.length;
            const selectionEnd = input.selectionEnd ?? selectionStart;
            setActiveFormulaCell((prev) => {
                if (!prev || prev.row !== rowIndex || prev.col !== colIndex) return prev;
                return {
                    ...prev,
                    selectionStart,
                    selectionEnd,
                };
            });
        };

        const insertReferenceIntoActiveFormulaCell = (clickedRow: number, clickedCol: number) => {
            if (!activeFormulaCell) return false;
            if (activeFormulaCell.row === clickedRow && activeFormulaCell.col === clickedCol) return false;

            const sourceRaw = previewDataMatrix[activeFormulaCell.row]?.[activeFormulaCell.col];
            const sourceText = sourceRaw === undefined || sourceRaw === null ? '' : String(sourceRaw);
            if (!isPreviewFormula(sourceText)) {
                setActiveFormulaCell(null);
                return false;
            }

            const reference = `${toExcelColumnLabel(clickedCol)}${clickedRow + 1}`;
            const safeStart = Math.max(0, Math.min(activeFormulaCell.selectionStart, sourceText.length));
            const safeEnd = Math.max(safeStart, Math.min(activeFormulaCell.selectionEnd, sourceText.length));
            const nextValue = `${sourceText.slice(0, safeStart)}${reference}${sourceText.slice(safeEnd)}`;
            const nextCaret = safeStart + reference.length;

            setLivePreviewData((prev) => {
                const next = Array.isArray(prev) ? prev.map((row) => (Array.isArray(row) ? [...row] : [])) : [];
                while (next.length <= activeFormulaCell.row) {
                    next.push([]);
                }
                const targetRow = Array.isArray(next[activeFormulaCell.row]) ? [...next[activeFormulaCell.row]] : [];
                targetRow[activeFormulaCell.col] = nextValue;
                next[activeFormulaCell.row] = targetRow;
                return next;
            });

            setActiveFormulaCell({
                row: activeFormulaCell.row,
                col: activeFormulaCell.col,
                selectionStart: nextCaret,
                selectionEnd: nextCaret,
            });

            const formulaCellKey = getPreviewCellKey(activeFormulaCell.row, activeFormulaCell.col);
            requestAnimationFrame(() => {
                const input = previewInputRefs.current[formulaCellKey];
                if (!input) return;
                input.focus();
                input.setSelectionRange(nextCaret, nextCaret);
            });

            return true;
        };

        const handlePreviewCellMouseDown = (
            event: React.MouseEvent,
            rowIndex: number,
            colIndex: number
        ) => {
            if (!activeFormulaCell) return;
            const didInsert = insertReferenceIntoActiveFormulaCell(rowIndex, colIndex);
            if (didInsert) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const getPreviewCellState = (column: TableColumn, rowIndex: number, colIndex: number) => {
            const rawValue = previewDataMatrix[rowIndex]?.[colIndex];
            const rawText = rawValue === undefined || rawValue === null ? '' : String(rawValue);
            return {
                rawText,
                isFormula: isPreviewFormula(rawValue),
            };
        };
        const renderPreviewEditableCell = (column: TableColumn, rowIndex: number, colIndex: number) => {
            const cellState = getPreviewCellState(column, rowIndex, colIndex);
            const isFormulaEditorActive = Boolean(
                activeFormulaCell &&
                activeFormulaCell.row === rowIndex &&
                activeFormulaCell.col === colIndex &&
                cellState.isFormula
            );
            const inputKey = getPreviewCellKey(rowIndex, colIndex);
            return (
                <div className="space-y-1">
                    <input
                        ref={(el) => {
                            previewInputRefs.current[inputKey] = el;
                        }}
                        type="text"
                        value={cellState.rawText}
                        onChange={(e) =>
                            handlePreviewCellInputChange(
                                rowIndex,
                                colIndex,
                                e.target.value,
                                e.target.selectionStart
                            )
                        }
                        onFocus={(e) => {
                            const value = e.target.value;
                            if (isPreviewFormula(value)) {
                                const selectionStart = e.target.selectionStart ?? value.length;
                                const selectionEnd = e.target.selectionEnd ?? selectionStart;
                                setActiveFormulaCell({
                                    row: rowIndex,
                                    col: colIndex,
                                    selectionStart,
                                    selectionEnd,
                                });
                            }
                        }}
                        onBlur={() => {
                            setActiveFormulaCell((prev) =>
                                prev && prev.row === rowIndex && prev.col === colIndex ? null : prev
                            );
                        }}
                        onSelect={(e) =>
                            updateActiveFormulaSelectionFromInput(
                                rowIndex,
                                colIndex,
                                e.currentTarget
                            )
                        }
                        onKeyUp={(e) =>
                            updateActiveFormulaSelectionFromInput(
                                rowIndex,
                                colIndex,
                                e.currentTarget
                            )
                        }
                        className={cn(
                            'w-full rounded border border-transparent px-1 py-0.5 text-[11px] outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-transparent',
                            getPreviewAlignClass(column.align),
                            cellState.isFormula && 'text-blue-700 dark:text-blue-300',
                            isFormulaEditorActive && 'ring-1 ring-blue-400 dark:ring-blue-500'
                        )}
                        dir={cellState.isFormula ? 'ltr' : 'auto'}
                        placeholder={String(getPreviewCellRawValue(column, rowIndex, colIndex) ?? '')}
                        spellCheck={false}
                    />
                </div>
            );
        };
        const boldRowSeparatorSet = new Set(boldRowSeparators);
        const boldColumnSeparatorSet = new Set(boldColumnSeparators);
        const getDataSeparatorStyle = (rowIndex: number, colIndex: number) => {
            const style: React.CSSProperties = {};
            if (boldRowSeparatorSet.has(rowIndex + 1)) {
                style.borderBottomWidth = '3px';
                style.borderBottomStyle = 'double';
            }
            if (boldColumnSeparatorSet.has(colIndex + 1)) {
                if (layoutSettings.direction === 'rtl') {
                    style.borderLeftWidth = '3px';
                    style.borderLeftStyle = 'double';
                } else {
                    style.borderRightWidth = '3px';
                    style.borderRightStyle = 'double';
                }
            }
            return Object.keys(style).length > 0 ? style : undefined;
        };
        const getRowSeparatorStyle = (rowIndex: number) =>
            boldRowSeparatorSet.has(rowIndex + 1)
                ? ({ borderBottomWidth: '3px', borderBottomStyle: 'double' } as const)
                : undefined;

        if (columns.length === 0) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    أضف أعمدة لرؤية المعاينة الفورية للجدول.
                </div>
            );
        }

        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" dir={layoutSettings.direction}>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">معاينة فورية</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400" dir="ltr">
                        Formula: =A1+B1, =SUM(A1:A4) | click cells while editing formula
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="border-collapse table-fixed" style={{ minWidth: 'max-content' }}>
                        <colgroup>
                            {showRowNumbers && <col style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }} />}
                            {useDistributedSideHeaders
                                ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                    <React.Fragment key={`preview-colgroup-position-${positionIndex}`}>
                                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                            <col
                                                key={`preview-side-col-${positionIndex}-${sideIndex}`}
                                                style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}
                                            />
                                        ))}
                                        {positionIndex < columns.length && (
                                            <col
                                                key={`preview-col-${columns[positionIndex].key}`}
                                                style={{
                                                    width: `${columns[positionIndex].width || 140}px`,
                                                    minWidth: `${columns[positionIndex].width || 140}px`,
                                                    maxWidth: `${columns[positionIndex].width || 140}px`,
                                                }}
                                            />
                                        )}
                                    </React.Fragment>
                                ))
                                : (
                                    <>
                                        {hasSideHeaders &&
                                            Array.from({ length: sideHeaderColumnCount }).map((_, sideIndex) => (
                                                <col
                                                    key={`preview-side-col-${sideIndex}`}
                                                    style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}
                                                />
                                            ))}
                                        {columns.map((column) => {
                                            const width = column.width || 140;
                                            return (
                                                <col
                                                    key={`preview-col-${column.key}`}
                                                    style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
                                                />
                                            );
                                        })}
                                    </>
                                )}
                        </colgroup>
                        {showTopHeader && (
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
                                            {hasSideHeaders && headerRowIndex === 0 && (
                                                <th
                                                    rowSpan={headerRows.length}
                                                    colSpan={sideHeaderColumnCount}
                                                    className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-center"
                                                >
                                                    الرأس الجانبي
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
                                        {useDistributedSideHeaders
                                            ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                                <React.Fragment key={`preview-head-position-${positionIndex}`}>
                                                    {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                                                        <th
                                                            key={`preview-side-header-${positionIndex}-${sideIndex}`}
                                                            className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-center"
                                                        >
                                                            {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                        </th>
                                                    ))}
                                                    {positionIndex < columns.length && (
                                                        <th
                                                            key={`preview-header-${columns[positionIndex].key}`}
                                                            className={cn(
                                                                'border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium',
                                                                getPreviewAlignClass(columns[positionIndex].align)
                                                            )}
                                                            style={getDataSeparatorStyle(0, positionIndex)}
                                                        >
                                                            {getPreviewColumnHeaderLabel(positionIndex)}
                                                        </th>
                                                    )}
                                                </React.Fragment>
                                            ))
                                            : (
                                                <>
                                                    {hasSideHeaders &&
                                                        Array.from({ length: sideHeaderColumnCount }).map((_, sideIndex) => (
                                                            <th
                                                                key={`preview-side-header-${sideIndex}`}
                                                                className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-center"
                                                            >
                                                                {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                                            </th>
                                                        ))}
                                                    {columns.map((column, colIndex) => (
                                                        <th
                                                            key={`preview-header-${column.key}`}
                                                            className={cn(
                                                                'border border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium',
                                                                getPreviewAlignClass(column.align)
                                                            )}
                                                            style={getDataSeparatorStyle(0, colIndex)}
                                                        >
                                                            {getPreviewColumnHeaderLabel(colIndex)}
                                                        </th>
                                                    ))}
                                                </>
                                            )}
                                    </tr>
                                )}
                            </thead>
                        )}
                        <tbody>
                            {Array.from({ length: previewRowsCount }).map((_, rowIndex) => (
                                <tr key={`preview-row-${rowIndex}`} className="bg-white dark:bg-gray-800">
                                    {showRowNumbers && (
                                        <td
                                            className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-center text-gray-500"
                                            style={getRowSeparatorStyle(rowIndex)}
                                        >
                                            {rowIndex + 1}
                                        </td>
                                    )}
                                    {useDistributedSideHeaders
                                        ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                                            <React.Fragment key={`preview-body-position-${rowIndex}-${positionIndex}`}>
                                                {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => {
                                                    const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                    if (!cell) return null;
                                                    return (
                                                        <th
                                                            key={`preview-side-row-${rowIndex}-${positionIndex}-${sideIndex}`}
                                                            rowSpan={cell.row_span || 1}
                                                            className={cn(
                                                                'border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900',
                                                                getPreviewAlignClass(cell.align),
                                                                cell.class_name
                                                            )}
                                                            style={{
                                                                ...getRowSeparatorStyle(rowIndex),
                                                                backgroundColor: cell.background_color || undefined,
                                                                color: cell.text_color || undefined,
                                                            }}
                                                        >
                                                            {cell.label || '-'}
                                                        </th>
                                                    );
                                                })}
                                                {positionIndex < columns.length && (
                                                    <td
                                                        key={`preview-cell-${rowIndex}-${columns[positionIndex].key}`}
                                                        onMouseDown={(event) =>
                                                            handlePreviewCellMouseDown(event, rowIndex, positionIndex)
                                                        }
                                                        className={cn(
                                                            'border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-gray-700 dark:text-gray-200',
                                                            getPreviewAlignClass(columns[positionIndex].align)
                                                        )}
                                                        style={getDataSeparatorStyle(rowIndex, positionIndex)}
                                                    >
                                                        {renderPreviewEditableCell(columns[positionIndex], rowIndex, positionIndex)}
                                                    </td>
                                                )}
                                            </React.Fragment>
                                        ))
                                        : (
                                            <>
                                                {hasSideHeaders &&
                                                    Array.from({ length: sideHeaderColumnCount }).map((_, sideIndex) => {
                                                        const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                                                        if (!cell) return null;
                                                        return (
                                                            <th
                                                                key={`preview-side-row-${rowIndex}-${sideIndex}`}
                                                                rowSpan={cell.row_span || 1}
                                                                className={cn(
                                                                    'border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900',
                                                                    getPreviewAlignClass(cell.align),
                                                                    cell.class_name
                                                                )}
                                                                style={{
                                                                    ...getRowSeparatorStyle(rowIndex),
                                                                    backgroundColor: cell.background_color || undefined,
                                                                    color: cell.text_color || undefined,
                                                                }}
                                                            >
                                                                {cell.label || '-'}
                                                            </th>
                                                        );
                                                    })}
                                                {columns.map((column, colIndex) => (
                                                    <td
                                                        key={`preview-cell-${rowIndex}-${column.key}`}
                                                        onMouseDown={(event) =>
                                                            handlePreviewCellMouseDown(event, rowIndex, colIndex)
                                                        }
                                                        className={cn(
                                                            'border border-gray-300 dark:border-gray-600 px-2 py-2 text-[11px] text-gray-700 dark:text-gray-200',
                                                            getPreviewAlignClass(column.align)
                                                        )}
                                                        style={getDataSeparatorStyle(rowIndex, colIndex)}
                                                    >
                                                        {renderPreviewEditableCell(column, rowIndex, colIndex)}
                                                    </td>
                                                ))}
                                            </>
                                        )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCustomConfigV2 = () => {
        const columns = tableData.columns || [];
        const layoutSettings = getCustomLayoutForRendering(tableData);
        const customMeta = (tableData.schema_v2?.meta as Record<string, unknown>) || {};
        const isTimeHeaderEnabled = Boolean(customMeta.time_header_enabled);
        const selectedRows = Math.max(1, tableData.rows || 10);
        const selectedCols = Math.max(1, columns.length || 1);
        const rawSideHeaderRows = getCustomSideHeaderRowsForRendering(tableData);
        const sideHeaderCols = Math.max(1, sideMouseGridCols);
        const dataTypeConfig = getCustomDataTypeConfigForRendering(tableData);
        const dataTypeScope: TableV2DataTypeScope = dataTypeConfig.scope || 'column';
        const rowTypeSelections = dataTypeConfig.row_types || [];
        const cellTypeSelections = dataTypeConfig.cell_types || {};
        const rowRuleSelections = dataTypeConfig.row_rules || [];
        const cellRuleSelections = dataTypeConfig.cell_rules || {};
        const boldRowSeparators = getCustomBoldRowSeparatorsForRendering(tableData, selectedRows);
        const boldColumnSeparators = getCustomBoldColumnSeparatorsForRendering(tableData, selectedCols);
        const sideHeaderTargets = layoutSettings.sideHeader
            ? getCustomSideHeaderTargetsForRendering(tableData, sideHeaderCols, selectedCols)
            : [];
        const sideHeaderLabels = layoutSettings.sideHeader
            ? getCustomSideHeaderLabelsForRendering(tableData, sideHeaderCols)
            : [];
        const mouseSelectionRect = getMouseSelectionRect();
        const sideMouseSelectionRect = getSideMouseSelectionRect();
        const selectedTopMouseMaster = (() => {
            if (!mouseSelectStart || mouseGrid.length === 0) return null;
            const source = mouseGrid[mouseSelectStart.row]?.[mouseSelectStart.col];
            if (!source) return null;
            const master = mouseGrid[source.masterRow]?.[source.masterCol];
            if (!master) return null;
            return {
                row: source.masterRow,
                col: source.masterCol,
                cell: master,
            };
        })();
        const selectedSideMouseMaster = (() => {
            if (!sideMouseSelectStart || sideMouseGrid.length === 0) return null;
            const source = sideMouseGrid[sideMouseSelectStart.row]?.[sideMouseSelectStart.col];
            if (!source) return null;
            const master = sideMouseGrid[source.masterRow]?.[source.masterCol];
            if (!master) return null;
            return {
                row: source.masterRow,
                col: source.masterCol,
                cell: master,
            };
        })();

        const ensureSideHeaders = (rows: number = selectedRows, cols: number = sideHeaderCols) => {
            updateSideHeaderRows((current) => buildSimpleSideHeaderRows(rows, cols, current));
        };

        const handleSideHeaderToggle = (enabled: boolean) => {
            updateCustomLayout({ side_header: enabled });
            if (enabled) {
                updateCustomMeta({
                    side_header_labels: Array.from({ length: sideHeaderCols }).map(
                        (_, index) => sideHeaderLabels[index] || `رأس ${index + 1}`
                    ),
                });
                ensureSideHeaders(selectedRows, sideHeaderCols);
            }
        };

        const handleSideHeaderColsChange = (value: string) => {
            const nextCols = Math.max(1, Math.min(6, parseInt(value || '1', 10)));
            const nextLabels = Array.from({ length: nextCols }).map((_, index) => sideHeaderLabels[index] || `رأس ${index + 1}`);
            setSideMouseGridCols(nextCols);
            updateCustomMeta({ side_header_labels: nextLabels });
            if (layoutSettings.sideHeader) {
                ensureSideHeaders(selectedRows, nextCols);
            }
        };

        const handleSideHeaderLabelChange = (sideIndex: number, value: string) => {
            const next = Array.from({ length: sideHeaderCols }).map((_, index) => sideHeaderLabels[index] || `رأس ${index + 1}`);
            next[sideIndex] = value;
            updateCustomMeta({ side_header_labels: next });
        };

        const handleSideHeaderTargetChange = (sideIndex: number, value: string) => {
            const parsed = parseInt(value || '0', 10);
            const normalizedTarget = Math.max(0, Math.min(selectedCols, Number.isFinite(parsed) ? parsed : 0));
            updateSideHeaderTargets((current) => {
                const next = [...current];
                next[sideIndex] = normalizedTarget;
                return next;
            }, sideHeaderCols, selectedCols);
        };

        const handleSideHeaderRowsChange = (value: string) => {
            const parsed = parseInt(value || '1', 10);
            const nextRows = Math.max(1, Math.min(200, Number.isFinite(parsed) ? parsed : 1));
            setSideMouseGridRows(nextRows);
            setTableData((prev) => ({
                ...prev,
                rows: nextRows,
            }));
            if (layoutSettings.sideHeader) {
                ensureSideHeaders(nextRows, sideHeaderCols);
            }
        };

        const handleBoldRowSeparatorsChange = (value: string) => {
            const next = parseSeparatorIndexesInput(value, selectedRows);
            updateCustomMeta({ bold_row_separators: next });
        };

        const handleBoldColumnSeparatorsChange = (value: string) => {
            const next = parseSeparatorIndexesInput(value, selectedCols);
            updateCustomMeta({ bold_column_separators: next });
        };

        const addColumn = () => {
            setTableData({
                ...tableData,
                columns: resizeCustomColumns(columns, selectedCols + 1),
            });
        };

        const autoFitColumns = () => {
            const nextColumns = columns.map((column) => {
                const labelLength = (column.label || column.key || '').trim().length;
                const suggested = Math.min(Math.max(labelLength * 11 + 40, 95), 260);
                return {
                    ...column,
                    width: suggested,
                };
            });
            setTableData({ ...tableData, columns: nextColumns });
        };

        const updateColumn = (index: number, patch: Partial<TableColumn>) => {
            const nextColumns = [...columns];
            nextColumns[index] = {
                ...nextColumns[index],
                ...patch,
            };
            setTableData({ ...tableData, columns: nextColumns });
        };

        const removeColumn = (index: number) => {
            const nextColumns = columns.filter((_, colIndex) => colIndex !== index);
            setTableData({ ...tableData, columns: resizeCustomColumns(nextColumns, Math.max(nextColumns.length, 1)) });
        };

        const handleDataTypeScopeChange = (scope: TableV2DataTypeScope) => {
            updateCustomDataTypeConfig((current) => ({
                ...current,
                scope,
            }));
        };

        const normalizeRuleForType = (
            type: CellDataType,
            sourceRule?: Partial<TableV2DataTypeRule>
        ): TableV2DataTypeRule | undefined => {
            if (!sourceRule) return undefined;

            if (isNumericCellType(type)) {
                const parsedMin = sourceRule.min === '' || sourceRule.min === null || sourceRule.min === undefined
                    ? undefined
                    : Number(sourceRule.min);
                const parsedMax = sourceRule.max === '' || sourceRule.max === null || sourceRule.max === undefined
                    ? undefined
                    : Number(sourceRule.max);
                const min = Number.isFinite(parsedMin) ? parsedMin : undefined;
                const max = Number.isFinite(parsedMax) ? parsedMax : undefined;
                if (min === undefined && max === undefined) return undefined;
                return { min, max };
            }

            if (type === 'dropdown') {
                const options = normalizeOptionsList(sourceRule.options);
                if (options.length === 0) return undefined;
                return { options };
            }

            return undefined;
        };

        const handleRowTypeChange = (rowIndex: number, type: CellDataType) => {
            updateCustomDataTypeConfig((current) => {
                const nextRowTypes = [...(current.row_types || [])];
                nextRowTypes[rowIndex] = type;
                const nextRowRules = [...(current.row_rules || [])];
                const normalizedRule = normalizeRuleForType(type, nextRowRules[rowIndex]);
                if (normalizedRule) {
                    nextRowRules[rowIndex] = normalizedRule;
                } else {
                    delete nextRowRules[rowIndex];
                }
                return {
                    ...current,
                    row_types: nextRowTypes,
                    row_rules: nextRowRules,
                };
            });
        };

        const handleRowRuleChange = (rowIndex: number, patch: Partial<TableV2DataTypeRule>) => {
            updateCustomDataTypeConfig((current) => {
                const rowType = (current.row_types || [])[rowIndex] || columns[0]?.type || 'text';
                const nextRowRules = [...(current.row_rules || [])];
                const mergedRule = {
                    ...(nextRowRules[rowIndex] || {}),
                    ...patch,
                };
                const normalizedRule = normalizeRuleForType(rowType, mergedRule);
                if (normalizedRule) {
                    nextRowRules[rowIndex] = normalizedRule;
                } else {
                    delete nextRowRules[rowIndex];
                }
                return {
                    ...current,
                    row_rules: nextRowRules,
                };
            });
        };

        const handleCellTypeChange = (rowIndex: number, colIndex: number, type: CellDataType) => {
            const key = buildCustomTypeCellKey(rowIndex, colIndex);
            updateCustomDataTypeConfig((current) => {
                const nextCellRules = {
                    ...(current.cell_rules || {}),
                };
                const normalizedRule = normalizeRuleForType(type, nextCellRules[key]);
                if (normalizedRule) {
                    nextCellRules[key] = normalizedRule;
                } else {
                    delete nextCellRules[key];
                }

                return {
                    ...current,
                    cell_types: {
                        ...(current.cell_types || {}),
                        [key]: type,
                    },
                    cell_rules: nextCellRules,
                };
            });
        };

        const handleCellRuleChange = (rowIndex: number, colIndex: number, patch: Partial<TableV2DataTypeRule>) => {
            const key = buildCustomTypeCellKey(rowIndex, colIndex);
            updateCustomDataTypeConfig((current) => {
                const cellType = (current.cell_types || {})[key] || columns[colIndex]?.type || 'text';
                const nextCellRules = {
                    ...(current.cell_rules || {}),
                };
                const mergedRule = {
                    ...(nextCellRules[key] || {}),
                    ...patch,
                };
                const normalizedRule = normalizeRuleForType(cellType, mergedRule);
                if (normalizedRule) {
                    nextCellRules[key] = normalizedRule;
                } else {
                    delete nextCellRules[key];
                }
                return {
                    ...current,
                    cell_rules: nextCellRules,
                };
            });
        };

        return (
            <div className="space-y-5">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1) تخطيط العرض والترويسة</h4>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => updateCustomLayout({ direction: 'rtl' })}
                            className={cn(
                                'px-3 py-1.5 text-xs rounded border',
                                layoutSettings.direction === 'rtl'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                        >
                            اتجاه RTL
                        </button>
                        <button
                            type="button"
                            onClick={() => updateCustomLayout({ direction: 'ltr' })}
                            className={cn(
                                'px-3 py-1.5 text-xs rounded border',
                                layoutSettings.direction === 'ltr'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                        >
                            اتجاه LTR
                        </button>
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600">
                            <input
                                type="checkbox"
                                checked={layoutSettings.topHeader}
                                onChange={(e) => updateCustomLayout({ top_header: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            رأس علوي
                        </label>
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600">
                            <input
                                type="checkbox"
                                checked={layoutSettings.sideHeader}
                                onChange={(e) => handleSideHeaderToggle(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            رأس جانبي
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600">
                            <input
                                type="checkbox"
                                checked={isTimeHeaderEnabled}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    updateCustomMeta({ time_header_enabled: enabled });
                                    if (enabled && !layoutSettings.topHeader) {
                                        updateCustomLayout({ top_header: true });
                                    }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            رأس توقيت تلقائي
                        </label>
                        {isTimeHeaderEnabled && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    فترة الفحص (دقائق)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={tableData.inspection_period || 60}
                                    onChange={(e) =>
                                        setTableData({
                                            ...tableData,
                                            inspection_period: Math.max(1, parseInt(e.target.value || '60', 10) || 60),
                                        })
                                    }
                                    className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        )}
                    </div>
                    {isTimeHeaderEnabled && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            سيتم توليد رؤوس الأعمدة تلقائيًا حسب وقت البدء وفترة الفحص عند الإدخال والمعاينة.
                        </p>
                    )}

                    {layoutSettings.topHeader && (
                        <div className="space-y-2 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={generateHeaderRowsFromColumns}
                                    className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                                >
                                    توليد رأس علوي تلقائي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTableData({ ...tableData, header_rows: [] })}
                                    className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    مسح الرأس العلوي
                                </button>
                            </div>
                            <textarea
                                value={quickHeaderText}
                                onChange={(e) => {
                                    setQuickHeaderText(e.target.value);
                                    if (quickHeaderError) setQuickHeaderError('');
                                }}
                                rows={3}
                                placeholder="صيغة سريعة: عمود1|مجموعة||عمود4"
                                className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={applyQuickHeaderTemplate}
                                    className="px-3 py-1.5 text-xs rounded bg-gray-900 text-white hover:bg-black dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
                                >
                                    تطبيق صيغة الرأس
                                </button>
                                {quickHeaderError && (
                                    <span className="text-xs text-red-600 dark:text-red-400">{quickHeaderError}</span>
                                )}
                            </div>

                            {!isTimeHeaderEnabled && (
                                <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div>
                                            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                                                صفوف محرر الدمج
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={mouseGridRows}
                                                onChange={(e) => resizeMouseGridRows(parseInt(e.target.value || '1', 10))}
                                                className="w-24 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => reloadMouseGridFromCurrentHeader()}
                                            className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            إعادة تحميل
                                        </button>
                                        <button
                                            type="button"
                                            onClick={mergeMouseSelectedArea}
                                            className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                                        >
                                            دمج المحدد
                                        </button>
                                        <button
                                            type="button"
                                            onClick={splitMouseSelectedCell}
                                            className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            فك دمج
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyMouseGridHeader}
                                            className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            تطبيق على الرأس
                                        </button>
                                    </div>

                                    {mouseGridError && (
                                        <div className="text-xs text-red-600 dark:text-red-400">{mouseGridError}</div>
                                    )}

                                    <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                        <table className="min-w-full border-collapse text-xs select-none">
                                            <tbody>
                                                {mouseGrid.map((row, rowIndex) => (
                                                    <tr key={`mouse-grid-row-${rowIndex}`}>
                                                        {row.map((cell, colIndex) => {
                                                            if (cell.hidden) return null;
                                                            const masterRow = cell.masterRow;
                                                            const masterCol = cell.masterCol;
                                                            const isSelected = mouseSelectionRect
                                                                ? (
                                                                    masterRow >= mouseSelectionRect.rowStart &&
                                                                    masterRow <= mouseSelectionRect.rowEnd &&
                                                                    masterCol >= mouseSelectionRect.colStart &&
                                                                    masterCol <= mouseSelectionRect.colEnd
                                                                )
                                                                : false;

                                                            return (
                                                                <td
                                                                    key={`mouse-grid-cell-${rowIndex}-${colIndex}`}
                                                                    colSpan={cell.colSpan}
                                                                    rowSpan={cell.rowSpan}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setMouseSelectStart({ row: masterRow, col: masterCol });
                                                                        setMouseSelectEnd({ row: masterRow, col: masterCol });
                                                                        setMouseSelecting(true);
                                                                        setMouseGridError('');
                                                                    }}
                                                                    onMouseEnter={() => {
                                                                        if (!mouseSelecting) return;
                                                                        setMouseSelectEnd({ row: masterRow, col: masterCol });
                                                                    }}
                                                                    className={cn(
                                                                        'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center cursor-pointer',
                                                                        getPreviewAlignClass(cell.align),
                                                                        cell.bold && 'font-bold',
                                                                        isSelected
                                                                            ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-500'
                                                                            : 'bg-white dark:bg-gray-800'
                                                                    )}
                                                                >
                                                                    {cell.label || '...'}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {selectedTopMouseMaster && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                                            <input
                                                type="text"
                                                value={selectedTopMouseMaster.cell.label || ''}
                                                onChange={(e) => updateMouseSelectedMasterLabel(e.target.value)}
                                                className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="نص الخلية المحددة"
                                            />
                                            <select
                                                value={selectedTopMouseMaster.cell.align || 'center'}
                                                onChange={(e) => updateMouseSelectedMasterAlign(e.target.value as 'right' | 'center' | 'left')}
                                                className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                <option value="right">يمين</option>
                                                <option value="center">وسط</option>
                                                <option value="left">يسار</option>
                                            </select>
                                            <label className="inline-flex items-center gap-2 px-2 py-1 text-xs border rounded border-gray-300 dark:border-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(selectedTopMouseMaster.cell.bold)}
                                                    onChange={(e) => updateMouseSelectedMasterBold(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                خط عريض
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {layoutSettings.sideHeader && (
                        <div className="space-y-2 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        عدد صفوف الرأس الجانبي
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={selectedRows}
                                        onChange={(e) => handleSideHeaderRowsChange(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        عدد أعمدة الرأس الجانبي
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={6}
                                        value={sideMouseGridCols}
                                        onChange={(e) => handleSideHeaderColsChange(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    موضع كل عمود رأس جانبي داخل الجدول
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Array.from({ length: sideHeaderCols }).map((_, sideIndex) => (
                                        <div key={`side-target-${sideIndex}`}>
                                            <label className="block text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                                                {sideHeaderLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                                            </label>
                                            <select
                                                value={sideHeaderTargets[sideIndex] ?? 0}
                                                onChange={(e) => handleSideHeaderTargetChange(sideIndex, e.target.value)}
                                                className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                {Array.from({ length: selectedCols + 1 }).map((__, positionIndex) => (
                                                    <option key={`side-target-option-${sideIndex}-${positionIndex}`} value={positionIndex}>
                                                        {positionIndex < selectedCols
                                                            ? `قبل العمود ${positionIndex + 1}`
                                                            : 'بعد آخر عمود'}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={sideHeaderLabels[sideIndex] || ''}
                                                onChange={(e) => handleSideHeaderLabelChange(sideIndex, e.target.value)}
                                                className="mt-1 w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder={`عنوان رأس ${sideIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        ensureSideHeaders(selectedRows, sideHeaderCols);
                                    }}
                                    className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                                >
                                    توليد رأس جانبي تلقائي
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateSideHeaderRows(() => [])}
                                    className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    مسح الرأس الجانبي
                                </button>
                            </div>
                            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                <div className="flex flex-wrap items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => reloadSideMouseGridFromCurrentHeader(selectedRows, sideHeaderCols)}
                                        className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        إعادة تحميل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={mergeSideMouseSelectedArea}
                                        className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                                    >
                                        دمج المحدد
                                    </button>
                                    <button
                                        type="button"
                                        onClick={splitSideMouseSelectedCell}
                                        className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        فك دمج
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applySideMouseGridHeader}
                                        className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        تطبيق على الرأس الجانبي
                                    </button>
                                </div>

                                {sideMouseGridError && (
                                    <div className="text-xs text-red-600 dark:text-red-400">{sideMouseGridError}</div>
                                )}

                                <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                    <table className="min-w-full text-xs border-collapse select-none">
                                        <tbody>
                                            {sideMouseGrid.map((row, rowIndex) => (
                                                <tr key={`side-mouse-grid-row-${rowIndex}`}>
                                                    {row.map((cell, colIndex) => {
                                                        if (cell.hidden) return null;
                                                        const masterRow = cell.masterRow;
                                                        const masterCol = cell.masterCol;
                                                        const isSelected = sideMouseSelectionRect
                                                            ? (
                                                                masterRow >= sideMouseSelectionRect.rowStart &&
                                                                masterRow <= sideMouseSelectionRect.rowEnd &&
                                                                masterCol >= sideMouseSelectionRect.colStart &&
                                                                masterCol <= sideMouseSelectionRect.colEnd
                                                            )
                                                            : false;

                                                        return (
                                                            <td
                                                                key={`side-mouse-grid-cell-${rowIndex}-${colIndex}`}
                                                                colSpan={cell.colSpan}
                                                                rowSpan={cell.rowSpan}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setSideMouseSelectStart({ row: masterRow, col: masterCol });
                                                                    setSideMouseSelectEnd({ row: masterRow, col: masterCol });
                                                                    setSideMouseSelecting(true);
                                                                    setSideMouseGridError('');
                                                                }}
                                                                onMouseEnter={() => {
                                                                    if (!sideMouseSelecting) return;
                                                                    setSideMouseSelectEnd({ row: masterRow, col: masterCol });
                                                                }}
                                                                className={cn(
                                                                    'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center cursor-pointer',
                                                                    getPreviewAlignClass(cell.align),
                                                                    cell.bold && 'font-bold',
                                                                    isSelected
                                                                        ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-500'
                                                                        : 'bg-white dark:bg-gray-800'
                                                                )}
                                                            >
                                                                {cell.label || '...'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedSideMouseMaster && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                                        <input
                                            type="text"
                                            value={selectedSideMouseMaster.cell.label || ''}
                                            onChange={(e) => updateSideMouseSelectedMasterLabel(e.target.value)}
                                            className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="نص الخلية المحددة"
                                        />
                                        <select
                                            value={selectedSideMouseMaster.cell.align || 'center'}
                                            onChange={(e) => updateSideMouseSelectedMasterAlign(e.target.value as 'right' | 'center' | 'left')}
                                            className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="right">يمين</option>
                                            <option value="center">وسط</option>
                                            <option value="left">يسار</option>
                                        </select>
                                        <label className="inline-flex items-center gap-2 px-2 py-1 text-xs border rounded border-gray-300 dark:border-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(selectedSideMouseMaster.cell.bold)}
                                                onChange={(e) => updateSideMouseSelectedMasterBold(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            خط عريض
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2) إعداد الأعمدة</h4>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={autoFitColumns}
                                className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                ضبط العرض تلقائيًا
                            </button>
                            <button
                                type="button"
                                onClick={addColumn}
                                className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                            >
                                + إضافة عمود
                            </button>
                        </div>
                    </div>

                    {columns.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">لا يوجد أعمدة بعد.</p>
                    ) : (
                        <div className="space-y-2">
                            {columns.map((column, index) => (
                                <div key={`custom-v2-column-${column.key}-${index}`} className="space-y-2 rounded border border-gray-200 dark:border-gray-700 p-2">
                                    <div className="grid grid-cols-12 gap-2">
                                        <input
                                            type="text"
                                            value={column.key}
                                            onChange={(e) => updateColumn(index, { key: e.target.value })}
                                            className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="key"
                                            dir="ltr"
                                        />
                                        <input
                                            type="text"
                                            value={column.label || ''}
                                            onChange={(e) => updateColumn(index, { label: e.target.value })}
                                            className="col-span-3 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="اسم العمود"
                                        />
                                        <select
                                            value={column.type || 'text'}
                                            onChange={(e) => updateColumn(index, { type: e.target.value as any })}
                                            className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            {CUSTOM_DATA_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min={80}
                                            value={column.width || 140}
                                            onChange={(e) => updateColumn(index, { width: Math.max(80, parseInt(e.target.value || '140', 10)) })}
                                            className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                            placeholder="العرض"
                                        />
                                        <select
                                            value={column.align || 'center'}
                                            onChange={(e) => updateColumn(index, { align: e.target.value as 'right' | 'center' | 'left' })}
                                            className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="right">يمين</option>
                                            <option value="center">وسط</option>
                                            <option value="left">يسار</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeColumn(index)}
                                            className="col-span-1 text-red-600 text-sm border border-red-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                            title="حذف العمود"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {isNumericCellType(column.type) && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                value={column.min ?? ''}
                                                onChange={(e) => {
                                                    const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                    updateColumn(index, { min: Number.isFinite(parsed) ? parsed : undefined });
                                                }}
                                                className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="الحد الأدنى min (اختياري)"
                                            />
                                            <input
                                                type="number"
                                                value={column.max ?? ''}
                                                onChange={(e) => {
                                                    const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                    updateColumn(index, { max: Number.isFinite(parsed) ? parsed : undefined });
                                                }}
                                                className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="الحد الأقصى max (اختياري)"
                                            />
                                        </div>
                                    )}

                                    {column.type === 'dropdown' && (
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                value={getDropdownOptionsInputValue(`custom-col-${index}`, column.options)}
                                                onChange={(e) =>
                                                    handleDropdownOptionsInputChange(`custom-col-${index}`, e.target.value, (nextOptions) => {
                                                        updateColumn(index, { options: nextOptions });
                                                    })
                                                }
                                                onBlur={() => clearDropdownOptionsDraft(`custom-col-${index}`)}
                                                className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                placeholder="خيارات القائمة مثال: A, B, C"
                                            />
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                عدد الخيارات: {normalizeOptionsList(column.options).length}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">3) إعداد الصفوف</h4>
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            عدد الصفوف الابتدائي
                        </label>
                        <input
                            type="number"
                            value={tableData.rows || 10}
                            onChange={(e) => {
                                const parsed = parseInt(e.target.value || '1', 10);
                                const nextRows = Math.max(1, Number.isFinite(parsed) ? parsed : 1);
                                setSideMouseGridRows(nextRows);
                                setTableData((prev) => ({ ...prev, rows: nextRows }));
                                if (layoutSettings.sideHeader) {
                                    ensureSideHeaders(nextRows, sideHeaderCols);
                                }
                            }}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            min={1}
                        />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={tableData.allowDynamicRows || false}
                            onChange={(e) => setTableData({ ...tableData, allowDynamicRows: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        السماح بإضافة/حذف الصفوف أثناء الإدخال
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                فواصل صفوف عريضة (أرقام الصفوف)
                            </label>
                            <input
                                type="text"
                                value={separatorIndexesToText(boldRowSeparators)}
                                onChange={(e) => handleBoldRowSeparatorsChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600"
                                placeholder="مثال: 5, 10, 15"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                فواصل أعمدة عريضة (أرقام الأعمدة)
                            </label>
                            <input
                                type="text"
                                value={separatorIndexesToText(boldColumnSeparators)}
                                onChange={(e) => handleBoldColumnSeparatorsChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600"
                                placeholder="مثال: 2, 4"
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        سيتم جعل خط الفاصل أسفل الصف المحدد وأيضًا بعد العمود المحدد أكثر سماكة.
                    </p>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">4) نطاق نوع البيانات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => handleDataTypeScopeChange('column')}
                            className={cn(
                                'px-3 py-2 text-xs rounded border transition-colors',
                                dataTypeScope === 'column'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                        >
                            حسب العمود
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDataTypeScopeChange('row')}
                            className={cn(
                                'px-3 py-2 text-xs rounded border transition-colors',
                                dataTypeScope === 'row'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                        >
                            حسب الصف
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDataTypeScopeChange('cell')}
                            className={cn(
                                'px-3 py-2 text-xs rounded border transition-colors',
                                dataTypeScope === 'cell'
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                        >
                            حسب الخلية
                        </button>
                    </div>

                    {dataTypeScope === 'column' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            الوضع الحالي: نوع البيانات مأخوذ من كل عمود كما هو مضبوط في "إعداد الأعمدة".
                        </p>
                    )}

                    {dataTypeScope === 'row' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                كل صف سيكون له نوع بيانات موحد لجميع خلاياه.
                            </p>
                            <div className="max-h-56 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                <table className="min-w-full text-xs border-collapse">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center w-20">الصف</th>
                                            <th className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center">نوع البيانات</th>
                                            <th className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center min-w-[260px]">الضوابط</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: selectedRows }).map((_, rowIndex) => (
                                            <tr key={`row-type-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'}>
                                                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">
                                                    {rowIndex + 1}
                                                </td>
                                                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                                                    <select
                                                        value={rowTypeSelections[rowIndex] || columns[0]?.type || 'text'}
                                                        onChange={(e) => handleRowTypeChange(rowIndex, e.target.value as CellDataType)}
                                                        className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                    >
                                                        {CUSTOM_DATA_TYPE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                                                    {(() => {
                                                        const rowType = rowTypeSelections[rowIndex] || columns[0]?.type || 'text';
                                                        const rowRule = rowRuleSelections[rowIndex];

                                                        if (isNumericCellType(rowType)) {
                                                            return (
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={rowRule?.min ?? ''}
                                                                        onChange={(e) => {
                                                                            const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                                            handleRowRuleChange(rowIndex, {
                                                                                min: Number.isFinite(parsed) ? parsed : undefined,
                                                                            });
                                                                        }}
                                                                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                        placeholder="min (اختياري)"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        value={rowRule?.max ?? ''}
                                                                        onChange={(e) => {
                                                                            const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                                            handleRowRuleChange(rowIndex, {
                                                                                max: Number.isFinite(parsed) ? parsed : undefined,
                                                                            });
                                                                        }}
                                                                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                        placeholder="max (اختياري)"
                                                                    />
                                                                </div>
                                                            );
                                                        }

                                                        if (rowType === 'dropdown') {
                                                            return (
                                                                <input
                                                                    type="text"
                                                                    value={getDropdownOptionsInputValue(`custom-row-rule-${rowIndex}`, rowRule?.options)}
                                                                    onChange={(e) =>
                                                                        handleDropdownOptionsInputChange(`custom-row-rule-${rowIndex}`, e.target.value, (nextOptions) => {
                                                                            handleRowRuleChange(rowIndex, { options: nextOptions });
                                                                        })
                                                                    }
                                                                    onBlur={() => clearDropdownOptionsDraft(`custom-row-rule-${rowIndex}`)}
                                                                    className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                    placeholder="خيارات القائمة: A, B, C"
                                                                />
                                                            );
                                                        }

                                                        return (
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                لا توجد ضوابط إضافية لهذا النوع.
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {dataTypeScope === 'cell' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                يمكنك اختيار نوع مختلف لكل خلية بشكل مستقل.
                            </p>
                            <div className="max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                                <table className="min-w-full text-xs border-collapse">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                                                الصف \ العمود
                                            </th>
                                            {columns.map((column, colIndex) => (
                                                <th
                                                    key={`cell-type-head-${colIndex}`}
                                                    className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center min-w-[140px] sticky top-0 bg-gray-100 dark:bg-gray-700 z-10"
                                                >
                                                    {column.label || column.key || `عمود ${colIndex + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: selectedRows }).map((_, rowIndex) => (
                                            <tr key={`cell-type-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'}>
                                                <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center font-medium">
                                                    {rowIndex + 1}
                                                </td>
                                                {columns.map((column, colIndex) => {
                                                    const key = buildCustomTypeCellKey(rowIndex, colIndex);
                                                    const selectedType = cellTypeSelections[key] || column.type || 'text';
                                                    const cellRule = cellRuleSelections[key];
                                                    return (
                                                        <td key={`cell-type-${rowIndex}-${colIndex}`} className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                                                            <div className="space-y-1">
                                                                <select
                                                                    value={selectedType}
                                                                    onChange={(e) => handleCellTypeChange(rowIndex, colIndex, e.target.value as CellDataType)}
                                                                    className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                >
                                                                    {CUSTOM_DATA_TYPE_OPTIONS.map((option) => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                {isNumericCellType(selectedType) && (
                                                                    <div className="grid grid-cols-2 gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={cellRule?.min ?? ''}
                                                                            onChange={(e) => {
                                                                                const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                                                handleCellRuleChange(rowIndex, colIndex, {
                                                                                    min: Number.isFinite(parsed) ? parsed : undefined,
                                                                                });
                                                                            }}
                                                                            className="px-2 py-1 text-[11px] border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                            placeholder="min"
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            value={cellRule?.max ?? ''}
                                                                            onChange={(e) => {
                                                                                const parsed = e.target.value === '' ? undefined : Number(e.target.value);
                                                                                handleCellRuleChange(rowIndex, colIndex, {
                                                                                    max: Number.isFinite(parsed) ? parsed : undefined,
                                                                                });
                                                                            }}
                                                                            className="px-2 py-1 text-[11px] border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                            placeholder="max"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {selectedType === 'dropdown' && (
                                                                    <input
                                                                        type="text"
                                                                        value={getDropdownOptionsInputValue(`custom-cell-rule-${rowIndex}-${colIndex}`, cellRule?.options)}
                                                                        onChange={(e) =>
                                                                            handleDropdownOptionsInputChange(`custom-cell-rule-${rowIndex}-${colIndex}`, e.target.value, (nextOptions) => {
                                                                                handleCellRuleChange(rowIndex, colIndex, { options: nextOptions });
                                                                            })
                                                                        }
                                                                        onBlur={() => clearDropdownOptionsDraft(`custom-cell-rule-${rowIndex}-${colIndex}`)}
                                                                        className="w-full px-2 py-1 text-[11px] border rounded dark:bg-gray-700 dark:border-gray-600"
                                                                        placeholder="خيارات: A, B, C"
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">5) المعاينة الفورية</h4>
                    {renderCustomLivePreview()}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                    هذا المسار مستقل بالكامل عن الإعداد القديم، ويدعم التحديد بالماوس ودمج/فك دمج الرؤوس مع معاينة فورية.
                </p>
            </div>
        );
    };

    const renderPrintingVerificationConfig = () => {
        const defaultColumns: TableColumn[] = [
            { key: 'pako', label: 'الباكو', type: 'image', align: 'center', width: 160 },
            { key: 'box', label: 'العلبة', type: 'image', align: 'center', width: 160 },
            { key: 'carton', label: 'الكرتونة', type: 'image', align: 'center', width: 160 },
        ];

        const columns = (tableData.columns && tableData.columns.length > 0) ? tableData.columns : defaultColumns;

        const applyColumns = (nextColumns: TableColumn[]) => {
            setTableData({
                ...tableData,
                rows: 1,
                show_row_numbers: false,
                allowDynamicRows: false,
                columns: nextColumns,
            });
        };

        const updateColumn = (index: number, patch: Partial<TableColumn>) => {
            const nextColumns = [...columns];
            nextColumns[index] = { ...nextColumns[index], ...patch };
            applyColumns(nextColumns);
        };

        const removeColumn = (index: number) => {
            const nextColumns = columns.filter((_, colIndex) => colIndex !== index);
            applyColumns(nextColumns.length > 0 ? nextColumns : defaultColumns);
        };

        const addColumn = () => {
            const existingKeys = new Set(columns.map((col) => col.key));
            let key = `col_${columns.length + 1}`;
            let suffix = columns.length + 1;

            while (existingKeys.has(key)) {
                suffix += 1;
                key = `col_${suffix}`;
            }

            applyColumns([
                ...columns,
                {
                    key,
                    label: `حقل ${columns.length + 1}`,
                    type: 'image',
                    align: 'center',
                    width: 160,
                },
            ]);
        };

        return (
            <div className="space-y-4">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">إعداد تحقق الطباعة</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        هذا الجدول مخصص لفحص الطباعة، صف واحد فقط، مع حقول واضحة وسهلة.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">عدد الصفوف</label>
                            <input
                                type="number"
                                value={1}
                                disabled
                                className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">إجمالي الأعمدة</label>
                            <input
                                type="number"
                                value={columns.length}
                                disabled
                                className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={() => applyColumns(defaultColumns)}
                                className="px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                استرجاع الافتراضي
                            </button>
                            <button
                                type="button"
                                onClick={addColumn}
                                className="px-3 py-2 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                            >
                                + إضافة عمود
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">الأعمدة</h4>

                    {columns.map((column, index) => (
                        <div key={`printing-col-${column.key}-${index}`} className="space-y-2 rounded border border-gray-200 dark:border-gray-700 p-2">
                            <div className="grid grid-cols-12 gap-2">
                                <input
                                    type="text"
                                    value={column.key}
                                    onChange={(e) => updateColumn(index, { key: e.target.value })}
                                    className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="key"
                                    dir="ltr"
                                />
                                <input
                                    type="text"
                                    value={column.label || ''}
                                    onChange={(e) => updateColumn(index, { label: e.target.value })}
                                    className="col-span-3 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="اسم العمود"
                                />
                                <select
                                    value={column.type || 'image'}
                                    onChange={(e) => updateColumn(index, { type: e.target.value as any })}
                                    className="col-span-3 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="image">صورة / ملف</option>
                                    <option value="boolean-check">✔ / ✖</option>
                                    <option value="boolean-yesno">نعم / لا</option>
                                    <option value="text">نص</option>
                                    <option value="dropdown">قائمة منسدلة</option>
                                    <option value="user-directory">دليل العاملين</option>
                                </select>
                                <input
                                    type="number"
                                    min={80}
                                    value={column.width || 160}
                                    onChange={(e) => updateColumn(index, { width: Math.max(80, parseInt(e.target.value || '160', 10)) })}
                                    className="col-span-2 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="العرض"
                                />
                                <select
                                    value={column.align || 'center'}
                                    onChange={(e) => updateColumn(index, { align: e.target.value as 'right' | 'center' | 'left' })}
                                    className="col-span-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="right">ي</option>
                                    <option value="center">و</option>
                                    <option value="left">س</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeColumn(index)}
                                    className="col-span-1 text-red-600 text-sm border border-red-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="حذف العمود"
                                >
                                    ×
                                </button>
                            </div>

                            {column.type === 'dropdown' && (
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={getDropdownOptionsInputValue(`printing-col-${index}`, column.options)}
                                        onChange={(e) =>
                                            handleDropdownOptionsInputChange(`printing-col-${index}`, e.target.value, (nextOptions) => {
                                                updateColumn(index, { options: nextOptions });
                                            })
                                        }
                                        onBlur={() => clearDropdownOptionsDraft(`printing-col-${index}`)}
                                        className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="خيارات القائمة مثال: مطابق, غير مطابق"
                                    />
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        عدد الخيارات: {normalizeOptionsList(column.options).length}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">معاينة سريعة</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    {columns.map((column) => (
                                        <th
                                            key={`preview-print-head-${column.key}`}
                                            className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center"
                                            style={{ width: column.width ? `${column.width}px` : undefined }}
                                        >
                                            {column.label || column.key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white dark:bg-gray-800">
                                    {columns.map((column, colIndex) => (
                                        <td
                                            key={`preview-print-cell-${column.key}`}
                                            className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center"
                                        >
                                            {getPreviewCellRawValue(column, 0, colIndex)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
            {tableData.type === 'custom' && renderCustomConfigV2()}
            {tableData.type === 'checklist' && renderChecklistConfig()}
            {tableData.type === 'printing_verification' && renderPrintingVerificationConfig()}
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

