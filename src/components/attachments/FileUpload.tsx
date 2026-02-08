/**
 * File Upload Component
 * Drag & drop file upload with preview
 */

import React, { useCallback, useState } from 'react';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import {
    getAttachmentType,
    formatFileSize,
    AttachmentIcons,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE
} from '../../domain/attachments/types';
import type { AttachmentProgress } from '../../domain/attachments/types';

interface FileUploadProps {
    onUpload: (files: File[]) => Promise<void>;
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    maxFiles?: number;
    disabled?: boolean;
}

interface SelectedFile {
    file: File;
    id: string;
    preview?: string;
    progress: AttachmentProgress;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onUpload,
    maxFiles = 5,
    disabled = false
}) => {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateFile = (file: File): string | null => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return `نوع الملف غير مدعوم: ${ext}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return `الملف كبير جداً. الحد الأقصى ${formatFileSize(MAX_FILE_SIZE)}`;
        }
        return null;
    };

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        setError(null);

        const newFiles: SelectedFile[] = [];

        for (let i = 0; i < Math.min(files.length, maxFiles - selectedFiles.length); i++) {
            const file = files[i];
            const validationError = validateFile(file);

            if (validationError) {
                setError(validationError);
                continue;
            }

            const id = `file_${Date.now()}_${i}`;
            const preview = file.type.startsWith('image/')
                ? URL.createObjectURL(file)
                : undefined;

            newFiles.push({
                file,
                id,
                preview,
                progress: { id, progress: 0, status: 'uploading' }
            });
        }

        if (newFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    }, [maxFiles, selectedFiles.length]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const removeFile = (id: string) => {
        setSelectedFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        try {
            await onUpload(selectedFiles.map(f => f.file));
            // Clear files after successful upload
            selectedFiles.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
            setSelectedFiles([]);
        } catch (err) {
            setError('حدث خطأ أثناء رفع الملفات');
        }
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${isDragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={disabled || selectedFiles.length >= maxFiles}
                    className="hidden"
                />
                <label
                    htmlFor="file-upload"
                    className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                >
                    <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                        اسحب وأفلت الملفات هنا، أو{' '}
                        <span className="text-primary-600 dark:text-primary-400 font-medium">
                            اختر ملفات
                        </span>
                    </p>
                    <p className="text-sm text-gray-400">
                        الحد الأقصى {maxFiles} ملفات، {formatFileSize(MAX_FILE_SIZE)} لكل ملف
                    </p>
                </label>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <div className="space-y-2">
                    {selectedFiles.map((item) => {
                        const type = getAttachmentType(item.file.type);
                        const icon = AttachmentIcons[type];

                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                                {/* Preview or Icon */}
                                {item.preview ? (
                                    <img
                                        src={item.preview}
                                        alt={item.file.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">
                                        {icon}
                                    </div>
                                )}

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {item.file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(item.file.size)}
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeFile(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    })}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={disabled}
                        className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        رفع الملفات ({selectedFiles.length})
                    </button>
                </div>
            )}
        </div>
    );
};

// Attachment List Component
interface AttachmentListProps {
    attachments: Array<{
        id: string;
        name: string;
        type: string;
        size: number;
        url: string;
        thumbnailUrl?: string;
    }>;
    onDelete?: (id: string) => void;
    readonly?: boolean;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
    attachments,
    onDelete,
    readonly = false
}) => {
    if (attachments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <DocumentIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد مرفقات</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {attachments.map((attachment) => {
                const type = getAttachmentType(attachment.type) as keyof typeof AttachmentIcons;
                const icon = AttachmentIcons[type] || '📎';
                const isImage = type === 'image';

                return (
                    <div
                        key={attachment.id}
                        className="relative group bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                        {/* Preview */}
                        <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            {isImage && attachment.thumbnailUrl ? (
                                <img
                                    src={attachment.thumbnailUrl || attachment.url}
                                    alt={attachment.name}
                                    className="w-full h-24 object-cover rounded mb-2"
                                />
                            ) : (
                                <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center text-4xl">
                                    {icon}
                                </div>
                            )}
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {attachment.name}
                            </p>
                            <p className="text-xs text-gray-400">
                                {formatFileSize(attachment.size)}
                            </p>
                        </a>

                        {/* Delete button */}
                        {!readonly && onDelete && (
                            <button
                                onClick={() => onDelete(attachment.id)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default FileUpload;
