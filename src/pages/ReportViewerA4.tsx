import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useStore from '../store';
import { useCompanyStore } from '../store/companyStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { useDateFormat, cn } from '../utils';
import { useTabsStore } from '../store/tabsStore';
import { calculateTare1, calculateTare2, getAQLLimits, validateColumn } from '../utils/tareCalculations';
import type { FormSection, QualityCriteria, Table, TableColumn, TableParameter } from '../types';

type AnyRecord = Record<string, any>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
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
}> = ({ table, tableData, formData }) => {
  const parameters = Array.isArray(table.parameters) ? table.parameters : [];

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
      tableData.map((row) => textLen(Array.isArray(row) ? row[columnIndex] : ''))
    ),
    1
  );

  const statsPerRow = parameters.map((_, rowIndex) => {
    const row = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex] : [];
    const numericValues = timeIndexes
      .map((columnIndex) => toFiniteNumber(row[columnIndex]))
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
      const value =
        parameter.min !== undefined && parameter.max !== undefined
          ? `${parameter.min} - ${parameter.max}`
          : parameter.limits || '-';
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
              .map((columnIndex) => toFiniteNumber(row[columnIndex]))
              .filter((value): value is number => value !== null);
            const stats = calcStats(numericValues);
            const limitsText =
              parameter.min !== undefined && parameter.max !== undefined
                ? `${parameter.min} - ${parameter.max}`
                : parameter.limits || '-';

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
                  const normalizedValue = resolveCellValue(rawValue, parameter);
                  const numericValue = toFiniteNumber(rawValue);
                  const hasNumericLimit =
                    parameter.min !== undefined &&
                    parameter.max !== undefined &&
                    numericValue !== null;
                  const outOfRange =
                    hasNumericLimit &&
                    (numericValue < Number(parameter.min) || numericValue > Number(parameter.max));

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
}> = ({ table, tableData, formData, template }) => {
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

  const standardWeight = toFiniteNumber(template?.basic_info?.standard_weight);
  const maxStd = toFiniteNumber(table.max_std);
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

  const getColumnNumericValues = (columnIndex: number): number[] => {
    if (isStoppedColumn(columnIndex)) return [];
    const numeric: number[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex][columnIndex] : undefined;
      const parsed = toFiniteNumber(value);
      if (parsed !== null) numeric.push(parsed);
    }
    return numeric;
  };

  const getColumnValidation = (columnIndex: number) => {
    if (isStoppedColumn(columnIndex) || tare1 === null || tare2 === null) return null;
    const weights: Array<number | undefined> = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const value = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex][columnIndex] : undefined;
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
      tableData.map((row) => textLen(Array.isArray(row) ? row[columnIndex] : ''))
    ),
    ...columnStats.map((stats) => textLen(formatMetric(stats.avg))),
    ...columnStats.map((stats) => textLen(formatMetric(stats.std, 3))),
    1
  );
  const labelMaxLen = Math.max(
    textLen('العينة #'),
    textLen(String(rowCount)),
    showAverageRow ? textLen(standardWeight !== null ? `AVG (>=${standardWeight})` : 'AVG') : 0,
    showStdRow ? textLen(maxStd !== null ? `STD (<=${maxStd})` : 'STD') : 0,
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
            const row = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex] : [];
            return (
              <tr key={`sample-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-1 py-1 text-center font-semibold text-slate-600">
                  {rowIndex + 1}
                </td>
                {timeIndexes.map((columnIndex) => {
                  const stopped = isStoppedColumn(columnIndex);
                  const value = row[columnIndex];
                  return (
                    <td
                      key={`sample-${rowIndex}-col-${columnIndex}`}
                      className={cn(
                        'border border-slate-300 px-1 py-1 text-center font-mono',
                        stopped && 'bg-orange-100 text-orange-700 font-semibold',
                        (value === undefined || value === null || value === '') && 'text-slate-300'
                      )}
                    >
                      {stopped ? 'STOP' : value !== undefined && value !== null && value !== '' ? value : '-'}
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
                {maxStd !== null ? `STD (<=${maxStd})` : 'STD'}
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

const GenericTable: React.FC<{
  table: Table;
  tableData: any[][];
}> = ({ table, tableData }) => {
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const showRowNumbers = table.show_row_numbers !== false;
  const fallbackRows = Number(table.rows || 0);
  const rowCount = Math.max(tableData.length, fallbackRows, 1);

  if (!columns.length) {
    return (
      <div className="border border-slate-300 rounded-md p-3 text-[11px] text-slate-600">
        لا توجد أعمدة معرفة لهذا الجدول.
      </div>
    );
  }

  return (
    <div className="border border-slate-300 rounded-md print:border-0 print:rounded-none print:overflow-visible">
      <table className="a4-clean-table w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {showRowNumbers && <col style={{ width: '6ch' }} />}
          {columns.map((column, index) => (
            <col key={`${column.key || column.label}-${index}`} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-800 text-white">
            {showRowNumbers && (
              <th className="border border-slate-300 px-1 py-1 text-center font-semibold">
                {table.row_header_label || '#'}
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={`${column.key || column.label}-${index}`}
                className={cn(
                  'border border-slate-300 px-2 py-1 font-semibold',
                  column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center'
                )}
              >
                {column.label || column.key || `عمود ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => {
            const row = Array.isArray(tableData[rowIndex]) ? tableData[rowIndex] : [];
            return (
              <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {showRowNumbers && (
                  <td className="border border-slate-300 px-1 py-1 text-center text-slate-500">{rowIndex + 1}</td>
                )}
                {columns.map((column, columnIndex) => (
                  <td
                    key={`${column.key || column.label}-${columnIndex}`}
                    className={cn(
                      'border border-slate-300 px-2 py-1',
                      column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center'
                    )}
                  >
                    {resolveCellValue(row[columnIndex], column)}
                  </td>
                ))}
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

  const [loadedInstance, setLoadedInstance] = useState<any>(null);
  const [loadedTemplate, setLoadedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const instance = loadedInstance || (instanceId ? formInstances[instanceId] : null);
  const storeTemplate = templateId
    ? formTemplates[templateId]
    : instance?.template_id
      ? formTemplates[instance.template_id]
      : null;
  const template = loadedTemplate || storeTemplate;
  const viewPath = instanceId ? `/reports/view/${instanceId}` : null;
  const viewTabTitle = useMemo(() => {
    if (template?.name) return `تقرير - ${template.name}`;
    return 'عرض تقرير';
  }, [template?.name]);

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
    const activeTab = getActiveTab();
    const tabReturnPath = activeTab?.path === location.pathname ? activeTab.returnPath : undefined;

    if (tabReturnPath) {
      if (tabReturnPath === '/folders') {
        navigate('/forms&reports');
        return;
      }
      if (tabReturnPath.startsWith('/folders/')) {
        navigate(tabReturnPath.replace('/folders/', '/forms&reports/'));
        return;
      }
      navigate(tabReturnPath);
      return;
    }

    if (instance?.folder_id) {
      navigate(`/forms&reports/${instance.folder_id}`);
      return;
    }

    if (currentFolderId) {
      navigate(`/forms&reports/${currentFolderId}`);
      return;
    }

    navigate('/forms&reports');
  };

  const sections = useMemo(() => normalizeSections(template?.sections || {}), [template?.sections]);
  const formData = instance?.form_data || {};
  const signatures = Array.isArray(template?.signatures) ? template.signatures : [];
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

  if (!template) {
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
      <div className="a4-clean-root bg-white border border-slate-300 print:border-none">
        <div className="border-b-2 border-slate-800">
          <div className="grid grid-cols-3 gap-2 items-center px-3 py-2">
            <div className="text-[9px] leading-4 text-right">
              {template?.document_control?.doc_code && (
                <div className="font-bold">
                  رمز الوثيقة: <span className="font-mono">{template.document_control.doc_code}</span>
                </div>
              )}
              <div>
                الإصدار: <span className="font-mono">{template?.document_control?.issue_no || '-'}</span>
              </div>
              <div>
                تاريخ الإصدار: <span className="font-mono">{template?.document_control?.issue_date || '-'}</span>
              </div>
              <div>
                المراجعة: <span className="font-mono">{template?.document_control?.review_no || '-'}</span>
              </div>
              <div>
                تاريخ المراجعة: <span className="font-mono">{template?.document_control?.review_date || '-'}</span>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold leading-tight">{template.name}</h1>
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
              <div className="text-[9px] font-semibold">{selectedCompany?.name || template?.basic_info?.company_name || '-'}</div>
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
                {template.type !== 'data-collection' && (
                  <tr>
                    <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold">رقم الدفعة</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono font-semibold text-blue-700">
                      {toText(formData?.batch_number)}
                    </td>
                    <td className="border border-slate-300 bg-slate-800 text-white px-2 py-1 text-center font-semibold">وقت البدء</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-mono">{toText(startTimeDisplay)}</td>
                  </tr>
                )}
                {template.type === 'data-collection' && (
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
                const tableType = String((table as any)?.type || '').toLowerCase();

                return (
                  <div key={table.id || `table-${tableIndex}`} className="space-y-1 a4-table-block">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-blue-800">{table.name}</div>
                      {table.inspection_period ? (
                        <div className="text-[10px] text-slate-500">فترة الفحص: كل {table.inspection_period} دقيقة</div>
                      ) : null}
                    </div>

                    {tableType === 'parameters' ? (
                      <ParametersTable table={table} tableData={tableData} formData={formData} />
                    ) : tableType === 'sample' || tableType === 'samples' ? (
                      <SampleTable table={table} tableData={tableData} formData={formData} template={template} />
                    ) : (
                      <GenericTable table={table} tableData={tableData} />
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

          {Array.isArray(template.quality_criteria) && template.quality_criteria.length > 0 && (
            <QualityCriteriaBlock title="معايير الجودة والقبول" items={template.quality_criteria} />
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
