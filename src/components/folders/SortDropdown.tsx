import React from 'react';
import {
    ArrowsUpDownIcon,
    ChevronDownIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

export type SortField = 'name' | 'created_at' | 'modified_at' | 'type' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
    field: SortField;
    direction: SortDirection;
    label: string;
    labelEn: string;
}

const SORT_OPTIONS: SortOption[] = [
    { field: 'name', direction: 'asc', label: 'الاسم (أ-ي)', labelEn: 'Name (A-Z)' },
    { field: 'name', direction: 'desc', label: 'الاسم (ي-أ)', labelEn: 'Name (Z-A)' },
    { field: 'created_at', direction: 'desc', label: 'الأحدث أولاً', labelEn: 'Newest First' },
    { field: 'created_at', direction: 'asc', label: 'الأقدم أولاً', labelEn: 'Oldest First' },
    { field: 'modified_at', direction: 'desc', label: 'آخر تعديل', labelEn: 'Last Modified' },
    { field: 'type', direction: 'asc', label: 'النوع', labelEn: 'Type' },
    { field: 'status', direction: 'asc', label: 'الحالة', labelEn: 'Status' },
];

interface SortDropdownProps {
    currentSort: { field: SortField; direction: SortDirection };
    onSortChange: (sort: { field: SortField; direction: SortDirection }) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ currentSort, onSortChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentOption = SORT_OPTIONS.find(
        opt => opt.field === currentSort.field && opt.direction === currentSort.direction
    ) || SORT_OPTIONS[2]; // Default to "Newest First"

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border border-transparent rounded-md transition-colors"
            >
                <ArrowsUpDownIcon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">{currentOption.label}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] py-1 overflow-hidden">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-black/5 dark:border-white/5">
                        ترتيب حسب
                    </div>
                    {SORT_OPTIONS.map((option, index) => {
                        const isSelected = option.field === currentSort.field && option.direction === currentSort.direction;
                        return (
                            <button
                                key={`${option.field}-${option.direction}-${index}`}
                                onClick={() => {
                                    onSortChange({ field: option.field, direction: option.direction });
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isSelected ? 'bg-win11-blue/10 text-win11-blue' : 'text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <CheckIcon className="w-4 h-4" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SortDropdown;
