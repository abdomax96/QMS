import React, { useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface HrTablePagerProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalRows: number;
  fromRow: number;
  toRow: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const HrTablePager: React.FC<HrTablePagerProps> = ({
  page,
  pageCount,
  pageSize,
  totalRows,
  fromRow,
  toRow,
  onPageChange,
  onPageSizeChange,
}) => {
  const [pageInput, setPageInput] = React.useState(String(page));

  React.useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, start + 4);
    const normalizedStart = Math.max(1, end - 4);

    return Array.from(
      { length: end - normalizedStart + 1 },
      (_, index) => normalizedStart + index
    );
  }, [page, pageCount]);

  const commitPageInput = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(page));
      return;
    }

    const normalizedPage = Math.min(Math.max(1, Math.trunc(nextPage)), pageCount);
    onPageChange(normalizedPage);
    setPageInput(String(normalizedPage));
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {fromRow}-{toRow} من {totalRows}
        </span>
        <span>
          صفحة {page} من {pageCount}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>لكل صفحة</span>
          <select
            value={pageSize}
            onChange={(event) => {
              onPageSizeChange(Number(event.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>اذهب إلى</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitPageInput();
              }
            }}
            className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />
        </label>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="الصفحة السابقة"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition ${
                pageNumber === page
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="الصفحة التالية"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HrTablePager;
