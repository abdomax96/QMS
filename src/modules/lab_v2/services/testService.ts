import { supabase } from '../../../config/supabase';
import type {
  LabV2AcceptanceRule,
  LabV2Test,
  LabV2TestDeviceLink,
  LabV2TestParameter,
  LabV2TestProductLink,
  LabV2TestStep,
  LabV2TestStepDevicePlan,
  LabV2TestStepMaterialPlan,
} from '../types/test.types';
import { getLabV2Context } from './labV2Context';

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

const TEST_WRITE_KEYS = [
  'code',
  'name',
  'name_ar',
  'test_family',
  'category',
  'description',
  'method_description',
  'method_standard',
  'sop_document_id',
  'scope',
  'linked_product_id',
  'estimated_duration_minutes',
  'requires_approval',
  'is_active',
] as const;

type TestWriteKey = (typeof TEST_WRITE_KEYS)[number];

function pickDefinedTestFields(input: Partial<LabV2Test>): Partial<LabV2Test> {
  const out: Partial<LabV2Test> = {};
  for (const key of TEST_WRITE_KEYS) {
    const value = input[key as TestWriteKey];
    if (typeof value !== 'undefined') {
      (out as any)[key] = value;
    }
  }
  return out;
}

function inferFamilyFromLegacyCategory(category?: string | null): LabV2Test['test_family'] {
  const value = String(category || '').toLowerCase();
  if (value.includes('ipc') || value.includes('أثناء التشغيل')) return 'ipc';
  if (value.includes('final') || value.includes('نهائي') || value.includes('الإفراج')) return 'final_release';
  if (value.includes('environment') || value.includes('بيئي')) return 'environmental_monitoring';
  if (value.includes('water') || value.includes('air') || value.includes('المياه') || value.includes('الهواء')) return 'utilities_water_air';
  if (value.includes('cip') || value.includes('cop') || value.includes('التنظيف') || value.includes('التطهير')) return 'cip_cop_verification';
  if (value.includes('allergen') || value.includes('حساسية')) return 'allergen_verification';
  return 'final_release';
}

function legacyCategoryFromFamily(family?: string | null): string | null {
  switch (family) {
    case 'ipc':
      return 'IPC';
    case 'environmental_monitoring':
      return 'Environmental Monitoring';
    case 'utilities_water_air':
      return 'Water / Air';
    case 'cip_cop_verification':
      return 'CIP/COP';
    case 'allergen_verification':
      return 'Allergen';
    case 'final_release':
      return 'Final Release';
    default:
      return null;
  }
}

export interface LabV2TestDefinition {
  test: LabV2Test;
  parameters: LabV2TestParameter[];
  rules: LabV2AcceptanceRule[];
  device_links: LabV2TestDeviceLink[];
  product_links: LabV2TestProductLink[];
  steps: LabV2TestStep[];
  step_device_plans: LabV2TestStepDevicePlan[];
  step_material_plans: LabV2TestStepMaterialPlan[];
}

export const labV2TestService = {
  async listTests(filters?: { search?: string; activeOnly?: boolean; family?: string; product_id?: string }): Promise<LabV2Test[]> {
    const ctx = await getLabV2Context();

    let rows: Array<LabV2Test & { product_links?: LabV2TestProductLink[] }> = [];

    const runExtendedQuery = async () => {
      let query = supabase
        .from('lab_v2_tests')
        .select('*, product_links:lab_v2_test_product_links(id,test_id,product_id,is_active,created_at,created_by,updated_at,updated_by)')
        .order('created_at', { ascending: false });

      if (ctx.company_id) query = query.eq('company_id', ctx.company_id);
      if (filters?.activeOnly) query = query.eq('is_active', true);
      if (filters?.family) query = query.eq('test_family', filters.family);
      if (filters?.search) {
        const s = filters.search.trim();
        if (s) {
          query = query.or([`code.ilike.%${s}%`, `name.ilike.%${s}%`, `name_ar.ilike.%${s}%`, `category.ilike.%${s}%`, `test_family.ilike.%${s}%`].join(','));
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Array<LabV2Test & { product_links?: LabV2TestProductLink[] }>;
    };

    try {
      rows = await runExtendedQuery();
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;

      let legacyQuery = supabase.from('lab_v2_tests').select('*').order('created_at', { ascending: false });
      if (ctx.company_id) legacyQuery = legacyQuery.eq('company_id', ctx.company_id);
      if (filters?.activeOnly) legacyQuery = legacyQuery.eq('is_active', true);
      if (filters?.search) {
        const s = filters.search.trim();
        if (s) legacyQuery = legacyQuery.or([`code.ilike.%${s}%`, `name.ilike.%${s}%`, `name_ar.ilike.%${s}%`, `category.ilike.%${s}%`].join(','));
      }
      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (legacyError) throw legacyError;
      rows = ((legacyData || []) as LabV2Test[]).map((row) => ({
        ...row,
        test_family: (row.test_family || inferFamilyFromLegacyCategory(row.category)) as LabV2Test['test_family'],
        product_links: row.linked_product_id ? [{ product_id: row.linked_product_id, test_id: row.id, id: `legacy_${row.id}`, is_active: true, created_at: row.created_at } as any] : [],
      }));
    }

    if (filters?.family) {
      rows = rows.filter((row) => row.test_family === filters.family);
    }
    if (!filters?.product_id) {
      return rows as LabV2Test[];
    }

    return rows.filter((row) => {
      if (row.test_family !== 'ipc') return true;
      const links = Array.isArray((row as any).product_links) ? ((row as any).product_links as LabV2TestProductLink[]) : [];
      return links.some((link) => link.product_id === filters.product_id && link.is_active !== false);
    }) as LabV2Test[];
  },

  async getTestDefinitionById(id: string): Promise<LabV2TestDefinition | null> {
    let data: any = null;
    try {
      const { data: extendedData, error } = await supabase
        .from('lab_v2_tests')
        .select('*, parameters:lab_v2_test_parameters(*), rules:lab_v2_test_acceptance_rules(*), device_links:lab_v2_test_device_links(*), product_links:lab_v2_test_product_links(*), steps:lab_v2_test_steps(*, step_device_plans:lab_v2_test_step_device_plans(*), step_material_plans:lab_v2_test_step_material_plans(*))')
        .eq('id', id)
        .single();
      if (error) throw error;
      data = extendedData;
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      const { data: legacyData, error: legacyError } = await supabase
        .from('lab_v2_tests')
        .select('*, parameters:lab_v2_test_parameters(*), rules:lab_v2_test_acceptance_rules(*), device_links:lab_v2_test_device_links(*)')
        .eq('id', id)
        .single();
      if (legacyError) throw legacyError;
      data = {
        ...legacyData,
        test_family: (legacyData as any)?.test_family || inferFamilyFromLegacyCategory((legacyData as any)?.category),
        product_links: (legacyData as any)?.linked_product_id
          ? [{ product_id: (legacyData as any).linked_product_id, test_id: (legacyData as any).id, id: `legacy_${(legacyData as any).id}`, is_active: true, created_at: (legacyData as any).created_at }]
          : [],
        steps: [],
      };
    }

    const parameters = (((data as any)?.parameters || []) as LabV2TestParameter[]).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const rules = (((data as any)?.rules || []) as LabV2AcceptanceRule[]).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const device_links = (((data as any)?.device_links || []) as LabV2TestDeviceLink[]).sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1));
    const product_links = (((data as any)?.product_links || []) as LabV2TestProductLink[]).sort((a, b) => (a.product_id < b.product_id ? -1 : 1));

    const rawSteps = (((data as any)?.steps || []) as LabV2TestStep[]).slice();
    rawSteps.sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
    const steps = rawSteps.map((step) => ({
      ...step,
      step_device_plans: (((step as any)?.step_device_plans || []) as LabV2TestStepDevicePlan[]).slice().sort((a, b) => (a.device_id < b.device_id ? -1 : 1)),
      step_material_plans: (((step as any)?.step_material_plans || []) as LabV2TestStepMaterialPlan[]).slice().sort((a, b) => (a.chemical_id < b.chemical_id ? -1 : 1)),
    }));

    const step_device_plans = steps.flatMap((step) => step.step_device_plans || []);
    const step_material_plans = steps.flatMap((step) => step.step_material_plans || []);

    return {
      test: data as LabV2Test,
      parameters,
      rules,
      device_links,
      product_links,
      steps,
      step_device_plans,
      step_material_plans,
    };
  },

  async createTest(input: Partial<LabV2Test>): Promise<LabV2Test> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const payload: any = {
      ...pickDefinedTestFields(input),
      company_id: ctx.company_id,
      created_by: ctx.user_id,
      updated_by: ctx.user_id,
    };

    const { data, error } = await supabase
      .from('lab_v2_tests')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (!isSchemaCompatibilityError(error)) throw error;
      const legacyPayload = {
        ...pickDefinedTestFields(input),
        company_id: ctx.company_id,
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
        category: payload.category || legacyCategoryFromFamily(payload.test_family),
      };
      delete (legacyPayload as any).test_family;
      const { data: legacyData, error: legacyError } = await supabase
        .from('lab_v2_tests')
        .insert(legacyPayload)
        .select('*')
        .single();
      if (legacyError) throw legacyError;
      return { ...(legacyData as LabV2Test), test_family: inferFamilyFromLegacyCategory((legacyData as any)?.category) };
    }
    return data as LabV2Test;
  },

  async updateTest(id: string, updates: Partial<LabV2Test>): Promise<LabV2Test> {
    const ctx = await getLabV2Context();

    const payload: any = {
      ...pickDefinedTestFields(updates),
      updated_by: ctx.user_id,
    };

    const { data, error } = await supabase
      .from('lab_v2_tests')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (!isSchemaCompatibilityError(error)) throw error;
      const legacyPayload = {
        ...pickDefinedTestFields(updates),
        updated_by: ctx.user_id,
        category: payload.category || legacyCategoryFromFamily(payload.test_family),
      };
      delete (legacyPayload as any).test_family;
      const { data: legacyData, error: legacyError } = await supabase
        .from('lab_v2_tests')
        .update(legacyPayload)
        .eq('id', id)
        .select('*')
        .single();
      if (legacyError) throw legacyError;
      return { ...(legacyData as LabV2Test), test_family: inferFamilyFromLegacyCategory((legacyData as any)?.category) };
    }
    return data as LabV2Test;
  },

  async deleteTest(id: string): Promise<{ mode: 'deleted' | 'deactivated' }> {
    const ctx = await getLabV2Context();
    const { error } = await supabase.from('lab_v2_tests').delete().eq('id', id);
    if (!error) return { mode: 'deleted' };

    const message = String(error?.message || '').toLowerCase();
    const details = String(error?.details || '').toLowerCase();
    const hasRunFkConflict =
      error?.code === '23503' ||
      message.includes('lab_v2_test_runs_test_id_fkey') ||
      details.includes('lab_v2_test_runs_test_id_fkey');

    if (!hasRunFkConflict) throw error;

    const { error: deactivateError } = await supabase
      .from('lab_v2_tests')
      .update({
        is_active: false,
        updated_by: ctx.user_id,
      })
      .eq('id', id);

    if (deactivateError) throw deactivateError;
    return { mode: 'deactivated' };
  },

  /**
   * Atomic-ish save for test definition (replace children tables).
   * - Keeps the main test row.
   * - Replaces parameters, rules, and device links.
   */
  async saveTestDefinition(input: {
    test: Partial<LabV2Test> & { id?: string };
    parameters: Array<Partial<LabV2TestParameter> & Pick<LabV2TestParameter, 'param_key' | 'label' | 'data_type'>>;
    rules: Array<Partial<LabV2AcceptanceRule>>;
    device_links: Array<Partial<LabV2TestDeviceLink> & Pick<LabV2TestDeviceLink, 'device_id'>>;
    product_links?: Array<Partial<LabV2TestProductLink> & Pick<LabV2TestProductLink, 'product_id'>>;
    steps?: Array<
      Partial<LabV2TestStep> &
      Pick<LabV2TestStep, 'title'> & {
        step_device_plans?: Array<Partial<LabV2TestStepDevicePlan> & Pick<LabV2TestStepDevicePlan, 'device_id'>>;
        step_material_plans?: Array<Partial<LabV2TestStepMaterialPlan> & Pick<LabV2TestStepMaterialPlan, 'chemical_id' | 'planned_quantity'>>;
      }
    >;
  }): Promise<LabV2TestDefinition> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');
    if (!input.test.test_family) throw new Error('يجب تحديد فئة الفحص');

    const normalizedProductLinks = Array.from(
      new Map(
        (input.product_links || [])
          .filter((link) => link.product_id)
          .map((link) => [
            link.product_id as string,
            {
              product_id: link.product_id as string,
              is_active: link.is_active !== false,
            },
          ])
      ).values()
    );

    if (input.test.test_family === 'ipc' && normalizedProductLinks.length === 0) {
      throw new Error('فحوصات IPC تتطلب ربط منتج واحد على الأقل');
    }

    const isUpdate = Boolean(input.test.id);

    const testRow = isUpdate
      ? await this.updateTest(input.test.id!, input.test)
      : await this.createTest(input.test);

    const test_id = testRow.id;

    // Replace parameters
    await supabase.from('lab_v2_test_parameters').delete().eq('test_id', test_id);
    const { data: newParams, error: paramsError } = await supabase
      .from('lab_v2_test_parameters')
      .insert(
        (input.parameters || []).map((p, idx) => ({
          test_id,
          param_key: p.param_key,
          label: p.label,
          label_ar: p.label_ar ?? null,
          data_type: p.data_type,
          is_required: Boolean(p.is_required),
          display_order: p.display_order ?? idx,
          unit: p.unit ?? null,
          min_value: p.min_value ?? null,
          max_value: p.max_value ?? null,
          allowed_values: p.allowed_values ?? null,
          default_value: p.default_value ?? null,
          help_text: p.help_text ?? null,
        }))
      )
      .select('*');

    if (paramsError) throw paramsError;
    const parameters = (newParams || []) as LabV2TestParameter[];

    const paramIdByKey = new Map(parameters.map((p) => [String(p.param_key || '').trim().toLowerCase(), p.id] as const));
    const persistedParamIds = new Set(parameters.map((p) => p.id));

    // Replace rules
    await supabase.from('lab_v2_test_acceptance_rules').delete().eq('test_id', test_id);
    const mappedRules = (input.rules || []).map((r, idx) => {
      const param_key = String((r as any).param_key || '').trim().toLowerCase();
      const mappedParameterId = param_key ? paramIdByKey.get(param_key) : undefined;
      const legacyParameterId = (r as any).parameter_id as string | undefined;
      const parameter_id = mappedParameterId ?? (legacyParameterId && persistedParamIds.has(legacyParameterId) ? legacyParameterId : null);

      return {
        test_id,
        parameter_id,
        rule_type: (r as any).rule_type || 'custom',
        spec_min: (r as any).spec_min ?? null,
        spec_max: (r as any).spec_max ?? null,
        spec_unit: (r as any).spec_unit ?? null,
        allowed_values: (r as any).allowed_values ?? null,
        custom_note: (r as any).custom_note ?? null,
        priority: (r as any).priority ?? idx,
        created_by: ctx.user_id,
      };
    });

    const { data: newRules, error: rulesError } = await supabase
      .from('lab_v2_test_acceptance_rules')
      .insert(mappedRules)
      .select('*');

    if (rulesError) throw rulesError;
    const rules = (newRules || []) as LabV2AcceptanceRule[];

    // Replace device links
    await supabase.from('lab_v2_test_device_links').delete().eq('test_id', test_id);
    const { data: newLinks, error: linksError } = await supabase
      .from('lab_v2_test_device_links')
      .insert(
        (input.device_links || []).map((l) => ({
          test_id,
          device_id: l.device_id,
          is_default: Boolean(l.is_default),
          setup_notes: l.setup_notes ?? null,
          calibration_targets: l.calibration_targets ?? null,
          device_specific_params: l.device_specific_params ?? null,
          created_by: ctx.user_id,
        }))
      )
      .select('*');

    if (linksError) throw linksError;
    const device_links = (newLinks || []) as LabV2TestDeviceLink[];

    // Replace product links
    let product_links: LabV2TestProductLink[] = [];
    try {
      await supabase.from('lab_v2_test_product_links').delete().eq('test_id', test_id);
      if (normalizedProductLinks.length > 0) {
        const { data: insertedProductLinks, error: productLinksError } = await supabase
          .from('lab_v2_test_product_links')
          .insert(
            normalizedProductLinks.map((link) => ({
              test_id,
              product_id: link.product_id,
              is_active: link.is_active,
              created_by: ctx.user_id,
              updated_by: ctx.user_id,
            }))
          )
          .select('*');

        if (productLinksError) throw productLinksError;
        product_links = (insertedProductLinks || []) as LabV2TestProductLink[];
      }
    } catch (error: any) {
      if (!isSchemaCompatibilityError(error)) throw error;
      product_links = normalizedProductLinks.map((link, idx) => ({
        id: `legacy_${test_id}_${idx}`,
        test_id,
        product_id: link.product_id,
        is_active: link.is_active,
        created_at: new Date().toISOString(),
      })) as LabV2TestProductLink[];
      await this.updateTest(test_id, { linked_product_id: normalizedProductLinks[0]?.product_id ?? null });
    }

    // Replace steps and nested plans
    const normalizedSteps = (input.steps || [])
      .map((step, idx) => ({
        title: (step.title || '').trim(),
        instructions: step.instructions ?? null,
        expected_duration_min: step.expected_duration_min ?? null,
        is_required: step.is_required !== false,
        step_order: idx,
        step_device_plans: step.step_device_plans || [],
        step_material_plans: step.step_material_plans || [],
      }))
      .filter((step) => step.title);

    let steps: LabV2TestStep[] = [];
    let step_device_plans: LabV2TestStepDevicePlan[] = [];
    let step_material_plans: LabV2TestStepMaterialPlan[] = [];

    if (normalizedSteps.length > 0) {
      try {
        await supabase.from('lab_v2_test_step_device_plans').delete().eq('test_id', test_id);
        await supabase.from('lab_v2_test_step_material_plans').delete().eq('test_id', test_id);
        await supabase.from('lab_v2_test_steps').delete().eq('test_id', test_id);

        const { data: insertedSteps, error: stepsError } = await supabase
          .from('lab_v2_test_steps')
          .insert(
            normalizedSteps.map((step) => ({
              test_id,
              step_order: step.step_order,
              title: step.title,
              instructions: step.instructions,
              expected_duration_min: step.expected_duration_min,
              is_required: step.is_required,
              created_by: ctx.user_id,
              updated_by: ctx.user_id,
            }))
          )
          .select('*');

        if (stepsError) throw stepsError;
        steps = ((insertedSteps || []) as LabV2TestStep[]).sort((a, b) => (a.step_order || 0) - (b.step_order || 0));

        const stepDeviceRows: Array<Omit<LabV2TestStepDevicePlan, 'id' | 'created_at'>> = [];
        const stepMaterialRows: Array<Omit<LabV2TestStepMaterialPlan, 'id' | 'created_at'>> = [];

        steps.forEach((persistedStep, idx) => {
          const source = normalizedSteps[idx];
          const uniqueDevices = Array.from(new Map((source.step_device_plans || []).filter((row) => row.device_id).map((row) => [row.device_id, row])).values());
          uniqueDevices.forEach((row) => {
            stepDeviceRows.push({
              test_id,
              step_id: persistedStep.id,
              device_id: row.device_id as string,
              is_required: row.is_required === true,
              created_by: ctx.user_id,
            });
          });

          const uniqueChemicals = Array.from(
            new Map((source.step_material_plans || []).filter((row) => row.chemical_id).map((row) => [row.chemical_id, row])).values()
          );
          uniqueChemicals.forEach((row) => {
            const planned = Number(row.planned_quantity ?? 0);
            if (!Number.isFinite(planned) || planned <= 0) return;
            stepMaterialRows.push({
              test_id,
              step_id: persistedStep.id,
              chemical_id: row.chemical_id as string,
              planned_quantity: planned,
              unit: row.unit ?? null,
              is_required: row.is_required !== false,
              selection_mode: 'lot_manual',
              notes: row.notes ?? null,
              created_by: ctx.user_id,
            });
          });
        });

        if (stepDeviceRows.length > 0) {
          const { data: insertedStepDevices, error: stepDevicesError } = await supabase
            .from('lab_v2_test_step_device_plans')
            .insert(stepDeviceRows)
            .select('*');
          if (stepDevicesError) throw stepDevicesError;
          step_device_plans = (insertedStepDevices || []) as LabV2TestStepDevicePlan[];
        }

        if (stepMaterialRows.length > 0) {
          const { data: insertedStepMaterials, error: stepMaterialsError } = await supabase
            .from('lab_v2_test_step_material_plans')
            .insert(stepMaterialRows)
            .select('*');
          if (stepMaterialsError) throw stepMaterialsError;
          step_material_plans = (insertedStepMaterials || []) as LabV2TestStepMaterialPlan[];
        }
      } catch (error: any) {
        if (!isSchemaCompatibilityError(error)) throw error;
        // Keep graceful fallback when new step tables are not yet migrated.
        steps = normalizedSteps.map((step, idx) => ({
          id: `legacy_step_${test_id}_${idx}`,
          test_id,
          step_order: idx,
          title: step.title,
          instructions: step.instructions ?? null,
          expected_duration_min: step.expected_duration_min ?? null,
          is_required: step.is_required !== false,
          created_at: new Date().toISOString(),
          step_device_plans: [],
          step_material_plans: [],
        }));
        step_device_plans = [];
        step_material_plans = [];
      }
    }

    if (steps.length > 0) {
      const devicesByStep = new Map<string, LabV2TestStepDevicePlan[]>();
      const materialsByStep = new Map<string, LabV2TestStepMaterialPlan[]>();
      step_device_plans.forEach((plan) => {
        const list = devicesByStep.get(plan.step_id) || [];
        list.push(plan);
        devicesByStep.set(plan.step_id, list);
      });
      step_material_plans.forEach((plan) => {
        const list = materialsByStep.get(plan.step_id) || [];
        list.push(plan);
        materialsByStep.set(plan.step_id, list);
      });
      steps = steps.map((step) => ({
        ...step,
        step_device_plans: (devicesByStep.get(step.id) || []).sort((a, b) => (a.device_id < b.device_id ? -1 : 1)),
        step_material_plans: (materialsByStep.get(step.id) || []).sort((a, b) => (a.chemical_id < b.chemical_id ? -1 : 1)),
      }));
    }

    return {
      test: testRow,
      parameters: parameters.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
      rules: rules.sort((a, b) => (b.priority || 0) - (a.priority || 0)),
      device_links: device_links.sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1)),
      product_links: product_links.sort((a, b) => (a.product_id < b.product_id ? -1 : 1)),
      steps,
      step_device_plans,
      step_material_plans,
    };
  },
};
