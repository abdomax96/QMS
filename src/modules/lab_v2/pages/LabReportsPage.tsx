import React, { useMemo, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import { FormattedDateTime } from '../../../components/common/FormattedDate';
import RunStatusBadge from '../components/runs/RunStatusBadge';
import { useLabV2Runs } from '../hooks/useTestRuns';
import { useLabV2Tests } from '../hooks/useTests';
import { useNavigate } from 'react-router-dom';

type CsvRow = Record<string, string | number | null | undefined>;

const toCsv = (rows: CsvRow[]): string => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // CSV escaping: quote if contains comma, quote, or newline.
    if (/[\",\\n\\r]/.test(s)) return `\"${s.replace(/\"/g, '\"\"')}\"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  // Add BOM for Excel-friendly UTF-8 (Arabic)
  return '\ufeff' + lines.join('\n');
};

const downloadTextFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const LabReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [status, setStatus] = useState<string>('');
  const [evaluation, setEvaluation] = useState<string>('');
  const [testId, setTestId] = useState<string>('');

  const created_from = fromDate ? new Date(fromDate).toISOString() : undefined;
  const created_to = toDate
    ? (() => {
        const d = new Date(toDate);
        d.setUTCHours(23, 59, 59, 999);
        return d.toISOString();
      })()
    : undefined;

  const { data: tests } = useLabV2Tests({ activeOnly: false });
  const testsById = useMemo(() => new Map((tests || []).map(t => [t.id, t.name_ar || t.name])), [tests]);

  const runsQuery = useLabV2Runs({
    status: status || undefined,
    test_id: testId || undefined,
    evaluation_result: evaluation || undefined,
    created_from,
    created_to,
    limit: 500,
  });

  const runs = runsQuery.data || [];

  const stats = useMemo(() => {
    const s = {
      total: runs.length,
      pass: 0,
      fail: 0,
      warning: 0,
      na: 0,
      pending: 0,
    };

    for (const r of runs) {
      if (!r.evaluation_result) s.pending += 1;
      else if (r.evaluation_result === 'pass') s.pass += 1;
      else if (r.evaluation_result === 'fail') s.fail += 1;
      else if (r.evaluation_result === 'warning') s.warning += 1;
      else if (r.evaluation_result === 'na') s.na += 1;
      else s.pending += 1;
    }

    const denom = s.pass + s.fail;
    const passRate = denom > 0 ? Math.round((s.pass / denom) * 100) : 0;

    return { ...s, passRate };
  }, [runs]);

  const testOptions = useMemo(() => {
    const base = [{ value: '', label: 'كل الفحوصات' }];
    const items = (tests || [])
      .slice()
      .sort((a, b) => ((a.name_ar || a.name) < (b.name_ar || b.name) ? -1 : 1))
      .map(t => ({ value: t.id, label: t.name_ar || t.name }));
    return base.concat(items);
  }, [tests]);

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    { value: 'draft', label: 'مسودة' },
    { value: 'in_progress', label: 'قيد التنفيذ' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'approved', label: 'معتمد' },
    { value: 'rejected', label: 'مرفوض' },
  ];

  const evaluationOptions: { value: string; label: string }[] = [
    { value: '', label: 'كل النتائج' },
    { value: 'pass', label: 'ناجح (Pass)' },
    { value: 'fail', label: 'راسب (Fail)' },
    { value: 'warning', label: 'تحذير (Warning)' },
    { value: 'na', label: 'غير متاح (N/A)' },
  ];

  const exportCsv = () => {
    const rows: CsvRow[] = runs.map(r => ({
      run_number: r.run_number,
      created_at: r.created_at,
      status: r.status,
      evaluation_result: r.evaluation_result || '',
      test_name: testsById.get(r.test_id) || (r.test_snapshot as any)?.name_ar || (r.test_snapshot as any)?.name || '',
      operator_name: r.operator_name || '',
      approver_name: r.approver_name || '',
      notes: r.notes || '',
    }));

    const csv = toCsv(rows);
    const fileName = `lab_v2_reports_${fromDate || 'all'}_${toDate || 'all'}.csv`;
    downloadTextFile(fileName, csv, 'text/csv;charset=utf-8');
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">التقارير</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">فلترة وإحصائيات الفحوصات (آخر 500 سجل)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={<ArrowPathIcon className="w-4 h-4" />} onClick={() => runsQuery.refetch()}>
              تحديث
            </Button>
            <Button leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={exportCsv} disabled={runs.length === 0}>
              تصدير CSV
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input label="من تاريخ" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="إلى تاريخ" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Select label="الحالة" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            <Select label="النتيجة" options={evaluationOptions} value={evaluation} onChange={(e) => setEvaluation(e.target.value)} />
            <Select label="الفحص" options={testOptions} value={testId} onChange={(e) => setTestId(e.target.value)} />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">الإجمالي</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-700/60 p-3 bg-emerald-50/40 dark:bg-emerald-900/10">
              <div className="text-xs text-emerald-700 dark:text-emerald-300">ناجح</div>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{stats.pass}</div>
            </div>
            <div className="rounded-xl border border-rose-200/70 dark:border-rose-700/60 p-3 bg-rose-50/40 dark:bg-rose-900/10">
              <div className="text-xs text-rose-700 dark:text-rose-300">راسب</div>
              <div className="text-xl font-bold text-rose-800 dark:text-rose-200">{stats.fail}</div>
            </div>
            <div className="rounded-xl border border-amber-200/70 dark:border-amber-700/60 p-3 bg-amber-50/40 dark:bg-amber-900/10">
              <div className="text-xs text-amber-700 dark:text-amber-300">تحذير</div>
              <div className="text-xl font-bold text-amber-800 dark:text-amber-200">{stats.warning}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">N/A</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.na}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">نسبة النجاح (Pass/Fail)</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.passRate}%</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {runsQuery.isLoading ? 'جاري التحميل...' : `تم العثور على ${runs.length} سجل`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/40">
                <tr className="text-slate-600 dark:text-slate-300">
                  <th className="text-right px-4 py-3 font-semibold">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold">رقم</th>
                  <th className="text-right px-4 py-3 font-semibold">الفحص</th>
                  <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                  <th className="text-right px-4 py-3 font-semibold">المشغل</th>
                  <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {runs.map((r) => {
                  const name =
                    testsById.get(r.test_id) ||
                    (r.test_snapshot as any)?.name_ar ||
                    (r.test_snapshot as any)?.name ||
                    r.test_id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <FormattedDateTime date={r.created_at} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.run_number}</td>
                      <td className="px-4 py-3">{name}</td>
                      <td className="px-4 py-3">
                        <RunStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">{r.evaluation_result || '—'}</td>
                      <td className="px-4 py-3">{r.operator_name || '—'}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/lab/tests/runs/${r.id}`)}>
                          فتح
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!runsQuery.isLoading && runs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={7}>
                      لا توجد بيانات ضمن الفلاتر الحالية
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabReportsPage;
