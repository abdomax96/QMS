/**
 * @deprecated This slice is NOT USED. The main store (src/store/index.ts)
 * defines its own template operations with database-first pattern.
 * Kept for reference only. DO NOT USE.
 */
import type { StateCreator } from 'zustand';
import type { FormTemplate } from '../../types';
import type { TemplateSlice, StoreState } from '../types';

export const createTemplateSlice: StateCreator<
    StoreState,
    any,
    [],
    TemplateSlice
> = (set: any, get) => ({
    formTemplates: {},
    currentTemplateId: null,

    addFormTemplate: (template) =>
        set((state) => {
            state.formTemplates[template.id] = template;
        }),

    updateFormTemplate: (id, updates) =>
        set((state) => {
            if (state.formTemplates[id]) {
                state.formTemplates[id] = { ...state.formTemplates[id], ...updates };
            }
        }),

    deleteFormTemplate: (id) =>
        set((state) => {
            delete state.formTemplates[id];
        }),

    duplicateFormTemplate: (id) =>
        set((state) => {
            const template = state.formTemplates[id];
            if (template) {
                // AUDIT FIX: Use proper UUID instead of non-standard ID format
                const newId = crypto.randomUUID();
                state.formTemplates[newId] = {
                    ...template,
                    id: newId,
                    name: `${template.name} (Copy)`,
                    created_at: new Date().toISOString(),
                };
            }
        }),

    setCurrentTemplate: (id) =>
        set((state) => {
            state.currentTemplateId = id;
        }),

    getTemplatesInFolder: (folderId) => {
        const templates = get().formTemplates;
        return Object.values(templates).filter((t) => t.folder_id === folderId);
    },
});
