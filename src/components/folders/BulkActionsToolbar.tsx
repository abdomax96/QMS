import React from 'react';
import {
    TrashIcon,
    TagIcon,
    XMarkIcon,
    CheckCircleIcon,
    ArchiveBoxIcon,
    DocumentDuplicateIcon,
    ScissorsIcon,
    ClipboardIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface ClipboardState {
    type: 'cut' | 'copy';
    items: string[];
    sourceFolder?: string | null;
}

interface BulkActionsToolbarProps {
    selectedCount: number;
    onDeselectAll: () => void;
    onDelete?: () => void;
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: () => void;
    onAddTag?: () => void;
    onArchive?: () => void;
    onChangeStatus?: (status: string) => void;
    clipboard?: ClipboardState | null;
    isFormsPage?: boolean;
    isReportsPage?: boolean;
    className?: string;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedCount,
    onDeselectAll,
    onDelete,
    onCopy,
    onCut,
    onPaste,
    onAddTag,
    onArchive,
    onChangeStatus,
    clipboard,
    isFormsPage = false,
    isReportsPage = false,
    className,
}) => {
    const hasClipboard = clipboard && clipboard.items.length > 0;
    const isCutOperation = clipboard?.type === 'cut';
    const isCopyOperation = clipboard?.type === 'copy';

    // Show toolbar if items are selected OR if clipboard has items
    if (selectedCount === 0 && !hasClipboard) return null;

    return (
        <div className={cn("fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50", className)}>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl border border-gray-700">
                {/* Selection Count */}
                {selectedCount > 0 && (
                    <>
                        <div className="flex items-center gap-2 pl-3 border-l border-gray-600">
                            <CheckCircleIcon className="w-5 h-5 text-primary-400" />
                            <span className="text-sm font-medium">
                                {selectedCount} عنصر محدد
                            </span>
                        </div>
                        <div className="h-6 w-px bg-gray-600" />
                    </>
                )}

                {/* Clipboard Indicator */}
                {hasClipboard && (
                    <>
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                            isCutOperation 
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" 
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        )}>
                            {isCutOperation ? (
                                <ScissorsIcon className="w-4 h-4" />
                            ) : (
                                <DocumentDuplicateIcon className="w-4 h-4" />
                            )}
                            <span>
                                {clipboard.items.length} {isCutOperation ? 'للنقل' : 'للنسخ'}
                            </span>
                        </div>
                        <div className="h-6 w-px bg-gray-600" />
                    </>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {/* Copy */}
                    {onCopy && (
                        <button
                            onClick={onCopy}
                            disabled={selectedCount === 0}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                selectedCount > 0 
                                    ? "hover:bg-blue-600 text-blue-400 hover:text-white" 
                                    : "text-gray-500 cursor-not-allowed"
                            )}
                            title="نسخ (Ctrl+C)"
                        >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">نسخ</span>
                        </button>
                    )}

                    {/* Cut */}
                    {onCut && (
                        <button
                            onClick={onCut}
                            disabled={selectedCount === 0}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                selectedCount > 0 
                                    ? "hover:bg-orange-600 text-orange-400 hover:text-white" 
                                    : "text-gray-500 cursor-not-allowed"
                            )}
                            title="قص (Ctrl+X)"
                        >
                            <ScissorsIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">قص</span>
                        </button>
                    )}

                    {/* Paste */}
                    {onPaste && (
                        <button
                            onClick={onPaste}
                            disabled={!hasClipboard}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                hasClipboard 
                                    ? "hover:bg-green-600 text-green-400 hover:text-white" 
                                    : "text-gray-500 cursor-not-allowed"
                            )}
                            title="لصق (Ctrl+V)"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">لصق</span>
                        </button>
                    )}

                    {/* Add Tag */}
                    {onAddTag && selectedCount > 0 && (
                        <button
                            onClick={onAddTag}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors"
                            title="إضافة علامة"
                        >
                            <TagIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">علامة</span>
                        </button>
                    )}

                    {/* Change Status */}
                    {onChangeStatus && selectedCount > 0 && (
                        <div className="relative group">
                            <button
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors"
                                title="تغيير الحالة"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">الحالة</span>
                            </button>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                                <div className="bg-gray-800 rounded-lg shadow-lg py-1 min-w-[120px]">
                                    <button
                                        onClick={() => onChangeStatus('approved')}
                                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-700 text-green-400"
                                    >
                                        معتمد
                                    </button>
                                    <button
                                        onClick={() => onChangeStatus('rejected')}
                                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-700 text-red-400"
                                    >
                                        مرفوض
                                    </button>
                                    <button
                                        onClick={() => onChangeStatus('draft')}
                                        className="w-full text-right px-3 py-2 text-sm hover:bg-gray-700 text-gray-400"
                                    >
                                        مسودة
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Archive */}
                    {onArchive && selectedCount > 0 && (
                        <button
                            onClick={onArchive}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded-lg transition-colors"
                            title="أرشفة"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">أرشفة</span>
                        </button>
                    )}

                    {/* Delete */}
                    {onDelete && selectedCount > 0 && (
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-600 rounded-lg transition-colors text-red-400 hover:text-white"
                            title="حذف (Del)"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">حذف</span>
                        </button>
                    )}
                </div>

                {/* Divider & Close */}
                {(selectedCount > 0 || hasClipboard) && (
                    <>
                        <div className="h-6 w-px bg-gray-600" />

                        {/* Clear Clipboard or Deselect */}
                        <button
                            onClick={onDeselectAll}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title={selectedCount > 0 ? "إلغاء التحديد" : "مسح الحافظة"}
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default BulkActionsToolbar;
