/**
 * Attachment Types and DTOs
 */

export type AttachmentType = 'image' | 'document' | 'pdf' | 'video' | 'audio' | 'other';

export interface Attachment {
    id: string;
    name: string;
    originalName: string;
    type: AttachmentType;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    uploadedBy: string;
    uploadedAt: string;
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    description?: string;
}

export interface UploadAttachmentInput {
    file: File;
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    description?: string;
    uploadedBy: string;
}

export interface AttachmentProgress {
    id: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

// File type detection
export function getAttachmentType(mimeType: string): AttachmentType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('spreadsheet') ||
        mimeType.includes('word') || mimeType.includes('excel')) return 'document';
    return 'other';
}

// File size formatting
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// File icon based on type
export const AttachmentIcons: Record<AttachmentType, string> = {
    image: '🖼️',
    document: '📄',
    pdf: '📕',
    video: '🎬',
    audio: '🎵',
    other: '📎'
};

// Allowed file types
export const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',  // Images
    '.pdf',                                      // PDF
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Office
    '.txt', '.csv',                              // Text
    '.mp4', '.webm', '.mov',                     // Video
    '.mp3', '.wav'                               // Audio
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
