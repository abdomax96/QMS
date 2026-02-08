import { supabase } from '../config/supabase';
import { type DocumentVariable, type CreateVariableInput, type UpdateVariableInput } from '../types/variables';

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
        return data as DocumentVariable;
    },

    async updateVariable(id: string, updates: UpdateVariableInput) {
        const { data, error } = await supabase
            .from('variables')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return data as DocumentVariable;
    },

    async deleteVariable(id: string) {
        const { error } = await supabase
            .from('variables')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
