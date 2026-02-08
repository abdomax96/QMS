/**
 * Document Control Types - أنواع نظام التحكم بالوثائق
 */

// Document Types
export type DocumentType = 'sop' | 'work_instruction' | 'manual' | 'form' | 'policy' | 'specification' | 'other';

// Document Status
export type DocumentStatus = 'draft' | 'pending_review' | 'approved' | 'obsolete' | 'archived';

// Version Status
export type VersionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

// Signature Type
export type SignatureType = 'author' | 'reviewer' | 'approver';

// Document
export interface Document {
    id: string;
    company_id: string;
    document_number: string;
    title: string;
    title_ar?: string;
    description?: string;
    type: DocumentType;
    category?: string;
    category_id?: string;
    department_id?: string;
    template_id?: string;
    current_version: number;
    status: DocumentStatus;
    owner_id?: string;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    obsolete_at?: string;
    // Joined data
    owner?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    department?: {
        id: string;
        name: string;
    };
    category_data?: DocumentCategory;
    latest_version?: DocumentVersion;
}

// Document Version
export interface DocumentVersion {
    id: string;
    document_id: string;
    company_id: string;
    version: number;
    content?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    changes_summary?: string;
    change_reason?: string;
    status: VersionStatus;
    created_by?: string;
    reviewed_by?: string;
    approved_by?: string;
    created_at: string;
    reviewed_at?: string;
    approved_at?: string;
    // Joined data
    creator?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
    reviewer?: {
        id: string;
        full_name: string;
    };
    approver?: {
        id: string;
        full_name: string;
    };
    signatures?: DocumentSignature[];
}

// Document Category
export interface DocumentCategory {
    id: string;
    company_id: string;
    name: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    description?: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Nested
    children?: DocumentCategory[];
    parent?: DocumentCategory;
}

// Document Template
export interface DocumentTemplate {
    id: string;
    company_id: string;
    name: string;
    name_ar?: string;
    type: DocumentType;
    content?: string;
    header_content?: string;
    footer_content?: string;
    page_margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    is_default: boolean;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

// Document Signature
export interface DocumentSignature {
    id: string;
    document_id: string;
    version_id: string;
    signer_id: string;
    signature_type: SignatureType;
    signature_data?: string;
    comments?: string;
    signed_at: string;
    ip_address?: string;
    // Joined
    signer?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        role?: string;
    };
}

// Document Access Log
export interface DocumentAccessLog {
    id: string;
    document_id: string;
    version_id?: string;
    user_id: string;
    action: 'view' | 'download' | 'print' | 'edit' | 'approve' | 'reject';
    ip_address?: string;
    user_agent?: string;
    accessed_at: string;
}

// Create Document Input
export interface CreateDocumentInput {
    document_number: string;
    title: string;
    title_ar?: string;
    description?: string;
    type: DocumentType;
    category_id?: string;
    department_id?: string;
    template_id?: string;
    content?: string;
}

// Update Document Input
export interface UpdateDocumentInput {
    title?: string;
    title_ar?: string;
    description?: string;
    category_id?: string;
    department_id?: string;
}

// Create Version Input
export interface CreateVersionInput {
    document_id: string;
    content?: string;
    file_path?: string;
    file_name?: string;
    changes_summary?: string;
    change_reason?: string;
}

// Document Filter
export interface DocumentFilter {
    type?: DocumentType;
    status?: DocumentStatus;
    department_id?: string;
    category_id?: string;
    search?: string;
    owner_id?: string;
}

// Document Type Labels (Arabic)
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    sop: 'إجراء تشغيل قياسي (SOP)',
    work_instruction: 'تعليمات العمل',
    manual: 'دليل',
    form: 'نموذج',
    policy: 'سياسة',
    specification: 'مواصفة',
    other: 'أخرى'
};

// Document Status Labels (Arabic)
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
    draft: 'مسودة',
    pending_review: 'قيد المراجعة',
    approved: 'معتمد',
    obsolete: 'ملغي',
    archived: 'مؤرشف'
};

// Document Status Colors
export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
    pending_review: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
    obsolete: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    archived: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400' }
};
