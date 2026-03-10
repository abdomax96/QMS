import { supabase } from '../../../config/supabase';
import { getLabV2Context } from './labV2Context';

const FALLBACK_STORAGE_KEY = 'lab_v2_run_print_settings_fallback_v1';
const DYNAMIC_TITLE_TOKEN = '{test_type}';
const LEGACY_MOISTURE_DOCUMENT_TITLE = 'نموذج تسجيل فحص الرطوبة';
const GENERIC_DOCUMENT_TITLE = 'نموذج تسجيل فحص';

export interface LabV2RunPrintSettings {
  company_id: string;
  document_title: string;
  doc_code: string;
  issue_no: string;
  issue_date: string;
  review_no: string;
  review_date: string;
  footer_note: string;
}

export type LabV2RunPrintSettingsInput = Omit<LabV2RunPrintSettings, 'company_id'>;

export const DEFAULT_LAB_V2_RUN_PRINT_SETTINGS: LabV2RunPrintSettingsInput = {
  document_title: `${GENERIC_DOCUMENT_TITLE} ${DYNAMIC_TITLE_TOKEN}`,
  doc_code: 'LAB-TEST-RUN-01',
  issue_no: '01',
  issue_date: '',
  review_no: '00',
  review_date: '',
  footer_note: '',
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDocumentTitleTemplate(value: unknown): string {
  const title = normalizeText(value);
  if (!title) return DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.document_title;
  if (title === LEGACY_MOISTURE_DOCUMENT_TITLE || title === GENERIC_DOCUMENT_TITLE) {
    return DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.document_title;
  }
  return title;
}

function isSchemaCompatibilityError(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (
    code === '42p01' ||
    code === '42703' ||
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    details.includes('relation')
  );
}

function readLocalFallback(): Partial<LabV2RunPrintSettingsInput> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeLocalFallback(settings: LabV2RunPrintSettingsInput): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage write failures.
  }
}

function mapRowToSettings(row: any, companyId: string): LabV2RunPrintSettings {
  return {
    company_id: companyId,
    document_title: normalizeDocumentTitleTemplate(row?.document_title),
    doc_code: normalizeText(row?.doc_code) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.doc_code,
    issue_no: normalizeText(row?.issue_no) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.issue_no,
    issue_date: normalizeText(row?.issue_date),
    review_no: normalizeText(row?.review_no) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.review_no,
    review_date: normalizeText(row?.review_date),
    footer_note: normalizeText(row?.footer_note),
  };
}

export async function getLabV2RunPrintSettings(): Promise<LabV2RunPrintSettings> {
  const ctx = await getLabV2Context();
  if (!ctx.company_id) {
    throw new Error('لا يمكن تحميل إعدادات الطباعة بدون شركة فعالة');
  }

  const localFallback = readLocalFallback();

  const { data, error } = await supabase
    .from('lab_v2_print_settings')
    .select('company_id, document_title, doc_code, issue_no, issue_date, review_no, review_date, footer_note')
    .eq('company_id', ctx.company_id)
    .maybeSingle();

  if (error) {
    if (isSchemaCompatibilityError(error)) {
      const fallback = {
        ...DEFAULT_LAB_V2_RUN_PRINT_SETTINGS,
        ...localFallback,
      };
      return {
        company_id: ctx.company_id,
        ...fallback,
      };
    }
    throw error;
  }

  if (!data) {
    const fallback = {
      ...DEFAULT_LAB_V2_RUN_PRINT_SETTINGS,
      ...localFallback,
    };
    return {
      company_id: ctx.company_id,
      ...fallback,
    };
  }

  const mapped = mapRowToSettings(data, ctx.company_id);
  writeLocalFallback({
    document_title: mapped.document_title,
    doc_code: mapped.doc_code,
    issue_no: mapped.issue_no,
    issue_date: mapped.issue_date,
    review_no: mapped.review_no,
    review_date: mapped.review_date,
    footer_note: mapped.footer_note,
  });
  return mapped;
}

export async function saveLabV2RunPrintSettings(
  input: LabV2RunPrintSettingsInput
): Promise<LabV2RunPrintSettings> {
  const ctx = await getLabV2Context();
  if (!ctx.company_id) {
    throw new Error('لا يمكن حفظ إعدادات الطباعة بدون شركة فعالة');
  }

  const payload: LabV2RunPrintSettingsInput = {
    document_title: normalizeDocumentTitleTemplate(input.document_title),
    doc_code: normalizeText(input.doc_code) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.doc_code,
    issue_no: normalizeText(input.issue_no) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.issue_no,
    issue_date: normalizeText(input.issue_date),
    review_no: normalizeText(input.review_no) || DEFAULT_LAB_V2_RUN_PRINT_SETTINGS.review_no,
    review_date: normalizeText(input.review_date),
    footer_note: normalizeText(input.footer_note),
  };

  const { data, error } = await supabase
    .from('lab_v2_print_settings')
    .upsert(
      {
        company_id: ctx.company_id,
        ...payload,
        updated_by: ctx.user_id,
        created_by: ctx.user_id,
      },
      { onConflict: 'company_id' }
    )
    .select('company_id, document_title, doc_code, issue_no, issue_date, review_no, review_date, footer_note')
    .single();

  if (error) {
    if (isSchemaCompatibilityError(error)) {
      writeLocalFallback(payload);
      return {
        company_id: ctx.company_id,
        ...payload,
      };
    }
    throw error;
  }

  const mapped = mapRowToSettings(data, ctx.company_id);
  writeLocalFallback({
    document_title: mapped.document_title,
    doc_code: mapped.doc_code,
    issue_no: mapped.issue_no,
    issue_date: mapped.issue_date,
    review_no: mapped.review_no,
    review_date: mapped.review_date,
    footer_note: mapped.footer_note,
  });
  return mapped;
}
