import React from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AlertItem {
  id: string;
  label: string;
  href?: string;
}

interface AlertRowProps {
  title: string;
  items: AlertItem[];
  href?: string;
  onDismiss?: () => void;
}

export const AlertRow: React.FC<AlertRowProps> = ({ title, items, href, onDismiss }) => {
  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />
      <span className="text-sm font-medium text-red-700 dark:text-red-400 shrink-0">{title}:</span>
      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
        {items.slice(0, 5).map(item => (
          item.href ? (
            <Link
              key={item.id}
              to={item.href}
              className="text-xs bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-700/40 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.id}
              className="text-xs bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full"
            >
              {item.label}
            </span>
          )
        ))}
        {items.length > 5 && href && (
          <Link
            to={href}
            className="text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            +{items.length - 5} أخرى
          </Link>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0">
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
