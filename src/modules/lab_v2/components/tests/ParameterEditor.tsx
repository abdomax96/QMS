import React from 'react';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import type { LabV2TestParameter } from '../../types/test.types';
import { LAB_V2_DATA_TYPE_LABELS, LAB_V2_DATA_TYPES } from '../../constants/dataTypes';

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

export const ParameterEditor: React.FC<{
  value: Array<Partial<LabV2TestParameter>>;
  onChange: (next: Array<Partial<LabV2TestParameter>>) => void;
}> = ({ value, onChange }) => {
  const setAt = (idx: number, patch: Partial<LabV2TestParameter>) => {
    onChange(value.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const add = () => {
    onChange([
      ...value,
      {
        param_key: `param_${value.length + 1}`,
        label: '',
        label_ar: '',
        data_type: 'number',
        is_required: false,
        display_order: value.length,
        unit: '',
        allowed_values: [],
      },
    ]);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx).map((p, i) => ({ ...p, display_order: i })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    onChange(next.map((p, i) => ({ ...p, display_order: i })));
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">المعاملات</div>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          إضافة معامل
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-sm text-slate-600 dark:text-slate-400">لا توجد معاملات بعد.</div>
      ) : null}

      <div className="space-y-4">
        {value.map((p, idx) => {
          const typeOptions = LAB_V2_DATA_TYPES.map((t) => ({ value: t, label: LAB_V2_DATA_TYPE_LABELS[t] }));
          const showAllowed = p.data_type === 'dropdown' || p.data_type === 'multi_select';

          return (
            <div key={p.param_key || idx} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">#{idx + 1}</div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    أعلى
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === value.length - 1}>
                    أسفل
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => remove(idx)}>
                    حذف
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Key" value={p.param_key || ''} onChange={(e) => setAt(idx, { param_key: e.target.value })} />
                <Select label="نوع البيانات" options={typeOptions} value={(p.data_type as any) || 'number'} onChange={(e) => setAt(idx, { data_type: e.target.value as any })} />
                <Input label="Label" value={p.label || ''} onChange={(e) => setAt(idx, { label: e.target.value })} />
                <Input label="التسمية (عربي)" value={p.label_ar || ''} onChange={(e) => setAt(idx, { label_ar: e.target.value })} />
                <Input label="Unit" value={p.unit || ''} onChange={(e) => setAt(idx, { unit: e.target.value })} placeholder="ppm, mg/L, °C" />
                <div className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={Boolean(p.is_required)}
                    onChange={(e) => setAt(idx, { is_required: e.target.checked })}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">مطلوب</span>
                </div>
                <Input
                  type="number"
                  label="Min (Validation)"
                  value={p.min_value ?? ''}
                  onChange={(e) => setAt(idx, { min_value: e.target.value ? Number(e.target.value) : null })}
                  disabled={p.data_type !== 'number'}
                />
                <Input
                  type="number"
                  label="Max (Validation)"
                  value={p.max_value ?? ''}
                  onChange={(e) => setAt(idx, { max_value: e.target.value ? Number(e.target.value) : null })}
                  disabled={p.data_type !== 'number'}
                />
              </div>

              {showAllowed ? (
                <div className="mt-4">
                  <Input
                    label="القيم المسموحة (افصل بفاصلة)"
                    value={fromAllowedValues(p.allowed_values as any)}
                    onChange={(e) => setAt(idx, { allowed_values: toAllowedValues(e.target.value) })}
                    placeholder="Option A, Option B"
                  />
                </div>
              ) : null}

              <div className="mt-4">
                <Input label="Help" value={p.help_text || ''} onChange={(e) => setAt(idx, { help_text: e.target.value })} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParameterEditor;

