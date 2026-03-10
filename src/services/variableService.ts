import { supabase } from '../config/supabase';
import { type DocumentVariable, type CreateVariableInput, type UpdateVariableInput } from '../types/variables';
import { buildDocumentVariableSnapshot } from '../utils/documentVariableBindings';

const MUTABLE_REPORT_STATUSES = ['draft', 'in_progress', 'submitted', 'under_review', 'rejected'] as const;

const syncPendingReportsVariableSnapshot = async (sourceDocumentId?: string | null): Promise<void> => {
    if (!sourceDocumentId) return;

    const { data: variables, error: variablesError } = await supabase
        .from('variables')
        .select('name, value')
        .eq('source_document_id', sourceDocumentId);

    if (variablesError) throw variablesError;

    const snapshot = buildDocumentVariableSnapshot(
        (variables || []).map((variable: any) => ({
            name: String(variable?.name || ''),
            value: variable?.value,
        }))
    );

    const { data: linkedReports, error: reportsError } = await supabase
        .from('form_instances')
        .select('id, form_data')
        .in('status', [...MUTABLE_REPORT_STATUSES])
        .or('archived.is.null,archived.eq.false')
        .filter('form_data->>document_variables_source_document_id', 'eq', sourceDocumentId);

    if (reportsError) throw reportsError;
    if (!linkedReports || linkedReports.length === 0) return;

    const snapshotAt = new Date().toISOString();
    const updateResults = await Promise.allSettled(
        linkedReports.map((report: any) => {
            const currentFormData =
                report?.form_data && typeof report.form_data === 'object'
                    ? report.form_data
                    : {};

            const nextFormData = {
                ...currentFormData,
                document_variables_snapshot: snapshot,
                document_variables_source_document_id: sourceDocumentId,
                document_variables_snapshot_at: snapshotAt,
            };

            return supabase
                .from('form_instances')
                .update({ form_data: nextFormData })
                .eq('id', report.id);
        })
    );

    const failedCount = updateResults.filter((result) => result.status === 'rejected').length;
    if (failedCount > 0) {
        console.warn(
            `[variableService] Snapshot sync partially failed for source document ${sourceDocumentId}: ${failedCount}/${linkedReports.length}`
        );
    }
};

export const variableService = {
    async getVariables() {
        const { data, error } = await supabase
            .from('variables')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as DocumentVariable[];
    },

    async getVariablesByDocument(documentId: string) {
        const { data, error } = await supabase
            .from('variables')
            .select('*')
            .eq('source_document_id', documentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DocumentVariable[];
    },

    async getDocumentVariablesContextByProduct(productId: string) {
        if (!productId) {
            return { sourceDocumentId: null as string | null, variables: [] as DocumentVariable[] };
        }

        const { data: productRow, error: productError } = await supabase
            .from('products')
            .select('sop_document_id')
            .eq('id', productId)
            .maybeSingle();

        if (productError) throw productError;

        const sourceDocumentId = productRow?.sop_document_id || null;
        if (!sourceDocumentId) {
            return { sourceDocumentId: null as string | null, variables: [] as DocumentVariable[] };
        }

        const variables = await this.getVariablesByDocument(sourceDocumentId);
        return { sourceDocumentId, variables };
    },

    async getVariablesByProduct(productId: string) {
        const { variables } = await this.getDocumentVariablesContextByProduct(productId);
        return variables;
    },

    async checkNameExists(name: string, sourceDocumentId?: string | null) {
        let query = supabase
            .from('variables')
            .select('id', { count: 'exact', head: true })
            .eq('name', name);

        if (sourceDocumentId) {
            query = query.eq('source_document_id', sourceDocumentId);
        } else {
            query = query.is('source_document_id', null);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count ? count > 0 : false;
    },

    async createVariable(variable: CreateVariableInput) {
        // Ensure company_id is present
        let finalCompanyId = variable.company_id;

        if (!finalCompanyId) {
            // Try to get from user session/RPC
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.id) {
                const { data: companyId } = await supabase.rpc('get_user_company_id');
                finalCompanyId = companyId;
            }

            // Fallback if still missing
            if (!finalCompanyId) {
                finalCompanyId = 'a0000001-0000-0000-0000-000000000001';
            }
        }

        const { data, error } = await supabase
            .from('variables')
            .insert({
                ...variable,
                company_id: finalCompanyId
            })
            .select('*')
            .single();

        if (error) throw error;

        try {
            await syncPendingReportsVariableSnapshot((data as any)?.source_document_id);
        } catch (syncError) {
            console.error('[variableService] Failed to sync linked draft/submitted reports after create:', syncError);
        }

        return data as DocumentVariable;
    },

    async updateVariable(id: string, updates: UpdateVariableInput) {
        const { data: beforeUpdate, error: beforeUpdateError } = await supabase
            .from('variables')
            .select('source_document_id')
            .eq('id', id)
            .maybeSingle();

        if (beforeUpdateError) throw beforeUpdateError;

        const { data, error } = await supabase
            .from('variables')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        const sourceDocumentIds = Array.from(
            new Set([
                (beforeUpdate as any)?.source_document_id || null,
                (data as any)?.source_document_id || null,
            ].filter(Boolean))
        ) as string[];

        for (const sourceDocumentId of sourceDocumentIds) {
            try {
                await syncPendingReportsVariableSnapshot(sourceDocumentId);
            } catch (syncError) {
                console.error(
                    `[variableService] Failed to sync linked draft/submitted reports after update (source_document_id=${sourceDocumentId}):`,
                    syncError
                );
            }
        }

        return data as DocumentVariable;
    },

    async deleteVariable(id: string) {
        const { data: existingVariable, error: existingVariableError } = await supabase
            .from('variables')
            .select('source_document_id')
            .eq('id', id)
            .maybeSingle();

        if (existingVariableError) throw existingVariableError;

        const { error } = await supabase
            .from('variables')
            .delete()
            .eq('id', id);

        if (error) throw error;

        try {
            await syncPendingReportsVariableSnapshot((existingVariable as any)?.source_document_id);
        } catch (syncError) {
            console.error('[variableService] Failed to sync linked draft/submitted reports after delete:', syncError);
        }
    },

    // Helper to resolve variables in content
    async resolveVariablesInContent(content: string, variables?: DocumentVariable[]): Promise<string> {
        if (!content) return '';

        // If variables not provided, fetch them
        let vars = variables;
        if (!vars) {
            const { data } = await supabase.from('variables').select('*');
            vars = data as DocumentVariable[] || [];
        }

        if (!vars.length) return content;

        let resolvedContent = content;
        vars.forEach(variable => {
            // Replace {Global:name} and {name} with value.
            // Escape special regex characters in variable name if any (though typically alphanumeric)
            const escapedName = variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // 1. Replace explicit Global format: {Global:Name}
            const globalRegex = new RegExp(`\\{Global:${escapedName}\\}`, 'gi');
            resolvedContent = resolvedContent.replace(globalRegex, String(variable.value));

            // 2. Replace generic format: {Name} (fallback)
            // Use word boundary check or specific structure to avoid partial matches if needed, 
            // but simple {Name} replacement is standard here.
            const simpleRegex = new RegExp(`\\{${escapedName}\\}`, 'gi');
            resolvedContent = resolvedContent.replace(simpleRegex, String(variable.value));
        });

        return resolvedContent;
    }
};
