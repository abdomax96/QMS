import { supabase } from '../../../config/supabase';
import type { LabV2TestRun, LabV2RunMaterial, LabV2RunMeasurement, LabV2RunValue } from '../types/run.types';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../types/test.types';
import { evaluateLabV2ParameterValue } from '../utils/evaluateSpec';
import { generateLabV2RunNumberFallback } from '../utils/generateRunNumber';
import { getLabV2Context } from './labV2Context';
import { labV2TestService } from './testService';

export const labV2TestRunService = {
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
  }): Promise<LabV2TestRun[]> {
    const ctx = await getLabV2Context();

    let query = supabase
      .from('lab_v2_test_runs')
      .select('*')
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
    if (filters?.limit) query = query.limit(filters.limit);

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
      })
    | null
  > {
    const { data, error } = await supabase
      .from('lab_v2_test_runs')
      .select('*, measurements:lab_v2_run_measurements(*, values:lab_v2_run_values(*)), materials:lab_v2_run_materials(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    const measurementsRaw = (((data as any)?.measurements || []) as LabV2RunMeasurement[]).slice();
    measurementsRaw.sort((a, b) => (a.measurement_no || 0) - (b.measurement_no || 0));

    const measurements = measurementsRaw.map((m) => {
      const values = (((m as any)?.values || []) as LabV2RunValue[]).slice().sort((a, b) => (a.param_key < b.param_key ? -1 : 1));
      return { ...m, values };
    });

    const materials = (((data as any)?.materials || []) as LabV2RunMaterial[]).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    // Backward-compat: keep `values` as the latest measurement values (so existing UI keeps working).
    const latestValues = (measurements[measurements.length - 1]?.values || []).slice();

    return { ...(data as LabV2TestRun), measurements, values: latestValues, materials } as any;
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
    product_id?: string | null;
    device_id?: string | null;
    notes?: string | null;
  }): Promise<LabV2TestRun> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

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
      const def = await labV2TestService.getTestDefinitionById(input.test_id);
      if (def) {
        snapshot = {
          test: def.test,
          parameters: def.parameters,
          acceptance_rules: def.rules,
          device_links: def.device_links,
        };
      }
    }

    const test_snapshot = snapshot?.test ?? null;
    const params_snapshot = snapshot?.parameters ?? null;
    const rules_snapshot = snapshot?.acceptance_rules ?? null;

    const insertRun = async (run_number_override: string) => {
      return supabase
        .from('lab_v2_test_runs')
        .insert({
          run_number: run_number_override,
          test_id: input.test_id,
          batch_id: input.batch_id ?? null,
          product_id: input.product_id ?? null,
          device_id: input.device_id ?? null,
          status: 'draft',
          operator_id: ctx.user_id,
          operator_name: ctx.user_name,
          notes: input.notes ?? null,
          test_snapshot,
          params_snapshot,
          rules_snapshot,
          company_id: ctx.company_id,
          department_id: ctx.department_id,
          created_by: ctx.user_id,
          updated_by: ctx.user_id,
        })
        .select('*')
        .single();
    };

    let data: any;
    let error: any;

    ({ data, error } = await insertRun(run_number));

    if (error && (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate'))) {
      const altRunNumber = generateLabV2RunNumberFallback();
      ({ data, error } = await insertRun(altRunNumber));
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

    // Compute overall result using DB function (pass/fail/na).
    await supabase.rpc('evaluate_lab_v2_run', { p_run_id: input.run_id });

    return (data || []) as LabV2RunValue[];
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
