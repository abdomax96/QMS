import type { CellDataType } from './index';

export type TableSchemaVersion = 2;

export interface TableV2ValidationRule {
  min?: number | string;
  max?: number | string;
  step?: number | string;
  required?: boolean;
}

export interface TableV2DirectoryFilter {
  department_id?: string;
  role_id?: string;
}

export interface TableV2Column {
  key: string;
  label: string;
  type: CellDataType;
  width?: number;
  align?: 'right' | 'center' | 'left';
  format?: string;
  options?: string[];
  validation?: TableV2ValidationRule;
  directory_filter?: TableV2DirectoryFilter;
  default_value?: unknown;
}

export interface TableV2HeaderCell {
  label: string;
  col_span?: number;
  row_span?: number;
  align?: 'right' | 'center' | 'left';
  background_color?: string;
  text_color?: string;
  class_name?: string;
}

export interface TableV2Headers {
  top?: TableV2HeaderCell[][];
  side?: TableV2HeaderCell[][];
}

export interface TableV2Grid {
  rows: number;
  allow_dynamic_rows?: boolean;
  show_row_numbers?: boolean;
  row_header_label?: string;
}

export interface TableV2Layout {
  direction?: 'rtl' | 'ltr';
  top_header?: boolean;
  side_header?: boolean;
}

export type TableV2DataTypeScope = 'column' | 'row' | 'cell';

export interface TableV2DataTypeRule {
  min?: number | string;
  max?: number | string;
  options?: string[];
}

export interface TableV2DataTypeConfig {
  scope?: TableV2DataTypeScope;
  row_types?: CellDataType[];
  cell_types?: Record<string, CellDataType>;
  row_rules?: TableV2DataTypeRule[];
  cell_rules?: Record<string, TableV2DataTypeRule>;
}

export interface TableV2Meta {
  engine?: string;
  data_type_config?: TableV2DataTypeConfig;
  side_header_targets?: number[];
  side_header_labels?: string[];
  bold_row_separators?: number[];
  bold_column_separators?: number[];
  [key: string]: unknown;
}

export interface CustomTableSchemaV2 {
  version: TableSchemaVersion;
  layout?: TableV2Layout;
  grid: TableV2Grid;
  columns: TableV2Column[];
  headers?: TableV2Headers;
  meta?: TableV2Meta;
}
