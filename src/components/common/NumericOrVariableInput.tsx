import React, { useEffect, useMemo, useState } from 'react';
import type { DocumentVariable } from '../../types/variables';
import {
  buildGlobalVariableToken,
  extractVariableNameFromToken,
  isVariableToken,
} from '../../utils/documentVariableBindings';

type NumericMode = 'number' | 'variable';

interface NumericOrVariableInputProps {
  value: number | string | undefined;
  onChange: (value: number | string | undefined) => void;
  variables?: DocumentVariable[];
  numericType?: 'integer' | 'decimal';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const NumericOrVariableInput: React.FC<NumericOrVariableInputProps> = ({
  value,
  onChange,
  variables = [],
  numericType = 'decimal',
  placeholder,
  className = '',
  disabled = false,
}) => {
  const derivedMode: NumericMode = isVariableToken(value) ? 'variable' : 'number';
  const [mode, setMode] = useState<NumericMode>(derivedMode);

  useEffect(() => {
    setMode(derivedMode);
  }, [derivedMode]);

  const selectedVariableName = useMemo(() => extractVariableNameFromToken(value) || '', [value]);
  const selectedVariable = variables.find((variable) => variable.name === selectedVariableName);
  const numericDisplayValue = useMemo(() => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string' && !isVariableToken(value)) return value;
    return '';
  }, [value]);

  const handleModeChange = (nextMode: NumericMode) => {
    if (disabled) return;
    setMode(nextMode);
    if (nextMode === 'number' && isVariableToken(value)) {
      onChange(undefined);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          {mode === 'number' ? (
            <input
              type="number"
              value={numericDisplayValue}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') {
                  onChange(undefined);
                  return;
                }

                const parsed = numericType === 'integer' ? parseInt(raw, 10) : Number(raw);
                onChange(Number.isFinite(parsed) ? parsed : undefined);
              }}
              className={`w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 ${className}`}
              placeholder={placeholder}
              step={numericType === 'integer' ? '1' : '0.01'}
              disabled={disabled}
            />
          ) : (
            <select
              value={selectedVariableName}
              onChange={(event) => {
                const variableName = event.target.value;
                onChange(variableName ? buildGlobalVariableToken(variableName) : undefined);
              }}
              className={`w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 ${className}`}
              disabled={disabled}
            >
              <option value="">-- اختر متغير --</option>
              {variables.map((variable) => (
                <option key={variable.id} value={variable.name}>
                  {variable.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleModeChange('number')}
            disabled={disabled}
            title="رقم"
            aria-label="اختيار إدخال رقم"
            className={`h-6 w-8 flex items-center justify-center text-[10px] font-mono rounded border transition-colors ${mode === 'number'
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            123
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('variable')}
            disabled={disabled}
            title="متغير"
            aria-label="اختيار متغير"
            className={`h-6 w-8 flex items-center justify-center text-[10px] font-mono rounded border transition-colors ${mode === 'variable'
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {'{}'}
          </button>
        </div>
      </div>

      {mode === 'variable' && selectedVariable && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          القيمة الحالية: <span className="font-mono">{selectedVariable.value}</span>{' '}
          {selectedVariable.unit ? <span>{selectedVariable.unit}</span> : null}
        </p>
      )}
    </div>
  );
};

export default NumericOrVariableInput;
