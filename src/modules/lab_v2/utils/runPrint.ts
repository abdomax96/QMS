import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  LabV2RunMeasurement,
  LabV2RunValue,
  LabV2TestRun,
} from '../types/run.types';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../types/test.types';
import type { LabV2RunPrintSettings } from '../services/runPrintSettingsService';

type RunForPrint = LabV2TestRun & {
  measurements?: LabV2RunMeasurement[];
  values?: LabV2RunValue[];
};

const EVALUATION_LABELS: Record<string, string> = {
  pass: 'مطابق',
  fail: 'غير مطابق',
  warning: 'تحذير',
  na: '—',
};

const PDF_ARABIC_FONT_FAMILY = 'Amiri';
const PDF_ARABIC_FONT_FILE_NORMAL = 'Amiri-Regular.ttf';
const PDF_ARABIC_FONT_FILE_BOLD = 'Amiri-Bold.ttf';
const PDF_ARABIC_FONT_URL_NORMAL = '/fonts/Amiri-Regular.ttf';
const PDF_ARABIC_FONT_URL_BOLD = '/fonts/Amiri-Bold.ttf';

let cachedArabicFontNormalBase64: string | null = null;
let cachedArabicFontBoldBase64: string | null = null;
const DYNAMIC_TITLE_TOKEN = '{test_type}';
const LEGACY_DYNAMIC_TITLE_TOKEN = '{test_name}';
const LEGACY_MOISTURE_DOCUMENT_TITLE = 'نموذج تسجيل فحص الرطوبة';
const GENERIC_DOCUMENT_TITLE = 'نموذج تسجيل فحص';

type RunSheetRenderModel = {
  run: RunForPrint;
  settings: LabV2RunPrintSettings;
  documentTitle: string;
  logoUrl: string;
  logoScale: number;
  parameterLabel: string;
  specText: string;
  rowsHtml: string;
  printedAt: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  });
}

function formatTimeOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('ar-EG-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  });
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveRunTestTypeName(run: RunForPrint, parameter: LabV2TestParameter | null): string {
  const parameterLabel = normalizeText(parameter?.label_ar || parameter?.label || parameter?.param_key);
  if (parameterLabel) return parameterLabel;

  const testSnapshot = (run.test_snapshot || {}) as Record<string, any>;
  const fallbackName =
    normalizeText(testSnapshot.name_ar) ||
    normalizeText(testSnapshot.name) ||
    normalizeText(run.test_id) ||
    'الفحص';

  // Remove likely product suffixes from names like "فحص رطوبة المنتج - باتر ساندوتش".
  const separators = [' - ', ' – ', ' — ', ' | ', ' : ', ' / '];
  for (const separator of separators) {
    if (fallbackName.includes(separator)) {
      const [head] = fallbackName.split(separator);
      const normalizedHead = normalizeText(head);
      if (normalizedHead) return normalizedHead;
    }
  }

  const bracketIndex = fallbackName.indexOf('(');
  if (bracketIndex > 0) {
    const withoutBrackets = normalizeText(fallbackName.slice(0, bracketIndex));
    if (withoutBrackets) return withoutBrackets;
  }

  return fallbackName;
}

function resolveDocumentTitle(rawTitle: unknown, testTypeName: string): string {
  const configured = normalizeText(rawTitle);

  if (!configured) {
    return `${GENERIC_DOCUMENT_TITLE} ${testTypeName}`.trim();
  }

  if (configured.includes(DYNAMIC_TITLE_TOKEN) || configured.includes(LEGACY_DYNAMIC_TITLE_TOKEN)) {
    return configured
      .split(DYNAMIC_TITLE_TOKEN)
      .join(testTypeName)
      .split(LEGACY_DYNAMIC_TITLE_TOKEN)
      .join(testTypeName)
      .trim();
  }

  if (
    configured === LEGACY_MOISTURE_DOCUMENT_TITLE ||
    configured === GENERIC_DOCUMENT_TITLE
  ) {
    return `${GENERIC_DOCUMENT_TITLE} ${testTypeName}`.trim();
  }

  return configured;
}

function getPrimaryParameter(params: LabV2TestParameter[]): LabV2TestParameter | null {
  if (!params.length) return null;
  const sorted = params
    .slice()
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const moistureParam = sorted.find((parameter) => {
    const source = `${parameter.param_key || ''} ${parameter.label || ''} ${parameter.label_ar || ''}`.toLowerCase();
    return source.includes('moisture') || source.includes('رطوبة') || source.includes('الرطوبة');
  });

  return moistureParam || sorted[0] || null;
}

function getRuleForParameter(
  rules: LabV2AcceptanceRule[],
  parameter: LabV2TestParameter | null
): LabV2AcceptanceRule | null {
  if (!parameter || !rules.length) return null;
  const exact = rules.filter((rule) => rule.parameter_id === parameter.id);
  const candidates = exact.length ? exact : rules.filter((rule) => rule.test_id === parameter.test_id);
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return candidates[0] || null;
}

function formatSpecText(rule: LabV2AcceptanceRule | null, parameter: LabV2TestParameter | null): string {
  if (!rule || !parameter) return '—';
  if (rule.rule_type === 'numeric_range') {
    const min = rule.spec_min ?? '—';
    const max = rule.spec_max ?? '—';
    const unit = normalizeText(rule.spec_unit || parameter.unit);
    return unit ? `${min} - ${max} ${unit}` : `${min} - ${max}`;
  }
  if (rule.rule_type === 'allowed_values' || rule.rule_type === 'multi_select') {
    const allowed = Array.isArray(rule.allowed_values)
      ? rule.allowed_values.map((item) => normalizeText(item)).filter(Boolean)
      : [];
    return allowed.length ? allowed.join('، ') : '—';
  }
  return '—';
}

function resolveRowValue(
  measurement: LabV2RunMeasurement,
  parameter: LabV2TestParameter | null
): { valueText: string; evaluationText: string; notesText: string } {
  if (!parameter) {
    return {
      valueText: '—',
      evaluationText: '—',
      notesText: normalizeText(measurement.notes) || '—',
    };
  }

  const valueRecord =
    (measurement.values || []).find((row) => row.param_key === parameter.param_key) || null;

  let rawValue = '';
  if (parameter.data_type === 'number') {
    if (valueRecord?.numeric_value != null && Number.isFinite(Number(valueRecord.numeric_value))) {
      rawValue = String(valueRecord.numeric_value);
    } else {
      rawValue = normalizeText(valueRecord?.value);
    }
  } else if (parameter.data_type === 'multi_select') {
    const base = normalizeText(valueRecord?.value);
    if (base.startsWith('[') && base.endsWith(']')) {
      try {
        const parsed = JSON.parse(base);
        rawValue = Array.isArray(parsed) ? parsed.map((item) => String(item)).join('، ') : base;
      } catch {
        rawValue = base;
      }
    } else {
      rawValue = base;
    }
  } else {
    rawValue = normalizeText(valueRecord?.value);
  }

  const unit = normalizeText(parameter.unit);
  const valueText = rawValue ? (unit ? `${rawValue} ${unit}` : rawValue) : '—';
  const evaluationKey = normalizeText(valueRecord?.evaluation_result || measurement.evaluation_result).toLowerCase();
  const evaluationText = EVALUATION_LABELS[evaluationKey] || '—';
  const notesText = normalizeText(measurement.notes || valueRecord?.notes) || '—';

  return {
    valueText,
    evaluationText,
    notesText,
  };
}

function buildSheetStyles(logoScale: number): string {
  return `
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Tahoma", "Arial", sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
    .page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #1e293b;
      display: grid;
      grid-template-columns: 1fr 1fr 120px;
      align-items: stretch;
    }
    .doc-meta {
      border-left: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 11px;
      line-height: 1.6;
    }
    .doc-title {
      border-left: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-weight: 700;
      font-size: 16px;
      padding: 8px 10px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }
    .logo-wrap img {
      width: 82px;
      max-height: 64px;
      object-fit: contain;
      transform: scale(${Number.isFinite(logoScale) ? logoScale : 1});
      transform-origin: center center;
    }
    .content {
      padding: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 12px;
    }
    .meta-table td.label {
      width: 18%;
      font-weight: 700;
      background: #f8fafc;
    }
    .meta-table td.value {
      width: 32%;
    }
    .spec-box {
      margin-top: 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 8px 10px;
      font-size: 13px;
    }
    .result-table {
      margin-top: 8px;
    }
    .result-table th,
    .result-table td {
      border: 1px solid #94a3b8;
      padding: 7px 8px;
      font-size: 12px;
      vertical-align: top;
    }
    .result-table thead th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
    }
    .result-table td:nth-child(1) {
      width: 50px;
      text-align: center;
    }
    .result-table td:nth-child(2) {
      width: 85px;
      text-align: center;
      white-space: nowrap;
    }
    .result-table td:nth-child(3) {
      text-align: center;
      white-space: nowrap;
    }
    .result-table td:nth-child(5) {
      width: 95px;
      text-align: center;
      font-weight: 700;
    }
    .empty-row {
      text-align: center;
      color: #64748b;
      padding: 14px 8px !important;
    }
    .footer {
      margin-top: 10px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #334155;
    }
    .muted {
      color: #475569;
    }
  `;
}

function buildSheetMarkup(model: RunSheetRenderModel): string {
  const { run, settings, documentTitle, logoUrl, parameterLabel, specText, rowsHtml, printedAt } = model;
  const testSnapshot = (run.test_snapshot || {}) as Record<string, any>;

  return `
    <div class="page">
      <div class="header">
        <div class="doc-meta">
          <div>رمز الوثيقة: <strong>${escapeHtml(settings.doc_code || '—')}</strong></div>
          <div>الإصدار: <strong>${escapeHtml(settings.issue_no || '—')}</strong></div>
          <div>تاريخ الإصدار: <strong>${escapeHtml(settings.issue_date || '—')}</strong></div>
          <div>المراجعة: <strong>${escapeHtml(settings.review_no || '—')}</strong></div>
          <div>تاريخ المراجعة: <strong>${escapeHtml(settings.review_date || '—')}</strong></div>
        </div>
        <div class="doc-title">${escapeHtml(documentTitle)}</div>
        <div class="logo-wrap">
          <img src="${escapeHtml(logoUrl)}" alt="Company logo" crossorigin="anonymous" />
        </div>
      </div>

      <div class="content">
        <table class="meta-table">
          <tbody>
            <tr>
              <td class="label">رقم الفحص</td>
              <td class="value">${escapeHtml(run.run_number || '—')}</td>
              <td class="label">اسم الفحص</td>
              <td class="value">${escapeHtml(testSnapshot.name_ar || testSnapshot.name || '—')}</td>
            </tr>
            <tr>
              <td class="label">الباتش</td>
              <td class="value">${escapeHtml(run.batch_number_snapshot || '—')}</td>
              <td class="label">الوردية</td>
              <td class="value">${escapeHtml(run.shift_snapshot || '—')}</td>
            </tr>
            <tr>
              <td class="label">المشغل</td>
              <td class="value">${escapeHtml(run.operator_name || '—')}</td>
              <td class="label">بداية التسجيل</td>
              <td class="value">${escapeHtml(formatDateTime(run.started_at || run.created_at))}</td>
            </tr>
          </tbody>
        </table>

        <div class="spec-box">
          <strong>المعامل:</strong> ${escapeHtml(parameterLabel)}
          <span class="muted"> | </span>
          <strong>المواصفة:</strong> ${escapeHtml(specText)}
        </div>

        <table class="result-table">
          <thead>
            <tr>
              <th>م</th>
              <th>الوقت</th>
              <th>النتيجة</th>
              <th>ملاحظات</th>
              <th>مطابق</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>تاريخ الطباعة: ${escapeHtml(printedAt)}</span>
          <span>${escapeHtml(settings.footer_note || '')}</span>
        </div>
      </div>
    </div>
  `;
}

function buildSheetModel(options: {
  run: RunForPrint;
  settings: LabV2RunPrintSettings;
  logoUrl?: string | null;
  logoScale?: number | null;
}): RunSheetRenderModel {
  const { run, settings } = options;
  const logoUrl = normalizeText(options.logoUrl) || '/Logo.png';
  const logoScale =
    Number.isFinite(Number(options.logoScale)) && Number(options.logoScale) > 0
      ? Number(options.logoScale)
      : 1;

  const params = (Array.isArray(run.params_snapshot) ? run.params_snapshot : []) as LabV2TestParameter[];
  const rules = (Array.isArray(run.rules_snapshot) ? run.rules_snapshot : []) as LabV2AcceptanceRule[];
  const parameter = getPrimaryParameter(params);
  const rule = getRuleForParameter(rules, parameter);
  const testTypeName = resolveRunTestTypeName(run, parameter);
  const documentTitle = resolveDocumentTitle(settings.document_title, testTypeName);
  const specText = formatSpecText(rule, parameter);

  const sortedMeasurements = (run.measurements || [])
    .slice()
    .sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));

  const rowsHtml = sortedMeasurements.length
    ? sortedMeasurements
        .map((measurement) => {
          const row = resolveRowValue(measurement, parameter);
          return `
            <tr>
              <td>${escapeHtml(measurement.measurement_no || '—')}</td>
              <td>${escapeHtml(formatTimeOnly(measurement.measured_at))}</td>
              <td>${escapeHtml(row.valueText)}</td>
              <td>${escapeHtml(row.notesText)}</td>
              <td>${escapeHtml(row.evaluationText)}</td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="5" class="empty-row">لا توجد نتائج مسجلة</td>
      </tr>
    `;

  return {
    run,
    settings,
    documentTitle,
    logoUrl,
    logoScale,
    parameterLabel: parameter?.label_ar || parameter?.label || parameter?.param_key || '—',
    specText,
    rowsHtml,
    printedAt: formatDateTime(new Date().toISOString()),
  };
}

function buildFileName(run: RunForPrint): string {
  const runNo = normalizeText(run.run_number) || normalizeText(run.id) || 'run';
  const safe = runNo.replace(/[^\w\-]+/g, '_');
  return `lab_test_run_${safe}.pdf`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function getArabicFontBase64(
  variant: 'normal' | 'bold'
): Promise<string | null> {
  if (variant === 'normal' && cachedArabicFontNormalBase64) return cachedArabicFontNormalBase64;
  if (variant === 'bold' && cachedArabicFontBoldBase64) return cachedArabicFontBoldBase64;

  try {
    const response = await fetch(
      variant === 'normal' ? PDF_ARABIC_FONT_URL_NORMAL : PDF_ARABIC_FONT_URL_BOLD,
      { cache: 'force-cache' }
    );
    if (!response.ok) return null;
    const fontBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(fontBuffer);
    if (variant === 'normal') {
      cachedArabicFontNormalBase64 = base64;
    } else {
      cachedArabicFontBoldBase64 = base64;
    }
    return base64;
  } catch {
    return null;
  }
}

async function ensurePdfArabicFont(pdf: jsPDF): Promise<string> {
  const [normalBase64, boldBase64] = await Promise.all([
    getArabicFontBase64('normal'),
    getArabicFontBase64('bold'),
  ]);
  if (!normalBase64) return 'helvetica';

  const fontList = pdf.getFontList() as Record<string, unknown>;
  if (!fontList[PDF_ARABIC_FONT_FAMILY]) {
    (pdf as any).addFileToVFS(PDF_ARABIC_FONT_FILE_NORMAL, normalBase64);
    (pdf as any).addFont(PDF_ARABIC_FONT_FILE_NORMAL, PDF_ARABIC_FONT_FAMILY, 'normal');
    if (boldBase64) {
      (pdf as any).addFileToVFS(PDF_ARABIC_FONT_FILE_BOLD, boldBase64);
      (pdf as any).addFont(PDF_ARABIC_FONT_FILE_BOLD, PDF_ARABIC_FONT_FAMILY, 'bold');
    } else {
      (pdf as any).addFont(PDF_ARABIC_FONT_FILE_NORMAL, PDF_ARABIC_FONT_FAMILY, 'bold');
    }
  }

  pdf.setFont(PDF_ARABIC_FONT_FAMILY, 'normal');
  if (typeof (pdf as any).setLanguage === 'function') {
    (pdf as any).setLanguage('ar');
  }
  if (typeof (pdf as any).setR2L === 'function') {
    (pdf as any).setR2L(true);
  }
  return PDF_ARABIC_FONT_FAMILY;
}

async function loadImageAsDataUrl(
  rawUrl: string
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  const url = normalizeText(rawUrl);
  if (!url) return null;

  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) return null;

    const blob = await response.blob();
    const mime = String(blob.type || '').toLowerCase();
    const format: 'PNG' | 'JPEG' | null = mime.includes('jpeg') || mime.includes('jpg')
      ? 'JPEG'
      : mime.includes('png')
        ? 'PNG'
        : null;
    if (!format) return null;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    return dataUrl ? { dataUrl, format } : null;
  } catch {
    return null;
  }
}

export async function downloadLabV2RunMoisturePdf(options: {
  run: RunForPrint;
  settings: LabV2RunPrintSettings;
  logoUrl?: string | null;
  logoScale?: number | null;
}): Promise<void> {
  const model = buildSheetModel(options);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pdfFontFamily = await ensurePdfArabicFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;

  const testSnapshot = (model.run.test_snapshot || {}) as Record<string, any>;
  const params = (Array.isArray(model.run.params_snapshot) ? model.run.params_snapshot : []) as LabV2TestParameter[];
  const parameter = getPrimaryParameter(params);
  const sortedMeasurements = (model.run.measurements || [])
    .slice()
    .sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));

  pdf.setDrawColor(148, 163, 184);
  pdf.setTextColor(15, 23, 42);
  pdf.setFillColor(248, 250, 252);
  pdf.setFont(pdfFontFamily, 'normal');

  const headerY = margin;
  const headerHeight = 30;
  const docMetaWidth = 64;
  const logoWidth = 30;
  const titleWidth = contentWidth - docMetaWidth - logoWidth;
  const metaX = margin;
  const titleX = metaX + docMetaWidth;
  const logoX = titleX + titleWidth;

  pdf.rect(margin, headerY, contentWidth, headerHeight);
  pdf.line(titleX, headerY, titleX, headerY + headerHeight);
  pdf.line(logoX, headerY, logoX, headerY + headerHeight);

  const docMetaLines = [
    `رمز الوثيقة: ${normalizeText(model.settings.doc_code) || '—'}`,
    `الإصدار: ${normalizeText(model.settings.issue_no) || '—'}`,
    `تاريخ الإصدار: ${normalizeText(model.settings.issue_date) || '—'}`,
    `المراجعة: ${normalizeText(model.settings.review_no) || '—'}`,
    `تاريخ المراجعة: ${normalizeText(model.settings.review_date) || '—'}`,
  ];

  pdf.setFontSize(8.7);
  let metaY = headerY + 5.5;
  for (const line of docMetaLines) {
    pdf.text(line, titleX - 2, metaY, { align: 'right' });
    metaY += 5;
  }

  pdf.setFont(pdfFontFamily, 'bold');
  pdf.setFontSize(13);
  pdf.text(
    normalizeText(model.documentTitle) || 'تقرير فحص',
    titleX + titleWidth / 2,
    headerY + headerHeight / 2 + 1,
    { align: 'center' }
  );
  pdf.setFont(pdfFontFamily, 'normal');

  const logo = await loadImageAsDataUrl(model.logoUrl);
  if (logo) {
    const rawScale = Number.isFinite(model.logoScale) && model.logoScale > 0 ? model.logoScale : 1;
    const scale = Math.max(0.5, Math.min(rawScale, 1.6));
    const baseW = 18;
    const baseH = 14;
    const logoW = Math.min(baseW * scale, logoWidth - 4);
    const logoH = Math.min(baseH * scale, headerHeight - 4);
    const logoDrawX = logoX + (logoWidth - logoW) / 2;
    const logoDrawY = headerY + (headerHeight - logoH) / 2;
    pdf.addImage(logo.dataUrl, logo.format, logoDrawX, logoDrawY, logoW, logoH, undefined, 'FAST');
  }

  let cursorY = headerY + headerHeight + 4;

  autoTable(pdf, {
    startY: cursorY,
    theme: 'grid',
    styles: {
      font: pdfFontFamily,
      fontSize: 9.6,
      cellPadding: 2.2,
      halign: 'right',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'right' },
      1: { cellWidth: 69, halign: 'right' },
      2: { cellWidth: 24, fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'right' },
      3: { cellWidth: 'auto', halign: 'right' },
    },
    body: [
      ['رقم الفحص', normalizeText(model.run.run_number) || '—', 'اسم الفحص', normalizeText(testSnapshot.name_ar || testSnapshot.name) || '—'],
      ['الباتش', normalizeText(model.run.batch_number_snapshot) || '—', 'الوردية', normalizeText(model.run.shift_snapshot) || '—'],
      ['المشغل', normalizeText(model.run.operator_name) || '—', 'بداية التسجيل', formatDateTime(model.run.started_at || model.run.created_at)],
    ],
  });

  cursorY = ((pdf as any).lastAutoTable?.finalY || cursorY) + 5;

  pdf.setFont(pdfFontFamily, 'bold');
  pdf.setFontSize(10.5);
  pdf.text(`المعامل: ${model.parameterLabel || '—'}`, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 5.4;
  pdf.text(`المواصفة: ${model.specText || '—'}`, pageWidth - margin, cursorY, { align: 'right' });
  pdf.setFont(pdfFontFamily, 'normal');

  const resultRows = sortedMeasurements.length
    ? sortedMeasurements.map((measurement) => {
        const row = resolveRowValue(measurement, parameter);
        return [
          String(measurement.measurement_no || '—'),
          formatTimeOnly(measurement.measured_at),
          row.valueText,
          row.notesText,
          row.evaluationText,
        ];
      })
    : [['—', '—', '—', 'لا توجد نتائج مسجلة', '—']];

  const notesColWidth = contentWidth - (12 + 24 + 38 + 24);

  autoTable(pdf, {
    startY: cursorY + 3,
    theme: 'grid',
    head: [['م', 'الوقت', 'النتيجة', 'الملاحظات', 'مطابق']],
    body: resultRows,
    styles: {
      font: pdfFontFamily,
      fontSize: 10,
      cellPadding: 2.4,
      halign: 'right',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: notesColWidth, halign: 'right' },
      4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
    },
  });

  cursorY = ((pdf as any).lastAutoTable?.finalY || cursorY) + 6;
  if (cursorY > pageHeight - 12) {
    pdf.addPage();
    cursorY = margin;
  }

  pdf.setFontSize(9);
  pdf.text(`تاريخ التصدير: ${model.printedAt}`, pageWidth - margin, cursorY, { align: 'right' });
  if (normalizeText(model.settings.footer_note)) {
    pdf.text(normalizeText(model.settings.footer_note), margin, cursorY, {
      align: 'left',
      maxWidth: contentWidth - 45,
    });
  }

  pdf.save(buildFileName(model.run));
}

function printHtmlInWindow(printWindow: Window, html: string): boolean {
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
    return true;
  } catch {
    return false;
  }
}

function printHtmlInHiddenFrame(html: string): boolean {
  if (typeof document === 'undefined') return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'lab-run-print-frame');
  iframe.style.position = 'fixed';
  iframe.style.bottom = '0';
  iframe.style.right = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1200);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  try {
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
  } catch {
    iframe.remove();
    return false;
  }

  const images = Array.from(frameDocument.images || []);
  if (images.length === 0) {
    window.setTimeout(triggerPrint, 450);
    return true;
  }

  let pending = images.length;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    triggerPrint();
  };
  const onImageDone = () => {
    pending -= 1;
    if (pending <= 0) finish();
  };

  images.forEach((image) => {
    if (image.complete) {
      onImageDone();
      return;
    }
    image.addEventListener('load', onImageDone, { once: true });
    image.addEventListener('error', onImageDone, { once: true });
  });

  window.setTimeout(finish, 2500);
  return true;
}

export function printLabV2RunMoistureSheet(options: {
  run: RunForPrint;
  settings: LabV2RunPrintSettings;
  logoUrl?: string | null;
  logoScale?: number | null;
  targetWindow?: Window | null;
}): void {
  const model = buildSheetModel(options);
  const styles = buildSheetStyles(model.logoScale);
  const markup = buildSheetMarkup(model);

  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(model.documentTitle)} - ${escapeHtml(model.run.run_number)}</title>
        <style>${styles}</style>
      </head>
      <body>${markup}</body>
    </html>
  `;

  if (options.targetWindow && printHtmlInWindow(options.targetWindow, html)) {
    return;
  }

  if (printHtmlInHiddenFrame(html)) {
    return;
  }

  const popupWindow = window.open('', '_blank', 'width=1200,height=900,resizable=yes,scrollbars=yes');
  if (!popupWindow || !printHtmlInWindow(popupWindow, html)) {
    throw new Error('تعذر تجهيز نافذة التصدير. تحقق من إعدادات المتصفح للطباعة.');
  }
}
