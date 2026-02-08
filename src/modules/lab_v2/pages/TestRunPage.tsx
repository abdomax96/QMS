import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from '../../../hooks/useDebounce';
import { useTabsStore } from '../../../store/tabsStore';
import { useToastStore } from '../../../store/toastStore';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import { useCompanyStore } from '../../../store/companyStore';
import * as productService from '../../../services/productService';
import { supabase } from '../../../config/supabase';
import type { Product } from '../../../types/product';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { useLabV2Devices, useLabV2Device } from '../hooks/useDevices';
import { useLabV2Tests } from '../hooks/useTests';
import { labV2TestRunService } from '../services/testRunService';
import { useLabV2Run, useCompleteLabV2Run, useApproveLabV2Run, useRejectLabV2Run } from '../hooks/useTestRuns';
import RunStatusBadge from '../components/runs/RunStatusBadge';
import CalibrationWarning from '../components/runs/CalibrationWarning';
import ValidationMessage from '../components/runs/ValidationMessage';
import { evaluateLabV2ParameterValue } from '../utils/evaluateSpec';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../types/test.types';
import type { LabV2RunMaterial, LabV2RunMeasurement, LabV2RunValue, LabV2TestRun } from '../types/run.types';

interface BatchOption {
  id: string;
  batch_number: string;
  production_date?: string | null;
  status?: string | null;
}

type RunSheetRow = {
  id: string; // client-side row id
  test_id: string;
  device_id: string;
  time_hhmm: string; // e.g. "14:30"
  notes: string;
  run?: LabV2TestRun;
  creating?: boolean;
  error?: string | null;
};

type RunWithDetails = LabV2TestRun & { values: LabV2RunValue[]; materials: LabV2RunMaterial[] };

function nowHHMM(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function isoToHHMM(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return nowHHMM(d);
}

function hhmmToTodayIso(hhmm: string): string | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function hhmmToIsoOnBase(baseIso: string | null | undefined, hhmm: string): string | null {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const base = baseIso ? new Date(baseIso) : new Date();
  if (Number.isNaN(base.getTime())) return hhmmToTodayIso(hhmm);

  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function bestRuleForParam(rules: LabV2AcceptanceRule[] | undefined, parameter: LabV2TestParameter): LabV2AcceptanceRule | null {
  if (!rules?.length) return null;
  const matches = rules.filter((r) => r.parameter_id === parameter.id);
  const list = (matches.length ? matches : rules.filter((r) => r.test_id === parameter.test_id)).slice();
  if (!list.length) return null;
  list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return list[0] || null;
}

function formatParamSpec(rule: LabV2AcceptanceRule | null, parameter: LabV2TestParameter): string {
  if (!rule) return '—';
  if (rule.rule_type === 'numeric_range') {
    const min = rule.spec_min ?? null;
    const max = rule.spec_max ?? null;
    const unit = rule.spec_unit || parameter.unit || '';
    const range = `${min != null ? min : '—'} - ${max != null ? max : '—'}`;
    return unit ? `${range} ${unit}` : range;
  }
  if (rule.rule_type === 'allowed_values' || rule.rule_type === 'multi_select') {
    const allowed = Array.isArray(rule.allowed_values) ? rule.allowed_values.map(String).filter(Boolean) : [];
    return allowed.length ? allowed.join('، ') : '—';
  }
  return '—';
}

function buildValuesByKeyFromDb(values: LabV2RunValue[] | undefined, paramsSnapshot: LabV2TestParameter[]): Record<string, any> {
  const fromDb: Record<string, any> = {};
  const paramByKey = new Map(paramsSnapshot.map((p) => [p.param_key, p]));

  for (const rv of values || []) {
    const p = paramByKey.get(rv.param_key);
    if (p?.data_type === 'number') {
      fromDb[rv.param_key] = rv.numeric_value != null ? String(rv.numeric_value) : (rv.value ?? '');
    } else if (p?.data_type === 'multi_select') {
      const raw = rv.value || '';
      try {
        const parsed = JSON.parse(raw);
        fromDb[rv.param_key] = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        fromDb[rv.param_key] = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
      }
    } else {
      fromDb[rv.param_key] = rv.value ?? '';
    }
  }

  // Apply defaults for missing params
  for (const p of paramsSnapshot) {
    if (fromDb[p.param_key] == null || fromDb[p.param_key] === '') {
      if (p.default_value) fromDb[p.param_key] = p.default_value;
    }
  }

  return fromDb;
}

const TestRunPage: React.FC = () => {
  const navigate = useNavigate();
  const { runId } = useParams();
  const isNew = runId === 'new';
  const [searchParams] = useSearchParams();

  // Tabs integration: mark dirty to prevent accidental close
  const tab = useTabsStore((s) => s.tabs.find((t) => t.type === 'instance' && t.formId === (runId || '')));
  const updateTabState = useTabsStore((s) => s.updateTabState);
  const markDirty = useTabsStore((s) => s.markDirty);

  const toast = useToastStore.getState();

  // ============= New run wizard state =============
  const { selectedCompanyId } = useCompanyStore();
  const { data: tests } = useLabV2Tests({ activeOnly: true });
  const { data: devices } = useLabV2Devices({ status: 'active' });
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [sheetRows, setSheetRows] = useState<RunSheetRow[]>([]);
  const [completingAll, setCompletingAll] = useState(false);

  const [valuesModalOpen, setValuesModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [modalRun, setModalRun] = useState<RunWithDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalValuesByKey, setModalValuesByKey] = useState<Record<string, any>>({});
  const [modalNotes, setModalNotes] = useState<string>('');

  useEffect(() => {
    if (!isNew) return;
    productService.getProducts(selectedCompanyId || undefined).then(setProducts).catch(() => setProducts([]));
  }, [isNew, selectedCompanyId]);

  // Prefill from query params (used by batch integration)
  useEffect(() => {
    if (!isNew) return;
    const preProduct = searchParams.get('product_id') || '';
    const preBatch = searchParams.get('batch_id') || '';
    if (preProduct) setProductId(preProduct);
    if (preBatch) setBatchId(preBatch);
  }, [isNew, searchParams]);

  useEffect(() => {
    if (!isNew) return;

    const loadBatches = async () => {
      try {
        let query = supabase
          .from('pallet_batches')
          .select('id, batch_number, production_date, status')
          .order('created_at', { ascending: false })
          .limit(200);

        if (selectedCompanyId) query = query.eq('company_id', selectedCompanyId);
        if (productId) query = query.eq('product_id', productId);

        const { data, error } = await query;
        if (error) throw error;
        setBatches((data || []) as any);
      } catch {
        setBatches([]);
      }
    };

    loadBatches();
  }, [isNew, selectedCompanyId, productId]);

  // Initialize a fresh sheet when entering `/lab/tests/runs/new`.
  useEffect(() => {
    if (!isNew) return;

    const preTest = searchParams.get('test_id') || '';
    const preDevice = searchParams.get('device_id') || '';

    const rowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSheetRows([
      {
        id: rowId,
        test_id: preTest,
        device_id: preDevice,
        time_hhmm: nowHHMM(),
        notes: '',
        error: null,
      },
    ]);

    // Reset modal state
    setValuesModalOpen(false);
    setActiveRowId(null);
    setActiveRunId(null);
    setModalRun(null);
    setModalValuesByKey({});
    setModalNotes('');
  }, [isNew, searchParams]);

  // Load run details into the values modal when opened.
  useEffect(() => {
    if (!valuesModalOpen) return;
    if (!activeRunId) return;

    let cancelled = false;

    const load = async () => {
      setModalLoading(true);
      try {
        const run = await labV2TestRunService.getRunById(activeRunId);
        if (cancelled) return;
        if (!run) throw new Error('Run not found');

        const runWithDetails = run as RunWithDetails;
        const paramsSnapshot = ((runWithDetails as any)?.params_snapshot || []) as LabV2TestParameter[];
        const paramByKey = new Map(paramsSnapshot.map((p) => [p.param_key, p]));

        const fromDb: Record<string, any> = {};
        for (const rv of runWithDetails.values || []) {
          const p = paramByKey.get(rv.param_key);
          if (p?.data_type === 'number') {
            fromDb[rv.param_key] = rv.numeric_value != null ? String(rv.numeric_value) : (rv.value ?? '');
          } else if (p?.data_type === 'multi_select') {
            const raw = rv.value || '';
            try {
              const parsed = JSON.parse(raw);
              fromDb[rv.param_key] = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch {
              fromDb[rv.param_key] = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
            }
          } else {
            fromDb[rv.param_key] = rv.value ?? '';
          }
        }

        // Apply defaults for missing params
        for (const p of paramsSnapshot) {
          if (fromDb[p.param_key] == null || fromDb[p.param_key] === '') {
            if (p.default_value) fromDb[p.param_key] = p.default_value;
          }
        }

        setModalRun(runWithDetails);
        setModalValuesByKey(fromDb);
        setModalNotes(runWithDetails.notes || '');
      } catch (e: any) {
        toast.error('فشل تحميل بيانات الفحص', e?.message);
        setModalRun(null);
        setModalValuesByKey({});
        setModalNotes('');
      } finally {
        if (!cancelled) setModalLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [valuesModalOpen, activeRunId, toast]);

  // ============= Existing run state =============
  const { data: runData, isLoading } = useLabV2Run(!isNew ? (runId as string) : undefined);
  const completeRun = useCompleteLabV2Run();
  const approveRun = useApproveLabV2Run();
  const rejectRun = useRejectLabV2Run();

  const paramsSnapshot = useMemo(() => {
    return ((runData as any)?.params_snapshot || []) as LabV2TestParameter[];
  }, [runData]);

  const rulesSnapshot = useMemo(() => {
    return ((runData as any)?.rules_snapshot || []) as LabV2AcceptanceRule[];
  }, [runData]);

  const { data: deviceData } = useLabV2Device(runData?.device_id || undefined);

  const measurements = useMemo(() => {
    const list = (((runData as any)?.measurements || []) as LabV2RunMeasurement[]).slice();
    list.sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));
    return list;
  }, [runData]);

  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null);
  const [activeMeasurementTimeHHMM, setActiveMeasurementTimeHHMM] = useState<string>('');

  const [valuesByKey, setValuesByKey] = useState<Record<string, any>>({});
  const [localNotes, setLocalNotes] = useState<string>('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const initializedRunIdRef = useRef<string | null>(null);

  // Initialize local state from DB + (first) tab snapshot
  useEffect(() => {
    if (isNew) return;
    if (!runData) return;
    if (initializedRunIdRef.current === runData.id) return;
    initializedRunIdRef.current = runData.id;

    // Prefer tab persisted state when present (resume)
    const tabValues = (tab?.state as any)?.valuesByKey as Record<string, any> | undefined;
    const tabNotes = (tab?.state as any)?.notes as string | undefined;
    const tabMeasurementId = (tab?.state as any)?.measurementId as string | undefined;

    const dbMeasurements = (((runData as any)?.measurements || []) as LabV2RunMeasurement[]).slice();
    dbMeasurements.sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));

    const latest = dbMeasurements[dbMeasurements.length - 1] || null;
    const selected = (tabMeasurementId ? dbMeasurements.find((m) => m.id === tabMeasurementId) : null) || latest;

    setActiveMeasurementId(selected?.id || null);
    setActiveMeasurementTimeHHMM(isoToHHMM(selected?.measured_at || runData.started_at || runData.created_at));

    const fromDb = buildValuesByKeyFromDb(selected?.values || (runData.values || []), paramsSnapshot);
    const canUseTabValues = Boolean(tabMeasurementId) && selected?.id === tabMeasurementId && tabValues;

    setValuesByKey(canUseTabValues ? (tabValues as any) : fromDb);
    setLocalNotes(typeof tabNotes === 'string' ? tabNotes : (runData.notes || ''));
  }, [isNew, runData?.id]);

  // Persist local state into tab store (marks dirty)
  useEffect(() => {
    if (isNew) return;
    if (!runData?.id) return;
    if (!tab?.id) return;

    updateTabState(tab.id, { measurementId: activeMeasurementId, valuesByKey, notes: localNotes });
  }, [isNew, runData?.id, tab?.id, updateTabState, activeMeasurementId, valuesByKey, localNotes]);

  const buildUpsertPayload = () => {
    const paramsByKey = new Map(paramsSnapshot.map((p) => [p.param_key, p]));
    const out: Array<{ parameter_id: string; param_key: string; value?: string | null; numeric_value?: number | null }> = [];

    for (const [key, raw] of Object.entries(valuesByKey)) {
      const p = paramsByKey.get(key);
      if (!p) continue;

      if (p.data_type === 'number') {
        const s = raw == null ? '' : String(raw);
        const n = s.trim() === '' ? null : Number(s);
        out.push({
          parameter_id: p.id,
          param_key: key,
          value: s.trim() === '' ? null : s,
          numeric_value: Number.isFinite(n as any) ? (n as number) : null,
        });
      } else if (p.data_type === 'multi_select') {
        const arr = Array.isArray(raw) ? raw.map(String) : [];
        out.push({
          parameter_id: p.id,
          param_key: key,
          value: arr.length ? JSON.stringify(arr) : null,
          numeric_value: null,
        });
      } else {
        const s = raw == null ? '' : String(raw);
        out.push({
          parameter_id: p.id,
          param_key: key,
          value: s.trim() === '' ? null : s,
          numeric_value: null,
        });
      }
    }

    return out;
  };

  const autoSave = useDebouncedCallback(async () => {
    if (isNew) return;
    if (!runData) return;

    try {
      setAutoSaveStatus('saving');

      const payload = buildUpsertPayload();
      if (activeMeasurementId && paramsSnapshot.length && payload.length > 0) {
        await labV2TestRunService.saveRunValues({
          run_id: runData.id,
          measurement_id: activeMeasurementId,
          values: payload,
          params_snapshot: paramsSnapshot,
          rules_snapshot: rulesSnapshot,
        });
      }
      // Persist notes best-effort (separate from values).
      await labV2TestRunService.updateRun(runData.id, { notes: localNotes || null });
      setAutoSaveStatus('idle');

      if (tab?.id) {
        markDirty(tab.id, false);
      }
    } catch (e) {
      console.error('Auto-save failed:', e);
      setAutoSaveStatus('error');
    }
  }, 900);

  // Kick autosave on changes (only after init)
  useEffect(() => {
    if (isNew) return;
    if (!runData) return;
    autoSave();
  }, [isNew, runData?.id, activeMeasurementId, valuesByKey, localNotes, autoSave]);

  if (isNew) {
    const testOptions = (tests || []).map((t) => ({ value: t.id, label: `${t.code} - ${t.name_ar || t.name}` }));
    const deviceOptions = (devices || []).map((d) => ({ value: d.id, label: `${d.code} - ${d.name_ar || d.name}` }));
    const productOptions = (products || []).map((p) => ({ value: p.id, label: p.name }));
    const batchOptions = (batches || []).map((b) => ({ value: b.id, label: `${b.batch_number}${b.production_date ? ` (${b.production_date})` : ''}` }));

    const addRow = () => {
      setSheetRows((prev) => {
        const last = prev[prev.length - 1];
        const rowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return [
          ...prev,
          {
            id: rowId,
            test_id: last?.test_id || '',
            device_id: last?.device_id || '',
            time_hhmm: nowHHMM(),
            notes: '',
            error: null,
          },
        ];
      });
    };

    const removeRow = (rowId: string) => {
      setSheetRows((prev) => prev.filter((r) => r.id !== rowId));
    };

    const updateRow = (rowId: string, patch: Partial<RunSheetRow>) => {
      setSheetRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
    };

    const createRunForRow = async (rowId: string) => {
      const row = sheetRows.find((r) => r.id === rowId);
      if (!row) return;

      if (!row.test_id || !row.device_id) {
        toast.error('الرجاء اختيار الفحص والجهاز');
        return;
      }

      updateRow(rowId, { creating: true, error: null });
      try {
        const run = await labV2TestRunService.createRun({
          test_id: row.test_id,
          device_id: row.device_id,
          product_id: productId || null,
          batch_id: batchId || null,
          notes: row.notes || null,
        });

        const started_at = hhmmToTodayIso(row.time_hhmm);
        const updatedRun = started_at ? await labV2TestRunService.updateRun(run.id, { started_at }) : run;

        updateRow(rowId, { run: updatedRun, creating: false });
      } catch (e: any) {
        console.error(e);
        updateRow(rowId, { creating: false, error: e?.message || 'فشل إنشاء الفحص' });
        toast.error('فشل إنشاء الفحص', e?.message);
      }
    };

    const openValues = (row: RunSheetRow) => {
      if (!row.run?.id) return;
      setActiveRowId(row.id);
      setActiveRunId(row.run.id);
      setValuesModalOpen(true);
    };

    const closeValues = () => {
      setValuesModalOpen(false);
      setActiveRowId(null);
      setActiveRunId(null);
      setModalRun(null);
      setModalValuesByKey({});
      setModalNotes('');
    };

    const saveModal = async () => {
      if (!modalRun) return;

      const paramsSnapshot = ((modalRun as any)?.params_snapshot || []) as LabV2TestParameter[];
      const rulesSnapshot = ((modalRun as any)?.rules_snapshot || []) as LabV2AcceptanceRule[];
      const paramsByKey = new Map(paramsSnapshot.map((p) => [p.param_key, p]));

      const payload: Array<{ parameter_id: string; param_key: string; value?: string | null; numeric_value?: number | null }> = [];
      for (const [key, raw] of Object.entries(modalValuesByKey)) {
        const p = paramsByKey.get(key);
        if (!p) continue;

        if (p.data_type === 'number') {
          const s = raw == null ? '' : String(raw);
          const n = s.trim() === '' ? null : Number(s);
          payload.push({
            parameter_id: p.id,
            param_key: key,
            value: s.trim() === '' ? null : s,
            numeric_value: Number.isFinite(n as any) ? (n as number) : null,
          });
        } else if (p.data_type === 'multi_select') {
          const arr = Array.isArray(raw) ? raw.map(String) : [];
          payload.push({
            parameter_id: p.id,
            param_key: key,
            value: arr.length ? JSON.stringify(arr) : null,
            numeric_value: null,
          });
        } else {
          const s = raw == null ? '' : String(raw);
          payload.push({
            parameter_id: p.id,
            param_key: key,
            value: s.trim() === '' ? null : s,
            numeric_value: null,
          });
        }
      }

      setModalSaving(true);
      try {
        await labV2TestRunService.saveRunValues({
          run_id: modalRun.id,
          values: payload,
          params_snapshot: paramsSnapshot,
          rules_snapshot: rulesSnapshot,
        });
        await labV2TestRunService.updateRun(modalRun.id, { notes: modalNotes || null });

        const refreshed = await labV2TestRunService.getRunById(modalRun.id);
        if (refreshed) {
          setModalRun(refreshed as RunWithDetails);
          setSheetRows((prev) =>
            prev.map((r) => {
              if (r.run?.id !== modalRun.id) return r;
              return { ...r, run: refreshed as any, notes: modalNotes };
            })
          );
        }

        toast.success('تم حفظ النتائج');
      } catch (e: any) {
        console.error(e);
        toast.error('فشل حفظ النتائج', e?.message);
      } finally {
        setModalSaving(false);
      }
    };

    const completeAllRuns = async () => {
      const actionable = sheetRows.filter((r) => r.run?.id && (r.run.status === 'draft' || r.run.status === 'in_progress'));
      if (actionable.length === 0) {
        toast.error('لا توجد فحوصات جاهزة للإكمال');
        return;
      }

      setCompletingAll(true);
      try {
        const updates = new Map<string, LabV2TestRun>();
        for (const r of actionable) {
          const runId = r.run!.id;
          const updated = await labV2TestRunService.completeRun(runId, r.notes || null);
          updates.set(runId, updated);
        }

        setSheetRows((prev) =>
          prev.map((r) => {
            const runId = r.run?.id;
            if (!runId) return r;
            const next = updates.get(runId);
            return next ? { ...r, run: next } : r;
          })
        );

        toast.success('تم إكمال الفحوصات');
        navigate('/lab/tests/runs');
      } catch (e: any) {
        console.error(e);
        toast.error('فشل إكمال الفحوصات', e?.message);
      } finally {
        setCompletingAll(false);
      }
    };

    const modalParams = (((modalRun as any)?.params_snapshot || []) as LabV2TestParameter[]).slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const modalRules = ((modalRun as any)?.rules_snapshot || []) as LabV2AcceptanceRule[];
    const modalTest: any = (modalRun as any)?.test_snapshot || {};

    return (
      <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">بدء فحوصات مخبرية جديدة</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">جدول لإضافة الفحوصات وتسجيل القيم حتى الضغط على إكمال</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/lab/tests/runs')}>
                رجوع
              </Button>
              <Button onClick={completeAllRuns} isLoading={completingAll} disabled={completingAll}>
                إكمال
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="المنتج" options={[{ value: '', label: '—' }, ...productOptions]} value={productId} onChange={(e) => setProductId(e.target.value)} />
              <Select label="الباتش" options={[{ value: '', label: '—' }, ...batchOptions]} value={batchId} onChange={(e) => setBatchId(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={addRow}>
                إضافة فحص
              </Button>
              <div className="text-sm text-slate-600 dark:text-slate-400">عدد الصفوف: {sheetRows.length}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-850/40">
                  <tr className="text-slate-600 dark:text-slate-300">
                    <th className="text-right px-4 py-3 font-semibold">#</th>
                    <th className="text-right px-4 py-3 font-semibold">الفحص</th>
                    <th className="text-right px-4 py-3 font-semibold">الوقت</th>
                    <th className="text-right px-4 py-3 font-semibold">الجهاز</th>
                    <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                    <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                    <th className="text-right px-4 py-3 font-semibold">ملاحظات</th>
                    <th className="text-right px-4 py-3 font-semibold">القيم</th>
                    <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sheetRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 align-top">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{idx + 1}</td>

                      <td className="px-4 py-3 min-w-[260px]">
                        <select
                          value={row.test_id}
                          onChange={(e) => updateRow(row.id, { test_id: e.target.value })}
                          disabled={Boolean(row.run?.id)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">اختر...</option>
                          {testOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {row.run?.run_number ? <div className="mt-1 text-xs text-slate-500">#{row.run.run_number}</div> : null}
                      </td>

                      <td className="px-4 py-3 min-w-[120px]">
                        <input
                          type="time"
                          value={row.time_hhmm}
                          onChange={(e) => updateRow(row.id, { time_hhmm: e.target.value })}
                          onBlur={async () => {
                            if (!row.run?.id) return;
                            const started_at = hhmmToTodayIso(row.time_hhmm);
                            if (!started_at) return;
                            try {
                              const updated = await labV2TestRunService.updateRun(row.run.id, { started_at });
                              updateRow(row.id, { run: updated });
                            } catch (e: any) {
                              toast.error('فشل تحديث الوقت', e?.message);
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </td>

                      <td className="px-4 py-3 min-w-[240px]">
                        <select
                          value={row.device_id}
                          onChange={(e) => updateRow(row.id, { device_id: e.target.value })}
                          disabled={Boolean(row.run?.id)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">اختر...</option>
                          {deviceOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 min-w-[160px]">
                        {row.run?.evaluation_result ? <ValidationMessage result={row.run.evaluation_result} /> : <span className="text-slate-500">—</span>}
                      </td>

                      <td className="px-4 py-3 min-w-[120px]">
                        {row.run?.status ? <RunStatusBadge status={row.run.status} /> : <span className="text-slate-500">—</span>}
                      </td>

                      <td className="px-4 py-3 min-w-[280px]">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          onBlur={async () => {
                            if (!row.run?.id) return;
                            try {
                              const updated = await labV2TestRunService.updateRun(row.run.id, { notes: row.notes || null });
                              updateRow(row.id, { run: updated });
                            } catch (e: any) {
                              toast.error('فشل تحديث الملاحظات', e?.message);
                            }
                          }}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="ملاحظات هذا الفحص..."
                        />
                        {row.error ? <div className="mt-1 text-xs text-rose-600">{row.error}</div> : null}
                      </td>

                      <td className="px-4 py-3 min-w-[140px]">
                        {row.run?.id ? (
                          <Button variant="outline" size="sm" onClick={() => openValues(row)}>
                            إدخال القيم
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => createRunForRow(row.id)} isLoading={Boolean(row.creating)}>
                            بدء
                          </Button>
                        )}
                      </td>

                      <td className="px-4 py-3 min-w-[110px]">
                        <Button variant="ghost" size="sm" leftIcon={<TrashIcon className="w-4 h-4" />} onClick={() => removeRow(row.id)}>
                          حذف
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {sheetRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-600 dark:text-slate-400" colSpan={9}>
                        لا توجد صفوف. اضغط "إضافة فحص" للبدء.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <Modal
            isOpen={valuesModalOpen}
            onClose={closeValues}
            title={modalRun?.run_number ? `إدخال القيم - ${modalRun.run_number}` : 'إدخال القيم'}
            size="full"
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={closeValues}>
                  إغلاق
                </Button>
                <Button onClick={saveModal} isLoading={modalSaving} disabled={modalLoading || modalSaving || !modalRun}>
                  حفظ
                </Button>
              </div>
            }
          >
            {modalLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">جاري التحميل...</div>
            ) : !modalRun ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">لا توجد بيانات.</div>
            ) : (
              <div className="space-y-5" dir="rtl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-slate-600 dark:text-slate-300">الفحص</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {modalTest.code ? `${modalTest.code} - ${modalTest.name_ar || modalTest.name}` : modalRun.test_id}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      الحالة: <RunStatusBadge status={modalRun.status} />{' '}
                      {modalRun.evaluation_result ? (
                        <span className="mr-2">
                          <ValidationMessage result={modalRun.evaluation_result} />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    الوقت: {modalRun.started_at ? new Date(modalRun.started_at).toLocaleTimeString() : '—'}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">ملاحظات</div>
                  <textarea
                    className="w-full min-h-[80px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-850/40">
                        <tr className="text-slate-600 dark:text-slate-300">
                          <th className="text-right px-4 py-3 font-semibold">المعامل</th>
                          <th className="text-right px-4 py-3 font-semibold">القيمة</th>
                          <th className="text-right px-4 py-3 font-semibold">الوحدة</th>
                          <th className="text-right px-4 py-3 font-semibold">المواصفة</th>
                          <th className="text-right px-4 py-3 font-semibold">التقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {modalParams.map((p) => {
                          const label = p.label_ar || p.label || p.param_key;
                          const value = modalValuesByKey[p.param_key];
                          const rule = bestRuleForParam(modalRules, p);
                          const evaluation = evaluateLabV2ParameterValue(p, value, modalRules);

                          const commonInputClass =
                            'w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

                          return (
                            <tr key={p.param_key} className="align-top">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {label}
                                  {p.is_required ? <span className="text-rose-500 mr-1">*</span> : null}
                                </div>
                                {p.help_text ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.help_text}</div> : null}
                              </td>
                              <td className="px-4 py-3 min-w-[240px]">
                                {p.data_type === 'dropdown' ? (
                                  <select
                                    value={value ?? ''}
                                    onChange={(e) => setModalValuesByKey((prev) => ({ ...prev, [p.param_key]: e.target.value }))}
                                    className={commonInputClass}
                                  >
                                    <option value="">—</option>
                                    {(Array.isArray(p.allowed_values) ? p.allowed_values : []).map((v: any) => (
                                      <option key={String(v)} value={String(v)}>
                                        {String(v)}
                                      </option>
                                    ))}
                                  </select>
                                ) : p.data_type === 'multi_select' ? (
                                  <select
                                    multiple
                                    value={Array.isArray(value) ? value : []}
                                    onChange={(e) =>
                                      setModalValuesByKey((prev) => ({
                                        ...prev,
                                        [p.param_key]: Array.from(e.target.selectedOptions).map((o) => o.value),
                                      }))
                                    }
                                    className={commonInputClass}
                                  >
                                    {(Array.isArray(p.allowed_values) ? p.allowed_values : []).map((v: any) => (
                                      <option key={String(v)} value={String(v)}>
                                        {String(v)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={p.data_type === 'number' ? 'number' : p.data_type === 'date' ? 'date' : p.data_type === 'time' ? 'time' : 'text'}
                                    value={value ?? ''}
                                    onChange={(e) => setModalValuesByKey((prev) => ({ ...prev, [p.param_key]: e.target.value }))}
                                    className={commonInputClass}
                                    step={p.data_type === 'number' ? 'any' : undefined}
                                    min={p.data_type === 'number' ? (p.min_value ?? undefined) : undefined}
                                    max={p.data_type === 'number' ? (p.max_value ?? undefined) : undefined}
                                  />
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.unit || '—'}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatParamSpec(rule, p)}</td>
                              <td className="px-4 py-3">{evaluation ? <ValidationMessage result={evaluation.evaluation_result} message_ar={evaluation.message_ar} /> : <span className="text-slate-500">—</span>}</td>
                            </tr>
                          );
                        })}
                        {modalParams.length === 0 ? (
                          <tr>
                            <td className="px-4 py-10 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                              لا توجد معاملات في Snapshot لهذا الفحص.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    );
  }

  if (isLoading || !runData) {
    return (
      <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
        <div className="text-sm text-slate-600 dark:text-slate-400">جاري التحميل...</div>
      </div>
    );
  }

  const testSnapshot: any = (runData as any).test_snapshot || {};

  const isEditable = runData.status === 'draft' || runData.status === 'in_progress';
  const valuesDisabled = !isEditable || !activeMeasurementId;
  const activeMeasurementNo = measurements.find((m) => m.id === activeMeasurementId)?.measurement_no ?? null;

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-slate-600 dark:text-slate-300">رقم الفحص</div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{runData.run_number}</h1>
              <RunStatusBadge status={runData.status} />
              <span className="text-sm text-slate-600 dark:text-slate-300">النتيجة: {runData.evaluation_result || '—'}</span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {testSnapshot.code ? `${testSnapshot.code} - ${testSnapshot.name_ar || testSnapshot.name}` : '—'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 self-center">
              {autoSaveStatus === 'saving' ? 'جاري الحفظ...' : autoSaveStatus === 'error' ? 'فشل الحفظ التلقائي' : 'محفوظ'}
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  if (!activeMeasurementId) {
                    toast.error('الرجاء إضافة نتيجة للفحص أولاً');
                    return;
                  }

                  const payload = buildUpsertPayload();
                  if (paramsSnapshot.length && payload.length > 0) {
                    await labV2TestRunService.saveRunValues({
                      run_id: runData.id,
                      measurement_id: activeMeasurementId,
                      values: payload,
                      params_snapshot: paramsSnapshot,
                      rules_snapshot: rulesSnapshot,
                    });
                  }
                  await labV2TestRunService.updateRun(runData.id, { notes: localNotes || null });
                  toast.success('تم حفظ المسودة');
                  if (tab?.id) markDirty(tab.id, false);
                } catch (e: any) {
                  toast.error('فشل الحفظ', e?.message);
                }
              }}
              disabled={!isEditable}
            >
              حفظ مسودة
            </Button>
            <Button
              onClick={() => completeRun.mutate({ run_id: runData.id, notes: localNotes || null })}
              isLoading={completeRun.isPending}
              disabled={!isEditable}
            >
              إكمال
            </Button>
          </div>
        </div>

        <CalibrationWarning calibration_due_date={deviceData?.calibration_due_date || null} />

        {(() => {
          const active = measurements.find((m) => m.id === activeMeasurementId) || null;
          const measurementResult = (m: LabV2RunMeasurement): 'pass' | 'fail' | 'warning' | 'na' => {
            if (m.evaluation_result) return m.evaluation_result as any;
            const vals = (m.values || []) as LabV2RunValue[];
            if (!vals.length) return 'na';
            return vals.some((v) => Boolean(v.out_of_spec)) ? 'fail' : 'pass';
          };

          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">نتائج الفحص</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">يمكن إضافة أكثر من نتيجة (مع توقيت) لنفس الفحص</div>
                </div>

                <div className="flex items-center gap-2">
                  {active ? (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-600 dark:text-slate-300">وقت النتيجة #{active.measurement_no}</div>
                      <input
                        type="time"
                        value={activeMeasurementTimeHHMM}
                        onChange={(e) => setActiveMeasurementTimeHHMM(e.target.value)}
                        onBlur={async () => {
                          if (!active) return;
                          const nextIso = hhmmToIsoOnBase(active.measured_at || runData.started_at || runData.created_at, activeMeasurementTimeHHMM);
                          if (!nextIso) return;
                          if (active.measured_at && new Date(active.measured_at).toISOString() === nextIso) return;

                          try {
                            const updated = await labV2TestRunService.updateMeasurement(active.id, { measured_at: nextIso });
                            setActiveMeasurementTimeHHMM(isoToHHMM(updated.measured_at));
                            toast.success('تم تحديث وقت النتيجة');
                          } catch (e: any) {
                            toast.error('فشل تحديث الوقت', e?.message);
                          }
                        }}
                        disabled={!isEditable}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  ) : null}

                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const created = await labV2TestRunService.createMeasurement({
                          run_id: runData.id,
                          measured_at: runData.started_at || new Date().toISOString(),
                        });
                        setActiveMeasurementId(created.id);
                        setActiveMeasurementTimeHHMM(isoToHHMM(created.measured_at));
                        setValuesByKey(buildValuesByKeyFromDb([], paramsSnapshot));
                        toast.success('تمت إضافة نتيجة');
                      } catch (e: any) {
                        toast.error('فشل إضافة نتيجة', e?.message);
                      }
                    }}
                    disabled={!isEditable}
                  >
                    إضافة نتيجة
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-850/40">
                    <tr className="text-slate-600 dark:text-slate-300">
                      <th className="text-right px-4 py-3 font-semibold">#</th>
                      <th className="text-right px-4 py-3 font-semibold">الوقت</th>
                      <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                      <th className="text-right px-4 py-3 font-semibold">عدد القيم</th>
                      <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {measurements.map((m) => {
                      const isActive = m.id === activeMeasurementId;
                      const res = measurementResult(m);
                      const time = isoToHHMM(m.measured_at);
                      const count = (m.values || []).length;

                      return (
                        <tr key={m.id} className={isActive ? 'bg-primary-50/60 dark:bg-primary-900/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-850/40'}>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{m.measurement_no}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{time || '—'}</td>
                          <td className="px-4 py-3">{res ? <ValidationMessage result={res} /> : <span className="text-slate-500">—</span>}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{count}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={isActive ? 'outline' : 'ghost'}
                                onClick={() => {
                                  setActiveMeasurementId(m.id);
                                  setActiveMeasurementTimeHHMM(isoToHHMM(m.measured_at));
                                  setValuesByKey(buildValuesByKeyFromDb(m.values || [], paramsSnapshot));
                                }}
                              >
                                فتح
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {measurements.length === 0 ? (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                          لا توجد نتائج بعد. اضغط "إضافة نتيجة" للبدء.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">الطريقة</div>
          <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{testSnapshot.method_description || '—'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Standard: {testSnapshot.method_standard || '—'}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">نتائج المعاملات</div>
              {activeMeasurementId ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  نتيجة #{activeMeasurementNo ?? '—'} - الوقت: {activeMeasurementTimeHHMM || '—'}
                </div>
              ) : (
                <div className="text-xs text-rose-600">اختر/أضف نتيجة أولاً لتسجيل القيم</div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/40">
                <tr className="text-slate-600 dark:text-slate-300">
                  <th className="text-right px-4 py-3 font-semibold">المعامل</th>
                  <th className="text-right px-4 py-3 font-semibold">القيمة</th>
                  <th className="text-right px-4 py-3 font-semibold">الوحدة</th>
                  <th className="text-right px-4 py-3 font-semibold">المواصفة</th>
                  <th className="text-right px-4 py-3 font-semibold">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paramsSnapshot
                  .slice()
                  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                  .map((p) => {
                    const label = p.label_ar || p.label || p.param_key;
                    const value = valuesByKey[p.param_key];
                    const rule = bestRuleForParam(rulesSnapshot, p);
                    const evaluation = evaluateLabV2ParameterValue(p, value, rulesSnapshot);

                    const commonInputClass =
                      'w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

                    return (
                      <tr key={p.param_key} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {label}
                            {p.is_required ? <span className="text-rose-500 mr-1">*</span> : null}
                          </div>
                          {p.help_text ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.help_text}</div> : null}
                        </td>
                        <td className="px-4 py-3 min-w-[260px]">
                          {p.data_type === 'dropdown' ? (
                            <select
                              value={value ?? ''}
                              onChange={(e) => setValuesByKey((prev) => ({ ...prev, [p.param_key]: e.target.value }))}
                              disabled={valuesDisabled}
                              className={commonInputClass}
                            >
                              <option value="">—</option>
                              {(Array.isArray(p.allowed_values) ? p.allowed_values : []).map((v: any) => (
                                <option key={String(v)} value={String(v)}>
                                  {String(v)}
                                </option>
                              ))}
                            </select>
                          ) : p.data_type === 'multi_select' ? (
                            <select
                              multiple
                              value={Array.isArray(value) ? value : []}
                              onChange={(e) =>
                                setValuesByKey((prev) => ({
                                  ...prev,
                                  [p.param_key]: Array.from(e.target.selectedOptions).map((o) => o.value),
                                }))
                              }
                              disabled={valuesDisabled}
                              className={commonInputClass}
                            >
                              {(Array.isArray(p.allowed_values) ? p.allowed_values : []).map((v: any) => (
                                <option key={String(v)} value={String(v)}>
                                  {String(v)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={p.data_type === 'number' ? 'number' : p.data_type === 'date' ? 'date' : p.data_type === 'time' ? 'time' : 'text'}
                              value={value ?? ''}
                              onChange={(e) => setValuesByKey((prev) => ({ ...prev, [p.param_key]: e.target.value }))}
                              disabled={valuesDisabled}
                              className={commonInputClass}
                              step={p.data_type === 'number' ? 'any' : undefined}
                              min={p.data_type === 'number' ? (p.min_value ?? undefined) : undefined}
                              max={p.data_type === 'number' ? (p.max_value ?? undefined) : undefined}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.unit || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatParamSpec(rule, p)}</td>
                        <td className="px-4 py-3">
                          {evaluation ? <ValidationMessage result={evaluation.evaluation_result} message_ar={evaluation.message_ar} /> : <span className="text-slate-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}

                {paramsSnapshot.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-600 dark:text-slate-400" colSpan={5}>
                      لا توجد معاملات في Snapshot لهذا الفحص.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">ملاحظات</div>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            disabled={!isEditable}
          />
        </div>

        {runData.status === 'completed' ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">اعتماد QA</div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => approveRun.mutate({ run_id: runData.id, notes: 'تم الاعتماد' })}
                isLoading={approveRun.isPending}
              >
                اعتماد
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = window.prompt('سبب الرفض؟') || '';
                  if (!reason.trim()) return;
                  rejectRun.mutate({ run_id: runData.id, reason });
                }}
                isLoading={rejectRun.isPending}
              >
                رفض
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TestRunPage;
