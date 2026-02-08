import React from 'react';
import {
    LightBulbIcon,
    FolderIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    TrashIcon,
    TagIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface Suggestion {
    id: string;
    type: 'organize' | 'cleanup' | 'duplicate' | 'tag' | 'archive';
    title: string;
    description: string;
    affectedItems: number;
    action: () => void;
}

interface SmartSuggestionsPanelProps {
    suggestions: Suggestion[];
    isLoading?: boolean;
    onDismiss?: (id: string) => void;
    onRefresh?: () => void;
}

const suggestionIcons: Record<string, React.ReactNode> = {
    organize: <FolderIcon className="w-5 h-5 text-blue-500" />,
    cleanup: <TrashIcon className="w-5 h-5 text-red-500" />,
    duplicate: <DocumentTextIcon className="w-5 h-5 text-yellow-500" />,
    tag: <TagIcon className="w-5 h-5 text-purple-500" />,
    archive: <ArrowPathIcon className="w-5 h-5 text-gray-500" />,
};

const suggestionColors: Record<string, string> = {
    organize: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    cleanup: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    duplicate: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    tag: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
    archive: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
};

const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
    suggestions,
    isLoading = false,
    onDismiss,
    onRefresh,
}) => {
    if (suggestions.length === 0 && !isLoading) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        اقتراحات ذكية
                    </h3>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className={cn(
                            'p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors',
                            isLoading && 'animate-spin'
                        )}
                        disabled={isLoading}
                    >
                        <ArrowPathIcon className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse flex items-center gap-2">
                            <LightBulbIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">جاري التحليل...</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {suggestions.map((suggestion) => (
                            <div
                                key={suggestion.id}
                                className={cn(
                                    'relative p-4 rounded-lg border transition-all hover:shadow-md',
                                    suggestionColors[suggestion.type]
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {suggestionIcons[suggestion.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                            {suggestion.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {suggestion.description}
                                        </p>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-xs text-gray-400">
                                                {suggestion.affectedItems} عنصر
                                            </span>
                                            <button
                                                onClick={suggestion.action}
                                                className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                            >
                                                تطبيق
                                            </button>
                                            {onDismiss && (
                                                <button
                                                    onClick={() => onDismiss(suggestion.id)}
                                                    className="text-xs text-gray-400 hover:text-gray-600"
                                                >
                                                    تجاهل
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to generate suggestions based on content
export function generateSuggestions(
    templates: any[],
    instances: any[],
    folders: any[]
): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Check for items without folders
    const unfolderedTemplates = templates.filter(t => !t.folder_id);
    if (unfolderedTemplates.length > 3) {
        suggestions.push({
            id: 'organize-templates',
            type: 'organize',
            title: 'تنظيم النماذج',
            description: `لديك ${unfolderedTemplates.length} نماذج غير مُنظمة في مجلدات`,
            affectedItems: unfolderedTemplates.length,
            action: () => console.log('Organize templates'),
        });
    }

    // Check for old drafts
    const oldDrafts = instances.filter(i => {
        if (i.status !== 'draft') return false;
        const createdDate = new Date(i.created_at);
        const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 30;
    });
    if (oldDrafts.length > 0) {
        suggestions.push({
            id: 'cleanup-old-drafts',
            type: 'cleanup',
            title: 'مسودات قديمة',
            description: `لديك ${oldDrafts.length} مسودات أقدم من 30 يوم`,
            affectedItems: oldDrafts.length,
            action: () => console.log('Cleanup old drafts'),
        });
    }

    // Check for empty folders
    const emptyFolders = folders.filter(f => {
        const hasChildren = folders.some(cf => cf.parent_id === f.id);
        const hasTemplates = templates.some(t => t.folder_id === f.id);
        return !hasChildren && !hasTemplates;
    });
    if (emptyFolders.length > 2) {
        suggestions.push({
            id: 'archive-empty-folders',
            type: 'archive',
            title: 'مجلدات فارغة',
            description: `لديك ${emptyFolders.length} مجلدات فارغة يمكن أرشفتها`,
            affectedItems: emptyFolders.length,
            action: () => console.log('Archive empty folders'),
        });
    }

    return suggestions;
}

export default SmartSuggestionsPanel;
