import React from 'react';
import { cn } from '../../../utils';
import type { CellInputOptions } from './types';

interface CellInputProps {
    cellType: string;
    value: any;
    onChange: (newValue: any) => void;
    tableId: string;
    rowIndex: number;
    colIndex: number;
    options?: CellInputOptions;
    isSelected: boolean;
    onKeyDown: (e: React.KeyboardEvent, tableId: string, rowIndex: number, colIndex: number) => void;
    onClearSelection: () => void;
}

const CellInput: React.FC<CellInputProps> = ({
    cellType,
    value,
    onChange,
    tableId,
    rowIndex,
    colIndex,
    options = {},
    isSelected,
    onKeyDown,
    onClearSelection,
}) => {
    const { min, max, step, options: dropdownOptions, disabled, className = '', onBlur } = options;

    const baseClass = cn(
        'w-full h-full px-3 py-2 text-center text-sm border-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200',
        'dark:bg-gray-800 dark:text-white min-h-[40px]',
        isSelected && 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100',
        className
    );

    const commonProps = {
        disabled,
        className: baseClass,
        'data-table-id': tableId,
        'data-row-index': rowIndex,
        'data-col-index': colIndex,
        onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, tableId, rowIndex, colIndex),
        onClick: () => {
            if (isSelected) onClearSelection();
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
            return (
                <input
                    type="date"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    {...commonProps}
                />
            );

        case 'time':
            return (
                <input
                    type="time"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    {...commonProps}
                />
            );

        case 'datetime':
            return (
                <input
                    type="datetime-local"
                    value={value ?? ''}
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

        case 'user-directory':
            return (
                <select
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    {...commonProps}
                >
                    <option value="">اختر مستخدم...</option>
                    {(dropdownOptions || []).map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            );

        case 'grade': {
            // Check for consecutive B grades (non-conforming)
            const adjacentValues = options.adjacentValues;
            const isConsecutiveB = value === 'B' && (adjacentValues?.left === 'B' || adjacentValues?.right === 'B');
            const isNonConforming = value === 'C' || isConsecutiveB;

            return (
                <select
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    {...commonProps}
                    className={cn(
                        baseClass,
                        value === 'A' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold',
                        value === 'B' && !isConsecutiveB && 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-bold',
                        isNonConforming && 'bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold animate-pulse'
                    )}
                    title={isNonConforming ? 'غير مطابق' : value === 'A' ? 'ممتاز' : value === 'B' ? 'مقبول' : ''}
                >
                    <option value="">اختر...</option>
                    <option value="A">A - ممتاز</option>
                    <option value="B">B - مقبول</option>
                    <option value="C">C - غير مطابق</option>
                </select>
            );
        }

        default:
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

export default CellInput;
