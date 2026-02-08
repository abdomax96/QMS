import React from 'react';
import {
    FunnelIcon,
    XMarkIcon,
    CalendarIcon,
    TagIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

export interface FilterState {
    dateRange: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'custom';
    customDateFrom?: string;
    customDateTo?: string;
    status: string[];
    tags: string[];
}

export const DEFAULT_FILTER_STATE: FilterState = {
    dateRange: 'all',
    status: [],
    tags: [],
};

interface FilterPanelProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    availableTags?: string[];
    isFormsPage?: boolean;
}

const DATE_RANGES = [
    { value: 'all', label: 'الكل', labelEn: 'All' },
    { value: 'today', label: 'اليوم', labelEn: 'Today' },
    { value: 'yesterday', label: 'أمس', labelEn: 'Yesterday' },
    { value: 'week', label: 'آخر 7 أيام', labelEn: 'Last 7 days' },
    { value: 'month', label: 'آخر 30 يوم', labelEn: 'Last 30 days' },
    { value: 'quarter', label: 'آخر 3 أشهر', labelEn: 'Last 3 months' },
];

const STATUS_OPTIONS = [
    { value: 'draft', label: 'مسودة', color: 'gray' },
    { value: 'submitted', label: 'مُرسل', color: 'blue' },
    { value: 'approved', label: 'معتمد', color: 'green' },
    { value: 'rejected', label: 'مرفوض', color: 'red' },
    { value: 'archived', label: 'مؤرشف', color: 'purple' },
];

const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    onFilterChange,
    availableTags = [],
    isFormsPage = false,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const panelRef = React.useRef<HTMLDivElement>(null);

    // Count active filters
    const activeFilterCount =
        (filters.dateRange !== 'all' ? 1 : 0) +
        filters.status.length +
        filters.tags.length;

    // Close panel when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleStatus = (status: string) => {
        const newStatus = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        onFilterChange({ ...filters, status: newStatus });
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        onFilterChange({ ...filters, tags: newTags });
    };

    const clearAllFilters = () => {
        onFilterChange(DEFAULT_FILTER_STATE);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${activeFilterCount > 0
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
            >
                <FunnelIcon className="w-4 h-4" />
                <span>تصفية</span>
                {activeFilterCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary-600 text-white rounded-full">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            {/* Filter Panel Dropdown */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">تصفية النتائج</h3>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                                مسح الكل
                            </button>
                        )}
                    </div>

                    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                        {/* Date Range Filter */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <CalendarIcon className="w-4 h-4" />
                                الفترة الزمنية
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {DATE_RANGES.map(range => (
                                    <button
                                        key={range.value}
                                        onClick={() => onFilterChange({ ...filters, dateRange: range.value as any })}
                                        className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${filters.dateRange === range.value
                                                ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status Filter - Only for reports */}
                        {!isFormsPage && (
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    الحالة
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS.map(status => (
                                        <button
                                            key={status.value}
                                            onClick={() => toggleStatus(status.value)}
                                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filters.status.includes(status.value)
                                                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tags Filter */}
                        {availableTags.length > 0 && (
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <TagIcon className="w-4 h-4" />
                                    العلامات
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filters.tags.includes(tag)
                                                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 rounded-b-xl">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            تطبيق الفلاتر
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Active Filters Chips Component
export const ActiveFiltersChips: React.FC<{
    filters: FilterState;
    onRemoveFilter: (type: 'dateRange' | 'status' | 'tag', value?: string) => void;
}> = ({ filters, onRemoveFilter }) => {
    const chips: { label: string; type: 'dateRange' | 'status' | 'tag'; value?: string }[] = [];

    // Date range chip
    if (filters.dateRange !== 'all') {
        const dateLabel = DATE_RANGES.find(d => d.value === filters.dateRange)?.label || filters.dateRange;
        chips.push({ label: dateLabel, type: 'dateRange' });
    }

    // Status chips
    filters.status.forEach(status => {
        const statusLabel = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
        chips.push({ label: statusLabel, type: 'status', value: status });
    });

    // Tag chips
    filters.tags.forEach(tag => {
        chips.push({ label: tag, type: 'tag', value: tag });
    });

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">الفلاتر النشطة:</span>
            {chips.map((chip, index) => (
                <span
                    key={`${chip.type}-${chip.value || index}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                >
                    {chip.label}
                    <button
                        onClick={() => onRemoveFilter(chip.type, chip.value)}
                        className="hover:text-red-600 dark:hover:text-red-400"
                    >
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                </span>
            ))}
        </div>
    );
};

export default FilterPanel;
