import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import { useLabV2OpenInTab } from '../hooks/useLabV2OpenInTab';
import { useLabV2Runs } from '../hooks/useTestRuns';
import RunStatusBadge from '../components/runs/RunStatusBadge';
import type { LabV2RunStatus } from '../types/run.types';

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'approved', label: 'معتمد' },
  { value: 'rejected', label: 'مرفوض' },
];

const TestRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openTestRunInTab } = useLabV2OpenInTab();

  const [status, setStatus] = useState<string>('');
  const { data: runs, isLoading } = useLabV2Runs({ status: status || undefined });

  const sorted = useMemo(() => (runs || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [runs]);

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">سجل الفحوصات</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">تشغيل الفحوصات واعتماد النتائج</p>
          </div>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => navigate('/lab/tests/runs/new')}>
            فحص جديد
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-56">
              <Select label="الحالة" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{isLoading ? 'جاري التحميل...' : `عدد السجلات: ${sorted.length}`}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/40">
                <tr className="text-slate-600 dark:text-slate-300">
                  <th className="text-right px-4 py-3 font-semibold">رقم</th>
                  <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                  <th className="text-right px-4 py-3 font-semibold">المشغل</th>
                  <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.run_number}</td>
                    <td className="px-4 py-3">
                      <RunStatusBadge status={r.status as LabV2RunStatus} />
                    </td>
                    <td className="px-4 py-3">{r.evaluation_result || '—'}</td>
                    <td className="px-4 py-3">{r.operator_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openTestRunInTab(r.id, r.run_number)}>
                          فتح بتبويب
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/lab/tests/runs/${r.id}`)}>
                          فتح
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && sorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                      لا توجد فحوصات
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

export default TestRunsPage;
