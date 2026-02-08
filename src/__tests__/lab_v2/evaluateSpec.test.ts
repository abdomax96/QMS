import { describe, it, expect } from 'vitest';
import { evaluateLabV2ParameterValue } from '../../modules/lab_v2/utils/evaluateSpec';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../../modules/lab_v2/types/test.types';

const baseParam: LabV2TestParameter = {
  id: 'p1',
  test_id: 't1',
  param_key: 'ph_value',
  label: 'pH',
  label_ar: 'قيمة pH',
  data_type: 'number',
  is_required: true,
  display_order: 1,
  unit: null,
  min_value: null,
  max_value: null,
  allowed_values: null,
  default_value: null,
  help_text: null,
  created_at: new Date().toISOString(),
};

describe('lab_v2 evaluateSpec', () => {
  it('numeric_range should pass in-range values', () => {
    const rules: LabV2AcceptanceRule[] = [
      {
        id: 'r1',
        test_id: 't1',
        parameter_id: 'p1',
        rule_type: 'numeric_range',
        spec_min: 6.5,
        spec_max: 7.5,
        spec_unit: null,
        allowed_values: null,
        custom_note: null,
        priority: 1,
        created_at: new Date().toISOString(),
        created_by: null,
      },
    ];

    const res = evaluateLabV2ParameterValue(baseParam, 7.0, rules);
    expect(res.out_of_spec).toBe(false);
    expect(res.evaluation_result).toBe('pass');
  });

  it('numeric_range should fail out-of-range values', () => {
    const rules: LabV2AcceptanceRule[] = [
      {
        id: 'r1',
        test_id: 't1',
        parameter_id: 'p1',
        rule_type: 'numeric_range',
        spec_min: 6.5,
        spec_max: 7.5,
        spec_unit: null,
        allowed_values: null,
        custom_note: null,
        priority: 1,
        created_at: new Date().toISOString(),
        created_by: null,
      },
    ];

    const res = evaluateLabV2ParameterValue(baseParam, 8.0, rules);
    expect(res.out_of_spec).toBe(true);
    expect(res.evaluation_result).toBe('fail');
  });

  it('allowed_values should validate dropdown values', () => {
    const param: LabV2TestParameter = { ...baseParam, data_type: 'dropdown', allowed_values: ['A', 'B'] };
    const rules: LabV2AcceptanceRule[] = [
      {
        id: 'r1',
        test_id: 't1',
        parameter_id: 'p1',
        rule_type: 'allowed_values',
        spec_min: null,
        spec_max: null,
        spec_unit: null,
        allowed_values: ['A', 'B'],
        custom_note: null,
        priority: 1,
        created_at: new Date().toISOString(),
        created_by: null,
      },
    ];

    expect(evaluateLabV2ParameterValue(param, 'A', rules).evaluation_result).toBe('pass');
    expect(evaluateLabV2ParameterValue(param, 'X', rules).evaluation_result).toBe('fail');
  });

  it('multi_select should validate selected values', () => {
    const param: LabV2TestParameter = { ...baseParam, data_type: 'multi_select', allowed_values: ['A', 'B', 'C'] };
    const rules: LabV2AcceptanceRule[] = [
      {
        id: 'r1',
        test_id: 't1',
        parameter_id: 'p1',
        rule_type: 'multi_select',
        spec_min: null,
        spec_max: null,
        spec_unit: null,
        allowed_values: ['A', 'B', 'C'],
        custom_note: null,
        priority: 1,
        created_at: new Date().toISOString(),
        created_by: null,
      },
    ];

    expect(evaluateLabV2ParameterValue(param, ['A', 'C'], rules).evaluation_result).toBe('pass');
    expect(evaluateLabV2ParameterValue(param, ['A', 'X'], rules).evaluation_result).toBe('fail');
  });
});

