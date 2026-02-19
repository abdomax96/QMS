import { supabase } from '../../config/supabase';
import type { NcrRecord } from '../../types/ncr';
import { WORKFLOW_STAGES, getSeverityLabel } from '../../types/ncr';

const A4_STYLE = `
@page { size: A4; margin: 6mm 10mm 8mm 10mm; }
body { font-family: 'Tajawal', 'Cairo', 'Arial', sans-serif; margin: 0; padding: 0; background: #f5f7fb; direction: rtl; }
.page { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 6mm 12mm 10mm 12mm; box-sizing: border-box; page-break-after: avoid; }
.header { display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; gap: 4px; }
.title { text-align: center; font-size: 22px; font-weight: 800; color: #111827; line-height: 1.4; }
.meta-table { border-collapse: collapse; font-size: 11px; color: #111827; width: 100%; }
.meta-table td { padding: 2px 4px; }
.meta-table .label { color: #6b7280; }
.section { margin-bottom: 16px; }
.section h3 { margin: 0 0 8px; font-size: 14px; color: #111827; border-right: 4px solid #ef4444; padding-right: 8px; }
.table { width: 100%; border-collapse: collapse; font-size: 12px; }
.table th, .table td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: right; vertical-align: top; }
.table th { background: #f3f4f6; font-weight: 700; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
.stage { background: #eef2ff; color: #4338ca; }
.severity-low { background: #ecfdf3; color: #15803d; }
.severity-medium { background: #fffbeb; color: #b45309; }
.severity-high { background: #fef2f2; color: #b91c1c; }
.footer { margin-top: 18px; padding-top: 12px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; }
@media print {
  body { background: #fff; }
  .page { box-shadow: none; }
}
`;

type DocMeta = {
  docCode: string;
  issueNo: string;
  revisionNo: string;
  issueDate: string;
  reviewDate: string;
};

type HoldSortLogRow = {
  sorted_qty: number | string | null;
  destroyed_qty: number | string | null;
  sorted_at: string | null;
  notes: string | null;
};

const fetchDocMeta = async (): Promise<DocMeta> => {
  const { data } = await supabase
    .from('settings')
    .select('ncr_document_meta')
    .eq('id', 'global')
    .maybeSingle();

  const meta = (data?.ncr_document_meta as Partial<DocMeta> | null) ?? {};
  return {
    docCode: meta.docCode ?? '-01FRM-NCR',
    issueNo: meta.issueNo ?? '1',
    revisionNo: meta.revisionNo ?? '0',
    issueDate: meta.issueDate ?? '2026-01-01',
    reviewDate: meta.reviewDate ?? '2026-12-31',
  };
};

const fetchCompanyName = async (companyId?: string | null) => {
  if (!companyId) return '-';
  const { data } = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle();
  return data?.name || companyId;
};

const fetchUserDepartmentName = async (userId?: string | null) => {
  if (!userId) return '-';
  const { data } = await supabase
    .from('user_departments')
    .select('departments(name), is_primary')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false, nullsLast: true })
    .limit(1)
    .maybeSingle();
  return (data as any)?.departments?.name || '-';
};

const fetchHoldSortLogs = async (ncrId: string): Promise<HoldSortLogRow[]> => {
  const { data } = await supabase
    .from('ncr_hold_sort_logs')
    .select('sorted_qty, destroyed_qty, sorted_at, notes')
    .eq('ncr_id', ncrId)
    .order('sorted_at', { ascending: true });

  return (data || []) as HoldSortLogRow[];
};

const roleLabel = (role?: 'department' | 'quality') => {
  if (role === 'quality') return 'ضبط الجودة';
  if (role === 'department') return 'القسم المختص';
  return '-';
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
};

const escapeHtml = (value: unknown) =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export async function printNcrReport(ncr: NcrRecord) {
  const meta = await fetchDocMeta();
  const companyName = await fetchCompanyName(ncr.companyId);
  const proposedDept = await fetchUserDepartmentName(ncr.rootCauseApproval?.proposedBy);
  const reviewedDept = await fetchUserDepartmentName(ncr.rootCauseApproval?.reviewedBy);
  const holdSortLogs = await fetchHoldSortLogs(ncr.id);
  const stageInfo = WORKFLOW_STAGES[ncr.currentStage] || WORKFLOW_STAGES.initial_report;
  const severityClass = ncr.severity === 'high' ? 'severity-high' : ncr.severity === 'medium' ? 'severity-medium' : 'severity-low';
  const reservedQty = Number(ncr.reservedQty || 0);
  const legacySortedQty = (ncr.holds || []).reduce((sum, h) => sum + Number(h.quantity || 0), 0);
  const totalSortedQty = holdSortLogs.length
    ? holdSortLogs.reduce((sum, row) => sum + Number(row.sorted_qty || 0), 0)
    : legacySortedQty;
  const totalDestroyedQty = holdSortLogs.reduce((sum, row) => sum + Number(row.destroyed_qty || 0), 0);
  const remainingQty = Math.max(0, reservedQty - totalSortedQty);

  const actionsRows = (ncr.actions || []).map((a) => `
    <tr>
      <td>${escapeHtml(a.description)}</td>
      <td>${escapeHtml(a.responsibleDept)}</td>
      <td>${escapeHtml(a.responsiblePerson)}</td>
      <td>${formatDate(a.targetDate)}</td>
      <td>${a.status}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">لا توجد إجراءات CAPA</td></tr>';

  const verification = ncr.verification;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>طباعة تقرير NCR - ${escapeHtml(ncr.number)}</title>
  <style>${A4_STYLE}</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <table class="meta-table">
        <tr><td class="label">رمز الوثيقة:</td><td>${escapeHtml(meta.docCode)}</td></tr>
        <tr><td class="label">رقم الإصدار:</td><td>${escapeHtml(meta.issueNo)}</td></tr>
        <tr><td class="label">رقم المراجعة:</td><td>${escapeHtml(meta.revisionNo)}</td></tr>
      </table>
      <div class="title">
        <div>تقرير عدم مطابقة (NCR)</div>
        <div style="margin-top:4px; font-size:12px; color:#4b5563;">رقم التقرير: <span style="font-weight:700; font-family:monospace; color:#111827;">${escapeHtml(ncr.number)}</span></div>
      </div>
      <table class="meta-table" style="text-align:left;">
        <tr><td class="label">تاريخ الإصدار:</td><td>${escapeHtml(meta.issueDate)}</td></tr>
        <tr><td class="label">تاريخ المراجعة:</td><td>${escapeHtml(meta.reviewDate)}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>بيانات أساسية</h3>
      <table class="table">
        <tbody>
          <tr>
            <th style="width:150px;">التاريخ</th><td>${formatDate(ncr.date)}</td>
            <th style="width:140px;">القسم</th><td>${escapeHtml(ncr.department)}</td>
          </tr>
          <tr>
            <th>الشركة</th><td>${escapeHtml(companyName)}</td>
            <th>الوردية</th><td>${ncr.shift || '-'}</td>
          </tr>
          <tr>
            <th>اسم المنتج</th><td>${escapeHtml(ncr.productName || '-')}</td>
            <th>الخط / الموقع</th><td>${escapeHtml(ncr.lineOrArea || '-')}</td>
          </tr>
          <tr>
            <th>المبلّغ</th><td>${escapeHtml(ncr.discoveredBy || '-')}</td>
            <th>أنشئ بواسطة</th><td>${escapeHtml(ncr.createdBy || '-')}</td>
          </tr>
          <tr>
            <th>المرحلة الحالية</th><td><span class="badge stage">${stageInfo.name}</span></td>
            <th>الخطورة</th><td><span class="badge ${severityClass}">${getSeverityLabel(ncr.severity)}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>الوصف والإجراء الفوري</h3>
      <table class="table">
        <tbody>
          <tr><th style="width:160px;">الوصف</th><td colspan="3">${escapeHtml(ncr.description || '-')}</td></tr>
          <tr><th>الإجراء الفوري</th><td colspan="3">${escapeHtml(ncr.immediateAction || '-')}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>السبب الجذري</h3>
      <table class="table">
        <tbody>
          <tr>
            <th style="width:160px;">السبب</th><td colspan="3">${escapeHtml(ncr.rootCause || '-')}</td>
          </tr>
          <tr>
            <th> بواسطة</th><td>${escapeHtml(ncr.rootCauseApproval?.proposedByName || '-')}</td>
            <th>قسم</th><td>${escapeHtml(proposedDept)}</td>
          </tr>
          <tr>
            <th>وافق عليه</th><td>${escapeHtml(ncr.rootCauseApproval?.reviewedByName || '-')}</td>
            <th>قسم</th><td>${escapeHtml(reviewedDept)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>إجراءات CAPA</h3>
      <table class="table">
        <thead>
          <tr>
            <th>الوصف</th><th>القسم</th><th>المسؤول</th><th>تاريخ الاستهداف</th><th>الحالة</th>
          </tr>
        </thead>
        <tbody>${actionsRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>ملخص المحتجزات والفرز</h3>
      <table class="table">
        <tbody>
          <tr>
            <th style="width:180px;">الكمية المحجوزة</th><td>${escapeHtml(ncr.reservedQty || '0')} ${escapeHtml(ncr.reservedUnit || '')}</td>
            <th style="width:180px;">إجمالي المفرز</th><td>${escapeHtml(totalSortedQty)} ${escapeHtml(ncr.reservedUnit || '')}</td>
          </tr>
          <tr>
            <th>إجمالي المتهلك</th><td>${escapeHtml(totalDestroyedQty)} ${escapeHtml(ncr.reservedUnit || '')}</td>
            <th>الكمية المتبقية</th><td>${escapeHtml(remainingQty)} ${escapeHtml(ncr.reservedUnit || '')}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>التحقق والإغلاق</h3>
      <table class="table">
        <tbody>
          <tr><th style="width:160px;">التحقق</th><td colspan="3">${verification ? escapeHtml(verification.notes || '-') : '-'}</td></tr>
          <tr><th>النتيجة</th><td>${verification ? verification.result : '-'}</td><th style="width:160px;">المحقق</th><td>${verification ? escapeHtml(verification.verifiedBy || '-') : '-'}</td></tr>
          <tr><th>تاريخ الإغلاق</th><td>${formatDate(ncr.closedAt)}</td><th>تاريخ الإنشاء</th><td>${formatDate(ncr.createdAt)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>تم الطباعة في: ${new Date().toLocaleString('ar-EG')}</span>
      <span>معتمد</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة لإتمام الطباعة');
    return;
  }
  win.document.write(html);
  win.document.close();
}
