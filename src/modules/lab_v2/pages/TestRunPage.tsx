import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { useLabV2Run, useCompleteLabV2Run } from '../hooks/useTestRuns';
import CalibrationWarning from '../components/runs/CalibrationWarning';
import ValidationMessage from '../components/runs/ValidationMessage';
import { evaluateLabV2ParameterValue } from '../utils/evaluateSpec';
import type { LabV2AcceptanceRule, LabV2TestFamily, LabV2TestParameter } from '../types/test.types';
import { LAB_TEST_FAMILY_LABELS } from '../types/test.types';
import type { LabV2RunMaterial, LabV2RunMaterialSelection, LabV2RunMeasurement, LabV2RunValue, LabV2TestRun } from '../types/run.types';

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

type RunWithDetails = LabV2TestRun & {
  measurements: LabV2RunMeasurement[];
  values: LabV2RunValue[];
  materials: LabV2RunMaterial[];
  material_selections?: LabV2RunMaterialSelection[];
};


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

function formatTimeWithEnglishDigits(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

function getRunEntryResultText(run: (LabV2TestRun & { values?: LabV2RunValue[] }) | null | undefined): string | null {
  if (!run) return null;
  const values = Array.isArray((run as any).values) ? (((run as any).values || []) as LabV2RunValue[]) : [];
  const filledCount = values.filter((value) => {
    const text = typeof value.value === 'string' ? value.value.trim() : '';
    return (value.numeric_value != null && Number.isFinite(Number(value.numeric_value))) || Boolean(text);
  }).length;

  if (filledCount > 0) return `تم إدخال ${filledCount} قيمة`;

  const status = String(run.status || '').toLowerCase();
  if (status === 'in_progress' || status === 'completed' || status === 'approved') {
    return 'تم إدخال نتائج';
  }

  return null;
}

function recomputeRunEvaluationFromMeasurements(measurements: LabV2RunMeasurement[] | undefined): {
  evaluation_result: 'pass' | 'fail' | 'warning' | 'na';
  failed_params: string[] | null;
} {
  const rows = (measurements || []).flatMap((measurement) => measurement.values || []);
  const norm = (value: any) => String(value || '').trim().toLowerCase();

  const hasFail = rows.some((row) => row.out_of_spec || norm(row.evaluation_result) === 'fail');
  const hasWarning = rows.some((row) => norm(row.evaluation_result) === 'warning');
  const hasPass = rows.some((row) => norm(row.evaluation_result) === 'pass');

  let evaluation_result: 'pass' | 'fail' | 'warning' | 'na' = 'na';
  if (hasFail) evaluation_result = 'fail';
  else if (hasWarning) evaluation_result = 'warning';
  else if (hasPass) evaluation_result = 'pass';

  const failed_params = Array.from(
    new Set(
      rows
        .filter((row) => row.out_of_spec || norm(row.evaluation_result) === 'fail')
        .map((row) => String(row.param_key || '').trim())
        .filter(Boolean)
    )
  );

  return {
    evaluation_result,
    failed_params: failed_params.length ? failed_params : null,
  };
}

const TestRunPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runId } = useParams();
  const isNew = runId === 'new';
  const [searchParams] = useSearchParams();

  // Tabs integration: mark dirty to prevent accidental close
  const tab = useTabsStore((s) => s.tabs.find((t) => t.type === 'instance' && t.formId === (runId || '')));
  const updateTabState = useTabsStore((s) => s.updateTabState);
  const markDirty = useTabsStore((s) => s.markDirty);

  const toast = useToastStore.getState();
  const invalidateRunQueries = (targetRunId: string) => {
    queryClient.invalidateQueries({ queryKey: ['lab_v2', 'run', targetRunId] });
    queryClient.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
  };
  const invalidateRunQueriesDebounced = useDebouncedCallback((targetRunId: string) => {
    queryClient.invalidateQueries({ queryKey: ['lab_v2', 'run', targetRunId] });
    queryClient.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
  }, 1800);

  const patchRunCache = (
    targetRunId: string,
    updater: (current: RunWithDetails) => RunWithDetails
  ) => {
    queryClient.setQueryData(['lab_v2', 'run', targetRunId], (previous: any) => {
      if (!previous) return previous;
      return updater(previous as RunWithDetails);
    });
  };

  // ============= New run wizard state =============
  const { selectedCompanyId } = useCompanyStore();
  const [productId, setProductId] = useState('');
  const { data: tests } = useLabV2Tests({ activeOnly: true, product_id: productId || undefined });
  const { data: devices } = useLabV2Devices({ status: 'active' });
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

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
  const [measurementTimeDrafts, setMeasurementTimeDrafts] = useState<Record<string, string>>({});

  const [valuesByKey, setValuesByKey] = useState<Record<string, any>>({});
  const [selectedParameterKey, setSelectedParameterKey] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');
  const [deletingMeasurementId, setDeletingMeasurementId] = useState<string | null>(null);
  const initializedRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    if (!paramsSnapshot.length) {
      setSelectedParameterKey('');
      return;
    }
    if (selectedParameterKey && paramsSnapshot.some((p) => p.param_key === selectedParameterKey)) return;
    const first = paramsSnapshot
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))[0];
    setSelectedParameterKey(first?.param_key || '');
  }, [isNew, paramsSnapshot, selectedParameterKey]);

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

  useEffect(() => {
    if (isNew) return;

    const nextDrafts = measurements.reduce<Record<string, string>>((acc, measurement) => {
      acc[measurement.id] = isoToHHMM(measurement.measured_at);
      return acc;
    }, {});

    setMeasurementTimeDrafts(nextDrafts);
  }, [isNew, measurements]);


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

  const focusMeasurement = (measurement: LabV2RunMeasurement) => {
    setActiveMeasurementId(measurement.id);
    setActiveMeasurementTimeHHMM(measurementTimeDrafts[measurement.id] ?? isoToHHMM(measurement.measured_at));
  };

  const saveMeasurementTime = async (measurement: LabV2RunMeasurement, nextHHMM: string) => {
    if (!runData?.id) return;

    const fallbackHHMM = isoToHHMM(measurement.measured_at || runData.started_at || runData.created_at);
    const normalizedHHMM = nextHHMM || fallbackHHMM;
    const nextIso = hhmmToIsoOnBase(
      measurement.measured_at || runData.started_at || runData.created_at,
      normalizedHHMM
    );

    if (!nextIso) {
      setMeasurementTimeDrafts((prev) => ({ ...prev, [measurement.id]: fallbackHHMM }));
      if (activeMeasurementId === measurement.id) setActiveMeasurementTimeHHMM(fallbackHHMM);
      return;
    }

    if (measurement.measured_at && new Date(measurement.measured_at).toISOString() === nextIso) {
      setMeasurementTimeDrafts((prev) => ({ ...prev, [measurement.id]: normalizedHHMM }));
      if (activeMeasurementId === measurement.id) setActiveMeasurementTimeHHMM(normalizedHHMM);
      return;
    }

    try {
      await labV2TestRunService.updateMeasurement(measurement.id, { measured_at: nextIso });
      patchRunCache(runData.id, (current) => ({
        ...current,
        measurements: (current.measurements || []).map((currentMeasurement) =>
          currentMeasurement.id === measurement.id
            ? { ...currentMeasurement, measured_at: nextIso }
            : currentMeasurement
        ),
      }));
      setMeasurementTimeDrafts((prev) => ({ ...prev, [measurement.id]: normalizedHHMM }));
      if (activeMeasurementId === measurement.id) setActiveMeasurementTimeHHMM(normalizedHHMM);
      invalidateRunQueriesDebounced(runData.id);
    } catch (err: any) {
      setMeasurementTimeDrafts((prev) => ({ ...prev, [measurement.id]: fallbackHHMM }));
      if (activeMeasurementId === measurement.id) setActiveMeasurementTimeHHMM(fallbackHHMM);
      toast.error('فشل تحديث الوقت', err?.message);
    }
  };

  const saveRunNotes = async (showSuccessToast: boolean): Promise<boolean> => {
    if (isNew || !runData) return true;
    const nextNotes = localNotes.trim();
    const currentNotes = String(runData.notes || '').trim();
    if (nextNotes === currentNotes) return true;

    try {
      await labV2TestRunService.updateRun(runData.id, { notes: nextNotes || null });
      patchRunCache(runData.id, (current) => ({ ...current, notes: nextNotes || null }));
      invalidateRunQueriesDebounced(runData.id);
      if (tab?.id) markDirty(tab.id, false);
      if (showSuccessToast) toast.success('تم حفظ المسودة');
      return true;
    } catch (e: any) {
      toast.error(showSuccessToast ? 'فشل الحفظ' : 'فشل حفظ الملاحظات', e?.message);
      return false;
    }
  };

  if (isNew) {
    const filteredTests = (tests || []).filter((t: any) => t.test_family !== 'ipc' || Boolean(productId));
    const testOptions = filteredTests.map((t: any) => ({
      value: t.id,
      label: `${t.code} - ${t.name_ar || t.name}${t.test_family ? ` (${LAB_TEST_FAMILY_LABELS[t.test_family as LabV2TestFamily] || t.test_family})` : ''}`,
    }));
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
        invalidateRunQueries(modalRun.id);

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
        queryClient.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });

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
            {!productId ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                اختر المنتج لإظهار فحوصات IPC المرتبطة به.
              </div>
            ) : null}
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
                    <th className="text-center px-4 py-3 font-semibold">النتيجة</th>
                    <th className="text-right px-4 py-3 font-semibold">ملاحظات</th>
                    <th className="text-right px-4 py-3 font-semibold">القيم</th>
                    <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sheetRows.map((row, idx) => {
                    const rowResultHint = getRunEntryResultText(row.run as (LabV2TestRun & { values?: LabV2RunValue[] }) | undefined);
                    return (
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
                          lang="en"
                          dir="ltr"
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

                      <td className="px-4 py-3 min-w-[160px] text-center">
                        <div className="flex items-center justify-center">
                          {row.run?.evaluation_result ? (
                            <ValidationMessage result={row.run.evaluation_result} />
                          ) : rowResultHint ? (
                            <span className="text-slate-600 dark:text-slate-300">{rowResultHint}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
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
                  )})}

                {sheetRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-600 dark:text-slate-400" colSpan={8}>
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
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    الوقت: {formatTimeWithEnglishDigits(modalRun.started_at)}
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
  const valuesDisabled = !isEditable;

  return (
    <div className="p-6 min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-slate-600 dark:text-slate-300">رقم الفحص</div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{runData.run_number}</h1>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {testSnapshot.code ? `${testSnapshot.code} - ${testSnapshot.name_ar || testSnapshot.name}` : '—'}
            </div>
            {runData.batch_number_snapshot || runData.shift_snapshot ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {runData.batch_number_snapshot ? `الباتش: ${runData.batch_number_snapshot}` : null}
                {runData.batch_number_snapshot && runData.shift_snapshot ? ' | ' : null}
                {runData.shift_snapshot ? `الوردية: ${runData.shift_snapshot}` : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await saveRunNotes(true);
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
              حفظ وإغلاق
            </Button>
          </div>
        </div>

        <CalibrationWarning calibration_due_date={deviceData?.calibration_due_date || null} />

        {(() => {
          const orderedParameters = paramsSnapshot
            .slice()
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          const selectedParameter = orderedParameters.find((p) => p.param_key === selectedParameterKey) || orderedParameters[0] || null;
          const selectedRule = selectedParameter ? bestRuleForParam(rulesSnapshot, selectedParameter) : null;
          const specText = selectedParameter ? formatParamSpec(selectedRule, selectedParameter) : '—';
          const unitText = selectedParameter?.unit || selectedRule?.spec_unit || '';

          const getValueRecord = (measurement: LabV2RunMeasurement): LabV2RunValue | null => {
            if (!selectedParameter) return null;
            const values = (measurement.values || []) as LabV2RunValue[];
            return values.find((v) => v.param_key === selectedParameter.param_key) || null;
          };

          const getRowRawValue = (measurement: LabV2RunMeasurement): string => {
            const record = getValueRecord(measurement);
            if (!record) return '';
            if (selectedParameter?.data_type === 'number') {
              if (record.numeric_value != null && Number.isFinite(Number(record.numeric_value))) return String(record.numeric_value);
              return String(record.value || '');
            }
            return String(record.value || '');
          };

          const saveMeasurementValue = async (measurementId: string, rawInput: string | string[]) => {
            if (!selectedParameter) return;

            let value: string | null = null;
            let numeric_value: number | null = null;

            if (selectedParameter.data_type === 'number') {
              const text = String(rawInput ?? '').trim();
              const num = text === '' ? null : Number(text);
              value = text || null;
              numeric_value = Number.isFinite(num as any) ? (num as number) : null;
            } else if (selectedParameter.data_type === 'multi_select') {
              const arr = Array.isArray(rawInput) ? rawInput.map(String).filter(Boolean) : [];
              value = arr.length ? JSON.stringify(arr) : null;
            } else {
              const text = String(rawInput ?? '').trim();
              value = text || null;
            }

            const spec = evaluateLabV2ParameterValue(
              selectedParameter,
              numeric_value ?? value ?? '',
              rulesSnapshot
            );
            const nowIso = new Date().toISOString();

            try {
              await labV2TestRunService.saveRunValues({
                run_id: runData.id,
                measurement_id: measurementId,
                values: [
                  {
                    parameter_id: selectedParameter.id,
                    param_key: selectedParameter.param_key,
                    value,
                    numeric_value,
                  },
                ],
                params_snapshot: paramsSnapshot,
                rules_snapshot: rulesSnapshot,
              });
              patchRunCache(runData.id, (current) => {
                const nextMeasurements = (current.measurements || []).map((measurement) => {
                  if (measurement.id !== measurementId) return measurement;

                  const currentValues = [...(measurement.values || [])];
                  const existingIndex = currentValues.findIndex((v) => v.param_key === selectedParameter.param_key);
                  const base = existingIndex >= 0 ? currentValues[existingIndex] : null;
                  const nextValue: LabV2RunValue = {
                    id: base?.id || `tmp_${measurementId}_${selectedParameter.param_key}`,
                    run_id: current.id,
                    measurement_id: measurementId,
                    parameter_id: selectedParameter.id,
                    param_key: selectedParameter.param_key,
                    value,
                    numeric_value,
                    evaluation_result: spec.evaluation_result,
                    out_of_spec: spec.out_of_spec,
                    notes: base?.notes || null,
                    created_at: base?.created_at || nowIso,
                    updated_at: nowIso,
                  };

                  if (existingIndex >= 0) {
                    currentValues[existingIndex] = nextValue;
                  } else {
                    currentValues.push(nextValue);
                  }

                  return { ...measurement, values: currentValues };
                });

                const sortedMeasurements = [...nextMeasurements].sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));
                const latestValues = (sortedMeasurements[sortedMeasurements.length - 1]?.values || []).slice();
                const aggregate = recomputeRunEvaluationFromMeasurements(nextMeasurements);

                return {
                  ...current,
                  measurements: nextMeasurements,
                  values: latestValues,
                  status: current.status === 'draft' ? 'in_progress' : current.status,
                  started_at: current.started_at || nowIso,
                  evaluation_result: aggregate.evaluation_result,
                  failed_params: aggregate.failed_params,
                };
              });
              invalidateRunQueriesDebounced(runData.id);
            } catch (e: any) {
              toast.error('فشل حفظ النتيجة', e?.message);
            }
          };

          const deleteMeasurementRow = async (measurement: LabV2RunMeasurement) => {
            if (!isEditable) return;
            const confirmed = window.confirm(`حذف الصف رقم ${measurement.measurement_no}؟`);
            if (!confirmed) return;

            setDeletingMeasurementId(measurement.id);
            try {
              await labV2TestRunService.deleteMeasurement(measurement.id);
              patchRunCache(runData.id, (current) => {
                const nextMeasurements = (current.measurements || []).filter((row) => row.id !== measurement.id);
                const sortedMeasurements = [...nextMeasurements].sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));
                const latestValues = (sortedMeasurements[sortedMeasurements.length - 1]?.values || []).slice();
                const aggregate = recomputeRunEvaluationFromMeasurements(nextMeasurements);

                return {
                  ...current,
                  measurements: nextMeasurements,
                  values: latestValues,
                  evaluation_result: aggregate.evaluation_result,
                  failed_params: aggregate.failed_params,
                };
              });
              invalidateRunQueriesDebounced(runData.id);

              if (activeMeasurementId === measurement.id) {
                const sortedRemaining = measurements
                  .filter((row) => row.id !== measurement.id)
                  .slice()
                  .sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));
                const next = sortedRemaining.length ? sortedRemaining[sortedRemaining.length - 1] : null;
                setActiveMeasurementId(next?.id || null);
                setActiveMeasurementTimeHHMM(isoToHHMM(next?.measured_at || runData.started_at || runData.created_at));
              }

              toast.success('تم حذف الصف');
            } catch (e: any) {
              toast.error('فشل حذف الصف', e?.message);
            } finally {
              setDeletingMeasurementId(null);
            }
          };

          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">نتائج الفحص</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">المواصفة بالأعلى، ويمكن تعديل وقت كل نتيجة مباشرة من عمود الوقت.</div>
                  </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[160px]">
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">وقت النتيجة</label>
                    <input
                      type="time"
                      lang="en"
                      dir="ltr"
                      value={activeMeasurementTimeHHMM}
                      onChange={(e) => {
                        const nextHHMM = e.target.value;
                        setActiveMeasurementTimeHHMM(nextHHMM);
                        if (activeMeasurementId) {
                          setMeasurementTimeDrafts((prev) => ({ ...prev, [activeMeasurementId]: nextHHMM }));
                        }
                      }}
                      onBlur={() => {
                        if (!activeMeasurementId) return;
                        const activeMeasurement = measurements.find((measurement) => measurement.id === activeMeasurementId);
                        if (!activeMeasurement) return;
                        void saveMeasurementTime(activeMeasurement, activeMeasurementTimeHHMM);
                      }}
                      disabled={!isEditable}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const baseMeasurementTime = runData.started_at || runData.created_at || new Date().toISOString();
                        const measuredAt =
                          hhmmToIsoOnBase(baseMeasurementTime, activeMeasurementTimeHHMM) ||
                          runData.started_at ||
                          new Date().toISOString();
                        const created = await labV2TestRunService.createMeasurement({
                          run_id: runData.id,
                          measured_at: measuredAt,
                        });
                        patchRunCache(runData.id, (current) => {
                          const existing = (current.measurements || []).some((m) => m.id === created.id);
                          if (existing) return current;
                          const nextMeasurements = [...(current.measurements || []), { ...created, values: [] as LabV2RunValue[] }]
                            .sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));
                          return { ...current, measurements: nextMeasurements };
                        });
                        invalidateRunQueriesDebounced(runData.id);
                        setActiveMeasurementId(created.id);
                        setActiveMeasurementTimeHHMM(isoToHHMM(created.measured_at));
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">المعامل</div>
                  {orderedParameters.length > 1 ? (
                    <select
                      value={selectedParameter?.param_key || ''}
                      onChange={(e) => setSelectedParameterKey(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {orderedParameters.map((p) => (
                        <option key={p.param_key} value={p.param_key}>
                          {p.label_ar || p.label || p.param_key}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedParameter ? (selectedParameter.label_ar || selectedParameter.label || selectedParameter.param_key) : '—'}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">المواصفة</div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{specText}</div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-850/40">
                    <tr className="text-slate-600 dark:text-slate-300">
                      <th className="text-right px-4 py-3 font-semibold">م</th>
                      <th className="text-right px-4 py-3 font-semibold">الوقت</th>
                      <th className="text-center px-4 py-3 font-semibold">النتيجة</th>
                      <th className="text-right px-4 py-3 font-semibold">ملاحظات</th>
                      <th className="text-right px-4 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {measurements.map((m) => {
                      const rowRawValue = getRowRawValue(m);
                      const evaluation = selectedParameter
                        ? evaluateLabV2ParameterValue(selectedParameter, rowRawValue, rulesSnapshot)
                        : null;
                      const defaultTime = isoToHHMM(m.measured_at);
                      const draftTime = measurementTimeDrafts[m.id] ?? defaultTime;
                      const inputClass =
                        'w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

                      return (
                        <tr key={m.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-850/40">
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{m.measurement_no}</td>
                          <td className="px-4 py-3 min-w-[130px]">
                            <input
                              type="time"
                              lang="en"
                              dir="ltr"
                              value={draftTime}
                              disabled={!isEditable}
                              className={inputClass}
                              onFocus={() => focusMeasurement(m)}
                              onChange={(e) => {
                                const nextHHMM = e.target.value;
                                setMeasurementTimeDrafts((prev) => ({ ...prev, [m.id]: nextHHMM }));
                                setActiveMeasurementId(m.id);
                                setActiveMeasurementTimeHHMM(nextHHMM);
                              }}
                              onBlur={async (e) => {
                                if (!isEditable) return;
                                await saveMeasurementTime(m, e.target.value || defaultTime);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 min-w-[300px]">
                            <div className="flex items-center justify-center gap-2">
                              {selectedParameter?.data_type === 'dropdown' ? (
                                <select
                                  defaultValue={rowRawValue}
                                  disabled={valuesDisabled || !selectedParameter}
                                  className={inputClass}
                                  onFocus={() => focusMeasurement(m)}
                                  onChange={(e) => {
                                    if ((e.target.value || '') === (rowRawValue || '')) return;
                                    void saveMeasurementValue(m.id, e.target.value);
                                  }}
                                >
                                  <option value="">—</option>
                                  {(Array.isArray(selectedParameter?.allowed_values) ? selectedParameter.allowed_values : []).map((option: any) => (
                                    <option key={String(option)} value={String(option)}>
                                      {String(option)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={selectedParameter?.data_type === 'number' ? 'number' : selectedParameter?.data_type === 'date' ? 'date' : selectedParameter?.data_type === 'time' ? 'time' : 'text'}
                                  defaultValue={rowRawValue}
                                  disabled={valuesDisabled || !selectedParameter}
                                  className={inputClass}
                                  step={selectedParameter?.data_type === 'number' ? 'any' : undefined}
                                  min={selectedParameter?.data_type === 'number' ? (selectedParameter.min_value ?? undefined) : undefined}
                                  max={selectedParameter?.data_type === 'number' ? (selectedParameter.max_value ?? undefined) : undefined}
                                  onFocus={() => focusMeasurement(m)}
                                  onBlur={(e) => {
                                    if ((e.target.value || '') === (rowRawValue || '')) return;
                                    void saveMeasurementValue(m.id, e.target.value);
                                  }}
                                />
                              )}
                              {unitText ? <span className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{unitText}</span> : null}
                              {evaluation ? <ValidationMessage result={evaluation.evaluation_result} message_ar={evaluation.message_ar} /> : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 min-w-[280px]">
                            <input
                              type="text"
                              defaultValue={m.notes || ''}
                              disabled={!isEditable}
                              className={inputClass}
                              placeholder="ملاحظات"
                              onFocus={() => focusMeasurement(m)}
                              onBlur={async (e) => {
                                if (!isEditable) return;
                                const nextNote = e.target.value.trim();
                                if ((m.notes || '') === nextNote) return;
                                try {
                                  await labV2TestRunService.updateMeasurement(m.id, { notes: nextNote || null });
                                  patchRunCache(runData.id, (current) => ({
                                    ...current,
                                    measurements: (current.measurements || []).map((measurement) =>
                                      measurement.id === m.id ? { ...measurement, notes: nextNote || null } : measurement
                                    ),
                                  }));
                                  invalidateRunQueriesDebounced(runData.id);
                                } catch (err: any) {
                                  toast.error('فشل حفظ الملاحظة', err?.message);
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 w-[90px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<TrashIcon className="w-4 h-4" />}
                              onClick={() => {
                                void deleteMeasurementRow(m);
                              }}
                              isLoading={deletingMeasurementId === m.id}
                              disabled={!isEditable || deletingMeasurementId !== null || measurements.length <= 1}
                              title={measurements.length <= 1 ? 'يجب بقاء صف واحد على الأقل' : 'حذف الصف'}
                            >
                              حذف
                            </Button>
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

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">ملاحظات</div>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900/30 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={async () => {
              if (!isEditable) return;
              await saveRunNotes(false);
            }}
            disabled={!isEditable}
          />
        </div>

      </div>
    </div>
  );
};

export default TestRunPage;
