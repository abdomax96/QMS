import React from 'react';
import type { Table } from '../../../types';
import CellInput from './CellInput';

interface CustomTableProps {
    table: Table;
    tableData: any[][];
    onChange: (tableId: string, data: any[][]) => void;
    selectedTableId: string | null;
    onKeyDown: (e: React.KeyboardEvent, tableId: string, rowIndex: number, colIndex: number) => void;
    onClearSelection: () => void;
}

const CustomTable: React.FC<CustomTableProps> = ({
    table,
    tableData,
    onChange,
    selectedTableId,
    onKeyDown,
    onClearSelection,
}) => {
    const columns = table.columns || [];
    const rows = table.rows || 10;

    const rowNumWidth = 50;
    const customColWidth = 150;

    return (
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
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs text-gray-500 font-medium">
                                {rowIndex + 1}
                            </td>
                            {columns.map((col, colIndex) => {
                                const value = tableData?.[rowIndex]?.[colIndex];

                                return (
                                    <td
                                        key={col.key}
                                        className="border border-gray-300 dark:border-gray-600 p-0"
                                    >
                                        <CellInput
                                            cellType={col.type}
                                            value={value}
                                            onChange={(newValue) => {
                                                const newData = [...(tableData || [])];
                                                if (!newData[rowIndex]) newData[rowIndex] = [];
                                                newData[rowIndex][colIndex] = newValue;
                                                onChange(table.id, newData);
                                            }}
                                            tableId={table.id}
                                            rowIndex={rowIndex}
                                            colIndex={colIndex}
                                            options={{
                                                min: col.min as number | undefined,
                                                max: col.max as number | undefined,
                                                options: col.options,
                                                // For grade type: pass adjacent cell values to check consecutive B
                                                adjacentValues: (col.type as string) === 'grade' ? {
                                                    left: colIndex > 0 && (columns[colIndex - 1]?.type as string) === 'grade'
                                                        ? tableData?.[rowIndex]?.[colIndex - 1]
                                                        : undefined,
                                                    right: colIndex < columns.length - 1 && (columns[colIndex + 1]?.type as string) === 'grade'
                                                        ? tableData?.[rowIndex]?.[colIndex + 1]
                                                        : undefined
                                                } : undefined
                                            }}
                                            isSelected={selectedTableId === table.id}
                                            onKeyDown={onKeyDown}
                                            onClearSelection={onClearSelection}
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CustomTable;
