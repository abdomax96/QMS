import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useStore from '../store';
import { useCompanyStore } from '../store/companyStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { useDateFormat, cn } from '../utils';
import { useTabsStore } from '../store/tabsStore';
import { usePermissions } from '../hooks/usePermissions';
import { useReportWorkflow } from '../hooks/useReportWorkflow';
import { useToastStore } from '../store/toastStore';
import { calculateTare1, calculateTare2, getAQLLimits, validateColumn } from '../utils/tareCalculations';
import { getRecipesByProduct } from '../services/recipeService';
import { variableService } from '../services/variableService';
import { formatMaterialDateForDisplay } from '../utils/materialReceivingDate';
import {
  buildSideHeaderRenderModel,
  expandSideHeaderRowsToMatrix,
  getCustomBoldColumnSeparatorsForRendering,
  getCustomBoldRowSeparatorsForRendering,
  getCustomColumnsForRendering,
  getCustomGridSettingsForRendering,
  getCustomHeaderRowsForRendering,
  getCustomLayoutForRendering,
  getCustomSideHeaderLabelsForRendering,
  getCustomSideHeaderRowsForRendering,
  getCustomSideHeaderTargetsForRendering,
  resolveCustomCellDisplayValue,
  resolveCustomCellType,
} from '../utils/customTableV2';
import {
  applyDocumentVariableBindingsToTemplate,
  buildDocumentVariableSnapshot,
  isVariableToken,
  resolveDocumentVariableDisplayValue,
} from '../utils/documentVariableBindings';
import type { FormSection, QualityCriteria, Table, TableColumn, TableParameter } from '../types';

type AnyRecord = Record<string, any>;
type VariableSnapshot = Record<string, string | number>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const getUnitDisplayLabel = (unit: unknown): string => {
  const normalized = String(unit ?? '').trim();
  if (!normalized || normalized === '-') return '-';

  const unitMap: Record<string, string> = {
    kg: 'كجم',
    g: 'جم',
    mg: 'مجم',
    l: 'لتر',
    ml: 'مل',
  };

  return unitMap[normalized.toLowerCase()] || normalized;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveSnapshotDisplayValue = (value: unknown, snapshot?: VariableSnapshot): unknown => {
  if (!snapshot || Object.keys(snapshot).length === 0) return value;
  return resolveDocumentVariableDisplayValue(value, snapshot);
};

const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
};

const resolveSampleSize = (table: Table | AnyRecord, fallback = 20): number => {
  const explicitSampleSize = toPositiveInt((table as any)?.sample_size ?? (table as any)?.sampleSize);
  if (explicitSampleSize !== null) return explicitSampleSize;

  const legacyRows = toPositiveInt((table as any)?.rows);
  if (legacyRows !== null) return legacyRows;

  return fallback;
};

const calcStats = (values: number[]) => {
  if (!values.length) return { avg: null as number | null, std: null as number | null };
  const avg = values.reduce((sum, current) => sum + current, 0) / values.length;
  if (values.length < 2) return { avg, std: null };
  const variance =
    values.reduce((sum, current) => sum + (current - avg) ** 2, 0) / (values.length - 1);
  return { avg, std: Math.sqrt(variance) };
};

const formatMetric = (value: number | null, decimals = 2) => {
  if (value === null || Number.isNaN(value)) return '-';
  return value.toFixed(decimals);
};

const textLen = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized.length;
};

const generateTimeHeaders = (
  startTime: string,
  durationHours: number,
  intervalMinutes: number
): string[] => {
  let safeStartTime = startTime;
  let safeDuration = durationHours;
  let safeInterval = intervalMinutes;

  if (!safeStartTime || typeof safeStartTime !== 'string' || !safeStartTime.includes(':')) {
    safeStartTime = '08:00';
  }
  if (!safeDuration || safeDuration <= 0) {
    safeDuration = 8;
  }
  if (!safeInterval || safeInterval <= 0) {
    safeInterval = 60;
  }

  const [startHour, startMinute] = safeStartTime.split(':').map(Number);
  const totalMinutes = safeDuration * 60;
  const columnsCount = Math.floor(totalMinutes / safeInterval);
  const headers: string[] = [];

  for (let index = 0; index < columnsCount; index += 1) {
    const minutesFromStart = index * safeInterval;
    const total = startHour * 60 + startMinute + minutesFromStart;
    const hour = Math.floor(total / 60) % 24;
    const minute = total % 60;
    headers.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }

  return headers;
};

const normalizeSections = (sections: AnyRecord): FormSection[] => {
  return Object.values(sections || {}).sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
};

const getFormTableData = (formData: AnyRecord, sectionId: string, tableId: string): any[][] => {
  const sectionScoped = formData?.sections?.[sectionId]?.tables?.[tableId]?.data;
  const flatScoped = formData?.tables?.[tableId]?.data;
  if (Array.isArray(sectionScoped)) return sectionScoped;
  if (Array.isArray(flatScoped)) return flatScoped;
  return [];
};

const getFormTableNotes = (formData: AnyRecord, sectionId: string, tableId: string): string => {
  const sectionScoped = formData?.sections?.[sectionId]?.tables?.[tableId]?.notes;
  const flatScoped = formData?.table_notes?.[tableId];
  if (typeof sectionScoped === 'string' && sectionScoped.trim()) return sectionScoped;
  if (typeof flatScoped === 'string' && flatScoped.trim()) return flatScoped;
  return '';
};

const getStatusStamp = (status?: string) => {
  switch (status) {
    case 'approved':
      return { text: 'APPROVED', className: 'text-green-700 border-green-700 bg-green-50' };
    case 'rejected':
      return { text: 'REJECTED', className: 'text-red-700 border-red-700 bg-red-50' };
    case 'submitted':
      return { text: 'PENDING', className: 'text-blue-700 border-blue-700 bg-blue-50' };
    default:
      return { text: 'DRAFT', className: 'text-gray-600 border-gray-500 bg-gray-50' };
  }
};

const resolveCellValue = (value: unknown, columnOrParameter: TableColumn | TableParameter) => {
  if (columnOrParameter.type === 'image') {
    let images: string[] = [];
    if (Array.isArray(value)) {
      images = value.filter((item): item is string => typeof item === 'string');
    } else if (typeof value === 'string') {
      if (value.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            images = parsed.filter((item): item is string => typeof item === 'string');
          } else {
            images = [value];
          }
        } catch (_error) {
          images = [value];
        }
      } else {
        images = [value];
      }
    }

    const validImages = images.filter((img) => img && img.length > 10);
    if (validImages.length === 0) return '-';

    return (
      <div className="w-full flex flex-col gap-1">
        {validImages.map((img, index) => (
          <div key={`${img.slice(0, 24)}-${index}`} className="w-full h-12 border border-slate-200 rounded overflow-hidden bg-white">
            <img src={img} alt={`cell-image-${index + 1}`} className="w-full h-full object-contain" />
          </div>
        ))}
      </div>
    );
  }

  if (columnOrParameter.type === 'boolean-check') {
    const normalized = String(value ?? '').toLowerCase();
    const isAccepted =
      value === true || normalized === 'true' || normalized === 'checked' || normalized === 'مقبول';
    const isRejected =
      value === false || normalized === 'false' || normalized === 'unchecked' || normalized === 'مرفوض';
    if (isAccepted) return '✓';
    if (isRejected) return '✗';
    return '-';
  }

  if (columnOrParameter.type === 'boolean-yesno') {
    const normalized = String(value ?? '').toLowerCase();
    if (value === true || normalized === 'true' || normalized === 'yes' || normalized === 'نعم') {
      return 'نعم';
    }
    if (value === false || normalized === 'false' || normalized === 'no' || normalized === 'لا') {
      return 'لا';
    }
    return '-';
  }

  return toText(value);
};

const QualityCriteriaBlock: React.FC<{ title: string; items: QualityCriteria[] }> = ({ title, items }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="a4-avoid-break border border-slate-300 rounded-md">
      <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold">{title}</div>
      <div className="p-2 space-y-2">
        {items.map((criterion, index) => (
          <div key={criterion.id || `criterion-${index}`} className="border border-slate-300 rounded-sm overflow-hidden">
            <div className="bg-slate-100 px-2 py-1 text-[11px] font-semibold">{criterion.title}</div>
            {criterion.acceptance && (
              <div className="px-2 py-1 text-[10px] border-y border-slate-200">
                <span className="font-semibold">معيار القبول:</span> {criterion.acceptance}
              </div>
            )}
            {Array.isArray(criterion.items) && criterion.items.length > 0 && (
              <table className="a4-clean-table w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-2 py-1 text-right font-semibold">المعلمة</th>
                    <th className="border border-slate-300 px-2 py-1 text-right font-semibold">المواصفة</th>
                  </tr>
                </thead>
                <tbody>
                  {criterion.items.map((item, itemIndex) => (
                    <tr key={`criterion-item-${itemIndex}`} className={itemIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 px-2 py-1 align-top">{item.parameter || '-'}</td>
                      <td className="border border-slate-300 px-2 py-1 align-top">{item.specification || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ParametersTable: React.FC<{
  table: Table;
  tableData: any[][];
  formData: AnyRecord;
  variableSnapshot?: VariableSnapshot;
}> = ({ table, tableData, formData, variableSnapshot }) => {
  const parameters = Array.isArray(table.parameters) ? table.parameters : [];
  const hasResolvedDisplayValue = (value: unknown): boolean =>
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(typeof value === 'string' && isVariableToken(value));

  const startTime = formData?.inspection_start_time || '08:00';
  const durationHours = Number(formData?.shift_duration || 8);
  const interval = Number(table.inspection_period || 60);
  const generatedHeaders = generateTimeHeaders(startTime, durationHours, interval);
  const timeHeaders = generatedHeaders.length > 0 ? generatedHeaders : ['08:00'];

  const timeIndexes = Array.from({ length: timeHeaders.length }, (_, index) => index);
  const showAvg = Boolean(table.features?.show_avg);
  const showStd = Boolean(table.features?.show_std);
  const statCount = Number(showAvg) + Number(showStd);

  const timeValueMaxLen = Math.max(
    ...timeHeaders.map((header) => textLen(header)),
    ...timeIndexes.flatMap((columnIndex) =>
      tableData.map((row) =>
        textLen(resolveSnapshotDisplayValue(Array.isArray(row) ? row[columnIndex] : '', variableSnapshot))
      )
    ),
    1
  );

  const statsPerRow = parameters.map((_, rowIndex) => {
    const row = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex] : [];
    const numericValues = timeIndexes
      .map((columnIndex) =>
        toFiniteNumber(resolveSnapshotDisplayValue(row[columnIndex], variableSnapshot))
      )
      .filter((value): value is number => value !== null);
    return calcStats(numericValues);
  });

  const statValueMaxLen = Math.max(
    textLen('AVG'),
    textLen('STD'),
    ...statsPerRow.map((item) => textLen(formatMetric(item.avg))),
    ...statsPerRow.map((item) => textLen(formatMetric(item.std))),
    1
  );

  let timeColCh = clamp(timeValueMaxLen + 1, 4, 10);
  let statColCh = clamp(statValueMaxLen + 1, 5, 11);
  const limitsValueMaxLen = Math.max(
    textLen('الحدود'),
    ...parameters.map((parameter) => {
      const resolvedParamMin = resolveSnapshotDisplayValue(parameter.min, variableSnapshot);
      const resolvedParamMax = resolveSnapshotDisplayValue(parameter.max, variableSnapshot);
      const resolvedParamLimits = resolveSnapshotDisplayValue(parameter.limits, variableSnapshot);
      const hasMin = hasResolvedDisplayValue(resolvedParamMin);
      const hasMax = hasResolvedDisplayValue(resolvedParamMax);
      const hasLimits = hasResolvedDisplayValue(resolvedParamLimits);
      const value =
        hasMin && hasMax
          ? `${resolvedParamMin} - ${resolvedParamMax}`
          : hasLimits
            ? String(resolvedParamLimits)
            : hasMin
              ? `>= ${resolvedParamMin}`
              : hasMax
                ? `<= ${resolvedParamMax}`
                : '-';
      return textLen(value);
    }),
    1
  );
  let limitsColCh = clamp(limitsValueMaxLen + 1, 9, 18);

  const parameterMinCh = 20;
  const totalChBudget = 100;
  const fixedTotal = limitsColCh + timeHeaders.length * timeColCh + statCount * statColCh;
  const maxFixedAllowed = totalChBudget - parameterMinCh;

  if (fixedTotal > maxFixedAllowed && fixedTotal > 0) {
    const scale = maxFixedAllowed / fixedTotal;
    timeColCh = Math.max(3.2, Number((timeColCh * scale).toFixed(1)));
    statColCh = Math.max(4.2, Number((statColCh * scale).toFixed(1)));
    limitsColCh = Math.max(6, Number((limitsColCh * scale).toFixed(1)));
  }

  const parameterColCh = Math.max(
    parameterMinCh,
    totalChBudget - (limitsColCh + timeHeaders.length * timeColCh + statCount * statColCh)
  );
  const totalColUnits = Math.max(
    1,
    parameterColCh + limitsColCh + timeHeaders.length * timeColCh + statCount * statColCh
  );
  const parameterColPct = Number(((parameterColCh / totalColUnits) * 100).toFixed(3));
  const limitsColPct = Number(((limitsColCh / totalColUnits) * 100).toFixed(3));
  const timeColPct = Number(((timeColCh / totalColUnits) * 100).toFixed(3));
  const statColPct = Number(((statColCh / totalColUnits) * 100).toFixed(3));

  return (
    <div className="border border-slate-300 rounded-md print:border-0 print:rounded-none print:overflow-visible">
      <table className="a4-clean-table w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${parameterColPct}%` }} />
          <col style={{ width: `${limitsColPct}%` }} />
          {timeHeaders.map((header, index) => (
            <col key={`${header}-${index}`} style={{ width: `${timeColPct}%` }} />
          ))}
          {showAvg && <col style={{ width: `${statColPct}%` }} />}
          {showStd && <col style={{ width: `${statColPct}%` }} />}
        </colgroup>
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-300 px-2 py-1 text-right font-semibold">المعلمة</th>
            <th className="border border-slate-300 px-1 py-1 text-center font-semibold whitespace-nowrap">الحدود</th>
            {timeHeaders.map((header, index) => (
              <th key={`${header}-${index}`} className="border border-slate-300 px-1 py-1 text-center font-semibold">
                {header}
              </th>
            ))}
            {showAvg && <th className="border border-slate-300 px-1 py-1 text-center font-semibold">AVG</th>}
            {showStd && <th className="border border-slate-300 px-1 py-1 text-center font-semibold">STD</th>}
          </tr>
        </thead>
        <tbody>
          {parameters.map((parameter, rowIndex) => {
            const row = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex] : [];
            const numericValues = timeIndexes
              .map((columnIndex) =>
                toFiniteNumber(resolveSnapshotDisplayValue(row[columnIndex], variableSnapshot))
              )
              .filter((value): value is number => value !== null);
            const stats = calcStats(numericValues);
            const resolvedParamMin = resolveSnapshotDisplayValue(parameter.min, variableSnapshot);
            const resolvedParamMax = resolveSnapshotDisplayValue(parameter.max, variableSnapshot);
            const resolvedParamLimits = resolveSnapshotDisplayValue(parameter.limits, variableSnapshot);
            const hasMin = hasResolvedDisplayValue(resolvedParamMin);
            const hasMax = hasResolvedDisplayValue(resolvedParamMax);
            const hasLimits = hasResolvedDisplayValue(resolvedParamLimits);
            const resolvedParamMinNumber = hasMin ? toFiniteNumber(resolvedParamMin) : null;
            const resolvedParamMaxNumber = hasMax ? toFiniteNumber(resolvedParamMax) : null;
            const limitsText =
              hasMin && hasMax
                ? `${resolvedParamMin} - ${resolvedParamMax}`
                : hasLimits
                  ? String(resolvedParamLimits)
                  : hasMin
                    ? `>= ${resolvedParamMin}`
                    : hasMax
                      ? `<= ${resolvedParamMax}`
                      : '-';

            return (
              <tr key={`parameter-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1 align-top">
                  <div className="font-medium text-[10px] leading-snug">
                    {parameter.name || '-'}
                    {parameter.unit ? <span className="text-slate-500 mr-1">({parameter.unit})</span> : null}
                  </div>
                </td>
                <td className="border border-slate-300 px-1 py-1 text-center text-[10px] leading-tight whitespace-nowrap">
                  {limitsText}
                </td>
                {timeIndexes.map((columnIndex) => {
                  const rawValue = row[columnIndex];
                  const resolvedValue = resolveSnapshotDisplayValue(rawValue, variableSnapshot);
                  const normalizedValue = resolveCellValue(resolvedValue, parameter);
                  const numericValue = toFiniteNumber(resolvedValue);
                  const hasNumericLimit =
                    resolvedParamMinNumber !== null &&
                    resolvedParamMaxNumber !== null &&
                    numericValue !== null;
                  const outOfRange =
                    hasNumericLimit &&
                    (numericValue < resolvedParamMinNumber || numericValue > resolvedParamMaxNumber);

                  return (
                    <td
                      key={`parameter-${rowIndex}-col-${columnIndex}`}
                      className={cn(
                        'border border-slate-300 px-1 py-1 text-center font-mono',
                        outOfRange && 'bg-rose-100 text-rose-800 font-bold'
                      )}
                    >
                      {normalizedValue}
                    </td>
                  );
                })}
                {showAvg && (
                  <td className="border border-slate-300 px-1 py-1 text-center font-mono">{formatMetric(stats.avg)}</td>
                )}
                {showStd && (
                  <td className="border border-slate-300 px-1 py-1 text-center font-mono">{formatMetric(stats.std)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const SampleTable: React.FC<{
  table: Table;
  tableData: any[][];
  formData: AnyRecord;
  template: AnyRecord;
  variableSnapshot?: VariableSnapshot;
}> = ({ table, tableData, formData, template, variableSnapshot }) => {
  const sampleSize = resolveSampleSize(table, 20);
  const rowCount = Math.max(sampleSize, tableData.length);

  const startTime = formData?.inspection_start_time || '08:00';
  const durationHours = Number(formData?.shift_duration || 8);
  const interval = Number(table.inspection_period || 60);
  const generatedHeaders = generateTimeHeaders(startTime, durationHours, interval);
  const timeHeaders = generatedHeaders.length > 0 ? generatedHeaders : ['08:00'];
  const timeIndexes = Array.from({ length: timeHeaders.length }, (_, index) => index);

  const showAverageRow = Boolean(table.features?.calculate_average || table.features?.show_avg);
  const showStdRow = Boolean(table.features?.calculate_std || table.features?.show_std);
  const showTare1Row = Boolean(table.features?.calculate_tare1);
  const showTare2Row = Boolean(table.features?.calculate_tare2);

  const standardWeight = toFiniteNumber(resolveSnapshotDisplayValue(template?.basic_info?.standard_weight, variableSnapshot));
  const maxStdRaw = resolveSnapshotDisplayValue(table.max_std, variableSnapshot);
  const maxStd = toFiniteNumber(maxStdRaw);
  const maxStdDisplay =
    maxStdRaw !== undefined && maxStdRaw !== null && maxStdRaw !== '' ? String(maxStdRaw) : null;
  const aqlLevel = String(template?.basic_info?.aql_level || table.aql_level || '1.0');
  const tare1 = standardWeight !== null ? calculateTare1(standardWeight) : null;
  const tare2 = standardWeight !== null ? calculateTare2(standardWeight) : null;
  const aqlLimits = getAQLLimits(aqlLevel, rowCount);

  const stoppedTimesByGroup = formData?.stopped_times || {};
  const stopKey = table.linked_stop_group || table.id;
  const stoppedTimes: string[] = Array.isArray(stoppedTimesByGroup?.[stopKey])
    ? stoppedTimesByGroup[stopKey]
    : [];
  const stoppedTimesSet = new Set(stoppedTimes);
  const isStoppedColumn = (columnIndex: number) => stoppedTimesSet.has(timeHeaders[columnIndex]);
  const resolveSampleCellValue = (rowIndex: number, columnIndex: number): unknown => {
    const rawValue = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex][columnIndex] : undefined;
    return resolveSnapshotDisplayValue(rawValue, variableSnapshot);
  };

  const getColumnNumericValues = (columnIndex: number): number[] => {
    if (isStoppedColumn(columnIndex)) return [];
    const numeric: number[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = resolveSampleCellValue(rowIndex, columnIndex);
      const parsed = toFiniteNumber(value);
      if (parsed !== null) numeric.push(parsed);
    }
    return numeric;
  };

  const getColumnValidation = (columnIndex: number) => {
    if (isStoppedColumn(columnIndex) || tare1 === null || tare2 === null) return null;
    const weights: Array<number | undefined> = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = resolveSampleCellValue(rowIndex, columnIndex);
      const parsed = toFiniteNumber(value);
      weights.push(parsed !== null ? parsed : undefined);
    }
    if (weights.every((value) => value === undefined)) return null;
    return validateColumn(weights, tare1, tare2, aqlLevel);
  };

  const columnStats = timeIndexes.map((columnIndex) => {
    const values = getColumnNumericValues(columnIndex);
    const stats = calcStats(values);
    return { avg: stats.avg, std: stats.std, valuesCount: values.length };
  });

  const timeValueMaxLen = Math.max(
    ...timeHeaders.map((header) => textLen(header)),
    ...timeIndexes.flatMap((columnIndex) =>
      Array.from({ length: rowCount }, (_, rowIndex) => textLen(resolveSampleCellValue(rowIndex, columnIndex)))
    ),
    ...columnStats.map((stats) => textLen(formatMetric(stats.avg))),
    ...columnStats.map((stats) => textLen(formatMetric(stats.std, 3))),
    1
  );
  const labelMaxLen = Math.max(
    textLen('العينة #'),
    textLen(String(rowCount)),
    showAverageRow ? textLen(standardWeight !== null ? `AVG (>=${standardWeight})` : 'AVG') : 0,
    showStdRow ? textLen(maxStdDisplay ? `STD (<=${maxStdDisplay})` : 'STD') : 0,
    showTare1Row ? textLen(`T1 (<=${aqlLimits.acceptance})`) : 0,
    showTare2Row ? textLen('T2 (<=0)') : 0
  );

  let sampleNoColCh = clamp(labelMaxLen + 2, 8, 18);
  let timeColCh = clamp(timeValueMaxLen + 1, 4, 10);
  const totalChBudget = 100;
  const fixedTotal = sampleNoColCh + timeColCh * Math.max(1, timeHeaders.length);
  if (fixedTotal > totalChBudget) {
    const scale = totalChBudget / fixedTotal;
    sampleNoColCh = Math.max(7, Number((sampleNoColCh * scale).toFixed(1)));
    timeColCh = Math.max(3.2, Number((timeColCh * scale).toFixed(1)));
  }

  const totalColUnits = Math.max(1, sampleNoColCh + timeColCh * Math.max(1, timeHeaders.length));
  const sampleNoColPct = Number(((sampleNoColCh / totalColUnits) * 100).toFixed(3));
  const sampleTimeColPct = Number(((timeColCh / totalColUnits) * 100).toFixed(3));

  return (
    <div className="border border-slate-300 rounded-md print:border-0 print:rounded-none print:overflow-visible">
      <table className="a4-clean-table w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${sampleNoColPct}%` }} />
          {timeHeaders.map((header, index) => (
            <col key={`${header}-${index}`} style={{ width: `${sampleTimeColPct}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-300 px-1 py-1 text-center font-semibold whitespace-nowrap">
              العينة #
            </th>
            {timeHeaders.map((header, index) => (
              <th key={`${header}-${index}`} className="border border-slate-300 px-1 py-1 text-center font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => {
            return (
              <tr key={`sample-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-1 py-1 text-center font-semibold text-slate-600">
                  {rowIndex + 1}
                </td>
                {timeIndexes.map((columnIndex) => {
                  const stopped = isStoppedColumn(columnIndex);
                  const value = resolveSampleCellValue(rowIndex, columnIndex);
                  const hasValue = value !== undefined && value !== null && value !== '';
                  const displayValue = hasValue ? String(value) : '-';
                  return (
                    <td
                      key={`sample-${rowIndex}-col-${columnIndex}`}
                      className={cn(
                        'border border-slate-300 px-1 py-1 text-center font-mono',
                        stopped && 'bg-orange-100 text-orange-700 font-semibold',
                        !hasValue && 'text-slate-300'
                      )}
                    >
                      {stopped ? 'STOP' : displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {showAverageRow && (
            <tr className="bg-blue-100 font-semibold">
              <td className="border border-slate-300 px-1 py-1 text-center text-blue-800 whitespace-nowrap">
                {standardWeight !== null ? `AVG (>=${standardWeight})` : 'AVG'}
              </td>
              {timeIndexes.map((columnIndex) => {
                const stopped = isStoppedColumn(columnIndex);
                const average = columnStats[columnIndex].avg;
                const belowStandard = standardWeight !== null && average !== null && average < standardWeight;
                return (
                  <td
                    key={`sample-avg-${columnIndex}`}
                    className={cn(
                      'border border-slate-300 px-1 py-1 text-center font-mono text-blue-800',
                      stopped && 'bg-orange-100 text-orange-700 font-semibold',
                      !stopped && average !== null && standardWeight !== null && belowStandard && 'bg-rose-100 text-rose-800',
                      !stopped && average !== null && standardWeight !== null && !belowStandard && 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    {stopped ? 'STOP' : average !== null ? average.toFixed(2) : '-'}
                  </td>
                );
              })}
            </tr>
          )}

          {showStdRow && (
            <tr className="bg-purple-100 font-semibold">
              <td className="border border-slate-300 px-1 py-1 text-center text-purple-800 whitespace-nowrap">
                {maxStdDisplay ? `STD (<=${maxStdDisplay})` : 'STD'}
              </td>
              {timeIndexes.map((columnIndex) => {
                const stopped = isStoppedColumn(columnIndex);
                const std = columnStats[columnIndex].std;
                const exceedsMaxStd = maxStd !== null && std !== null && std > maxStd;
                return (
                  <td
                    key={`sample-std-${columnIndex}`}
                    className={cn(
                      'border border-slate-300 px-1 py-1 text-center font-mono text-purple-800',
                      stopped && 'bg-orange-100 text-orange-700 font-semibold',
                      !stopped && maxStd !== null && std !== null && exceedsMaxStd && 'bg-rose-100 text-rose-800',
                      !stopped && maxStd !== null && std !== null && !exceedsMaxStd && 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    {stopped ? 'STOP' : std !== null ? std.toFixed(3) : '-'}
                  </td>
                );
              })}
            </tr>
          )}

          {showTare1Row && (
            <tr className="bg-cyan-100 font-semibold">
              <td className="border border-slate-300 px-1 py-1 text-center text-cyan-800 whitespace-nowrap">
                {`T1 (<=${aqlLimits.acceptance})`}
              </td>
              {timeIndexes.map((columnIndex) => {
                const stopped = isStoppedColumn(columnIndex);
                const validation = getColumnValidation(columnIndex);
                return (
                  <td
                    key={`sample-t1-${columnIndex}`}
                    className={cn(
                      'border border-slate-300 px-1 py-1 text-center font-mono text-cyan-800',
                      stopped && 'bg-orange-100 text-orange-700 font-semibold',
                      !stopped && validation?.status === 'مقبول' && 'bg-emerald-100 text-emerald-800',
                      !stopped && validation?.status === 'مرفوض' && 'bg-rose-100 text-rose-800'
                    )}
                    title={validation?.reason || undefined}
                  >
                    {stopped ? 'STOP' : validation ? (validation.status === 'مقبول' ? '✓' : '✗') : '-'}
                  </td>
                );
              })}
            </tr>
          )}

          {showTare2Row && (
            <tr className="bg-sky-100 font-semibold">
              <td className="border border-slate-300 px-1 py-1 text-center text-sky-800 whitespace-nowrap">
                {'T2 (<=0)'}
              </td>
              {timeIndexes.map((columnIndex) => {
                const stopped = isStoppedColumn(columnIndex);
                const validation = getColumnValidation(columnIndex);
                return (
                  <td
                    key={`sample-t2-${columnIndex}`}
                    className={cn(
                      'border border-slate-300 px-1 py-1 text-center font-mono text-sky-800',
                      stopped && 'bg-orange-100 text-orange-700 font-semibold',
                      !stopped && validation?.status === 'مقبول' && 'bg-emerald-100 text-emerald-800',
                      !stopped && validation?.status === 'مرفوض' && 'bg-rose-100 text-rose-800'
                    )}
                    title={validation?.reason || undefined}
                  >
                    {stopped ? 'STOP' : validation ? (validation.status === 'مقبول' ? '✓' : '✗') : '-'}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const RecipeTraceabilityPreviewTable: React.FC<{
  table: Table;
  tableData: any[][];
  previewRecipes: AnyRecord[];
}> = ({ table, tableData, previewRecipes }) => {
  const rawTableData = Array.isArray(tableData) ? tableData : [];
  const lastRow = rawTableData[rawTableData.length - 1] as AnyRecord | undefined;
  const hasRecipeMeta = lastRow?.__recipe_meta__ === true;
  const recipeMeta = hasRecipeMeta ? lastRow : null;
  const dataRows = (hasRecipeMeta ? rawTableData.slice(0, -1) : rawTableData).filter((row) => Array.isArray(row));
  const metaDoughCountByRecipe = (() => {
    const source = recipeMeta?.dough_count_by_recipe || recipeMeta?.doughCountByRecipe;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {} as Record<string, number>;

    return Object.entries(source as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, value]) => {
      const parsed = toPositiveInt(value);
      if (key && parsed !== null) {
        acc[key] = parsed;
      }
      return acc;
    }, {});
  })();
  const metaRecipeRowsById = (() => {
    const source = recipeMeta?.recipe_rows_by_id || recipeMeta?.recipeRowsById || recipeMeta?.rows_by_recipe;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {} as Record<string, any[][]>;

    return Object.entries(source as Record<string, unknown>).reduce<Record<string, any[][]>>((acc, [key, value]) => {
      if (!key || !Array.isArray(value)) return acc;
      acc[key] = value.filter((row) => Array.isArray(row)) as any[][];
      return acc;
    }, {});
  })();

  const tableDerivedIngredients = dataRows.map((row: any) => ({
    ingredient_name: row[0],
    quantity: row[1],
    unit: row[2],
    batches: Array.isArray(row[3]) ? row[3] : [],
  }));

  const metaRecipesCandidates = [
    recipeMeta?.recipes,
    recipeMeta?.all_recipes,
    recipeMeta?.allRecipes,
    recipeMeta?.recipe_list,
    recipeMeta?.__recipes__,
  ];
  const recipesFromMetaList = metaRecipesCandidates.find((candidate) => Array.isArray(candidate)) as AnyRecord[] | undefined;
  const recipesFromMeta = Array.isArray(recipesFromMetaList) ? recipesFromMetaList.filter((item) => item && typeof item === 'object') : [];
  const catalogRecipes = Array.isArray(previewRecipes) ? previewRecipes : [];
  const shouldPreferCatalogRecipes = catalogRecipes.length > 1;

  const recipesToDisplay =
    recipesFromMeta.length > 0
      ? recipesFromMeta
      : shouldPreferCatalogRecipes
        ? catalogRecipes
        : recipeMeta
          ? [recipeMeta]
          : catalogRecipes.length > 0
            ? catalogRecipes
            : tableDerivedIngredients.length > 0
              ? [
                  {
                    id: `table-${table.id}`,
                    name: table.name || 'تتبع الخامات',
                    ingredients: tableDerivedIngredients,
                  },
                ]
              : [];

  if (!recipesToDisplay.length) {
    return (
      <div className="border border-slate-300 rounded-md p-3 text-[11px] text-slate-600">
        لا توجد بيانات تتبع خامات لهذا الجدول.
      </div>
    );
  }

  const getRecipeKey = (recipe: AnyRecord, recipeIndex: number) =>
    String(recipe?.id || recipe?.recipe_id || recipe?.name || `recipe-${recipeIndex}`);

  const getRecipeDoughCount = (recipe: AnyRecord, recipeIndex: number): number => {
    const recipeId = String(recipe?.id || recipe?.recipe_id || '').trim();
    if (recipeId && metaDoughCountByRecipe[recipeId] !== undefined) {
      return metaDoughCountByRecipe[recipeId];
    }

    const recipeRows = recipeId ? metaRecipeRowsById[recipeId] : undefined;
    if (Array.isArray(recipeRows) && Array.isArray(recipeRows[0])) {
      const parsed = toPositiveInt(recipeRows[0]?.[4]);
      if (parsed !== null) return parsed;
    }

    if (recipeIndex === 0 && Array.isArray(dataRows[0])) {
      const parsed = toPositiveInt(dataRows[0]?.[4]);
      if (parsed !== null) return parsed;
    }

    return 1;
  };

  const normalizeSummaryRecipeName = (name: string): string => {
    const normalized = String(name || '')
      .replace(/مكونا\s+ت/gi, 'مكونات')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return 'وصفة';

    const withoutRepeatedDoughPrefix = normalized
      .replace(/^مكونات?\s+العجين\s*/i, '')
      .trim();

    return withoutRepeatedDoughPrefix || normalized;
  };

  const doughCountSummary = recipesToDisplay.map((recipe, recipeIndex) => ({
    key: getRecipeKey(recipe, recipeIndex),
    name: normalizeSummaryRecipeName(String(recipe?.name || `وصفة ${recipeIndex + 1}`)),
    doughCount: getRecipeDoughCount(recipe, recipeIndex),
  }));

  const renderRecipeTable = (recipe: AnyRecord, recipeIndex: number) => {
    const recipeIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const baseIngredients = recipeIngredients.length > 0 ? recipeIngredients : recipeIndex === 0 ? tableDerivedIngredients : [];
    const ingredients = baseIngredients.map((ingredient: AnyRecord, ingredientIndex: number) => {
      const rowFromTable = dataRows[ingredientIndex] as any[] | undefined;
      const rowBatches =
        recipeIndex === 0 && Array.isArray(rowFromTable?.[3])
          ? rowFromTable?.[3]
          : [];
      return {
        ...ingredient,
        ingredient_name: ingredient?.ingredient_name || ingredient?.name || tableDerivedIngredients[ingredientIndex]?.ingredient_name,
        quantity: ingredient?.quantity ?? tableDerivedIngredients[ingredientIndex]?.quantity,
        unit: ingredient?.unit ?? tableDerivedIngredients[ingredientIndex]?.unit,
        batches: rowBatches.length > 0 ? rowBatches : Array.isArray(ingredient?.batches) ? ingredient.batches : [],
      };
    });

    if (!ingredients.length) {
      return <div className="border border-slate-300 rounded-md p-3 text-[11px] text-slate-600">لا توجد بيانات خامات محفوظة لهذه الوصفة.</div>;
    }

    return (
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-blue-800">
          وصفة {recipeIndex + 1}: {recipe?.name || `وصفة ${recipeIndex + 1}`}
          {recipe?.version ? <span className="mr-1 text-[10px] text-slate-500">(v{recipe.version})</span> : null}
        </div>

        <div className="border border-slate-300 rounded-md print:border-0 print:rounded-none print:overflow-visible">
          <table className="a4-clean-table w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '19%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-300 px-2 py-1 text-right font-semibold">الخامة</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-semibold">الكمية</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-semibold">الوحدة</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-semibold">رقم التشغيلة</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-semibold">تاريخ الإنتاج</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-semibold">تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.flatMap((ingredient: AnyRecord, ingredientIndex: number) => {
                const ingredientName = toText(ingredient?.ingredient_name || ingredient?.name);
                const quantity = toText(ingredient?.quantity);
                const unit = getUnitDisplayLabel(ingredient?.unit);
                const batches = Array.isArray(ingredient?.batches) && ingredient.batches.length > 0
                  ? ingredient.batches
                  : [null];
                const rowClass = ingredientIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                return batches.map((batch: AnyRecord | null, batchIndex: number) => {
                  const batchNumber = toText(batch?.batchNumber || batch?.lotNumber || batch?.batch_number);
                  const productionDate = formatMaterialDateForDisplay(
                    batch?.productionDate || batch?.production_date,
                    (batch?.productionDateFormat || batch?.production_date_format || 'dmy') as 'dmy' | 'my',
                    'ar'
                  );
                  const expiryDate = formatMaterialDateForDisplay(
                    batch?.expiryDate || batch?.expiry_date,
                    (batch?.expiryDateFormat || batch?.expiry_date_format || 'dmy') as 'dmy' | 'my',
                    'ar'
                  );

                  return (
                    <tr key={`recipe-${recipeIndex}-ing-${ingredientIndex}-batch-${batchIndex}`} className={rowClass}>
                      {batchIndex === 0 ? (
                        <>
                          <td className="border border-slate-300 px-2 py-1 align-top" rowSpan={batches.length}>
                            {ingredientName}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 text-center align-top" rowSpan={batches.length}>
                            {quantity}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 text-center align-top" rowSpan={batches.length}>
                            {unit}
                          </td>
                        </>
                      ) : null}
                      <td className="border border-slate-300 px-1 py-1 text-center">{batchNumber}</td>
                      <td className="border border-slate-300 px-1 py-1 text-center">{productionDate}</td>
                      <td className="border border-slate-300 px-1 py-1 text-center">{expiryDate}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const firstPair = recipesToDisplay.slice(0, 2);
  const remainingRecipes = recipesToDisplay.slice(2);

  return (
    <div className="space-y-3">
      {firstPair.length > 0 ? (
        firstPair.length === 1 ? (
          renderRecipeTable(firstPair[0], 0)
        ) : (
          <div className="grid grid-cols-2 gap-3" dir="rtl">
            {firstPair.map((recipe, recipeIndex) => (
              <div key={getRecipeKey(recipe, recipeIndex)} className="min-w-0">
                {renderRecipeTable(recipe, recipeIndex)}
              </div>
            ))}
          </div>
        )
      ) : null}

      {remainingRecipes.map((recipe, recipeIndex) => (
        <div key={getRecipeKey(recipe, recipeIndex + 2)} className="w-full">
          {renderRecipeTable(recipe, recipeIndex + 2)}
        </div>
      ))}

      {doughCountSummary.length > 0 ? (
        <div className="border border-slate-300 rounded-md px-3 py-2 bg-slate-50">
          <div className="text-[11px] font-semibold text-slate-700 mb-1.5">عدد العجنات</div>
          <div className="flex flex-wrap gap-1.5">
            {doughCountSummary.map((item) => (
              <div
                key={item.key}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1"
              >
                <span className="text-[10px] text-slate-700">{item.name}</span>
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded border border-slate-400 bg-transparent text-black text-[10px] font-bold px-1.5">
                  {item.doughCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const GenericTable: React.FC<{
  table: Table;
  tableData: any[][];
  inspectionStartTime?: string;
  shiftDuration?: number;
  variableSnapshot?: VariableSnapshot;
}> = ({ table, tableData, inspectionStartTime = '08:00', shiftDuration = 8, variableSnapshot }) => {
  const columns = getCustomColumnsForRendering(table);
  const gridSettings = getCustomGridSettingsForRendering(table);
  const layoutSettings = getCustomLayoutForRendering(table);
  const customMeta = (table.schema_v2?.meta as AnyRecord) || {};
  const useCustomTimeHeader = Boolean(customMeta.time_header_enabled);
  const customIntervalMinutes = Math.max(1, Number(table.inspection_period || 30));
  const generatedCustomTimeHeaders = useCustomTimeHeader
    ? generateTimeHeaders(inspectionStartTime, shiftDuration, customIntervalMinutes)
    : [];
  const getCustomColumnLabel = (colIndex: number) =>
    generatedCustomTimeHeaders[colIndex] ||
    columns[colIndex]?.label ||
    columns[colIndex]?.key ||
    `عمود ${colIndex + 1}`;
  const showRowNumbers = gridSettings.showRowNumbers !== false;
  const rowHeaderLabel = gridSettings.rowHeaderLabel || '#';
  const getResolvedCustomCellValue = (
    rows: any[][],
    rowIndex: number,
    colIndex: number,
    column: TableColumn
  ) =>
    resolveSnapshotDisplayValue(
      resolveCustomCellDisplayValue(
        table,
        rows,
        rowIndex,
        colIndex,
        column.type || 'text',
        column
      ).value,
      variableSnapshot
    );
  const fallbackRows = Number(gridSettings.rows || 0);
  const baseRowCount = Math.max(tableData.length, fallbackRows, 1);
  const rawHeaderRows = getCustomHeaderRowsForRendering(table);
  const rawSideHeaderRows = getCustomSideHeaderRowsForRendering(table);
  const customHeaderRows = rawHeaderRows
    .filter((row: unknown) => Array.isArray(row) && row.length > 0)
    .map((row: any[]) =>
      row.map((cell: AnyRecord) => ({
        label: cell?.label ?? '',
        col_span: Math.max(1, Number(cell?.col_span ?? cell?.colSpan ?? 1) || 1),
        row_span: Math.max(1, Number(cell?.row_span ?? cell?.rowSpan ?? 1) || 1),
        align: (cell?.align as 'right' | 'center' | 'left') || 'center',
        background_color: cell?.background_color,
        text_color: cell?.text_color,
        class_name: cell?.class_name,
      }))
    );
  const sideHeaderModel = buildSideHeaderRenderModel(rawSideHeaderRows, baseRowCount);
  const customSideHeaderRows = sideHeaderModel.rows;
  const showTopHeader = layoutSettings.topHeader !== false;
  const hasCustomHeaderRows = showTopHeader && customHeaderRows.length > 0 && !useCustomTimeHeader;
  const hasCustomSideHeaders = layoutSettings.sideHeader && sideHeaderModel.columnCount > 0;
  const customSideHeaderColumnCount = hasCustomSideHeaders
    ? sideHeaderModel.columnCount
    : 0;
  const sideHeaderColumnLabels = hasCustomSideHeaders
    ? getCustomSideHeaderLabelsForRendering(table, customSideHeaderColumnCount)
    : [];
  const sideHeaderMatrix = hasCustomSideHeaders
    ? expandSideHeaderRowsToMatrix(customSideHeaderRows, customSideHeaderColumnCount)
    : [];
  const useDistributedSideHeaders = hasCustomSideHeaders && !hasCustomHeaderRows;
  const sideHeaderTargets = useDistributedSideHeaders
    ? getCustomSideHeaderTargetsForRendering(table, customSideHeaderColumnCount, columns.length)
    : [];
  const sideHeaderIndexesByTarget = sideHeaderTargets.reduce<Record<number, number[]>>((acc, target, sideIndex) => {
    const normalizedTarget = Math.max(0, Math.min(columns.length, Number(target) || 0));
    if (!acc[normalizedTarget]) acc[normalizedTarget] = [];
    acc[normalizedTarget].push(sideIndex);
    return acc;
  }, {});
  const visibleColumnByIndex = new Map(columns.map((column, index) => [index, column] as const));
  const rowCount = Math.max(baseRowCount, customSideHeaderRows.length);
  const boldRowSeparators = getCustomBoldRowSeparatorsForRendering(table, rowCount);
  const boldColumnSeparators = getCustomBoldColumnSeparatorsForRendering(table, columns.length);
  const boldRowSeparatorSet = new Set(boldRowSeparators);
  const boldColumnSeparatorSet = new Set(boldColumnSeparators);
  const getColumnSeparatorStyle = (colIndex: number): React.CSSProperties | undefined => {
    if (!boldColumnSeparatorSet.has(colIndex + 1)) return undefined;
    if (layoutSettings.direction === 'rtl') {
      return { borderLeftWidth: '3px', borderLeftStyle: 'double' };
    }
    return { borderRightWidth: '3px', borderRightStyle: 'double' };
  };
  const getDataSeparatorStyle = (rowIndex: number, colIndex: number) => {
    const style: React.CSSProperties = {};
    const columnStyle = getColumnSeparatorStyle(colIndex);
    if (columnStyle) Object.assign(style, columnStyle);
    if (boldRowSeparatorSet.has(rowIndex + 1)) {
      style.borderBottomWidth = '3px';
      style.borderBottomStyle = 'double';
    }
    return Object.keys(style).length > 0 ? style : undefined;
  };
  const getRowSeparatorStyle = (rowIndex: number) =>
    boldRowSeparatorSet.has(rowIndex + 1)
      ? ({ borderBottomWidth: '3px', borderBottomStyle: 'double' } as const)
      : undefined;

  if (!columns.length) {
    return (
      <div className="border border-slate-300 rounded-md p-3 text-[11px] text-slate-600">
        لا توجد أعمدة معرفة لهذا الجدول.
      </div>
    );
  }

  return (
    <div
      className="border border-slate-300 rounded-md print:border-0 print:rounded-none print:overflow-visible"
      dir={layoutSettings.direction}
    >
      <table className="a4-clean-table w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {showRowNumbers && <col style={{ width: '6ch' }} />}
          {useDistributedSideHeaders
            ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                <React.Fragment key={`a4-colgroup-position-${positionIndex}`}>
                  {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                    <col key={`a4-side-col-${positionIndex}-${sideIndex}`} style={{ width: '12ch' }} />
                  ))}
                  {visibleColumnByIndex.has(positionIndex) && (
                    <col key={`a4-col-${positionIndex}`} />
                  )}
                </React.Fragment>
              ))
            : (
                <>
                  {hasCustomSideHeaders &&
                    Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                      <col key={`side-col-${sideIndex}`} style={{ width: '12ch' }} />
                    ))}
                  {columns.map((column, index) => (
                    <col key={`${column.key || column.label}-${index}`} />
                  ))}
                </>
              )}
        </colgroup>
        {showTopHeader && (
          <thead>
            {hasCustomHeaderRows ? (
              customHeaderRows.map((headerRow, headerRowIndex) => (
                <tr key={`header-row-${headerRowIndex}`} className="bg-slate-800 text-white">
                  {showRowNumbers && headerRowIndex === 0 && (
                    <th
                      rowSpan={customHeaderRows.length}
                      className="border border-slate-300 px-1 py-1 text-center font-semibold"
                    >
                      {rowHeaderLabel}
                    </th>
                  )}
                  {hasCustomSideHeaders && headerRowIndex === 0 && (
                    <th
                      rowSpan={customHeaderRows.length}
                      colSpan={customSideHeaderColumnCount}
                      className="border border-slate-300 px-1 py-1 text-center font-semibold"
                    >
                      الرأس الجانبي
                    </th>
                  )}
                  {headerRow.map((cell, cellIndex) => (
                    <th
                      key={`header-cell-${headerRowIndex}-${cellIndex}`}
                      colSpan={cell.col_span || 1}
                      rowSpan={cell.row_span || 1}
                      className={cn(
                        'border border-slate-300 px-2 py-1 font-semibold',
                        cell.align === 'left' ? 'text-left' : cell.align === 'right' ? 'text-right' : 'text-center',
                        cell.class_name
                      )}
                      style={{
                        backgroundColor: cell.background_color || undefined,
                        color: cell.text_color || undefined,
                      }}
                    >
                      {cell.label || '-'}
                    </th>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="bg-slate-800 text-white">
                {showRowNumbers && (
                  <th className="border border-slate-300 px-1 py-1 text-center font-semibold">
                    {rowHeaderLabel}
                  </th>
                )}
                {useDistributedSideHeaders
                  ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                      <React.Fragment key={`a4-head-position-${positionIndex}`}>
                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => (
                          <th
                            key={`a4-side-header-${positionIndex}-${sideIndex}`}
                            className="border border-slate-300 px-1 py-1 text-center font-semibold"
                          >
                            {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                          </th>
                        ))}
                        {visibleColumnByIndex.has(positionIndex) && (
                          <th
                            key={`a4-header-col-${positionIndex}`}
                            className={cn(
                              'border border-slate-300 px-2 py-1 font-semibold',
                              visibleColumnByIndex.get(positionIndex)?.align === 'left'
                                ? 'text-left'
                                : visibleColumnByIndex.get(positionIndex)?.align === 'right'
                                  ? 'text-right'
                                  : 'text-center'
                            )}
                            style={getColumnSeparatorStyle(positionIndex)}
                          >
                            {getCustomColumnLabel(positionIndex)}
                          </th>
                        )}
                      </React.Fragment>
                    ))
                  : (
                      <>
                        {hasCustomSideHeaders &&
                          Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => (
                            <th key={`side-header-${sideIndex}`} className="border border-slate-300 px-1 py-1 text-center font-semibold">
                              {sideHeaderColumnLabels[sideIndex] || `رأس ${sideIndex + 1}`}
                            </th>
                          ))}
                        {columns.map((column, index) => (
                          <th
                            key={`${column.key || column.label}-${index}`}
                            className={cn(
                              'border border-slate-300 px-2 py-1 font-semibold',
                              column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center'
                            )}
                            style={getColumnSeparatorStyle(index)}
                          >
                            {getCustomColumnLabel(index)}
                          </th>
                        ))}
                      </>
                    )}
              </tr>
            )}
          </thead>
        )}
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => {
            return (
              <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {showRowNumbers && (
                  <td
                    className="border border-slate-300 px-1 py-1 text-center text-slate-500"
                    style={getRowSeparatorStyle(rowIndex)}
                  >
                    {rowIndex + 1}
                  </td>
                )}
                {useDistributedSideHeaders
                  ? Array.from({ length: columns.length + 1 }).map((_, positionIndex) => (
                      <React.Fragment key={`a4-body-position-${rowIndex}-${positionIndex}`}>
                        {(sideHeaderIndexesByTarget[positionIndex] || []).map((sideIndex) => {
                          const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                          if (!cell) return null;
                          return (
                            <th
                              key={`a4-side-row-${rowIndex}-${positionIndex}-${sideIndex}`}
                              rowSpan={cell.row_span || 1}
                              className={cn(
                                'border border-slate-300 px-1 py-1 font-semibold text-white bg-slate-800',
                                cell.align === 'left' ? 'text-left' : cell.align === 'right' ? 'text-right' : 'text-center',
                                cell.class_name
                              )}
                              style={{
                                ...getRowSeparatorStyle(rowIndex),
                                backgroundColor: cell.background_color || undefined,
                                color: cell.text_color || undefined,
                              }}
                            >
                              {cell.label || '-'}
                            </th>
                          );
                        })}
                        {visibleColumnByIndex.has(positionIndex) && (() => {
                          const column = visibleColumnByIndex.get(positionIndex)!;
                          return (
                            <td
                              key={`a4-body-col-${positionIndex}`}
                              className={cn(
                                'border border-slate-300 px-2 py-1',
                                column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center'
                              )}
                              style={getDataSeparatorStyle(rowIndex, positionIndex)}
                            >
                              {resolveCellValue(
                                getResolvedCustomCellValue(tableData, rowIndex, positionIndex, column),
                                {
                                  ...column,
                                  type: resolveCustomCellType(table, rowIndex, positionIndex, column.type || 'text'),
                                }
                              )}
                            </td>
                          );
                        })()}
                      </React.Fragment>
                    ))
                  : (
                      <>
                        {hasCustomSideHeaders &&
                          Array.from({ length: customSideHeaderColumnCount }).map((_, sideIndex) => {
                            const cell = sideHeaderMatrix[rowIndex]?.[sideIndex];
                            if (!cell) return null;
                            return (
                              <th
                                key={`side-row-${rowIndex}-${sideIndex}`}
                                rowSpan={cell.row_span || 1}
                              className={cn(
                                  'border border-slate-300 px-1 py-1 font-semibold text-white bg-slate-800',
                                  cell.align === 'left' ? 'text-left' : cell.align === 'right' ? 'text-right' : 'text-center',
                                  cell.class_name
                                )}
                                style={{
                                  ...getRowSeparatorStyle(rowIndex),
                                  backgroundColor: cell.background_color || undefined,
                                  color: cell.text_color || undefined,
                                }}
                              >
                                {cell.label || '-'}
                              </th>
                            );
                          })}
                        {columns.map((column, columnIndex) => (
                          <td
                            key={`${column.key || column.label}-${columnIndex}`}
                            className={cn(
                              'border border-slate-300 px-2 py-1',
                              column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center'
                            )}
                            style={getDataSeparatorStyle(rowIndex, columnIndex)}
                          >
                            {resolveCellValue(
                              getResolvedCustomCellValue(tableData, rowIndex, columnIndex, column),
                              {
                                ...column,
                                type: resolveCustomCellType(table, rowIndex, columnIndex, column.type || 'text'),
                              }
                            )}
                          </td>
                        ))}
                      </>
                    )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ReportViewerA4: React.FC = () => {
  const { templateId, instanceId } = useParams<{ templateId?: string; instanceId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { formTemplates, formInstances, syncInstance, currentFolderId } = useStore();
  const { getActiveTab, openTab } = useTabsStore();
  const { selectedCompany } = useCompanyStore();
  const { logoUrl, logoScale } = useAppSettingsStore();
  const { formatDate } = useDateFormat();
  const { can, isAdmin, loading: permissionsLoading } = usePermissions();
  const { claimReport, approveReport, rejectReport, isLoading: workflowLoading } = useReportWorkflow();
  const addToast = useToastStore((state) => state.addToast);

  const [loadedInstance, setLoadedInstance] = useState<any>(null);
  const [loadedTemplate, setLoadedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewRecipes, setPreviewRecipes] = useState<AnyRecord[]>([]);

  const instance = loadedInstance || (instanceId ? formInstances[instanceId] : null);
  const storeTemplate = templateId
    ? formTemplates[templateId]
    : instance?.template_id
      ? formTemplates[instance.template_id]
      : null;
  const template = loadedTemplate || storeTemplate;
  const formData = instance?.form_data || {};
  const documentVariableSnapshot = useMemo(() => {
    const snapshot = formData?.document_variables_snapshot;
    if (!snapshot || typeof snapshot !== 'object') return undefined;
    return snapshot as Record<string, string | number>;
  }, [formData?.document_variables_snapshot]);
  const isReportFrozenByApproval = instance?.status === 'approved' || instance?.status === 'archived';
  const [fallbackVariableSnapshot, setFallbackVariableSnapshot] = useState<VariableSnapshot | undefined>(undefined);
  const effectiveVariableSnapshot = useMemo(() => {
    if (documentVariableSnapshot && Object.keys(documentVariableSnapshot).length > 0) {
      return documentVariableSnapshot;
    }
    if (!isReportFrozenByApproval && fallbackVariableSnapshot && Object.keys(fallbackVariableSnapshot).length > 0) {
      return fallbackVariableSnapshot;
    }
    return undefined;
  }, [documentVariableSnapshot, fallbackVariableSnapshot, isReportFrozenByApproval]);
  const templateForRendering = useMemo(() => {
    if (!template) return template;
    if (!effectiveVariableSnapshot || Object.keys(effectiveVariableSnapshot).length === 0) return template;
    return applyDocumentVariableBindingsToTemplate(template, effectiveVariableSnapshot);
  }, [effectiveVariableSnapshot, template]);
  const viewPath = instanceId ? `/reports/view/${instanceId}` : null;
  const viewTabTitle = useMemo(() => {
    if (templateForRendering?.name) return `تقرير - ${templateForRendering.name}`;
    return 'عرض تقرير';
  }, [templateForRendering?.name]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('report-preview-active');
    document.body.classList.add('report-preview-clean-a4');
    return () => {
      document.body.classList.remove('report-preview-active');
      document.body.classList.remove('report-preview-clean-a4');
    };
  }, []);

  useEffect(() => {
    const loadInstanceFromDB = async () => {
      if (!instanceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { instancesService } = await import('../services/supabaseService');
        const fetched = await instancesService.getInstance(instanceId);
        if (fetched) {
          setLoadedInstance(fetched);
          syncInstance(fetched);
        } else if (formInstances[instanceId]) {
          setLoadedInstance(formInstances[instanceId]);
        }
      } catch (_error) {
        if (formInstances[instanceId]) {
          setLoadedInstance(formInstances[instanceId]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInstanceFromDB();
  }, [instanceId, formInstances, syncInstance]);

  useEffect(() => {
    const loadTemplateFromDB = async () => {
      const resolvedTemplateId = templateId || instance?.template_id;
      if (!resolvedTemplateId) return;

      if (storeTemplate?.sections && Object.keys(storeTemplate.sections).length > 0) {
        setLoadedTemplate(storeTemplate);
        return;
      }

      try {
        const { templatesService } = await import('../services/supabaseService');
        const fetched = await templatesService.getTemplate(resolvedTemplateId);
        if (fetched) setLoadedTemplate(fetched);
      } catch (_error) {
        // Keep store fallback silently.
      }
    };

    loadTemplateFromDB();
  }, [templateId, instance?.template_id, storeTemplate]);

  useEffect(() => {
    const hasReportSnapshot =
      Boolean(documentVariableSnapshot && Object.keys(documentVariableSnapshot).length > 0);
    if (hasReportSnapshot || isReportFrozenByApproval) {
      setFallbackVariableSnapshot(undefined);
      return;
    }

    const productId = template?.basic_info?.product_id;
    if (!productId) {
      setFallbackVariableSnapshot(undefined);
      return;
    }

    let cancelled = false;
    const loadFallbackSnapshot = async () => {
      try {
        const context = await variableService.getDocumentVariablesContextByProduct(productId);
        if (cancelled) return;
        const snapshot = buildDocumentVariableSnapshot(
          (context.variables || []).map((variable) => ({
            name: variable.name,
            value: variable.value,
          }))
        );
        setFallbackVariableSnapshot(snapshot);
      } catch (_error) {
        if (!cancelled) {
          setFallbackVariableSnapshot(undefined);
        }
      }
    };

    void loadFallbackSnapshot();
    return () => {
      cancelled = true;
    };
  }, [documentVariableSnapshot, isReportFrozenByApproval, template?.basic_info?.product_id]);

  useEffect(() => {
    const productId = templateForRendering?.basic_info?.product_id;
    let isCancelled = false;

    if (!productId) {
      setPreviewRecipes([]);
      return;
    }

    getRecipesByProduct(productId)
      .then((recipes) => {
        if (!isCancelled) {
          setPreviewRecipes(Array.isArray(recipes) ? (recipes as AnyRecord[]) : []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPreviewRecipes([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [templateForRendering?.basic_info?.product_id]);

  // Ensure report view route always opens a closable tab.
  useEffect(() => {
    if (!instanceId || !viewPath) return;

    const folderIdFromQuery =
      new URLSearchParams(location.search).get('folderId') ||
      new URLSearchParams(location.search).get('folder');

    const returnPath =
      instance?.folder_id
        ? `/forms&reports/${instance.folder_id}`
        : folderIdFromQuery
          ? `/forms&reports/${folderIdFromQuery}`
          : currentFolderId
            ? `/forms&reports/${currentFolderId}`
            : '/forms&reports';

    openTab('instance', instanceId, viewTabTitle, viewPath, returnPath);
  }, [
    currentFolderId,
    instance?.folder_id,
    instanceId,
    location.search,
    openTab,
    viewPath,
    viewTabTitle,
  ]);

  const handleBack = () => {
    navigate(-1);
  };

  const refreshInstanceAfterWorkflow = useCallback(async () => {
    if (!instanceId) return;

    try {
      const { instancesService } = await import('../services/supabaseService');
      const refreshedInstance = await instancesService.getInstance(instanceId);
      if (!refreshedInstance) return;

      setLoadedInstance(refreshedInstance);
      syncInstance(refreshedInstance);
    } catch (error) {
      console.error('[ReportViewerA4] Failed to refresh report instance after workflow action:', error);
    }
  }, [instanceId, syncInstance]);

  const reportStatus = String(instance?.status || '').toLowerCase();
  const hasEditPermission =
    isAdmin ||
    can('forms_reports', 'edit') ||
    can('forms_reports', 'update') ||
    can('reports', 'edit') ||
    can('reports', 'update');
  const hasReviewPermission =
    isAdmin ||
    can('forms_reports', 'approve') ||
    can('forms_reports', 'review') ||
    can('reports', 'approve') ||
    can('forms', 'approve');

  const canEditReport =
    Boolean(instanceId) &&
    hasEditPermission &&
    ['draft', 'in_progress', 'rejected'].includes(reportStatus);
  const canReviewReport =
    Boolean(instanceId) &&
    hasReviewPermission &&
    ['submitted', 'under_review'].includes(reportStatus);

  const navigateToEditReport = () => {
    if (!instanceId || !canEditReport) return;

    const editPath = `/reports/edit/${instanceId}`;
    const folderId =
      instance?.folder_id ||
      new URLSearchParams(location.search).get('folderId') ||
      new URLSearchParams(location.search).get('folder') ||
      currentFolderId;
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const returnPath =
      instance?.folder_id
        ? `/forms&reports/${instance.folder_id}`
        : folderId
          ? `/forms&reports/${folderId}`
          : '/forms&reports';

    // Keep tab metadata in sync before route navigation to avoid view/edit route ping-pong.
    openTab('instance', instanceId, `تعديل - ${templateForRendering?.name || 'تقرير'}`, editPath, returnPath);

    navigate(`${editPath}${query}`);
  };

  const ensureReportReadyForReviewAction = useCallback(async (): Promise<boolean> => {
    if (!instanceId) return false;

    if (reportStatus !== 'submitted') return true;

    const claimResult = await claimReport(instanceId);
    if (!claimResult.success) {
      addToast({
        type: 'error',
        title: 'تعذر بدء المراجعة',
        message: claimResult.error || 'لا يمكن اعتماد/رفض التقرير قبل استلامه للمراجعة',
      });
      return false;
    }

    await refreshInstanceAfterWorkflow();
    return true;
  }, [addToast, claimReport, instanceId, refreshInstanceAfterWorkflow, reportStatus]);

  const handleApproveReport = async () => {
    if (!instanceId || !canReviewReport || workflowLoading) return;
    if (!window.confirm('هل تريد اعتماد هذا التقرير؟')) return;

    const ready = await ensureReportReadyForReviewAction();
    if (!ready) return;

    const result = await approveReport(instanceId);
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'فشل اعتماد التقرير',
        message: result.error || 'حدث خطأ أثناء اعتماد التقرير',
      });
      return;
    }

    addToast({
      type: 'success',
      title: 'تم الاعتماد',
      message: 'تم اعتماد التقرير بنجاح',
    });
    await refreshInstanceAfterWorkflow();
  };

  const handleRejectReport = async () => {
    if (!instanceId || !canReviewReport || workflowLoading) return;

    const reason = window.prompt('أدخل سبب الرفض:');
    if (!reason || !reason.trim()) return;

    const ready = await ensureReportReadyForReviewAction();
    if (!ready) return;

    const result = await rejectReport(instanceId, reason.trim());
    if (!result.success) {
      addToast({
        type: 'error',
        title: 'فشل رفض التقرير',
        message: result.error || 'حدث خطأ أثناء رفض التقرير',
      });
      return;
    }

    addToast({
      type: 'warning',
      title: 'تم رفض التقرير',
      message: 'تم إرجاع التقرير للتعديل',
    });
    await refreshInstanceAfterWorkflow();
  };

  const sections = useMemo(() => normalizeSections(templateForRendering?.sections || {}), [templateForRendering?.sections]);
  const signatures = Array.isArray(templateForRendering?.signatures) ? templateForRendering.signatures : [];
  const signatureColumns = clamp(signatures.length || 1, 1, 4);
  const startTimeDisplay =
    (typeof formData?.inspection_start_time === 'string' && formData.inspection_start_time.trim()) ||
    (typeof formData?.start_time === 'string' && formData.start_time.trim()) ||
    (typeof formData?.inspectionStartTime === 'string' && formData.inspectionStartTime.trim()) ||
    '08:00';
  const statusStamp = getStatusStamp(instance?.status);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-slate-500">جاري تجهيز معاينة الطباعة...</div>
      </div>
    );
  }

  if (!templateForRendering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-3">لم يتم العثور على النموذج</p>
          <button
            type="button"
            onClick={handleBack}
            className="px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            عودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="a4-clean-shell mx-auto w-full max-w-[210mm] min-h-screen bg-white text-slate-900 print:max-w-none print:min-h-0 print:shadow-none"
      dir="rtl"
    >
      <div className="print:hidden flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-2 py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          رجوع
        </button>

        {!permissionsLoading && (canEditReport || canReviewReport) ? (
          <div className="flex items-center gap-1.5">
            {canEditReport && (
              <button
                type="button"
                onClick={navigateToEditReport}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                تعديل
              </button>
            )}
            {canReviewReport && (
              <>
                <button
                  type="button"
                  onClick={handleRejectReport}
                  disabled={workflowLoading}
                  className={cn(
                    'px-2.5 py-1.5 rounded border text-xs font-semibold',
                    workflowLoading
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-red-300 text-red-700 hover:bg-red-50'
                  )}
                >
                  رفض
                </button>
                <button
                  type="button"
                  onClick={handleApproveReport}
                  disabled={workflowLoading}
                  className={cn(
                    'px-2.5 py-1.5 rounded border text-xs font-semibold',
                    workflowLoading
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  )}
                >
                  اعتماد
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="a4-clean-root bg-white border border-slate-300 print:border-none">
        <div className="border-b-2 border-slate-800">
          <div className="grid grid-cols-3 gap-2 items-center px-3 py-2">
            <div className="text-[9px] leading-4 text-right">
              {templateForRendering?.document_control?.doc_code && (
                <div className="font-bold">
                  رمز الوثيقة: <span className="font-mono">{templateForRendering.document_control.doc_code}</span>
                </div>
              )}
              <div>
                الإصدار: <span className="font-mono">{templateForRendering?.document_control?.issue_no || '-'}</span>
              </div>
              <div>
                تاريخ الإصدار: <span className="font-mono">{templateForRendering?.document_control?.issue_date || '-'}</span>
              </div>
              <div>
                المراجعة: <span className="font-mono">{templateForRendering?.document_control?.review_no || '-'}</span>
              </div>
              <div>
                تاريخ المراجعة: <span className="font-mono">{templateForRendering?.document_control?.review_date || '-'}</span>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold leading-tight">{templateForRendering.name}</h1>
              <div
                className={cn(
                  'inline-flex mt-1 px-3 py-0.5 border rounded text-[10px] font-bold tracking-wide',
                  statusStamp.className
                )}
              >
                {statusStamp.text}
              </div>
            </div>

            <div className="text-center flex flex-col items-center gap-1">
              <div className="h-14 w-32 flex items-center justify-center">
                <img
                  src={logoUrl || '/Logo.png'}
                  alt="Company logo"
                  className="max-h-full max-w-full object-contain"
                  style={{ transform: `scale(${logoScale || 1})` }}
                />
              </div>
              <div className="text-[9px] font-semibold">{selectedCompany?.name || templateForRendering?.basic_info?.company_name || '-'}</div>
            </div>
          </div>
        </div>

        {instance && (
          <div className="px-3 py-2 border-b border-slate-300">
            <table className="a4-clean-table w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold w-1/6">التاريخ</td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">{toText(formData?.report_date)}</td>
                  <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold w-1/6">الوردية</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">{toText(formData?.shift)}</td>
                </tr>
                {templateForRendering.type !== 'data-collection' && (
                  <tr>
                    <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold">رقم الدفعة</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono font-semibold text-blue-700">
                      {toText(formData?.batch_number)}
                    </td>
                    <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold">وقت البدء</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">{toText(startTimeDisplay)}</td>
                  </tr>
                )}
                {templateForRendering.type === 'data-collection' && (
                  <tr>
                    <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold">وقت البدء</td>
                    <td colSpan={3} className="border border-slate-300 px-2 py-1 text-center font-mono">{toText(startTimeDisplay)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-3 py-3 space-y-3">
          {sections.map((section, sectionIndex) => (
            <div key={section.id || `section-${sectionIndex}`} className="space-y-2">
              <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold">
                {sectionIndex + 1}. {section.name}
              </div>

              {(section.tables || []).map((table, tableIndex) => {
                const tableData = getFormTableData(formData, section.id, table.id);
                const tableNotes = getFormTableNotes(formData, section.id, table.id);
                const tableType = String((table as any)?.type || '').toLowerCase().replace(/_/g, '-');

                return (
                  <div key={table.id || `table-${tableIndex}`} className="space-y-1 a4-table-block">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-blue-800">{table.name}</div>
                      {table.inspection_period ? (
                        <div className="text-[10px] text-slate-500">فترة الفحص: كل {table.inspection_period} دقيقة</div>
                      ) : null}
                    </div>

                    {tableType === 'parameters' ? (
                      <ParametersTable
                        table={table}
                        tableData={tableData}
                        formData={formData}
                        variableSnapshot={effectiveVariableSnapshot}
                      />
                    ) : tableType === 'sample' || tableType === 'samples' ? (
                      <SampleTable
                        table={table}
                        tableData={tableData}
                        formData={formData}
                        template={templateForRendering}
                        variableSnapshot={effectiveVariableSnapshot}
                      />
                    ) : tableType === 'recipe-traceability' ? (
                      <RecipeTraceabilityPreviewTable
                        table={table}
                        tableData={tableData}
                        previewRecipes={previewRecipes}
                      />
                    ) : (
                      <GenericTable
                        table={table}
                        tableData={tableData}
                        inspectionStartTime={formData?.inspection_start_time || '08:00'}
                        shiftDuration={Number(formData?.shift_duration || 8)}
                        variableSnapshot={effectiveVariableSnapshot}
                      />
                    )}

                    {tableNotes ? (
                      <div className="border border-blue-200 bg-blue-50 rounded px-2 py-1.5 text-[10px] leading-relaxed">
                        <span className="font-semibold text-blue-800">ملاحظات: </span>
                        <span className="text-blue-900 whitespace-pre-wrap">{tableNotes}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {Array.isArray(section.quality_criteria) && section.quality_criteria.length > 0 && (
                <QualityCriteriaBlock title="معايير الجودة (القسم)" items={section.quality_criteria} />
              )}
            </div>
          ))}

          {Array.isArray(templateForRendering.quality_criteria) && templateForRendering.quality_criteria.length > 0 && (
            <QualityCriteriaBlock title="معايير الجودة والقبول" items={templateForRendering.quality_criteria} />
          )}

          {signatures.length > 0 && (
            <div className="a4-force-new-page border border-slate-300 rounded-md overflow-hidden">
              <div className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold">التواقيع والاعتمادات</div>
              <div
                className="p-3 grid gap-3"
                style={{ gridTemplateColumns: `repeat(${signatureColumns}, minmax(0, 1fr))` }}
              >
                {signatures.map((signatureRole, signatureIndex) => {
                  const signatureData = instance?.signatures?.[signatureIndex];
                  return (
                    <div key={`signature-${signatureIndex}`} className="border border-slate-300 rounded p-2">
                      <div className="text-[11px] font-semibold text-center mb-2">
                        {signatureRole.role || `توقيع ${signatureIndex + 1}`}
                      </div>
                      <div className="h-16 border-b-2 border-slate-300 flex items-end justify-center mb-2">
                        {signatureData?.signature_data ? (
                          <img src={signatureData.signature_data} alt="signature" className="h-14 object-contain" />
                        ) : null}
                      </div>
                      <div className="text-[10px] leading-5">
                        <div>الاسم: {signatureData?.name || '_____________'}</div>
                        <div>التاريخ: {signatureData?.timestamp ? formatDate(signatureData.timestamp) : '___/___/______'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportViewerA4;
