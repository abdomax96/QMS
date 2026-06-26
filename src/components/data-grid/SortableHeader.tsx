import React from 'react';
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import type { SortDirection } from '../../hooks/useSortableRows';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string;
  sortDirection: SortDirection;
  onToggle: (sortKey: string) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onToggle,
  className,
}) => {
  const isActive = sortKey === activeSortKey;

  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        'inline-flex w-full items-center justify-between gap-2 text-right transition hover:text-slate-900 dark:hover:text-slate-100',
        className
      )}
    >
      <span>{label}</span>
      {isActive ? (
        sortDirection === 'asc' ? (
          <ChevronUpIcon className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
        )
      ) : (
        <ChevronUpDownIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
      )}
    </button>
  );
};

export default SortableHeader;

