/**
 * Document Service - خدمة إدارة الوثائق
 * Handles all CRUD operations for Document Control
 */

import { supabase } from '../config/supabase';

export interface Document {
    id: string;
    company_id: string;
    document_number: string;
    title: string;
    title_ar?: string;
    description?: string;
    type: 'sop' | 'work_instruction' | 'manual' | 'form' | 'policy' | 'specification' | 'other';
    category?: string;
    department_id?: string;
    department?: {
        id: string;
        name: string;
    };
    current_version: number;
    status: 'draft' | 'pending_review' | 'approved' | 'obsolete' | 'archived';
    owner_id?: string;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    obsolete_at?: string;
}

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
    status: 'draft' | 'pending_review' | 'approved' | 'rejected';
    created_by?: string;
    reviewed_by?: string;
    approved_by?: string;
    created_at: string;
    reviewed_at?: string;
    approved_at?: string;
}

export interface CreateDocumentInput {
    title: string;
    title_ar?: string;
    description?: string;
    type: Document['type'];
    category?: string;
    department_id?: string;
    company_id?: string;
    content?: string;
}

export interface UpdateDocumentInput extends Partial<CreateDocumentInput> {
    status?: Document['status'];
}

class DocumentService {
    /**
     * Generate unique document number
     */
    async generateDocumentNumber(type: Document['type'], companyId: string): Promise<string> {
        const prefixes: Record<Document['type'], string> = {
            sop: 'SOP',
            work_instruction: 'WI',
            manual: 'MAN',
            form: 'FRM',
            policy: 'POL',
            specification: 'SPEC',
            other: 'DOC'
        };

        const prefix = prefixes[type];
        const year = new Date().getFullYear();

        // Get the last document number for this type
        const { data, error } = await supabase
            .from('documents')
            .select('document_number')
            .eq('company_id', companyId)
            .ilike('document_number', `${prefix}-${year}-%`)
            .order('document_number', { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (!error && data && data.length > 0) {
            const lastNumber = data[0].document_number;
            const match = lastNumber.match(/-(\d+)$/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Get all documents with filters
     */
    async getDocuments(filters?: {
        type?: Document['type'];
        status?: Document['status'];
        department_id?: string;
        search?: string;
    }): Promise<Document[]> {
        let query = supabase
            .from('documents')
            .select(`
                *,
                department:departments(name)
            `)
            .order('updated_at', { ascending: false });

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.department_id) {
            query = query.eq('department_id', filters.department_id);
        }
        if (filters?.search) {
            query = query.or(`title.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Get single document by ID
     */
    async getDocument(id: string): Promise<Document | null> {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                department:departments(id, name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create new document
     */
    async createDocument(input: CreateDocumentInput): Promise<Document> {
        // Get user's company_id using RPC function
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) throw new Error('User not authenticated');

        let finalCompanyId: string = input.company_id || '';

        if (!finalCompanyId) {
            const { data: companyId, error: companyError } = await supabase.rpc('get_user_company_id');

            if (companyError || !companyId) {
                console.warn('Failed to get company from RPC, using fallback');
            }

            finalCompanyId = companyId || 'a0000001-0000-0000-0000-000000000001';
        }

        // Generate document number initially
        let documentNumber = await this.generateDocumentNumber(input.type, finalCompanyId);
        let retries = 0;
        const maxRetries = 5;

        while (retries < maxRetries) {
            try {
                // Create document
                const { data, error } = await supabase
                    .from('documents')
                    .insert({
                        company_id: finalCompanyId,
                        document_number: documentNumber,
                        title: input.title,
                        title_ar: input.title_ar,
                        description: input.description,
                        type: input.type,
                        category: input.category,
                        department_id: input.department_id,
                        owner_id: userData.user.id,
                        status: 'draft',
                        current_version: 1
                    })
                    .select()
                    .single();

                if (error) {
                    // Check for unique violation
                    if (error.code === '23505') {
                        console.warn(`Duplicate document number ${documentNumber}, incrementing and retrying...`);

                        // Parse and increment locally to bypass RLS visibility issues
                        const match = documentNumber.match(/^(.*)-(\d+)$/);
                        if (match) {
                            const prefix = match[1];
                            const currentNum = parseInt(match[2], 10);
                            const nextNum = currentNum + 1;
                            documentNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;

                            retries++;
                            // Add a small random delay to reduce race condition likelihood
                            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
                            continue;
                        }
                    }
                    throw error;
                }

                // Create initial version
                await this.createVersion(data.id, {
                    content: input.content,
                    changes_summary: 'الإصدار الأولي'
                });

                return data;

            } catch (err: any) {
                if (retries >= maxRetries) throw err;
                // If not a duplicate error (or handled above), throw immediately
                if (err?.code !== '23505') throw err;
            }
        }

        throw new Error(`Failed to generate unique document number after ${maxRetries} retries. Last attempted: ${documentNumber}`);
    }

    /**
     * Update document
     */
    async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document> {
        const { data, error } = await supabase
            .from('documents')
            .update({
                title: input.title,
                title_ar: input.title_ar,
                description: input.description,
                type: input.type,
                category: input.category,
                department_id: input.department_id,
                status: input.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete (archive) document
     */
    async deleteDocument(id: string): Promise<void> {
        const { error } = await supabase
            .from('documents')
            .update({
                status: 'archived',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Permanently delete document
     */
    async permanentlyDeleteDocument(id: string): Promise<void> {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // ============ Version Management ============

    /**
     * Get all versions for a document
     */
    async getVersions(documentId: string): Promise<DocumentVersion[]> {
        const { data, error } = await supabase
            .from('document_versions')
            .select('*')
            .eq('document_id', documentId)
            .order('version', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Create new version
     */
    async createVersion(documentId: string, input: {
        content?: string;
        file_path?: string;
        file_name?: string;
        changes_summary?: string;
        change_reason?: string;
    }): Promise<DocumentVersion> {
        // Use the database function
        const { data, error } = await supabase.rpc('create_document_version', {
            p_document_id: documentId,
            p_content: input.content || null,
            p_file_path: input.file_path || null,
            p_file_name: input.file_name || null,
            p_changes_summary: input.changes_summary || null,
            p_change_reason: input.change_reason || null
        });

        if (error) throw error;

        // Fetch the created version
        const { data: version, error: fetchError } = await supabase
            .from('document_versions')
            .select('*')
            .eq('id', data)
            .single();

        if (fetchError) throw fetchError;
        return version;
    }

    /**
     * Create completely new version from existing document
     * Wrapper that handles carrying over content and updating document status
     */
    async createNewVersion(documentId: string, changesSummary?: string): Promise<DocumentVersion> {
        // 1. Get latest version to copy content
        const versions = await this.getVersions(documentId);
        const latestVersion = versions[0];

        if (!latestVersion) {
            throw new Error('No existing version found to copy from');
        }

        // 2. Create new version with copied content
        const newVersion = await this.createVersion(documentId, {
            content: latestVersion.content,
            changes_summary: changesSummary
        });

        // 3. Update document status to draft (so it's editable)
        await this.updateDocument(documentId, {
            status: 'draft'
        });

        return newVersion;
    }

    /**
     * Update version content (for drafts)
     */
    async updateVersion(versionId: string, input: {
        content?: string;
        file_path?: string;
        file_name?: string;
        changes_summary?: string;
    }): Promise<DocumentVersion> {
        const { data, error } = await supabase
            .from('document_versions')
            .update({
                content: input.content,
                file_path: input.file_path,
                file_name: input.file_name,
                changes_summary: input.changes_summary,
                updated_at: new Date().toISOString()
            })
            .eq('id', versionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ============ Workflow Actions ============

    /**
     * Submit document for review
     */
    async submitForReview(id: string): Promise<Document> {
        // Update document status
        const doc = await this.updateDocument(id, { status: 'pending_review' });

        // Also update the latest version status
        const versions = await this.getVersions(id);
        if (versions.length > 0) {
            await supabase
                .from('document_versions')
                .update({ status: 'pending_review' })
                .eq('id', versions[0].id);
        }

        return doc;
    }

    /**
     * Approve document
     */
    async approveDocument(id: string): Promise<Document> {
        const { data, error } = await supabase
            .from('documents')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Also approve the latest version
        const versions = await this.getVersions(id);
        if (versions.length > 0) {
            await supabase
                .from('document_versions')
                .update({
                    status: 'approved',
                    approved_by: (await supabase.auth.getUser()).data.user?.id,
                    approved_at: new Date().toISOString()
                })
                .eq('id', versions[0].id);
        }

        return data;
    }

    /**
     * Reject document (return to draft with reason)
     */
    async rejectDocument(id: string, reason?: string): Promise<Document> {
        // Update document status back to draft
        const { data, error } = await supabase
            .from('documents')
            .update({
                status: 'draft',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update the latest version to rejected
        const versions = await this.getVersions(id);
        if (versions.length > 0) {
            await supabase
                .from('document_versions')
                .update({
                    status: 'rejected',
                    reviewed_by: (await supabase.auth.getUser()).data.user?.id,
                    reviewed_at: new Date().toISOString(),
                    change_reason: reason || 'تم رفض الوثيقة'
                })
                .eq('id', versions[0].id);
        }

        // Log the rejection
        await this.logAccess(id, 'reject', versions[0]?.id);

        return data;
    }

    /**
     * Mark document as obsolete
     */
    async markObsolete(id: string): Promise<Document> {
        const { data, error } = await supabase
            .from('documents')
            .update({
                status: 'obsolete',
                obsolete_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ============ Access Logging ============

    /**
     * Log document access
     */
    async logAccess(documentId: string, action: 'view' | 'download' | 'print' | 'edit' | 'approve' | 'reject', versionId?: string): Promise<void> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return;

        await supabase
            .from('document_access_log')
            .insert({
                document_id: documentId,
                version_id: versionId || null,
                user_id: userData.user.id,
                action
            });
    }
    /**
     * Get user's departments
     */
    async getUserDepartments(): Promise<string[]> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return [];

        const { data } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', userData.user.id)
            .eq('is_active', true);

        return data?.map(d => d.department_id) || [];
    }
}

export const documentService = new DocumentService();
export default documentService;
