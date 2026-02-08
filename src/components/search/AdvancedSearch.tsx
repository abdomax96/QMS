import React, { useState, useRef, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    ClockIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AdvancedSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onSearch?: (query: string) => void;
}

const MAX_HISTORY_ITEMS = 10;
const STORAGE_KEY = 'qms-search-history';

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
    value,
    onChange,
    placeholder = 'بحث...',
    onSearch,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load search history from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSearchHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load search history:', e);
        }
    }, []);

    // Save to history when searching
    const saveToHistory = (query: string) => {
        if (!query.trim()) return;

        const newHistory = [
            query,
            ...searchHistory.filter(h => h !== query)
        ].slice(0, MAX_HISTORY_ITEMS);

        setSearchHistory(newHistory);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        } catch (e) {
            console.error('Failed to save search history:', e);
        }
    };

    // Clear search history
    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && value.trim()) {
            saveToHistory(value);
            onSearch?.(value);
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleHistoryClick = (query: string) => {
        onChange(query);
        saveToHistory(query);
        onSearch?.(query);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-64 pl-9 pr-8 py-1.5 text-sm bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border border-transparent focus:bg-white dark:focus:bg-black/50 focus:border-win11-blue/50 focus:ring-0 rounded-md transition-all outline-none"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

                {value && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && searchHistory.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-win11 shadow-win11 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            عمليات البحث الأخيرة
                        </span>
                        <button
                            onClick={clearHistory}
                            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1"
                        >
                            <ArrowPathIcon className="w-3 h-3" />
                            مسح
                        </button>
                    </div>

                    {/* History Items */}
                    <div className="max-h-48 overflow-y-auto">
                        {searchHistory.map((query, index) => (
                            <button
                                key={index}
                                onClick={() => handleHistoryClick(query)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-right"
                            >
                                <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{query}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Search Tips - Show when focused and no value */}
            {isOpen && !value && searchHistory.length === 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-win11 shadow-win11 z-50 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        اكتب للبحث في النماذج والتقارير
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                            Enter للبحث
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                            Esc للإلغاء
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearch;
