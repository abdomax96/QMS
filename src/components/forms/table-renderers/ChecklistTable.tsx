import React from 'react';
import { cn } from '../../../utils';
import type { Table } from '../../../types';

interface ChecklistTableProps {
    table: Table;
    tableData: any[][];
    onChange: (tableId: string, data: any[][]) => void;
}

const ChecklistTable: React.FC<ChecklistTableProps> = ({
    table,
    tableData,
    onChange,
}) => {
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

export default ChecklistTable;
