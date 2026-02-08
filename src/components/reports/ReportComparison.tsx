import React, { useState } from 'react';
import {
    ArrowPathIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import type { FormInstance, FormTemplate } from '../../types';
import { formatDate } from '../../utils';
import { cn } from '../../utils';

interface ReportComparisonProps {
    instances: FormInstance[];
    template: FormTemplate;
    onClose: () => void;
}

interface CellDiff {
    rowIndex: number;
    colIndex: number;
    oldValue: any;
    newValue: any;
    isDifferent: boolean;
}

const ReportComparison: React.FC<ReportComparisonProps> = ({
    instances,
    template,
    onClose
}) => {
    const [selectedIndices, setSelectedIndices] = useState<[number, number]>([0, 1]);

    if (instances.length < 2) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                    يجب تحديد تقريرين على الأقل للمقارنة
                </p>
            </div>
        );
    }

    const instance1 = instances[selectedIndices[0]];
    const instance2 = instances[selectedIndices[1]];

    const handlePrevious = () => {
        if (selectedIndices[0] > 0) {
            setSelectedIndices([selectedIndices[0] - 1, selectedIndices[1]]);
        }
    };

    const handleNext = () => {
        if (selectedIndices[1] < instances.length - 1) {
            setSelectedIndices([selectedIndices[0], selectedIndices[1] + 1]);
        }
    };

    const handleSwap = () => {
        setSelectedIndices([selectedIndices[1], selectedIndices[0]]);
    };

    // Compare two data values
    const compareValues = (val1: any, val2: any): boolean => {
        if (val1 === val2) return true;
        if (val1 == null && val2 == null) return true;
        return String(val1) === String(val2);
    };

    // Get differences for a specific table
    const getTableDifferences = (
        sectionId: string,
        tableId: string
    ): CellDiff[] => {
        const data1 = instance1.form_data.sections?.[sectionId]?.tables?.[tableId]?.data || [];
        const data2 = instance2.form_data.sections?.[sectionId]?.tables?.[tableId]?.data || [];

        const diffs: CellDiff[] = [];
        const maxRows = Math.max(data1.length, data2.length);

        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const row1 = data1[rowIndex] || [];
            const row2 = data2[rowIndex] || [];
            const maxCols = Math.max(row1.length, row2.length);

            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const val1 = row1[colIndex];
                const val2 = row2[colIndex];
                const isDifferent = !compareValues(val1, val2);

                if (isDifferent) {
                    diffs.push({
                        rowIndex,
                        colIndex,
                        oldValue: val1,
                        newValue: val2,
                        isDifferent
                    });
                }
            }
        }

        return diffs;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            مقارنة التقارير
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {template.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Comparison Controls */}
                <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handlePrevious}
                        disabled={selectedIndices[0] === 0}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Report 1 Selector */}
                        <div className="text-center">
                            <select
                                value={selectedIndices[0]}
                                onChange={(e) => setSelectedIndices([parseInt(e.target.value), selectedIndices[1]])}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            >
                                {instances.map((inst, idx) => (
                                    <option key={idx} value={idx}>
                                        {formatDate(inst.form_data.report_date, 'dd/MM/yyyy')} - {inst.form_data.batch_number || 'N/A'}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                التقرير الأول
                            </p>
                        </div>

                        <button
                            onClick={handleSwap}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                            title="تبديل"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>

                        {/* Report 2 Selector */}
                        <div className="text-center">
                            <select
                                value={selectedIndices[1]}
                                onChange={(e) => setSelectedIndices([selectedIndices[0], parseInt(e.target.value)])}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            >
                                {instances.map((inst, idx) => (
                                    <option key={idx} value={idx}>
                                        {formatDate(inst.form_data.report_date, 'dd/MM/yyyy')} - {inst.form_data.batch_number || 'N/A'}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                التقرير الثاني
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={selectedIndices[1] === instances.length - 1}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Comparison Tables */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Side - Report 1 */}
                        <div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                                    التقرير الأول
                                </h3>
                                <div className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                                    <p>التاريخ: {formatDate(instance1.form_data.report_date, 'dd/MM/yyyy')}</p>
                                    <p>الدُفعة: {instance1.form_data.batch_number || 'N/A'}</p>
                                    <p>الحالة: {instance1.status}</p>
                                </div>
                            </div>

                            {/* Render sections for instance 1 */}
                            {Object.entries(template.sections).map(([sectionId, section]) => (
                                <div key={sectionId} className="mb-6">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        {section.name}
                                    </h4>

                                    {section.tables.map((table) => {
                                        const diffs = getTableDifferences(sectionId, table.id);
                                        const data1 = instance1.form_data.sections?.[sectionId]?.tables?.[table.id]?.data || [];

                                        return (
                                            <div key={table.id} className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {table.name}
                                                </p>

                                                {table.columns && table.columns.length > 0 && (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full border border-gray-300 dark:border-gray-600">
                                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                                <tr>
                                                                    {table.columns.map((col: any, idx: number) => (
                                                                        <th key={idx} className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                            {col.label}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {data1.map((row, rowIdx) => (
                                                                    <tr key={rowIdx}>
                                                                        {row.map((cell: any, colIdx: number) => {
                                                                            const hasDiff = diffs.some(
                                                                                d => d.rowIndex === rowIdx && d.colIndex === colIdx
                                                                            );

                                                                            return (
                                                                                <td
                                                                                    key={colIdx}
                                                                                    className={cn(
                                                                                        'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600',
                                                                                        hasDiff && 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 font-semibold'
                                                                                    )}
                                                                                >
                                                                                    {cell || '-'}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Right Side - Report 2 */}
                        <div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                                <h3 className="font-semibold text-green-900 dark:text-green-300">
                                    التقرير الثاني
                                </h3>
                                <div className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1">
                                    <p>التاريخ: {formatDate(instance2.form_data.report_date, 'dd/MM/yyyy')}</p>
                                    <p>الدُفعة: {instance2.form_data.batch_number || 'N/A'}</p>
                                    <p>الحالة: {instance2.status}</p>
                                </div>
                            </div>

                            {/* Render sections for instance 2 */}
                            {Object.entries(template.sections).map(([sectionId, section]) => (
                                <div key={sectionId} className="mb-6">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        {section.name}
                                    </h4>

                                    {section.tables.map((table) => {
                                        const diffs = getTableDifferences(sectionId, table.id);
                                        const data2 = instance2.form_data.sections?.[sectionId]?.tables?.[table.id]?.data || [];

                                        return (
                                            <div key={table.id} className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {table.name}
                                                </p>

                                                {table.columns && table.columns.length > 0 && (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full border border-gray-300 dark:border-gray-600">
                                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                                <tr>
                                                                    {table.columns.map((col: any, idx: number) => (
                                                                        <th key={idx} className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                            {col.label}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {data2.map((row, rowIdx) => (
                                                                    <tr key={rowIdx}>
                                                                        {row.map((cell: any, colIdx: number) => {
                                                                            const hasDiff = diffs.some(
                                                                                d => d.rowIndex === rowIdx && d.colIndex === colIdx
                                                                            );

                                                                            return (
                                                                                <td
                                                                                    key={colIdx}
                                                                                    className={cn(
                                                                                        'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600',
                                                                                        hasDiff && 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300 font-semibold'
                                                                                    )}
                                                                                >
                                                                                    {cell || '-'}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Differences Summary */}
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">
                            ملخص الاختلافات
                        </h4>
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            {Object.entries(template.sections).map(([sectionId, section]) => {
                                const sectionDiffs = section.tables.reduce((total, table) => {
                                    return total + getTableDifferences(sectionId, table.id).length;
                                }, 0);

                                if (sectionDiffs > 0) {
                                    return (
                                        <p key={sectionId}>
                                            • {section.name}: {sectionDiffs} اختلاف
                                        </p>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportComparison;
