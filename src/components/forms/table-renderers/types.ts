import type { FormTemplate, Table } from '../../../types';

export interface TableRendererProps {
    table: Table;
    tableData: any[][];
    onChange: (tableId: string, data: any[][]) => void;
    template: FormTemplate;
    inspectionStartTime: string;
    shiftDuration: number;
    stoppedTimesByGroup: Record<string, string[]>;
    onStoppedTimesChange?: (groupId: string, stoppedTimes: string[]) => void;
    selectedTableId: string | null;
    setSelectedTableId: (id: string | null) => void;
    flashingCell: string | null;
    setFlashingCell: (key: string | null) => void;
}

export interface CellInputOptions {
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    disabled?: boolean;
    className?: string;
    onBlur?: () => void;
    // For grade type - values of adjacent cells in the same row
    adjacentValues?: {
        left?: string;
        right?: string;
    };
}

