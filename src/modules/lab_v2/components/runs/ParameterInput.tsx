import React, { useMemo } from 'react';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import type { LabV2AcceptanceRule, LabV2TestParameter } from '../../types/test.types';
import { evaluateLabV2ParameterValue } from '../../utils/evaluateSpec';
import ValidationMessage from './ValidationMessage';

export interface ParameterInputProps {
  parameter: LabV2TestParameter;
  value: any;
  onChange: (value: any) => void;
  rules?: LabV2AcceptanceRule[];
  disabled?: boolean;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({ parameter, value, onChange, rules, disabled }) => {
  const evaluation = useMemo(() => {
    if (!rules?.length) return null;
    if (parameter.data_type === 'number') {
      const n = value == null || value === '' ? null : Number(value);
      return evaluateLabV2ParameterValue(parameter, Number.isFinite(n) ? n : value, rules);
    }
    return evaluateLabV2ParameterValue(parameter, value, rules);
  }, [parameter, rules, value]);

  const allowed = Array.isArray(parameter.allowed_values) ? parameter.allowed_values.map(String) : [];
  const label = parameter.label_ar || parameter.label || parameter.param_key;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {parameter.is_required ? <span className="text-rose-500 mr-1">*</span> : null}
          {parameter.unit ? <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">({parameter.unit})</span> : null}
        </div>
        {evaluation ? <ValidationMessage result={evaluation.evaluation_result} message_ar={evaluation.message_ar} /> : null}
      </div>

      {parameter.data_type === 'text' && (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.help_text || ''}
          disabled={disabled}
        />
      )}

      {parameter.data_type === 'number' && (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.help_text || ''}
          disabled={disabled}
          step="any"
          min={parameter.min_value ?? undefined}
          max={parameter.max_value ?? undefined}
        />
      )}

      {parameter.data_type === 'date' && (
        <Input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {parameter.data_type === 'time' && (
        <Input
          type="time"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {parameter.data_type === 'dropdown' && (
        <Select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          options={allowed.map((v) => ({ value: v, label: v }))}
          placeholder="اختر..."
          disabled={disabled}
        />
      )}

      {parameter.data_type === 'multi_select' && (
        <select
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
          disabled={disabled}
          className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {allowed.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )}

      {parameter.help_text ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">{parameter.help_text}</div>
      ) : null}
    </div>
  );
};

export default ParameterInput;

