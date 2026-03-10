import type {
  BasicInfo,
  FormTemplate,
  Table,
  TableColumn,
  TableParameter,
  TableV2DataTypeRule,
} from '../types';

export type DocumentVariableSnapshot = Record<string, number | string>;

const GLOBAL_TOKEN_REGEX = /^\{\s*(?:Global|متغير_عام|متغير)\s*:\s*([^}]+)\}$/i;
const DOUBLE_BRACE_TOKEN_REGEX = /^\{\{\s*([^}]+)\s*\}\}$/;
const SIMPLE_BRACE_TOKEN_REGEX = /^\{\s*([^:{}]+)\s*\}$/;
const INLINE_TOKEN_REGEX = /\{\s*(?:Global|متغير_عام|متغير)\s*:\s*([^{}]+?)\s*\}|\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^:{}]+?)\s*\}/gi;
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const ZERO_WIDTH_CHARS_REGEX = /[\u200B-\u200D\uFEFF]/g;

const normalizeLookupKey = (value: unknown): string => String(value ?? '')
  .replace(ZERO_WIDTH_CHARS_REGEX, '')
  .trim();

const buildLookupAliases = (value: unknown): string[] => {
  const base = normalizeLookupKey(value);
  if (!base) return [];

  const aliases = new Set<string>([base]);
  const tokenName = extractVariableNameFromToken(base);
  const plainName = normalizeLookupKey(tokenName || base.replace(/^(?:Global|متغير_عام|متغير)\s*:\s*/i, ''));

  if (plainName) {
    aliases.add(plainName);
    aliases.add(`Global:${plainName}`);
    aliases.add(`متغير_عام:${plainName}`);
    aliases.add(`متغير:${plainName}`);
    aliases.add(`{Global:${plainName}}`);
    aliases.add(`{متغير_عام:${plainName}}`);
    aliases.add(`{متغير:${plainName}}`);
    aliases.add(`{${plainName}}`);
    aliases.add(`{{${plainName}}}`);
  }

  return Array.from(aliases);
};

const normalizeNumericString = (value: string): string => {
  let normalized = String(value || '').trim();
  if (!normalized) return '';

  normalized = normalized
    .replace(/[٫]/g, '.')
    .replace(/[،]/g, '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));

  return normalized;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const normalized = normalizeNumericString(String(value));
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const findSnapshotValue = (
  snapshot: DocumentVariableSnapshot,
  name: string
): number | string | undefined => {
  const normalizedName = normalizeLookupKey(name);
  const direct = snapshot[normalizedName];
  if (direct !== undefined) return direct;

  const targetAliases = buildLookupAliases(normalizedName).map((alias) => alias.toLowerCase());
  if (targetAliases.length === 0) return undefined;
  const aliasSet = new Set(targetAliases);

  for (const [rawKey, value] of Object.entries(snapshot)) {
    const keyAliases = buildLookupAliases(rawKey);
    if (keyAliases.some((alias) => aliasSet.has(alias.toLowerCase()))) {
      return value;
    }
  }

  return undefined;
};

const replaceInlineSnapshotTokens = (
  rawText: string,
  snapshot: DocumentVariableSnapshot
): { value: string; replaced: boolean } => {
  let replaced = false;

  const value = rawText.replace(
    INLINE_TOKEN_REGEX,
    (match, globalName: string, doubleName: string, simpleName: string) => {
      const candidateName = normalizeLookupKey(globalName || doubleName || simpleName || '');
      if (!candidateName) return match;

      const resolved = findSnapshotValue(snapshot, candidateName);
      if (resolved === undefined) return match;

      replaced = true;
      return String(resolved);
    }
  );

  return { value, replaced };
};

const cloneTemplate = (template: FormTemplate): FormTemplate => {
  if (typeof structuredClone === 'function') {
    return structuredClone(template);
  }
  return JSON.parse(JSON.stringify(template)) as FormTemplate;
};

const applyResolvedNumberIfAvailable = <
  T extends object,
  K extends keyof T
>(
  target: T,
  key: K,
  snapshot: DocumentVariableSnapshot
) => {
  const resolved = resolveNumericBindingValue(target[key], snapshot);
  if (resolved !== undefined) {
    (target as any)[key] = resolved;
  }
};

const applyResolvedRule = (rule: TableV2DataTypeRule | undefined, snapshot: DocumentVariableSnapshot) => {
  if (!rule) return;
  applyResolvedNumberIfAvailable(rule, 'min', snapshot);
  applyResolvedNumberIfAvailable(rule, 'max', snapshot);
};

export const extractVariableNameFromToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  const globalMatch = raw.match(GLOBAL_TOKEN_REGEX);
  if (globalMatch?.[1]) return globalMatch[1].trim();

  const doubleBraceMatch = raw.match(DOUBLE_BRACE_TOKEN_REGEX);
  if (doubleBraceMatch?.[1]) return doubleBraceMatch[1].trim();

  const simpleBraceMatch = raw.match(SIMPLE_BRACE_TOKEN_REGEX);
  if (simpleBraceMatch?.[1]) return simpleBraceMatch[1].trim();

  return null;
};

export const isVariableToken = (value: unknown): boolean =>
  extractVariableNameFromToken(value) !== null;

export const buildGlobalVariableToken = (variableName: string): string =>
  `{Global:${String(variableName || '').trim()}}`;

export const buildDocumentVariableSnapshot = (
  variables: Array<{ name: string; value: unknown }>
): DocumentVariableSnapshot => {
  const snapshot: DocumentVariableSnapshot = {};
  variables.forEach((variable) => {
    const key = String(variable?.name || '').trim();
    if (!key) return;

    const numeric = toFiniteNumber(variable?.value);
    snapshot[key] = numeric !== undefined ? numeric : String(variable?.value ?? '');
  });
  return snapshot;
};

export const resolveDocumentVariableSnapshotValue = (
  rawValue: unknown,
  snapshot: DocumentVariableSnapshot
): number | string | undefined => {
  const tokenName = extractVariableNameFromToken(rawValue);
  if (tokenName) {
    const resolvedByToken = findSnapshotValue(snapshot, tokenName);
    if (resolvedByToken !== undefined) return resolvedByToken;
  }

  if (typeof rawValue === 'string') {
    return findSnapshotValue(snapshot, rawValue);
  }

  return undefined;
};

export const resolveDocumentVariableDisplayValue = (
  rawValue: unknown,
  snapshot: DocumentVariableSnapshot
): unknown => {
  if (typeof rawValue === 'string') {
    const directResolved = resolveDocumentVariableSnapshotValue(rawValue, snapshot);
    if (directResolved !== undefined) return directResolved;

    const { value, replaced } = replaceInlineSnapshotTokens(rawValue, snapshot);
    return replaced ? value : rawValue;
  }

  const resolved = resolveDocumentVariableSnapshotValue(rawValue, snapshot);
  return resolved !== undefined ? resolved : rawValue;
};

export const resolveNumericBindingValue = (
  rawValue: unknown,
  snapshot: DocumentVariableSnapshot
): number | undefined => {
  const numeric = toFiniteNumber(rawValue);
  if (numeric !== undefined) return numeric;

  const resolved = resolveDocumentVariableSnapshotValue(rawValue, snapshot);
  return toFiniteNumber(resolved);
};

const BASIC_INFO_NUMERIC_FIELDS: Array<keyof BasicInfo> = [
  'standard_weight',
  'shelf_life_months',
  'lot_size',
  'cartons_per_pallet',
  'packs_per_box',
  'boxes_per_carton',
  'empty_box_weight',
  'empty_carton_weight',
];

const applySnapshotToBasicInfo = (basicInfo: BasicInfo | undefined, snapshot: DocumentVariableSnapshot) => {
  if (!basicInfo) return;
  BASIC_INFO_NUMERIC_FIELDS.forEach((field) => {
    applyResolvedNumberIfAvailable(basicInfo, field, snapshot);
  });
};

const applySnapshotToTable = (table: Table, snapshot: DocumentVariableSnapshot) => {
  applyResolvedNumberIfAvailable(table, 'max_std', snapshot);
  applyResolvedNumberIfAvailable(table, 'sample_size', snapshot);
  applyResolvedNumberIfAvailable(table, 'inspection_period', snapshot);
  applyResolvedNumberIfAvailable(table, 'expiry_warning_days', snapshot);

  const numberConstraints = table.number_constraints;
  if (numberConstraints) {
    applyResolvedNumberIfAvailable(numberConstraints, 'min', snapshot);
    applyResolvedNumberIfAvailable(numberConstraints, 'max', snapshot);
    applyResolvedNumberIfAvailable(numberConstraints, 'step', snapshot);
  }

  (table.parameters || []).forEach((parameter: TableParameter) => {
    applyResolvedNumberIfAvailable(parameter, 'min', snapshot);
    applyResolvedNumberIfAvailable(parameter, 'max', snapshot);
    applyResolvedNumberIfAvailable(parameter, 'step', snapshot);
  });

  (table.columns || []).forEach((column: TableColumn) => {
    applyResolvedNumberIfAvailable(column, 'min', snapshot);
    applyResolvedNumberIfAvailable(column, 'max', snapshot);
    applyResolvedNumberIfAvailable(column, 'step', snapshot);
  });

  const schemaColumns = table.schema_v2?.columns || [];
  schemaColumns.forEach((column) => {
    if (!column.validation) return;
    applyResolvedNumberIfAvailable(column.validation, 'min', snapshot);
    applyResolvedNumberIfAvailable(column.validation, 'max', snapshot);
    applyResolvedNumberIfAvailable(column.validation, 'step', snapshot);
  });

  const dataTypeConfig = table.schema_v2?.meta?.data_type_config;
  if (dataTypeConfig?.row_rules) {
    dataTypeConfig.row_rules.forEach((rule) => applyResolvedRule(rule, snapshot));
  }
  if (dataTypeConfig?.cell_rules) {
    Object.values(dataTypeConfig.cell_rules).forEach((rule) => applyResolvedRule(rule, snapshot));
  }
};

export const applyDocumentVariableBindingsToTemplate = (
  template: FormTemplate,
  snapshot: DocumentVariableSnapshot
): FormTemplate => {
  const resolvedTemplate = cloneTemplate(template);
  applySnapshotToBasicInfo(resolvedTemplate.basic_info, snapshot);

  Object.values(resolvedTemplate.sections || {}).forEach((section) => {
    (section.tables || []).forEach((table) => {
      applySnapshotToTable(table, snapshot);
    });
  });

  return resolvedTemplate;
};
