import type { LabV2EvaluationResult } from '../types/run.types';
import type { LabV2AcceptanceRule } from '../types/test.types';
import type { LabV2TestParameter } from '../types/test.types';

export interface LabV2SpecEvaluation {
  evaluation_result: LabV2EvaluationResult;
  out_of_spec: boolean;
  message_ar?: string;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    // If a comma-separated string sneaks in, try to split.
    if (value.includes(',')) return value.split(',').map(s => s.trim()).filter(Boolean);
    return [value];
  }
  return [];
}

function pickRelevantRules(rules: LabV2AcceptanceRule[] | undefined, parameter: LabV2TestParameter): LabV2AcceptanceRule[] {
  if (!rules?.length) return [];
  const matches = rules.filter(r => r.parameter_id === parameter.id);
  return matches.length ? matches : rules.filter(r => r.test_id === parameter.test_id);
}

/**
 * Evaluates a single parameter value against the acceptance rules.
 * - If no rule exists, returns `na`.
 * - If value missing, returns `na` (validation of requiredness is handled elsewhere).
 */
export function evaluateLabV2ParameterValue(
  parameter: LabV2TestParameter,
  value: unknown,
  rules?: LabV2AcceptanceRule[]
): LabV2SpecEvaluation {
  const relevantRules = pickRelevantRules(rules, parameter).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const rule = relevantRules[0];

  if (!rule) return { evaluation_result: 'na', out_of_spec: false };

  // Empty values are "not evaluated" here.
  const hasValue =
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.trim() !== '') ||
    (Array.isArray(value) && value.length > 0);
  if (!hasValue) return { evaluation_result: 'na', out_of_spec: false };

  if (rule.rule_type === 'numeric_range') {
    const n = toNumber(value);
    if (n == null) return { evaluation_result: 'na', out_of_spec: false };

    const min = rule.spec_min ?? null;
    const max = rule.spec_max ?? null;
    const unit = rule.spec_unit || parameter.unit || '';

    if (min != null && n < min) {
      return {
        evaluation_result: 'fail',
        out_of_spec: true,
        message_ar: `أقل من الحد الأدنى (${min}${unit ? ` ${unit}` : ''})`,
      };
    }
    if (max != null && n > max) {
      return {
        evaluation_result: 'fail',
        out_of_spec: true,
        message_ar: `أعلى من الحد الأعلى (${max}${unit ? ` ${unit}` : ''})`,
      };
    }
    return { evaluation_result: 'pass', out_of_spec: false };
  }

  if (rule.rule_type === 'allowed_values') {
    const allowed = (rule.allowed_values || []) as any[];
    const allowedStrings = allowed.map(String);
    const v = String(value);
    const ok = allowedStrings.includes(v);
    return ok
      ? { evaluation_result: 'pass', out_of_spec: false }
      : {
        evaluation_result: 'fail',
        out_of_spec: true,
        message_ar: 'قيمة غير مسموحة',
      };
  }

  if (rule.rule_type === 'multi_select') {
    const allowed = (rule.allowed_values || []) as any[];
    const allowedStrings = new Set(allowed.map(String));
    const selected = asStringArray(value);
    const invalid = selected.filter(v => !allowedStrings.has(v));
    if (invalid.length > 0) {
      return {
        evaluation_result: 'fail',
        out_of_spec: true,
        message_ar: 'اختيار غير مسموح',
      };
    }
    return { evaluation_result: 'pass', out_of_spec: false };
  }

  // custom: no strict evaluation
  return { evaluation_result: 'na', out_of_spec: false };
}
