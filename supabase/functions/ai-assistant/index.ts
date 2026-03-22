import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type RiskLevel = 'low' | 'medium' | 'high';
type AiProvider = 'openai' | 'openrouter' | 'custom';

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
  summary: string;
  risk_level: RiskLevel;
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

type StructuredDataQueryResult = {
  reply: string;
  toolTag: string;
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
  ncr_reports_v2: ['ncr', 'عدم', 'مطابقة', 'reports'],
  ncr_reports: ['ncr', 'عدم', 'مطابقة', 'reports'],
  tasks: ['مهمة', 'مهام', 'task', 'tasks'],
  products: ['منتج', 'منتجات', 'product', 'products'],
  recipe_versions: ['recipe', 'وصفة', 'وصفات'],
  recipes: ['recipe', 'وصفة', 'وصفات'],
};

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
    searchableColumns: ['title', 'status', 'priority'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
  },
  products: {
    tableName: 'products',
    columns: [],
    searchableColumns: ['name', 'code'],
    hasCompanyId: true,
    preferredOrderColumn: 'updated_at',
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

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function isBlockedTableName(tableName: string): boolean {
  return matchesAnyPattern(tableName, BLOCKED_TABLE_PATTERNS);
}

function isBlockedColumnName(columnName: string): boolean {
  if (columnName === 'company_id') return false;
  return matchesAnyPattern(columnName, BLOCKED_COLUMN_PATTERNS);
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
  if (provider === 'custom') return 'custom';
  return 'openai';
}

function defaultBaseUrl(provider: AiProvider): string {
  if (provider === 'openrouter') return DEFAULT_OPENROUTER_BASE_URL;
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

  return null;
}

function buildCompletionsUrl(baseUrl: string): string {
  const normalized = normalizeText(baseUrl).replace(/\/+$/, '');
  if (!normalized) return `${DEFAULT_OPENAI_BASE_URL}/chat/completions`;
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
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
  if (provider === 'openrouter') {
    return normalizeApiKey(Deno.env.get('OPENROUTER_API_KEY')) || openAiFallback;
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

function detectToolName(message: string, moduleHint: string | null): string {
  const text = message.toLowerCase();
  const hint = (moduleHint || '').toLowerCase();

  if (hint.includes('lab') || /lab|مختبر|فحص|تحاليل|رطوبة/.test(text)) return 'lab.query';
  if (hint.includes('task') || /task|مهمة|مهام/.test(text)) return 'tasks.query';
  if (hint.includes('ncr') || /ncr|عدم مطابقة|محتجز/.test(text)) return 'ncr.query';
  if (hint.includes('form') || /form|report|نموذج|تقرير|سجل/.test(text)) return 'forms.query';
  if (/user|role|permission|صلاحية|مستخدم|دور/.test(text)) return 'settings.query';

  return 'system.query';
}

function buildActionProposals(message: string, moduleHint: string | null): ProposalCandidate[] {
  const summary = truncate(message, 120);
  const risk = detectRisk(message);
  const tool = detectToolName(message, moduleHint);

  return [
    {
      tool_name: tool,
      summary: `اقتراح إجراء: ${summary}`,
      risk_level: risk,
      action_payload: {
        request: message,
        module_hint: moduleHint,
        mode: 'propose_only',
      },
    },
  ];
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

function normalizeForMatch(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripArabicDefiniteArticle(value: string): string {
  const normalized = normalizeText(value);
  if (normalized.startsWith('ال') && normalized.length > 2) {
    return normalized.slice(2).trim();
  }
  return normalized;
}

function materialTermAliases(value: string): string[] {
  const term = normalizeText(value).toLowerCase();
  if (!term) return [];

  const aliases = new Set<string>();
  aliases.add(term);
  aliases.add(stripArabicDefiniteArticle(term));

  const aliasMap: Record<string, string[]> = {
    'فركتوز': ['fructose'],
    'الفركتوز': ['fructose'],
    'جلوكوز': ['glucose'],
    'الجلوكوز': ['glucose'],
    'سكروز': ['sucrose'],
    'السكروز': ['sucrose'],
    'ديكستروز': ['dextrose'],
    'الدكستروز': ['dextrose', 'dexrose'],
    'دقيق': ['flour'],
    'الدقيق': ['flour'],
    'طحين': ['flour'],
    'الطحين': ['flour'],
  };

  (aliasMap[term] || []).forEach((item) => aliases.add(item));

  return Array.from(aliases)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function extractMaterialNameFromApprovedSuppliersQuery(message: string): string {
  const text = normalizeText(message);
  if (!text) return '';

  const cleanup = (value: string): string => {
    let output = normalizeText(value);
    output = output.replace(/^(?:ما\s+هم|من\s+هم|اعرض|أعرض|قائمة|اريد|أريد)\s+/i, '');
    output = output.replace(/^(?:مورد(?:ين|ي|و)?|suppliers?)\s+/i, '');
    output = output.replace(/^(?:خامة|مادة|material|raw material)\s+/i, '');
    output = output.replace(/\s+(?:المعتمد(?:ين)?|approved)\s*$/i, '');
    return normalizeText(output);
  };

  const quoted = text.match(/["'“”«»](.+?)["'“”«»]/);
  if (quoted?.[1]) return cleanup(quoted[1]);

  const arInline = text.match(/مورد(?:ي|ين)?\s+(.+?)\s+المعتمد(?:ين)?/i);
  if (arInline?.[1]) return cleanup(arInline[1]);

  const arFor = text.match(/المعتمد(?:ين)?\s+(?:ل|لـ)\s*(.+)$/i);
  if (arFor?.[1]) return cleanup(arFor[1]);

  const arMaterial = text.match(/مورد(?:ي|ين|و)?\s+(?:خامة|مادة)\s+(.+)$/i);
  if (arMaterial?.[1]) return cleanup(arMaterial[1]);

  const arGeneric = text.match(/مورد(?:ي|ين|و)?\s+(.+)$/i);
  if (arGeneric?.[1]) return cleanup(arGeneric[1]);

  const en = text.match(/approved\s+suppliers(?:\s+for|\s+of)?\s+(.+)$/i);
  if (en?.[1]) return cleanup(en[1]);

  const enAny = text.match(/suppliers?(?:\s+for|\s+of)?\s+(.+)$/i);
  if (enAny?.[1]) return cleanup(enAny[1]);

  return '';
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

async function loadRawMaterialByTerm(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  materialTerm: string,
): Promise<RawMaterialLookupRow | null> {
  const normalizedTerm = normalizeText(materialTerm);
  if (!normalizedTerm) return null;
  const variants = materialTermAliases(normalizedTerm)
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

  const normalizedVariants = variants.map((item) => normalizeForMatch(item));

  const exact = rows.find((row) => {
    const nameNorm = normalizeForMatch(row.name || '');
    return normalizedVariants.some((variant) => variant && nameNorm === variant);
  });
  if (exact) return exact;

  const startsWith = rows.find((row) => {
    const nameNorm = normalizeForMatch(row.name || '');
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
  const variants = materialTermAliases(materialTerm)
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
  const base = normalizeForMatch(`${message} ${moduleHint || ''}`);
  if (!base) return [];

  return base
    .split(' ')
    .map((token) => stripArabicDefiniteArticle(token))
    .map((token) => normalizeText(token))
    .filter((token) => token.length >= 2 && !STRUCTURED_QUERY_STOP_WORDS.has(token));
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
  const haystack = normalizeForMatch(
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
  companyId: string;
  locale: string;
  message: string;
  moduleHint: string | null;
}): Promise<StructuredDataQueryResult | null> {
  const catalog = await loadSafeCatalog(params.adminClient);
  const rankedTables = rankSafeTablesForQuery(catalog, params.message, params.moduleHint).slice(0, 6);
  if (rankedTables.length === 0) return null;

  const keywords = tokenizeStructuredQuery(params.message, params.moduleHint);
  const searchTerm = keywords.find((item) => item.length >= 3) || '';
  const safeSearchTerm = escapeLikeTerm(searchTerm);
  const isCount = isCountIntent(params.message);

  if (isCount) {
    for (const table of rankedTables) {
      const countColumn = pickCountColumn(table);
      let query = params.adminClient
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

      return { reply, toolTag: `tool:safe_query.count.${table.tableName}` };
    }

    return null;
  }

  for (const table of rankedTables) {
    const displayColumns = pickDisplayColumns(table);
    const selectClause = displayColumns.length > 0 ? displayColumns.join(',') : '*';
    let query = params.adminClient.from(table.tableName).select(selectClause).limit(30);

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

    const previewRows = rows.slice(0, 5);
    const responseColumns =
      displayColumns.length > 0
        ? displayColumns
        : Object.keys(previewRows[0] || {})
            .filter((col) => !isBlockedColumnName(col))
            .slice(0, 6);

    if (responseColumns.length === 0) {
      continue;
    }

    return {
      reply: buildStructuredRowsReply(table.tableName, responseColumns, previewRows, params.locale),
      toolTag: `tool:safe_query.rows.${table.tableName}`,
    };
  }

  return null;
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
  const systemPrompt =
    params.locale.startsWith('ar')
      ? 'أنت مساعد ذكي داخل نظام إدارة الجودة. أجب بالعربية بشكل واضح ومختصر. لا تدّعِ تنفيذ أي تعديل فعلي. قدّم توصيات عملية فقط.'
      : 'You are an AI assistant inside a quality management system. Keep responses concise and practical. Do not claim to execute write actions.';

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
        api_base_url: DEFAULT_OPENAI_BASE_URL,
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
    .select('id, company_id')
    .eq('id', userId)
    .single();

  if (userRowError) {
    return jsonResponse({ error: 'User company context is missing.' }, 403);
  }

  let companyId = normalizeText(userRow?.company_id);

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
        api_base_url: normalizeBaseUrl(input.api_base_url || currentSettings.api_base_url, nextProvider),
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
    return jsonResponse(
      {
        error: 'Execution mode is not enabled yet. Current release is propose-only (V1).',
        mode: 'propose_only',
      },
      409,
    );
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
  const isLatestReceivingQuery = isLatestLabReceivingIntent(message, moduleHint);
  const isSuppliersByMaterialQuery = isSuppliersForMaterialIntent(message, moduleHint);
  const isStructuredDataQuery = isStructuredDataIntent(message, moduleHint);

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

  const { data: isAdminData } = await adminClient.rpc('is_admin_user', { check_user_id: userId });
  const isAdmin = Boolean(isAdminData);

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
    .select('id, thread_id, role, content, created_at')
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
  let directQueryReply: string | null = null;
  let directQueryToolTag: string | null = null;

  if (isSuppliersByMaterialQuery) {
    directQueryToolTag = 'tool:raw_material_suppliers.approved';
    const materialTerm = extractMaterialNameFromApprovedSuppliersQuery(message);
    if (!materialTerm) {
      directQueryReply = locale.startsWith('ar')
        ? 'لم أتمكن من تحديد اسم المادة. اكتب الطلب بهذا الشكل: "ما هم الموردين المعتمدين لمادة الفركتوز؟".'
        : 'I could not identify the material name. Please ask like: "approved suppliers for fructose".';
    } else {
      try {
        let materialRow = await loadRawMaterialByTerm(adminClient, companyId, materialTerm);
        let receivingMatchedName = '';

        if (!materialRow) {
          const receivingMatch = await loadMaterialFromReceivingByTerm(adminClient, companyId, materialTerm);
          receivingMatchedName = normalizeText(receivingMatch?.material_name);

          const receivingRawMaterialId = normalizeText(receivingMatch?.raw_material_id);
          if (receivingRawMaterialId) {
            materialRow = await loadRawMaterialById(adminClient, companyId, receivingRawMaterialId);
          }

          if (!materialRow) {
            if (receivingMatch) {
              directQueryReply = locale.startsWith('ar')
                ? `وجدت المادة في سجلات الاستلام باسم "${receivingMatchedName || materialTerm}" لكنها غير مربوطة بمادة خام معرفة، لذلك لا أستطيع تحديد الموردين المعتمدين بدقة.`
                : `Material "${receivingMatchedName || materialTerm}" was found in receiving logs but is not linked to a defined raw material, so approved suppliers cannot be determined reliably.`;
            } else {
              directQueryReply = locale.startsWith('ar')
                ? `لا أجد مادة مطابقة للاسم: ${materialTerm}.`
                : `No material matched: ${materialTerm}.`;
            }
          }
        }

        if (materialRow) {
          const suppliers = await loadApprovedSuppliersForRawMaterial(adminClient, companyId, materialRow.id);
          directQueryReply = buildApprovedSuppliersReply(
            normalizeText(materialRow.name) || receivingMatchedName || materialTerm,
            suppliers,
            locale,
          );
        }
      } catch (error) {
        console.error('[ai-assistant] load approved suppliers for material failed', error);
        directQueryReply = locale.startsWith('ar')
          ? 'تعذر تحميل الموردين المعتمدين حالياً من قاعدة البيانات.'
          : 'Failed to load approved suppliers from the database right now.';
      }
    }
  } else if (isLatestReceivingQuery) {
    directQueryToolTag = 'tool:material_receiving.latest';
    try {
      const latestReceiving = await loadLatestMaterialReceiving(adminClient, companyId);
      directQueryReply = buildLatestMaterialReceivingReply(latestReceiving, locale);
    } catch (error) {
      console.error('[ai-assistant] load latest material receiving failed', error);
      directQueryReply = locale.startsWith('ar')
        ? 'تعذر تحميل آخر استلام في المختبر حالياً. حاول مرة أخرى.'
        : 'Failed to load the latest lab receiving right now. Please try again.';
    }
  } else if (isStructuredDataQuery) {
    const structuredResult = await tryHandleStructuredDataQuery({
      adminClient,
      companyId,
      locale,
      message,
      moduleHint,
    });

    if (structuredResult) {
      directQueryReply = structuredResult.reply;
      directQueryToolTag = structuredResult.toolTag;
    } else {
      directQueryReply = buildUnsupportedStructuredDataReply(locale);
      directQueryToolTag = 'tool:guardrail.unsupported_data_query';
    }
  }

  let assistantText =
    'تم استلام طلبك. هذه النسخة تعمل في وضع الاقتراح فقط، ويمكنني تجهيز خطوات تنفيذ مناسبة لك.';
  let assistantUsage: Record<string, unknown> | null = null;
  let usedModel = model;
  let aiStatus: 'ok' | 'no_api_key' | 'provider_error' | 'tool_query' = 'ok';
  let aiErrorSummary: string | null = null;

  if (directQueryReply) {
    assistantText = directQueryReply;
    assistantUsage = null;
    usedModel = directQueryToolTag || 'tool:direct_data_query';
    aiStatus = 'tool_query';
  } else if (runtimeApiKey) {
    let aiSucceeded = false;
    let lastErrorMessage = '';

    for (const candidateModel of modelCandidates) {
      try {
        const aiResult = await callOpenAI({
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

  const { data: assistantMessage, error: assistantMessageError } = await adminClient
    .from('ai_messages')
    .insert({
      company_id: companyId,
      thread_id: threadId,
      role: 'assistant',
      content: assistantText,
      created_by: userId,
      metadata: {
        mode: 'propose_only',
        model: usedModel,
        usage: assistantUsage,
        provider: settings.api_provider,
        ai_status: aiStatus,
        ai_error_summary: aiErrorSummary,
      },
    })
    .select('id, thread_id, role, content, created_at')
    .single();

  if (assistantMessageError || !assistantMessage) {
    console.error('[ai-assistant] insert assistant message failed', assistantMessageError);
    return jsonResponse({ error: 'Failed to store assistant message.' }, 500);
  }

  const proposalCandidates = directQueryReply ? [] : buildActionProposals(message, moduleHint);
  let insertedProposals: Array<Record<string, unknown>> = [];

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
      .select('id, thread_id, message_id, tool_name, summary, risk_level, status, action_payload, created_at');

    if (proposalsError) {
      console.error('[ai-assistant] insert proposals failed', proposalsError);
    } else {
      insertedProposals = (proposalsRows || []) as Array<Record<string, unknown>>;
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
    assistant_message: assistantMessage,
    reply: assistantText,
    model: usedModel,
    usage: assistantUsage,
    proposals: insertedProposals,
  });
});
