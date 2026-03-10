import { supabase } from '../../../config/supabase';
import type {
  LabV2RunMaterial,
  LabV2RunMaterialSelection,
  LabV2RunMeasurement,
  LabV2RunValue,
  LabV2TestRun,
} from '../types/run.types';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../types/test.types';
import { evaluateLabV2ParameterValue } from '../utils/evaluateSpec';
import { generateLabV2RunNumberFallback } from '../utils/generateRunNumber';
import { getLabV2Context } from './labV2Context';
import { labV2TestService } from './testService';

function isSchemaCompatibilityError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const code = String(error?.code || '');
  return (
    code === '42703' ||
    code === '42P01' ||
    message.includes('column') ||
    message.includes('relation') ||
    message.includes('could not find') ||
    details.includes('relationship') ||
    hint.includes('relationship')
  );
}

type MaterialPlanSnapshot = {
  id?: string;
  step_id?: string | null;
  step_order?: number | null;
  step_title?: string | null;
  step_snapshot_key?: string | null;
  chemical_id: string;
  chemical_name?: string | null;
  planned_quantity: number;
  unit?: string | null;
  is_required?: boolean;
  selection_mode?: string | null;
};

function normalizeMaterialPlans(raw: any): MaterialPlanSnapshot[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const chemical_id = String(item?.chemical_id || '').trim();
      const planned_quantity = Number(item?.planned_quantity ?? 0);
      if (!chemical_id || !Number.isFinite(planned_quantity) || planned_quantity <= 0) return null;
      return {
        id: item?.id ? String(item.id) : undefined,
        step_id: item?.step_id ? String(item.step_id) : null,
        step_order: item?.step_order != null ? Number(item.step_order) : null,
        step_title: item?.step_title ? String(item.step_title) : null,
        step_snapshot_key: item?.step_snapshot_key ? String(item.step_snapshot_key) : null,
        chemical_id,
        chemical_name: item?.chemical_name ? String(item.chemical_name) : null,
        planned_quantity,
        unit: item?.unit ? String(item.unit) : null,
        is_required: item?.is_required !== false,
        selection_mode: item?.selection_mode ? String(item.selection_mode) : 'lot_manual',
      } as MaterialPlanSnapshot;
    })
    .filter(Boolean) as MaterialPlanSnapshot[];
}

function buildPlanSelectionKey(plan: MaterialPlanSnapshot): string {
  const stepKey =
    String(
      plan.step_snapshot_key ||
      plan.step_id ||
      (Number.isFinite(Number(plan.step_order)) ? `step_order_${Number(plan.step_order)}` : '')
    ).trim() || 'step_unknown';
  return `${stepKey}::${plan.chemical_id}`;
}

function normalizeTextValue(input: any): string {
  if (typeof input !== 'string') return '';
  return input.trim();
}

function extractBatchNumber(formData: Record<string, any> | null | undefined): string {
  if (!formData || typeof formData !== 'object') return '';
  return (
    normalizeTextValue((formData as any).batch_number) ||
    normalizeTextValue((formData as any).BatchNumber) ||
    normalizeTextValue((formData as any).batchNo) ||
    normalizeTextValue((formData as any).batch)
  );
}

function extractShiftValue(formData: Record<string, any> | null | undefined): string {
  if (!formData || typeof formData !== 'object') return '';
  return (
    normalizeTextValue((formData as any).shift) ||
    normalizeTextValue((formData as any).Shift) ||
    normalizeTextValue((formData as any)['وردية'])
  );
}

function toEvalText(value: any): string {
  return String(value || '').trim().toLowerCase();
}

export const labV2TestRunService = {
  async getReportBatchShiftContextForProduct(product_id: string): Promise<{
    availableBatches: string[];
    availableShiftsByBatch: Record<string, string[]>;
    latestReportIdByBatchShift: Record<string, string>;
  }> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) {
      return {
        availableBatches: [],
        availableShiftsByBatch: {},
        latestReportIdByBatchShift: {},
      };
    }

    const templateQuery = supabase
      .from('form_templates')
      .select('id')
      .contains('basic_info', { product_id });

    const scopedTemplateQuery = ctx.company_id
      ? templateQuery.or(`company_id.eq.${ctx.company_id},company_id.is.null`)
      : templateQuery;

    const { data: templates, error: templatesError } = await scopedTemplateQuery;
    if (templatesError) throw templatesError;
    const templateIds = (templates || []).map((t: any) => String(t.id || '').trim()).filter(Boolean);

    if (templateIds.length === 0) {
      return {
        availableBatches: [],
        availableShiftsByBatch: {},
        latestReportIdByBatchShift: {},
      };
    }

    let instancesQuery = supabase
      .from('form_instances')
      .select('id, form_data, created_at')
      .in('template_id', templateIds)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(500);

    if (ctx.company_id) {
      instancesQuery = instancesQuery.or(`company_id.eq.${ctx.company_id},company_id.is.null`);
    }

    const { data: instances, error: instancesError } = await instancesQuery;
    if (instancesError) throw instancesError;

    const batchesSet = new Set<string>();
    const shiftsByBatchSet = new Map<string, Set<string>>();
    const latestReportIdByBatchShift: Record<string, string> = {};

    for (const row of instances || []) {
      const formData = ((row as any).form_data || {}) as Record<string, any>;
      const batchNumber = extractBatchNumber(formData);
      if (!batchNumber) continue;

      batchesSet.add(batchNumber);
      if (!shiftsByBatchSet.has(batchNumber)) shiftsByBatchSet.set(batchNumber, new Set<string>());

      const shift = extractShiftValue(formData);
      if (shift) {
        shiftsByBatchSet.get(batchNumber)!.add(shift);
      }

      const reportId = String((row as any).id || '').trim();
      if (!reportId) continue;
      const pairKey = `${batchNumber}::${shift || ''}`;
      if (!latestReportIdByBatchShift[pairKey]) {
        latestReportIdByBatchShift[pairKey] = reportId;
      }
    }

    const availableBatches = Array.from(batchesSet).sort((a, b) => a.localeCompare(b, 'ar'));
    const availableShiftsByBatch: Record<string, string[]> = {};
    shiftsByBatchSet.forEach((shiftSet, batch) => {
      availableShiftsByBatch[batch] = Array.from(shiftSet).sort((a, b) => a.localeCompare(b, 'ar'));
    });

    return {
      availableBatches,
      availableShiftsByBatch,
      latestReportIdByBatchShift,
    };
  },

  async listRuns(filters?: {
    status?: string;
    test_id?: string;
    batch_id?: string;
    product_id?: string;
    device_id?: string;
    evaluation_result?: string;
    created_from?: string;
    created_to?: string;
    limit?: number;
    include_snapshots?: boolean;
  }): Promise<LabV2TestRun[]> {
    const ctx = await getLabV2Context();
    const includeSnapshots = filters?.include_snapshots === true;
    const selectColumns = includeSnapshots
      ? '*'
      : [
          'id',
          'run_number',
          'test_id',
          'batch_id',
          'batch_number_snapshot',
          'shift_snapshot',
          'source_report_instance_id',
          'product_id',
          'device_id',
          'status',
          'operator_id',
          'operator_name',
          'approver_id',
          'approver_name',
          'started_at',
          'completed_at',
          'approved_at',
          'rejected_at',
          'evaluation_result',
          'failed_params',
          'notes',
          'approval_notes',
          'rejection_reason',
          'company_id',
          'department_id',
          'created_at',
          'created_by',
          'updated_at',
          'updated_by',
        ].join(',');

    let query = supabase
      .from('lab_v2_test_runs')
      .select(selectColumns)
      .order('created_at', { ascending: false });

    if (ctx.company_id) query = query.eq('company_id', ctx.company_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.test_id) query = query.eq('test_id', filters.test_id);
    if (filters?.batch_id) query = query.eq('batch_id', filters.batch_id);
    if (filters?.product_id) query = query.eq('product_id', filters.product_id);
    if (filters?.device_id) query = query.eq('device_id', filters.device_id);
    if (filters?.evaluation_result) query = query.eq('evaluation_result', filters.evaluation_result);
    if (filters?.created_from) query = query.gte('created_at', filters.created_from);
    if (filters?.created_to) query = query.lte('created_at', filters.created_to);

    // Keep runs listing bounded by default for stable performance.
    const requestedLimit = Number(filters?.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? requestedLimit
      : 100;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as LabV2TestRun[];
  },

  async getRunById(
    id: string
  ): Promise<
    | (LabV2TestRun & {
        measurements: LabV2RunMeasurement[];
        values: LabV2RunValue[];
        materials: LabV2RunMaterial[];
        material_selections: LabV2RunMaterialSelection[];
      })
    | null
  > {
    let data: any = null;
    try {
      const { data: extendedData, error } = await supabase
        .from('lab_v2_test_runs')
        .select('*, measurements:lab_v2_run_measurements(*, values:lab_v2_run_values(*)), materials:lab_v2_run_materials(*), material_selections:lab_v2_run_material_selections(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      data = extendedData;
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      const { data: legacyData, error: legacyError } = await supabase
        .from('lab_v2_test_runs')
        .select('*, measurements:lab_v2_run_measurements(*, values:lab_v2_run_values(*)), materials:lab_v2_run_materials(*)')
        .eq('id', id)
        .single();
      if (legacyError) throw legacyError;
      data = { ...legacyData, material_selections: [] };
    }

    const measurementsRaw = (((data as any)?.measurements || []) as LabV2RunMeasurement[]).slice();
    measurementsRaw.sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));

    const measurements = measurementsRaw.map((m) => {
      const values = (((m as any)?.values || []) as LabV2RunValue[]).slice().sort((a, b) => (a.param_key < b.param_key ? -1 : 1));
      return { ...m, values };
    });

    const materials = (((data as any)?.materials || []) as LabV2RunMaterial[]).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const material_selections = (((data as any)?.material_selections || []) as LabV2RunMaterialSelection[])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    // Backward-compat: keep `values` as the latest measurement values (so existing UI keeps working).
    const latestValues = (measurements[measurements.length - 1]?.values || []).slice();

    return { ...(data as LabV2TestRun), measurements, values: latestValues, materials, material_selections } as any;
  },

  async createMeasurement(input: { run_id: string; measured_at?: string | null; notes?: string | null }): Promise<LabV2RunMeasurement> {
    const ctx = await getLabV2Context();

    // Allocate next measurement_no per run (low contention; retry once if conflict).
    const allocate = async (): Promise<LabV2RunMeasurement> => {
      const { data: maxRow, error: maxErr } = await supabase
        .from('lab_v2_run_measurements')
        .select('measurement_no')
        .eq('run_id', input.run_id)
        .order('measurement_no', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxErr) throw maxErr;
      const nextNo = (maxRow?.measurement_no || 0) + 1;

      const { data, error } = await supabase
        .from('lab_v2_run_measurements')
        .insert({
          run_id: input.run_id,
          measurement_no: nextNo,
          measured_at: input.measured_at || new Date().toISOString(),
          notes: input.notes ?? null,
          created_by: ctx.user_id,
          updated_by: ctx.user_id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as LabV2RunMeasurement;
    };

    try {
      return await allocate();
    } catch (e: any) {
      // Unique violation on (run_id, measurement_no) can happen in rare races.
      if (e?.code === '23505' || String(e?.message || '').toLowerCase().includes('duplicate')) {
        return await allocate();
      }
      throw e;
    }
  },

  async updateMeasurement(id: string, updates: Partial<LabV2RunMeasurement>): Promise<LabV2RunMeasurement> {
    const ctx = await getLabV2Context();
    const { data, error } = await supabase
      .from('lab_v2_run_measurements')
      .update({
        ...updates,
        updated_by: ctx.user_id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2RunMeasurement;
  },

  async deleteMeasurement(id: string): Promise<void> {
    const ctx = await getLabV2Context();
    const { data: measurementRow, error: measurementError } = await supabase
      .from('lab_v2_run_measurements')
      .select('id, run_id')
      .eq('id', id)
      .maybeSingle();

    if (measurementError) throw measurementError;
    if (!measurementRow) return;

    const run_id = String((measurementRow as any).run_id || '').trim();
    if (!run_id) throw new Error('Measurement is missing run reference');

    const { error: valuesDeleteError } = await supabase
      .from('lab_v2_run_values')
      .delete()
      .eq('measurement_id', id);
    if (valuesDeleteError) throw valuesDeleteError;

    const { error: measurementDeleteError } = await supabase
      .from('lab_v2_run_measurements')
      .delete()
      .eq('id', id);
    if (measurementDeleteError) throw measurementDeleteError;

    const { error: rpcEvalError } = await supabase.rpc('evaluate_lab_v2_run', { p_run_id: run_id });
    if (rpcEvalError) {
      await this.recomputeRunEvaluationLocally(run_id, ctx.user_id);
      return;
    }

    const { data: currentRun, error: currentRunError } = await supabase
      .from('lab_v2_test_runs')
      .select('evaluation_result')
      .eq('id', run_id)
      .maybeSingle();

    if (currentRunError || !currentRun?.evaluation_result) {
      await this.recomputeRunEvaluationLocally(run_id, ctx.user_id);
    }
  },

  async ensureLatestMeasurement(run_id: string, measured_at?: string | null): Promise<LabV2RunMeasurement> {
    const { data: existing, error } = await supabase
      .from('lab_v2_run_measurements')
      .select('*')
      .eq('run_id', run_id)
      .order('measurement_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (existing) {
      if (measured_at) {
        try {
          return await this.updateMeasurement(existing.id, { measured_at });
        } catch {
          // If measured_at update fails due to permissions, still return existing record.
          return existing as any;
        }
      }
      return existing as any;
    }

    let ts: string | null = measured_at || null;
    if (!ts) {
      try {
        const { data: runRow } = await supabase
          .from('lab_v2_test_runs')
          .select('started_at, created_at')
          .eq('id', run_id)
          .maybeSingle();

        ts = (runRow as any)?.started_at || (runRow as any)?.created_at || null;
      } catch {
        ts = null;
      }
    }

    return this.createMeasurement({ run_id, measured_at: ts });
  },

  async createRun(input: {
    test_id: string;
    batch_id?: string | null;
    batch_number_snapshot?: string | null;
    shift_snapshot?: string | null;
    source_report_instance_id?: string | null;
    product_id?: string | null;
    device_id?: string | null;
    notes?: string | null;
  }): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const definition = await labV2TestService.getTestDefinitionById(input.test_id);
    if (!definition) throw new Error('تعذر تحميل تعريف الفحص');

    if (definition.test.test_family === 'ipc') {
      if (!input.product_id) throw new Error('فحوصات IPC تتطلب اختيار المنتج');
      const linked = (definition.product_links || []).some((link) => link.product_id === input.product_id && link.is_active !== false);
      if (!linked) throw new Error('الفحص غير مرتبط بالمنتج المحدد');
    }

    // Run number (RPC preferred)
    let run_number: string = generateLabV2RunNumberFallback();
    const { data: rn, error: rnError } = await supabase.rpc('generate_lab_v2_run_number');
    if (!rnError && rn) run_number = String(rn);

    // Snapshot (RPC preferred)
    let snapshot: any | null = null;
    const { data: snap, error: snapError } = await supabase.rpc('create_lab_v2_test_snapshot', { p_test_id: input.test_id });
    if (!snapError && snap) {
      snapshot = snap as any;
    } else {
      snapshot = {
        test: definition.test,
        parameters: definition.parameters,
        acceptance_rules: definition.rules,
        device_links: definition.device_links,
        steps: definition.steps,
        material_plans: definition.step_material_plans,
      };
    }

    const test_snapshot = snapshot?.test ?? definition.test ?? null;
    const params_snapshot = snapshot?.parameters ?? definition.parameters ?? null;
    const rules_snapshot = snapshot?.acceptance_rules ?? definition.rules ?? null;
    const steps_snapshot = snapshot?.steps ?? definition.steps ?? [];

    const stepMap = new Map<string, any>();
    (Array.isArray(steps_snapshot) ? steps_snapshot : []).forEach((step: any, idx: number) => {
      const key = String(step?.id || `step_order_${step?.step_order ?? idx}`).trim();
      stepMap.set(key, {
        id: step?.id ? String(step.id) : null,
        step_order: step?.step_order ?? idx,
        title: step?.title ? String(step.title) : null,
        step_snapshot_key: key,
      });
    });

    const rawPlans = Array.isArray(snapshot?.material_plans) ? snapshot.material_plans : definition.step_material_plans || [];
    const materials_plan_snapshot = rawPlans
      .map((plan: any) => {
        const stepId = String(plan?.step_id || '').trim() || null;
        const stepInfo = stepId ? stepMap.get(stepId) : null;
        const chemical_id = String(plan?.chemical_id || '').trim();
        const planned_quantity = Number(plan?.planned_quantity ?? 0);
        if (!chemical_id || !Number.isFinite(planned_quantity) || planned_quantity <= 0) return null;
        return {
          id: plan?.id ? String(plan.id) : null,
          step_id: stepId,
          step_order: stepInfo?.step_order ?? null,
          step_title: stepInfo?.title ?? null,
          step_snapshot_key: stepInfo?.step_snapshot_key || stepId || 'step_unknown',
          chemical_id,
          chemical_name: plan?.chemical_name ?? null,
          planned_quantity,
          unit: plan?.unit ?? null,
          is_required: plan?.is_required !== false,
          selection_mode: 'lot_manual',
        };
      })
      .filter(Boolean);

    const insertRun = async (
      run_number_override: string,
      source_report_instance_id: string | null | undefined = input.source_report_instance_id
    ) => {
      const payload: any = {
        run_number: run_number_override,
        test_id: input.test_id,
        batch_id: input.batch_id ?? null,
        batch_number_snapshot: input.batch_number_snapshot ?? null,
        shift_snapshot: input.shift_snapshot ?? null,
        source_report_instance_id: source_report_instance_id ?? null,
        product_id: input.product_id ?? null,
        device_id: input.device_id ?? null,
        status: 'draft',
        operator_id: ctx.user_id,
        operator_name: ctx.user_name,
        notes: input.notes ?? null,
        test_snapshot,
        params_snapshot,
        rules_snapshot,
        steps_snapshot,
        materials_plan_snapshot,
        company_id: ctx.company_id,
        department_id: ctx.department_id,
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
      };

      const firstTry = await supabase
        .from('lab_v2_test_runs')
        .insert(payload)
        .select('*')
        .single();

      if (!firstTry.error) return firstTry;
      if (!isSchemaCompatibilityError(firstTry.error)) return firstTry;

      const legacyPayload = { ...payload };
      delete legacyPayload.steps_snapshot;
      delete legacyPayload.materials_plan_snapshot;
      delete legacyPayload.batch_number_snapshot;
      delete legacyPayload.shift_snapshot;
      delete legacyPayload.source_report_instance_id;
      return supabase
        .from('lab_v2_test_runs')
        .insert(legacyPayload)
        .select('*')
        .single();
    };

    let data: any;
    let error: any;

    let candidateRunNumber = run_number;
    let sourceReportCandidate = input.source_report_instance_id ?? null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      ({ data, error } = await insertRun(candidateRunNumber, sourceReportCandidate));
      if (!error) break;

      const errorText = `${String(error?.code || '')} ${String(error?.message || '')} ${String(error?.details || '')} ${String(error?.hint || '')} ${String((error as any)?.constraint || '')}`.toLowerCase();
      const isDuplicate = error?.code === '23505' || errorText.includes('duplicate');
      const isConflict = error?.status === 409 || error?.code === '409' || errorText.includes('conflict');
      const sourceReportConflict =
        sourceReportCandidate &&
        (errorText.includes('source_report_instance_id') || errorText.includes('lab_v2_test_runs_source_report_instance_id'));

      if (sourceReportConflict) {
        // Optional linkage only; if report-id is conflicting, retry without it.
        sourceReportCandidate = null;
        continue;
      }

      if (!(isDuplicate || isConflict)) break;
      candidateRunNumber = generateLabV2RunNumberFallback(new Date(Date.now() + attempt * 17));
    }

    if (error) throw error;
    return data as LabV2TestRun;
  },

  async updateRun(id: string, updates: Partial<LabV2TestRun>): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();
    const { data, error } = await supabase
      .from('lab_v2_test_runs')
      .update({
        ...updates,
        updated_by: ctx.user_id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2TestRun;
  },

  async saveRunValues(input: {
    run_id: string;
    measurement_id?: string;
    values: Array<{
      parameter_id: string;
      param_key: string;
      value?: string | null;
      numeric_value?: number | null;
      notes?: string | null;
    }>;
    params_snapshot: LabV2TestParameter[];
    rules_snapshot: LabV2AcceptanceRule[];
  }): Promise<LabV2RunValue[]> {
    const ctx = await getLabV2Context();

    const measurement =
      input.measurement_id
        ? ({ id: input.measurement_id } as LabV2RunMeasurement)
        : await this.ensureLatestMeasurement(input.run_id);

    const paramsByKey = new Map((input.params_snapshot || []).map(p => [p.param_key, p]));
    const rules = input.rules_snapshot || [];

    const upserts = input.values.map(v => {
      const param = paramsByKey.get(v.param_key);
      const spec = param ? evaluateLabV2ParameterValue(param, v.numeric_value ?? v.value ?? '', rules) : { evaluation_result: 'na' as const, out_of_spec: false };

      return {
        measurement_id: measurement.id,
        run_id: input.run_id,
        parameter_id: v.parameter_id,
        param_key: v.param_key,
        value: v.value ?? null,
        numeric_value: v.numeric_value ?? null,
        evaluation_result: spec.evaluation_result,
        out_of_spec: spec.out_of_spec,
        notes: v.notes ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    let data: any[] = [];
    if (upserts.length > 0) {
      const { data: inserted, error } = await supabase
        .from('lab_v2_run_values')
        .upsert(upserts, { onConflict: 'measurement_id,param_key' })
        .select('*');

      if (error) throw error;
      data = (inserted || []) as any[];
    }

    // If we have any values, move run into in_progress unless it is already later.
    await supabase
      .from('lab_v2_test_runs')
      .update({
        status: 'in_progress',
        updated_by: ctx.user_id,
      })
      .eq('id', input.run_id)
      .in('status', ['draft']);

    // Preserve user-entered started_at if already set.
    await supabase
      .from('lab_v2_test_runs')
      .update({
        started_at: new Date().toISOString(),
        updated_by: ctx.user_id,
      })
      .eq('id', input.run_id)
      .is('started_at', null);

    // Compute overall result using DB function when available.
    const { error: rpcEvalError } = await supabase.rpc('evaluate_lab_v2_run', { p_run_id: input.run_id });
    let shouldFallbackToLocalEval = Boolean(rpcEvalError);

    if (!shouldFallbackToLocalEval) {
      const { data: currentRun, error: currentRunError } = await supabase
        .from('lab_v2_test_runs')
        .select('evaluation_result')
        .eq('id', input.run_id)
        .maybeSingle();

      if (currentRunError || !currentRun?.evaluation_result) {
        shouldFallbackToLocalEval = true;
      }
    }

    if (shouldFallbackToLocalEval) {
      try {
        await this.recomputeRunEvaluationLocally(input.run_id, ctx.user_id);
      } catch (fallbackError) {
        console.warn('[lab_v2] Local evaluation fallback failed:', fallbackError);
      }
    }

    return (data || []) as LabV2RunValue[];
  },

  async recomputeRunEvaluationLocally(run_id: string, updated_by?: string | null): Promise<void> {
    const { data: values, error } = await supabase
      .from('lab_v2_run_values')
      .select('param_key, out_of_spec, evaluation_result')
      .eq('run_id', run_id);

    if (error) throw error;

    const rows = (values || []) as Array<{ param_key?: string | null; out_of_spec?: boolean; evaluation_result?: string | null }>;
    const hasFail = rows.some((row) => row.out_of_spec || toEvalText(row.evaluation_result) === 'fail');
    const hasWarning = rows.some((row) => toEvalText(row.evaluation_result) === 'warning');
    const hasPass = rows.some((row) => toEvalText(row.evaluation_result) === 'pass');

    const failed_params = Array.from(
      new Set(
        rows
          .filter((row) => row.out_of_spec || toEvalText(row.evaluation_result) === 'fail')
          .map((row) => String(row.param_key || '').trim())
          .filter(Boolean)
      )
    );

    let evaluation_result: 'pass' | 'fail' | 'warning' | 'na' = 'na';
    if (hasFail) evaluation_result = 'fail';
    else if (hasWarning) evaluation_result = 'warning';
    else if (hasPass) evaluation_result = 'pass';

    const patch: Record<string, any> = {
      evaluation_result,
      failed_params: failed_params.length ? failed_params : null,
    };
    if (updated_by) patch.updated_by = updated_by;

    const { error: updateError } = await supabase
      .from('lab_v2_test_runs')
      .update(patch)
      .eq('id', run_id);

    if (updateError) throw updateError;
  },

  async listRunMaterialSelections(run_id: string): Promise<LabV2RunMaterialSelection[]> {
    try {
      const { data, error } = await supabase
        .from('lab_v2_run_material_selections')
        .select('*')
        .eq('run_id', run_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LabV2RunMaterialSelection[];
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      return [];
    }
  },

  async upsertRunMaterialSelection(input: {
    run_id: string;
    plan_material_id?: string | null;
    step_snapshot_key: string;
    chemical_id: string;
    chemical_receipt_id: string;
    planned_quantity: number;
    unit?: string | null;
    selection_notes?: string | null;
  }): Promise<LabV2RunMaterialSelection> {
    const ctx = await getLabV2Context();
    const planned = Number(input.planned_quantity ?? 0);
    if (!Number.isFinite(planned) || planned <= 0) throw new Error('الكمية المخططة غير صالحة');

    const payload = {
      run_id: input.run_id,
      plan_material_id: input.plan_material_id ?? null,
      step_snapshot_key: input.step_snapshot_key,
      chemical_id: input.chemical_id,
      chemical_receipt_id: input.chemical_receipt_id,
      planned_quantity: planned,
      unit: input.unit ?? null,
      selection_notes: input.selection_notes ?? null,
      updated_by: ctx.user_id,
      created_by: ctx.user_id,
    };

    try {
      const { data, error } = await supabase
        .from('lab_v2_run_material_selections')
        .upsert(payload, { onConflict: 'run_id,step_snapshot_key,chemical_id' })
        .select('*')
        .single();

      if (error) throw error;
      return data as LabV2RunMaterialSelection;
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      return {
        id: `legacy_${input.run_id}_${input.step_snapshot_key}_${input.chemical_id}`,
        run_id: input.run_id,
        plan_material_id: input.plan_material_id ?? null,
        step_snapshot_key: input.step_snapshot_key,
        chemical_id: input.chemical_id,
        chemical_receipt_id: input.chemical_receipt_id,
        planned_quantity: planned,
        unit: input.unit ?? null,
        selection_notes: input.selection_notes ?? null,
        created_at: new Date().toISOString(),
        created_by: ctx.user_id,
      };
    }
  },

  async validateRequiredMaterialSelections(run_id: string): Promise<void> {
    let runRow: any;
    try {
      const { data, error: runError } = await supabase
        .from('lab_v2_test_runs')
        .select('id, materials_plan_snapshot')
        .eq('id', run_id)
        .single();
      if (runError) throw runError;
      runRow = data;
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      return;
    }

    const plans = normalizeMaterialPlans((runRow as any)?.materials_plan_snapshot);
    const requiredPlans = plans.filter((plan) => plan.is_required !== false);
    if (requiredPlans.length === 0) return;

    let selections: any[] = [];
    try {
      const { data, error: selectionsError } = await supabase
        .from('lab_v2_run_material_selections')
        .select('run_id, step_snapshot_key, chemical_id')
        .eq('run_id', run_id);
      if (selectionsError) throw selectionsError;
      selections = (data || []) as any[];
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      return;
    }

    const selectionKeySet = new Set(
      selections.map((selection) => `${String(selection.step_snapshot_key || '').trim() || 'step_unknown'}::${String(selection.chemical_id || '').trim()}`)
    );

    const missing = requiredPlans.filter((plan) => !selectionKeySet.has(buildPlanSelectionKey(plan)));
    if (missing.length > 0) {
      throw new Error(`يجب اختيار الباتش/اللوت للمواد المطلوبة قبل الإغلاق (${missing.length})`);
    }
  },

  async postRunMaterialConsumption(run_id: string): Promise<void> {
    const ctx = await getLabV2Context();
    let selections: any[] = [];
    try {
      const { data, error } = await supabase
        .from('lab_v2_run_material_selections')
        .select('*')
        .eq('run_id', run_id)
        .is('consumption_posted_at', null);

      if (error) throw error;
      selections = (data || []) as any[];
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      return;
    }
    const rows = (selections || []) as LabV2RunMaterialSelection[];
    if (!rows.length) return;

    for (const selection of rows) {
      const consumeQty = Number(selection.planned_quantity ?? 0);
      if (!Number.isFinite(consumeQty) || consumeQty <= 0) continue;

      const { data: receipt, error: receiptError } = await supabase
        .from('lab_v2_chemical_receipts')
        .select('id, quantity, remaining_quantity, status')
        .eq('id', selection.chemical_receipt_id)
        .single();

      if (receiptError) throw receiptError;

      const remaining = Number((receipt as any)?.remaining_quantity ?? (receipt as any)?.quantity ?? 0);
      const nextRemaining = Math.max(0, remaining - consumeQty);
      const nextStatus = nextRemaining <= 0 ? 'depleted' : ((receipt as any)?.status || 'available');

      const { error: updateReceiptError } = await supabase
        .from('lab_v2_chemical_receipts')
        .update({ remaining_quantity: nextRemaining, status: nextStatus })
        .eq('id', selection.chemical_receipt_id);
      if (updateReceiptError) throw updateReceiptError;

      const { error: markSelectionError } = await supabase
        .from('lab_v2_run_material_selections')
        .update({
          consumption_posted_at: new Date().toISOString(),
          consumed_quantity: consumeQty,
          updated_by: ctx.user_id,
        })
        .eq('id', selection.id);
      if (markSelectionError) throw markSelectionError;

      // Backward compatibility: keep old material ledger table updated.
      await supabase
        .from('lab_v2_run_materials')
        .insert({
          run_id,
          chemical_receipt_id: selection.chemical_receipt_id,
          quantity_used: consumeQty,
          unit: selection.unit ?? null,
          notes: selection.selection_notes ?? null,
        });
    }
  },

  async completeRun(run_id: string, notes?: string | null): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();

    const { data, error } = await supabase
      .from('lab_v2_test_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes ?? null,
        updated_by: ctx.user_id,
      })
      .eq('id', run_id)
      .select('*')
      .single();

    if (error) throw error;
    await supabase.rpc('evaluate_lab_v2_run', { p_run_id: run_id });
    await this.postRunMaterialConsumption(run_id);

    return data as LabV2TestRun;
  },

  async approveRun(run_id: string, approval_notes?: string | null): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();

    const { data, error } = await supabase
      .from('lab_v2_test_runs')
      .update({
        status: 'approved',
        approver_id: ctx.user_id,
        approver_name: ctx.user_name,
        approved_at: new Date().toISOString(),
        approval_notes: approval_notes ?? null,
        updated_by: ctx.user_id,
      })
      .eq('id', run_id)
      .select('*')
      .single();

    if (error) throw error;
    await this.postRunMaterialConsumption(run_id);
    return data as LabV2TestRun;
  },

  async rejectRun(run_id: string, reason: string): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();
    const { data, error } = await supabase
      .from('lab_v2_test_runs')
      .update({
        status: 'rejected',
        approver_id: ctx.user_id,
        approver_name: ctx.user_name,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_by: ctx.user_id,
      })
      .eq('id', run_id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2TestRun;
  },

  async addRunMaterial(input: {
    run_id: string;
    chemical_receipt_id: string;
    quantity_used: number;
    unit?: string | null;
    notes?: string | null;
  }): Promise<LabV2RunMaterial> {
    const { data, error } = await supabase
      .from('lab_v2_run_materials')
      .insert({
        run_id: input.run_id,
        chemical_receipt_id: input.chemical_receipt_id,
        quantity_used: input.quantity_used,
        unit: input.unit ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Decrement remaining_quantity best-effort.
    const { data: receipt } = await supabase
      .from('lab_v2_chemical_receipts')
      .select('id, remaining_quantity, status')
      .eq('id', input.chemical_receipt_id)
      .single();

    const remaining = Number((receipt as any)?.remaining_quantity ?? 0);
    const nextRemaining = Math.max(0, remaining - Number(input.quantity_used || 0));
    const nextStatus = nextRemaining <= 0 ? 'depleted' : (receipt as any)?.status || 'available';

    await supabase
      .from('lab_v2_chemical_receipts')
      .update({ remaining_quantity: nextRemaining, status: nextStatus })
      .eq('id', input.chemical_receipt_id);

    return data as LabV2RunMaterial;
  },
};
