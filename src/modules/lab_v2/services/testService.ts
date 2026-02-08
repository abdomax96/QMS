import { supabase } from '../../../config/supabase';
import type { LabV2AcceptanceRule, LabV2Test, LabV2TestDeviceLink, LabV2TestParameter } from '../types/test.types';
import { getLabV2Context } from './labV2Context';

export interface LabV2TestDefinition {
  test: LabV2Test;
  parameters: LabV2TestParameter[];
  rules: LabV2AcceptanceRule[];
  device_links: LabV2TestDeviceLink[];
}

export const labV2TestService = {
  async listTests(filters?: { search?: string; activeOnly?: boolean }): Promise<LabV2Test[]> {
    const ctx = await getLabV2Context();

    let query = supabase.from('lab_v2_tests').select('*').order('created_at', { ascending: false });
    if (ctx.company_id) query = query.eq('company_id', ctx.company_id);
    if (filters?.activeOnly) query = query.eq('is_active', true);
    if (filters?.search) {
      const s = filters.search.trim();
      if (s) {
        query = query.or([`code.ilike.%${s}%`, `name.ilike.%${s}%`, `name_ar.ilike.%${s}%`, `category.ilike.%${s}%`].join(','));
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as LabV2Test[];
  },

  async getTestDefinitionById(id: string): Promise<LabV2TestDefinition | null> {
    const { data, error } = await supabase
      .from('lab_v2_tests')
      .select('*, parameters:lab_v2_test_parameters(*), rules:lab_v2_test_acceptance_rules(*), device_links:lab_v2_test_device_links(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    const parameters = (((data as any)?.parameters || []) as LabV2TestParameter[]).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const rules = (((data as any)?.rules || []) as LabV2AcceptanceRule[]).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const device_links = (((data as any)?.device_links || []) as LabV2TestDeviceLink[]).sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1));

    return {
      test: data as LabV2Test,
      parameters,
      rules,
      device_links,
    };
  },

  async createTest(input: Partial<LabV2Test>): Promise<LabV2Test> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

    const { data, error } = await supabase
      .from('lab_v2_tests')
      .insert({
        ...input,
        company_id: ctx.company_id,
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Test;
  },

  async updateTest(id: string, updates: Partial<LabV2Test>): Promise<LabV2Test> {
    const ctx = await getLabV2Context();

    const { data, error } = await supabase
      .from('lab_v2_tests')
      .update({
        ...updates,
        updated_by: ctx.user_id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as LabV2Test;
  },

  async deleteTest(id: string): Promise<void> {
    const { error } = await supabase.from('lab_v2_tests').delete().eq('id', id);
    if (error) throw error;
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
  }): Promise<LabV2TestDefinition> {
    const ctx = await getLabV2Context();
    if (!ctx.company_id) throw new Error('Company is not set');

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

    const paramIdByKey = new Map(parameters.map(p => [p.param_key, p.id] as const));

    // Replace rules
    await supabase.from('lab_v2_test_acceptance_rules').delete().eq('test_id', test_id);
    const mappedRules = (input.rules || []).map((r, idx) => {
      const param_key = (r as any).param_key as string | undefined;
      const parameter_id = ((r as any).parameter_id as string | undefined) ?? (param_key ? paramIdByKey.get(param_key) : null);

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

    return {
      test: testRow,
      parameters: parameters.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
      rules: rules.sort((a, b) => (b.priority || 0) - (a.priority || 0)),
      device_links: device_links.sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1)),
    };
  },
};
