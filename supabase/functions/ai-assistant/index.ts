import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {
  buildMaterialTermCandidates,
  expandStructuredQueryKeywords,
  extractDocumentSearchTerm,
  extractLabRunIdentifierFromQuery,
  extractMaterialNameFromApprovedSuppliersQuery,
  extractNcrIdentifierFromQuery,
  extractTaskIdentifierFromQuery,
  normalizeForBusinessMatch,
  stripArabicDefiniteArticle,
} from './businessGlossary.ts';
import {
  buildAiReadToolTag,
  getAiCapabilityDefinition,
  getAiReadToolDefinition,
  type AiCapabilityName,
  type AiReadToolName,
} from './toolRegistry.ts';

type RiskLevel = 'low' | 'medium' | 'high';
type AiProvider = 'openai' | 'openrouter' | 'google' | 'anthropic' | 'custom';

type AiSettingsUpdateInput = {
  is_enabled?: boolean;
  default_model?: string;
  temperature?: number;
  max_tokens?: number;
  api_provider?: AiProvider;
  api_base_url?: string;
  api_key?: string;
  clear_api_key?: boolean;
};

type ChatRequestPayload = {
  action?: 'chat' | 'execute' | 'get_settings' | 'save_settings';
  threadId?: string | null;
  message?: string;
  moduleHint?: string | null;
  locale?: string;
  mode?: 'propose' | 'execute';
  proposalId?: string;
  confirmationToken?: string;
  settings?: AiSettingsUpdateInput;
};

type ProposalCandidate = {
  tool_name: string;
  capability_name: AiCapabilityName;
  summary: string;
  risk_level: RiskLevel;
  resolved_risk?: RiskLevel;
  payload_summary?: string | null;
  entity_refs?: EntityRef[];
  permission_snapshot?: Record<string, unknown>;
  action_payload: Record<string, unknown>;
};

type LatestMaterialReceivingRow = {
  id: string;
  receiving_number: string | null;
  material_name: string | null;
  supplier_name: string | null;
  batch_number: string | null;
  status: string | null;
  received_at: string | null;
  created_at: string | null;
  quantity: number | null;
  unit: string | null;
};

type RawMaterialLookupRow = {
  id: string;
  name: string | null;
  code: string | null;
  company_id: string | null;
};

type RawMaterialSupplierLinkRow = {
  supplier_id: string | null;
  is_primary: boolean | null;
};

type SupplierLookupRow = {
  id: string;
  code: string | null;
  name: string | null;
};

type MaterialReceivingMaterialLookupRow = {
  raw_material_id: string | null;
  material_name: string | null;
  received_at: string | null;
  created_at: string | null;
};

type TaskLookupRow = {
  id: string;
  task_number: string | null;
  title: string | null;
  description?: string | null;
  task_type?: string | null;
  category?: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  current_stage: string | null;
  assigned_to_name: string | null;
  department: string | null;
  updated_at: string | null;
  created_at?: string | null;
};

type NcrLookupRow = {
  id: string;
  number: string | null;
  title: string | null;
  status: string | null;
  current_stage: string | null;
  department: string | null;
  product_name: string | null;
  related_material_name: string | null;
  related_supplier_name: string | null;
  date: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentLookupRow = {
  id: string;
  document_number: string | null;
  title: string | null;
  title_ar: string | null;
  description?: string | null;
  type: string | null;
  status: string | null;
  department_id: string | null;
  current_version: number | null;
  approved_at: string | null;
  updated_at: string | null;
};

type DocumentVersionLookupRow = {
  id: string;
  document_id: string;
  version: number | null;
  status: string | null;
  file_name: string | null;
  changes_summary: string | null;
  change_reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  updated_at: string | null;
};

type TaskCommentLookupRow = {
  id: string;
  task_id: string;
  content: string | null;
  author_name: string | null;
  edited: boolean | null;
  edited_at: string | null;
  created_at: string | null;
};

type TaskHistoryLookupRow = {
  id: string;
  task_id: string;
  action: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_by_name: string | null;
  created_at: string | null;
};

type LabV2RunLookupRow = {
  id: string;
  run_number: string | null;
  test_id: string | null;
  batch_number_snapshot: string | null;
  shift_snapshot: string | null;
  status: string | null;
  operator_name: string | null;
  approver_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  evaluation_result: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LabV2RunValueLookupRow = {
  id: string;
  param_key: string | null;
  value: string | null;
  numeric_value: number | null;
  evaluation_result: string | null;
  out_of_spec: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LabV2RunMeasurementLookupRow = {
  id: string;
  measurement_no: number | null;
  measured_at: string | null;
  notes: string | null;
  evaluation_result: string | null;
  failed_params: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  values?: LabV2RunValueLookupRow[] | null;
};

type LabV2RunMaterialLookupRow = {
  id: string;
  chemical_receipt_id: string | null;
  quantity_used: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string | null;
};

type LabV2RunMaterialSelectionLookupRow = {
  id: string;
  step_snapshot_key: string | null;
  chemical_id: string | null;
  chemical_receipt_id: string | null;
  planned_quantity: number | null;
  unit: string | null;
  selection_notes: string | null;
  consumption_posted_at: string | null;
  consumed_quantity: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type LabV2ChemicalLookupRow = {
  id: string;
  code: string | null;
  name: string | null;
  name_ar: string | null;
};

type LabV2ChemicalReceiptLookupRow = {
  id: string;
  receipt_number: string | null;
  lot_number: string | null;
  batch_number: string | null;
  chemical_id: string | null;
};

type LabV2RunDetailRow = LabV2RunLookupRow & {
  failed_params?: string[] | null;
  results_count?: number | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  measurements?: LabV2RunMeasurementLookupRow[] | null;
  materials?: LabV2RunMaterialLookupRow[] | null;
  material_selections?: LabV2RunMaterialSelectionLookupRow[] | null;
};

type LabV2TestLookupRow = {
  id: string;
  code: string | null;
  name: string | null;
  name_ar: string | null;
  test_family?: string | null;
  company_id?: string | null;
  is_active?: boolean | null;
};

type ProductLookupRow = {
  id: string;
  name: string | null;
  sku: string | null;
  company_id: string | null;
};

type UserDepartmentRow = {
  department_id: string | null;
};

type DepartmentLookupRow = {
  id: string;
  name: string | null;
};

type SafeTableMetadataRow = {
  table_name: string;
  column_name: string;
  data_type: string | null;
};

type SafeTableMetadata = {
  tableName: string;
  columns: string[];
  searchableColumns: string[];
  hasCompanyId: boolean;
  preferredOrderColumn: string | null;
};

type SafeCatalog = Record<string, SafeTableMetadata>;

type EntityRef = {
  table: string;
  id?: string | null;
  label?: string | null;
  display?: string | null;
};

type PageInfo = {
  page_size: number;
  returned_count: number;
  has_more: boolean;
  next_cursor: string | null;
  scanned_tables?: string[];
};

type StructuredDataQueryResult = {
  reply: string;
  toolTag: string;
  capability: AiCapabilityName;
  entityRefs: EntityRef[];
  pageInfo: PageInfo;
  truncated: boolean;
};

type ExecutedReadToolResult = {
  reply: string;
  toolName: AiReadToolName;
  toolTag: string;
  grounded: boolean;
  capability?: AiCapabilityName;
  entityRefs?: EntityRef[];
  pageInfo?: PageInfo | null;
  truncated?: boolean;
};

type NormalizedAiSettings = {
  is_enabled: boolean;
  default_model: string;
  temperature: number;
  max_tokens: number;
  api_provider: AiProvider;
  api_base_url: string;
  api_key_last4: string;
  api_key_updated_at: string | null;
};

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_PROVIDER: AiProvider = 'openai';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const SAFE_CATALOG_TTL_MS = 5 * 60 * 1000;

const BLOCKED_TABLE_PATTERNS: RegExp[] = [
  /^users$/i,
  /^user_/i,
  /^roles$/i,
  /permission/i,
  /access/i,
  /auth/i,
  /session/i,
  /token/i,
  /secret/i,
  /credential/i,
  /api_key/i,
  /audit/i,
  /^ai_/i,
  /^chat_/i,
  /signature/i,
  /share_activity_log/i,
];

const BLOCKED_COLUMN_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /api_key/i,
  /key/i,
  /hash/i,
  /salt/i,
  /otp/i,
  /jwt/i,
  /metadata/i,
  /ip/i,
  /email/i,
  /phone/i,
  /address/i,
  /avatar/i,
  /signature/i,
  /snapshot/i,
  /attachment/i,
];

const STRUCTURED_QUERY_STOP_WORDS = new Set([
  'ما',
  'ماذا',
  'ماهي',
  'ماهم',
  'من',
  'هم',
  'اعرض',
  'اريد',
  'أريد',
  'اظهر',
  'اظهرلي',
  'قائمة',
  'اخر',
  'آخر',
  'احدث',
  'أحدث',
  'عدد',
  'في',
  'على',
  'عن',
  'ال',
  'الى',
  'إلى',
  'هذا',
  'هذه',
  'ذلك',
  'تلك',
  'all',
  'show',
  'list',
  'latest',
  'last',
  'most',
  'recent',
  'for',
  'from',
  'the',
  'and',
  'with',
]);

const TABLE_KEYWORD_HINTS: Record<string, string[]> = {
  material_receiving: ['استلام', 'استلامات', 'receiving', 'receipt', 'batch', 'تشغيلة'],
  raw_materials: ['خامة', 'خامات', 'مادة', 'مواد', 'material', 'materials', 'flour', 'دقيق', 'طحين'],
  raw_material_suppliers: ['مورد', 'موردين', 'suppliers', 'supplier', 'اعتماد', 'approved'],
  suppliers: ['مورد', 'موردين', 'supplier', 'suppliers'],
  lab_tests: ['فحص', 'تحاليل', 'اختبار', 'test', 'tests', 'lab'],
  lab_v2_tests: ['فحص', 'test', 'lab', 'v2'],
  lab_v2_test_runs: ['تشغيل', 'run', 'runs', 'lab'],
  chat_conversations: ['دردشة', 'محادثات', 'محادثة', 'chat', 'conversation', 'conversations', 'group', 'department'],
  chat_messages: ['رسائل', 'رسالة', 'message', 'messages', 'chat', 'body', 'content'],
  documents: ['وثائق', 'وثيقة', 'مستند', 'مستندات', 'document', 'documents', 'sop'],
  document_versions: ['إصدارات', 'اصدار', 'إصدار', 'version', 'versions', 'document', 'revision'],
  document_templates: ['قالب', 'قوالب', 'template', 'templates', 'document'],
  document_categories: ['تصنيف', 'تصنيفات', 'category', 'categories', 'document'],
  ncr_reports_v2: ['ncr', 'عدم', 'مطابقة', 'reports'],
  ncr_reports: ['ncr', 'عدم', 'مطابقة', 'reports'],
  tasks: ['مهمة', 'مهام', 'task', 'tasks', 'تكليف'],
  task_comments: ['تعليقات', 'تعليق', 'comments', 'comment', 'task'],
  products: ['منتج', 'منتجات', 'product', 'products', 'صنف', 'أصناف'],
  recipe_versions: ['recipe', 'وصفة', 'وصفات', 'version', 'versions'],
  recipes: ['recipe', 'وصفة', 'وصفات'],
  inspection_criteria: ['معيار', 'معايير', 'inspection', 'criteria'],
};

type SafeTablePermissionRule = {
  moduleCode: string;
  requiredAction: string;
};

type SafeTablePermissionMatcher = {
  exact?: string[];
  prefix?: string;
  moduleCode: string;
  requiredAction: string;
};

const FORCED_ALLOWED_TABLES = new Set([
  'chat_conversations',
  'chat_messages',
  'chat_conversation_members',
  'documents',
  'document_versions',
  'document_templates',
  'document_categories',
  'inspection_criteria',
]);

const SAFE_TABLE_PERMISSION_MATCHERS: SafeTablePermissionMatcher[] = [
  { exact: ['material_receiving', 'lab_tests'], moduleCode: 'lab', requiredAction: 'view' },
  { prefix: 'lab_v2_', moduleCode: 'lab', requiredAction: 'view' },
  { exact: ['raw_materials', 'raw_material_suppliers', 'suppliers', 'products', 'recipes', 'recipe_versions'], moduleCode: 'master_data', requiredAction: 'view' },
  { exact: ['tasks'], moduleCode: 'tasks', requiredAction: 'view' },
  { prefix: 'task_', moduleCode: 'tasks', requiredAction: 'view' },
  { exact: ['documents'], moduleCode: 'documents', requiredAction: 'view' },
  { prefix: 'document_', moduleCode: 'documents', requiredAction: 'view' },
  { exact: ['inspection_criteria'], moduleCode: 'documents', requiredAction: 'view' },
  { exact: ['ncr_reports', 'ncr_reports_v2'], moduleCode: 'ncr', requiredAction: 'view' },
  { prefix: 'ncr_', moduleCode: 'ncr', requiredAction: 'view' },
  { exact: ['chat_conversations', 'chat_messages', 'chat_conversation_members'], moduleCode: 'chat', requiredAction: 'view_conversations' },
  { prefix: 'folder', moduleCode: 'forms_reports', requiredAction: 'view' },
  { prefix: 'template', moduleCode: 'forms_reports', requiredAction: 'view' },
  { prefix: 'report_', moduleCode: 'forms_reports', requiredAction: 'view' },
  { prefix: 'instance', moduleCode: 'forms_reports', requiredAction: 'view' },
];

const STATIC_SAFE_CATALOG: SafeCatalog = {
  material_receiving: {
    tableName: 'material_receiving',
    columns: [],
    searchableColumns: ['material_name', 'supplier_name', 'batch_number', 'receiving_number', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'received_at',
  },
  raw_materials: {
    tableName: 'raw_materials',
    columns: [],
    searchableColumns: ['name', 'code', 'category'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  raw_material_suppliers: {
    tableName: 'raw_material_suppliers',
    columns: [],
    searchableColumns: ['approval_status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  suppliers: {
    tableName: 'suppliers',
    columns: [],
    searchableColumns: ['name', 'code'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  lab_tests: {
    tableName: 'lab_tests',
    columns: [],
    searchableColumns: ['test_number', 'status', 'test_type'],
    hasCompanyId: true,
    preferredOrderColumn: 'created_at',
  },
  lab_v2_tests: {
    tableName: 'lab_v2_tests',
    columns: [],
    searchableColumns: ['name', 'code', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  lab_v2_test_runs: {
    tableName: 'lab_v2_test_runs',
    columns: [],
    searchableColumns: ['run_number', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  ncr_reports_v2: {
    tableName: 'ncr_reports_v2',
    columns: [],
    searchableColumns: ['number', 'title', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  ncr_reports: {
    tableName: 'ncr_reports',
    columns: [],
    searchableColumns: ['number', 'title', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  tasks: {
    tableName: 'tasks',
    columns: [],
    searchableColumns: ['task_number', 'title', 'description', 'status', 'priority'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  task_comments: {
    tableName: 'task_comments',
    columns: [],
    searchableColumns: ['content', 'author_name'],
    hasCompanyId: true,
    preferredOrderColumn: 'created_at',
  },
  documents: {
    tableName: 'documents',
    columns: [],
    searchableColumns: ['document_number', 'title', 'title_ar', 'status'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  document_versions: {
    tableName: 'document_versions',
    columns: [],
    searchableColumns: ['status', 'file_name', 'version'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  document_templates: {
    tableName: 'document_templates',
    columns: [],
    searchableColumns: ['name', 'description'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  document_categories: {
    tableName: 'document_categories',
    columns: [],
    searchableColumns: ['name', 'description'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  inspection_criteria: {
    tableName: 'inspection_criteria',
    columns: [],
    searchableColumns: ['name', 'description', 'category'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  chat_conversations: {
    tableName: 'chat_conversations',
    columns: [],
    searchableColumns: ['title', 'conversation_type'],
    hasCompanyId: true,
    preferredOrderColumn: 'last_message_at',
  },
  chat_messages: {
    tableName: 'chat_messages',
    columns: [],
    searchableColumns: ['body', 'message_type'],
    hasCompanyId: true,
    preferredOrderColumn: 'created_at',
  },
  products: {
    tableName: 'products',
    columns: [],
    searchableColumns: ['name', 'code', 'category'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  recipes: {
    tableName: 'recipes',
    columns: [],
    searchableColumns: ['name', 'name_en', 'notes'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  recipe_versions: {
    tableName: 'recipe_versions',
    columns: [],
    searchableColumns: ['name', 'notes', 'version_number'],
    hasCompanyId: true,
    preferredOrderColumn: 'created_at',
  },
};

let safeCatalogCache: { expiresAt: number; catalog: SafeCatalog } | null = null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS,
  });
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function isBlockedTableName(tableName: string): boolean {
  if (FORCED_ALLOWED_TABLES.has(tableName)) return false;
  return matchesAnyPattern(tableName, BLOCKED_TABLE_PATTERNS);
}

function isBlockedColumnName(columnName: string): boolean {
  if (columnName === 'company_id') return false;
  return matchesAnyPattern(columnName, BLOCKED_COLUMN_PATTERNS);
}

function getSafeTablePermissionRule(tableName: string): SafeTablePermissionRule | null {
  const normalizedTableName = normalizeText(tableName);
  if (!normalizedTableName) return null;

  for (const matcher of SAFE_TABLE_PERMISSION_MATCHERS) {
    const exactMatch = matcher.exact?.includes(normalizedTableName) ?? false;
    const prefixMatch = matcher.prefix ? normalizedTableName.startsWith(matcher.prefix) : false;
    if (!exactMatch && !prefixMatch) continue;
    return {
      moduleCode: matcher.moduleCode,
      requiredAction: matcher.requiredAction,
    };
  }

  return null;
}

function looksLikeWideListIntent(message: string): boolean {
  return /(كل|جميع|قائمة|اعرض(?:\s+لي)?\s+كل|show all|list all|all\b)/i.test(normalizeText(message));
}

function buildEntityRefsFromRows(
  tableName: string,
  rows: Array<Record<string, unknown>>,
  maxItems = 6,
): EntityRef[] {
  const displayPriority = ['title', 'name', 'document_number', 'task_number', 'run_number', 'number', 'material_name', 'supplier_name', 'body'];
  return rows.slice(0, maxItems).map((row) => {
    const displayColumn = displayPriority.find((column) => normalizeText(String(row[column] ?? '')));
    const displayValue = displayColumn ? normalizeText(String(row[displayColumn] ?? '')) : '';
    return {
      table: tableName,
      id: normalizeText(String(row.id ?? '')) || null,
      label: displayColumn || null,
      display: displayValue || null,
    };
  });
}

function escapeLikeTerm(value: string): string {
  return normalizeText(value).replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max = 90): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < min) return min;
  if (numeric > max) return max;
  return numeric;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function normalizeProvider(value: unknown): AiProvider {
  const provider = normalizeText(value).toLowerCase();
  if (provider === 'openrouter') return 'openrouter';
  if (provider === 'google') return 'google';
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'custom') return 'custom';
  return 'openai';
}

function defaultBaseUrl(provider: AiProvider): string {
  if (provider === 'openrouter') return DEFAULT_OPENROUTER_BASE_URL;
  if (provider === 'google') return DEFAULT_GOOGLE_BASE_URL;
  if (provider === 'anthropic') return DEFAULT_ANTHROPIC_BASE_URL;
  return DEFAULT_OPENAI_BASE_URL;
}

function normalizeBaseUrl(value: unknown, provider: AiProvider): string {
  const raw = normalizeText(value);
  if (!raw) return defaultBaseUrl(provider);
  return raw.replace(/\/+$/, '');
}

function maskApiKey(apiKey: string): string {
  const normalized = normalizeText(apiKey);
  if (!normalized) return '';
  if (normalized.length <= 4) return normalized;
  return normalized.slice(-4);
}

function normalizeApiKey(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return '';
  // Users sometimes paste keys as "Bearer <token>" which breaks downstream auth.
  return raw.replace(/^bearer\s+/i, '').trim();
}

function validateApiKeyForProvider(provider: AiProvider, apiKey: string): string | null {
  const normalizedKey = normalizeApiKey(apiKey);
  if (!normalizedKey) return null;

  if (provider === 'openrouter' && !/^sk-or-/i.test(normalizedKey)) {
    return 'OpenRouter API key must start with sk-or-.';
  }

  if (provider === 'openai' && (!/^sk-/i.test(normalizedKey) || /^sk-or-/i.test(normalizedKey))) {
    return 'OpenAI API key must start with sk- and not sk-or-.';
  }

  if (provider === 'google' && /^(sk-|sk-or-)/i.test(normalizedKey)) {
    return 'Google Gemini API key must be a Google API key, not an OpenAI/OpenRouter key.';
  }

  if (provider === 'anthropic' && /^sk-or-/i.test(normalizedKey)) {
    return 'Anthropic API key must be an Anthropic key, not an OpenRouter key.';
  }

  return null;
}

function buildCompletionsUrl(baseUrl: string): string {
  const normalized = normalizeText(baseUrl).replace(/\/+$/, '');
  if (!normalized) return `${DEFAULT_OPENAI_BASE_URL}/chat/completions`;
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

function buildAnthropicMessagesUrl(baseUrl: string): string {
  const normalized = normalizeText(baseUrl).replace(/\/+$/, '');
  if (!normalized) return `${DEFAULT_ANTHROPIC_BASE_URL}/messages`;
  if (normalized.endsWith('/messages')) return normalized;
  return `${normalized}/messages`;
}

function buildModelCandidates(provider: AiProvider, preferredModel: string): string[] {
  const candidates: string[] = [];
  const add = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  add(preferredModel);

  if (provider === 'openai') {
    add('gpt-4.1-mini');
    add('gpt-4o-mini');
    add('gpt-4o');
  } else if (provider === 'google') {
    add('gemini-2.5-flash');
    add('gemini-2.5-flash-lite');
    add('gemini-2.5-pro');
    add('gemini-2.0-flash');
  } else if (provider === 'anthropic') {
    add('claude-sonnet-4-20250514');
    add('claude-opus-4-20250514');
    add('claude-3-7-sonnet-latest');
    add('claude-3-5-sonnet-latest');
    add('claude-3-5-haiku-latest');
  } else if (provider === 'openrouter') {
    add('openai/gpt-4.1-mini');
    add('openai/gpt-4o-mini');
    add('openai/gpt-4o');
    if (!preferredModel.includes('/')) {
      add(`openai/${preferredModel}`);
    }
  }

  return candidates;
}

function summarizeAiError(rawError: string, locale: string): string {
  const value = normalizeText(rawError).toLowerCase();
  const isArabic = locale.startsWith('ar');

  if (!value) {
    return isArabic ? 'سبب غير معروف من مزود الذكاء الاصطناعي.' : 'Unknown provider error.';
  }

  if (value.includes('401') || value.includes('invalid api key') || value.includes('incorrect api key')) {
    return isArabic ? 'مفتاح API غير صحيح أو منتهي الصلاحية.' : 'API key is invalid or expired.';
  }

  if (value.includes('429') || value.includes('rate limit')) {
    return isArabic ? 'تم تجاوز حد الطلبات (Rate Limit).' : 'Rate limit exceeded.';
  }

  if (value.includes('404') || value.includes('model') || value.includes('does not exist')) {
    return isArabic ? 'الموديل المحدد غير متاح لدى المزود.' : 'Selected model is not available.';
  }

  if (value.includes('fetch failed') || value.includes('network') || value.includes('timeout')) {
    return isArabic ? 'فشل الاتصال بخادم مزود الذكاء الاصطناعي.' : 'Failed to reach AI provider server.';
  }

  return truncate(rawError, 220);
}

function getFallbackApiKey(provider: AiProvider): string {
  const openAiFallback = normalizeApiKey(Deno.env.get('OPENAI_API_KEY'));
  const googleFallback = normalizeApiKey(Deno.env.get('GEMINI_API_KEY')) || normalizeApiKey(Deno.env.get('GOOGLE_API_KEY'));
  const anthropicFallback = normalizeApiKey(Deno.env.get('ANTHROPIC_API_KEY'));
  if (provider === 'openrouter') {
    return normalizeApiKey(Deno.env.get('OPENROUTER_API_KEY')) || openAiFallback;
  }
  if (provider === 'google') {
    return googleFallback || openAiFallback;
  }
  if (provider === 'anthropic') {
    return anthropicFallback;
  }
  return openAiFallback;
}

function detectRisk(message: string): RiskLevel {
  const text = message.toLowerCase();
  if (
    /(delete|remove|drop|truncate|archive|destroy|احذف|حذف|امسح|ازالة|إزالة|اتلاف|إتلاف)/.test(text)
  ) {
    return 'high';
  }
  if (/(create|update|edit|modify|add|انشئ|أنشئ|اضف|أضف|عدل|تعديل|حدث|تحديث)/.test(text)) {
    return 'medium';
  }
  return 'low';
}

function extractQuotedText(message: string): string {
  const match = normalizeText(message).match(/["'“”«»](.+?)["'“”«»]/);
  return normalizeText(match?.[1] || '');
}

function extractValueAfterKeyword(message: string, keywords: string[]): string {
  const normalized = normalizeText(message);
  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped}\\s*[:：-]?\\s*(.+)$`, 'i');
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }
  return '';
}

function stripActionLeadText(value: string): string {
  return normalizeText(value)
    .replace(/^(?:انشئ|أنشئ|اضف|أضف|اعمل|create|add|update|edit|حدث|غيّر|غير|علق|أرسل|ارسل|send)\s+/i, '')
    .trim();
}

function extractTaskTitleForCreate(message: string): string {
  const quoted = extractQuotedText(message);
  if (quoted) return quoted;

  const byTitle = extractValueAfterKeyword(message, ['بعنوان', 'عنوان', 'title']);
  if (byTitle) return truncate(stripActionLeadText(byTitle), 160);

  return truncate(
    stripActionLeadText(
      normalizeText(message).replace(/^(?:انشئ|أنشئ|اضف|أضف|اعمل|create|add)\s+(?:لي\s+)?(?:مهمة|task)\s*/i, ''),
    ),
    160,
  );
}

function extractTaskDescription(message: string): string {
  return truncate(extractValueAfterKeyword(message, ['الوصف', 'description', 'details', 'تفاصيل']), 600);
}

function normalizeTaskStatusUpdate(message: string): string | null {
  const text = normalizeText(message).toLowerCase();
  if (/(مكتمل|منجز|closed|complete|completed)/.test(text)) return 'completed';
  if (/(قيد التنفيذ|in progress|in_progress|started|ابدأ|ابدء)/.test(text)) return 'in_progress';
  if (/(معل[قة]|pending|open|new)/.test(text)) return 'pending';
  if (/(ملغ|cancelled|canceled)/.test(text)) return 'cancelled';
  if (/(متأخر|overdue)/.test(text)) return 'overdue';
  if (/(معلق مؤقت|on hold|on_hold)/.test(text)) return 'on_hold';
  return null;
}

function normalizeTaskPriorityUpdate(message: string): string | null {
  const text = normalizeText(message).toLowerCase();
  if (/(عاجل|urgent)/.test(text)) return 'urgent';
  if (/(عالي|مرتف|high)/.test(text)) return 'high';
  if (/(متوسط|medium)/.test(text)) return 'medium';
  if (/(منخفض|low)/.test(text)) return 'low';
  return null;
}

function detectDocumentType(message: string): string {
  const text = normalizeText(message).toLowerCase();
  if (/(sop|إجراء|اجراء)/.test(text)) return 'sop';
  if (/(work instruction|تعليمات|wi)/.test(text)) return 'work_instruction';
  if (/(manual|دليل)/.test(text)) return 'manual';
  if (/(form|نموذج)/.test(text)) return 'form';
  if (/(policy|سياسة)/.test(text)) return 'policy';
  if (/(spec|specification|مواصفة)/.test(text)) return 'specification';
  return 'other';
}

function extractDocumentTitleForCreate(message: string): string {
  const quoted = extractQuotedText(message);
  if (quoted) return quoted;
  const byTitle = extractValueAfterKeyword(message, ['بعنوان', 'عنوان', 'title']);
  if (byTitle) return truncate(stripActionLeadText(byTitle), 160);
  return truncate(
    stripActionLeadText(
      normalizeText(message).replace(/^(?:انشئ|أنشئ|اضف|أضف|create|add)\s+(?:لي\s+)?(?:وثيقة|document)\s*/i, ''),
    ),
    160,
  );
}

function extractDocumentContent(message: string): string {
  return truncate(extractValueAfterKeyword(message, ['المحتوى', 'content', 'النص', 'text']), 4000);
}

function extractDocumentVersionSummary(message: string): string {
  return truncate(extractValueAfterKeyword(message, ['ملخص', 'summary', 'changes', 'التعديلات']), 240);
}

function extractChatConversationTerm(message: string): string {
  const byKeyword = extractValueAfterKeyword(message, ['في محادثة', 'الى محادثة', 'إلى محادثة', 'conversation']);
  return truncate(stripActionLeadText(byKeyword || extractQuotedText(message)), 140);
}

function extractChatBody(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['الرسالة', 'message', 'body', 'المحتوى']);
  if (explicit) return truncate(explicit, 4000);
  return truncate(extractQuotedText(message), 4000);
}

function extractMaterialReceivingDraftPayload(message: string): {
  material_name: string;
  supplier_name: string;
  batch_number: string;
  quantity: number | null;
  unit: string;
  material_type: string;
} {
  const material_name = truncate(
    extractValueAfterKeyword(message, ['الخامة', 'المادة', 'material', 'material name']) ||
      extractMaterialNameFromApprovedSuppliersQuery(message) ||
      extractQuotedText(message),
    140,
  );
  const supplier_name = truncate(
    extractValueAfterKeyword(message, ['المورد', 'supplier', 'supplier name']),
    140,
  );
  const batch_number = truncate(
    extractValueAfterKeyword(message, ['الباتش', 'الدفعة', 'batch', 'batch number', 'lot']),
    120,
  );
  const quantityMatch = normalizeText(message).match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|ton|طن|كجم|كيلو|لتر|liter|litre|ml|مل|piece|pcs|قطعة)?/i);
  const quantity = quantityMatch?.[1] ? Number(quantityMatch[1]) : null;
  const unit = normalizeText(quantityMatch?.[2] || '') || 'kg';
  let material_type = 'raw_material';
  const text = normalizeText(message).toLowerCase();
  if (/(chemical|كيميائ)/.test(text)) material_type = 'chemical';
  else if (/(packaging|تعبئ|تغليف)/.test(text)) material_type = 'packaging';
  else if (/(ingredient|مكون)/.test(text)) material_type = 'ingredient';
  else if (/(additive|مضاف)/.test(text)) material_type = 'additive';
  return { material_name, supplier_name, batch_number, quantity, unit, material_type };
}

function hasCreateTaskIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('task') || /(مهمة|task)/.test(text)) && /(انشئ|أنشئ|اضف|أضف|اعمل|create|add)/.test(text);
}

function hasTaskCommentIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('task') || /(مهمة|task)/.test(text)) && /(تعليق|علق|comment)/.test(text);
}

function hasTaskUpdateIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('task') || /(مهمة|task)/.test(text)) && /(حدث|تحديث|عدل|عدّل|غير|غيّر|update|edit|change)/.test(text);
}

function hasDocumentCreateIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('document') || /(وثيقة|document)/.test(text)) && /(انشئ|أنشئ|اضف|أضف|create|add)/.test(text) && !/(اصدار|إصدار|version)/.test(text);
}

function hasDocumentVersionIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('document') || /(وثيقة|document)/.test(text)) && /(اصدار|إصدار|version)/.test(text) && /(انشئ|أنشئ|اضف|أضف|create|add)/.test(text);
}

function hasMaterialReceivingCreateIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('lab') || /(استلام|receiving|receipt|مختبر)/.test(text)) && /(انشئ|أنشئ|اضف|أضف|create|add)/.test(text);
}

function hasChatSendIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('chat') || /(رسالة|message|دردشة|chat)/.test(text)) && /(ارسل|أرسل|send)/.test(text);
}

function trimStructuredValue(value: string): string {
  return normalizeText(value).replace(
    /\s+(?:الدفعة|batch|batch number|lot|الوردية|shift|المنتج|product|الجهاز|device|الوصف|description|ملاحظات|notes|سبب|reason|تعليق|comment)\b.*$/i,
    '',
  ).trim();
}

function normalizeNcrSeverity(message: string): string | null {
  const text = normalizeText(message).toLowerCase();
  if (/(critical|حرج|خطير جدا|خطير جدًا)/.test(text)) return 'critical';
  if (/(major|high|عالي|كبرى|كبير)/.test(text)) return 'high';
  if (/(minor|low|منخفض|صغرى|صغير)/.test(text)) return 'low';
  if (/(medium|متوسط)/.test(text)) return 'medium';
  return null;
}

function extractNcrTitleForCreate(message: string): string {
  const quoted = extractQuotedText(message);
  if (quoted) return truncate(quoted, 180);

  const explicit = extractValueAfterKeyword(message, ['بعنوان', 'عنوان', 'title']);
  if (explicit) return truncate(trimStructuredValue(stripActionLeadText(explicit)), 180);

  const description = extractNcrDescription(message);
  if (description) return truncate(description, 120);

  return truncate(
    stripActionLeadText(
      normalizeText(message).replace(/^(?:انشئ|أنشئ|اضف|أضف|اعمل|create|add)\s+(?:لي\s+)?(?:تقرير\s+)?(?:ncr|عدم\s+مطابقة)\s*/i, ''),
    ),
    180,
  );
}

function extractNcrDescription(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['الوصف', 'description', 'details', 'تفاصيل']);
  if (explicit) return truncate(explicit, 1500);

  const tail = normalizeText(message).replace(/^(?:انشئ|أنشئ|اضف|أضف|اعمل|create|add)\s+(?:لي\s+)?(?:تقرير\s+)?(?:ncr|عدم\s+مطابقة)\s*/i, '');
  return truncate(trimStructuredValue(tail), 1500);
}

function extractNcrDepartment(message: string): string {
  return truncate(trimStructuredValue(extractValueAfterKeyword(message, ['القسم', 'department'])), 140);
}

function extractNcrImmediateAction(message: string): string {
  return truncate(
    extractValueAfterKeyword(message, ['الإجراء الفوري', 'الاجراء الفوري', 'الإجراء', 'الاجراء', 'immediate action', 'action']),
    1000,
  );
}

function extractNcrComment(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['تعليق', 'comment', 'ملاحظة', 'note', 'رسالة', 'message']);
  if (explicit) return truncate(explicit, 2000);
  return truncate(extractQuotedText(message), 2000);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeDateInput(value: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const slashMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^(today|اليوم)$/i.test(normalized)) return addDaysIso(0);
  if (/^(tomorrow|غد|غدا)$/i.test(normalized)) return addDaysIso(1);

  const daysMatch = normalized.match(/(?:after|بعد)\s*(\d+)\s*(?:day|days|يوم|ايام|أيام)/i);
  if (daysMatch) {
    const offset = Number(daysMatch[1] || 0);
    if (Number.isFinite(offset) && offset >= 0) {
      return addDaysIso(offset);
    }
  }

  return '';
}

function extractNcrActionType(message: string): 'corrective' | 'preventive' {
  const text = normalizeText(message).toLowerCase();
  return /(وقائي|preventive)/.test(text) ? 'preventive' : 'corrective';
}

function extractNcrActionDescription(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['وصف الإجراء', 'وصف الاجراء', 'الإجراء', 'الاجراء', 'action', 'description']);
  if (explicit) {
    return truncate(trimStructuredValue(explicit.replace(/\s+(?:القسم|المسؤول|تاريخ|target date|due date)\b.*$/i, '')), 1000);
  }

  const quoted = extractQuotedText(message);
  if (quoted) return truncate(quoted, 1000);

  const stripped = normalizeText(message)
    .replace(/^(?:اضف|أضف|انشئ|أنشئ|اعمل|create|add)\s+(?:إجراء|اجراء|capa|action)\s*/i, '')
    .replace(/\s+(?:على|لـ|ل)\s*(?:ncr|عدم\s+مطابقة)\b/i, '')
    .replace(/\s+(?:القسم|المسؤول|تاريخ|target date|due date)\b.*$/i, '');
  return truncate(trimStructuredValue(stripped), 1000);
}

function extractNcrResponsibleDept(message: string): string {
  return truncate(
    trimStructuredValue(extractValueAfterKeyword(message, ['القسم المسؤول', 'القسم', 'department', 'responsible department'])),
    140,
  );
}

function extractNcrResponsiblePerson(message: string): string {
  return truncate(
    trimStructuredValue(extractValueAfterKeyword(message, ['المسؤول', 'الشخص المسؤول', 'responsible person', 'owner', 'assignee'])),
    140,
  );
}

function extractNcrTargetDate(message: string): string {
  const explicit = normalizeDateInput(
    extractValueAfterKeyword(message, ['تاريخ الاستحقاق', 'الاستحقاق', 'تاريخ التنفيذ', 'target date', 'due date', 'date']),
  );
  if (explicit) return explicit;
  return addDaysIso(7);
}

function hasNcrCreateIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('ncr') || /\bncr\b|عدم\s+مطابقة/.test(text)) && /(انشئ|أنشئ|اضف|أضف|اعمل|create|add)/.test(text);
}

function hasNcrCommentIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('ncr') || /\bncr\b|عدم\s+مطابقة/.test(text)) && /(تعليق|comment|ملاحظة|note|رسالة|message)/.test(text);
}

function hasNcrAddActionIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  return (hint.includes('ncr') || /\bncr\b|عدم\s+مطابقة/.test(text)) &&
    /(إجراء|اجراء|action|capa)/.test(text) &&
    /(اضف|أضف|انشئ|أنشئ|اعمل|create|add)/.test(text);
}

function extractLabV2TestTerm(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['للفحص', 'الفحص', 'اختبار', 'test', 'analysis', 'تحليل']);
  if (explicit) return truncate(trimStructuredValue(explicit), 180);
  return '';
}

function extractLabV2ProductTerm(message: string): string {
  return truncate(trimStructuredValue(extractValueAfterKeyword(message, ['المنتج', 'product'])), 180);
}

function extractLabV2BatchNumber(message: string): string {
  return truncate(trimStructuredValue(extractValueAfterKeyword(message, ['الدفعة', 'batch', 'batch number', 'lot'])), 120);
}

function extractLabV2Shift(message: string): string {
  return truncate(trimStructuredValue(extractValueAfterKeyword(message, ['الوردية', 'shift'])), 80);
}

function extractLabV2RunNotes(message: string): string {
  return truncate(extractValueAfterKeyword(message, ['ملاحظات', 'ملاحظة', 'notes', 'note']), 1000);
}

function extractLabV2RejectionReason(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['سبب الرفض', 'سبب', 'reason', 'rejection reason']);
  if (explicit) return truncate(explicit, 1000);
  return truncate(extractQuotedText(message), 1000);
}

function stripRunTrailingContext(value: string): string {
  return normalizeText(value).replace(/\s+(?:في|ل|on)?\s*(?:التشغيل|التشغيلة|run)(?=\s|$|[.,،:;!?]).*$/i, '').trim();
}

function sanitizeLabV2ParameterTerm(
  value: string,
  knownValueText?: string | null,
  knownNumericValue?: number | null,
): string {
  let normalized = normalizeText(value);
  if (!normalized) return '';

  normalized = normalized.replace(/^(?:قيمة|value|نتيجة|result)\s+/i, '').trim();
  normalized = stripRunTrailingContext(normalized);

  const knownText = normalizeText(knownValueText);
  if (knownText) {
    const escapedKnownText = knownText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`\\s+${escapedKnownText}(?:\\s+(?:في|ل|on)?\\s*(?:التشغيل|التشغيلة|run)(?=\\s|$|[.,،:;!?]).*)?$`, 'i'), '').trim();
  }

  if (Number.isFinite(knownNumericValue as number)) {
    const numericText = String(knownNumericValue);
    const escapedNumericText = numericText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`\\s+${escapedNumericText}(?:\\s+(?:في|ل|on)?\\s*(?:التشغيل|التشغيلة|run)(?=\\s|$|[.,،:;!?]).*)?$`, 'i'), '').trim();
  }

  normalized = normalized.replace(/\s+[-+]?\d+(?:[.,]\d+)?(?:\s+(?:في|ل|on)?\s*(?:التشغيل|التشغيلة|run)(?=\s|$|[.,،:;!?]).*)?$/i, '').trim();
  normalized = stripRunTrailingContext(normalized);

  return truncate(normalized, 160);
}

function extractLabV2ParameterTerm(message: string): string {
  const explicit = extractValueAfterKeyword(message, ['الباراميتر', 'المعامل', 'البند', 'parameter', 'param']);
  if (explicit) return sanitizeLabV2ParameterTerm(explicit);

  const natural = normalizeText(message).match(
    /(?:قيمة|value|نتيجة|result)\s+(.+?)\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))(?:\s+(?:في|ل|on)?\s*(?:التشغيل|التشغيلة|run)(?=\s|$|[.,،:;!?])|$)/i,
  );
  const candidate = normalizeText(natural?.[1] || '');
  const knownValueText = normalizeText(natural?.[2] || natural?.[3] || natural?.[4] || '');
  const knownNumericValue = /^[-+]?\d+(?:[.,]\d+)?$/.test(knownValueText)
    ? Number(knownValueText.replace(',', '.'))
    : null;
  return sanitizeLabV2ParameterTerm(candidate, knownValueText, knownNumericValue);
}

function extractLabV2ValueInput(message: string): { value: string | null; numeric_value: number | null } {
  const explicit = stripRunTrailingContext(
    extractValueAfterKeyword(message, ['القيمة', 'النتيجة', 'value', 'result']),
  );
  const fallbackMatch = normalizeText(message).match(
    /(?:قيمة|value|نتيجة|result)\s+.+?\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))(?:\s+(?:في|ل|on)?\s*(?:التشغيل|التشغيلة|run)(?=\s|$|[.,،:;!?])|$)/i,
  );
  const raw = normalizeText(explicit || fallbackMatch?.[1] || fallbackMatch?.[2] || fallbackMatch?.[3] || '');
  if (!raw) return { value: null, numeric_value: null };

  const numericCandidate = raw.replace(',', '.');
  const numeric_value = /^[-+]?\d+(?:[.,]\d+)?$/.test(raw) ? Number(numericCandidate) : null;
  return {
    value: raw,
    numeric_value: Number.isFinite(numeric_value as number) ? numeric_value : null,
  };
}

function hasLabV2CreateRunIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasLab = /(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab');
  const hasRun = /(تشغيل|تشغيلة|run)/.test(text);
  return hasLab && hasRun && /(انشئ|أنشئ|اضف|أضف|create|add|ابدأ|ابدء|start)/.test(text);
}

function hasLabV2AddMeasurementIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasRunIdentifier = Boolean(extractLabRunIdentifierFromQuery(message));
  const hasLabRun = hasRunIdentifier || (((/(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab')) && /(تشغيل|تشغيلة|run)/.test(text)));
  return hasLabRun && /(قياس|measurement)/.test(text) && /(انشئ|أنشئ|اضف|أضف|create|add|سجل|سجّل|record)/.test(text);
}

function hasLabV2SaveValuesIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasRunIdentifier = Boolean(extractLabRunIdentifierFromQuery(message));
  const hasLabRun = hasRunIdentifier || (((/(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab')) && /(تشغيل|تشغيلة|run)/.test(text)));
  return hasLabRun &&
    /(قيمة|قيم|value|values|نتيجة|result)/.test(text) &&
    /(اضف|أضف|سجل|سجّل|record|update|حدث|حدّث|عدل|عدّل|set)/.test(text);
}

function hasLabV2CompleteRunIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasRunIdentifier = Boolean(extractLabRunIdentifierFromQuery(message));
  const hasLabRun = hasRunIdentifier || (((/(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab')) && /(تشغيل|تشغيلة|run)/.test(text)));
  return hasLabRun && /(اكمل|أكمل|انهي|أنهِ|انهي|أغلق|اغلق|complete|finish|close|submit)/.test(text) && !/(اعتمد|approve|ارفض|رفض|reject)/.test(text);
}

function hasLabV2ApproveRunIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasRunIdentifier = Boolean(extractLabRunIdentifierFromQuery(message));
  const hasLabRun = hasRunIdentifier || (((/(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab')) && /(تشغيل|تشغيلة|run)/.test(text)));
  return hasLabRun && /(اعتمد|اعتماد|approve)/.test(text);
}

function hasLabV2RejectRunIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasRunIdentifier = Boolean(extractLabRunIdentifierFromQuery(message));
  const hasLabRun = hasRunIdentifier || (((/(مختبر|معمل|تحاليل|lab)/.test(text) || hint.includes('lab')) && /(تشغيل|تشغيلة|run)/.test(text)));
  return hasLabRun && /(ارفض|أرفض|رفض|reject)/.test(text);
}

function buildProposalCandidate(params: {
  capabilityName: AiCapabilityName;
  summary: string;
  payload: Record<string, unknown>;
  entityRefs?: EntityRef[];
  payloadSummary?: string | null;
}): ProposalCandidate {
  const capability = getAiCapabilityDefinition(params.capabilityName);
  const confirmationToken =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    tool_name: params.capabilityName,
    capability_name: params.capabilityName,
    summary: truncate(params.summary, 240),
    risk_level: capability.riskLevel,
    resolved_risk: capability.riskLevel,
    payload_summary: params.payloadSummary || null,
    entity_refs: params.entityRefs || [],
    permission_snapshot: {
      module_code: capability.moduleCode,
      required_action: capability.requiredAction,
      uses_user_scope: capability.usesUserScope,
    },
    action_payload: {
      capability_name: params.capabilityName,
      confirmation_token: confirmationToken,
      payload: params.payload,
      entity_refs: params.entityRefs || [],
      payload_summary: params.payloadSummary || null,
      permission_snapshot: {
        module_code: capability.moduleCode,
        required_action: capability.requiredAction,
      },
      resolved_risk: capability.riskLevel,
      mode: 'confirm_all',
    },
  };
}

function buildActionProposals(message: string, moduleHint: string | null): ProposalCandidate[] {
  const taskIdentifier = extractTaskIdentifierFromQuery(message);
  const ncrIdentifier = extractNcrIdentifierFromQuery(message);
  const labRunIdentifier = extractLabRunIdentifierFromQuery(message);

  if (hasTaskCommentIntent(message, moduleHint) && taskIdentifier) {
    const comment = truncate(extractValueAfterKeyword(message, ['تعليق', 'comment']) || extractQuotedText(message), 1000);
    if (comment) {
      return [
        buildProposalCandidate({
          capabilityName: 'tasks.add_comment',
          summary: `إضافة تعليق إلى المهمة ${taskIdentifier}`,
          payload: { task_identifier: taskIdentifier, comment },
          entityRefs: [{ table: 'tasks', label: 'task_identifier', display: taskIdentifier }],
          payloadSummary: `التعليق: ${truncate(comment, 160)}`,
        }),
      ];
    }
  }

  if (hasTaskUpdateIntent(message, moduleHint) && taskIdentifier) {
    const updates: Record<string, unknown> = {};
    const status = normalizeTaskStatusUpdate(message);
    const priority = normalizeTaskPriorityUpdate(message);
    const title = extractValueAfterKeyword(message, ['بعنوان', 'عنوان', 'title']);
    const description = extractTaskDescription(message);
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (title) updates.title = truncate(title, 200);
    if (description) updates.description = description;

    if (Object.keys(updates).length > 0) {
      return [
        buildProposalCandidate({
          capabilityName: 'tasks.update',
          summary: `تحديث المهمة ${taskIdentifier}`,
          payload: { task_identifier: taskIdentifier, updates },
          entityRefs: [{ table: 'tasks', label: 'task_identifier', display: taskIdentifier }],
          payloadSummary: `الحقول: ${Object.keys(updates).join(', ')}`,
        }),
      ];
    }
  }

  if (hasCreateTaskIntent(message, moduleHint)) {
    const title = extractTaskTitleForCreate(message);
    if (title) {
      const description = extractTaskDescription(message);
      const priority = normalizeTaskPriorityUpdate(message) || 'medium';
      return [
        buildProposalCandidate({
          capabilityName: 'tasks.create',
          summary: `إنشاء مهمة جديدة بعنوان: ${title}`,
          payload: { title, description: description || null, priority },
          entityRefs: [{ table: 'tasks', label: 'title', display: title }],
          payloadSummary: `الأولوية: ${priority}${description ? ` | الوصف: ${truncate(description, 120)}` : ''}`,
        }),
      ];
    }
  }

  if (hasNcrCommentIntent(message, moduleHint) && ncrIdentifier) {
    const comment = extractNcrComment(message);
    if (comment) {
      return [
        buildProposalCandidate({
          capabilityName: 'ncr.add_comment',
          summary: `إضافة تعليق إلى NCR ${ncrIdentifier}`,
          payload: { ncr_identifier: ncrIdentifier, comment },
          entityRefs: [{ table: 'ncr_reports', label: 'ncr_identifier', display: ncrIdentifier }],
          payloadSummary: `التعليق: ${truncate(comment, 160)}`,
        }),
      ];
    }
  }

  if (hasNcrAddActionIntent(message, moduleHint) && ncrIdentifier) {
    const description = extractNcrActionDescription(message);
    if (description) {
      const type = extractNcrActionType(message);
      const responsible_dept = extractNcrResponsibleDept(message) || null;
      const responsible_person = extractNcrResponsiblePerson(message) || null;
      const target_date = extractNcrTargetDate(message);
      return [
        buildProposalCandidate({
          capabilityName: 'ncr.add_action',
          summary: `إضافة إجراء ${type === 'preventive' ? 'وقائي' : 'تصحيحي'} إلى NCR ${ncrIdentifier}`,
          payload: {
            ncr_identifier: ncrIdentifier,
            type,
            description,
            responsible_dept,
            responsible_person,
            target_date,
          },
          entityRefs: [{ table: 'ncr_reports', label: 'ncr_identifier', display: ncrIdentifier }],
          payloadSummary: `الوصف: ${truncate(description, 120)} | الاستحقاق: ${target_date}${responsible_person ? ` | المسؤول: ${responsible_person}` : ''}${responsible_dept ? ` | القسم: ${responsible_dept}` : ''}`,
        }),
      ];
    }
  }

  if (hasNcrCreateIntent(message, moduleHint)) {
    const title = extractNcrTitleForCreate(message);
    const description = extractNcrDescription(message);
    if (title || description) {
      const severity = normalizeNcrSeverity(message) || 'medium';
      const department = extractNcrDepartment(message) || null;
      const immediate_action = extractNcrImmediateAction(message) || null;
      return [
        buildProposalCandidate({
          capabilityName: 'ncr.create_draft',
          summary: `إنشاء NCR جديد بعنوان: ${title || truncate(description, 80)}`,
          payload: {
            title: title || truncate(description, 120),
            description: description || null,
            severity,
            department,
            immediate_action,
          },
          entityRefs: [{ table: 'ncr_reports', label: 'title', display: title || truncate(description, 80) }],
          payloadSummary: `الخطورة: ${severity}${department ? ` | القسم: ${department}` : ''}`,
        }),
      ];
    }
  }

  if (hasDocumentVersionIntent(message, moduleHint)) {
    const documentTerm = extractDocumentSearchTerm(message);
    if (documentTerm) {
      const content = extractDocumentContent(message);
      const changesSummary = extractDocumentVersionSummary(message);
      return [
        buildProposalCandidate({
          capabilityName: 'documents.create_version',
          summary: `إنشاء إصدار جديد للوثيقة ${documentTerm}`,
          payload: {
            document_term: documentTerm,
            content: content || null,
            changes_summary: changesSummary || null,
          },
          entityRefs: [{ table: 'documents', label: 'document_term', display: documentTerm }],
          payloadSummary: changesSummary ? `ملخص التعديلات: ${changesSummary}` : null,
        }),
      ];
    }
  }

  if (hasDocumentCreateIntent(message, moduleHint)) {
    const title = extractDocumentTitleForCreate(message);
    if (title) {
      const content = extractDocumentContent(message);
      const documentType = detectDocumentType(message);
      return [
        buildProposalCandidate({
          capabilityName: 'documents.create_draft',
          summary: `إنشاء وثيقة مسودة بعنوان: ${title}`,
          payload: {
            title,
            title_ar: title,
            type: documentType,
            content: content || null,
          },
          entityRefs: [{ table: 'documents', label: 'title', display: title }],
          payloadSummary: `النوع: ${documentType}`,
        }),
      ];
    }
  }

  if (hasMaterialReceivingCreateIntent(message, moduleHint)) {
    const payload = extractMaterialReceivingDraftPayload(message);
    if (payload.material_name && payload.batch_number && payload.quantity && payload.unit) {
      return [
        buildProposalCandidate({
          capabilityName: 'material_receiving.create_draft',
          summary: `إنشاء استلام مادة جديد للخامة ${payload.material_name}`,
          payload,
          entityRefs: [{ table: 'material_receiving', label: 'material_name', display: payload.material_name }],
          payloadSummary: `الدفعة: ${payload.batch_number} | الكمية: ${payload.quantity} ${payload.unit}${payload.supplier_name ? ` | المورد: ${payload.supplier_name}` : ''}`,
        }),
      ];
    }
  }

  if (hasLabV2SaveValuesIntent(message, moduleHint) && labRunIdentifier) {
    const parameter_term = extractLabV2ParameterTerm(message);
    const valueInput = extractLabV2ValueInput(message);
    if (parameter_term && (valueInput.value || valueInput.numeric_value != null)) {
      return [
        buildProposalCandidate({
          capabilityName: 'lab_v2.save_values',
          summary: `تسجيل قيمة الباراميتر ${parameter_term} في التشغيل ${labRunIdentifier}`,
          payload: {
            run_identifier: labRunIdentifier,
            parameter_term,
            value: valueInput.value,
            numeric_value: valueInput.numeric_value,
          },
          entityRefs: [{ table: 'lab_v2_test_runs', label: 'run_identifier', display: labRunIdentifier }],
          payloadSummary: `الباراميتر: ${parameter_term} | القيمة: ${valueInput.value ?? valueInput.numeric_value}`,
        }),
      ];
    }
  }

  if (hasLabV2AddMeasurementIntent(message, moduleHint) && labRunIdentifier) {
    const notes = extractLabV2RunNotes(message) || null;
    return [
      buildProposalCandidate({
        capabilityName: 'lab_v2.add_measurement',
        summary: `إضافة قياس جديد إلى التشغيل ${labRunIdentifier}`,
        payload: {
          run_identifier: labRunIdentifier,
          notes,
        },
        entityRefs: [{ table: 'lab_v2_test_runs', label: 'run_identifier', display: labRunIdentifier }],
        payloadSummary: notes ? `ملاحظات القياس: ${truncate(notes, 160)}` : null,
      }),
    ];
  }

  if (hasLabV2ApproveRunIntent(message, moduleHint) && labRunIdentifier) {
    const approval_notes = extractLabV2RunNotes(message) || null;
    return [
      buildProposalCandidate({
        capabilityName: 'lab_v2.approve_run',
        summary: `اعتماد تشغيل المختبر ${labRunIdentifier}`,
        payload: { run_identifier: labRunIdentifier, approval_notes },
        entityRefs: [{ table: 'lab_v2_test_runs', label: 'run_identifier', display: labRunIdentifier }],
        payloadSummary: approval_notes ? `ملاحظات الاعتماد: ${truncate(approval_notes, 160)}` : null,
      }),
    ];
  }

  if (hasLabV2RejectRunIntent(message, moduleHint) && labRunIdentifier) {
    const reason = extractLabV2RejectionReason(message);
    if (reason) {
      return [
        buildProposalCandidate({
          capabilityName: 'lab_v2.reject_run',
          summary: `رفض تشغيل المختبر ${labRunIdentifier}`,
          payload: { run_identifier: labRunIdentifier, reason },
          entityRefs: [{ table: 'lab_v2_test_runs', label: 'run_identifier', display: labRunIdentifier }],
          payloadSummary: `سبب الرفض: ${truncate(reason, 160)}`,
        }),
      ];
    }
  }

  if (hasLabV2CompleteRunIntent(message, moduleHint) && labRunIdentifier) {
    const notes = extractLabV2RunNotes(message) || null;
    return [
      buildProposalCandidate({
        capabilityName: 'lab_v2.complete_run',
        summary: `إكمال تشغيل المختبر ${labRunIdentifier}`,
        payload: { run_identifier: labRunIdentifier, notes },
        entityRefs: [{ table: 'lab_v2_test_runs', label: 'run_identifier', display: labRunIdentifier }],
        payloadSummary: notes ? `ملاحظات الإكمال: ${truncate(notes, 160)}` : null,
      }),
    ];
  }

  if (hasLabV2CreateRunIntent(message, moduleHint)) {
    const test_term = extractLabV2TestTerm(message);
    if (test_term) {
      const batch_number_snapshot = extractLabV2BatchNumber(message) || null;
      const shift_snapshot = extractLabV2Shift(message) || null;
      const product_term = extractLabV2ProductTerm(message) || null;
      const notes = extractLabV2RunNotes(message) || null;
      return [
        buildProposalCandidate({
          capabilityName: 'lab_v2.create_run',
          summary: `إنشاء تشغيل مختبر جديد للفحص: ${test_term}`,
          payload: {
            test_term,
            batch_number_snapshot,
            shift_snapshot,
            product_term,
            notes,
          },
          entityRefs: [{ table: 'lab_v2_tests', label: 'test_term', display: test_term }],
          payloadSummary: `${batch_number_snapshot ? `الدفعة: ${batch_number_snapshot}` : 'بدون دفعة'}${shift_snapshot ? ` | الوردية: ${shift_snapshot}` : ''}${product_term ? ` | المنتج: ${product_term}` : ''}`,
        }),
      ];
    }
  }

  if (hasChatSendIntent(message, moduleHint)) {
    const conversationTerm = extractChatConversationTerm(message);
    const body = extractChatBody(message);
    if (conversationTerm && body) {
      return [
        buildProposalCandidate({
          capabilityName: 'chat.send_message',
          summary: `إرسال رسالة إلى المحادثة ${conversationTerm}`,
          payload: { conversation_term: conversationTerm, body },
          entityRefs: [{ table: 'chat_conversations', label: 'conversation', display: conversationTerm }],
          payloadSummary: `الرسالة: ${truncate(body, 160)}`,
        }),
      ];
    }
  }

  return [];
}

function normalizeRiskLevel(value: unknown, fallback: RiskLevel = 'low'): RiskLevel {
  const normalized = normalizeText(String(value ?? '')).toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return fallback;
}

function normalizeEntityRefs(value: unknown): EntityRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      table: normalizeText(String(item.table ?? '')),
      id: normalizeText(String(item.id ?? '')) || null,
      label: normalizeText(String(item.label ?? '')) || null,
      display: normalizeText(String(item.display ?? '')) || null,
    }))
    .filter((item) => item.table);
}

function formatStoredProposal(row: Record<string, unknown>): Record<string, unknown> {
  const actionPayload = isRecord(row.action_payload) ? row.action_payload : {};
  return {
    id: normalizeText(String(row.id ?? '')),
    thread_id: normalizeText(String(row.thread_id ?? '')),
    message_id: normalizeText(String(row.message_id ?? '')) || null,
    tool_name: normalizeText(String(row.tool_name ?? '')),
    capability_name: normalizeText(String(actionPayload.capability_name ?? row.tool_name ?? '')) || null,
    summary: normalizeText(String(row.summary ?? '')),
    risk_level: normalizeRiskLevel(row.risk_level),
    resolved_risk: normalizeRiskLevel(actionPayload.resolved_risk ?? row.risk_level),
    status: normalizeText(String(row.status ?? 'proposed')) || 'proposed',
    action_payload: actionPayload,
    payload_summary: normalizeText(String(actionPayload.payload_summary ?? '')) || null,
    permission_snapshot: isRecord(actionPayload.permission_snapshot) ? actionPayload.permission_snapshot : null,
    confirmation_token: normalizeText(String(actionPayload.confirmation_token ?? '')) || null,
    entity_refs: normalizeEntityRefs(actionPayload.entity_refs),
    execution_result: isRecord(row.execution_result) ? row.execution_result : null,
    created_at: normalizeText(String(row.created_at ?? '')) || new Date().toISOString(),
  };
}

function mergeProposalsIntoMetadata(metadata: unknown, proposals: Record<string, unknown>[]): Record<string, unknown> {
  const base = isRecord(metadata) ? { ...metadata } : {};
  return {
    ...base,
    proposals,
  };
}

function upsertProposalInMetadata(metadata: unknown, proposal: Record<string, unknown>): Record<string, unknown> {
  const base = isRecord(metadata) ? { ...metadata } : {};
  const existing = Array.isArray(base.proposals)
    ? (base.proposals.filter(isRecord) as Record<string, unknown>[])
    : [];
  const next = existing.some((item) => normalizeText(String(item.id ?? '')) === normalizeText(String(proposal.id ?? '')))
    ? existing.map((item) => (normalizeText(String(item.id ?? '')) === normalizeText(String(proposal.id ?? '')) ? proposal : item))
    : [...existing, proposal];
  return {
    ...base,
    proposals: next,
  };
}

function mapExecutionPermissionByRisk(riskLevel: RiskLevel): string {
  if (riskLevel === 'high') return 'execute_high_risk';
  if (riskLevel === 'medium') return 'execute_medium_risk';
  return 'execute_low_risk';
}

async function generateTaskNumber(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await userClient
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .like('task_number', `TASK-${year}-%`);

  return `TASK-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
}

async function generateDocumentNumber(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  type: string,
): Promise<string> {
  const prefixes: Record<string, string> = {
    sop: 'SOP',
    work_instruction: 'WI',
    manual: 'MAN',
    form: 'FRM',
    policy: 'POL',
    specification: 'SPEC',
    other: 'DOC',
  };
  const prefix = prefixes[type] || 'DOC';
  const year = new Date().getFullYear();

  const { data } = await userClient
    .from('documents')
    .select('document_number')
    .eq('company_id', companyId)
    .ilike('document_number', `${prefix}-${year}-%`)
    .order('document_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  const lastNumber = normalizeText(String((data || [])[0]?.document_number ?? ''));
  const match = lastNumber.match(/-(\d+)$/);
  if (match?.[1]) {
    nextNumber = Number(match[1]) + 1;
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
}

async function generateNcrNumber(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await userClient
    .from('ncr_reports')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .like('number', `NCR-${year}-%`);

  return `NCR-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
}

function generateLabV2RunNumberFallback(now = new Date()): string {
  const year = String(now.getFullYear());
  const suffix = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase();
  return `L2-RUN-${year}-${suffix}`;
}

async function generateLabV2RunNumber(
  userClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await userClient.rpc('generate_lab_v2_run_number');
  if (!error && normalizeText(String(data ?? ''))) {
    return normalizeText(String(data));
  }
  return generateLabV2RunNumberFallback();
}

async function loadNcrExecutionRow(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  identifier: string,
): Promise<Record<string, unknown> | null> {
  const ncr = await loadNcrByIdentifier(userClient, companyId, identifier);
  if (!ncr?.id) return null;

  const { data, error } = await userClient
    .from('ncr_reports')
    .select('id, number, title, company_id, current_stage, status, actions')
    .eq('id', ncr.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadLabV2TestByTerm(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  term: string,
): Promise<LabV2TestLookupRow | null> {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return null;

  const safeTerm = escapeLikeTerm(normalizedTerm);
  const { data, error } = await userClient
    .from('lab_v2_tests')
    .select('id, code, name, name_ar, test_family, company_id, is_active')
    .eq('is_active', true)
    .or(`code.ilike.%${safeTerm}%,name.ilike.%${safeTerm}%,name_ar.ilike.%${safeTerm}%`)
    .limit(10);

  if (error) throw error;

  const rows = ((data || []) as LabV2TestLookupRow[]).filter((row) => {
    const rowCompanyId = normalizeText(String(row.company_id ?? ''));
    return !rowCompanyId || rowCompanyId === companyId;
  });
  if (!rows.length) return null;

  const target = normalizeLookupKey(normalizedTerm);
  return rows.find((row) =>
    [row.code, row.name, row.name_ar]
      .map((value) => normalizeLookupKey(value || ''))
      .some((value) => value === target),
  ) || rows[0] || null;
}

async function loadProductByTerm(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  term: string,
): Promise<ProductLookupRow | null> {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return null;

  const safeTerm = escapeLikeTerm(normalizedTerm);
  const { data, error } = await userClient
    .from('products')
    .select('id, name, sku, company_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .or(`name.ilike.%${safeTerm}%,sku.ilike.%${safeTerm}%`)
    .limit(10);

  if (error) throw error;

  const rows = (data || []) as ProductLookupRow[];
  if (!rows.length) return null;

  const target = normalizeLookupKey(normalizedTerm);
  return rows.find((row) =>
    [row.name, row.sku]
      .map((value) => normalizeLookupKey(value || ''))
      .some((value) => value === target),
  ) || rows[0] || null;
}

async function loadLabV2RunExecutionRow(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  identifier: string,
): Promise<Record<string, unknown> | null> {
  const run = await loadLabV2RunByIdentifier(userClient, companyId, identifier);
  if (!run?.id) return null;

  const { data, error } = await userClient
    .from('lab_v2_test_runs')
    .select('id, run_number, status, company_id, params_snapshot, rules_snapshot')
    .eq('id', run.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => normalizeText(String(item))).filter(Boolean);
  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    if (!normalized) return [];
    if (normalized.includes(',')) {
      return normalized.split(',').map((item) => normalizeText(item)).filter(Boolean);
    }
    return [normalized];
  }
  return [];
}

function evaluateLabV2ParameterValueForExecution(
  parameter: Record<string, unknown>,
  value: unknown,
  rules: Record<string, unknown>[],
): { evaluation_result: string; out_of_spec: boolean } {
  const parameterId = normalizeText(String(parameter.id ?? ''));
  const testId = normalizeText(String(parameter.test_id ?? ''));
  const relevantRules = rules
    .filter((rule) => {
      const parameterRuleId = normalizeText(String(rule.parameter_id ?? ''));
      const ruleTestId = normalizeText(String(rule.test_id ?? ''));
      return parameterRuleId ? parameterRuleId === parameterId : ruleTestId === testId;
    })
    .sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0));

  const rule = relevantRules[0];
  if (!rule) return { evaluation_result: 'na', out_of_spec: false };

  const hasValue =
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && normalizeText(value) !== '') ||
    (Array.isArray(value) && value.length > 0);
  if (!hasValue) return { evaluation_result: 'na', out_of_spec: false };

  const ruleType = normalizeText(String(rule.rule_type ?? ''));
  if (ruleType === 'numeric_range') {
    const numeric = toFiniteNumber(value);
    if (numeric == null) return { evaluation_result: 'na', out_of_spec: false };

    const min = toFiniteNumber(rule.spec_min);
    const max = toFiniteNumber(rule.spec_max);
    if (min != null && numeric < min) return { evaluation_result: 'fail', out_of_spec: true };
    if (max != null && numeric > max) return { evaluation_result: 'fail', out_of_spec: true };
    return { evaluation_result: 'pass', out_of_spec: false };
  }

  if (ruleType === 'allowed_values') {
    const allowed = asStringArray(rule.allowed_values);
    const current = normalizeText(String(value));
    if (!current) return { evaluation_result: 'na', out_of_spec: false };
    return allowed.includes(current)
      ? { evaluation_result: 'pass', out_of_spec: false }
      : { evaluation_result: 'fail', out_of_spec: true };
  }

  if (ruleType === 'multi_select') {
    const allowed = new Set(asStringArray(rule.allowed_values));
    const selected = asStringArray(value);
    const invalid = selected.filter((item) => !allowed.has(item));
    return invalid.length > 0
      ? { evaluation_result: 'fail', out_of_spec: true }
      : { evaluation_result: 'pass', out_of_spec: false };
  }

  return { evaluation_result: 'na', out_of_spec: false };
}

function resolveLabV2ParameterFromSnapshot(
  run: Record<string, unknown>,
  parameterTerm: string,
): Record<string, unknown> | null {
  const rows = Array.isArray(run.params_snapshot)
    ? run.params_snapshot.filter(isRecord) as Record<string, unknown>[]
    : [];
  if (!rows.length) return null;

  const target = normalizeLookupKey(parameterTerm);
  return rows.find((row) =>
    [row.param_key, row.label, row.label_ar]
      .map((value) => normalizeLookupKey(String(value ?? '')))
      .some((value) => value && value === target),
  ) || rows.find((row) =>
    [row.param_key, row.label, row.label_ar]
      .map((value) => normalizeLookupKey(String(value ?? '')))
      .some((value) => value && (value.includes(target) || target.includes(value))),
  ) || null;
}

async function ensureLatestLabV2MeasurementRow(
  userClient: ReturnType<typeof createClient>,
  runId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data: existing, error: existingError } = await userClient
    .from('lab_v2_run_measurements')
    .select('id, measurement_no, measured_at')
    .eq('run_id', runId)
    .order('measurement_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return (existing as Record<string, unknown>);

  const createMeasurement = async (): Promise<Record<string, unknown>> => {
    const { data: maxRow, error: maxError } = await userClient
      .from('lab_v2_run_measurements')
      .select('measurement_no')
      .eq('run_id', runId)
      .order('measurement_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) throw maxError;

    const nextNo = Number((maxRow as Record<string, unknown> | null)?.measurement_no ?? 0) + 1;
    const { data, error } = await userClient
      .from('lab_v2_run_measurements')
      .insert({
        run_id: runId,
        measurement_no: nextNo,
        measured_at: new Date().toISOString(),
        notes: null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id, measurement_no, measured_at')
      .single();
    if (error) throw error;
    return (data as Record<string, unknown>) || {};
  };

  try {
    return await createMeasurement();
  } catch (error: unknown) {
    const duplicate =
      isRecord(error) &&
      (normalizeText(String(error.code ?? '')) === '23505' ||
        normalizeText(String(error.message ?? '')).toLowerCase().includes('duplicate'));
    if (!duplicate) throw error;
    return await createMeasurement();
  }
}

async function loadLabV2TestSnapshot(
  userClient: ReturnType<typeof createClient>,
  testId: string,
): Promise<{
  test_snapshot: Record<string, unknown> | null;
  params_snapshot: Record<string, unknown>[];
  rules_snapshot: Record<string, unknown>[];
  steps_snapshot: Record<string, unknown>[];
  materials_plan_snapshot: Record<string, unknown>[];
}> {
  const { data: testRow, error: testError } = await userClient
    .from('lab_v2_tests')
    .select('*')
    .eq('id', testId)
    .single();
  if (testError) throw testError;

  const { data: paramsRows, error: paramsError } = await userClient
    .from('lab_v2_test_parameters')
    .select('*')
    .eq('test_id', testId)
    .order('display_order', { ascending: true });
  if (paramsError) throw paramsError;

  const { data: rulesRows, error: rulesError } = await userClient
    .from('lab_v2_test_acceptance_rules')
    .select('*')
    .eq('test_id', testId)
    .order('priority', { ascending: true });
  if (rulesError) throw rulesError;

  const { data: stepRows, error: stepsError } = await userClient
    .from('lab_v2_test_steps')
    .select('*')
    .eq('test_id', testId)
    .order('step_order', { ascending: true });
  if (stepsError) throw stepsError;

  const { data: materialPlanRows, error: materialPlansError } = await userClient
    .from('lab_v2_test_step_material_plans')
    .select('*')
    .eq('test_id', testId);
  if (materialPlansError) throw materialPlansError;

  return {
    test_snapshot: isRecord(testRow) ? testRow : null,
    params_snapshot: ((paramsRows || []) as Record<string, unknown>[]),
    rules_snapshot: ((rulesRows || []) as Record<string, unknown>[]),
    steps_snapshot: ((stepRows || []) as Record<string, unknown>[]),
    materials_plan_snapshot: ((materialPlanRows || []) as Record<string, unknown>[]),
  };
}

async function postLabV2RunMaterialConsumption(
  userClient: ReturnType<typeof createClient>,
  runId: string,
  userId: string,
): Promise<void> {
  const { data: selections, error: selectionsError } = await userClient
    .from('lab_v2_run_material_selections')
    .select('*')
    .eq('run_id', runId)
    .is('consumption_posted_at', null);

  if (selectionsError) throw selectionsError;
  const rows = (selections || []) as Array<Record<string, unknown>>;
  if (!rows.length) return;

  for (const selection of rows) {
    const consumeQty = Number(selection.planned_quantity ?? 0);
    if (!Number.isFinite(consumeQty) || consumeQty <= 0) continue;

    const receiptId = normalizeText(String(selection.chemical_receipt_id ?? ''));
    if (!receiptId) continue;

    const { data: receipt, error: receiptError } = await userClient
      .from('lab_v2_chemical_receipts')
      .select('id, quantity, remaining_quantity, status')
      .eq('id', receiptId)
      .single();
    if (receiptError) throw receiptError;

    const remaining = Number((receipt as Record<string, unknown> | null)?.remaining_quantity ?? (receipt as Record<string, unknown> | null)?.quantity ?? 0);
    const nextRemaining = Math.max(0, remaining - consumeQty);
    const nextStatus = nextRemaining <= 0 ? 'depleted' : normalizeText(String((receipt as Record<string, unknown> | null)?.status ?? 'available')) || 'available';

    const { error: updateReceiptError } = await userClient
      .from('lab_v2_chemical_receipts')
      .update({ remaining_quantity: nextRemaining, status: nextStatus })
      .eq('id', receiptId);
    if (updateReceiptError) throw updateReceiptError;

    const { error: markSelectionError } = await userClient
      .from('lab_v2_run_material_selections')
      .update({
        consumption_posted_at: new Date().toISOString(),
        consumed_quantity: consumeQty,
        updated_by: userId,
      })
      .eq('id', normalizeText(String(selection.id ?? '')));
    if (markSelectionError) throw markSelectionError;

    await userClient
      .from('lab_v2_run_materials')
      .insert({
        run_id: runId,
        chemical_receipt_id: receiptId,
        quantity_used: consumeQty,
        unit: normalizeText(String(selection.unit ?? '')) || null,
        notes: normalizeText(String(selection.selection_notes ?? '')) || null,
      });
  }
}

async function loadTaskExecutionRow(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  identifier: string,
): Promise<Record<string, unknown> | null> {
  const task = await loadTaskByIdentifier(userClient, companyId, userId, identifier);
  if (!task?.id) return null;

  const { data, error } = await userClient
    .from('tasks')
    .select('id, task_number, title, company_id')
    .eq('id', task.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

async function loadChatConversationByTerm(
  userClient: ReturnType<typeof createClient>,
  conversationTerm: string,
): Promise<Record<string, unknown> | null> {
  const normalizedTerm = normalizeText(conversationTerm);
  if (!normalizedTerm) return null;

  let query = userClient
    .from('chat_conversations')
    .select('id, title, conversation_type, company_id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (/^[0-9a-f-]{30,}$/i.test(normalizedTerm)) {
    query = query.eq('id', normalizedTerm);
  } else {
    query = query.ilike('title', `%${escapeLikeTerm(normalizedTerm)}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data || []) as Array<Record<string, unknown>>;
  return rows[0] || null;
}

async function executeCapability(params: {
  proposal: Record<string, unknown>;
  userClient: ReturnType<typeof createClient>;
  companyId: string;
  userId: string;
  userDisplayName: string;
  userDepartmentName: string | null;
  userDepartmentId: string | null;
  locale: string;
  hasModulePermission: (moduleCode: string, action: string) => Promise<boolean>;
}): Promise<{
  summary: string;
  resultPayload: Record<string, unknown>;
  entityRefs: EntityRef[];
}> {
  const proposalPayload = isRecord(params.proposal.action_payload) ? params.proposal.action_payload : {};
  const capabilityName = normalizeText(String(proposalPayload.capability_name ?? params.proposal.tool_name ?? '')) as AiCapabilityName;
  const payload = isRecord(proposalPayload.payload) ? proposalPayload.payload : {};

  if (!capabilityName) {
    throw new Error('Proposal is missing a capability name.');
  }

  const capability = getAiCapabilityDefinition(capabilityName);
  if (!(await params.hasModulePermission(capability.moduleCode, capability.requiredAction))) {
    throw new Error('Missing required business permission for this action.');
  }

  if (capabilityName === 'chat.send_message') {
    const conversationTerm = normalizeText(String(payload.conversation_term ?? ''));
    const body = normalizeText(String(payload.body ?? ''));
    if (!conversationTerm || !body) {
      throw new Error('Chat proposal is missing conversation or message content.');
    }

    const conversation = await loadChatConversationByTerm(params.userClient, conversationTerm);
    if (!conversation?.id) {
      throw new Error(`No accessible conversation matched: ${conversationTerm}.`);
    }

    const { data, error } = await params.userClient
      .from('chat_messages')
      .insert({
        company_id: params.companyId,
        conversation_id: conversation.id,
        sender_id: params.userId,
        body,
        message_type: 'text',
      })
      .select('id, conversation_id, created_at')
      .single();

    if (error) throw error;
    const conversationTitle = normalizeText(String(conversation.title ?? '')) || conversationTerm;
    return {
      summary: params.locale.startsWith('ar')
        ? `تم إرسال الرسالة إلى المحادثة "${conversationTitle}".`
        : `Message sent to conversation "${conversationTitle}".`,
      resultPayload: {
        conversation_id: normalizeText(String(data?.conversation_id ?? conversation.id)),
        message_id: normalizeText(String(data?.id ?? '')),
      },
      entityRefs: [{ table: 'chat_conversations', id: normalizeText(String(conversation.id ?? '')), display: conversationTitle }],
    };
  }

  if (capabilityName === 'tasks.add_comment') {
    const taskIdentifier = normalizeText(String(payload.task_identifier ?? ''));
    const comment = normalizeText(String(payload.comment ?? ''));
    if (!taskIdentifier || !comment) {
      throw new Error('Task comment proposal is incomplete.');
    }

    const task = await loadTaskExecutionRow(params.userClient, params.companyId, params.userId, taskIdentifier);
    if (!task?.id) {
      throw new Error(`No accessible task matched: ${taskIdentifier}.`);
    }

    const { data, error } = await params.userClient
      .from('task_comments')
      .insert({
        task_id: task.id,
        content: comment,
        author_id: params.userId,
        author_name: params.userDisplayName || null,
        company_id: normalizeText(String(task.company_id ?? params.companyId)),
        created_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    const taskNumber = normalizeText(String(task.task_number ?? taskIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تمت إضافة تعليق جديد إلى المهمة ${taskNumber}.`
        : `A new comment was added to task ${taskNumber}.`,
      resultPayload: {
        task_id: normalizeText(String(task.id ?? '')),
        task_comment_id: normalizeText(String(data?.id ?? '')),
      },
      entityRefs: [{ table: 'tasks', id: normalizeText(String(task.id ?? '')), display: taskNumber }],
    };
  }

  if (capabilityName === 'ncr.add_comment') {
    const ncrIdentifier = normalizeText(String(payload.ncr_identifier ?? ''));
    const comment = normalizeText(String(payload.comment ?? ''));
    if (!ncrIdentifier || !comment) {
      throw new Error('NCR comment proposal is incomplete.');
    }

    const ncr = await loadNcrExecutionRow(params.userClient, params.companyId, ncrIdentifier);
    if (!ncr?.id) {
      throw new Error(`No accessible NCR matched: ${ncrIdentifier}.`);
    }

    const { data, error } = await params.userClient
      .from('ncr_comments')
      .insert({
        ncr_id: normalizeText(String(ncr.id ?? '')),
        entity_type: 'ncr',
        entity_id: normalizeText(String(ncr.id ?? '')),
        content: comment,
        author_id: params.userId,
        author_name: params.userDisplayName || null,
        company_id: params.companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    const ncrNumber = normalizeText(String(ncr.number ?? ncrIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تمت إضافة تعليق جديد إلى ${ncrNumber}.`
        : `A new comment was added to ${ncrNumber}.`,
      resultPayload: {
        ncr_id: normalizeText(String(ncr.id ?? '')),
        ncr_comment_id: normalizeText(String(data?.id ?? '')),
      },
      entityRefs: [{ table: 'ncr_reports', id: normalizeText(String(ncr.id ?? '')), display: ncrNumber }],
    };
  }

  if (capabilityName === 'ncr.add_action') {
    const ncrIdentifier = normalizeText(String(payload.ncr_identifier ?? ''));
    const description = normalizeText(String(payload.description ?? ''));
    if (!ncrIdentifier || !description) {
      throw new Error('NCR action proposal is incomplete.');
    }

    const ncr = await loadNcrExecutionRow(params.userClient, params.companyId, ncrIdentifier);
    if (!ncr?.id) {
      throw new Error(`No accessible NCR matched: ${ncrIdentifier}.`);
    }

    const actionType = normalizeText(String(payload.type ?? 'corrective')) === 'preventive'
      ? 'preventive'
      : 'corrective';
    const responsibleDept = normalizeText(String(payload.responsible_dept ?? '')) || params.userDepartmentName || 'غير محدد';
    const responsiblePerson = normalizeText(String(payload.responsible_person ?? '')) || params.userDisplayName || params.userId;
    const targetDate = normalizeDateInput(normalizeText(String(payload.target_date ?? ''))) || addDaysIso(7);
    const existingActions = Array.isArray(ncr.actions) ? ncr.actions.filter(isRecord) as Record<string, unknown>[] : [];
    const newAction = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type: actionType,
      description,
      responsibleDeptId: params.userDepartmentId,
      responsibleDept,
      responsiblePersonId: params.userId,
      responsiblePerson,
      targetDate,
      status: 'pending',
    };

    const { data, error } = await params.userClient
      .from('ncr_reports')
      .update({
        actions: [...existingActions, newAction],
        updated_at: new Date().toISOString(),
      })
      .eq('id', normalizeText(String(ncr.id ?? '')))
      .select('id, number, actions, updated_at')
      .single();
    if (error) throw error;

    const ncrNumber = normalizeText(String(data?.number ?? ncr.number ?? ncrIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تمت إضافة إجراء ${actionType === 'preventive' ? 'وقائي' : 'تصحيحي'} إلى ${ncrNumber}.`
        : `A ${actionType} action was added to ${ncrNumber}.`,
      resultPayload: {
        ncr_id: normalizeText(String(data?.id ?? ncr.id ?? '')),
        action_id: normalizeText(String(newAction.id)),
        action_type: actionType,
      },
      entityRefs: [{ table: 'ncr_reports', id: normalizeText(String(data?.id ?? ncr.id ?? '')), display: ncrNumber }],
    };
  }

  if (capabilityName === 'ncr.create_draft') {
    const title = normalizeText(String(payload.title ?? ''));
    const description = normalizeText(String(payload.description ?? ''));
    if (!title && !description) {
      throw new Error('NCR title or description is required.');
    }

    let ncrNumber = await generateNcrNumber(params.userClient, params.companyId);
    const nowIso = new Date().toISOString();
    const baseInsertPayload = {
      number: ncrNumber,
      ncr_number: ncrNumber,
      title: title || truncate(description, 120),
      description: description || null,
      severity: normalizeText(String(payload.severity ?? 'medium')) || 'medium',
      status: 'open',
      department: normalizeText(String(payload.department ?? '')) || params.userDepartmentName || null,
      date: nowIso.slice(0, 10),
      immediate_action: normalizeText(String(payload.immediate_action ?? '')) || null,
      discovered_by: params.userDisplayName || params.userId,
      created_by: params.userDisplayName || params.userId,
      created_by_id: params.userId,
      company_id: params.companyId,
      current_stage: 'initial_report',
      completed_stages: [],
      stage_history: [{
        from: null,
        to: 'initial_report',
        transitionedBy: params.userDisplayName || params.userId,
        transitionedByName: params.userDisplayName || params.userId,
        transitionedByEmail: null,
        transitionedAt: nowIso,
        notes: 'Created by AI assistant',
      }],
      actions: [],
      holds: [],
      attachments: [],
      auto_generated_from_lab: false,
      updated_at: nowIso,
      created_at: nowIso,
    };

    let insertResult = await params.userClient
      .from('ncr_reports')
      .insert(baseInsertPayload)
      .select('id, number, title, status, current_stage, created_at')
      .single();

    if (insertResult.error?.code === '23505') {
      ncrNumber = `NCR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      insertResult = await params.userClient
        .from('ncr_reports')
        .insert({
          ...baseInsertPayload,
          number: ncrNumber,
          ncr_number: ncrNumber,
        })
        .select('id, number, title, status, current_stage, created_at')
        .single();
    }

    if (insertResult.error) throw insertResult.error;
    const data = insertResult.data;
    const createdNumber = normalizeText(String(data?.number ?? ncrNumber));
    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء ${createdNumber} بنجاح.`
        : `${createdNumber} was created successfully.`,
      resultPayload: {
        ncr_id: normalizeText(String(data?.id ?? '')),
        ncr_number: createdNumber,
      },
      entityRefs: [{ table: 'ncr_reports', id: normalizeText(String(data?.id ?? '')), display: createdNumber }],
    };
  }

  if (capabilityName === 'tasks.create') {
    const title = normalizeText(String(payload.title ?? ''));
    if (!title) {
      throw new Error('Task title is required.');
    }

    const taskNumber = await generateTaskNumber(params.userClient, params.companyId);
    const { data, error } = await params.userClient
      .from('tasks')
      .insert({
        task_number: taskNumber,
        title,
        description: normalizeText(String(payload.description ?? '')) || '',
        task_type: 'general',
        category: 'general',
        priority: normalizeText(String(payload.priority ?? 'medium')) || 'medium',
        status: 'pending',
        current_stage: 'assignment',
        completed_stages: [],
        assignment_type: 'individual',
        requires_approval: true,
        requires_verification: false,
        tags: [],
        company_id: params.companyId,
        created_by: params.userId,
        created_by_name: params.userDisplayName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, task_number, title, status, priority, created_at')
      .single();

    if (error) throw error;
    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء المهمة ${normalizeText(String(data?.task_number ?? taskNumber))} بنجاح.`
        : `Task ${normalizeText(String(data?.task_number ?? taskNumber))} was created successfully.`,
      resultPayload: {
        task_id: normalizeText(String(data?.id ?? '')),
        task_number: normalizeText(String(data?.task_number ?? taskNumber)),
      },
      entityRefs: [{ table: 'tasks', id: normalizeText(String(data?.id ?? '')), display: normalizeText(String(data?.task_number ?? taskNumber)) }],
    };
  }

  if (capabilityName === 'tasks.update') {
    const taskIdentifier = normalizeText(String(payload.task_identifier ?? ''));
    const updates = isRecord(payload.updates) ? payload.updates : {};
    if (!taskIdentifier || Object.keys(updates).length === 0) {
      throw new Error('Task update proposal is incomplete.');
    }

    const task = await loadTaskExecutionRow(params.userClient, params.companyId, params.userId, taskIdentifier);
    if (!task?.id) {
      throw new Error(`No accessible task matched: ${taskIdentifier}.`);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    ['status', 'priority', 'title', 'description'].forEach((key) => {
      if (key in updates) {
        updatePayload[key] = updates[key];
      }
    });

    const { data, error } = await params.userClient
      .from('tasks')
      .update(updatePayload)
      .eq('id', task.id)
      .select('id, task_number, title, status, priority, updated_at')
      .single();

    if (error) throw error;
    const taskNumber = normalizeText(String(data?.task_number ?? task.task_number ?? taskIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تم تحديث المهمة ${taskNumber} بنجاح.`
        : `Task ${taskNumber} was updated successfully.`,
      resultPayload: {
        task_id: normalizeText(String(data?.id ?? '')),
        task_number: taskNumber,
        updates: updatePayload,
      },
      entityRefs: [{ table: 'tasks', id: normalizeText(String(data?.id ?? task.id ?? '')), display: taskNumber }],
    };
  }

  if (capabilityName === 'documents.create_draft') {
    const title = normalizeText(String(payload.title ?? ''));
    const type = normalizeText(String(payload.type ?? 'other')) || 'other';
    if (!title) {
      throw new Error('Document title is required.');
    }

    const documentNumber = await generateDocumentNumber(params.userClient, params.companyId, type);
    const { data, error } = await params.userClient
      .from('documents')
      .insert({
        company_id: params.companyId,
        document_number: documentNumber,
        title,
        title_ar: normalizeText(String(payload.title_ar ?? title)) || title,
        description: null,
        type,
        category: null,
        department_id: null,
        owner_id: params.userId,
        status: 'draft',
        current_version: 1,
      })
      .select('id, document_number, title, status, current_version')
      .single();

    if (error) throw error;

    const content = normalizeText(String(payload.content ?? ''));
    if (content) {
      const { error: versionError } = await params.userClient.rpc('create_document_version', {
        p_document_id: data.id,
        p_content: content,
        p_file_path: null,
        p_file_name: null,
        p_changes_summary: 'Initial draft',
        p_change_reason: null,
      });
      if (versionError) throw versionError;
    }

    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء الوثيقة ${normalizeText(String(data?.document_number ?? documentNumber))} كمسودة.`
        : `Document ${normalizeText(String(data?.document_number ?? documentNumber))} was created as a draft.`,
      resultPayload: {
        document_id: normalizeText(String(data?.id ?? '')),
        document_number: normalizeText(String(data?.document_number ?? documentNumber)),
      },
      entityRefs: [{ table: 'documents', id: normalizeText(String(data?.id ?? '')), display: normalizeText(String(data?.document_number ?? documentNumber)) }],
    };
  }

  if (capabilityName === 'documents.create_version') {
    const documentTerm = normalizeText(String(payload.document_term ?? ''));
    if (!documentTerm) {
      throw new Error('Document identifier is required to create a version.');
    }

    const canViewAllDocuments = await params.hasModulePermission('documents', 'view_all_documents');
    const documents = await loadVisibleDocuments(
      params.userClient,
      params.companyId,
      params.userId,
      documentTerm,
      false,
      canViewAllDocuments,
      false,
    );
    const documentRow = documents[0];
    if (!documentRow?.id) {
      throw new Error(`No visible document matched: ${documentTerm}.`);
    }

    const { data: versionId, error: versionError } = await params.userClient.rpc('create_document_version', {
      p_document_id: documentRow.id,
      p_content: normalizeText(String(payload.content ?? '')) || null,
      p_file_path: null,
      p_file_name: null,
      p_changes_summary: normalizeText(String(payload.changes_summary ?? '')) || null,
      p_change_reason: null,
    });
    if (versionError) throw versionError;

    const { data, error } = await params.userClient
      .from('document_versions')
      .select('id, document_id, version, status, created_at')
      .eq('id', versionId)
      .single();
    if (error) throw error;

    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء إصدار جديد للوثيقة ${normalizeText(documentRow.document_number || documentTerm)}.`
        : `A new version was created for document ${normalizeText(documentRow.document_number || documentTerm)}.`,
      resultPayload: {
        document_id: normalizeText(documentRow.id),
        version_id: normalizeText(String(data?.id ?? versionId ?? '')),
        version: Number(data?.version ?? 0),
      },
      entityRefs: [{ table: 'documents', id: normalizeText(documentRow.id), display: normalizeText(documentRow.document_number || documentTerm) }],
    };
  }

  if (capabilityName === 'material_receiving.create_draft') {
    const materialName = normalizeText(String(payload.material_name ?? ''));
    const batchNumber = normalizeText(String(payload.batch_number ?? ''));
    const quantity = Number(payload.quantity ?? 0);
    const unit = normalizeText(String(payload.unit ?? 'kg')) || 'kg';
    if (!materialName || !batchNumber || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Material receiving proposal is incomplete.');
    }

    const year = new Date().getFullYear();
    const { count } = await params.userClient
      .from('material_receiving')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', params.companyId);
    const receivingNumber = `RCV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    const rawMaterial = await loadRawMaterialByTerm(params.userClient, params.companyId, materialName);
    const supplierName = normalizeText(String(payload.supplier_name ?? ''));
    const { data: supplierRow } = supplierName
      ? await params.userClient
          .from('suppliers')
          .select('id, name')
          .eq('company_id', params.companyId)
          .ilike('name', `%${escapeLikeTerm(supplierName)}%`)
          .limit(1)
          .maybeSingle()
      : { data: null };

    const { data, error } = await params.userClient
      .from('material_receiving')
      .insert({
        receiving_number: receivingNumber,
        material_type: normalizeText(String(payload.material_type ?? 'raw_material')) || 'raw_material',
        status: 'pending',
        raw_material_id: rawMaterial?.id || null,
        material_name: materialName,
        material_code: rawMaterial?.code || null,
        batch_number: batchNumber,
        lot_number: null,
        supplier_id: normalizeText(String((supplierRow as any)?.id ?? '')) || null,
        supplier_name: supplierName || null,
        quantity,
        unit,
        received_at: new Date().toISOString(),
        received_by: params.userId,
        received_by_name: params.userDisplayName || null,
        inspection_required: true,
        company_id: params.companyId,
      })
      .select('id, receiving_number, material_name, status, created_at')
      .single();

    if (error) throw error;

    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء استلام المادة ${normalizeText(String(data?.receiving_number ?? receivingNumber))} بحالة معلّقة.`
        : `Material receiving ${normalizeText(String(data?.receiving_number ?? receivingNumber))} was created in pending status.`,
      resultPayload: {
        material_receiving_id: normalizeText(String(data?.id ?? '')),
        receiving_number: normalizeText(String(data?.receiving_number ?? receivingNumber)),
      },
      entityRefs: [{ table: 'material_receiving', id: normalizeText(String(data?.id ?? '')), display: normalizeText(String(data?.receiving_number ?? receivingNumber)) }],
    };
  }

  if (capabilityName === 'lab_v2.create_run') {
    const testTerm = normalizeText(String(payload.test_term ?? ''));
    if (!testTerm) {
      throw new Error('Lab run proposal is missing the test name or code.');
    }

    const test = await loadLabV2TestByTerm(params.userClient, params.companyId, testTerm);
    if (!test?.id) {
      throw new Error(`No accessible lab test matched: ${testTerm}.`);
    }

    const productTerm = normalizeText(String(payload.product_term ?? ''));
    let productId: string | null = null;
    if (normalizeText(String(test.test_family ?? '')) === 'ipc') {
      if (!productTerm) {
        throw new Error('IPC lab runs require a product to be specified.');
      }
      const product = await loadProductByTerm(params.userClient, params.companyId, productTerm);
      if (!product?.id) {
        throw new Error(`No active product matched: ${productTerm}.`);
      }
      productId = normalizeText(String(product.id ?? ''));
    } else if (productTerm) {
      const product = await loadProductByTerm(params.userClient, params.companyId, productTerm);
      if (!product?.id) {
        throw new Error(`No active product matched: ${productTerm}.`);
      }
      productId = normalizeText(String(product.id ?? ''));
    }

    const runNumber = await generateLabV2RunNumber(params.userClient);
    const snapshot = await loadLabV2TestSnapshot(params.userClient, normalizeText(String(test.id ?? '')));
    const { data, error } = await params.userClient
      .from('lab_v2_test_runs')
      .insert({
        run_number: runNumber,
        test_id: normalizeText(String(test.id ?? '')),
        batch_number_snapshot: normalizeText(String(payload.batch_number_snapshot ?? '')) || null,
        shift_snapshot: normalizeText(String(payload.shift_snapshot ?? '')) || null,
        product_id: productId,
        status: 'draft',
        operator_id: params.userId,
        operator_name: params.userDisplayName || null,
        notes: normalizeText(String(payload.notes ?? '')) || null,
        test_snapshot: snapshot.test_snapshot,
        params_snapshot: snapshot.params_snapshot,
        rules_snapshot: snapshot.rules_snapshot,
        steps_snapshot: snapshot.steps_snapshot,
        materials_plan_snapshot: snapshot.materials_plan_snapshot,
        company_id: params.companyId,
        department_id: params.userDepartmentId,
        created_by: params.userId,
        updated_by: params.userId,
      })
      .select('id, run_number, status, created_at')
      .single();

    if (error) throw error;
    const runDisplay = normalizeText(String(data?.run_number ?? runNumber));
    const testDisplay = normalizeText(String(test.name_ar ?? test.name ?? test.code ?? testTerm)) || testTerm;
    return {
      summary: params.locale.startsWith('ar')
        ? `تم إنشاء التشغيل ${runDisplay} للفحص ${testDisplay}.`
        : `Run ${runDisplay} was created for test ${testDisplay}.`,
      resultPayload: {
        run_id: normalizeText(String(data?.id ?? '')),
        run_number: runDisplay,
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(data?.id ?? '')), display: runDisplay }],
    };
  }

  if (capabilityName === 'lab_v2.add_measurement') {
    const runIdentifier = normalizeText(String(payload.run_identifier ?? ''));
    if (!runIdentifier) {
      throw new Error('Lab measurement proposal is missing the run identifier.');
    }

    const run = await loadLabV2RunExecutionRow(params.userClient, params.companyId, runIdentifier);
    if (!run?.id) {
      throw new Error(`No accessible lab run matched: ${runIdentifier}.`);
    }

    const allocateMeasurement = async (): Promise<Record<string, unknown>> => {
      const { data: maxRow, error: maxError } = await params.userClient
        .from('lab_v2_run_measurements')
        .select('measurement_no')
        .eq('run_id', normalizeText(String(run.id ?? '')))
        .order('measurement_no', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;

      const nextNo = Number((maxRow as Record<string, unknown> | null)?.measurement_no ?? 0) + 1;
      const { data, error } = await params.userClient
        .from('lab_v2_run_measurements')
        .insert({
          run_id: normalizeText(String(run.id ?? '')),
          measurement_no: nextNo,
          measured_at: new Date().toISOString(),
          notes: normalizeText(String(payload.notes ?? '')) || null,
          created_by: params.userId,
          updated_by: params.userId,
        })
        .select('id, measurement_no, measured_at')
        .single();
      if (error) throw error;
      return (data as Record<string, unknown>) || {};
    };

    let measurement: Record<string, unknown>;
    try {
      measurement = await allocateMeasurement();
    } catch (error: unknown) {
      const duplicate =
        isRecord(error) &&
        (normalizeText(String(error.code ?? '')) === '23505' || normalizeText(String(error.message ?? '')).toLowerCase().includes('duplicate'));
      if (!duplicate) throw error;
      measurement = await allocateMeasurement();
    }

    const runDisplay = normalizeText(String(run.run_number ?? runIdentifier));
    const measurementNo = Number(measurement.measurement_no ?? 0);
    return {
      summary: params.locale.startsWith('ar')
        ? `تمت إضافة القياس رقم ${measurementNo} إلى التشغيل ${runDisplay}.`
        : `Measurement ${measurementNo} was added to run ${runDisplay}.`,
      resultPayload: {
        run_id: normalizeText(String(run.id ?? '')),
        measurement_id: normalizeText(String(measurement.id ?? '')),
        measurement_no: measurementNo,
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(run.id ?? '')), display: runDisplay }],
    };
  }

  if (capabilityName === 'lab_v2.save_values') {
    const runIdentifier = normalizeText(String(payload.run_identifier ?? ''));
    const rawValue = payload.value == null ? null : normalizeText(String(payload.value ?? ''));
    const numericValue = payload.numeric_value == null ? null : Number(payload.numeric_value);
    const parameterTerm = sanitizeLabV2ParameterTerm(
      String(payload.parameter_term ?? ''),
      rawValue,
      Number.isFinite(numericValue) ? numericValue : null,
    );
    if (!runIdentifier || !parameterTerm || (!rawValue && !Number.isFinite(numericValue))) {
      throw new Error('Lab run value proposal is incomplete.');
    }

    const run = await loadLabV2RunExecutionRow(params.userClient, params.companyId, runIdentifier);
    if (!run?.id) {
      throw new Error(`No accessible lab run matched: ${runIdentifier}.`);
    }

    const parameter = resolveLabV2ParameterFromSnapshot(run, parameterTerm);
    if (!parameter?.id) {
      throw new Error(`No parameter in this run matched: ${parameterTerm}.`);
    }

    const measurement = await ensureLatestLabV2MeasurementRow(
      params.userClient,
      normalizeText(String(run.id ?? '')),
      params.userId,
    );
    const ruleRows = Array.isArray(run.rules_snapshot)
      ? run.rules_snapshot.filter(isRecord) as Record<string, unknown>[]
      : [];
    const actualValue = Number.isFinite(numericValue) ? numericValue : rawValue;
    const spec = evaluateLabV2ParameterValueForExecution(parameter, actualValue, ruleRows);
    const valueText = rawValue || (Number.isFinite(numericValue) ? String(numericValue) : null);

    const { data, error } = await params.userClient
      .from('lab_v2_run_values')
      .upsert({
        measurement_id: normalizeText(String(measurement.id ?? '')),
        run_id: normalizeText(String(run.id ?? '')),
        parameter_id: normalizeText(String(parameter.id ?? '')),
        param_key: normalizeText(String(parameter.param_key ?? '')),
        value: valueText,
        numeric_value: Number.isFinite(numericValue) ? numericValue : null,
        evaluation_result: spec.evaluation_result,
        out_of_spec: spec.out_of_spec,
        notes: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'measurement_id,param_key' })
      .select('id, param_key, evaluation_result, out_of_spec')
      .single();
    if (error) throw error;

    await params.userClient
      .from('lab_v2_test_runs')
      .update({
        status: 'in_progress',
        updated_by: params.userId,
      })
      .eq('id', normalizeText(String(run.id ?? '')))
      .in('status', ['draft']);

    await params.userClient
      .from('lab_v2_test_runs')
      .update({
        started_at: new Date().toISOString(),
        updated_by: params.userId,
      })
      .eq('id', normalizeText(String(run.id ?? '')))
      .is('started_at', null);

    await params.userClient.rpc('evaluate_lab_v2_run', { p_run_id: normalizeText(String(run.id ?? '')) });

    const runDisplay = normalizeText(String(run.run_number ?? runIdentifier));
    const parameterDisplay =
      normalizeText(String(parameter.label_ar ?? parameter.label ?? parameter.param_key ?? parameterTerm)) || parameterTerm;
    return {
      summary: params.locale.startsWith('ar')
        ? `تم تسجيل قيمة ${parameterDisplay} في التشغيل ${runDisplay}.`
        : `Value for ${parameterDisplay} was recorded in run ${runDisplay}.`,
      resultPayload: {
        run_id: normalizeText(String(run.id ?? '')),
        measurement_id: normalizeText(String(measurement.id ?? '')),
        value_id: normalizeText(String(data?.id ?? '')),
        param_key: normalizeText(String(data?.param_key ?? parameter.param_key ?? '')),
        evaluation_result: normalizeText(String(data?.evaluation_result ?? spec.evaluation_result)),
        out_of_spec: Boolean(data?.out_of_spec ?? spec.out_of_spec),
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(run.id ?? '')), display: runDisplay }],
    };
  }

  if (capabilityName === 'lab_v2.complete_run') {
    const runIdentifier = normalizeText(String(payload.run_identifier ?? ''));
    if (!runIdentifier) {
      throw new Error('Lab run completion proposal is missing the run identifier.');
    }

    const run = await loadLabV2RunExecutionRow(params.userClient, params.companyId, runIdentifier);
    if (!run?.id) {
      throw new Error(`No accessible lab run matched: ${runIdentifier}.`);
    }

    const { data, error } = await params.userClient
      .from('lab_v2_test_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: normalizeText(String(payload.notes ?? '')) || null,
        updated_by: params.userId,
      })
      .eq('id', normalizeText(String(run.id ?? '')))
      .select('id, run_number, status, completed_at')
      .single();
    if (error) throw error;

    await params.userClient.rpc('evaluate_lab_v2_run', { p_run_id: normalizeText(String(run.id ?? '')) });
    await postLabV2RunMaterialConsumption(params.userClient, normalizeText(String(run.id ?? '')), params.userId);

    const runDisplay = normalizeText(String(data?.run_number ?? run.run_number ?? runIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تم إكمال التشغيل ${runDisplay}.`
        : `Run ${runDisplay} was completed.`,
      resultPayload: {
        run_id: normalizeText(String(data?.id ?? run.id ?? '')),
        run_number: runDisplay,
        status: 'completed',
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(data?.id ?? run.id ?? '')), display: runDisplay }],
    };
  }

  if (capabilityName === 'lab_v2.approve_run') {
    const runIdentifier = normalizeText(String(payload.run_identifier ?? ''));
    if (!runIdentifier) {
      throw new Error('Lab run approval proposal is missing the run identifier.');
    }

    const run = await loadLabV2RunExecutionRow(params.userClient, params.companyId, runIdentifier);
    if (!run?.id) {
      throw new Error(`No accessible lab run matched: ${runIdentifier}.`);
    }

    const { data, error } = await params.userClient
      .from('lab_v2_test_runs')
      .update({
        status: 'approved',
        approver_id: params.userId,
        approver_name: params.userDisplayName || null,
        approved_at: new Date().toISOString(),
        approval_notes: normalizeText(String(payload.approval_notes ?? '')) || null,
        updated_by: params.userId,
      })
      .eq('id', normalizeText(String(run.id ?? '')))
      .select('id, run_number, status, approved_at')
      .single();
    if (error) throw error;

    await postLabV2RunMaterialConsumption(params.userClient, normalizeText(String(run.id ?? '')), params.userId);

    const runDisplay = normalizeText(String(data?.run_number ?? run.run_number ?? runIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تم اعتماد التشغيل ${runDisplay}.`
        : `Run ${runDisplay} was approved.`,
      resultPayload: {
        run_id: normalizeText(String(data?.id ?? run.id ?? '')),
        run_number: runDisplay,
        status: 'approved',
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(data?.id ?? run.id ?? '')), display: runDisplay }],
    };
  }

  if (capabilityName === 'lab_v2.reject_run') {
    const runIdentifier = normalizeText(String(payload.run_identifier ?? ''));
    const reason = normalizeText(String(payload.reason ?? ''));
    if (!runIdentifier || !reason) {
      throw new Error('Lab run rejection proposal is incomplete.');
    }

    const run = await loadLabV2RunExecutionRow(params.userClient, params.companyId, runIdentifier);
    if (!run?.id) {
      throw new Error(`No accessible lab run matched: ${runIdentifier}.`);
    }

    const { data, error } = await params.userClient
      .from('lab_v2_test_runs')
      .update({
        status: 'rejected',
        approver_id: params.userId,
        approver_name: params.userDisplayName || null,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_by: params.userId,
      })
      .eq('id', normalizeText(String(run.id ?? '')))
      .select('id, run_number, status, rejected_at')
      .single();
    if (error) throw error;

    const runDisplay = normalizeText(String(data?.run_number ?? run.run_number ?? runIdentifier));
    return {
      summary: params.locale.startsWith('ar')
        ? `تم رفض التشغيل ${runDisplay}.`
        : `Run ${runDisplay} was rejected.`,
      resultPayload: {
        run_id: normalizeText(String(data?.id ?? run.id ?? '')),
        run_number: runDisplay,
        status: 'rejected',
      },
      entityRefs: [{ table: 'lab_v2_test_runs', id: normalizeText(String(data?.id ?? run.id ?? '')), display: runDisplay }],
    };
  }

  throw new Error(`Execution is not implemented for capability: ${capabilityName}.`);
}

function isLatestLabReceivingIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();

  const hasLatest =
    /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);
  const hasReceiving =
    /(receiving|receipt|استلام|استلامات)/.test(text);
  const hasLabContext =
    /(lab|مختبر|معمل|المعمل)/.test(text) ||
    hint.includes('lab') ||
    hint.includes('material_receiving');

  return hasLatest && hasReceiving && hasLabContext;
}

function formatDateTimeForLocale(value: string | null, locale: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return '-';

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;

  const localeTag = locale.startsWith('ar') ? 'ar-EG-u-nu-latn' : 'en-GB';
  return parsed.toLocaleString(localeTag, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function translateMaterialReceivingStatus(status: string | null, locale: string): string {
  const key = normalizeText(status).toLowerCase();
  if (!key) return '-';

  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    pending: 'قيد الانتظار',
    inspecting: 'قيد الفحص',
    in_testing: 'قيد الاختبار',
    accepted: 'مقبول',
    approved: 'معتمد',
    rejected: 'مرفوض',
    on_hold: 'معلّق',
  };

  return map[key] || key;
}

async function loadLatestMaterialReceiving(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<LatestMaterialReceivingRow | null> {
  const { data, error } = await adminClient
    .from('material_receiving')
    .select(
      'id, receiving_number, material_name, supplier_name, batch_number, status, received_at, created_at, quantity, unit',
    )
    .eq('company_id', companyId)
    .order('received_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LatestMaterialReceivingRow | null) ?? null;
}

function buildLatestMaterialReceivingReply(
  row: LatestMaterialReceivingRow | null,
  locale: string,
): string {
  if (!row) {
    return locale.startsWith('ar')
      ? 'لا يوجد أي سجل استلام في المختبر حالياً.'
      : 'No lab receiving records were found.';
  }

  const receivedAt = formatDateTimeForLocale(row.received_at || row.created_at, locale);
  const quantity =
    typeof row.quantity === 'number' && Number.isFinite(row.quantity)
      ? `${row.quantity}${row.unit ? ` ${row.unit}` : ''}`
      : '-';
  const status = translateMaterialReceivingStatus(row.status, locale);

  if (!locale.startsWith('ar')) {
    return [
      'Latest lab receiving:',
      `- Receiving No: ${normalizeText(row.receiving_number) || '-'}`,
      `- Material: ${normalizeText(row.material_name) || '-'}`,
      `- Supplier: ${normalizeText(row.supplier_name) || '-'}`,
      `- Batch: ${normalizeText(row.batch_number) || '-'}`,
      `- Quantity: ${quantity}`,
      `- Status: ${status}`,
      `- Received At: ${receivedAt}`,
    ].join('\n');
  }

  return [
    'آخر استلام في المختبر:',
    `- رقم الاستلام: ${normalizeText(row.receiving_number) || '-'}`,
    `- المادة: ${normalizeText(row.material_name) || '-'}`,
    `- المورد: ${normalizeText(row.supplier_name) || '-'}`,
    `- رقم التشغيلة: ${normalizeText(row.batch_number) || '-'}`,
    `- الكمية: ${quantity}`,
    `- الحالة: ${status}`,
    `- تاريخ ووقت الاستلام: ${receivedAt}`,
  ].join('\n');
}

function isSuppliersForMaterialIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const extractedMaterial = extractMaterialNameFromApprovedSuppliersQuery(message);

  const hasSupplier =
    /(supplier|suppliers|مورد|موردين|الموردين|موردو)/.test(text);
  const hasMaterialSignal =
    /(raw material|material|خامة|خام|مادة|دقيق|طحين|فركتوز|glucose|fructose|sugar|flour)/.test(text) ||
    normalizeText(extractedMaterial).length > 0;
  const hasLabContext =
    /(lab|مختبر|معمل)/.test(text) ||
    hint.includes('lab') ||
    hint.includes('raw_materials') ||
    hint.includes('suppliers');

  return hasSupplier && (hasMaterialSignal || hasLabContext);
}

function isMyOpenTasksIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();

  const hasTaskContext =
    /(task|tasks|مهمة|مهام|مهامي)/.test(text) ||
    hint.includes('tasks');
  const asksForAssignedTasks =
    /(my|mine|لي|لدي|عندي|الخاصة بي|المسندة|الموكلة|مهامي)/.test(text);
  const asksForOpenState =
    /(open|pending|in progress|overdue|due|مفتوح|مفتوحة|مفتوحه|معلقة|معلقة|قيد التنفيذ|متأخر|متاخرة|متأخرة)/.test(text);

  return hasTaskContext && (asksForAssignedTasks || asksForOpenState);
}

function taskIntentWantsOverdueOnly(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(overdue|late|past due|متأخر|متاخرة|متأخرة)/.test(text);
}

function isTaskLookupIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const identifier = extractTaskIdentifierFromQuery(message);

  const hasTaskContext =
    /(task|tasks|مهمة|مهام)/.test(text) ||
    hint.includes('tasks');
  const asksLatest =
    /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);
  const asksDetails =
    /(details|detail|تفاصيل|رقم|number|no\.?|#|lookup|find|show|اعرض|أعرض|ابحث)/.test(text);
  const isOpenTaskQuery =
    /(my|mine|لي|لدي|عندي|الخاصة بي|المسندة|الموكلة|مهامي|open|pending|in progress|overdue|due|مفتوح|مفتوحة|مفتوحه|معلقة|قيد التنفيذ|متأخر|متاخرة|متأخرة)/.test(text);

  return hasTaskContext && (Boolean(identifier) || (asksLatest && !isOpenTaskQuery) || (asksDetails && Boolean(identifier)));
}

function taskLookupWantsLatest(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);
}

function isTaskActivityIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const identifier = extractTaskIdentifierFromQuery(message);

  const hasTaskContext =
    /(task|tasks|مهمة|مهام)/.test(text) ||
    hint.includes('tasks');
  const asksActivity =
    /(comment|comments|history|timeline|activity|log|تعليق|تعليقات|سجل|نشاط|timeline|التعليقات|السجل)/.test(text);
  const asksLatest =
    /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);

  return hasTaskContext && (asksActivity || (Boolean(identifier) && /comment|history|activity|log|تعليق|تعليقات|سجل|نشاط/.test(text)) || (asksLatest && asksActivity));
}

function isNcrLookupIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const identifier = extractNcrIdentifierFromQuery(message);

  const hasNcrContext =
    /\bncr\b|عدم\s+مطابقة|محتجز/.test(text) ||
    hint.includes('ncr');
  const asksLatest =
    /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);
  const asksForLookup =
    /(اعرض|أعرض|ابحث|تفاصيل|show|find|lookup|search|رقم|number|no\.?|#)/.test(text);

  return hasNcrContext && (asksLatest || Boolean(identifier) || asksForLookup);
}

function ncrIntentWantsLatest(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(latest|last|most recent|اخر|آخر|احدث|أحدث)/.test(text);
}

function isDocumentSearchIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const searchTerm = extractDocumentSearchTerm(message);

  const hasDocumentContext =
    /(document|documents|doc|docs|وثيقة|وثائق|مستند|مستندات)/.test(text) ||
    hint.includes('documents');
  const asksLatest =
    /(latest|last|recent|اخر|آخر|احدث|أحدث)/.test(text);
  const asksApproved =
    /(approved|active|معتمد|معتمدة|المعتمد|المعتمدة)/.test(text);
  const asksSearch =
    /(show|find|search|lookup|list|اعرض|أعرض|ابحث|اظهر|أظهر|قائمة|رقم|number|no\.?|#)/.test(text);

  return hasDocumentContext && (asksLatest || asksApproved || Boolean(searchTerm) || asksSearch);
}

function documentIntentWantsLatest(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(latest|last|recent|اخر|آخر|احدث|أحدث)/.test(text);
}

function documentIntentWantsApprovedOnly(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(approved|active|معتمد|معتمدة|المعتمد|المعتمدة)/.test(text);
}

function documentIntentWantsDetail(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(details|detail|تفاصيل|رقم|number|no\.?|#)/.test(text);
}

function isDocumentVersionsIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const hasDocumentContext =
    /(document|documents|doc|docs|وثيقة|وثائق|مستند|مستندات)/.test(text) ||
    hint.includes('documents');
  const asksVersions =
    /(version|versions|revision|revisions|issue|issues|اصدار|إصدار|اصدارات|إصدارات|نسخة|نسخ|مراجعة|مراجعات)/.test(text);

  return hasDocumentContext && asksVersions;
}

function isLabV2RunLookupIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const identifier = extractLabRunIdentifierFromQuery(message);

  const hasLabContext =
    /(lab\s*v?2|مختبر|معمل|تحاليل)/.test(text) ||
    hint.includes('lab_v2') ||
    hint.includes('lab');
  const hasRunContext =
    /(run|test run|lab run|تشغيل|تشغيلة|تشغيلات)/.test(text) ||
    Boolean(identifier);
  const asksLatestOrLookup =
    /(latest|last|recent|show|find|lookup|search|details|اعرض|أعرض|ابحث|تفاصيل|رقم|number|no\.?|#|اخر|آخر|احدث|أحدث)/.test(text);

  return hasLabContext && hasRunContext && asksLatestOrLookup;
}

function labV2RunIntentWantsLatest(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(latest|last|most recent|recent|اخر|آخر|احدث|أحدث)/.test(text);
}

function isLabV2RunDetailsIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();
  const identifier = extractLabRunIdentifierFromQuery(message);

  const hasLabContext =
    /(lab\s*v?2|مختبر|معمل|تحاليل)/.test(text) ||
    hint.includes('lab_v2') ||
    hint.includes('lab');
  const hasRunContext =
    /(run|test run|lab run|تشغيل|تشغيلة|تشغيلات)/.test(text) ||
    Boolean(identifier);
  const asksDetailedData =
    /(measurements|measurement|results|result values|materials|consumption|failed params|detailed|details|قياسات|نتائج|قيم|مواد|استهلاك|معلمات|تفاصيل)/.test(text);

  return hasLabContext && hasRunContext && asksDetailedData;
}

function isStructuredDataIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();

  const asksData =
    /(show|list|latest|last|most recent|how many|count|which|who|what are|اعرض|قائمة|اخر|آخر|احدث|أحدث|كم|ما هي|ما هم|من هم|مين)/.test(text);
  const domainData =
    /(supplier|material|receiving|test|run|ncr|report|batch|مورد|مادة|استلام|فحص|تشغيلة|تشغيل|تقرير|عدم مطابقة|دفعة)/.test(text) ||
    hint.includes('lab') ||
    hint.includes('material_receiving') ||
    hint.includes('raw_materials') ||
    hint.includes('suppliers') ||
    hint.includes('ncr');
  const nounDataQuery =
    /(مورد(?:ين|ي|و).*(?:خامة|مادة|دقيق|طحين)|suppliers?.*(?:material|flour|fructose|glucose))/i.test(text);

  return (asksData && domainData) || nounDataQuery;
}

function hasLikelyWriteIntent(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(أنشئ|انشئ|أضف|اضف|أرسل|ارسل|حدث|حدّث|عدل|عدّل|غير|غيّر|احذف|حذف|سجل|سجّل|اعتمد|أعتمد|ارفض|أرفض|أكمل|اكمل|create|update|delete|remove|send|record|approve|reject|complete)/.test(text);
}

function isGenericBusinessReadIntent(message: string, moduleHint: string | null): boolean {
  const text = normalizeText(message).toLowerCase();
  const hint = normalizeText(moduleHint).toLowerCase();

  if (!text) return false;
  if (hasLikelyWriteIntent(message)) return false;

  const asksRead =
    /(show|list|latest|last|recent|how many|count|find|search|get|fetch|lookup|details|info|information|which|who|what|اعرض|أعرض|هات|جيب|اظهر|أظهر|ابحث|دور|قائمة|كل|جميع|اخر|آخر|احدث|أحدث|كم|عدد|تفاصيل|معلومات|بيانات|ما هي|ما هم|من هم|مين)/.test(text) ||
    looksLikeWideListIntent(message);
  const hasBusinessEntity =
    /(document|documents|doc|docs|task|tasks|comment|comments|supplier|suppliers|material|materials|receiving|receipt|lab|test|run|ncr|report|reports|recipe|recipes|product|products|inspection|criteria|conversation|chat|message|messages|version|versions|وثيق|مستند|مهم|تعليق|مورد|خامة|مادة|استلام|مختبر|فحص|تشغيل|عدم مطابقة|تقرير|وصفة|منتج|معيار|دردشة|محادث|رسائل|اصدار|إصدار)/.test(text) ||
    Boolean(hint);

  return asksRead && hasBusinessEntity;
}

function normalizeLookupKey(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseComparableTime(value: string | null | undefined): number {
  const parsed = Date.parse(normalizeText(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareByUpdatedAtDesc<T extends { updated_at?: string | null; created_at?: string | null }>(a: T, b: T): number {
  return (
    parseComparableTime(b.updated_at || b.created_at || null) -
    parseComparableTime(a.updated_at || a.created_at || null)
  );
}

async function loadTaskAssignmentTaskIds(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await adminClient
    .from('task_assignments')
    .select('task_id')
    .eq('user_id', userId)
    .neq('status', 'declined')
    .limit(200);

  if (error) {
    throw error;
  }

  return Array.from(
    new Set(
      ((data || []) as Array<{ task_id?: string | null }>)
        .map((row) => normalizeText(row.task_id))
        .filter(Boolean),
    ),
  );
}

async function loadAccessibleTasks(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  limit: number,
): Promise<TaskLookupRow[]> {
  const selectColumns = [
    'id',
    'task_number',
    'title',
    'description',
    'task_type',
    'category',
    'status',
    'priority',
    'due_date',
    'current_stage',
    'assigned_to_name',
    'department',
    'updated_at',
    'created_at',
  ].join(', ');

  const directPromise = adminClient
    .from('tasks')
    .select(selectColumns)
    .eq('company_id', companyId)
    .or(`assigned_to.eq.${userId},primary_assignee_id.eq.${userId}`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  const assignmentTaskIds = await loadTaskAssignmentTaskIds(adminClient, userId);

  let assignmentRows: TaskLookupRow[] = [];
  if (assignmentTaskIds.length > 0) {
    const { data, error } = await adminClient
      .from('tasks')
      .select(selectColumns)
      .eq('company_id', companyId)
      .in('id', assignmentTaskIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    assignmentRows = (data || []) as TaskLookupRow[];
  }

  const { data: directRows, error: directError } = await directPromise;
  if (directError) {
    throw directError;
  }

  const merged = new Map<string, TaskLookupRow>();
  ([...((directRows || []) as TaskLookupRow[]), ...assignmentRows]).forEach((row) => {
    const id = normalizeText(row.id);
    if (!id || merged.has(id)) return;
    merged.set(id, row);
  });

  return Array.from(merged.values())
    .sort(compareByUpdatedAtDesc)
    .slice(0, limit);
}

async function loadMyOpenTasks(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  overdueOnly: boolean,
): Promise<TaskLookupRow[]> {
  const rows = await loadAccessibleTasks(adminClient, companyId, userId, 120);
  const openRows = rows
    .filter((row) => {
      const status = normalizeText(row.status).toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    })
    .sort((a, b) => {
      const dueDiff = parseComparableTime(a.due_date) - parseComparableTime(b.due_date);
      if (dueDiff !== 0) return dueDiff;
      return compareByUpdatedAtDesc(a, b);
    });

  if (!overdueOnly) return openRows.slice(0, 10);

  const now = Date.now();
  return openRows
    .filter((row) => {
      const status = normalizeText(row.status).toLowerCase();
      if (status === 'overdue') return true;
      const dueDate = normalizeText(row.due_date);
      if (!dueDate) return false;
      const parsed = new Date(dueDate);
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() < now;
    })
    .slice(0, 10);
}

async function loadLatestAccessibleTask(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
): Promise<TaskLookupRow | null> {
  const rows = await loadAccessibleTasks(adminClient, companyId, userId, 40);
  return rows[0] || null;
}

async function loadTaskByIdentifier(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  identifier: string,
): Promise<TaskLookupRow | null> {
  const normalizedIdentifier = normalizeText(identifier);
  if (!normalizedIdentifier) return null;

  const rows = await loadAccessibleTasks(adminClient, companyId, userId, 150);
  if (rows.length === 0) return null;

  const target = normalizeLookupKey(normalizedIdentifier);
  const exact = rows.find((row) => normalizeLookupKey(row.task_number || '') === target);
  if (exact) return exact;

  const contains = rows.find((row) => {
    const taskNumber = normalizeLookupKey(row.task_number || '');
    return taskNumber.includes(target);
  });

  return contains || null;
}

function translateTaskStatus(status: string | null, locale: string): string {
  const key = normalizeText(status).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    pending: 'معلّقة',
    in_progress: 'قيد التنفيذ',
    on_hold: 'معلقة مؤقتاً',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    overdue: 'متأخرة',
  };

  return map[key] || key;
}

function translateTaskPriority(priority: string | null, locale: string): string {
  const key = normalizeText(priority).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'عاجلة',
  };

  return map[key] || key;
}

function translateTaskStage(stage: string | null, locale: string): string {
  const key = normalizeText(stage).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    assignment: 'التعيين',
    in_progress: 'قيد التنفيذ',
    review: 'المراجعة',
    approval: 'الاعتماد',
    closed: 'مغلقة',
  };

  return map[key] || key;
}

function translateTaskType(taskType: string | null, locale: string): string {
  const key = normalizeText(taskType).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    general: 'عامة',
    corrective_action: 'إجراء تصحيحي',
    preventive_action: 'إجراء وقائي',
    audit: 'تدقيق',
    inspection: 'فحص',
    maintenance: 'صيانة',
    training: 'تدريب',
    documentation: 'توثيق',
    review: 'مراجعة',
    other: 'أخرى',
  };

  return map[key] || key;
}

function buildMyOpenTasksReply(rows: TaskLookupRow[], locale: string, overdueOnly: boolean): string {
  if (rows.length === 0) {
    if (locale.startsWith('ar')) {
      return overdueOnly
        ? 'لا توجد لديك مهام متأخرة حالياً.'
        : 'لا توجد لديك مهام مفتوحة حالياً.';
    }

    return overdueOnly
      ? 'You do not have overdue tasks right now.'
      : 'You do not have open tasks right now.';
  }

  const heading = locale.startsWith('ar')
    ? overdueOnly ? 'مهامك المتأخرة:' : 'مهامك المفتوحة:'
    : overdueOnly ? 'Your overdue tasks:' : 'Your open tasks:';

  const lines = rows.map((row, index) => {
    const taskNumber = normalizeText(row.task_number) || normalizeText(row.id);
    const title = normalizeText(row.title) || '-';
    const status = translateTaskStatus(row.status, locale);
    const priority = translateTaskPriority(row.priority, locale);
    const dueDate = formatDateTimeForLocale(row.due_date, locale);
    return `${index + 1}. [${taskNumber}] ${title} | ${locale.startsWith('ar') ? 'الحالة' : 'Status'}: ${status} | ${locale.startsWith('ar') ? 'الأولوية' : 'Priority'}: ${priority} | ${locale.startsWith('ar') ? 'الاستحقاق' : 'Due'}: ${dueDate}`;
  });

  return [heading, ...lines].join('\n');
}

function buildTaskLookupReply(row: TaskLookupRow | null, locale: string, identifier: string): string {
  if (!row) {
    return locale.startsWith('ar')
      ? identifier
        ? `لا توجد مهمة مطابقة للمعرف: ${identifier}.`
        : 'لا توجد مهام متاحة لك حالياً.'
      : identifier
        ? `No task matched identifier: ${identifier}.`
        : 'No tasks are currently available to you.';
  }

  const header = locale.startsWith('ar')
    ? identifier ? 'تفاصيل المهمة:' : 'أحدث مهمة متاحة لك:'
    : identifier ? 'Task details:' : 'Latest task available to you:';
  const taskNumber = normalizeText(row.task_number) || normalizeText(row.id) || '-';
  const title = normalizeText(row.title) || '-';
  const status = translateTaskStatus(row.status, locale);
  const priority = translateTaskPriority(row.priority, locale);
  const stage = translateTaskStage(row.current_stage, locale);
  const taskType = translateTaskType(row.task_type || null, locale);
  const dueDate = formatDateTimeForLocale(row.due_date, locale);
  const updatedAt = formatDateTimeForLocale(row.updated_at || row.created_at || null, locale);
  const assignee = normalizeText(row.assigned_to_name) || '-';
  const department = normalizeText(row.department) || '-';
  const description = normalizeText(row.description) || '-';

  if (!locale.startsWith('ar')) {
    return [
      header,
      `- Number: ${taskNumber}`,
      `- Title: ${title}`,
      `- Status: ${status}`,
      `- Priority: ${priority}`,
      `- Stage: ${stage}`,
      `- Type: ${taskType}`,
      `- Assignee: ${assignee}`,
      `- Department: ${department}`,
      `- Due: ${dueDate}`,
      `- Updated: ${updatedAt}`,
      `- Description: ${description}`,
    ].join('\n');
  }

  return [
    header,
    `- الرقم: ${taskNumber}`,
    `- العنوان: ${title}`,
    `- الحالة: ${status}`,
    `- الأولوية: ${priority}`,
    `- المرحلة: ${stage}`,
    `- النوع: ${taskType}`,
    `- المسند إليه: ${assignee}`,
    `- القسم: ${department}`,
    `- الاستحقاق: ${dueDate}`,
    `- آخر تحديث: ${updatedAt}`,
    `- الوصف: ${description}`,
  ].join('\n');
}

async function loadTaskComments(
  adminClient: ReturnType<typeof createClient>,
  taskId: string,
  limit: number,
): Promise<TaskCommentLookupRow[]> {
  const { data, error } = await adminClient
    .from('task_comments')
    .select('id, task_id, content, author_name, edited, edited_at, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as TaskCommentLookupRow[];
}

async function loadTaskHistoryEntries(
  adminClient: ReturnType<typeof createClient>,
  taskId: string,
  limit: number,
): Promise<TaskHistoryLookupRow[]> {
  const { data, error } = await adminClient
    .from('task_history')
    .select('id, task_id, action, old_value, new_value, changed_by_name, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: normalizeText(row.id),
    task_id: normalizeText(row.task_id),
    action: normalizeText(row.action) || null,
    old_value: isRecord(row.old_value) ? row.old_value : null,
    new_value: isRecord(row.new_value) ? row.new_value : null,
    changed_by_name: normalizeText(row.changed_by_name) || null,
    created_at: normalizeText(row.created_at) || null,
  }));
}

function translateTaskHistoryAction(action: string | null, locale: string): string {
  const key = normalizeText(action).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    created: 'تم الإنشاء',
    updated: 'تم التحديث',
    stage_advanced: 'انتقال للمرحلة التالية',
    stage_returned: 'إرجاع لمرحلة سابقة',
    assigned: 'تم الإسناد',
    assigned_to_role: 'إسناد إلى دور',
    assigned_to_department: 'إسناد إلى قسم',
    accepted: 'تم القبول',
    declined: 'تم الرفض',
    approved: 'تم الاعتماد',
    rejected: 'تم الرفض',
    status_changed: 'تغيير الحالة',
    verified: 'تم التحقق',
  };

  return map[key] || key;
}

function buildTaskHistoryDetail(entry: TaskHistoryLookupRow, locale: string): string {
  const payload = entry.new_value;
  if (!payload) return '';

  const parts: string[] = [];
  const add = (value: string) => {
    const normalized = normalizeText(value);
    if (normalized) parts.push(normalized);
  };

  const pushLabeled = (labelAr: string, labelEn: string, value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) return;
    parts.push(`${locale.startsWith('ar') ? labelAr : labelEn}: ${normalized}`);
  };

  if (typeof payload.status === 'string') {
    pushLabeled('الحالة', 'Status', translateTaskStatus(payload.status, locale));
  }
  if (typeof payload.stage === 'string') {
    pushLabeled('المرحلة', 'Stage', translateTaskStage(payload.stage, locale));
  }
  if (typeof payload.assigned_to_name === 'string') {
    pushLabeled('المسند إليه', 'Assignee', payload.assigned_to_name);
  } else if (typeof payload.user_name === 'string') {
    pushLabeled('المستخدم', 'User', payload.user_name);
  }
  if (typeof payload.reason === 'string') {
    pushLabeled('السبب', 'Reason', truncate(payload.reason, 120));
  }
  if (typeof payload.notes === 'string') {
    pushLabeled('ملاحظات', 'Notes', truncate(payload.notes, 120));
  }
  if (typeof payload.approved_by_name === 'string') {
    pushLabeled('اعتمد بواسطة', 'Approved By', payload.approved_by_name);
  }
  if (typeof payload.verified_by_name === 'string') {
    pushLabeled('تحقق بواسطة', 'Verified By', payload.verified_by_name);
  }
  if (typeof payload.return_to === 'string') {
    pushLabeled('عودة إلى', 'Returned To', translateTaskStage(payload.return_to, locale));
  }

  if (parts.length === 0 && typeof payload === 'object') {
    const values = Object.values(payload)
      .map((value) => (typeof value === 'string' ? normalizeText(value) : ''))
      .filter(Boolean)
      .slice(0, 2);
    values.forEach(add);
  }

  return parts.join(' | ');
}

function buildTaskActivityReply(
  taskRow: TaskLookupRow | null,
  comments: TaskCommentLookupRow[],
  history: TaskHistoryLookupRow[],
  locale: string,
  identifier: string,
): string {
  if (!taskRow) {
    return locale.startsWith('ar')
      ? identifier
        ? `لا توجد مهمة مطابقة للمعرف: ${identifier}.`
        : 'لا توجد مهمة متاحة لعرض نشاطها حالياً.'
      : identifier
        ? `No task matched identifier: ${identifier}.`
        : 'No task is currently available to show activity for.';
  }

  const lines: string[] = [];
  const header = locale.startsWith('ar')
    ? identifier ? 'نشاط المهمة:' : 'نشاط أحدث مهمة متاحة لك:'
    : identifier ? 'Task activity:' : 'Activity for the latest task available to you:';
  const taskNumber = normalizeText(taskRow.task_number) || normalizeText(taskRow.id) || '-';
  const title = normalizeText(taskRow.title) || '-';
  const status = translateTaskStatus(taskRow.status, locale);

  lines.push(header);
  lines.push(locale.startsWith('ar') ? `- الرقم: ${taskNumber}` : `- Number: ${taskNumber}`);
  lines.push(locale.startsWith('ar') ? `- العنوان: ${title}` : `- Title: ${title}`);
  lines.push(locale.startsWith('ar') ? `- الحالة: ${status}` : `- Status: ${status}`);

  if (comments.length === 0 && history.length === 0) {
    lines.push(locale.startsWith('ar')
      ? '- لا توجد تعليقات أو سجل نشاط محفوظ لهذه المهمة حالياً.'
      : '- No comments or recorded history were found for this task.');
    return lines.join('\n');
  }

  if (comments.length > 0) {
    lines.push(locale.startsWith('ar') ? 'أحدث التعليقات:' : 'Recent comments:');
    comments.slice(0, 3).forEach((comment, index) => {
      const createdAt = formatDateTimeForLocale(comment.created_at, locale);
      const author = normalizeText(comment.author_name) || (locale.startsWith('ar') ? 'غير محدد' : 'Unknown');
      const content = truncate(normalizeText(comment.content) || '-', 140);
      const editedSuffix = comment.edited
        ? locale.startsWith('ar') ? ' (تم التعديل)' : ' (edited)'
        : '';
      lines.push(`${index + 1}. [${createdAt}] ${author}: ${content}${editedSuffix}`);
    });
  }

  if (history.length > 0) {
    lines.push(locale.startsWith('ar') ? 'أحدث سجل النشاط:' : 'Recent activity log:');
    history.slice(0, 5).forEach((entry, index) => {
      const createdAt = formatDateTimeForLocale(entry.created_at, locale);
      const actor = normalizeText(entry.changed_by_name) || (locale.startsWith('ar') ? 'النظام' : 'System');
      const action = translateTaskHistoryAction(entry.action, locale);
      const detail = buildTaskHistoryDetail(entry, locale);
      lines.push(
        `${index + 1}. [${createdAt}] ${actor} | ${action}${detail ? ` | ${detail}` : ''}`,
      );
    });
  }

  return lines.join('\n');
}

async function loadLatestNcr(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<NcrLookupRow | null> {
  const { data, error } = await adminClient
    .from('ncr_reports')
    .select('id, number, title, status, current_stage, department, product_name, related_material_name, related_supplier_name, date, updated_at, created_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as NcrLookupRow | null) ?? null;
}

async function loadNcrByIdentifier(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  identifier: string,
): Promise<NcrLookupRow | null> {
  const normalizedIdentifier = normalizeText(identifier);
  if (!normalizedIdentifier) return null;

  const exact = await adminClient
    .from('ncr_reports')
    .select('id, number, title, status, current_stage, department, product_name, related_material_name, related_supplier_name, date, updated_at, created_at')
    .eq('company_id', companyId)
    .eq('number', normalizedIdentifier)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw exact.error;
  }

  if (exact.data) {
    return exact.data as NcrLookupRow;
  }

  const safeIdentifier = escapeLikeTerm(normalizedIdentifier);
  const { data, error } = await adminClient
    .from('ncr_reports')
    .select('id, number, title, status, current_stage, department, product_name, related_material_name, related_supplier_name, date, updated_at, created_at')
    .eq('company_id', companyId)
    .ilike('number', `%${safeIdentifier}%`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  const rows = (data || []) as NcrLookupRow[];
  if (rows.length === 0) return null;

  const target = normalizeLookupKey(normalizedIdentifier);
  const exactMatch = rows.find((row) => normalizeLookupKey(row.number || '') === target);
  return exactMatch || rows[0] || null;
}

function translateNcrStatus(status: string | null, locale: string): string {
  const key = normalizeText(status).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    open: 'مفتوح',
    in_progress: 'قيد المعالجة',
    pending_review: 'بانتظار المراجعة',
    resolved: 'تمت المعالجة',
    closed: 'مغلق',
    cancelled: 'ملغى',
    draft: 'مسودة',
    pending: 'قيد الانتظار',
    approved: 'معتمد',
    rejected: 'مرفوض',
    analysis: 'تحليل',
    action: 'إجراء',
    verification: 'تحقق',
  };

  return map[key] || key;
}

function translateNcrStage(stage: string | null, locale: string): string {
  const key = normalizeText(stage).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    initial_report: 'البلاغ الأولي',
    root_cause_analysis: 'تحليل السبب الجذري',
    capa_planning: 'تخطيط الإجراء',
    capa_execution: 'تنفيذ الإجراء',
    verification_closure: 'التحقق والإغلاق',
  };

  return map[key] || key;
}

function buildNcrReply(row: NcrLookupRow | null, locale: string, identifier: string): string {
  if (!row) {
    return locale.startsWith('ar')
      ? identifier
        ? `لا يوجد NCR مطابق للمعرف: ${identifier}.`
        : 'لا توجد سجلات NCR حالياً.'
      : identifier
        ? `No NCR matched identifier: ${identifier}.`
        : 'No NCR records were found.';
  }

  const header = locale.startsWith('ar')
    ? identifier ? 'تفاصيل NCR:' : 'آخر NCR:'
    : identifier ? 'NCR details:' : 'Latest NCR:';
  const number = normalizeText(row.number) || '-';
  const title = normalizeText(row.title) || '-';
  const status = translateNcrStatus(row.status, locale);
  const stage = translateNcrStage(row.current_stage, locale);
  const date = formatDateTimeForLocale(row.updated_at || row.date || row.created_at, locale);

  if (!locale.startsWith('ar')) {
    return [
      header,
      `- Number: ${number}`,
      `- Title: ${title}`,
      `- Status: ${status}`,
      `- Stage: ${stage}`,
      `- Department: ${normalizeText(row.department) || '-'}`,
      `- Product: ${normalizeText(row.product_name) || '-'}`,
      `- Material: ${normalizeText(row.related_material_name) || '-'}`,
      `- Supplier: ${normalizeText(row.related_supplier_name) || '-'}`,
      `- Updated: ${date}`,
    ].join('\n');
  }

  return [
    header,
    `- الرقم: ${number}`,
    `- العنوان: ${title}`,
    `- الحالة: ${status}`,
    `- المرحلة: ${stage}`,
    `- القسم: ${normalizeText(row.department) || '-'}`,
    `- المنتج: ${normalizeText(row.product_name) || '-'}`,
    `- المادة: ${normalizeText(row.related_material_name) || '-'}`,
    `- المورد: ${normalizeText(row.related_supplier_name) || '-'}`,
    `- آخر تحديث: ${date}`,
  ].join('\n');
}

async function loadUserDepartmentIds(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await adminClient
    .from('user_departments')
    .select('department_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return ((data || []) as UserDepartmentRow[])
    .map((row) => normalizeText(row.department_id))
    .filter(Boolean);
}

async function loadDepartmentNamesByIds(
  adminClient: ReturnType<typeof createClient>,
  departmentIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(departmentIds.map((id) => normalizeText(id)).filter(Boolean)));
  if (ids.length === 0) return new Map<string, string>();

  const { data, error } = await adminClient
    .from('departments')
    .select('id, name')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  ((data || []) as DepartmentLookupRow[]).forEach((row) => {
    const id = normalizeText(row.id);
    if (id) map.set(id, normalizeText(row.name));
  });
  return map;
}

async function loadVisibleDocuments(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  searchTerm: string,
  latestOnly: boolean,
  canViewAllDocuments: boolean,
  approvedOnly: boolean,
): Promise<Array<DocumentLookupRow & { department_name: string }>> {
  let query = adminClient
    .from('documents')
    .select('id, document_number, title, title_ar, description, type, status, department_id, current_version, approved_at, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(latestOnly ? 12 : 80);

  if (approvedOnly) {
    query = query.eq('status', 'approved');
  }

  if (!canViewAllDocuments) {
    const userDepartments = await loadUserDepartmentIds(adminClient, userId);
    if (userDepartments.length > 0) {
      query = query.or(`department_id.is.null,department_id.in.(${userDepartments.join(',')})`);
    } else {
      query = query.is('department_id', null);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  let rows = (data || []) as DocumentLookupRow[];
  const safeSearch = normalizeForBusinessMatch(searchTerm);
  if (safeSearch) {
    rows = rows.filter((row) => {
      const haystack = normalizeForBusinessMatch([
        normalizeText(row.document_number),
        normalizeText(row.title),
        normalizeText(row.title_ar),
      ].join(' '));
      return haystack.includes(safeSearch);
    });

    const exactDocumentNumberRows = rows.filter(
      (row) => normalizeLookupKey(row.document_number || '') === normalizeLookupKey(searchTerm),
    );

    if (exactDocumentNumberRows.length > 0) {
      rows = exactDocumentNumberRows;
    }
  }

  const trimmed = rows.slice(0, latestOnly ? 5 : 8);
  const departmentNames = await loadDepartmentNamesByIds(
    adminClient,
    trimmed.map((row) => normalizeText(row.department_id)).filter(Boolean),
  );

  return trimmed.map((row) => ({
    ...row,
    department_name: departmentNames.get(normalizeText(row.department_id)) || '',
  }));
}

function translateDocumentStatus(status: string | null, locale: string): string {
  const key = normalizeText(status).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    draft: 'مسودة',
    pending_review: 'بانتظار المراجعة',
    approved: 'معتمدة',
    obsolete: 'ملغاة الاستخدام',
    archived: 'مؤرشفة',
  };

  return map[key] || key;
}

function translateDocumentType(type: string | null, locale: string): string {
  const key = normalizeText(type).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    sop: 'إجراء تشغيلي',
    work_instruction: 'تعليمات عمل',
    manual: 'دليل',
    form: 'نموذج',
    policy: 'سياسة',
    specification: 'مواصفة',
    other: 'أخرى',
  };

  return map[key] || key;
}

function buildDocumentsReply(
  rows: Array<DocumentLookupRow & { department_name: string }>,
  locale: string,
  latestOnly: boolean,
  searchTerm: string,
  approvedOnly: boolean,
  detailOnly: boolean,
): string {
  if (rows.length === 0) {
    return locale.startsWith('ar')
      ? latestOnly
        ? approvedOnly
          ? 'لا توجد وثائق معتمدة مرئية لك حالياً.'
          : 'لا توجد وثائق مرئية لك حالياً.'
        : approvedOnly && !searchTerm
          ? 'لا توجد وثائق معتمدة مرئية لك حالياً.'
          : `لا توجد وثائق مطابقة لعبارة البحث: ${searchTerm}.`
      : latestOnly
        ? approvedOnly
          ? 'No approved visible documents were found.'
          : 'No visible documents were found.'
        : approvedOnly && !searchTerm
          ? 'No approved visible documents were found.'
          : `No documents matched search term: ${searchTerm}.`;
  }

  if (detailOnly) {
    const row = rows[0];
    const documentNumber = normalizeText(row.document_number) || normalizeText(row.id) || '-';
    const title = locale.startsWith('ar')
      ? normalizeText(row.title_ar) || normalizeText(row.title) || '-'
      : normalizeText(row.title) || normalizeText(row.title_ar) || '-';
    const status = translateDocumentStatus(row.status, locale);
    const type = translateDocumentType(row.type, locale);
    const department = normalizeText(row.department_name) || '-';
    const currentVersion = row.current_version != null ? String(row.current_version) : '-';
    const approvedAt = formatDateTimeForLocale(row.approved_at, locale);
    const updatedAt = formatDateTimeForLocale(row.updated_at, locale);
    const description = normalizeText(row.description) || '-';

    if (!locale.startsWith('ar')) {
      return [
        'Document details:',
        `- Number: ${documentNumber}`,
        `- Title: ${title}`,
        `- Status: ${status}`,
        `- Type: ${type}`,
        `- Current Version: ${currentVersion}`,
        `- Department: ${department}`,
        `- Approved At: ${approvedAt}`,
        `- Updated At: ${updatedAt}`,
        `- Description: ${description}`,
      ].join('\n');
    }

    return [
      'تفاصيل الوثيقة:',
      `- الرقم: ${documentNumber}`,
      `- العنوان: ${title}`,
      `- الحالة: ${status}`,
      `- النوع: ${type}`,
      `- الإصدار الحالي: ${currentVersion}`,
      `- القسم: ${department}`,
      `- تاريخ الاعتماد: ${approvedAt}`,
      `- آخر تحديث: ${updatedAt}`,
      `- الوصف: ${description}`,
    ].join('\n');
  }

  const heading = locale.startsWith('ar')
    ? latestOnly
      ? approvedOnly ? 'أحدث الوثائق المعتمدة المتاحة:' : 'أحدث الوثائق المتاحة:'
      : searchTerm
        ? `الوثائق المطابقة لـ "${searchTerm}":`
        : approvedOnly
          ? 'الوثائق المعتمدة المتاحة:'
          : 'الوثائق المتاحة:'
    : latestOnly
      ? approvedOnly ? 'Latest approved documents:' : 'Latest available documents:'
      : searchTerm
        ? `Documents matching "${searchTerm}":`
        : approvedOnly
          ? 'Approved available documents:'
          : 'Available documents:';

  const lines = rows.map((row, index) => {
    const documentNumber = normalizeText(row.document_number) || normalizeText(row.id);
    const title = locale.startsWith('ar')
      ? normalizeText(row.title_ar) || normalizeText(row.title) || '-'
      : normalizeText(row.title) || normalizeText(row.title_ar) || '-';
    const status = translateDocumentStatus(row.status, locale);
    const type = translateDocumentType(row.type, locale);
    const department = normalizeText(row.department_name) || '-';
    return `${index + 1}. [${documentNumber}] ${title} | ${locale.startsWith('ar') ? 'الحالة' : 'Status'}: ${status} | ${locale.startsWith('ar') ? 'النوع' : 'Type'}: ${type} | ${locale.startsWith('ar') ? 'القسم' : 'Department'}: ${department}`;
  });

  return [heading, ...lines].join('\n');
}

async function loadDocumentVersions(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  documentId: string,
  limit: number,
): Promise<DocumentVersionLookupRow[]> {
  const { data, error } = await adminClient
    .from('document_versions')
    .select('id, document_id, version, status, file_name, changes_summary, change_reason, created_at, reviewed_at, approved_at, updated_at')
    .eq('company_id', companyId)
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as DocumentVersionLookupRow[];
}

function buildDocumentVersionsReply(
  documentRow: (DocumentLookupRow & { department_name: string }) | null,
  versions: DocumentVersionLookupRow[],
  locale: string,
  searchTerm: string,
): string {
  if (!documentRow) {
    return locale.startsWith('ar')
      ? searchTerm
        ? `لا توجد وثيقة مطابقة لعبارة البحث: ${searchTerm}.`
        : 'لا توجد وثيقة مرئية مناسبة لعرض إصداراتها حالياً.'
      : searchTerm
        ? `No document matched search term: ${searchTerm}.`
        : 'No visible document is currently available to show versions for.';
  }

  const documentNumber = normalizeText(documentRow.document_number) || normalizeText(documentRow.id) || '-';
  const title = locale.startsWith('ar')
    ? normalizeText(documentRow.title_ar) || normalizeText(documentRow.title) || '-'
    : normalizeText(documentRow.title) || normalizeText(documentRow.title_ar) || '-';
  const department = normalizeText(documentRow.department_name) || '-';
  const status = translateDocumentStatus(documentRow.status, locale);
  const currentVersion = documentRow.current_version != null ? String(documentRow.current_version) : '-';

  const lines = [
    locale.startsWith('ar') ? 'إصدارات الوثيقة:' : 'Document versions:',
    locale.startsWith('ar') ? `- الرقم: ${documentNumber}` : `- Number: ${documentNumber}`,
    locale.startsWith('ar') ? `- العنوان: ${title}` : `- Title: ${title}`,
    locale.startsWith('ar') ? `- الحالة الحالية: ${status}` : `- Current Status: ${status}`,
    locale.startsWith('ar') ? `- الإصدار الحالي: ${currentVersion}` : `- Current Version: ${currentVersion}`,
    locale.startsWith('ar') ? `- القسم: ${department}` : `- Department: ${department}`,
  ];

  if (versions.length === 0) {
    lines.push(locale.startsWith('ar')
      ? '- لا توجد سجلات إصدارات محفوظة لهذه الوثيقة حالياً.'
      : '- No saved version history was found for this document.');
    return lines.join('\n');
  }

  lines.push(locale.startsWith('ar') ? 'أحدث الإصدارات:' : 'Recent versions:');
  versions.slice(0, 5).forEach((versionRow, index) => {
    const versionNo = versionRow.version != null ? `v${versionRow.version}` : '-';
    const versionStatus = translateDocumentStatus(versionRow.status, locale);
    const createdAt = formatDateTimeForLocale(versionRow.created_at, locale);
    const approvedAt = formatDateTimeForLocale(versionRow.approved_at, locale);
    const changeSummary = truncate(
      normalizeText(versionRow.changes_summary) || normalizeText(versionRow.change_reason) || '-',
      120,
    );
    lines.push(
      `${index + 1}. ${versionNo} | ${locale.startsWith('ar') ? 'الحالة' : 'Status'}: ${versionStatus} | ${locale.startsWith('ar') ? 'الإنشاء' : 'Created'}: ${createdAt} | ${locale.startsWith('ar') ? 'الاعتماد' : 'Approved'}: ${approvedAt} | ${locale.startsWith('ar') ? 'الملخص' : 'Summary'}: ${changeSummary}`,
    );
  });

  return lines.join('\n');
}

async function loadLabV2RunTestsByIds(
  adminClient: ReturnType<typeof createClient>,
  testIds: string[],
): Promise<Map<string, LabV2TestLookupRow>> {
  const ids = Array.from(new Set(testIds.map((id) => normalizeText(id)).filter(Boolean)));
  if (ids.length === 0) return new Map<string, LabV2TestLookupRow>();

  const { data, error } = await adminClient
    .from('lab_v2_tests')
    .select('id, code, name, name_ar')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<string, LabV2TestLookupRow>();
  ((data || []) as LabV2TestLookupRow[]).forEach((row) => {
    const id = normalizeText(row.id);
    if (id) map.set(id, row);
  });
  return map;
}

async function loadLatestLabV2Run(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<LabV2RunLookupRow | null> {
  const { data, error } = await adminClient
    .from('lab_v2_test_runs')
    .select('id, run_number, test_id, batch_number_snapshot, shift_snapshot, status, operator_name, approver_name, started_at, completed_at, approved_at, rejected_at, evaluation_result, notes, created_at, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LabV2RunLookupRow | null) ?? null;
}

async function loadLabV2RunByIdentifier(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  identifier: string,
): Promise<LabV2RunLookupRow | null> {
  const normalizedIdentifier = normalizeText(identifier);
  if (!normalizedIdentifier) return null;

  const exact = await adminClient
    .from('lab_v2_test_runs')
    .select('id, run_number, test_id, batch_number_snapshot, shift_snapshot, status, operator_name, approver_name, started_at, completed_at, approved_at, rejected_at, evaluation_result, notes, created_at, updated_at')
    .eq('company_id', companyId)
    .eq('run_number', normalizedIdentifier)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw exact.error;
  }

  if (exact.data) {
    return exact.data as LabV2RunLookupRow;
  }

  const safeIdentifier = escapeLikeTerm(normalizedIdentifier);
  const { data, error } = await adminClient
    .from('lab_v2_test_runs')
    .select('id, run_number, test_id, batch_number_snapshot, shift_snapshot, status, operator_name, approver_name, started_at, completed_at, approved_at, rejected_at, evaluation_result, notes, created_at, updated_at')
    .eq('company_id', companyId)
    .ilike('run_number', `%${safeIdentifier}%`)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  const rows = (data || []) as LabV2RunLookupRow[];
  if (rows.length === 0) return null;

  const target = normalizeLookupKey(normalizedIdentifier);
  const exactMatch = rows.find((row) => normalizeLookupKey(row.run_number || '') === target);
  return exactMatch || rows[0] || null;
}

function translateLabV2RunStatus(status: string | null, locale: string): string {
  const key = normalizeText(status).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    draft: 'مسودة',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    approved: 'معتمد',
    rejected: 'مرفوض',
  };

  return map[key] || key;
}

function translateLabV2EvaluationResult(result: string | null, locale: string): string {
  const key = normalizeText(result).toLowerCase();
  if (!key) return '-';
  if (!locale.startsWith('ar')) return key;

  const map: Record<string, string> = {
    pass: 'مطابق',
    fail: 'غير مطابق',
    warning: 'تحذير',
    na: 'غير منطبق',
  };

  return map[key] || key;
}

function buildLabV2RunReply(
  row: LabV2RunLookupRow | null,
  testInfo: LabV2TestLookupRow | null,
  locale: string,
  identifier: string,
): string {
  if (!row) {
    return locale.startsWith('ar')
      ? identifier
        ? `لا يوجد تشغيل مختبر مطابق للمعرف: ${identifier}.`
        : 'لا توجد تشغيلات مختبر V2 حالياً.'
      : identifier
        ? `No lab run matched identifier: ${identifier}.`
        : 'No Lab V2 runs were found.';
  }

  const header = locale.startsWith('ar')
    ? identifier ? 'تفاصيل تشغيل المختبر:' : 'آخر تشغيل مختبر V2:'
    : identifier ? 'Lab run details:' : 'Latest Lab V2 run:';
  const runNumber = normalizeText(row.run_number) || normalizeText(row.id) || '-';
  const testName = locale.startsWith('ar')
    ? normalizeText(testInfo?.name_ar) || normalizeText(testInfo?.name) || normalizeText(testInfo?.code) || '-'
    : normalizeText(testInfo?.name) || normalizeText(testInfo?.name_ar) || normalizeText(testInfo?.code) || '-';
  const status = translateLabV2RunStatus(row.status, locale);
  const evaluation = translateLabV2EvaluationResult(row.evaluation_result, locale);
  const batch = normalizeText(row.batch_number_snapshot) || '-';
  const shift = normalizeText(row.shift_snapshot) || '-';
  const operatorName = normalizeText(row.operator_name) || '-';
  const approverName = normalizeText(row.approver_name) || '-';
  const updatedAt = formatDateTimeForLocale(row.updated_at || row.created_at, locale);
  const completedAt = formatDateTimeForLocale(row.completed_at || row.approved_at || row.rejected_at || row.started_at, locale);
  const notes = normalizeText(row.notes) || '-';

  if (!locale.startsWith('ar')) {
    return [
      header,
      `- Run Number: ${runNumber}`,
      `- Test: ${testName}`,
      `- Status: ${status}`,
      `- Evaluation: ${evaluation}`,
      `- Batch: ${batch}`,
      `- Shift: ${shift}`,
      `- Operator: ${operatorName}`,
      `- Approver: ${approverName}`,
      `- Completed: ${completedAt}`,
      `- Updated: ${updatedAt}`,
      `- Notes: ${notes}`,
    ].join('\n');
  }

  return [
    header,
    `- رقم التشغيل: ${runNumber}`,
    `- الاختبار: ${testName}`,
    `- الحالة: ${status}`,
    `- النتيجة: ${evaluation}`,
    `- رقم التشغيلة: ${batch}`,
    `- الوردية: ${shift}`,
    `- المنفذ: ${operatorName}`,
    `- المعتمد: ${approverName}`,
    `- آخر حالة زمنية: ${completedAt}`,
    `- آخر تحديث: ${updatedAt}`,
    `- الملاحظات: ${notes}`,
  ].join('\n');
}

async function loadLabV2RunDetailById(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  runId: string,
): Promise<LabV2RunDetailRow | null> {
  const selectColumns = [
    'id',
    'run_number',
    'test_id',
    'batch_number_snapshot',
    'shift_snapshot',
    'status',
    'operator_name',
    'approver_name',
    'started_at',
    'completed_at',
    'approved_at',
    'rejected_at',
    'evaluation_result',
    'failed_params',
    'results_count',
    'notes',
    'approval_notes',
    'rejection_reason',
    'created_at',
    'updated_at',
    'measurements:lab_v2_run_measurements(id, measurement_no, measured_at, notes, evaluation_result, failed_params, created_at, updated_at, values:lab_v2_run_values(id, param_key, value, numeric_value, evaluation_result, out_of_spec, notes, created_at, updated_at))',
    'materials:lab_v2_run_materials(id, chemical_receipt_id, quantity_used, unit, notes, created_at)',
    'material_selections:lab_v2_run_material_selections(id, step_snapshot_key, chemical_id, chemical_receipt_id, planned_quantity, unit, selection_notes, consumption_posted_at, consumed_quantity, created_at, updated_at)',
  ].join(', ');

  const { data, error } = await adminClient
    .from('lab_v2_test_runs')
    .select(selectColumns)
    .eq('company_id', companyId)
    .eq('id', runId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as LabV2RunDetailRow;
  const measurements = ((row.measurements || []) as LabV2RunMeasurementLookupRow[])
    .slice()
    .sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0))
    .map((measurement) => ({
      ...measurement,
      failed_params: normalizeStringArray(measurement.failed_params),
      values: ((measurement.values || []) as LabV2RunValueLookupRow[])
        .slice()
        .sort((a, b) => normalizeText(a.param_key).localeCompare(normalizeText(b.param_key))),
    }));

  const materials = ((row.materials || []) as LabV2RunMaterialLookupRow[])
    .slice()
    .sort(compareByUpdatedAtDesc);

  const materialSelections = ((row.material_selections || []) as LabV2RunMaterialSelectionLookupRow[])
    .slice()
    .sort(compareByUpdatedAtDesc);

  return {
    ...row,
    failed_params: normalizeStringArray(row.failed_params),
    measurements,
    materials,
    material_selections: materialSelections,
  };
}

async function loadLabV2ChemicalReceiptsByIds(
  adminClient: ReturnType<typeof createClient>,
  receiptIds: string[],
): Promise<Map<string, LabV2ChemicalReceiptLookupRow>> {
  const ids = Array.from(new Set(receiptIds.map((id) => normalizeText(id)).filter(Boolean)));
  if (ids.length === 0) return new Map<string, LabV2ChemicalReceiptLookupRow>();

  const { data, error } = await adminClient
    .from('lab_v2_chemical_receipts')
    .select('id, receipt_number, lot_number, batch_number, chemical_id')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<string, LabV2ChemicalReceiptLookupRow>();
  ((data || []) as LabV2ChemicalReceiptLookupRow[]).forEach((row) => {
    const id = normalizeText(row.id);
    if (id) map.set(id, row);
  });
  return map;
}

async function loadLabV2ChemicalsByIds(
  adminClient: ReturnType<typeof createClient>,
  chemicalIds: string[],
): Promise<Map<string, LabV2ChemicalLookupRow>> {
  const ids = Array.from(new Set(chemicalIds.map((id) => normalizeText(id)).filter(Boolean)));
  if (ids.length === 0) return new Map<string, LabV2ChemicalLookupRow>();

  const { data, error } = await adminClient
    .from('lab_v2_chemicals')
    .select('id, code, name, name_ar')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<string, LabV2ChemicalLookupRow>();
  ((data || []) as LabV2ChemicalLookupRow[]).forEach((row) => {
    const id = normalizeText(row.id);
    if (id) map.set(id, row);
  });
  return map;
}

function buildLabV2ChemicalLabel(
  chemical: LabV2ChemicalLookupRow | null | undefined,
  locale: string,
): string {
  if (!chemical) return '-';
  return locale.startsWith('ar')
    ? normalizeText(chemical.name_ar) || normalizeText(chemical.name) || normalizeText(chemical.code) || '-'
    : normalizeText(chemical.name) || normalizeText(chemical.name_ar) || normalizeText(chemical.code) || '-';
}

function buildQuantityLabel(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  const numeric = Number(value);
  const normalizedUnit = normalizeText(unit);
  return normalizedUnit ? `${numeric} ${normalizedUnit}` : String(numeric);
}

function buildLabV2RunDetailsReply(
  row: LabV2RunDetailRow | null,
  testInfo: LabV2TestLookupRow | null,
  receiptsById: Map<string, LabV2ChemicalReceiptLookupRow>,
  chemicalsById: Map<string, LabV2ChemicalLookupRow>,
  locale: string,
  identifier: string,
): string {
  if (!row) {
    return locale.startsWith('ar')
      ? identifier
        ? `لا يوجد تشغيل مختبر مطابق للمعرف: ${identifier}.`
        : 'لا توجد تشغيلات مختبر V2 متاحة لعرض تفاصيلها حالياً.'
      : identifier
        ? `No lab run matched identifier: ${identifier}.`
        : 'No Lab V2 run is currently available to show details for.';
  }

  const measurements = (row.measurements || []) as LabV2RunMeasurementLookupRow[];
  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const latestValues = ((latestMeasurement?.values || []) as LabV2RunValueLookupRow[]).slice(0, 6);
  const materialSelections = (row.material_selections || []) as LabV2RunMaterialSelectionLookupRow[];
  const materials = (row.materials || []) as LabV2RunMaterialLookupRow[];
  const failedParams = Array.from(new Set([
    ...normalizeStringArray(row.failed_params),
    ...normalizeStringArray(latestMeasurement?.failed_params),
    ...latestValues.filter((value) => Boolean(value.out_of_spec)).map((value) => normalizeText(value.param_key)),
  ].filter(Boolean)));

  const testName = locale.startsWith('ar')
    ? normalizeText(testInfo?.name_ar) || normalizeText(testInfo?.name) || normalizeText(testInfo?.code) || '-'
    : normalizeText(testInfo?.name) || normalizeText(testInfo?.name_ar) || normalizeText(testInfo?.code) || '-';
  const lines = [
    locale.startsWith('ar') ? 'تفاصيل تشغيل المختبر:' : 'Lab run details:',
    locale.startsWith('ar') ? `- رقم التشغيل: ${normalizeText(row.run_number) || normalizeText(row.id) || '-'}` : `- Run Number: ${normalizeText(row.run_number) || normalizeText(row.id) || '-'}`,
    locale.startsWith('ar') ? `- الاختبار: ${testName}` : `- Test: ${testName}`,
    locale.startsWith('ar') ? `- الحالة: ${translateLabV2RunStatus(row.status, locale)}` : `- Status: ${translateLabV2RunStatus(row.status, locale)}`,
    locale.startsWith('ar') ? `- النتيجة: ${translateLabV2EvaluationResult(row.evaluation_result, locale)}` : `- Evaluation: ${translateLabV2EvaluationResult(row.evaluation_result, locale)}`,
    locale.startsWith('ar') ? `- القياسات المسجلة: ${measurements.length}` : `- Measurements Recorded: ${measurements.length}`,
    locale.startsWith('ar') ? `- النتائج المسجلة: ${row.results_count ?? measurements.reduce((sum, measurement) => sum + ((measurement.values || []).length), 0)}` : `- Result Values Recorded: ${row.results_count ?? measurements.reduce((sum, measurement) => sum + ((measurement.values || []).length), 0)}`,
    locale.startsWith('ar') ? `- رقم التشغيلة: ${normalizeText(row.batch_number_snapshot) || '-'}` : `- Batch: ${normalizeText(row.batch_number_snapshot) || '-'}`,
    locale.startsWith('ar') ? `- الوردية: ${normalizeText(row.shift_snapshot) || '-'}` : `- Shift: ${normalizeText(row.shift_snapshot) || '-'}`,
    locale.startsWith('ar') ? `- المنفذ: ${normalizeText(row.operator_name) || '-'}` : `- Operator: ${normalizeText(row.operator_name) || '-'}`,
    locale.startsWith('ar') ? `- المعتمد: ${normalizeText(row.approver_name) || '-'}` : `- Approver: ${normalizeText(row.approver_name) || '-'}`,
  ];

  if (failedParams.length > 0) {
    lines.push(locale.startsWith('ar')
      ? `- المعلمات غير المطابقة: ${failedParams.join('، ')}`
      : `- Failed Parameters: ${failedParams.join(', ')}`);
  }

  if (normalizeText(row.approval_notes)) {
    lines.push(locale.startsWith('ar')
      ? `- ملاحظات الاعتماد: ${truncate(normalizeText(row.approval_notes), 160)}`
      : `- Approval Notes: ${truncate(normalizeText(row.approval_notes), 160)}`);
  }

  if (normalizeText(row.rejection_reason)) {
    lines.push(locale.startsWith('ar')
      ? `- سبب الرفض: ${truncate(normalizeText(row.rejection_reason), 160)}`
      : `- Rejection Reason: ${truncate(normalizeText(row.rejection_reason), 160)}`);
  }

  if (normalizeText(row.notes)) {
    lines.push(locale.startsWith('ar')
      ? `- ملاحظات التشغيل: ${truncate(normalizeText(row.notes), 160)}`
      : `- Run Notes: ${truncate(normalizeText(row.notes), 160)}`);
  }

  if (latestMeasurement) {
    lines.push(locale.startsWith('ar') ? 'آخر قياس:' : 'Latest measurement:');
    lines.push(locale.startsWith('ar')
      ? `- رقم القياس: ${latestMeasurement.measurement_no ?? '-'}`
      : `- Measurement No: ${latestMeasurement.measurement_no ?? '-'}`);
    lines.push(locale.startsWith('ar')
      ? `- وقت القياس: ${formatDateTimeForLocale(latestMeasurement.measured_at || latestMeasurement.created_at, locale)}`
      : `- Measured At: ${formatDateTimeForLocale(latestMeasurement.measured_at || latestMeasurement.created_at, locale)}`);
    lines.push(locale.startsWith('ar')
      ? `- نتيجة القياس: ${translateLabV2EvaluationResult(latestMeasurement.evaluation_result, locale)}`
      : `- Measurement Result: ${translateLabV2EvaluationResult(latestMeasurement.evaluation_result, locale)}`);
    if (normalizeText(latestMeasurement.notes)) {
      lines.push(locale.startsWith('ar')
        ? `- ملاحظات القياس: ${truncate(normalizeText(latestMeasurement.notes), 140)}`
        : `- Measurement Notes: ${truncate(normalizeText(latestMeasurement.notes), 140)}`);
    }
  }

  if (latestValues.length > 0) {
    lines.push(locale.startsWith('ar') ? 'أحدث القيم المسجلة:' : 'Latest recorded values:');
    latestValues.forEach((value, index) => {
      const rawValue = normalizeText(value.value);
      const numericValue = value.numeric_value != null && Number.isFinite(Number(value.numeric_value))
        ? String(value.numeric_value)
        : '';
      const displayValue = rawValue || numericValue || '-';
      lines.push(
        `${index + 1}. ${normalizeText(value.param_key) || '-'} = ${displayValue} | ${locale.startsWith('ar') ? 'النتيجة' : 'Result'}: ${translateLabV2EvaluationResult(value.evaluation_result, locale)}${value.out_of_spec ? locale.startsWith('ar') ? ' | خارج المواصفة' : ' | out of spec' : ''}`,
      );
    });
  }

  if (materialSelections.length > 0) {
    lines.push(locale.startsWith('ar') ? 'المواد المختارة/المخططة:' : 'Selected or planned materials:');
    materialSelections.slice(0, 4).forEach((selection, index) => {
      const receipt = receiptsById.get(normalizeText(selection.chemical_receipt_id));
      const chemical = chemicalsById.get(
        normalizeText(selection.chemical_id) || normalizeText(receipt?.chemical_id),
      );
      const receiptLabel =
        normalizeText(receipt?.receipt_number) ||
        normalizeText(receipt?.batch_number) ||
        normalizeText(receipt?.lot_number) ||
        '-';
      lines.push(
        `${index + 1}. ${buildLabV2ChemicalLabel(chemical, locale)} | ${locale.startsWith('ar') ? 'الاستلام' : 'Receipt'}: ${receiptLabel} | ${locale.startsWith('ar') ? 'المخطط' : 'Planned'}: ${buildQuantityLabel(selection.planned_quantity, selection.unit)} | ${locale.startsWith('ar') ? 'المستهلك' : 'Consumed'}: ${buildQuantityLabel(selection.consumed_quantity, selection.unit)}`,
      );
    });
  }

  if (materials.length > 0) {
    lines.push(locale.startsWith('ar') ? 'مواد مسجلة بالاستهلاك:' : 'Consumption records:');
    materials.slice(0, 4).forEach((material, index) => {
      const receipt = receiptsById.get(normalizeText(material.chemical_receipt_id));
      const chemical = chemicalsById.get(normalizeText(receipt?.chemical_id));
      const receiptLabel =
        normalizeText(receipt?.receipt_number) ||
        normalizeText(receipt?.batch_number) ||
        normalizeText(receipt?.lot_number) ||
        '-';
      lines.push(
        `${index + 1}. ${buildLabV2ChemicalLabel(chemical, locale)} | ${locale.startsWith('ar') ? 'الاستلام' : 'Receipt'}: ${receiptLabel} | ${locale.startsWith('ar') ? 'الكمية' : 'Quantity'}: ${buildQuantityLabel(material.quantity_used, material.unit)}`,
      );
    });
  }

  return lines.join('\n');
}

async function loadRawMaterialByTerm(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  materialTerm: string,
): Promise<RawMaterialLookupRow | null> {
  const normalizedTerm = normalizeText(materialTerm);
  if (!normalizedTerm) return null;
  const variants = buildMaterialTermCandidates(normalizedTerm)
    .map((item) => item.replace(/[%_]/g, '').trim())
    .filter(Boolean);
  if (variants.length === 0) return null;

  const mergedRows = new Map<string, RawMaterialLookupRow>();

  const runLookup = async (scope: 'company' | 'global', termVariant: string) => {
    const orFilter = `name.ilike.%${termVariant}%,code.ilike.%${termVariant}%`;

    let query = adminClient
      .from('raw_materials')
      .select('id, name, code, company_id')
      .eq('is_active', true)
      .or(orFilter)
      .limit(30);

    query = scope === 'company' ? query.eq('company_id', companyId) : query.is('company_id', null);
    return await query;
  };

  for (const variant of variants) {
    const scoped = await runLookup('company', variant);
    if (scoped.error) throw scoped.error;
    ((scoped.data || []) as RawMaterialLookupRow[]).forEach((row) => {
      if (row?.id) mergedRows.set(row.id, row);
    });

    const global = await runLookup('global', variant);
    if (global.error) throw global.error;
    ((global.data || []) as RawMaterialLookupRow[]).forEach((row) => {
      if (row?.id && !mergedRows.has(row.id)) mergedRows.set(row.id, row);
    });
  }

  const rows = Array.from(mergedRows.values());
  if (rows.length === 0) return null;

  const normalizedVariants = variants.map((item) => normalizeForBusinessMatch(item));

  const exact = rows.find((row) => {
    const nameNorm = normalizeForBusinessMatch(row.name || '');
    return normalizedVariants.some((variant) => variant && nameNorm === variant);
  });
  if (exact) return exact;

  const startsWith = rows.find((row) => {
    const nameNorm = normalizeForBusinessMatch(row.name || '');
    return normalizedVariants.some((variant) => variant && nameNorm.startsWith(variant));
  });
  if (startsWith) return startsWith;

  return rows[0] || null;
}

async function loadRawMaterialById(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  rawMaterialId: string,
): Promise<RawMaterialLookupRow | null> {
  const id = normalizeText(rawMaterialId);
  if (!id) return null;

  const scoped = await adminClient
    .from('raw_materials')
    .select('id, name, code, company_id')
    .eq('id', id)
    .eq('is_active', true)
    .eq('company_id', companyId)
    .maybeSingle();

  if (scoped.error) {
    throw scoped.error;
  }

  if (scoped.data) return scoped.data as RawMaterialLookupRow;

  const global = await adminClient
    .from('raw_materials')
    .select('id, name, code, company_id')
    .eq('id', id)
    .eq('is_active', true)
    .is('company_id', null)
    .maybeSingle();

  if (global.error) {
    throw global.error;
  }

  return (global.data as RawMaterialLookupRow | null) ?? null;
}

async function loadMaterialFromReceivingByTerm(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  materialTerm: string,
): Promise<MaterialReceivingMaterialLookupRow | null> {
  const variants = buildMaterialTermCandidates(materialTerm)
    .map((item) => item.replace(/[%_]/g, '').trim())
    .filter(Boolean);

  if (variants.length === 0) return null;

  for (const variant of variants) {
    const { data, error } = await adminClient
      .from('material_receiving')
      .select('raw_material_id, material_name, received_at, created_at')
      .eq('company_id', companyId)
      .ilike('material_name', `%${variant}%`)
      .order('received_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) return data as MaterialReceivingMaterialLookupRow;
  }

  return null;
}

async function loadApprovedSuppliersForRawMaterial(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  rawMaterialId: string,
): Promise<Array<SupplierLookupRow & { isPrimary: boolean }>> {
  const loadLinks = async (withCompanyFilter: boolean) => {
    let query = adminClient
      .from('raw_material_suppliers')
      .select('supplier_id, is_primary')
      .eq('raw_material_id', rawMaterialId)
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    if (withCompanyFilter) {
      query = query.eq('company_id', companyId);
    } else {
      query = query.is('company_id', null);
    }

    return await query;
  };

  let { data: linkRows, error: linksError } = await loadLinks(true);

  if (linksError) {
    throw linksError;
  }

  if (!linkRows || linkRows.length === 0) {
    const fallback = await loadLinks(false);
    if (fallback.error) {
      throw fallback.error;
    }
    linkRows = fallback.data || [];
  }

  const links = (linkRows || []) as RawMaterialSupplierLinkRow[];
  const supplierIds = links
    .map((row) => normalizeText(row.supplier_id))
    .filter((id): id is string => Boolean(id));

  if (supplierIds.length === 0) {
    return [];
  }

  const { data: supplierRows, error: suppliersError } = await adminClient
    .from('suppliers')
    .select('id, code, name')
    .in('id', supplierIds)
    .eq('approved', true)
    .eq('is_active', true)
    .or(`company_id.eq.${companyId},company_id.is.null`);

  if (suppliersError) {
    throw suppliersError;
  }

  const suppliers = (supplierRows || []) as SupplierLookupRow[];
  const linkBySupplierId = new Map<string, RawMaterialSupplierLinkRow>();
  links.forEach((row) => {
    const id = normalizeText(row.supplier_id);
    if (id) linkBySupplierId.set(id, row);
  });

  return suppliers
    .map((row) => ({
      ...row,
      isPrimary: Boolean(linkBySupplierId.get(row.id)?.is_primary),
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return normalizeText(a.name).localeCompare(normalizeText(b.name), 'ar');
    });
}

function buildApprovedSuppliersReply(
  materialName: string,
  suppliers: Array<SupplierLookupRow & { isPrimary: boolean }>,
  locale: string,
): string {
  if (suppliers.length === 0) {
    return locale.startsWith('ar')
      ? `لا يوجد موردون معتمدون مسجلون للمادة: ${materialName}.`
      : `No approved suppliers are registered for material: ${materialName}.`;
  }

  if (!locale.startsWith('ar')) {
    const lines = suppliers.map((supplier, index) => {
      const label = supplier.isPrimary ? ' (Primary)' : '';
      return `${index + 1}. ${normalizeText(supplier.name) || '-'} [${normalizeText(supplier.code) || '-'}]${label}`;
    });
    return [`Approved suppliers for ${materialName}:`, ...lines].join('\n');
  }

  const lines = suppliers.map((supplier, index) => {
    const label = supplier.isPrimary ? ' (رئيسي)' : '';
    return `${index + 1}. ${normalizeText(supplier.name) || '-'} [${normalizeText(supplier.code) || '-'}]${label}`;
  });
  return [`الموردون المعتمدون للمادة ${materialName}:`, ...lines].join('\n');
}

function buildUnsupportedStructuredDataReply(locale: string): string {
  return locale.startsWith('ar')
    ? 'لا أستطيع تقديم إجابة دقيقة لهذا السؤال من البيانات الحالية عبر المساعد الآن. استخدم طلباً مباشراً (مثل: "اعرض آخر استلام") أو افتح الشاشة المختصة.'
    : 'I cannot provide a reliable data-grounded answer for this request right now. Please use a direct query (for example: "show latest receiving") or open the related page.';
}

function tokenizeStructuredQuery(message: string, moduleHint: string | null): string[] {
  const base = normalizeForBusinessMatch(`${message} ${moduleHint || ''}`);
  if (!base) return [];

  const tokens = base
    .split(' ')
    .map((token) => stripArabicDefiniteArticle(token))
    .map((token) => normalizeText(token))
    .filter((token) => token.length >= 2 && !STRUCTURED_QUERY_STOP_WORDS.has(token));

  return expandStructuredQueryKeywords(tokens).filter(
    (token) => token.length >= 2 && !STRUCTURED_QUERY_STOP_WORDS.has(token),
  );
}

function isCountIntent(message: string): boolean {
  const text = normalizeText(message).toLowerCase();
  return /(كم|عدد|how many|count|total)/.test(text);
}

function isTextLikeColumn(columnName: string, dataType: string | null): boolean {
  const type = normalizeText(dataType).toLowerCase();
  if (type.includes('character') || type.includes('text')) return true;
  return /(name|code|number|status|type|category|title|description|note|batch|material|supplier)/i.test(
    columnName,
  );
}

function pickPreferredOrderColumn(columns: string[]): string | null {
  const priority = [
    'received_at',
    'updated_at',
    'created_at',
    'date',
    'issued_at',
    'approved_at',
    'completed_at',
  ];

  for (const col of priority) {
    if (columns.includes(col)) return col;
  }
  return null;
}

function normalizeKeywordForScore(keyword: string): string {
  return stripArabicDefiniteArticle(normalizeText(keyword).toLowerCase());
}

function buildGenericStructuredKeywordSet(): Set<string> {
  const genericTerms = new Set<string>([
    'وثيقة',
    'وثائق',
    'مستند',
    'مستندات',
    'مهمة',
    'مهام',
    'تعليق',
    'تعليقات',
    'مورد',
    'موردين',
    'مادة',
    'مواد',
    'خامة',
    'خامات',
    'استلام',
    'استلامات',
    'فحص',
    'اختبار',
    'تشغيل',
    'تشغيلات',
    'تقرير',
    'تقارير',
    'وصفة',
    'وصفات',
    'منتج',
    'منتجات',
    'دردشة',
    'محادثة',
    'محادثات',
    'رسالة',
    'رسائل',
    'إصدار',
    'اصدار',
    'إصدارات',
    'اصدارات',
    'معيار',
    'معايير',
    'document',
    'documents',
    'doc',
    'docs',
    'task',
    'tasks',
    'comment',
    'comments',
    'supplier',
    'suppliers',
    'material',
    'materials',
    'receiving',
    'receipt',
    'test',
    'tests',
    'run',
    'runs',
    'report',
    'reports',
    'recipe',
    'recipes',
    'product',
    'products',
    'chat',
    'conversation',
    'conversations',
    'message',
    'messages',
    'version',
    'versions',
    'inspection',
    'criteria',
  ]);

  Object.values(TABLE_KEYWORD_HINTS)
    .flat()
    .map(normalizeKeywordForScore)
    .filter(Boolean)
    .forEach((term) => genericTerms.add(term));

  return genericTerms;
}

const GENERIC_STRUCTURED_KEYWORDS = buildGenericStructuredKeywordSet();

function isGenericStructuredKeyword(keyword: string): boolean {
  const normalized = normalizeKeywordForScore(keyword);
  return normalized ? GENERIC_STRUCTURED_KEYWORDS.has(normalized) : false;
}

function scoreTableForKeywords(tableName: string, keywords: string[]): number {
  const normalizedTable = tableName.toLowerCase();
  const tableParts = normalizedTable.split('_');
  const hints = (TABLE_KEYWORD_HINTS[tableName] || []).map(normalizeKeywordForScore);

  let score = 0;
  for (const rawKeyword of keywords) {
    const keyword = normalizeKeywordForScore(rawKeyword);
    if (!keyword) continue;

    if (normalizedTable.includes(keyword)) score += 5;
    if (tableParts.some((part) => part.includes(keyword))) score += 3;
    if (hints.some((hint) => hint.includes(keyword) || keyword.includes(hint))) score += 6;
  }

  return score;
}

function rankSafeTablesForQuery(
  catalog: SafeCatalog,
  message: string,
  moduleHint: string | null,
): SafeTableMetadata[] {
  const keywords = tokenizeStructuredQuery(message, moduleHint);
  const entries = Object.values(catalog);
  if (entries.length === 0) return [];

  const ranked = entries
    .map((table) => ({ table, score: scoreTableForKeywords(table.tableName, keywords) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.table);

  if (ranked.length === 0) return [];

  if (ranked.every((table) => scoreTableForKeywords(table.tableName, keywords) === 0)) {
    const hint = normalizeText(moduleHint).toLowerCase();
    if (hint.includes('lab')) {
      return [
        ...(catalog.material_receiving ? [catalog.material_receiving] : []),
        ...(catalog.raw_materials ? [catalog.raw_materials] : []),
        ...(catalog.suppliers ? [catalog.suppliers] : []),
        ...ranked.filter(
          (item) =>
            item.tableName !== 'material_receiving' &&
            item.tableName !== 'raw_materials' &&
            item.tableName !== 'suppliers',
        ),
      ];
    }
  }

  return ranked;
}

function pickDisplayColumns(metadata: SafeTableMetadata): string[] {
  if (metadata.columns.length === 0) {
    return [];
  }

  const priority = [
    'name',
    'code',
    'number',
    'title',
    'material_name',
    'supplier_name',
    'batch_number',
    'status',
    'quantity',
    'unit',
    'received_at',
    'created_at',
    'updated_at',
  ];

  const columns: string[] = [];
  for (const col of priority) {
    if (metadata.columns.includes(col) && !columns.includes(col)) {
      columns.push(col);
    }
  }

  for (const col of metadata.columns) {
    if (!columns.includes(col) && !isBlockedColumnName(col)) {
      columns.push(col);
    }
    if (columns.length >= 10) break;
  }

  if (columns.length === 0) {
    return metadata.columns.slice(0, 8);
  }
  return columns.slice(0, 10);
}

function pickCountColumn(metadata: SafeTableMetadata): string {
  if (metadata.columns.includes('id')) return 'id';
  return metadata.columns[0] || '*';
}

function rowMatchesStructuredKeywords(row: Record<string, unknown>, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = normalizeForBusinessMatch(
    Object.values(row)
      .map((value) => (value == null ? '' : String(value)))
      .join(' '),
  );
  if (!haystack) return false;
  return keywords.some((keyword) => haystack.includes(normalizeKeywordForScore(keyword)));
}

function formatStructuredCell(value: unknown, locale: string): string {
  if (value == null) return '-';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '-';

    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime()) && /[tT]/.test(text)) {
      return formatDateTimeForLocale(text, locale);
    }

    return truncate(text, 80);
  }

  try {
    return truncate(JSON.stringify(value), 80);
  } catch {
    return '-';
  }
}

function prettifyTableName(tableName: string, locale: string): string {
  if (!locale.startsWith('ar')) return tableName;

  const map: Record<string, string> = {
    material_receiving: 'استلام المواد',
    raw_materials: 'المواد الخام',
    raw_material_suppliers: 'ربط المواد بالموردين',
    suppliers: 'الموردون',
    lab_tests: 'اختبارات المختبر',
    lab_v2_tests: 'فحوصات المختبر V2',
    lab_v2_test_runs: 'تشغيلات الفحوصات',
    ncr_reports_v2: 'تقارير عدم المطابقة',
    tasks: 'المهام',
    products: 'المنتجات',
    recipes: 'الوصفات',
    recipe_versions: 'إصدارات الوصفات',
  };

  return map[tableName] || tableName;
}

function buildStructuredRowsReply(
  tableName: string,
  columns: string[],
  rows: Record<string, unknown>[],
  locale: string,
): string {
  const tableLabel = prettifyTableName(tableName, locale);
  if (rows.length === 0) {
    return locale.startsWith('ar')
      ? `لا توجد نتائج مطابقة في جدول ${tableLabel}.`
      : `No matching rows were found in ${tableLabel}.`;
  }

  const lines = rows.slice(0, 5).map((row, index) => {
    const parts = columns
      .slice(0, 6)
      .map((col) => `${col}: ${formatStructuredCell(row[col], locale)}`)
      .join(' | ');
    return `${index + 1}. ${parts}`;
  });

  return locale.startsWith('ar')
    ? [`نتائج من جدول ${tableLabel}:`, ...lines].join('\n')
    : [`Results from ${tableLabel}:`, ...lines].join('\n');
}

async function loadSafeCatalog(adminClient: ReturnType<typeof createClient>): Promise<SafeCatalog> {
  const now = Date.now();
  if (safeCatalogCache && safeCatalogCache.expiresAt > now) {
    return safeCatalogCache.catalog;
  }

  const { data: tablesRows, error: tablesError } = await adminClient
    .schema('information_schema')
    .from('tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (tablesError) {
    console.error('[ai-assistant] loadSafeCatalog tables failed', tablesError);
    safeCatalogCache = { catalog: STATIC_SAFE_CATALOG, expiresAt: now + SAFE_CATALOG_TTL_MS };
    return STATIC_SAFE_CATALOG;
  }

  const tableNames = ((tablesRows || []) as Array<{ table_name: string }>)
    .map((row) => normalizeText(row.table_name))
    .filter((name) => name && !isBlockedTableName(name));

  if (tableNames.length === 0) {
    safeCatalogCache = { catalog: STATIC_SAFE_CATALOG, expiresAt: now + SAFE_CATALOG_TTL_MS };
    return STATIC_SAFE_CATALOG;
  }

  const { data: columnsRows, error: columnsError } = await adminClient
    .schema('information_schema')
    .from('columns')
    .select('table_name, column_name, data_type')
    .eq('table_schema', 'public');

  if (columnsError) {
    console.error('[ai-assistant] loadSafeCatalog columns failed', columnsError);
    safeCatalogCache = { catalog: STATIC_SAFE_CATALOG, expiresAt: now + SAFE_CATALOG_TTL_MS };
    return STATIC_SAFE_CATALOG;
  }

  const grouped = new Map<string, SafeTableMetadataRow[]>();
  const tableNameSet = new Set(tableNames);
  ((columnsRows || []) as SafeTableMetadataRow[]).forEach((row) => {
    const tableName = normalizeText(row.table_name);
    const columnName = normalizeText(row.column_name);
    if (!tableName || !columnName) return;
    if (!tableNameSet.has(tableName)) return;
    if (isBlockedColumnName(columnName)) return;

    const bucket = grouped.get(tableName) || [];
    bucket.push(row);
    grouped.set(tableName, bucket);
  });

  const catalog: SafeCatalog = {};
  grouped.forEach((rows, tableName) => {
    const columns = rows
      .map((row) => normalizeText(row.column_name))
      .filter(Boolean);

    if (columns.length === 0) return;

    const searchableColumns = rows
      .filter((row) => isTextLikeColumn(row.column_name, row.data_type))
      .map((row) => normalizeText(row.column_name))
      .filter((col) => !['id', 'company_id'].includes(col))
      .slice(0, 8);

    catalog[tableName] = {
      tableName,
      columns,
      searchableColumns,
      hasCompanyId: columns.includes('company_id'),
      preferredOrderColumn: pickPreferredOrderColumn(columns),
    };
  });

  const mergedCatalog: SafeCatalog = { ...STATIC_SAFE_CATALOG, ...catalog };
  safeCatalogCache = { catalog: mergedCatalog, expiresAt: now + SAFE_CATALOG_TTL_MS };
  return mergedCatalog;
}

async function tryHandleStructuredDataQuery(params: {
  adminClient: ReturnType<typeof createClient>;
  userClient: ReturnType<typeof createClient>;
  companyId: string;
  locale: string;
  message: string;
  moduleHint: string | null;
  hasModulePermission: (moduleCode: string, action: string) => Promise<boolean>;
}): Promise<StructuredDataQueryResult | null> {
  const catalog = await loadSafeCatalog(params.adminClient);
  const rankedTables = rankSafeTablesForQuery(catalog, params.message, params.moduleHint).slice(0, 10);
  if (rankedTables.length === 0) return null;

  const permissionCache = new Map<string, boolean>();
  const allowedTables: SafeTableMetadata[] = [];

  for (const table of rankedTables) {
    const rule = getSafeTablePermissionRule(table.tableName);
    if (!rule) continue;
    const permissionKey = `${rule.moduleCode}:${rule.requiredAction}`;
    let allowed = permissionCache.get(permissionKey);
    if (allowed === undefined) {
      allowed = await params.hasModulePermission(rule.moduleCode, rule.requiredAction);
      permissionCache.set(permissionKey, allowed);
    }
    if (allowed) {
      allowedTables.push(table);
    }
  }

  if (allowedTables.length === 0) return null;

  const keywords = tokenizeStructuredQuery(params.message, params.moduleHint);
  const searchTerm = keywords.find((item) => item.length >= 3 && !isGenericStructuredKeyword(item)) || '';
  const safeSearchTerm = escapeLikeTerm(searchTerm);
  const isCount = isCountIntent(params.message);
  const wideList = looksLikeWideListIntent(params.message);
  const pageSize = wideList ? 25 : 10;
  const previewLimit = wideList ? 12 : 5;

  if (isCount) {
    for (const table of allowedTables) {
      const countColumn = pickCountColumn(table);
      let query = params.userClient
        .from(table.tableName)
        .select(countColumn, { count: 'exact', head: true })
        .limit(1);

      if (table.hasCompanyId) {
        query = query.eq('company_id', params.companyId);
      }

      if (safeSearchTerm && table.searchableColumns.length > 0) {
        const clause = table.searchableColumns
          .slice(0, 4)
          .map((col) => `${col}.ilike.%${safeSearchTerm}%`)
          .join(',');
        query = query.or(clause);
      }

      const { count, error } = await query;
      if (error) {
        console.error('[ai-assistant] structured count query failed', {
          table: table.tableName,
          error,
        });
        continue;
      }

      const countValue = count ?? 0;
      const reply = params.locale.startsWith('ar')
        ? `عدد السجلات في ${prettifyTableName(table.tableName, params.locale)}: ${countValue}`
        : `Count in ${prettifyTableName(table.tableName, params.locale)}: ${countValue}`;

      return {
        reply,
        toolTag: buildAiReadToolTag('safe_query.structured', `count.${table.tableName}`),
        capability: 'safe_query.structured',
        entityRefs: [],
        pageInfo: {
          page_size: pageSize,
          returned_count: countValue,
          has_more: false,
          next_cursor: null,
          scanned_tables: [table.tableName],
        },
        truncated: false,
      };
    }

    return null;
  }

  for (const table of allowedTables) {
    const displayColumns = pickDisplayColumns(table);
    const selectClause = displayColumns.length > 0 ? displayColumns.join(',') : '*';
    let query = params.userClient.from(table.tableName).select(selectClause).limit(pageSize + 1);

    if (table.hasCompanyId) {
      query = query.eq('company_id', params.companyId);
    }

    if (safeSearchTerm && table.searchableColumns.length > 0) {
      const clause = table.searchableColumns
        .slice(0, 4)
        .map((col) => `${col}.ilike.%${safeSearchTerm}%`)
        .join(',');
      query = query.or(clause);
    }

    if (table.preferredOrderColumn) {
      query = query.order(table.preferredOrderColumn, { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[ai-assistant] structured rows query failed', {
        table: table.tableName,
        error,
      });
      continue;
    }

    let rows = (data || []) as Array<Record<string, unknown>>;
    if (keywords.length > 0) {
      rows = rows.filter((row) => rowMatchesStructuredKeywords(row, keywords));
    }

    if (rows.length === 0) {
      continue;
    }

    const hasMore = rows.length > pageSize;
    const visibleRows = rows.slice(0, pageSize);
    const previewRows = visibleRows.slice(0, previewLimit);
    const responseColumns =
      displayColumns.length > 0
        ? displayColumns
        : Object.keys(previewRows[0] || {})
            .filter((col) => !isBlockedColumnName(col))
            .slice(0, 6);

    if (responseColumns.length === 0) {
      continue;
    }

    const lastVisibleRow = visibleRows[visibleRows.length - 1] || null;
    const nextCursor = lastVisibleRow
      ? normalizeText(
          String(
            lastVisibleRow[table.preferredOrderColumn || 'id'] ??
            lastVisibleRow.id ??
            '',
          ),
        ) || null
      : null;

    return {
      reply: buildStructuredRowsReply(table.tableName, responseColumns, previewRows, params.locale),
      toolTag: buildAiReadToolTag('safe_query.structured', `rows.${table.tableName}`),
      capability: 'safe_query.structured',
      entityRefs: buildEntityRefsFromRows(table.tableName, previewRows),
      pageInfo: {
        page_size: pageSize,
        returned_count: previewRows.length,
        has_more: hasMore,
        next_cursor: nextCursor,
        scanned_tables: [table.tableName],
      },
      truncated: hasMore || visibleRows.length > previewLimit,
    };
  }

  return null;
}

function detectReadTool(message: string, moduleHint: string | null): AiReadToolName | null {
  if (isSuppliersForMaterialIntent(message, moduleHint)) return 'raw_material_suppliers.approved';
  if (isLatestLabReceivingIntent(message, moduleHint)) return 'material_receiving.latest';
  if (isMyOpenTasksIntent(message, moduleHint)) return 'tasks.my_open';
  if (isTaskActivityIntent(message, moduleHint)) return 'tasks.activity';
  if (isTaskLookupIntent(message, moduleHint)) return 'tasks.lookup';
  if (isNcrLookupIntent(message, moduleHint)) return 'ncr.lookup';
  if (isDocumentVersionsIntent(message, moduleHint)) return 'documents.versions';
  if (isDocumentSearchIntent(message, moduleHint)) return 'documents.search';
  if (isLabV2RunDetailsIntent(message, moduleHint)) return 'lab_v2.run_details';
  if (isLabV2RunLookupIntent(message, moduleHint)) return 'lab_v2.run_lookup';
  if (isStructuredDataIntent(message, moduleHint) || isGenericBusinessReadIntent(message, moduleHint)) {
    return 'safe_query.structured';
  }
  return null;
}

async function executeReadTool(params: {
  userClient: ReturnType<typeof createClient>;
  adminClient: ReturnType<typeof createClient>;
  companyId: string;
  userId: string;
  locale: string;
  message: string;
  moduleHint: string | null;
  hasModulePermission: (moduleCode: string, action: string) => Promise<boolean>;
}): Promise<ExecutedReadToolResult | null> {
  const toolName = detectReadTool(params.message, params.moduleHint);
  if (!toolName) return null;

  const tool = getAiReadToolDefinition(toolName);

  if (tool.name === 'raw_material_suppliers.approved') {
    if (!(await params.hasModulePermission('master_data', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض الموردين والبيانات الرئيسية عبر المساعد الذكي.'
          : 'You are not authorized to view master data through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    const materialTerm = extractMaterialNameFromApprovedSuppliersQuery(params.message);
    if (!materialTerm) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لم أتمكن من تحديد اسم المادة. اكتب الطلب بهذا الشكل: "ما هم الموردين المعتمدين لمادة الفركتوز؟".'
          : 'I could not identify the material name. Please ask like: "approved suppliers for fructose".',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'missing_material_term'),
        grounded: true,
      };
    }

    try {
      let materialRow = await loadRawMaterialByTerm(params.userClient, params.companyId, materialTerm);
      let receivingMatchedName = '';

      if (!materialRow) {
        const receivingMatch = await loadMaterialFromReceivingByTerm(params.userClient, params.companyId, materialTerm);
        receivingMatchedName = normalizeText(receivingMatch?.material_name);

        const receivingRawMaterialId = normalizeText(receivingMatch?.raw_material_id);
        if (receivingRawMaterialId) {
          materialRow = await loadRawMaterialById(params.userClient, params.companyId, receivingRawMaterialId);
        }

        if (!materialRow) {
          return {
            reply: receivingMatch
              ? params.locale.startsWith('ar')
                ? `وجدت المادة في سجلات الاستلام باسم "${receivingMatchedName || materialTerm}" لكنها غير مربوطة بمادة خام معرفة، لذلك لا أستطيع تحديد الموردين المعتمدين بدقة.`
                : `Material "${receivingMatchedName || materialTerm}" was found in receiving logs but is not linked to a defined raw material, so approved suppliers cannot be determined reliably.`
              : params.locale.startsWith('ar')
                ? `لا أجد مادة مطابقة للاسم: ${materialTerm}.`
                : `No material matched: ${materialTerm}.`,
            toolName: tool.name,
            toolTag: buildAiReadToolTag(tool.name, receivingMatch ? 'unlinked_material' : 'not_found'),
            grounded: true,
          };
        }
      }

      const suppliers = await loadApprovedSuppliersForRawMaterial(params.userClient, params.companyId, materialRow.id);
      return {
        reply: buildApprovedSuppliersReply(
          normalizeText(materialRow.name) || receivingMatchedName || materialTerm,
          suppliers,
          params.locale,
        ),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'rows'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل الموردين المعتمدين حالياً من قاعدة البيانات.'
          : 'Failed to load approved suppliers from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'material_receiving.latest') {
    if (!(await params.hasModulePermission('lab', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض بيانات استلام المختبر عبر المساعد الذكي.'
          : 'You are not authorized to view lab receiving data through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const latestReceiving = await loadLatestMaterialReceiving(params.userClient, params.companyId);
      return {
        reply: buildLatestMaterialReceivingReply(latestReceiving, params.locale),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'row'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل آخر استلام في المختبر حالياً. حاول مرة أخرى.'
          : 'Failed to load the latest lab receiving right now. Please try again.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'tasks.my_open') {
    if (!(await params.hasModulePermission('tasks', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض بيانات المهام عبر المساعد الذكي.'
          : 'You are not authorized to view task data through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const overdueOnly = taskIntentWantsOverdueOnly(params.message);
      const tasks = await loadMyOpenTasks(params.userClient, params.companyId, params.userId, overdueOnly);
      return {
        reply: buildMyOpenTasksReply(tasks, params.locale, overdueOnly),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, overdueOnly ? 'overdue' : 'open'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل المهام الحالية من قاعدة البيانات.'
          : 'Failed to load current tasks from the database.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'tasks.activity') {
    if (!(await params.hasModulePermission('tasks', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض نشاط المهام عبر المساعد الذكي.'
          : 'You are not authorized to view task activity through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const identifier = extractTaskIdentifierFromQuery(params.message);
      const useIdentifierLookup = Boolean(identifier) && !taskLookupWantsLatest(params.message);
      const taskRow = useIdentifierLookup
        ? await loadTaskByIdentifier(params.userClient, params.companyId, params.userId, identifier)
        : await loadLatestAccessibleTask(params.userClient, params.companyId, params.userId);

      const comments = taskRow
        ? await loadTaskComments(params.userClient, taskRow.id, 6)
        : [];
      const history = taskRow
        ? await loadTaskHistoryEntries(params.userClient, taskRow.id, 8)
        : [];

      return {
        reply: buildTaskActivityReply(taskRow, comments, history, params.locale, useIdentifierLookup ? identifier : ''),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, useIdentifierLookup ? 'lookup' : 'latest'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل نشاط المهمة حالياً من قاعدة البيانات.'
          : 'Failed to load task activity from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'tasks.lookup') {
    if (!(await params.hasModulePermission('tasks', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض تفاصيل المهام عبر المساعد الذكي.'
          : 'You are not authorized to view task details through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const identifier = extractTaskIdentifierFromQuery(params.message);
      const useIdentifierLookup = Boolean(identifier) && !taskLookupWantsLatest(params.message);
      const taskRow = useIdentifierLookup
        ? await loadTaskByIdentifier(params.userClient, params.companyId, params.userId, identifier)
        : await loadLatestAccessibleTask(params.userClient, params.companyId, params.userId);

      return {
        reply: buildTaskLookupReply(taskRow, params.locale, useIdentifierLookup ? identifier : ''),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, useIdentifierLookup ? 'lookup' : 'latest'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل تفاصيل المهمة حالياً من قاعدة البيانات.'
          : 'Failed to load task details from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'ncr.lookup') {
    if (!(await params.hasModulePermission('ncr', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض بيانات NCR عبر المساعد الذكي.'
          : 'You are not authorized to view NCR data through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const identifier = extractNcrIdentifierFromQuery(params.message);
      const useIdentifierLookup = Boolean(identifier) && !ncrIntentWantsLatest(params.message);
      const ncrRow = useIdentifierLookup
        ? await loadNcrByIdentifier(params.userClient, params.companyId, identifier)
        : await loadLatestNcr(params.userClient, params.companyId);

      return {
        reply: buildNcrReply(ncrRow, params.locale, useIdentifierLookup ? identifier : ''),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, useIdentifierLookup ? 'lookup' : 'latest'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل بيانات NCR حالياً من قاعدة البيانات.'
          : 'Failed to load NCR data from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'documents.versions') {
    if (!(await params.hasModulePermission('documents', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض إصدارات الوثائق عبر المساعد الذكي.'
          : 'You are not authorized to view document versions through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const latestOnly = documentIntentWantsLatest(params.message) || !extractDocumentSearchTerm(params.message);
      const approvedOnly = documentIntentWantsApprovedOnly(params.message);
      const searchTerm = extractDocumentSearchTerm(params.message);
      const canViewAllDocuments = await params.hasModulePermission('documents', 'view_all_documents');
      const documents = await loadVisibleDocuments(
        params.userClient,
        params.companyId,
        params.userId,
        searchTerm,
        latestOnly,
        canViewAllDocuments,
        approvedOnly,
      );
      const documentRow = documents[0] || null;
      const versions = documentRow
        ? await loadDocumentVersions(params.userClient, params.companyId, documentRow.id, 6)
        : [];

      return {
        reply: buildDocumentVersionsReply(documentRow, versions, params.locale, searchTerm),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, documentRow ? 'rows' : 'not_found'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل إصدارات الوثيقة حالياً من قاعدة البيانات.'
          : 'Failed to load document versions from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'documents.search') {
    if (!(await params.hasModulePermission('documents', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض الوثائق عبر المساعد الذكي.'
          : 'You are not authorized to view documents through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    const latestOnly = documentIntentWantsLatest(params.message);
    const approvedOnly = documentIntentWantsApprovedOnly(params.message);
    const detailOnly = documentIntentWantsDetail(params.message);
    const searchTerm = extractDocumentSearchTerm(params.message);

    if (detailOnly && !latestOnly && !searchTerm) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لم أتمكن من تحديد اسم الوثيقة أو رقمها. اكتب مثلاً: "ابحث عن وثيقة سياسة الجودة" أو "اعرض آخر وثيقة معتمدة".'
          : 'I could not identify the document title or number. Try: "search for quality policy document" or "show latest approved document".',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'missing_search_term'),
        grounded: true,
      };
    }

    try {
      const canViewAllDocuments = await params.hasModulePermission('documents', 'view_all_documents');
      const documents = await loadVisibleDocuments(
        params.userClient,
        params.companyId,
        params.userId,
        searchTerm,
        latestOnly,
        canViewAllDocuments,
        approvedOnly,
      );

      return {
        reply: buildDocumentsReply(documents, params.locale, latestOnly, searchTerm, approvedOnly, detailOnly),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(
          tool.name,
          latestOnly
            ? approvedOnly ? 'latest_approved' : 'latest'
            : detailOnly
              ? 'detail'
              : !searchTerm
                ? approvedOnly
                  ? 'approved_list'
                  : 'list'
              : approvedOnly
                ? 'approved_search'
                : 'search',
        ),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل الوثائق حالياً من قاعدة البيانات.'
          : 'Failed to load documents from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'lab_v2.run_details') {
    if (!(await params.hasModulePermission('lab', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض تفاصيل تشغيلات المختبر عبر المساعد الذكي.'
          : 'You are not authorized to view lab run details through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const identifier = extractLabRunIdentifierFromQuery(params.message);
      const useIdentifierLookup = Boolean(identifier) && !labV2RunIntentWantsLatest(params.message);
      const runLookupRow = useIdentifierLookup
        ? await loadLabV2RunByIdentifier(params.userClient, params.companyId, identifier)
        : await loadLatestLabV2Run(params.userClient, params.companyId);
      const detailRow = runLookupRow
        ? await loadLabV2RunDetailById(params.userClient, params.companyId, runLookupRow.id)
        : null;
      const testsById = await loadLabV2RunTestsByIds(
        params.userClient,
        detailRow?.test_id ? [detailRow.test_id] : [],
      );
      const testInfo = detailRow?.test_id ? testsById.get(normalizeText(detailRow.test_id)) || null : null;

      const receiptIds = [
        ...((detailRow?.materials || []) as LabV2RunMaterialLookupRow[]).map((item) => normalizeText(item.chemical_receipt_id)),
        ...((detailRow?.material_selections || []) as LabV2RunMaterialSelectionLookupRow[]).map((item) => normalizeText(item.chemical_receipt_id)),
      ].filter(Boolean);
      const receiptsById = await loadLabV2ChemicalReceiptsByIds(params.userClient, receiptIds);
      const chemicalIds = [
        ...((detailRow?.material_selections || []) as LabV2RunMaterialSelectionLookupRow[]).map((item) => normalizeText(item.chemical_id)),
        ...Array.from(receiptsById.values()).map((item) => normalizeText(item.chemical_id)),
      ].filter(Boolean);
      const chemicalsById = await loadLabV2ChemicalsByIds(params.userClient, chemicalIds);

      return {
        reply: buildLabV2RunDetailsReply(
          detailRow,
          testInfo,
          receiptsById,
          chemicalsById,
          params.locale,
          useIdentifierLookup ? identifier : '',
        ),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, useIdentifierLookup ? 'lookup' : 'latest'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل تفاصيل تشغيل المختبر حالياً من قاعدة البيانات.'
          : 'Failed to load detailed lab run data from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  if (tool.name === 'lab_v2.run_lookup') {
    if (!(await params.hasModulePermission('lab', 'view'))) {
      return {
        reply: params.locale.startsWith('ar')
          ? 'لا تملك صلاحية عرض تشغيلات المختبر عبر المساعد الذكي.'
          : 'You are not authorized to view lab runs through the AI assistant.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'forbidden'),
        grounded: true,
      };
    }

    try {
      const identifier = extractLabRunIdentifierFromQuery(params.message);
      const useIdentifierLookup = Boolean(identifier) && !labV2RunIntentWantsLatest(params.message);
      const runRow = useIdentifierLookup
        ? await loadLabV2RunByIdentifier(params.userClient, params.companyId, identifier)
        : await loadLatestLabV2Run(params.userClient, params.companyId);
      const testsById = await loadLabV2RunTestsByIds(
        params.userClient,
        runRow?.test_id ? [runRow.test_id] : [],
      );
      const testInfo = runRow?.test_id ? testsById.get(normalizeText(runRow.test_id)) || null : null;

      return {
        reply: buildLabV2RunReply(runRow, testInfo, params.locale, useIdentifierLookup ? identifier : ''),
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, useIdentifierLookup ? 'lookup' : 'latest'),
        grounded: true,
      };
    } catch (error) {
      console.error('[ai-assistant] read tool failed', { tool: tool.name, error });
      return {
        reply: params.locale.startsWith('ar')
          ? 'تعذر تحميل تشغيلات المختبر حالياً من قاعدة البيانات.'
          : 'Failed to load lab runs from the database right now.',
        toolName: tool.name,
        toolTag: buildAiReadToolTag(tool.name, 'error'),
        grounded: true,
      };
    }
  }

  const structuredResult = await tryHandleStructuredDataQuery({
    adminClient: params.adminClient,
    userClient: params.userClient,
    companyId: params.companyId,
    locale: params.locale,
    message: params.message,
    moduleHint: params.moduleHint,
    hasModulePermission: params.hasModulePermission,
  });

  if (structuredResult) {
    return {
      reply: structuredResult.reply,
      toolName: tool.name,
      toolTag: structuredResult.toolTag,
      grounded: true,
      capability: structuredResult.capability,
      entityRefs: structuredResult.entityRefs,
      pageInfo: structuredResult.pageInfo,
      truncated: structuredResult.truncated,
    };
  }

  return {
    reply: buildUnsupportedStructuredDataReply(params.locale),
    toolName: tool.name,
    toolTag: buildAiReadToolTag(tool.name, 'unsupported'),
    grounded: true,
    capability: tool.name,
    entityRefs: [],
    pageInfo: null,
    truncated: false,
  };
}

function buildAssistantSystemPrompt(locale: string): string {
  return locale.startsWith('ar')
    ? 'أنت مساعد ذكي داخل نظام إدارة الجودة. أجب بالعربية بشكل واضح ومختصر. لا تدّعِ تنفيذ أي تعديل فعلي إلا إذا كانت نتيجة التنفيذ المؤكدة من الأداة أمامك. إذا كان السؤال يحتاج بيانات من النظام ولم تكن لديك نتيجة أداة موثوقة، فقل بوضوح إنك لا تعلم أو لا تستطيع الوصول. لا تخترع سجلات أو أسماء أو أرقام أو موردين.'
    : 'You are an AI assistant inside a quality management system. Keep responses concise and practical. Do not claim to execute write actions unless you have a confirmed execution result from a tool. If a request depends on system data and you do not have a grounded tool result, say clearly that you do not know or cannot access it. Never invent records, names, counts, or suppliers.';
}

async function callOpenAI(params: {
  apiKey: string;
  baseUrl: string;
  provider: AiProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  locale: string;
  history: Array<{ role: string; content: string }>;
}): Promise<{ text: string; usage: Record<string, unknown> | null; model: string }> {
  const systemPrompt = buildAssistantSystemPrompt(params.locale);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...params.history
      .filter((entry) => entry.content && entry.content.trim().length > 0)
      .map((entry) => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: entry.content,
      })),
  ];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (params.provider === 'openrouter') {
    headers['HTTP-Referer'] = normalizeText(Deno.env.get('OPENROUTER_HTTP_REFERER')) || 'https://qms.pages.dev';
    headers['X-Title'] = 'QMS AI Assistant';
  } else if (params.provider === 'google') {
    headers['X-Goog-Api-Client'] = 'qms-ai-assistant/1.0';
  }

  const response = await fetch(buildCompletionsUrl(params.baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = normalizeText(data?.choices?.[0]?.message?.content) || 'تم استلام طلبك. لا توجد إجابة حالياً.';
  const usage = (data?.usage as Record<string, unknown> | undefined) ?? null;
  const model = normalizeText(data?.model) || params.model;

  return { text, usage, model };
}

async function callAnthropic(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  locale: string;
  history: Array<{ role: string; content: string }>;
}): Promise<{ text: string; usage: Record<string, unknown> | null; model: string }> {
  const response = await fetch(buildAnthropicMessagesUrl(params.baseUrl), {
    method: 'POST',
    headers: {
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: buildAssistantSystemPrompt(params.locale),
      messages: params.history
        .filter((entry) => entry.content && entry.content.trim().length > 0)
        .map((entry) => ({
          role: entry.role === 'assistant' ? 'assistant' : 'user',
          content: entry.content,
        })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textBlocks = Array.isArray(data?.content)
    ? data.content
        .filter((block: unknown) => isRecord(block) && normalizeText(block.type) === 'text')
        .map((block: unknown) => normalizeText(isRecord(block) ? block.text : ''))
        .filter(Boolean)
    : [];
  const text = textBlocks.join('\n').trim() || 'تم استلام طلبك. لا توجد إجابة حالياً.';
  const usage = (data?.usage as Record<string, unknown> | undefined) ?? null;
  const model = normalizeText(data?.model) || params.model;

  return { text, usage, model };
}

async function loadAiSettings(adminClient: ReturnType<typeof createClient>, companyId: string, userId: string): Promise<NormalizedAiSettings> {
  const selectColumns =
    'company_id, is_enabled, default_model, temperature, max_tokens, api_provider, api_base_url, api_key_last4, api_key_updated_at';

  const { data: existing, error: existingError } = await adminClient
    .from('ai_settings')
    .select(selectColumns)
    .eq('company_id', companyId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  let row: any = existing;

  if (!row) {
    const { data: inserted, error: insertError } = await adminClient
      .from('ai_settings')
      .insert({
        company_id: companyId,
        updated_by: userId,
        default_model: DEFAULT_MODEL,
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
        api_provider: DEFAULT_PROVIDER,
        api_base_url: defaultBaseUrl(DEFAULT_PROVIDER),
      })
      .select(selectColumns)
      .single();

    if (insertError) {
      throw insertError;
    }

    row = inserted;
  }

  const provider = normalizeProvider(row?.api_provider);
  const baseUrl = normalizeBaseUrl(row?.api_base_url, provider);

  return {
    is_enabled: row?.is_enabled !== false,
    default_model: normalizeText(row?.default_model) || DEFAULT_MODEL,
    temperature: clampNumber(row?.temperature, 0, 2, DEFAULT_TEMPERATURE),
    max_tokens: Math.round(clampNumber(row?.max_tokens, 200, 6000, DEFAULT_MAX_TOKENS)),
    api_provider: provider,
    api_base_url: baseUrl,
    api_key_last4: normalizeText(row?.api_key_last4),
    api_key_updated_at: normalizeText(row?.api_key_updated_at) || null,
  };
}

async function loadStoredApiKey(adminClient: ReturnType<typeof createClient>, companyId: string): Promise<string> {
  const { data, error } = await adminClient
    .from('ai_api_credentials')
    .select('api_key')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[ai-assistant] load ai_api_credentials failed', error);
    return '';
  }

  return normalizeApiKey(data?.api_key);
}

function formatSettingsResponse(settings: NormalizedAiSettings): Record<string, unknown> {
  return {
    is_enabled: settings.is_enabled,
    default_model: settings.default_model,
    temperature: settings.temperature,
    max_tokens: settings.max_tokens,
    api_provider: settings.api_provider,
    api_base_url: settings.api_base_url,
    has_api_key: Boolean(settings.api_key_last4),
    api_key_last4: settings.api_key_last4,
    api_key_updated_at: settings.api_key_updated_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Supabase environment variables are missing.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization token.' }, 401);
  }

  let payload: ChatRequestPayload;
  try {
    payload = (await req.json()) as ChatRequestPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized user.' }, 401);
  }

  const userId = user.id;

  const { data: userRow, error: userRowError } = await adminClient
    .from('users')
    .select('id, company_id, name, department, department_id')
    .eq('id', userId)
    .single();

  if (userRowError) {
    return jsonResponse({ error: 'User company context is missing.' }, 403);
  }

  let companyId = normalizeText(userRow?.company_id);
  const userDisplayName = normalizeText((userRow as { name?: string | null } | null)?.name) || user.email || userId;
  const userDepartmentName = normalizeText((userRow as { department?: string | null } | null)?.department) || null;
  const userDepartmentId = normalizeText((userRow as { department_id?: string | null } | null)?.department_id) || null;

  if (!companyId) {
    const { data: settingsRow } = await adminClient
      .from('settings')
      .select('main_company_id')
      .eq('id', 'global')
      .maybeSingle();

    companyId = normalizeText((settingsRow as { main_company_id?: string } | null)?.main_company_id);
  }

  if (!companyId) {
    const { data: fallbackCompanyId } = await adminClient.rpc('get_user_company_id');
    companyId = normalizeText(fallbackCompanyId);
  }

  if (!companyId) {
    return jsonResponse({ error: 'User company context is missing.' }, 403);
  }

  const hasModulePermission = async (moduleCode: string, action: string): Promise<boolean> => {
    const { data, error } = await adminClient.rpc('check_matrix_permission', {
      p_user_id: userId,
      p_module_code: moduleCode,
      p_action: action,
      p_stage_code: null,
      p_entity_department_id: null,
    });
    if (error) {
      console.error('[ai-assistant] Permission check failed', { moduleCode, action, error });
      return false;
    }
    return Boolean(data);
  };

  const hasPermission = async (action: string): Promise<boolean> =>
    hasModulePermission('ai_assistant', action);

  const { data: isAdminData } = await adminClient.rpc('is_admin_user', { check_user_id: userId });
  const isAdmin = Boolean(isAdminData);

  const requestAction = payload.action || 'chat';

  if (requestAction === 'get_settings') {
    const canViewSettings =
      (await hasPermission('view')) ||
      (await hasPermission('manage_settings')) ||
      (await hasModulePermission('settings', 'view'));

    if (!canViewSettings) {
      return jsonResponse({ error: 'Not authorized for AI assistant settings.' }, 403);
    }

    try {
      const settings = await loadAiSettings(adminClient, companyId, userId);
      return jsonResponse({ settings: formatSettingsResponse(settings) });
    } catch (error) {
      console.error('[ai-assistant] get_settings failed', error);
      return jsonResponse({ error: 'Failed to load AI settings.' }, 500);
    }
  }

  if (requestAction === 'save_settings') {
    if (!(await hasPermission('manage_settings'))) {
      return jsonResponse({ error: 'Missing ai_assistant.manage_settings permission.' }, 403);
    }

    try {
      const currentSettings = await loadAiSettings(adminClient, companyId, userId);
      const input = payload.settings || {};

      const nextProvider = input.api_provider
        ? normalizeProvider(input.api_provider)
        : currentSettings.api_provider;

      const nextSettings = {
        is_enabled: toBoolean(input.is_enabled, currentSettings.is_enabled),
        default_model: normalizeText(input.default_model) || currentSettings.default_model,
        temperature: clampNumber(input.temperature, 0, 2, currentSettings.temperature),
        max_tokens: Math.round(clampNumber(input.max_tokens, 200, 6000, currentSettings.max_tokens)),
        api_provider: nextProvider,
        api_base_url: normalizeBaseUrl(
          input.api_base_url ?? (nextProvider !== currentSettings.api_provider ? '' : currentSettings.api_base_url),
          nextProvider,
        ),
      };

      const nowIso = new Date().toISOString();
      let keyLast4 = currentSettings.api_key_last4;
      let keyUpdatedAt = currentSettings.api_key_updated_at;

      const newApiKey = normalizeApiKey(input.api_key);
      const clearApiKey = input.clear_api_key === true;

      if (nextProvider !== currentSettings.api_provider && currentSettings.api_key_last4 && !clearApiKey && !newApiKey) {
        return jsonResponse(
          { error: 'Provider changed. Please provide a new API key compatible with the selected provider.' },
          400,
        );
      }

      const apiKeyValidationError = validateApiKeyForProvider(nextProvider, newApiKey);
      if (apiKeyValidationError) {
        return jsonResponse({ error: apiKeyValidationError }, 400);
      }

      if (clearApiKey) {
        const { error: deleteCredentialError } = await adminClient
          .from('ai_api_credentials')
          .delete()
          .eq('company_id', companyId);

        if (deleteCredentialError) {
          throw deleteCredentialError;
        }

        keyLast4 = '';
        keyUpdatedAt = nowIso;
      } else if (newApiKey) {
        const { error: upsertCredentialError } = await adminClient
          .from('ai_api_credentials')
          .upsert(
            {
              company_id: companyId,
              api_key: newApiKey,
              updated_by: userId,
            },
            { onConflict: 'company_id' },
          );

        if (upsertCredentialError) {
          throw upsertCredentialError;
        }

        keyLast4 = maskApiKey(newApiKey);
        keyUpdatedAt = nowIso;
      }

      const { error: updateSettingsError } = await adminClient
        .from('ai_settings')
        .upsert(
          {
            company_id: companyId,
            is_enabled: nextSettings.is_enabled,
            default_model: nextSettings.default_model,
            temperature: nextSettings.temperature,
            max_tokens: nextSettings.max_tokens,
            api_provider: nextSettings.api_provider,
            api_base_url: nextSettings.api_base_url,
            api_key_last4: keyLast4 || null,
            api_key_updated_at: keyUpdatedAt,
            updated_by: userId,
          },
          { onConflict: 'company_id' },
        );

      if (updateSettingsError) {
        throw updateSettingsError;
      }

      const savedSettings = await loadAiSettings(adminClient, companyId, userId);
      return jsonResponse({ settings: formatSettingsResponse(savedSettings) });
    } catch (error) {
      console.error('[ai-assistant] save_settings failed', error);
      return jsonResponse({ error: 'Failed to save AI settings.' }, 500);
    }
  }

  if (requestAction === 'execute') {
    let proposalId = normalizeText(payload.proposalId);
    const confirmationToken = normalizeText(payload.confirmationToken);

    if (!proposalId && !confirmationToken) {
      return jsonResponse({ error: 'proposalId or confirmationToken is required.' }, 400);
    }

    if (!(await hasPermission('view'))) {
      return jsonResponse({ error: 'Not authorized for AI assistant.' }, 403);
    }

    let proposalRow: Record<string, unknown> | null = null;
    let proposalError: unknown = null;

    if (proposalId) {
      const directLookup = await adminClient
        .from('ai_action_proposals')
        .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at')
        .eq('id', proposalId)
        .eq('company_id', companyId)
        .single();

      proposalRow = directLookup.data as Record<string, unknown> | null;
      proposalError = directLookup.error;
    } else {
      const fallbackLookup = await adminClient
        .from('ai_action_proposals')
        .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at, created_by')
        .eq('company_id', companyId)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fallbackLookup.error) {
        proposalError = fallbackLookup.error;
      } else {
        const matchedProposal = ((fallbackLookup.data || []) as Array<Record<string, unknown>>)
          .find((row) => normalizeText(String(formatStoredProposal(row).confirmation_token ?? '')) === confirmationToken);

        proposalRow = matchedProposal || null;
        proposalId = normalizeText(String(matchedProposal?.id ?? ''));
      }
    }

    if (proposalError || !proposalRow) {
      return jsonResponse({ error: 'AI action proposal not found.' }, 404);
    }

    const { data: proposalThread, error: proposalThreadError } = await adminClient
      .from('ai_threads')
      .select('id, title, module_hint, last_message_at, created_at, updated_at, created_by')
      .eq('id', proposalRow.thread_id)
      .eq('company_id', companyId)
      .single();

    if (proposalThreadError || !proposalThread) {
      return jsonResponse({ error: 'Proposal thread was not found.' }, 404);
    }

    if (!isAdmin && normalizeText(String(proposalThread.created_by ?? '')) !== userId) {
      return jsonResponse({ error: 'You do not have access to this AI proposal.' }, 403);
    }

    const formattedProposal = formatStoredProposal(proposalRow as Record<string, unknown>);
    const storedConfirmationToken = normalizeText(String(formattedProposal.confirmation_token ?? ''));

    if (confirmationToken && storedConfirmationToken && storedConfirmationToken !== confirmationToken) {
      return jsonResponse({ error: 'Invalid confirmation token.' }, 403);
    }

    if (formattedProposal.status === 'executed') {
      return jsonResponse({ error: 'This proposal has already been executed.' }, 409);
    }

    const riskLevel = normalizeRiskLevel(formattedProposal.risk_level);
    const executePermission = mapExecutionPermissionByRisk(riskLevel);
    if (!(await hasPermission(executePermission))) {
      return jsonResponse({ error: `Missing ai_assistant.${executePermission} permission.` }, 403);
    }

    const nowIso = new Date().toISOString();

    try {
      const execution = await executeCapability({
        proposal: formattedProposal,
        userClient,
        companyId,
        userId,
        userDisplayName,
        userDepartmentName,
        userDepartmentId,
        locale: normalizeText(payload.locale) || 'ar',
        hasModulePermission,
      });

      const executionResult = {
        status: 'success',
        capability: formattedProposal.capability_name,
        entity_refs: execution.entityRefs,
        result_payload: execution.resultPayload,
        executed_at: nowIso,
      };

      const { data: updatedProposalRow, error: updatedProposalError } = await adminClient
        .from('ai_action_proposals')
        .update({
          status: 'executed',
          approved_by: userId,
          approved_at: nowIso,
          executed_at: nowIso,
          execution_result: executionResult,
        })
        .eq('id', proposalId)
        .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at')
        .single();

      if (updatedProposalError || !updatedProposalRow) {
        throw updatedProposalError || new Error('Failed to persist updated proposal state.');
      }

      const updatedProposal = formatStoredProposal(updatedProposalRow as Record<string, unknown>);

      if (updatedProposal.message_id) {
        const { data: sourceMessage } = await adminClient
          .from('ai_messages')
          .select('id, metadata')
          .eq('id', updatedProposal.message_id)
          .maybeSingle();

        if (sourceMessage?.id) {
          await adminClient
            .from('ai_messages')
            .update({
              metadata: upsertProposalInMetadata(sourceMessage.metadata, updatedProposal),
            })
            .eq('id', sourceMessage.id);
        }
      }

      const assistantExecutionMetadata = {
        mode: 'execute',
        tool_kind: 'write',
        grounded: true,
        capability: updatedProposal.capability_name,
        entity_refs: execution.entityRefs,
        execution: executionResult,
      };

      const { data: assistantMessage, error: assistantMessageError } = await adminClient
        .from('ai_messages')
        .insert({
          company_id: companyId,
          thread_id: proposalThread.id,
          role: 'assistant',
          content: execution.summary,
          created_by: userId,
          metadata: assistantExecutionMetadata,
        })
        .select('id, thread_id, role, content, created_at, created_by, metadata')
        .single();

      if (assistantMessageError || !assistantMessage) {
        throw assistantMessageError || new Error('Failed to store execution message.');
      }

      const { error: executionLogError } = await adminClient
        .from('ai_action_executions')
        .insert({
          company_id: companyId,
          proposal_id: proposalId,
          executed_by: userId,
          status: 'success',
          result_summary: execution.summary,
          result_payload: execution.resultPayload,
        });

      if (executionLogError) {
        console.error('[ai-assistant] execution log insert failed', executionLogError);
      }

      await adminClient
        .from('ai_threads')
        .update({ last_message_at: nowIso })
        .eq('id', proposalThread.id);

      return jsonResponse({
        mode: 'execute',
        thread: proposalThread,
        proposal: updatedProposal,
        assistant_message: assistantMessage,
        result_summary: execution.summary,
        result_payload: execution.resultPayload,
      });
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : String(error);
      const failureResult = {
        status: 'failed',
        capability: formattedProposal.capability_name,
        error: failureMessage,
        executed_at: nowIso,
      };

      const { data: failedProposalRow } = await adminClient
        .from('ai_action_proposals')
        .update({
          status: 'error',
          approved_by: userId,
          approved_at: nowIso,
          execution_result: failureResult,
        })
        .eq('id', proposalId)
        .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at')
        .single();

      const failedProposal = failedProposalRow
        ? formatStoredProposal(failedProposalRow as Record<string, unknown>)
        : formattedProposal;

      if (failedProposal.message_id) {
        const { data: sourceMessage } = await adminClient
          .from('ai_messages')
          .select('id, metadata')
          .eq('id', failedProposal.message_id)
          .maybeSingle();

        if (sourceMessage?.id) {
          await adminClient
            .from('ai_messages')
            .update({
              metadata: upsertProposalInMetadata(sourceMessage.metadata, failedProposal),
            })
            .eq('id', sourceMessage.id);
        }
      }

      await adminClient
        .from('ai_action_executions')
        .insert({
          company_id: companyId,
          proposal_id: proposalId,
          executed_by: userId,
          status: 'failed',
          result_summary: failureMessage,
          result_payload: { error: failureMessage },
        });

      const { data: failureAssistantMessage } = await adminClient
        .from('ai_messages')
        .insert({
          company_id: companyId,
          thread_id: proposalThread.id,
          role: 'assistant',
          content: failureMessage,
          created_by: userId,
          metadata: {
            mode: 'execute',
            tool_kind: 'write',
            grounded: true,
            capability: failedProposal.capability_name,
            entity_refs: normalizeEntityRefs(failedProposal.entity_refs),
            execution: failureResult,
          },
        })
        .select('id, thread_id, role, content, created_at, created_by, metadata')
        .single();

      await adminClient
        .from('ai_threads')
        .update({ last_message_at: nowIso })
        .eq('id', proposalThread.id);

      return jsonResponse(
        {
          error: failureMessage,
          mode: 'execute',
          thread: proposalThread,
          proposal: failedProposal,
          assistant_message: failureAssistantMessage || null,
          result_summary: failureMessage,
          result_payload: { error: failureMessage },
        },
        400,
      );
    }
  }

  if (requestAction !== 'chat') {
    return jsonResponse({ error: 'Unsupported action.' }, 400);
  }

  if (!(await hasPermission('view'))) {
    return jsonResponse({ error: 'Not authorized for AI assistant.' }, 403);
  }

  if (!(await hasPermission('send_message'))) {
    return jsonResponse({ error: 'Missing ai_assistant.send_message permission.' }, 403);
  }

  const message = normalizeText(payload.message);
  if (!message) {
    return jsonResponse({ error: 'Message is required.' }, 400);
  }

  const locale = normalizeText(payload.locale) || 'ar';
  const moduleHint = normalizeText(payload.moduleHint) || null;
  const detectedReadTool = detectReadTool(message, moduleHint);

  let settings: NormalizedAiSettings;
  try {
    settings = await loadAiSettings(adminClient, companyId, userId);
  } catch (error) {
    console.error('[ai-assistant] load settings for chat failed', error);
    return jsonResponse({ error: 'Failed to load AI settings.' }, 500);
  }

  if (!settings.is_enabled) {
    return jsonResponse({ error: 'AI assistant is disabled for this company.' }, 403);
  }

  const storedApiKey = await loadStoredApiKey(adminClient, companyId);
  const runtimeApiKey = storedApiKey || getFallbackApiKey(settings.api_provider);

  let threadId = normalizeText(payload.threadId);

  if (!threadId) {
    if (!(await hasPermission('create_thread'))) {
      return jsonResponse({ error: 'Missing ai_assistant.create_thread permission.' }, 403);
    }

    const { data: newThread, error: createThreadError } = await adminClient
      .from('ai_threads')
      .insert({
        company_id: companyId,
        created_by: userId,
        title: truncate(message, 72),
        module_hint: moduleHint,
      })
      .select('id')
      .single();

    if (createThreadError || !newThread?.id) {
      console.error('[ai-assistant] create thread failed', createThreadError);
      return jsonResponse({ error: 'Failed to create AI thread.' }, 500);
    }
    threadId = newThread.id as string;
  } else {
    const { data: existingThread, error: threadError } = await adminClient
      .from('ai_threads')
      .select('id, created_by, company_id')
      .eq('id', threadId)
      .eq('company_id', companyId)
      .single();

    if (threadError || !existingThread) {
      return jsonResponse({ error: 'AI thread not found.' }, 404);
    }

    const ownerId = existingThread.created_by as string;
    if (!isAdmin && ownerId !== userId) {
      return jsonResponse({ error: 'You do not have access to this AI thread.' }, 403);
    }
  }

  const { data: insertedUserMessage, error: insertUserMessageError } = await adminClient
    .from('ai_messages')
    .insert({
      company_id: companyId,
      thread_id: threadId,
      role: 'user',
      content: message,
      created_by: userId,
      metadata: { source: 'chat', locale, module_hint: moduleHint },
    })
    .select('id, thread_id, role, content, created_at, created_by, metadata')
    .single();

  if (insertUserMessageError || !insertedUserMessage) {
    console.error('[ai-assistant] insert user message failed', insertUserMessageError);
    return jsonResponse({ error: 'Failed to store user message.' }, 500);
  }

  const { data: contextRows, error: contextError } = await adminClient
    .from('ai_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(16);

  if (contextError) {
    console.error('[ai-assistant] load context failed', contextError);
  }

  const contextMessages =
    (contextRows || [])
      .slice()
      .reverse()
      .map((row) => ({
        role: String(row.role || 'user'),
        content: String(row.content || ''),
      })) || [];

  const model = settings.default_model;
  const temperature = settings.temperature;
  const maxTokens = settings.max_tokens;
  const modelCandidates = buildModelCandidates(settings.api_provider, model);
  const readToolResult = detectedReadTool
    ? await executeReadTool({
        userClient,
        adminClient,
        companyId,
        userId,
        locale,
        message,
        moduleHint,
        hasModulePermission,
      })
    : null;
  const proposalCandidates = readToolResult ? [] : buildActionProposals(message, moduleHint);

  let assistantText =
    'تم استلام طلبك. سأعتمد على بيانات النظام المتاحة لك، وإذا كان الطلب يتطلب تنفيذًا فسأجهز لك بطاقة تأكيد واضحة.';
  let assistantUsage: Record<string, unknown> | null = null;
  let usedModel = model;
  let aiStatus: 'ok' | 'no_api_key' | 'provider_error' | 'tool_query' = 'ok';
  let aiErrorSummary: string | null = null;

  if (readToolResult) {
    assistantText = readToolResult.reply;
    assistantUsage = null;
    usedModel = readToolResult.toolTag || buildAiReadToolTag(readToolResult.toolName);
    aiStatus = 'tool_query';
  } else if (proposalCandidates.length > 0) {
    assistantText = locale.startsWith('ar')
      ? `جهزت لك ${proposalCandidates.length} إجراء${proposalCandidates.length > 1 ? 'ات' : ''} قابلاً للتنفيذ. راجع بطاقة التأكيد الظاهرة أسفل هذه الرسالة ثم اضغط "تأكيد وتنفيذ" إذا أردت المتابعة.`
      : `I prepared ${proposalCandidates.length} executable action proposal(s). Review the confirmation card below and choose "Confirm & Execute" if you want to continue.`;
    assistantUsage = null;
    usedModel = 'tool:write.proposal';
    aiStatus = 'tool_query';
  } else if (runtimeApiKey) {
    let aiSucceeded = false;
    let lastErrorMessage = '';

    for (const candidateModel of modelCandidates) {
      try {
        const aiResult =
          settings.api_provider === 'anthropic'
            ? await callAnthropic({
                apiKey: runtimeApiKey,
                baseUrl: settings.api_base_url,
                model: candidateModel,
                temperature,
                maxTokens,
                locale,
                history: contextMessages,
              })
            : await callOpenAI({
                apiKey: runtimeApiKey,
                baseUrl: settings.api_base_url,
                provider: settings.api_provider,
                model: candidateModel,
                temperature,
                maxTokens,
                locale,
                history: contextMessages,
              });
        assistantText = aiResult.text;
        assistantUsage = aiResult.usage;
        usedModel = aiResult.model;
        aiSucceeded = true;
        break;
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        lastErrorMessage = messageText;
        console.error('[ai-assistant] AI call failed for model', {
          provider: settings.api_provider,
          model: candidateModel,
          error: messageText,
        });
      }
    }

    if (!aiSucceeded) {
      aiStatus = 'provider_error';
      aiErrorSummary = summarizeAiError(lastErrorMessage, locale);
      assistantText = locale.startsWith('ar')
        ? `تعذر الحصول على رد من مزود الذكاء الاصطناعي حالياً. ${aiErrorSummary} يرجى مراجعة إعدادات AI (المزود/الموديل/المفتاح) من صفحة الإعدادات.`
        : `Unable to fetch a response from the AI provider right now. ${aiErrorSummary} Please review AI settings (provider/model/key).`;
    }
  } else {
    aiStatus = 'no_api_key';
    aiErrorSummary = locale.startsWith('ar')
      ? 'لا يوجد API Key محفوظ أو متاح.'
      : 'No API key is configured.';
    assistantText = locale.startsWith('ar')
      ? 'لا يوجد مفتاح API مفعّل للمساعد الذكي. افتح الإعدادات > الذكاء الاصطناعي وأضف API Key صالح ثم أعد المحاولة.'
      : 'No API key is configured for AI Assistant. Open Settings > AI and add a valid API key.';
  }

  const assistantMetadata = {
    mode: 'propose_only',
    model: usedModel,
    usage: assistantUsage,
    provider: settings.api_provider,
    ai_status: aiStatus,
    ai_error_summary: aiErrorSummary,
    tool_name: readToolResult?.toolName || null,
    tool_kind: readToolResult ? 'read' : proposalCandidates.length > 0 ? 'write' : null,
    grounded: readToolResult?.grounded || proposalCandidates.length > 0,
    capability: readToolResult?.capability || readToolResult?.toolName || proposalCandidates[0]?.capability_name || null,
    entity_refs: readToolResult?.entityRefs || proposalCandidates.flatMap((proposal) => proposal.entity_refs || []),
    page_info: readToolResult?.pageInfo || null,
    truncated: readToolResult?.truncated || false,
    proposals: [] as Array<Record<string, unknown>>,
  };

  const { data: assistantMessage, error: assistantMessageError } = await adminClient
    .from('ai_messages')
    .insert({
      company_id: companyId,
      thread_id: threadId,
      role: 'assistant',
      content: assistantText,
      created_by: userId,
      metadata: assistantMetadata,
    })
    .select('id, thread_id, role, content, created_at, created_by, metadata')
    .single();

  if (assistantMessageError || !assistantMessage) {
    console.error('[ai-assistant] insert assistant message failed', assistantMessageError);
    return jsonResponse({ error: 'Failed to store assistant message.' }, 500);
  }

  let insertedProposals: Array<Record<string, unknown>> = [];
  let assistantMessageRow = assistantMessage as Record<string, unknown>;

  if (proposalCandidates.length > 0) {
    const proposalPayload = proposalCandidates.map((proposal) => ({
      company_id: companyId,
      thread_id: threadId,
      message_id: assistantMessage.id,
      tool_name: proposal.tool_name,
      summary: proposal.summary,
      risk_level: proposal.risk_level,
      status: 'proposed',
      action_payload: proposal.action_payload,
      created_by: userId,
    }));

    const { data: proposalsRows, error: proposalsError } = await adminClient
      .from('ai_action_proposals')
      .insert(proposalPayload)
      .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, execution_result, created_at');

    if (proposalsError) {
      console.error('[ai-assistant] insert proposals failed', proposalsError);
    } else {
      insertedProposals = ((proposalsRows || []) as Array<Record<string, unknown>>).map(formatStoredProposal);

      const { data: refreshedAssistantMessage, error: refreshedAssistantMessageError } = await adminClient
        .from('ai_messages')
        .update({
          metadata: mergeProposalsIntoMetadata(assistantMessage.metadata, insertedProposals),
        })
        .eq('id', assistantMessage.id)
        .select('id, thread_id, role, content, created_at, created_by, metadata')
        .single();

      if (refreshedAssistantMessageError) {
        console.error('[ai-assistant] assistant message metadata refresh failed', refreshedAssistantMessageError);
      } else if (refreshedAssistantMessage) {
        assistantMessageRow = refreshedAssistantMessage as Record<string, unknown>;
      }
    }
  }

  await adminClient
    .from('ai_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId);

  const { data: threadRow } = await adminClient
    .from('ai_threads')
    .select('id, title, module_hint, last_message_at, created_at, updated_at')
    .eq('id', threadId)
    .single();

  return jsonResponse({
    mode: 'propose_only',
    thread: threadRow,
    user_message: insertedUserMessage,
    assistant_message: assistantMessageRow,
    reply: assistantText,
    model: usedModel,
    usage: assistantUsage,
    capability: readToolResult?.capability || readToolResult?.toolName || proposalCandidates[0]?.capability_name || null,
    entity_refs: readToolResult?.entityRefs || proposalCandidates.flatMap((proposal) => proposal.entity_refs || []),
    grounded: readToolResult?.grounded || proposalCandidates.length > 0,
    page_info: readToolResult?.pageInfo || null,
    truncated: readToolResult?.truncated || false,
    proposals: insertedProposals,
  });
});
