import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import * as productService from '../../../services/productService';
import { useCompanyStore } from '../../../store/companyStore';
import { useAppSettingsStore } from '../../../store/appSettingsStore';
import { useToastStore } from '../../../store/toastStore';
import { useLabV2OpenInTab } from '../hooks/useLabV2OpenInTab';
import { useLabV2Devices } from '../hooks/useDevices';
import {
  useCreateLabV2Run,
  useLabV2ReportContextForProduct,
  useLabV2Runs,
} from '../hooks/useTestRuns';
import { useLabV2TestDefinition, useLabV2Tests } from '../hooks/useTests';
import RunStatusBadge from '../components/runs/RunStatusBadge';
import type { LabV2RunStatus } from '../types/run.types';
import type { Product } from '../../../types/product';
import type { LabV2TestFamily } from '../types/test.types';

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'approved', label: 'معتمد' },
  { value: 'rejected', label: 'مرفوض' },
];

const evaluationLabels: Record<string, string> = {
  pass: 'مطابق',
  fail: 'غير مطابق',
  warning: 'تحذير',
  na: 'غير متاح',
};

function getRunResultLabel(run: { status?: string | null; evaluation_result?: string | null; results_count?: number | null }): string {
  const normalized = String(run.evaluation_result || '').toLowerCase();
  if (normalized) return evaluationLabels[normalized] || run.evaluation_result || '—';
  const resultsCount = Number(run.results_count || 0);
  if (resultsCount > 0) return `تم إدخال نتائج (${resultsCount})`;
  if (run.status === 'in_progress' || run.status === 'completed' || run.status === 'approved') return 'تم إدخال نتائج';
  return '—';
}

const TestRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openTestRunInTab } = useLabV2OpenInTab();
  const { selectedCompanyId } = useCompanyStore();
  const { logoUrl, logoScale } = useAppSettingsStore();
  const toast = useToastStore.getState();

  const [status, setStatus] = useState<string>('');
  const { data: runs, isLoading } = useLabV2Runs({ status: status || undefined });
  const { data: tests, isLoading: testsLoading } = useLabV2Tests({ activeOnly: true });
  const { data: devices, isLoading: devicesLoading } = useLabV2Devices({ status: 'active' });
  const createRun = useCreateLabV2Run();
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [launchTestId, setLaunchTestId] = useState('');
  const [launchProductId, setLaunchProductId] = useState('');
  const [launchBatchNumber, setLaunchBatchNumber] = useState('');
  const [launchShift, setLaunchShift] = useState('');
  const [launchDeviceId, setLaunchDeviceId] = useState('');
  const [launchNotes, setLaunchNotes] = useState('');

  useEffect(() => {
    productService.getProducts(selectedCompanyId || undefined).then(setProducts).catch(() => setProducts([]));
  }, [selectedCompanyId]);

  const selectedTest = useMemo(
    () => (tests || []).find((test) => test.id === launchTestId) || null,
    [tests, launchTestId]
  );
  const selectedTestFamily = (selectedTest?.test_family || '') as LabV2TestFamily | '';
  const isIpcTest = selectedTestFamily === 'ipc';
  const { data: selectedTestDefinition } = useLabV2TestDefinition(launchTestId || undefined);

  const productLinks = useMemo(
    () =>
      (selectedTestDefinition?.product_links || [])
        .filter((link) => link.is_active !== false)
        .map((link) => link.product_id),
    [selectedTestDefinition]
  );

  const productOptions = useMemo(() => {
    if (!isIpcTest) return [];
    return (products || [])
      .filter((product) => productLinks.includes(product.id))
      .map((product) => ({ value: product.id, label: product.name }));
  }, [isIpcTest, products, productLinks]);

  const reportContext = useLabV2ReportContextForProduct(isIpcTest ? launchProductId || undefined : undefined);
  const availableBatches = reportContext.data?.availableBatches || [];
  const availableShiftsByBatch = reportContext.data?.availableShiftsByBatch || {};
  const availableShifts = availableShiftsByBatch[launchBatchNumber] || [];
  const latestReportIdByBatchShift = reportContext.data?.latestReportIdByBatchShift || {};

  const allowedDeviceIds = useMemo(
    () => (selectedTestDefinition?.device_links || []).map((link) => link.device_id),
    [selectedTestDefinition]
  );
  const deviceOptions = useMemo(() => {
    const baseDevices = devices || [];
    const filtered = allowedDeviceIds.length
      ? baseDevices.filter((device) => allowedDeviceIds.includes(device.id))
      : baseDevices;
    return filtered.map((device) => ({
      value: device.id,
      label: `${device.code} - ${device.name_ar || device.name}`,
    }));
  }, [devices, allowedDeviceIds]);

  useEffect(() => {
    setLaunchProductId('');
    setLaunchBatchNumber('');
    setLaunchShift('');
    setLaunchDeviceId('');
  }, [launchTestId]);

  useEffect(() => {
    setLaunchBatchNumber('');
    setLaunchShift('');
  }, [launchProductId]);

  useEffect(() => {
    setLaunchShift('');
  }, [launchBatchNumber]);

  useEffect(() => {
    if (deviceOptions.length === 0) {
      setLaunchDeviceId('');
      return;
    }
    if (!deviceOptions.some((option) => option.value === launchDeviceId)) {
      setLaunchDeviceId(deviceOptions[0].value);
    }
  }, [deviceOptions, launchDeviceId]);

  const sorted = useMemo(() => (runs || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [runs]);

  const canLaunch = useMemo(() => {
    if (!launchTestId || !launchDeviceId) return false;
    if (!isIpcTest) return true;
    if (!launchProductId) return false;
    if (availableBatches.length === 0) return false;
    if (!launchBatchNumber) return false;
    if (availableShifts.length === 0) return false;
    if (!launchShift) return false;
    return true;
  }, [
    launchTestId,
    launchDeviceId,
    isIpcTest,
    launchProductId,
    availableBatches.length,
    launchBatchNumber,
    availableShifts.length,
    launchShift,
  ]);

  const launchRun = async () => {
    if (!canLaunch) return;

    const sourceReportId =
      latestReportIdByBatchShift[`${launchBatchNumber}::${launchShift}`] ||
      latestReportIdByBatchShift[`${launchBatchNumber}::`] ||
      null;

    const run = await createRun.mutateAsync({
      test_id: launchTestId,
      product_id: isIpcTest ? launchProductId : null,
      device_id: launchDeviceId,
      notes: launchNotes || null,
      batch_number_snapshot: isIpcTest ? launchBatchNumber : null,
      shift_snapshot: isIpcTest ? launchShift : null,
      source_report_instance_id: isIpcTest ? sourceReportId : null,
      batch_id: null,
    });

    openTestRunInTab(run.id, run.run_number, { navigateToTab: true, returnPath: '/lab/tests/runs' });
  };

  const handleExportPdf = async (runId: string) => {
    setExportingRunId(runId);
    try {
      const [
        { labV2TestRunService },
        { getLabV2RunPrintSettings },
        { printLabV2RunMoistureSheet },
      ] = await Promise.all([
        import('../services/testRunService'),
        import('../services/runPrintSettingsService'),
        import('../utils/runPrint'),
      ]);

      const [runData, printSettings] = await Promise.all([
        labV2TestRunService.getRunById(runId),
        getLabV2RunPrintSettings(),
      ]);

      if (!runData) {
        throw new Error('تعذر تحميل بيانات الفحص المطلوبة للطباعة');
      }

      printLabV2RunMoistureSheet({
        run: runData,
        settings: printSettings,
        logoUrl,
        logoScale,
      });
    } catch (error: any) {
      toast.error('فشل حفظ ملف PDF', error?.message || String(error));
    } finally {
      setExportingRunId(null);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">سجل الفحوصات</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">تشغيل الفحوصات وتسجيل النتائج</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/lab/tests/catalog')}>
            كتالوج الفحوصات
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">بدء تسجيل فحص</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">اختر الفحص وسياق التشغيل ثم ابدأ التسجيل في تبويب داخلي جديد.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="الفحص"
              value={launchTestId}
              onChange={(e) => setLaunchTestId(e.target.value)}
              options={[
                { value: '', label: testsLoading ? 'جاري تحميل الفحوصات...' : 'اختر الفحص...' },
                ...((tests || []).map((test) => ({
                  value: test.id,
                  label: `${test.code} - ${test.name_ar || test.name}`,
                }))),
              ]}
            />

            {isIpcTest ? (
              <Select
                label="المنتج"
                value={launchProductId}
                onChange={(e) => setLaunchProductId(e.target.value)}
                options={[
                  {
                    value: '',
                    label: productOptions.length > 0 ? 'اختر المنتج...' : 'لا توجد منتجات مرتبطة بالفحص',
                  },
                  ...productOptions,
                ]}
              />
            ) : null}

            {isIpcTest ? (
              <Select
                label="الباتش (من التقارير)"
                value={launchBatchNumber}
                onChange={(e) => setLaunchBatchNumber(e.target.value)}
                options={[
                  {
                    value: '',
                    label: reportContext.isLoading
                      ? 'جاري تحميل الباتشات...'
                      : !launchProductId
                        ? 'اختر المنتج أولاً'
                      : availableBatches.length > 0
                        ? 'اختر الباتش...'
                        : 'لا توجد باتشات لهذا المنتج',
                  },
                  ...availableBatches.map((batch) => ({ value: batch, label: batch })),
                ]}
              />
            ) : null}

            {isIpcTest ? (
              <Select
                label="الوردية (من التقارير)"
                value={launchShift}
                onChange={(e) => setLaunchShift(e.target.value)}
                options={[
                  {
                    value: '',
                    label: !launchProductId
                      ? 'اختر المنتج أولاً'
                      : launchBatchNumber
                      ? availableShifts.length > 0
                        ? 'اختر الوردية...'
                        : 'لا توجد ورديات لهذه الباتشة'
                      : 'اختر الباتش أولاً',
                  },
                  ...availableShifts.map((shift) => ({ value: shift, label: shift })),
                ]}
              />
            ) : null}

            <Select
              label="الجهاز"
              value={launchDeviceId}
              onChange={(e) => setLaunchDeviceId(e.target.value)}
              options={[
                {
                  value: '',
                  label: devicesLoading
                    ? 'جاري تحميل الأجهزة...'
                    : deviceOptions.length > 0
                      ? 'اختر الجهاز...'
                      : 'لا توجد أجهزة متاحة',
                },
                ...deviceOptions,
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ملاحظات (اختياري)</label>
            <textarea
              value={launchNotes}
              onChange={(e) => setLaunchNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="أدخل أي ملاحظات قبل بدء الفحص"
            />
          </div>

          {isIpcTest && launchProductId && !reportContext.isLoading && availableBatches.length === 0 ? (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              لا يمكن بدء فحص IPC: لا توجد تقارير مسجلة لهذا المنتج تحتوي على Batch.
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            <Button onClick={launchRun} isLoading={createRun.isPending} disabled={!canLaunch || createRun.isPending}>
              بدء التسجيل
            </Button>
          </div>
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
                    <td className="px-4 py-3">{getRunResultLabel(r as any)}</td>
                    <td className="px-4 py-3">{r.operator_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void handleExportPdf(r.id);
                          }}
                          isLoading={exportingRunId === r.id}
                          disabled={exportingRunId !== null}
                        >
                          حفظ PDF
                        </Button>
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
