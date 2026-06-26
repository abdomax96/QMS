import { useEffect, useMemo, useState } from 'react';

interface UsePaginatedRowsOptions<T> {
  rows: readonly T[];
  initialPageSize?: number;
}

export function usePaginatedRows<T>({ rows, initialPageSize = 10 }: UsePaginatedRowsOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(rows.length / Math.max(pageSize, 1))), [rows.length, pageSize]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const offset = (page - 1) * pageSize;

  const pagedRows = useMemo(() => rows.slice(offset, offset + pageSize), [rows, offset, pageSize]);

  const fromRow = rows.length === 0 ? 0 : offset + 1;
  const toRow = rows.length === 0 ? 0 : Math.min(offset + pageSize, rows.length);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pagedRows,
    totalRows: rows.length,
    offset,
    fromRow,
    toRow,
  };
}

export default usePaginatedRows;

