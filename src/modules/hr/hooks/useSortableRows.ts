import { useMemo, useState } from 'react';

export type HrSortDirection = 'asc' | 'desc';

export type HrRowSorter<T> = (left: T, right: T) => number;

const collator = new Intl.Collator(['ar', 'en'], {
  numeric: true,
  sensitivity: 'base',
});

const isEmptyValue = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

const compareWithEmptyLast = <T>(
  left: T | null | undefined,
  right: T | null | undefined,
  comparator: (leftValue: T, rightValue: T) => number
) => {
  const leftEmpty = isEmptyValue(left);
  const rightEmpty = isEmptyValue(right);

  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  return comparator(left as T, right as T);
};

const normalizeNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  const time = new Date(String(value ?? '')).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const compareTextValues = (left: unknown, right: unknown) =>
  compareWithEmptyLast(left, right, (leftValue, rightValue) =>
    collator.compare(String(leftValue), String(rightValue))
  );

export const compareNumberValues = (left: unknown, right: unknown) =>
  compareWithEmptyLast(left, right, (leftValue, rightValue) =>
    normalizeNumber(leftValue) - normalizeNumber(rightValue)
  );

export const compareDateValues = (left: unknown, right: unknown) =>
  compareWithEmptyLast(left, right, (leftValue, rightValue) =>
    normalizeDate(leftValue) - normalizeDate(rightValue)
  );

export const compareBooleanValues = (left: unknown, right: unknown) =>
  Number(Boolean(left)) - Number(Boolean(right));

export const createTextSorter = <T>(selector: (row: T) => unknown): HrRowSorter<T> => (
  left,
  right
) => compareTextValues(selector(left), selector(right));

export const createNumberSorter = <T>(selector: (row: T) => unknown): HrRowSorter<T> => (
  left,
  right
) => compareNumberValues(selector(left), selector(right));

export const createDateSorter = <T>(selector: (row: T) => unknown): HrRowSorter<T> => (
  left,
  right
) => compareDateValues(selector(left), selector(right));

export const createBooleanSorter = <T>(selector: (row: T) => unknown): HrRowSorter<T> => (
  left,
  right
) => compareBooleanValues(selector(left), selector(right));

interface UseSortableRowsOptions<T> {
  rows: readonly T[];
  sorters: Record<string, HrRowSorter<T>>;
  initialSortKey: string;
  initialDirection?: HrSortDirection;
}

export const useSortableRows = <T>({
  rows,
  sorters,
  initialSortKey,
  initialDirection = 'asc',
}: UseSortableRowsOptions<T>) => {
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDirection, setSortDirection] = useState<HrSortDirection>(initialDirection);

  const sortedRows = useMemo(() => {
    const sorter = sorters[sortKey];
    if (!sorter) {
      return rows;
    }

    return [...rows].sort((left, right) =>
      sortDirection === 'asc' ? sorter(left, right) : sorter(right, left)
    );
  }, [rows, sortDirection, sortKey, sorters]);

  const toggleSort = (nextSortKey: string) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  return {
    sortedRows,
    sortKey,
    sortDirection,
    toggleSort,
  };
};
