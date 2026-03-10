import type {
  CellDataType,
  CustomTableSchemaV2,
  Table,
  TableColumn,
  TableHeaderCell,
  TableV2Column,
  TableV2DataTypeConfig,
  TableV2DataTypeRule,
  TableV2DataTypeScope,
  TableV2HeaderCell,
} from '../types';
import { evaluateExpression } from './FormulaEngine';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSupportedTableType = (tableType: Table['type']) =>
  tableType === 'custom' || tableType === 'printing_verification';

const CUSTOM_TABLE_FORMULA_META_KEY = 'cell_formulas';

const CELL_TYPE_KEY_SEPARATOR = ':';
const DEFAULT_DATA_TYPE_SCOPE: TableV2DataTypeScope = 'column';
const CELL_DATA_TYPES: ReadonlyArray<CellDataType> = [
  'text',
  'integer',
  'decimal',
  'date',
  'time',
  'datetime',
  'boolean-check',
  'boolean-yesno',
  'dropdown',
  'user-directory',
  'image',
  'long-text',
];

const isCellDataType = (value: unknown): value is CellDataType =>
  typeof value === 'string' && CELL_DATA_TYPES.includes(value as CellDataType);

const normalizeDataTypeScope = (value: unknown): TableV2DataTypeScope => {
  if (value === 'row' || value === 'cell') return value;
  return DEFAULT_DATA_TYPE_SCOPE;
};

const sanitizeSideHeaderTargets = (
  targets: unknown,
  sideHeaderColumnCount: number,
  dataColumnCount: number
): number[] => {
  const safeSideCount = Math.max(0, Math.floor(Number(sideHeaderColumnCount) || 0));
  const safeDataCount = Math.max(0, Math.floor(Number(dataColumnCount) || 0));
  const sourceTargets = Array.isArray(targets) ? targets : [];

  return Array.from({ length: safeSideCount }).map((_, sideIndex) => {
    const raw = Number(sourceTargets[sideIndex]);
    if (Number.isInteger(raw)) {
      return Math.min(safeDataCount, Math.max(0, raw));
    }
    return 0;
  });
};

const sanitizeSideHeaderLabels = (
  labels: unknown,
  sideHeaderColumnCount: number
): string[] => {
  const safeSideCount = Math.max(0, Math.floor(Number(sideHeaderColumnCount) || 0));
  const sourceLabels = Array.isArray(labels) ? labels : [];

  return Array.from({ length: safeSideCount }).map((_, sideIndex) => {
    const value = String(sourceLabels[sideIndex] ?? '').trim();
    return value || `رأس ${sideIndex + 1}`;
  });
};

const sanitizeBoldSeparatorIndexes = (
  indexes: unknown,
  maxCount: number
): number[] => {
  const safeMax = Math.max(0, Math.floor(Number(maxCount) || 0));
  if (safeMax <= 0) return [];
  if (!Array.isArray(indexes)) return [];

  const seen = new Set<number>();
  const normalized: number[] = [];

  indexes.forEach((raw) => {
    const parsed = Math.floor(Number(raw));
    if (!Number.isInteger(parsed)) return;
    if (parsed < 1 || parsed > safeMax) return;
    if (seen.has(parsed)) return;
    seen.add(parsed);
    normalized.push(parsed);
  });

  return normalized.sort((a, b) => a - b);
};

export const buildCustomTypeCellKey = (rowIndex: number, colIndex: number): string =>
  `${Math.max(0, Math.floor(Number(rowIndex) || 0))}${CELL_TYPE_KEY_SEPARATOR}${Math.max(
    0,
    Math.floor(Number(colIndex) || 0)
  )}`;

const parseCustomTypeCellKey = (
  key: string
): { rowIndex: number; colIndex: number } | null => {
  const [rowRaw, colRaw] = String(key || '').split(CELL_TYPE_KEY_SEPARATOR);
  if (rowRaw === undefined || colRaw === undefined) return null;
  const rowIndex = Number(rowRaw);
  const colIndex = Number(colRaw);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) return null;
  if (!Number.isInteger(colIndex) || colIndex < 0) return null;
  return { rowIndex, colIndex };
};

const sanitizeOptionsList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  value.forEach((item) => {
    const normalized = String(item ?? '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const sanitizeDataTypeRule = (value: unknown): TableV2DataTypeRule | undefined => {
  if (!isObject(value)) return undefined;
  const source = value as Record<string, unknown>;
  const minCandidate = source.min;
  const maxCandidate = source.max;
  const minNumber = Number(minCandidate);
  const maxNumber = Number(maxCandidate);
  const minValue =
    minCandidate === '' || minCandidate === null || minCandidate === undefined
      ? undefined
      : Number.isFinite(minNumber)
        ? minNumber
        : String(minCandidate);
  const maxValue =
    maxCandidate === '' || maxCandidate === null || maxCandidate === undefined
      ? undefined
      : Number.isFinite(maxNumber)
        ? maxNumber
        : String(maxCandidate);
  const options = sanitizeOptionsList(source.options);
  const hasAny = minValue !== undefined || maxValue !== undefined || options.length > 0;
  if (!hasAny) return undefined;
  return {
    min: minValue,
    max: maxValue,
    options: options.length > 0 ? options : undefined,
  };
};

export const sanitizeCustomDataTypeConfig = (
  config: TableV2DataTypeConfig | undefined,
  rows: number,
  cols: number
): TableV2DataTypeConfig => {
  const safeRows = Math.max(1, Number(rows) || 1);
  const safeCols = Math.max(1, Number(cols) || 1);
  const source = isObject(config) ? (config as Record<string, unknown>) : {};
  const scope = normalizeDataTypeScope(source.scope);

  const rowTypes: CellDataType[] = [];
  const sourceRowTypes = Array.isArray(source.row_types) ? source.row_types : [];
  for (let rowIndex = 0; rowIndex < Math.min(sourceRowTypes.length, safeRows); rowIndex += 1) {
    const candidate = sourceRowTypes[rowIndex];
    if (isCellDataType(candidate)) {
      rowTypes[rowIndex] = candidate;
    }
  }

  const cellTypes: Record<string, CellDataType> = {};
  const sourceCellTypes = isObject(source.cell_types)
    ? (source.cell_types as Record<string, unknown>)
    : {};
  Object.entries(sourceCellTypes).forEach(([key, value]) => {
    const parsedKey = parseCustomTypeCellKey(key);
    if (!parsedKey) return;
    if (parsedKey.rowIndex >= safeRows || parsedKey.colIndex >= safeCols) return;
    if (!isCellDataType(value)) return;
    cellTypes[buildCustomTypeCellKey(parsedKey.rowIndex, parsedKey.colIndex)] = value;
  });

  const rowRules: TableV2DataTypeRule[] = [];
  const sourceRowRules = Array.isArray(source.row_rules) ? source.row_rules : [];
  for (let rowIndex = 0; rowIndex < Math.min(sourceRowRules.length, safeRows); rowIndex += 1) {
    const sanitizedRule = sanitizeDataTypeRule(sourceRowRules[rowIndex]);
    if (!sanitizedRule) continue;
    rowRules[rowIndex] = sanitizedRule;
  }

  const cellRules: Record<string, TableV2DataTypeRule> = {};
  const sourceCellRules = isObject(source.cell_rules)
    ? (source.cell_rules as Record<string, unknown>)
    : {};
  Object.entries(sourceCellRules).forEach(([key, value]) => {
    const parsedKey = parseCustomTypeCellKey(key);
    if (!parsedKey) return;
    if (parsedKey.rowIndex >= safeRows || parsedKey.colIndex >= safeCols) return;
    const sanitizedRule = sanitizeDataTypeRule(value);
    if (!sanitizedRule) return;
    cellRules[buildCustomTypeCellKey(parsedKey.rowIndex, parsedKey.colIndex)] = sanitizedRule;
  });

  return {
    scope,
    row_types: rowTypes,
    cell_types: cellTypes,
    row_rules: rowRules,
    cell_rules: cellRules,
  };
};

const normalizeHeaderCell = (cell: unknown): TableV2HeaderCell => {
  const source = isObject(cell) ? cell : {};
  return {
    label: String(source.label ?? ''),
    col_span: Math.max(1, Number(source.col_span ?? source.colSpan ?? 1) || 1),
    row_span: Math.max(1, Number(source.row_span ?? source.rowSpan ?? 1) || 1),
    align: (source.align as 'right' | 'center' | 'left') || 'center',
    background_color: source.background_color as string | undefined,
    text_color: source.text_color as string | undefined,
    class_name: source.class_name as string | undefined,
  };
};

const normalizeHeaderRows = (rows: unknown): TableV2HeaderCell[][] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => (row as unknown[]).map(normalizeHeaderCell));
};

const buildDefaultSideHeaderRows = (
  rowCount: number,
  colCount: number
): TableV2HeaderCell[][] => {
  const safeRows = Math.max(1, Number(rowCount) || 1);
  const safeCols = Math.max(1, Number(colCount) || 1);

  return Array.from({ length: safeRows }).map((_, rowIndex) =>
    Array.from({ length: safeCols }).map((__, colIndex) => ({
      label: colIndex === 0 ? `صف ${rowIndex + 1}` : '-',
      col_span: 1,
      row_span: 1,
      align: 'center',
    }))
  );
};

const getExistingSchemaV2 = (table: Table): CustomTableSchemaV2 | null => {
  const schema = isObject(table.schema_v2) ? (table.schema_v2 as CustomTableSchemaV2) : null;
  return schema?.version === 2 ? schema : null;
};

const toV2Column = (column: TableColumn, index: number): TableV2Column => ({
  key: column.key || `col_${index + 1}`,
  label: column.label || column.key || `عمود ${index + 1}`,
  type: column.type || 'text',
  width: column.width,
  align: column.align || 'center',
  format: column.format,
  options: Array.isArray(column.options) ? column.options : undefined,
  validation: {
    min: column.min,
    max: column.max,
    step: column.step,
    required: column.required,
  },
  directory_filter: {
    department_id: column.user_directory_department_id,
    role_id: column.user_directory_role_id,
  },
  default_value: column.default_value,
});

const toLegacyColumn = (column: TableV2Column): TableColumn => ({
  key: column.key,
  label: column.label,
  type: column.type,
  width: column.width,
  align: column.align,
  format: column.format,
  options: column.options,
  min: column.validation?.min,
  max: column.validation?.max,
  step: column.validation?.step,
  required: column.validation?.required,
  user_directory_department_id: column.directory_filter?.department_id,
  user_directory_role_id: column.directory_filter?.role_id,
  default_value: column.default_value,
});

export const buildCustomTableSchemaV2 = (table: Table): CustomTableSchemaV2 => {
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const topHeaders = normalizeHeaderRows(table.header_rows);
  const rows = Math.max(1, Number(table.rows || 1));

  return {
    version: 2,
    layout: {
      direction: 'rtl',
      top_header: true,
      side_header: false,
    },
    grid: {
      rows,
      allow_dynamic_rows: Boolean(table.allowDynamicRows),
      show_row_numbers: table.show_row_numbers !== false,
      row_header_label: table.row_header_label || '#',
    },
    columns: columns.map(toV2Column),
    headers: {
      top: topHeaders,
      side: [],
    },
  };
};

export const ensureCustomTableSchemaV2 = (table: Table): Table => {
  if (!isSupportedTableType(table.type)) return table;

  const existing = getExistingSchemaV2(table);
  const baseSchema = buildCustomTableSchemaV2(table);
  const existingDirection = existing?.layout?.direction === 'ltr' ? 'ltr' : 'rtl';
  const existingTopHeader = existing?.layout?.top_header !== false;
  const existingSideHeader = existing?.layout?.side_header === true;
  const existingSideHeaders = normalizeHeaderRows(existing?.headers?.side);
  const sideHeadersForSave =
    existingSideHeader && existingSideHeaders.length === 0
      ? buildDefaultSideHeaderRows(baseSchema.grid.rows, 1)
      : existingSideHeaders;

  return {
    ...table,
    schema_v2: {
      ...baseSchema,
      layout: {
        direction: existingDirection,
        top_header: existingTopHeader,
        side_header: existingSideHeader,
      },
      headers: {
        top: baseSchema.headers?.top || [],
        side: sideHeadersForSave,
      },
      meta: isObject(existing?.meta) ? (existing?.meta as Record<string, unknown>) : baseSchema.meta,
    },
  };
};

export const getCustomLayoutForRendering = (table: Table) => {
  const schema = getExistingSchemaV2(table);
  if (schema?.layout) {
    return {
      direction: schema.layout.direction === 'ltr' ? 'ltr' : 'rtl',
      topHeader: schema.layout.top_header !== false,
      sideHeader: schema.layout.side_header === true,
    };
  }

  return {
    direction: 'rtl' as const,
    topHeader: true,
    sideHeader: false,
  };
};

export const getCustomColumnsForRendering = (table: Table): TableColumn[] => {
  const schema = getExistingSchemaV2(table);
  if (schema?.version === 2 && Array.isArray(schema.columns) && schema.columns.length > 0) {
    return schema.columns.map(toLegacyColumn);
  }
  return Array.isArray(table.columns) ? table.columns : [];
};

export const getCustomHeaderRowsForRendering = (table: Table): TableHeaderCell[][] => {
  const schema = getExistingSchemaV2(table);
  if (schema?.version === 2) {
    const topRows = normalizeHeaderRows(schema.headers?.top);
    if (topRows.length > 0) return topRows as TableHeaderCell[][];
  }
  return normalizeHeaderRows(table.header_rows) as TableHeaderCell[][];
};

export const getCustomSideHeaderRowsForRendering = (table: Table): TableHeaderCell[][] => {
  const schema = getExistingSchemaV2(table);
  if (schema?.version === 2) {
    const sideRows = normalizeHeaderRows(schema.headers?.side);
    if (sideRows.length > 0) return sideRows as TableHeaderCell[][];
    if (schema.layout?.side_header === true) {
      const fallbackRows = Math.max(1, Number(schema.grid?.rows || table.rows || 1));
      return buildDefaultSideHeaderRows(fallbackRows, 1) as TableHeaderCell[][];
    }
  }
  return [];
};

export const buildSideHeaderRenderModel = (
  sideRows: TableHeaderCell[][],
  targetRows: number
): { columnCount: number; rows: TableHeaderCell[][] } => {
  const normalizedRows = normalizeHeaderRows(sideRows) as TableHeaderCell[][];
  const safeTargetRows = Math.max(0, Math.floor(Number(targetRows) || 0));

  if (normalizedRows.length === 0) {
    return {
      columnCount: 0,
      rows: Array.from({ length: safeTargetRows }, () => []),
    };
  }

  const occupancy: boolean[][] = [];
  const placements: Array<{
    row: number;
    col: number;
    colSpan: number;
    rowSpan: number;
    cell: TableHeaderCell;
  }> = [];

  let maxColumns = 0;

  for (let rowIndex = 0; rowIndex < normalizedRows.length; rowIndex += 1) {
    const row = normalizedRows[rowIndex] || [];
    let colPointer = 0;

    for (const rawCell of row) {
      const colSpan = Math.max(1, Number(rawCell?.col_span ?? (rawCell as any)?.colSpan ?? 1) || 1);
      const rowSpan = Math.max(1, Number(rawCell?.row_span ?? (rawCell as any)?.rowSpan ?? 1) || 1);

      while (occupancy[rowIndex]?.[colPointer]) {
        colPointer += 1;
      }

      placements.push({
        row: rowIndex,
        col: colPointer,
        colSpan,
        rowSpan,
        cell: {
          ...rawCell,
          col_span: colSpan,
          row_span: rowSpan,
          align: rawCell?.align || 'center',
        },
      });

      for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
        if (!occupancy[r]) occupancy[r] = [];
        for (let c = colPointer; c < colPointer + colSpan; c += 1) {
          occupancy[r][c] = true;
        }
      }

      maxColumns = Math.max(maxColumns, colPointer + colSpan);
      colPointer += colSpan;
    }
  }

  if (maxColumns <= 0) {
    return {
      columnCount: 0,
      rows: Array.from({ length: Math.max(safeTargetRows, normalizedRows.length) }, () => []),
    };
  }

  const totalRows = Math.max(safeTargetRows, normalizedRows.length, occupancy.length);
  const anchorMap = new Map<string, (typeof placements)[number]>();
  placements.forEach((placement) => {
    anchorMap.set(`${placement.row}:${placement.col}`, placement);
  });

  const renderedRows: TableHeaderCell[][] = [];

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    const rowCells: TableHeaderCell[] = [];
    let colPointer = 0;

    while (colPointer < maxColumns) {
      const anchor = anchorMap.get(`${rowIndex}:${colPointer}`);
      if (anchor) {
        rowCells.push({
          ...anchor.cell,
          col_span: anchor.colSpan,
          row_span: Math.max(1, Math.min(anchor.rowSpan, totalRows - rowIndex)),
        });
        colPointer += anchor.colSpan;
        continue;
      }

      const covered = occupancy[rowIndex]?.[colPointer] === true;
      if (covered) {
        colPointer += 1;
        continue;
      }

      let run = 1;
      while (
        colPointer + run < maxColumns &&
        occupancy[rowIndex]?.[colPointer + run] !== true &&
        !anchorMap.has(`${rowIndex}:${colPointer + run}`)
      ) {
        run += 1;
      }

      rowCells.push({
        label: '-',
        col_span: run,
        row_span: 1,
        align: 'center',
        class_name: 'qms-side-filler',
      });
      colPointer += run;
    }

    renderedRows.push(rowCells);
  }

  return {
    columnCount: maxColumns,
    rows: renderedRows,
  };
};

export const getCustomGridSettingsForRendering = (table: Table) => {
  const schema = getExistingSchemaV2(table);
  if (schema?.version === 2 && isObject(schema.grid)) {
    return {
      rows: Math.max(1, Number(schema.grid.rows || table.rows || 1)),
      allowDynamicRows: Boolean(schema.grid.allow_dynamic_rows),
      showRowNumbers: schema.grid.show_row_numbers !== false,
      rowHeaderLabel: schema.grid.row_header_label || '#',
    };
  }

  return {
    rows: Math.max(1, Number(table.rows || 1)),
    allowDynamicRows: Boolean(table.allowDynamicRows),
    showRowNumbers: table.show_row_numbers !== false,
    rowHeaderLabel: table.row_header_label || '#',
  };
};

export const getCustomDataTypeConfigForRendering = (
  table: Table
): TableV2DataTypeConfig => {
  const schema = getExistingSchemaV2(table);
  const fallbackRows = Math.max(1, Number(table.rows || 1));
  const fallbackCols = Math.max(1, (table.columns || []).length || 1);
  const rows = Math.max(1, Number(schema?.grid?.rows || fallbackRows));
  const cols = Math.max(1, (schema?.columns || []).length || fallbackCols);

  return sanitizeCustomDataTypeConfig(schema?.meta?.data_type_config, rows, cols);
};

export const getCustomSideHeaderTargetsForRendering = (
  table: Table,
  sideHeaderColumnCount: number,
  dataColumnCount: number
): number[] => {
  const schema = getExistingSchemaV2(table);
  return sanitizeSideHeaderTargets(
    schema?.meta?.side_header_targets,
    sideHeaderColumnCount,
    dataColumnCount
  );
};

export const getCustomSideHeaderLabelsForRendering = (
  table: Table,
  sideHeaderColumnCount: number
): string[] => {
  const schema = getExistingSchemaV2(table);
  return sanitizeSideHeaderLabels(schema?.meta?.side_header_labels, sideHeaderColumnCount);
};

export const getCustomBoldRowSeparatorsForRendering = (
  table: Table,
  rowCount: number
): number[] => {
  const schema = getExistingSchemaV2(table);
  return sanitizeBoldSeparatorIndexes(schema?.meta?.bold_row_separators, rowCount);
};

export const getCustomBoldColumnSeparatorsForRendering = (
  table: Table,
  columnCount: number
): number[] => {
  const schema = getExistingSchemaV2(table);
  return sanitizeBoldSeparatorIndexes(schema?.meta?.bold_column_separators, columnCount);
};

export const getCustomFormulaCellsForRendering = (table: Table): Record<string, string> => {
  const schema = getExistingSchemaV2(table);
  const rawFormulaCells = schema?.meta?.[CUSTOM_TABLE_FORMULA_META_KEY];
  if (!isObject(rawFormulaCells)) return {};

  const normalized: Record<string, string> = {};
  Object.entries(rawFormulaCells).forEach(([key, rawValue]) => {
    const parsedKey = parseCustomTypeCellKey(key);
    if (!parsedKey) return;
    const formulaText = String(rawValue ?? '').trim();
    if (!formulaText.startsWith('=')) return;
    normalized[buildCustomTypeCellKey(parsedKey.rowIndex, parsedKey.colIndex)] = formulaText;
  });

  return normalized;
};

export const expandSideHeaderRowsToMatrix = (
  sideRenderRows: TableHeaderCell[][],
  sideHeaderColumnCount: number
): Array<Array<TableHeaderCell | null>> => {
  const safeColumnCount = Math.max(0, Math.floor(Number(sideHeaderColumnCount) || 0));
  const totalRows = sideRenderRows.length;
  const matrix: Array<Array<TableHeaderCell | null>> = Array.from({ length: totalRows }, () =>
    Array.from({ length: safeColumnCount }, () => null)
  );
  const occupied: boolean[][] = Array.from({ length: totalRows }, () =>
    Array.from({ length: safeColumnCount }, () => false)
  );

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    let colPointer = 0;
    const rowCells = sideRenderRows[rowIndex] || [];

    for (const cell of rowCells) {
      while (colPointer < safeColumnCount && occupied[rowIndex][colPointer]) {
        colPointer += 1;
      }
      if (colPointer >= safeColumnCount) break;

      const colSpan = Math.max(1, Number(cell.col_span || 1) || 1);
      const rowSpan = Math.max(1, Number(cell.row_span || 1) || 1);

      matrix[rowIndex][colPointer] = {
        ...cell,
        col_span: 1,
        row_span: rowSpan,
      };

      for (let r = rowIndex; r < Math.min(totalRows, rowIndex + rowSpan); r += 1) {
        for (let c = colPointer; c < Math.min(safeColumnCount, colPointer + colSpan); c += 1) {
          occupied[r][c] = true;
          if (!(r === rowIndex && c === colPointer)) {
            matrix[r][c] = null;
          }
        }
      }

      colPointer += colSpan;
    }
  }

  return matrix;
};

export const resolveCustomCellType = (
  table: Table,
  rowIndex: number,
  colIndex: number,
  fallbackType: CellDataType
): CellDataType => {
  const config = getCustomDataTypeConfigForRendering(table);
  if (config.scope === 'row') {
    return config.row_types?.[rowIndex] || fallbackType;
  }
  if (config.scope === 'cell') {
    return config.cell_types?.[buildCustomTypeCellKey(rowIndex, colIndex)] || fallbackType;
  }
  return fallbackType;
};

export const resolveCustomCellValidation = (
  table: Table,
  rowIndex: number,
  colIndex: number,
  fallback?: { min?: number | string; max?: number | string; options?: string[] }
): { min?: number | string; max?: number | string; options?: string[] } => {
  const config = getCustomDataTypeConfigForRendering(table);
  const baseOptions = sanitizeOptionsList(fallback?.options);
  const resolved = {
    min: fallback?.min,
    max: fallback?.max,
    options: baseOptions.length > 0 ? baseOptions : undefined,
  };

  if (config.scope === 'row') {
    const rule = config.row_rules?.[rowIndex];
    if (rule) {
      if (rule.min !== undefined) resolved.min = rule.min;
      if (rule.max !== undefined) resolved.max = rule.max;
      if (Array.isArray(rule.options)) {
        const options = sanitizeOptionsList(rule.options);
        resolved.options = options.length > 0 ? options : undefined;
      }
    }
    return resolved;
  }

  if (config.scope === 'cell') {
    const key = buildCustomTypeCellKey(rowIndex, colIndex);
    const rule = config.cell_rules?.[key];
    if (rule) {
      if (rule.min !== undefined) resolved.min = rule.min;
      if (rule.max !== undefined) resolved.max = rule.max;
      if (Array.isArray(rule.options)) {
        const options = sanitizeOptionsList(rule.options);
        resolved.options = options.length > 0 ? options : undefined;
      }
    }
  }

  return resolved;
};

const isInlineExcelFormula = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().startsWith('=');

const normalizeNumericValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;

  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  // Normalize Arabic digits and decimal separator before parsing.
  const normalized = raw
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/,/g, '.')
    .replace(/٫/g, '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const columnLettersToIndex = (letters: string): number => {
  const normalized = letters.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalized)) return -1;

  let value = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    value = value * 26 + (normalized.charCodeAt(index) - 64);
  }
  return value - 1;
};

const parseA1Reference = (token: string): { rowIndex: number; colIndex: number } | null => {
  const match = String(token || '').trim().match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const colIndex = columnLettersToIndex(match[1]);
  const rowIndex = Number(match[2]) - 1;
  if (colIndex < 0 || rowIndex < 0) return null;
  return { rowIndex, colIndex };
};

const normalizeComputedValueByType = (value: number, cellType: CellDataType): number => {
  if (cellType === 'integer') return Math.round(value);
  return value;
};

interface ResolveCustomCellDisplayValueResult {
  value: unknown;
  isFormula: boolean;
  formula?: string;
}

export const resolveCustomCellDisplayValue = (
  table: Table,
  tableData: any[][],
  rowIndex: number,
  colIndex: number,
  fallbackType: CellDataType = 'text',
  _fallbackColumn?: TableColumn
): ResolveCustomCellDisplayValueResult => {
  const safeData = Array.isArray(tableData) ? tableData : [];
  const columns = getCustomColumnsForRendering(table);
  const formulaCells = getCustomFormulaCellsForRendering(table);
  const getFormulaForCell = (targetRowIndex: number, targetColIndex: number, targetRawValue: unknown): string | undefined => {
    if (isInlineExcelFormula(targetRawValue)) {
      return String(targetRawValue).trim();
    }

    const hasExplicitValue =
      targetRawValue !== undefined &&
      targetRawValue !== null &&
      String(targetRawValue).trim() !== '';
    if (hasExplicitValue) return undefined;

    return formulaCells[buildCustomTypeCellKey(targetRowIndex, targetColIndex)];
  };

  const rawValue = Array.isArray(safeData[rowIndex]) ? safeData[rowIndex][colIndex] : undefined;
  const rawFormula = getFormulaForCell(rowIndex, colIndex, rawValue);

  if (!rawFormula) {
    return {
      value: rawValue,
      isFormula: false,
    };
  }

  const formula = rawFormula.slice(1);
  const cellType = resolveCustomCellType(table, rowIndex, colIndex, fallbackType);
  const referenceRegex = /\b([A-Z]+[1-9]\d*)\b/g;
  const functionRegex = /\b(SUM|AVERAGE|AVG|MIN|MAX)\(([^()]*)\)/gi;
  const visited = new Set<string>();

  const evaluateCell = (targetRowIndex: number, targetColIndex: number): number => {
    const cellKey = `${targetRowIndex}:${targetColIndex}`;
    if (visited.has(cellKey)) return 0;

    const targetRawValue = Array.isArray(safeData[targetRowIndex])
      ? safeData[targetRowIndex][targetColIndex]
      : undefined;
    const targetRawFormula = getFormulaForCell(targetRowIndex, targetColIndex, targetRawValue);
    const targetFormula = targetRawFormula ? targetRawFormula.slice(1) : undefined;

    if (!targetFormula) {
      return normalizeNumericValue(targetRawValue);
    }

    visited.add(cellKey);
    const evaluated = evaluateFormulaText(targetFormula);
    visited.delete(cellKey);

    if (!Number.isFinite(evaluated)) return 0;
    const targetType = resolveCustomCellType(
      table,
      targetRowIndex,
      targetColIndex,
      columns[targetColIndex]?.type || fallbackType
    );
    return normalizeComputedValueByType(evaluated, targetType);
  };

  const evaluateArguments = (rawArgs: string): number[] => {
    const args = String(rawArgs || '')
      .split(/[;,،]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const values: number[] = [];
    args.forEach((arg) => {
      const rangeParts = arg.split(':').map((part) => part.trim());
      if (rangeParts.length === 2) {
        const start = parseA1Reference(rangeParts[0]);
        const end = parseA1Reference(rangeParts[1]);
        if (start && end) {
          const rowStart = Math.min(start.rowIndex, end.rowIndex);
          const rowEnd = Math.max(start.rowIndex, end.rowIndex);
          const colStart = Math.min(start.colIndex, end.colIndex);
          const colEnd = Math.max(start.colIndex, end.colIndex);
          for (let r = rowStart; r <= rowEnd; r += 1) {
            for (let c = colStart; c <= colEnd; c += 1) {
              values.push(evaluateCell(r, c));
            }
          }
          return;
        }
      }

      const singleRef = parseA1Reference(arg);
      if (singleRef) {
        values.push(evaluateCell(singleRef.rowIndex, singleRef.colIndex));
        return;
      }

      const argExpression = arg.replace(referenceRegex, (_match, ref) => {
        const parsed = parseA1Reference(ref);
        if (!parsed) return '0';
        return String(evaluateCell(parsed.rowIndex, parsed.colIndex));
      });
      const argResult = evaluateExpression(argExpression);
      if (argResult !== null && Number.isFinite(argResult)) {
        values.push(argResult);
      } else {
        values.push(normalizeNumericValue(arg));
      }
    });

    // Allow empty functions like SUM() to be 0.
    if (values.length === 0 && args.length === 0) {
      return [0];
    }
    return values;
  };

  const evaluateFormulaText = (formulaText: string): number => {
    let expression = String(formulaText || '').trim();
    if (!expression) return 0;

    // Resolve supported Excel-like functions on the innermost level first.
    for (let iteration = 0; iteration < 25; iteration += 1) {
      let replaced = false;
      expression = expression.replace(functionRegex, (_match, fnName, rawArgs) => {
        replaced = true;
        const values = evaluateArguments(rawArgs);
        const upperFn = String(fnName || '').toUpperCase();
        if (upperFn === 'SUM') {
          return String(values.reduce((sum, value) => sum + value, 0));
        }
        if (upperFn === 'AVERAGE' || upperFn === 'AVG') {
          if (values.length === 0) return '0';
          return String(values.reduce((sum, value) => sum + value, 0) / values.length);
        }
        if (upperFn === 'MIN') {
          return String(values.length > 0 ? Math.min(...values) : 0);
        }
        if (upperFn === 'MAX') {
          return String(values.length > 0 ? Math.max(...values) : 0);
        }
        return '0';
      });

      if (!replaced) break;
    }

    expression = expression.replace(referenceRegex, (_match, ref) => {
      const parsed = parseA1Reference(ref);
      if (!parsed) return '0';
      return String(evaluateCell(parsed.rowIndex, parsed.colIndex));
    });

    const result = evaluateExpression(expression);
    if (result === null || !Number.isFinite(result)) return 0;
    return result;
  };

  const currentKey = `${rowIndex}:${colIndex}`;
  visited.add(currentKey);
  const computed = evaluateFormulaText(formula);
  visited.delete(currentKey);

  return {
    value: normalizeComputedValueByType(computed, cellType),
    isFormula: true,
    formula: rawFormula,
  };
};
