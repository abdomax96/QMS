import React, { useRef, useState } from 'react';
import {
    PhotoIcon,
    DocumentIcon,
    XMarkIcon,
    CloudArrowUpIcon,
    PaperClipIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import { InlineLoading } from './LoadingStates';

interface FileAttachment {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    preview?: string;
}

interface FileUploadProps {
    accept?: string;
    maxSize?: number; // in MB
    multiple?: boolean;
    value?: FileAttachment[];
    onChange: (files: FileAttachment[]) => void;
    label?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
    accept = 'image/*,.pdf,.doc,.docx',
    maxSize = 10,
    multiple = true,
    value = [],
    onChange,
    label = 'الملفات المرفقة'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        const newFiles: FileAttachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check file size
            if (file.size > maxSize * 1024 * 1024) {
                alert(`الملف "${file.name}" أكبر من الحد المسموح (${maxSize}MB)`);
                continue;
            }

            // Create file attachment object
            const fileAttachment: FileAttachment = {
                id: `${Date.now()}-${i}`,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file)
            };

            // Create preview for images
            if (file.type.startsWith('image/')) {
                fileAttachment.preview = fileAttachment.url;
            }

            newFiles.push(fileAttachment);
        }

        onChange([...value, ...newFiles]);
        setUploading(false);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleRemove = (id: string) => {
        onChange(value.filter(file => file.id !== id));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return PhotoIcon;
        return DocumentIcon;
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                    isDragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                )}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />

                <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    اسحب وأسقط الملفات هنا، أو انقر للاختيار
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                    الحد الأقصى: {maxSize}MB • الملفات المقبولة: {accept}
                </p>
            </div>

            {/* File List */}
            {value.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        الملفات المرفقة ({value.length})
                    </h4>
                    <div className="space-y-2">
                        {value.map((file) => {
                            const FileIcon = getFileIcon(file.type);
                            return (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    {/* Preview or Icon */}
                                    {file.preview ? (
                                        <img
                                            src={file.preview}
                                            alt={file.name}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                                            <FileIcon className="w-6 h-6 text-gray-500" />
                                        </div>
                                    )}

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <button
                                        onClick={() => handleRemove(file.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="حذف"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {uploading && (
                <div className="flex justify-center">
                    <InlineLoading text="جاري الرفع..." />
                </div>
            )}
        </div>
    );
};

export default FileUpload;
