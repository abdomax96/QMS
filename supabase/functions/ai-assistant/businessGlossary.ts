export type BusinessGlossaryEntry = {
  canonical: string;
  category: 'material' | 'entity' | 'module';
  aliases: string[];
};

const BUSINESS_GLOSSARY: BusinessGlossaryEntry[] = [
  {
    canonical: 'flour',
    category: 'material',
    aliases: ['flour', 'دقيق', 'الدقيق', 'طحين', 'الطحين'],
  },
  {
    canonical: 'fructose',
    category: 'material',
    aliases: ['fructose', 'فركتوز', 'الفركتوز'],
  },
  {
    canonical: 'glucose',
    category: 'material',
    aliases: ['glucose', 'جلوكوز', 'الجلوكوز'],
  },
  {
    canonical: 'sucrose',
    category: 'material',
    aliases: ['sucrose', 'سكروز', 'السكروز'],
  },
  {
    canonical: 'dextrose',
    category: 'material',
    aliases: ['dextrose', 'dexrose', 'ديكستروز', 'الدكستروز'],
  },
  {
    canonical: 'material_receiving',
    category: 'entity',
    aliases: ['material_receiving', 'receiving', 'receipt', 'استلام', 'استلامات'],
  },
  {
    canonical: 'supplier',
    category: 'entity',
    aliases: ['supplier', 'suppliers', 'مورد', 'موردين', 'الموردين', 'موردو'],
  },
  {
    canonical: 'task',
    category: 'entity',
    aliases: ['task', 'tasks', 'مهمة', 'مهام'],
  },
  {
    canonical: 'lab_run',
    category: 'entity',
    aliases: ['run', 'runs', 'test run', 'lab run', 'تشغيل', 'تشغيلة', 'تشغيلات', 'تشغيله'],
  },
  {
    canonical: 'ncr',
    category: 'entity',
    aliases: ['ncr', 'عدم مطابقة', 'محتجز'],
  },
  {
    canonical: 'document',
    category: 'entity',
    aliases: ['document', 'documents', 'doc', 'docs', 'وثيقة', 'وثائق', 'مستند', 'مستندات'],
  },
  {
    canonical: 'lab',
    category: 'module',
    aliases: ['lab', 'مختبر', 'معمل', 'تحاليل', 'فحص', 'اختبار'],
  },
];

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeStructuredIdentifier(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return /[\d\-\/]/.test(normalized);
}

export function normalizeForBusinessMatch(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripArabicDefiniteArticle(value: string): string {
  const normalized = normalizeText(value);
  if (normalized.startsWith('ال') && normalized.length > 2) {
    return normalized.slice(2).trim();
  }
  return normalized;
}

function buildCanonicalLookup(): Map<string, BusinessGlossaryEntry> {
  const lookup = new Map<string, BusinessGlossaryEntry>();
  for (const entry of BUSINESS_GLOSSARY) {
    for (const alias of entry.aliases) {
      const normalized = normalizeForBusinessMatch(alias);
      if (normalized) {
        lookup.set(normalized, entry);
      }
      const stripped = normalizeForBusinessMatch(stripArabicDefiniteArticle(alias));
      if (stripped) {
        lookup.set(stripped, entry);
      }
    }
  }
  return lookup;
}

const GLOSSARY_LOOKUP = buildCanonicalLookup();

export function expandGlossaryAliases(value: string): string[] {
  const normalized = normalizeForBusinessMatch(value);
  if (!normalized) return [];

  const tokens = new Set<string>();
  const entry = GLOSSARY_LOOKUP.get(normalized);
  const add = (term: string) => {
    const candidate = normalizeText(term);
    if (candidate) tokens.add(candidate);
  };

  add(value);
  add(stripArabicDefiniteArticle(value));

  if (entry) {
    add(entry.canonical);
    for (const alias of entry.aliases) {
      add(alias);
      add(stripArabicDefiniteArticle(alias));
    }
  }

  return Array.from(tokens);
}

export function expandStructuredQueryKeywords(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    const normalized = normalizeText(token);
    if (!normalized) continue;
    expanded.add(normalized);
    for (const alias of expandGlossaryAliases(normalized)) {
      expanded.add(alias);
    }
  }
  return Array.from(expanded);
}

export function buildMaterialTermCandidates(value: string): string[] {
  return expandGlossaryAliases(value)
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);
}

export function extractMaterialNameFromApprovedSuppliersQuery(message: string): string {
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

export function extractNcrIdentifierFromQuery(message: string): string {
  const text = normalizeText(message);
  if (!text) return '';

  const quoted = text.match(/["'“”«»](.+?)["'“”«»]/);
  if (quoted?.[1]) return normalizeText(quoted[1]);

  const ncrToken = text.match(/\bNCR[-\s:/#]*([A-Za-z0-9][A-Za-z0-9\-\/]*)\b/i);
  if (ncrToken?.[1]) {
    return normalizeText(`NCR-${ncrToken[1]}`).replace(/\s+/g, '');
  }

  const arabicNumber = text.match(/(?:عدم\s+مطابقة|محتجز)\s*(?:رقم|number|no\.?|#|:)?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (arabicNumber?.[1]) {
    return normalizeText(arabicNumber[1]);
  }

  const genericNumber = text.match(/(?:رقم|number|no\.?|#)\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (genericNumber?.[1] && /\bncr\b|عدم\s+مطابقة|محتجز/i.test(text)) {
    return normalizeText(genericNumber[1]);
  }

  return '';
}

export function extractTaskIdentifierFromQuery(message: string): string {
  const text = normalizeText(message);
  if (!text) return '';

  const quoted = text.match(/["'“”«»](.+?)["'“”«»]/);
  if (quoted?.[1] && looksLikeStructuredIdentifier(quoted[1])) {
    return normalizeText(quoted[1]);
  }

  const taskToken = text.match(/\bTASK[-\s:/#]*([A-Za-z0-9][A-Za-z0-9\-\/]*)\b/i);
  if (taskToken?.[1]) {
    return normalizeText(`TASK-${taskToken[1]}`).replace(/\s+/g, '');
  }

  const arabicNumber = text.match(/(?:مهمة|مهام)\s*(?:رقم|number|no\.?|#|:)?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (arabicNumber?.[1] && looksLikeStructuredIdentifier(arabicNumber[1])) {
    return normalizeText(arabicNumber[1]);
  }

  const genericNumber = text.match(/(?:رقم|number|no\.?|#)\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (genericNumber?.[1] && /\btask\b|مهمة|مهام/i.test(text) && looksLikeStructuredIdentifier(genericNumber[1])) {
    return normalizeText(genericNumber[1]);
  }

  return '';
}

export function extractLabRunIdentifierFromQuery(message: string): string {
  const text = normalizeText(message);
  if (!text) return '';

  const quoted = text.match(/["'“”«»](.+?)["'“”«»]/);
  if (quoted?.[1] && looksLikeStructuredIdentifier(quoted[1])) {
    return normalizeText(quoted[1]);
  }

  const fullRun = text.match(/\b(L2[-\s]*RUN[-\s:/#]*[A-Za-z0-9][A-Za-z0-9\-\/]*)\b/i);
  if (fullRun?.[1]) {
    return normalizeText(fullRun[1]).replace(/\s+/g, '').replace(/L2RUN/i, 'L2-RUN-');
  }

  const runToken = text.match(/\bRUN[-\s:/#]*([A-Za-z0-9][A-Za-z0-9\-\/]*)\b/i);
  if (runToken?.[1] && looksLikeStructuredIdentifier(runToken[1])) {
    return normalizeText(`RUN-${runToken[1]}`).replace(/\s+/g, '');
  }

  const arabicNumber = text.match(/(?:تشغيل|تشغيلة|تشغيلات|فحص)\s*(?:رقم|number|no\.?|#|:)?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (arabicNumber?.[1] && looksLikeStructuredIdentifier(arabicNumber[1])) {
    return normalizeText(arabicNumber[1]);
  }

  const genericNumber = text.match(/(?:رقم|number|no\.?|#)\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  if (genericNumber?.[1] && /(تشغيل|تشغيلة|run|test run|lab run)/i.test(text) && looksLikeStructuredIdentifier(genericNumber[1])) {
    return normalizeText(genericNumber[1]);
  }

  return '';
}

export function extractDocumentSearchTerm(message: string): string {
  const text = normalizeText(message);
  if (!text) return '';

  const cleanup = (value: string): string => {
    let output = normalizeText(value);
    output = output.replace(/^(?:اعرض|أعرض|ابحث(?:\s+عن)?|اظهر|أظهر|اريد|أريد|قائمة|show|find|search|list)\s+/i, '');
    output = output.replace(/^(?:آخر|اخر|أحدث|احدث|latest|last|recent|most recent)\s+/i, '');
    output = output.replace(/^(?:وثيقة|وثائق|مستند|مستندات|document|documents|doc|docs)\s+/i, '');
    output = output.replace(/^(?:رقم(?:\s+الوثيقة)?|document number|number|no\.?|#)\s+/i, '');
    output = output.replace(/\s+(?:المتاحة|المعتمدة|المعتمد|available|approved)\s*$/i, '');
    output = normalizeText(output);

    const normalized = normalizeForBusinessMatch(output);
    if (!normalized) return '';
    if (/^(?:وثيقة|وثائق|مستند|مستندات|document|documents|doc|docs|latest|last|recent|اخر|آخر|احدث|أحدث)$/i.test(normalized)) {
      return '';
    }

    return output;
  };

  const quoted = text.match(/["'“”«»](.+?)["'“”«»]/);
  if (quoted?.[1]) return cleanup(quoted[1]);

  const labeled = text.match(/(?:وثيقة|وثائق|مستند|مستندات|document|documents|doc|docs)\s+(?:رقم(?:\s+الوثيقة)?|document number|number|no\.?|#)?\s*(.+)$/i);
  if (labeled?.[1]) return cleanup(labeled[1]);

  const searched = text.match(/(?:ابحث(?:\s+عن)?|search|find|show)\s+(.+)$/i);
  if (searched?.[1] && /(?:وثيقة|وثائق|مستند|مستندات|document|documents|doc|docs)/i.test(text)) {
    return cleanup(searched[1]);
  }

  return '';
}
