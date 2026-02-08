import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';


dayjs.extend(customParseFormat);

const isDateValueInvalid = (val: string, format: string, min?: string | number, max?: string | number): 'min' | 'max' | null => {
    if (!val || !format) return null;
    let dateObj = dayjs(val.startsWith('http') ? val : val, format, true);
    // Handle time-only formats by appending dummy date
    const isTime = format.includes('HH') || format.includes('mm') || format.includes('ss');
    let dateFormat = format;

    if (isTime && !format.includes('YYYY') && !format.includes('DD')) {
        const dummyPrev = `2000-01-01 `;
        dateObj = dayjs(`${dummyPrev}${val}`, `YYYY-MM-DD ${format}`, true);
        dateFormat = `YYYY-MM-DD ${format}`;
    }

    if (!dateObj.isValid()) return null; // Format validity handled by regex usually

    if (min) {
        const minVal = isTime && !format.includes('YYYY') && !format.includes('DD')
            ? `2000-01-01 ${min}`
            : min.toString();
        const minDate = dayjs(minVal, dateFormat, true);
        if (minDate.isValid() && dateObj.isBefore(minDate)) return 'min';
    }

    if (max) {
        const maxVal = isTime && !format.includes('YYYY') && !format.includes('DD')
            ? `2000-01-01 ${max}`
            : max.toString();
        const maxDate = dayjs(maxVal, dateFormat, true);
        if (maxDate.isValid() && dateObj.isAfter(maxDate)) return 'max';
    }

    return null;
};
import type { FormSection, FormTemplate, Table, TableParameter } from '../../types';
import { cn, calculateStats, isInRange } from '../../utils';
import { evaluateExpression } from '../../utils/FormulaEngine';
import { calculateTare1, calculateTare2, validateColumn, getAQLLimits } from '../../utils/tareCalculations';
import { useToastStore } from '../../store/toastStore';
import RecipeTraceabilityTable from '../tables/RecipeTraceabilityTable';
import { variableService } from '../../services/variableService';

interface FormRendererProps {
    section: FormSection;
    formData?: {
        tables: Record<string, { data: any[][]; notes?: string }>;
    };
    onChange: (tableId: string, data: any[][]) => void;
    onTableNotesChange?: (tableId: string, notes: string) => void;
    tableNotes?: Record<string, string>;
    onStoppedTimesChange?: (groupId: string, stoppedTimes: string[]) => void;
    stoppedTimesByGroup?: Record<string, string[]>;
    template: FormTemplate;
    inspectionStartTime?: string;
    shiftDuration?: number;
}

const FormRenderer: React.FC<FormRendererProps> = ({
    section,
    formData,
    onChange,
    onTableNotesChange,
    tableNotes = {},
    onStoppedTimesChange,
    stoppedTimesByGroup = {},
    template: _template,
    inspectionStartTime = '08:00',
    shiftDuration = 8,
}) => {
    const showToast = useToastStore((state) => state.error);
    const [flashingCell, setFlashingCell] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
    const [globalVariables, setGlobalVariables] = useState<Record<string, any>>({});

    // Fetch global variables on mount
    useEffect(() => {
        const fetchVariables = async () => {
            try {
                const vars = await variableService.getVariables();
                const varsMap = vars.reduce((acc, v) => {
                    // Try to parse number if possible, otherwise string
                    const numVal = Number(v.value);
                    acc[v.name] = isNaN(numVal) ? v.value : numVal;
                    return acc;
                }, {} as Record<string, any>);
                setGlobalVariables(varsMap);
            } catch (error) {
                console.error('Error fetching global variables:', error);
            }
        };
        fetchVariables();
    }, []);

    // Global keyboard listener for Delete/Backspace when table is selected
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (selectedTableId && (e.key === 'Delete' || e.key === 'Backspace')) {
                // Don't intercept if user is typing in an input
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();
                onChange(selectedTableId, []);
                setSelectedTableId(null);
            }
            // Clear selection on Escape
            if (e.key === 'Escape' && selectedTableId) {
                setSelectedTableId(null);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedTableId, onChange]);

    // Handle keyboard navigation
    const handleKeyDown = (
        e: React.KeyboardEvent,
        tableId: string,
        rowIndex: number,
        colIndex: number
    ) => {
        const target = e.target as HTMLInputElement;
        const key = e.key;

        // Select All (Ctrl+A)
        if ((e.ctrlKey || e.metaKey) && key === 'a') {
            e.preventDefault();
            setSelectedTableId(tableId);
            return;
        }

        // Delete selected table data (Delete or Backspace when table is selected)
        if (selectedTableId === tableId && (key === 'Delete' || key === 'Backspace')) {
            e.preventDefault();
            // Clear all data in the selected table
            onChange(tableId, []);
            setSelectedTableId(null);
            return;
        }

        // Clear selection on navigation
        if (selectedTableId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            setSelectedTableId(null);
        }

        // Navigation keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
            // Prevent default behavior for ArrowUp/ArrowDown on number inputs to stop value change
            if (target.type === 'number' && (key === 'ArrowUp' || key === 'ArrowDown')) {
                e.preventDefault();
            }

            let nextRow = rowIndex;
            let nextCol = colIndex;

            if (key === 'ArrowUp') {
                nextRow = rowIndex - 1;
            } else if (key === 'ArrowDown' || key === 'Enter') {
                nextRow = rowIndex + 1;
            } else if (key === 'ArrowLeft') {
                // Check if cursor is at the end or if text is selected
                if (target.selectionStart === null || target.selectionStart === 0 || (target.selectionStart === 0 && target.selectionEnd === target.value.length)) {
                    // Navigate Left (visually next column in RTL, so -1 if LTR, +1 if RTL)
                    // Assuming RTL direction for the app based on arabic text
                    nextCol = colIndex + 1;
                } else {
                    return; // Let default caret movement happen
                }
            } else if (key === 'ArrowRight') {
                // Check if cursor is at the start
                if (target.selectionStart === null || target.selectionStart === target.value.length || (target.selectionStart === 0 && target.selectionEnd === target.value.length)) {
                    // Navigate Right (visually previous column in RTL)
                    nextCol = colIndex - 1;
                } else {
                    return;
                }
            }

            // Find the next input
            const nextInput = document.querySelector(
                `input[data-table-id="${tableId}"][data-row-index="${nextRow}"][data-col-index="${nextCol}"], select[data-table-id="${tableId}"][data-row-index="${nextRow}"][data-col-index="${nextCol}"]`
            ) as HTMLElement;

            if (nextInput) {
                nextInput.focus();
                // Select all text for easier editing
                if (nextInput instanceof HTMLInputElement) {
                    nextInput.select();
                }
                e.preventDefault();
            }
        }
    };

    // Helper function to generate time headers based on inspection interval
    const generateTimeHeaders = (startTime: string, durationHours: number, intervalMinutes: number): string[] => {
        const headers: string[] = [];

        // Validate inputs
        if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) {
            console.warn('⚠️ Invalid startTime for generateTimeHeaders:', startTime, 'Using default 08:00');
            startTime = '08:00';
        }
        if (!durationHours || durationHours <= 0) {
            console.warn('⚠️ Invalid durationHours:', durationHours, 'Using default 8');
            durationHours = 8;
        }
        if (!intervalMinutes || intervalMinutes <= 0) {
            console.warn('⚠️ Invalid intervalMinutes:', intervalMinutes, 'Using default 30');
            intervalMinutes = 30;
        }

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const totalMinutes = durationHours * 60;
        const columnsCount = Math.floor(totalMinutes / intervalMinutes);

        for (let i = 0; i < columnsCount; i++) {
            const minutesFromStart = i * intervalMinutes;
            const totalMins = startHour * 60 + startMinute + minutesFromStart;
            const hour = Math.floor(totalMins / 60) % 24;
            const minute = totalMins % 60;
            headers.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }

        return headers;
    };

    // Helper function to render appropriate input based on cell data type
    const renderCellInput = (
        cellType: any,
        value: any,
        onChange: (newValue: any) => void,
        tableId: string,
        rowIndex: number,
        colIndex: number,
        options?: { min?: number | string; max?: number | string; step?: number; options?: string[]; disabled?: boolean; className?: string; onBlur?: () => void; format?: string }
    ) => {
        const { min, max, step, options: dropdownOptions, disabled, className = '', onBlur } = options || {};

        const isSelected = selectedTableId === tableId;

        const baseClass = cn(
            'w-full h-full px-3 py-2 text-center text-sm border-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200',
            'dark:bg-gray-800 dark:text-white min-h-[40px]',
            isSelected && 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100', // Highlight style
            className
        );

        const commonProps = {
            disabled,
            className: baseClass,
            'data-table-id': tableId,
            'data-row-index': rowIndex,
            'data-col-index': colIndex,
            onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, tableId, rowIndex, colIndex),
            onFocus: () => {
                // If we click into a cell (and it wasn't a Select All event), clear full selection
                // Note: onFocus fires involved in Ctrl+A too, so we need to be careful.
                // But Ctrl+A usually keeps focus on current cell.
                // We'll rely on global click or key press to clear. 
                // Simple approach: selection persists until user selects something else or navigates.
            },
            onClick: () => {
                if (selectedTableId) setSelectedTableId(null);
            }
        };

        switch (cellType) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    />
                );

            case 'integer':
                return (
                    <input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={onBlur}
                        min={min}
                        max={max}
                        step={step ?? "1"}
                        {...commonProps}
                    />
                );

            case 'decimal':
                return (
                    <input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onBlur={onBlur}
                        min={min}
                        max={max}
                        step={step ?? "0.01"}
                        {...commonProps}
                    />
                );

            case 'date':
                if (options?.format) {
                    const formatString = options.format;
                    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        if (!val) return;

                        // Simple regex validation based on common formats
                        // This can be expanded or replaced with a more robust library solution if needed
                        let isValidTimestamp = false;
                        const format = formatString.toUpperCase();

                        // Create a regex based on the format
                        // This is a basic implementation. For production, date-fns or dayjs parsing is better.
                        // Since 'dayjs' is in dependencies, let's use it for validation if possible.
                        // Assuming dayjs or similar is available in the project context or using a simple heuristic.

                        // Heuristic Regex generation
                        let regexStr = format
                            .replace('YYYY', '\\d{4}')
                            .replace('YY', '\\d{2}')
                            .replace('MM', '\\d{2}')
                            .replace('DD', '\\d{2}')
                            .replace(/\//g, '\\/')
                            .replace(/-/g, '\\-')
                            .replace(/\./g, '\\.');

                        const regex = new RegExp(`^${regexStr}$`);

                        if (!regex.test(val)) {
                            showToast('تنسيق غير صحيح', `التاريخ يجب أن يكون بالتنسيق: ${formatString}`);
                            onChange(undefined);
                            return;
                        }

                        // Limit Validation
                        const error = isDateValueInvalid(val, formatString, options.min, options.max);
                        if (error) {
                            let msg = '';
                            if (options.min && options.max) {
                                msg = `القيمة يجب أن تكون بين ${options.min} و ${options.max}`;
                            } else if (error === 'min') {
                                msg = `التاريخ يجب أن يكون بعد أو يساوي ${options.min}`;
                            } else {
                                msg = `التاريخ يجب أن يكون قبل أو يساوي ${options.max}`;
                            }
                            showToast('قيمة غير صالحة', msg);
                            // onChange(undefined); // KEEP VALUE
                            return;
                        }
                    };

                    return (
                        <input
                            type="text"
                            value={value ?? ''}
                            onChange={(e) => onChange(e.target.value || undefined)}
                            onBlur={handleBlur}
                            placeholder={formatString}
                            dir="ltr"
                            {...commonProps}
                        />
                    );
                }
                return (
                    <input
                        type="date"
                        value={value ?? ''}
                        min={options?.min?.toString()}
                        max={options?.max?.toString()}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    />
                );

            case 'time':
                if (options?.format) {
                    const formatString = options.format;
                    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        if (!val) return;

                        const format = formatString;
                        // HH:mm -> \d{2}:\d{2}
                        let regexStr = format
                            .replace('HH', '\\d{2}')
                            .replace('mm', '\\d{2}')
                            .replace('ss', '\\d{2}')
                            .replace(/:/g, ':'); // Colon doesn't need escape in regex usually, but safe to keep as is

                        const regex = new RegExp(`^${regexStr}$`);
                        if (!regex.test(val)) {
                            showToast('تنسيق غير صحيح', `الوقت يجب أن يكون بالتنسيق: ${formatString}`);
                            onChange(undefined);
                            return;
                        }

                        // Limit Validation
                        const error = isDateValueInvalid(val, formatString, options.min, options.max);
                        if (error) {
                            let msg = '';
                            if (options.min && options.max) {
                                msg = `القيمة يجب أن تكون بين ${options.min} و ${options.max}`;
                            } else if (error === 'min') {
                                msg = `الوقت يجب أن يكون بعد أو يساوي ${options.min}`;
                            } else {
                                msg = `الوقت يجب أن يكون قبل أو يساوي ${options.max}`;
                            }
                            showToast('قيمة غير صالحة', msg);
                            return;
                        }
                    };

                    return (
                        <input
                            type="text"
                            value={value ?? ''}
                            onChange={(e) => onChange(e.target.value || undefined)}
                            onBlur={handleBlur}
                            placeholder={formatString}
                            dir="ltr"
                            {...commonProps}
                        />
                    );
                }
                return (
                    <input
                        type="time"
                        value={value ?? ''}
                        min={options?.min?.toString()}
                        max={options?.max?.toString()}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    />
                );

            case 'datetime':
                if (options?.format) {
                    const formatString = options.format;
                    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                        const val = e.target.value;
                        if (!val) return;

                        const format = formatString.toUpperCase()
                            .replace('YYYY', '\\d{4}')
                            .replace('YY', '\\d{2}')
                            .replace('MM', '\\d{2}')
                            .replace('DD', '\\d{2}')
                            .replace('HH', '\\d{2}')
                            .replace('MM', '\\d{2}') // ambiguous MM for month and minute if not careful, but typically minutes are lowercase mm in formats like YYYY-MM-DD HH:mm
                        // Let's assume standard ISO-like or common formats where context implies. 
                        // To be safer, we'd replaced HH:mm specifically first if mixed.
                        // Re-doing strictly:

                        let safeRegex = formatString
                            .replace('YYYY', '\\d{4}')
                            .replace('YY', '\\d{2}')
                            .replace('MM', '\\d{2}')
                            .replace('DD', '\\d{2}')
                            .replace('HH', '\\d{2}')
                            .replace('mm', '\\d{2}')
                            .replace('ss', '\\d{2}')
                            .replace(/\//g, '\\/')
                            .replace(/-/g, '\\-')
                            .replace(/\./g, '\\.')
                            .replace(/:/g, ':');

                        const regex = new RegExp(`^${safeRegex}$`);
                        if (!regex.test(val)) {
                            showToast('تنسيق غير صحيح', `التاريخ والوقت يجب أن يكون بالتنسيق: ${formatString}`);
                            onChange(undefined);
                            return;
                        }

                        // Limit Validation
                        const error = isDateValueInvalid(val, formatString, options.min, options.max);
                        if (error) {
                            let msg = '';
                            if (options.min && options.max) {
                                msg = `القيمة يجب أن تكون بين ${options.min} و ${options.max}`;
                            } else if (error === 'min') {
                                msg = `التاريخ والوقت يجب أن يكون بعد أو يساوي ${options.min}`;
                            } else {
                                msg = `التاريخ والوقت يجب أن يكون قبل أو يساوي ${options.max}`;
                            }
                            showToast('قيمة غير صالحة', msg);
                            return;
                        }
                    };

                    return (
                        <input
                            type="text"
                            value={value ?? ''}
                            onChange={(e) => onChange(e.target.value || undefined)}
                            onBlur={handleBlur}
                            placeholder={formatString}
                            dir="ltr"
                            {...commonProps}
                        />
                    );
                }
                return (
                    <input
                        type="datetime-local"
                        value={value ?? ''}
                        min={options?.min?.toString()}
                        max={options?.max?.toString()}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    />
                );

            case 'boolean-check':
                return (
                    <select
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                        className={cn(
                            baseClass,
                            value === 'مقبول' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                            value === 'مرفوض' && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        )}
                    >
                        <option value="">اختر...</option>
                        <option value="مقبول">✔ مقبول</option>
                        <option value="مرفوض">✖ مرفوض</option>
                    </select>
                );

            case 'boolean-yesno':
                return (
                    <select
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                        className={cn(
                            baseClass,
                            value === 'نعم' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                            value === 'لا' && 'bg-gray-100 dark:bg-gray-700'
                        )}
                    >
                        <option value="">اختر...</option>
                        <option value="نعم">نعم</option>
                        <option value="لا">لا</option>
                    </select>
                );

            case 'dropdown':
                return (
                    <select
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    >
                        <option value="">اختر...</option>
                        {(dropdownOptions || []).map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );

            case 'image':
                const images = Array.isArray(value) ? value : (value ? [value] : []);

                return (
                    <div className="flex flex-wrap items-center gap-4 p-2 w-full min-w-[400px] min-h-[100px]">
                        {images.map((img: string, idx: number) => (
                            <div key={idx} className="relative group w-96 h-12 flex items-center justify-center border border-gray-200 rounded bg-white dark:bg-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <img
                                    src={img}
                                    alt={`Uploaded ${idx}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    className="absolute bg-red-500 text-white rounded-full p-1 -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newImages = images.filter((_, i) => i !== idx);
                                        if (onChange) onChange(newImages.length > 0 ? newImages : undefined);
                                    }}
                                    title="حذف الصورة"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}

                        <label className="flex flex-row items-center justify-center gap-2 w-96 h-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span className="text-gray-400 text-xl font-bold">+</span>
                            <span className="text-gray-400 text-xs text-center">
                                إضافة صورة
                                <span className="block text-[8px] text-gray-300">(1:8 Strip)</span>
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                        Promise.all(files.map(file => new Promise<string>((resolve) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }))).then(newDataUrls => {
                                            if (onChange) onChange([...images, ...newDataUrls]);
                                        });
                                    }
                                    // Reset input
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    </div>
                );

            case 'long-text':
                return (
                    <textarea
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                        className={cn(baseClass, "resize-none h-full min-h-[40px] leading-tight")}
                    />
                );

            default:
                // Fallback to text for unknown types
                return (
                    <input
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value || undefined)}
                        {...commonProps}
                    />
                );
        }
    };

    const renderParametersTable = (table: Table, tableData: any[][]) => {
        const parameters = table.parameters || [];
        const intervalMinutes = table.inspection_period || 30;

        // Calculate columns based on shift duration and inspection interval
        const timeHeaders = generateTimeHeaders(inspectionStartTime, shiftDuration, intervalMinutes);
        const rows = timeHeaders.length || table.rows || 10;

        // Helper to calculate value for a calculated parameter at a specific column
        const calculateParameterValue = (param: TableParameter, colIndex: number): number | null => {
            if (!param.is_calculated || !param.formula) return null;

            try {
                // Build variables object from all parameters in this table at this column
                const variables: Record<string, any> = {};
                parameters.forEach((p, pIndex) => {
                    const varName = p.name.replace(/\s+/g, '_');
                    const value = tableData?.[pIndex]?.[colIndex];
                    // Only include if value is a valid number and NOT an empty string
                    if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
                        variables[varName] = Number(value);
                    }
                });

                // Parse formula and replace references
                let hasMissingVariable = false;
                let processedFormula = param.formula;

                // 1. First, replace custom variables {متغير:name} with their values from template
                const customVariables = (_template.custom_variables || []).reduce((acc, v) => {
                    acc[v.name] = v.value;
                    return acc;
                }, {} as Record<string, any>);

                processedFormula = processedFormula.replace(/\{متغير:([^}]+)\}/g, (_, varName) => {
                    const value = customVariables[varName];
                    if (value !== undefined && value !== null) {
                        return String(value);
                    }
                    hasMissingVariable = true;
                    return '0';
                });

                // 2. Replace explicit global variables {Global:name}
                processedFormula = processedFormula.replace(/\{(?:متغير_عام|Global):([^}]+)\}/g, (_, varName) => {
                    const value = globalVariables[varName];
                    if (value !== undefined && value !== null) {
                        return String(value);
                    }

                    // Try to finding it by name directly if the key in globalVariables is just "Name"
                    if (globalVariables[varName] !== undefined) {
                        return String(globalVariables[varName]);
                    }

                    hasMissingVariable = true;
                    return '0';
                });

                // 3. Replace generic references {name}
                // Order of precedence: Local Parameter > Global Variable
                processedFormula = processedFormula.replace(/\{([^}]+)\}/g, (_, ref) => {
                    const varName = ref.replace(/\s+/g, '_');

                    // A. Check local parameters (table columns)
                    if (variables[varName] !== undefined) {
                        return String(variables[varName]);
                    }

                    // B. Check global variables (fallback)
                    if (globalVariables[ref] !== undefined) {
                        return String(globalVariables[ref]);
                    }
                    if (globalVariables[varName] !== undefined) {
                        return String(globalVariables[varName]);
                    }

                    // C. Missing
                    hasMissingVariable = true;
                    return '0';
                });

                // If any required variable is missing, return null so it doesn't skew stats
                if (hasMissingVariable) return null;

                // Evaluate the formula using the robust FormulaEngine
                // This supports advanced functions (sin, cos, sqrt, etc.) which the old eval method did not
                const result = evaluateExpression(processedFormula);
                return typeof result === 'number' && !isNaN(result) ? result : null;
            } catch (error) {
                console.error('Error calculating formula:', error);
                return null;
            }
        };

        // Get stopped times for this table's group
        const linkedGroup = table.linked_stop_group;
        const stoppedTimes = linkedGroup ? (stoppedTimesByGroup[linkedGroup] || []) : [];

        // Check if a column is stopped based on its time
        const isColumnStopped = (colIndex: number): boolean => {
            if (linkedGroup) {
                const timeValue = timeHeaders[colIndex];
                return stoppedTimes.includes(timeValue);
            } else {
                // Check from tableData's stop row
                const stopRowIndex = parameters.length;
                return tableData?.[stopRowIndex]?.[colIndex] === true;
            }
        };

        // Toggle column stop status and clear data if stopping
        const toggleColumnStop = (colIndex: number) => {
            const timeValue = timeHeaders[colIndex];

            if (!linkedGroup) {
                // If no linked group, handle locally in tableData
                const stopRowIndex = parameters.length;
                const newData = [...(tableData || [])];
                if (!newData[stopRowIndex]) {
                    newData[stopRowIndex] = [];
                }
                const isCurrentlyStopped = newData[stopRowIndex][colIndex] === true;

                // If we're stopping (not resuming), clear all data in this column
                if (!isCurrentlyStopped) {
                    for (let i = 0; i < parameters.length; i++) {
                        if (newData[i]) {
                            newData[i][colIndex] = undefined;
                        }
                    }
                }

                newData[stopRowIndex][colIndex] = !isCurrentlyStopped;
                onChange(table.id, newData);
            } else {
                // If linked group exists, update stopped times globally
                const isCurrentlyStopped = stoppedTimes.includes(timeValue);
                const newStoppedTimes = isCurrentlyStopped
                    ? stoppedTimes.filter(t => t !== timeValue)
                    : [...stoppedTimes, timeValue];

                // If we're stopping (not resuming), clear all data in this column
                if (!isCurrentlyStopped) {
                    const newData = [...(tableData || [])];
                    for (let i = 0; i < parameters.length; i++) {
                        if (newData[i]) {
                            newData[i][colIndex] = undefined;
                        }
                    }
                    onChange(table.id, newData);
                }

                if (onStoppedTimesChange) {
                    onStoppedTimesChange(linkedGroup, newStoppedTimes);
                }
            }
        };

        // Calculate column widths based on priority:
        // 1. Parameters column: auto-fit content (minimum 200px, will be widest)
        // 2. Limits column: auto-fit content (minimum 100px)
        // 3. AVG/STD: fixed 100px each
        // 4. Time columns: equal width distribution across remaining space


        return (
            <div className="overflow-x-auto print-table-container">
                <table className="w-full border-collapse table-fixed print:table-fixed">
                    <colgroup className="print:hidden">
                        {/* Parameter Column - Widest and Fixed */}
                        <col style={{ width: '300px' }} />
                        {/* Boundary/Limits Column */}
                        <col style={{ width: '150px' }} />
                        {/* Time Headers - Distributed evenly on remaining space */}
                        {timeHeaders.map((_, i) => (
                            <col key={i} />
                        ))}
                        {/* Stats Columns - Fixed 100px */}
                        {table.features?.show_avg && (
                            <col style={{ width: '100px' }} />
                        )}
                        {table.features?.show_std && (
                            <col style={{ width: '100px' }} />
                        )}
                    </colgroup>
                    {/* Print-specific colgroup with percentages */}
                    <colgroup className="hidden print:table-column-group">
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '8%' }} />
                        {timeHeaders.map((_, i) => (
                            <col key={i} />
                        ))}
                        {table.features?.show_avg && (
                            <col style={{ width: '6%' }} />
                        )}
                        {table.features?.show_std && (
                            <col style={{ width: '6%' }} />
                        )}
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                                المعلمة
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs font-medium whitespace-nowrap">
                                الحدود
                            </th>
                            {timeHeaders.map((time, i) => (
                                <th
                                    key={i}
                                    className={cn(
                                        "border border-gray-300 dark:border-gray-600 px-2 py-3 text-center text-xs font-medium",
                                        isColumnStopped(i) && "bg-orange-200 dark:bg-orange-800"
                                    )}
                                >
                                    <div className="whitespace-nowrap overflow-hidden text-ellipsis">{time}</div>
                                </th>
                            ))}
                            {table.features?.show_avg && (
                                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-sm font-medium bg-blue-50 dark:bg-blue-900">
                                    AVG
                                </th>
                            )}
                            {table.features?.show_std && (
                                <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-sm font-medium bg-purple-50 dark:bg-purple-900">
                                    STD
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((param, paramIndex) => {
                            const rowData = tableData?.[paramIndex] || [];
                            const isCalculated = param.is_calculated && param.formula;

                            // Get numeric values for stats calculation
                            const numericValues: number[] = [];
                            for (let colIndex = 0; colIndex < rows; colIndex++) {
                                if (isColumnStopped(colIndex)) continue;

                                let val: any;
                                if (isCalculated) {
                                    val = calculateParameterValue(param, colIndex);
                                } else {
                                    val = rowData[colIndex];
                                }

                                if (typeof val === 'number' && !isNaN(val)) {
                                    numericValues.push(val);
                                }
                            }

                            const stats = calculateStats(numericValues);

                            return (
                                <tr key={paramIndex} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium whitespace-nowrap">
                                        {param.name}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                        {param.min !== undefined && param.max !== undefined
                                            ? `${param.min} - ${param.max}`
                                            : param.limits || '-'}
                                        {param.unit && (
                                            <span className="text-gray-500 text-xs mr-1"> ({param.unit})</span>
                                        )}
                                    </td>
                                    {Array.from({ length: rows }).map((_, colIndex) => {
                                        const stopped = isColumnStopped(colIndex);

                                        // Check if this is a calculated parameter
                                        const isCalculated = param.is_calculated && param.formula;
                                        let displayValue = rowData[colIndex];

                                        if (isCalculated && !stopped) {
                                            // Calculate the value based on formula
                                            const calculatedValue = calculateParameterValue(param, colIndex);
                                            if (calculatedValue !== null) {
                                                displayValue = calculatedValue;
                                            }
                                        }

                                        let isValid = true;
                                        if (param.min !== undefined && param.max !== undefined && displayValue !== undefined) {
                                            if (typeof displayValue === 'number') {
                                                isValid = isInRange(displayValue, Number(param.min), Number(param.max));
                                            } else if (typeof displayValue === 'string' && (param.type === 'date' || param.type === 'time' || param.type === 'datetime') && param.format) {
                                                isValid = !isDateValueInvalid(displayValue, param.format, param.min, param.max);
                                            }
                                        }

                                        // ABC Logic Validation
                                        let isAbcViolation = false;
                                        if (param.enable_abc_logic) {
                                            const val = String(displayValue || '').trim().toUpperCase();
                                            if (val === 'C') {
                                                isAbcViolation = true;
                                            } else if (val === 'B') {
                                                const rowData = tableData ? tableData[paramIndex] : [];
                                                // Check immediate horizontal neighbors
                                                const prevVal = rowData && rowData[colIndex - 1] ? String(rowData[colIndex - 1]).trim().toUpperCase() : '';
                                                const nextVal = rowData && rowData[colIndex + 1] ? String(rowData[colIndex + 1]).trim().toUpperCase() : '';

                                                if (prevVal === 'B' || nextVal === 'B') {
                                                    isAbcViolation = true;
                                                }
                                            }
                                        }

                                        return (
                                            <td
                                                key={colIndex}
                                                className={cn(
                                                    'border border-gray-300 dark:border-gray-600 p-0',
                                                    (!isValid || isAbcViolation) && !stopped && 'bg-red-100 dark:bg-red-900',
                                                    stopped && 'bg-orange-100 dark:bg-orange-900',
                                                    isCalculated && !stopped && 'bg-blue-50 dark:bg-blue-900/30'
                                                )}
                                            >
                                                {stopped ? (
                                                    <div className="w-full h-full px-2 py-1 text-center text-sm text-orange-600 dark:text-orange-400 font-medium bg-orange-100 dark:bg-orange-900">
                                                        STOP
                                                    </div>
                                                ) : isCalculated ? (
                                                    // Display calculated value as read-only
                                                    <div
                                                        className={cn(
                                                            "w-full h-full px-2 py-2 text-center text-sm font-medium",
                                                            !isValid ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'
                                                        )}
                                                        title={`معادلة: ${param.formula}`}
                                                    >
                                                        {displayValue !== undefined && displayValue !== null
                                                            ? (typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue)
                                                            : '-'}
                                                    </div>
                                                ) : (
                                                    renderCellInput(
                                                        param.type,
                                                        displayValue,
                                                        (newValue) => {
                                                            const newData = [...(tableData || [])];
                                                            if (!newData[paramIndex]) {
                                                                newData[paramIndex] = [];
                                                            }
                                                            newData[paramIndex][colIndex] = newValue;
                                                            onChange(table.id, newData);
                                                        },
                                                        table.id,
                                                        paramIndex,
                                                        colIndex,
                                                        {
                                                            min: param.min,
                                                            max: param.max,
                                                            options: param.options,
                                                            format: param.format,
                                                            step: typeof param.step === 'string' ? parseFloat(param.step) : param.step,
                                                            className: (!isValid || isAbcViolation) ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : ''
                                                        }
                                                    )
                                                )}
                                            </td>
                                        );
                                    })}
                                    {table.features?.show_avg && (
                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-sm font-medium bg-blue-50 dark:bg-blue-900">
                                            {numericValues.length > 0 ? stats.avg.toFixed(2) : '-'}
                                        </td>
                                    )}
                                    {table.features?.show_std && (
                                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-sm font-medium bg-purple-50 dark:bg-purple-900">
                                            {numericValues.length > 0 ? stats.std.toFixed(2) : '-'}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {/* Stop Control Row */}
                        <tr className="bg-gray-50 dark:bg-gray-750">
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-500">
                                حالة الفحص
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-xs text-gray-500">
                                اضغط للإيقاف
                            </td>
                            {Array.from({ length: rows }).map((_, colIndex) => {
                                const stopped = isColumnStopped(colIndex);
                                return (
                                    <td
                                        key={colIndex}
                                        className="border border-gray-300 dark:border-gray-600 p-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleColumnStop(colIndex)}
                                            className={cn(
                                                'w-full px-2 py-1.5 text-xs font-medium rounded transition-colors min-w-[60px]',
                                                stopped
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                            )}
                                            title={stopped ? 'اضغط لاستئناف الفحص' : 'اضغط لإيقاف الفحص'}
                                        >
                                            {stopped ? (
                                                <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M5 3.5h1.5v9H5v-9zm4.5 0H11v9H9.5v-9z" />
                                                </svg>
                                            )}
                                        </button>
                                    </td>
                                );
                            })}
                            {table.features?.show_avg && (
                                <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 bg-blue-50 dark:bg-blue-900"></td>
                            )}
                            {table.features?.show_std && (
                                <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 bg-purple-50 dark:bg-purple-900"></td>
                            )}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const renderSampleTable = (table: Table, tableData: any[][], template: FormTemplate) => {
        const sampleSize = table.sample_size || 20;
        const intervalMinutes = table.inspection_period || 30;

        // Calculate time-based columns
        const timeHeaders = generateTimeHeaders(inspectionStartTime, shiftDuration, intervalMinutes);
        const columns = timeHeaders.length;

        // Get Tare calculation settings from template basic_info
        const standardWeight = template.basic_info?.standard_weight;
        const aqlLevel = template.basic_info?.aql_level || '1.0';
        const showTare1 = table.features?.calculate_tare1 && standardWeight;
        const showTare2 = table.features?.calculate_tare2 && standardWeight;
        const showAverage = table.features?.calculate_average;
        const showStd = table.features?.calculate_std;

        // Calculate Tare values
        const tare1Value = standardWeight ? calculateTare1(standardWeight) : 0;
        const tare2Value = standardWeight ? calculateTare2(standardWeight) : 0;

        // Get AQL limits to show acceptance number
        const aqlLimits = standardWeight ? getAQLLimits(aqlLevel, sampleSize) : { acceptance: 0, rejection: 1 };

        // Get stopped times for this table's group
        const linkedGroup = table.linked_stop_group;
        const stoppedTimes = linkedGroup ? (stoppedTimesByGroup[linkedGroup] || []) : (stoppedTimesByGroup[table.id] || []);

        // Check if a column is stopped based on its time
        const isColumnStopped = (colIndex: number): boolean => {
            const timeValue = timeHeaders[colIndex];
            // Check in linked group if available, otherwise check local stopped times
            return stoppedTimes.includes(timeValue);
        };

        // Toggle column stop status
        const toggleColumnStop = (colIndex: number) => {
            const timeValue = timeHeaders[colIndex];

            // Toggle stop status
            const isCurrentlyStopped = stoppedTimes.includes(timeValue);
            const newStoppedTimes = isCurrentlyStopped
                ? stoppedTimes.filter(t => t !== timeValue)
                : [...stoppedTimes, timeValue];

            // If we're stopping (not resuming), clear all data in this column
            if (!isCurrentlyStopped) {
                const newData = [...(tableData || [])];
                for (let i = 0; i < sampleSize; i++) {
                    if (newData[i]) {
                        newData[i][colIndex] = undefined;
                    }
                }
                onChange(table.id, newData);
            }

            // Update stopped times (works with or without linked group)
            if (onStoppedTimesChange) {
                onStoppedTimesChange(linkedGroup || table.id, newStoppedTimes);
            }
        };

        // Validate column for Tare1 and Tare2
        const getColumnValidation = (colIndex: number) => {
            const columnWeights: (number | undefined)[] = [];
            for (let i = 0; i < sampleSize; i++) {
                const val = tableData?.[i]?.[colIndex];
                columnWeights.push(val !== undefined && val !== '' ? parseFloat(val) : undefined);
            }

            if (!standardWeight) {
                return { status: 'مقبول' as const, reason: 'لا يوجد وزن قياسي', isEmpty: false };
            }

            // Check if column is empty (all values are undefined)
            const isEmpty = columnWeights.every(w => w === undefined);
            if (isEmpty) {
                return { status: null, reason: 'عمود فارغ', isEmpty: true };
            }

            const validation = validateColumn(columnWeights, tare1Value, tare2Value, aqlLevel);
            return { ...validation, isEmpty: false };
        };

        // Calculate average for a column
        const getColumnAverage = (colIndex: number): number | null => {
            const columnValues: number[] = [];
            for (let i = 0; i < sampleSize; i++) {
                const val = tableData?.[i]?.[colIndex];
                if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
                    columnValues.push(parseFloat(val));
                }
            }

            if (columnValues.length === 0) return null;

            const sum = columnValues.reduce((acc, val) => acc + val, 0);
            return sum / columnValues.length;
        };

        // Calculate STD for a column
        const getColumnSTD = (colIndex: number): number | null => {
            const columnValues: number[] = [];
            for (let i = 0; i < sampleSize; i++) {
                const val = tableData?.[i]?.[colIndex];
                if (val !== undefined && val !== '' && !isNaN(parseFloat(val))) {
                    columnValues.push(parseFloat(val));
                }
            }

            if (columnValues.length < 2) return null;

            const average = columnValues.reduce((acc, val) => acc + val, 0) / columnValues.length;
            const variance = columnValues.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / (columnValues.length - 1);
            return Math.sqrt(variance);
        };

        return (
            <div className="overflow-x-auto print-table-container">
                <table className="w-full border-collapse table-fixed print:table-fixed">
                    <colgroup className="print:hidden">
                        <col style={{ width: '100px' }} />
                        {timeHeaders.map((_, i) => (
                            <col key={i} />
                        ))}
                    </colgroup>
                    {/* Print-specific colgroup with percentages */}
                    <colgroup className="hidden print:table-column-group">
                        <col style={{ width: '10%' }} />
                        {timeHeaders.map((_, i) => (
                            <col key={i} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs font-medium print:text-[7px] print:px-1 print:py-1">
                                العينة #
                            </th>
                            {timeHeaders.map((time, i) => (
                                <th
                                    key={i}
                                    className={cn(
                                        "border border-gray-300 dark:border-gray-600 px-2 py-3 text-center text-xs font-medium print:text-[7px] print:px-0.5 print:py-1",
                                        isColumnStopped(i) && "bg-orange-200 dark:bg-orange-800"
                                    )}
                                >
                                    <div className="whitespace-nowrap overflow-hidden text-ellipsis">{time}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Sample Data Rows */}
                        {Array.from({ length: sampleSize }).map((_, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs text-gray-500 font-medium">
                                    {rowIndex + 1}
                                </td>
                                {Array.from({ length: columns }).map((_, colIndex) => {
                                    const value = tableData?.[rowIndex]?.[colIndex];
                                    const stopped = isColumnStopped(colIndex);

                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 p-0',
                                                stopped && 'bg-orange-100 dark:bg-orange-900'
                                            )}
                                        >
                                            {stopped ? (
                                                <div className="w-full h-full px-2 py-1 text-center text-sm text-orange-600 dark:text-orange-400 font-medium bg-orange-100 dark:bg-orange-900">
                                                    STOP
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    'w-full h-full',
                                                    flashingCell === `${table.id}-${rowIndex}-${colIndex}` && 'animate-flash'
                                                )}>
                                                    {renderCellInput(
                                                        'decimal',
                                                        value,
                                                        (newValue) => {
                                                            const oldValue = tableData?.[rowIndex]?.[colIndex];
                                                            if (oldValue !== undefined && oldValue !== null && oldValue !== '' &&
                                                                (newValue === undefined || newValue === null || newValue === '')) {
                                                                const cellKey = `${table.id}-${rowIndex}-${colIndex}`;
                                                                setFlashingCell(cellKey);
                                                                setTimeout(() => setFlashingCell(null), 600);
                                                            }
                                                            const newData = [...(tableData || [])];
                                                            if (!newData[rowIndex]) {
                                                                newData[rowIndex] = [];
                                                            }
                                                            newData[rowIndex][colIndex] = newValue;
                                                            onChange(table.id, newData);
                                                        },
                                                        table.id,
                                                        rowIndex,
                                                        colIndex,
                                                        {
                                                            min: (() => {
                                                                const constraints = table.number_constraints;
                                                                let minVal = constraints?.min;
                                                                if (constraints?.allow_negative === false) {
                                                                    minVal = minVal !== undefined ? Math.max(0, minVal) : 0;
                                                                }
                                                                return minVal;
                                                            })(),
                                                            max: table.number_constraints?.max,
                                                            step: table.number_constraints?.step,
                                                            onBlur: () => {
                                                                const constraints = table.number_constraints;
                                                                let min = constraints?.min;
                                                                if (constraints?.allow_negative === false) {
                                                                    min = min !== undefined ? Math.max(0, min) : 0;
                                                                }
                                                                const max = constraints?.max;
                                                                const currentValue = tableData?.[rowIndex]?.[colIndex];
                                                                if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
                                                                    const numValue = typeof currentValue === 'number' ? currentValue : parseFloat(currentValue);
                                                                    if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
                                                                        const cellKey = `${table.id}-${rowIndex}-${colIndex}`;
                                                                        setFlashingCell(cellKey);
                                                                        setTimeout(() => setFlashingCell(null), 600);
                                                                        let errorMsg = 'القيمة خارج النطاق المسموح';
                                                                        if (min !== undefined && max !== undefined) {
                                                                            errorMsg = `القيمة يجب أن تكون بين ${min} و ${max}`;
                                                                        } else if (min !== undefined) {
                                                                            errorMsg = `القيمة يجب أن تكون أكبر من أو تساوي ${min}`;
                                                                        } else if (max !== undefined) {
                                                                            errorMsg = `القيمة يجب أن تكون أقل من أو تساوي ${max}`;
                                                                        }
                                                                        showToast('خطأ في إدخال البيانات', errorMsg);
                                                                        setTimeout(() => {
                                                                            const newData = [...(tableData || [])];
                                                                            if (!newData[rowIndex]) {
                                                                                newData[rowIndex] = [];
                                                                            }
                                                                            newData[rowIndex][colIndex] = undefined;
                                                                            onChange(table.id, newData);
                                                                        }, 100);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Average Row */}
                        {showAverage && (
                            <tr className="border-t-2 border-gray-300 dark:border-gray-600 h-[32px] bg-blue-50 dark:bg-blue-900/20">
                                <td className="border border-gray-300 dark:border-gray-600 px-2 bg-gray-100 dark:bg-gray-800">
                                    <div className="flex items-center justify-center gap-1 h-[32px]">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">AVG</span>
                                        {standardWeight && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                (≥{standardWeight})
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {Array.from({ length: columns }).map((_, colIndex) => {
                                    const stopped = isColumnStopped(colIndex);
                                    const average = !stopped ? getColumnAverage(colIndex) : null;
                                    const isBelowStandard = average !== null && standardWeight && average < standardWeight;

                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2',
                                                stopped && 'bg-orange-100 dark:bg-orange-900',
                                                !stopped && average !== null && isBelowStandard && 'bg-red-100 dark:bg-red-900',
                                                !stopped && average !== null && !isBelowStandard && 'bg-green-100 dark:bg-green-900'
                                            )}
                                        >
                                            <div className="flex items-center justify-center h-[32px]">
                                                {stopped ? (
                                                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                        STOP
                                                    </span>
                                                ) : average !== null ? (
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {average.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        -
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        )}

                        {/* STD Row */}
                        {showStd && (
                            <tr className="h-[32px] bg-blue-50 dark:bg-blue-900/20">
                                <td className="border border-gray-300 dark:border-gray-600 px-2 bg-gray-100 dark:bg-gray-800">
                                    <div className="flex items-center justify-center gap-1 h-[32px]">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">STD</span>
                                        {table.max_std && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                (≤{table.max_std})
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {Array.from({ length: columns }).map((_, colIndex) => {
                                    const stopped = isColumnStopped(colIndex);
                                    const std = !stopped ? getColumnSTD(colIndex) : null;
                                    const maxStd = table.max_std;

                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2',
                                                stopped && 'bg-orange-100 dark:bg-orange-900',
                                                !stopped && std !== null && maxStd && std > maxStd && 'bg-red-100 dark:bg-red-900',
                                                !stopped && std !== null && maxStd && std <= maxStd && 'bg-green-100 dark:bg-green-900',
                                                !stopped && std !== null && !maxStd && 'bg-blue-50 dark:bg-blue-900/30'
                                            )}
                                        >
                                            <div className="flex items-center justify-center h-[32px]">
                                                {stopped ? (
                                                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                        STOP
                                                    </span>
                                                ) : std !== null ? (
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {std.toFixed(3)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        -
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        )}

                        {/* Tare 1 Row */}
                        {showTare1 && (
                            <tr className="border-t-2 border-gray-300 dark:border-gray-600 h-[32px] bg-blue-50 dark:bg-blue-900/20">
                                <td className="border border-gray-300 dark:border-gray-600 px-2 bg-gray-100 dark:bg-gray-800">
                                    <div className="flex items-center justify-center gap-1 h-[32px]">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">T1</span>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                            (≤{aqlLimits.acceptance})
                                        </span>
                                    </div>
                                </td>
                                {Array.from({ length: columns }).map((_, colIndex) => {
                                    const stopped = isColumnStopped(colIndex);
                                    const validation = !stopped ? getColumnValidation(colIndex) : null;

                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2',
                                                stopped && 'bg-orange-100 dark:bg-orange-900',
                                                !stopped && validation?.status === 'مقبول' && 'bg-green-100 dark:bg-green-900',
                                                !stopped && validation?.status === 'مرفوض' && 'bg-red-100 dark:bg-red-900'
                                            )}
                                        >
                                            <div className="flex items-center justify-center h-[32px]">
                                                {stopped ? (
                                                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                        STOP
                                                    </span>
                                                ) : validation?.isEmpty ? (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        -
                                                    </span>
                                                ) : validation?.status === 'مقبول' ? (
                                                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">
                                                        ✗
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        )}

                        {/* Tare 2 Row */}
                        {showTare2 && (
                            <tr className="h-[32px] bg-blue-50 dark:bg-blue-900/20">
                                <td className="border border-gray-300 dark:border-gray-600 px-2 bg-gray-100 dark:bg-gray-800">
                                    <div className="flex items-center justify-center gap-1 h-[32px]">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">T2</span>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                            (≤0)
                                        </span>
                                    </div>
                                </td>
                                {Array.from({ length: columns }).map((_, colIndex) => {
                                    const stopped = isColumnStopped(colIndex);
                                    const validation = !stopped ? getColumnValidation(colIndex) : null;

                                    return (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                'border border-gray-300 dark:border-gray-600 px-2',
                                                stopped && 'bg-orange-100 dark:bg-orange-900',
                                                !stopped && validation?.status === 'مقبول' && 'bg-green-100 dark:bg-green-900',
                                                !stopped && validation?.status === 'مرفوض' && 'bg-red-100 dark:bg-red-900'
                                            )}
                                        >
                                            <div className="flex items-center justify-center h-[32px]">
                                                {stopped ? (
                                                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                        STOP
                                                    </span>
                                                ) : validation?.isEmpty ? (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        -
                                                    </span>
                                                ) : validation?.status === 'مقبول' ? (
                                                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">
                                                        ✗
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        )}

                        {/* Stop Control Row */}
                        <tr className="bg-gray-50 dark:bg-gray-750 border-t-2 border-gray-400 dark:border-gray-600">
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-500">
                                حالة الفحص
                            </td>
                            {Array.from({ length: columns }).map((_, colIndex) => {
                                const stopped = isColumnStopped(colIndex);
                                return (
                                    <td
                                        key={colIndex}
                                        className="border border-gray-300 dark:border-gray-600 p-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleColumnStop(colIndex)}
                                            className={cn(
                                                'w-full px-2 py-1.5 text-xs font-medium rounded transition-colors min-w-[60px]',
                                                stopped
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                            )}
                                            title={stopped ? 'اضغط لاستئناف الفحص' : 'اضغط لإيقاف الفحص'}
                                        >
                                            {stopped ? (
                                                <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M5 3.5h1.5v9H5v-9zm4.5 0H11v9H9.5v-9z" />
                                                </svg>
                                            )}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div >
        );
    };

    const renderCustomTable = (table: Table, tableData: any[][]) => {
        const columns = table.columns || [];
        const baseRows = table.rows || 10;
        const allowDynamicRows = table.allowDynamicRows || false;

        // Ensure tableData is always an array
        const safeTableData = Array.isArray(tableData) ? tableData : [];

        // Calculate actual rows based on mode
        const actualRows = allowDynamicRows
            ? Math.max(safeTableData.length, 1) // At least 1 row when dynamic
            : baseRows;

        // Fixed column widths for custom table
        const rowNumWidth = 50; // Row number column width
        const actionColWidth = allowDynamicRows ? 40 : 0; // Action column width
        const customColWidth = 150; // Fixed width for each custom column

        const addRow = () => {
            const newData = [...safeTableData];
            newData.push(new Array(columns.length).fill(undefined));
            onChange(table.id, newData);
            // Scroll to show the new row
            setTimeout(() => {
                const addButton = document.querySelector(`[data-table-id="${table.id}"] .add-row-button`);
                if (addButton) {
                    addButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        };

        const removeRow = (rowIndex: number) => {
            if (safeTableData.length <= 1) return; // Keep at least one row
            const newData = safeTableData.filter((_, i) => i !== rowIndex);
            onChange(table.id, newData);
        };

        return (
            <div className="space-y-2" data-table-id={table.id}>
                <div className="overflow-x-auto">
                    <table className="border-collapse table-fixed" style={{ minWidth: 'max-content' }}>
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th
                                    className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs font-medium"
                                    style={{ width: `${rowNumWidth}px`, minWidth: `${rowNumWidth}px`, maxWidth: `${rowNumWidth}px` }}
                                >
                                    #
                                </th>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-sm font-medium"
                                        style={{ width: `${customColWidth}px`, minWidth: `${customColWidth}px`, maxWidth: `${customColWidth}px` }}
                                    >
                                        <div className="whitespace-nowrap overflow-hidden text-ellipsis">{col.label}</div>
                                    </th>
                                ))}
                                {allowDynamicRows && (
                                    <th
                                        className="border border-gray-300 dark:border-gray-600 px-1 py-3 text-center text-xs font-medium"
                                        style={{ width: `${actionColWidth}px`, minWidth: `${actionColWidth}px` }}
                                    >
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: actualRows }).map((_, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-750 group">
                                    <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs text-gray-500 font-medium">
                                        {rowIndex + 1}
                                    </td>
                                    {columns.map((col, colIndex) => {
                                        const value = safeTableData?.[rowIndex]?.[colIndex];

                                        return (
                                            <td
                                                key={col.key}
                                                className="border border-gray-300 dark:border-gray-600 p-0"
                                            >
                                                {renderCellInput(
                                                    col.type,
                                                    value,
                                                    (newValue) => {
                                                        const newData = [...safeTableData];
                                                        // Ensure we have enough rows
                                                        while (newData.length <= rowIndex) {
                                                            newData.push(new Array(columns.length).fill(undefined));
                                                        }
                                                        if (!newData[rowIndex]) newData[rowIndex] = [];
                                                        newData[rowIndex][colIndex] = newValue;
                                                        onChange(table.id, newData);
                                                    },
                                                    table.id,
                                                    rowIndex,
                                                    colIndex,
                                                    {
                                                        min: col.min,
                                                        max: col.max,
                                                        options: col.options,
                                                        format: col.format
                                                    }
                                                )}
                                            </td>
                                        );
                                    })}
                                    {allowDynamicRows && (
                                        <td className="border border-gray-300 dark:border-gray-600 p-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(rowIndex)}
                                                disabled={safeTableData.length <= 1}
                                                className={cn(
                                                    "p-1 rounded transition-colors",
                                                    safeTableData.length <= 1
                                                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                                        : "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                )}
                                                title="حذف الصف"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {allowDynamicRows && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="add-row-button flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        إضافة صف جديد
                    </button>
                )}
            </div>
        );
    };

    const renderChecklist = (table: Table, tableData: any[][]) => {
        const items = table.items || [];

        return (
            <div className="space-y-2">
                {items.map((item, index) => {
                    const status = tableData?.[index]?.[0];
                    const notes = tableData?.[index]?.[1] || '';

                    return (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        >
                            <div className="flex-1">
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {item.text}
                                </span>
                                {item.required && (
                                    <span className="text-red-500 mr-1">*</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={status || ''}
                                    onChange={(e) => {
                                        const newData = [...(tableData || [])];
                                        if (!newData[index]) newData[index] = [];
                                        newData[index][0] = e.target.value;
                                        onChange(table.id, newData);
                                    }}
                                    className={cn(
                                        'px-3 py-1 text-sm border rounded-lg dark:bg-gray-700',
                                        status === 'ok' && 'bg-green-100 border-green-300 text-green-700',
                                        status === 'not_ok' && 'bg-red-100 border-red-300 text-red-700',
                                        status === 'na' && 'bg-gray-100 border-gray-300 text-gray-700'
                                    )}
                                >
                                    <option value="">اختر...</option>
                                    <option value="ok">OK ✓</option>
                                    <option value="not_ok">NOT OK ✗</option>
                                    <option value="na">N/A</option>
                                </select>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => {
                                        const newData = [...(tableData || [])];
                                        if (!newData[index]) newData[index] = [];
                                        newData[index][1] = e.target.value;
                                        onChange(table.id, newData);
                                    }}
                                    placeholder="ملاحظات"
                                    className="px-2 py-1 text-sm border rounded-lg dark:bg-gray-700 w-32"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // جدول تتبع الوصفات والخامات
    const renderRecipeTraceabilityTable = (table: Table, tableData: any[][]) => {
        return (
            <RecipeTraceabilityTable
                table={table}
                tableData={tableData}
                onChange={onChange}
                template={_template}
            />
        );
    };

    const renderTable = (table: Table) => {
        const tableData = formData?.tables?.[table.id]?.data || [];
        const isSelected = selectedTableId === table.id;

        return (
            <div
                key={table.id}
                className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-all",
                    isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/30 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                )}
                onClick={() => {
                    // Click outside inputs to deselect
                    if (isSelected) {
                        setSelectedTableId(null);
                    }
                }}
            >
                {isSelected && (
                    <div className="bg-blue-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
                        <span>✓ تم تحديد الجدول - اضغط Delete لحذف جميع البيانات أو Escape للإلغاء</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(table.id, []);
                                setSelectedTableId(null);
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
                        >
                            حذف الكل
                        </button>
                    </div>
                )}
                <div className={cn(
                    "px-4 py-3 border-b border-gray-200 dark:border-gray-700",
                    isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "bg-gray-50 dark:bg-gray-900"
                )}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{table.name}</h4>
                            {table.inspection_period && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    فترة الفحص: {table.inspection_period} دقيقة
                                </p>
                            )}
                        </div>
                        {table.linked_stop_group && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span>مربوط: {table.linked_stop_group}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4">
                    {table.type === 'parameters' && renderParametersTable(table, tableData)}
                    {table.type === 'sample' && renderSampleTable(table, tableData, _template)}
                    {table.type === 'custom' && renderCustomTable(table, tableData)}
                    {table.type === 'printing_verification' && renderCustomTable(table, tableData)}
                    {table.type === 'checklist' && renderChecklist(table, tableData)}
                    {table.type === 'recipe-traceability' && renderRecipeTraceabilityTable(table, tableData)}
                </div>

                {/* Table Notes Section - Collapsible */}
                <div className="px-4 pb-4">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpandedNotes(prev => ({
                                    ...prev,
                                    [table.id]: !prev[table.id]
                                }));
                            }}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${expandedNotes[table.id] ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            ملاحظات
                            {(tableNotes[table.id] || formData?.tables?.[table.id]?.notes) && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                    يوجد ملاحظات
                                </span>
                            )}
                        </button>

                        {expandedNotes[table.id] && (
                            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                <textarea
                                    value={tableNotes[table.id] || formData?.tables?.[table.id]?.notes || ''}
                                    onChange={(e) => {
                                        if (onTableNotesChange) {
                                            onTableNotesChange(table.id, e.target.value);
                                        }
                                    }}
                                    placeholder="أضف ملاحظاتك هنا... (اختياري)"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none transition-colors"
                                    rows={3}
                                    dir="rtl"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {section.name}
                </h3>
                {section.description && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        - {section.description}
                    </span>
                )}
            </div>

            {(!section.tables || section.tables.length === 0) ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    لا توجد جداول في هذا القسم
                </div>
            ) : (
                section.tables.map(renderTable)
            )}
        </div>
    );
};

export default FormRenderer;
