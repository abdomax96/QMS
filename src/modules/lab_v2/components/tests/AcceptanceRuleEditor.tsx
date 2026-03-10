import React from 'react';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import type { LabV2AcceptanceRule, LabV2RuleType, LabV2TestParameter } from '../../types/test.types';

const ruleTypeOptions: { value: LabV2RuleType; label: string }[] = [
  { value: 'numeric_range', label: 'Numeric range' },
  { value: 'allowed_values', label: 'Allowed values' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'custom', label: 'Custom' },
];

function toAllowedValues(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function fromAllowedValues(values: any[] | null | undefined): string {
  if (!Array.isArray(values)) return '';
  return values.map(String).join(', ');
}

export const AcceptanceRuleEditor: React.FC<{
  parameters: LabV2TestParameter[];
  value: Array<Partial<LabV2AcceptanceRule> & { param_key?: string }>;
  onChange: (next: Array<Partial<LabV2AcceptanceRule> & { param_key?: string }>) => void;
}> = ({ parameters, value, onChange }) => {
  const setAt = (idx: number, patch: any) => {
    onChange(value.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const add = () => {
    onChange([
      ...value,
      {
        rule_type: 'numeric_range',
        priority: value.length,
        param_key: parameters[0]?.param_key,
      } as any,
    ]);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx).map((r, i) => ({ ...r, priority: i })));
  };

  const paramOptions = parameters.map((p) => ({
    value: p.param_key,
    label: `${p.label_ar || p.label} (${p.param_key})`,
  }));

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">قواعد القبول (Specs)</div>
        <Button type="button" variant="secondary" size="sm" onClick={add} disabled={parameters.length === 0}>
          إضافة قاعدة
        </Button>
      </div>

      {parameters.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">أضف معاملات أولاً لربط قواعد القبول.</div>
      ) : null}

      {value.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">لا توجد قواعد بعد.</div>
      ) : null}

      <div className="space-y-3">
        {value.map((r, idx) => {
          const showRange = r.rule_type === 'numeric_range';
          const showAllowed = r.rule_type === 'allowed_values' || r.rule_type === 'multi_select';

          return (
            <div key={r.id || idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">قاعدة #{idx + 1}</div>
                <Button type="button" variant="danger" size="sm" onClick={() => remove(idx)}>
                  حذف
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <Select
                  label="المعامل"
                  options={paramOptions}
                  value={r.param_key || ''}
                  onChange={(e) => setAt(idx, { param_key: e.target.value })}
                />
                <Select
                  label="نوع القاعدة"
                  options={ruleTypeOptions}
                  value={(r.rule_type as any) || 'numeric_range'}
                  onChange={(e) => setAt(idx, { rule_type: e.target.value as any })}
                />

                {showRange ? (
                  <>
                    <Input
                      type="number"
                      label="Spec Min"
                      value={r.spec_min ?? ''}
                      onChange={(e) => setAt(idx, { spec_min: e.target.value ? Number(e.target.value) : null })}
                    />
                    <Input
                      type="number"
                      label="Spec Max"
                      value={r.spec_max ?? ''}
                      onChange={(e) => setAt(idx, { spec_max: e.target.value ? Number(e.target.value) : null })}
                    />
                    <Input
                      label="Spec Unit"
                      value={r.spec_unit ?? ''}
                      onChange={(e) => setAt(idx, { spec_unit: e.target.value })}
                      placeholder="ppm, mg/L, °C"
                    />
                  </>
                ) : null}

                {showAllowed ? (
                  <Input
                    label="Allowed values (comma separated)"
                    value={fromAllowedValues(r.allowed_values as any)}
                    onChange={(e) => setAt(idx, { allowed_values: toAllowedValues(e.target.value) })}
                    placeholder="Option A, Option B"
                  />
                ) : null}
              </div>

              <div className="mt-3">
                <Input
                  label="ملاحظة"
                  value={r.custom_note ?? ''}
                  onChange={(e) => setAt(idx, { custom_note: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AcceptanceRuleEditor;
