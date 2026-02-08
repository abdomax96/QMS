import type { StateCreator } from 'zustand';
import type { FormInstance } from '../../types';
import type { ReportSlice, StoreState } from '../types';
import supabaseService from '../../services/supabaseService';

export const createReportSlice: StateCreator<
    StoreState,
    any,
    [],
    ReportSlice
> = (set: any, get) => ({
    formInstances: {},
    currentInstanceId: null,

    addFormInstance: async (instance) => {
        try {
            await supabaseService.instances.saveInstance(instance);
            set((state) => {
                state.formInstances[instance.instance_id] = instance;
            });
        } catch (error) {
            console.error('Failed to add instance:', error);
            throw error;
        }
    },

    updateFormInstance: async (id, updates) => {
        try {
            await supabaseService.instances.updateInstance(id, updates);
            set((state) => {
                if (state.formInstances[id]) {
                    state.formInstances[id] = { ...state.formInstances[id], ...updates };
                }
            });
        } catch (error) {
            console.error('Failed to update instance:', error);
            throw error;
        }
    },

    deleteFormInstance: async (id) => {
        try {
            await supabaseService.instances.deleteInstance(id);
            set((state) => {
                delete state.formInstances[id];
            });
        } catch (error) {
            console.error('Failed to delete instance:', error);
            throw error;
        }
    },

    submitFormInstance: async (id) => {
        try {
            const currentInstance = get().formInstances[id];
            if (!currentInstance) return;

            const updates = {
                status: 'submitted' as const,
                submitted_at: new Date().toISOString(),
                submitted_by: get().user?.id || 'unknown'
            };

            await supabaseService.instances.updateInstance(id, updates);

            set((state) => {
                if (state.formInstances[id]) {
                    state.formInstances[id] = { ...state.formInstances[id], ...updates };
                }
            });
        } catch (error) {
            console.error('Failed to submit instance:', error);
            throw error;
        }
    },

    setCurrentInstance: (id) =>
        set((state) => {
            state.currentInstanceId = id;
        }),

    getInstancesInFolder: (folderId) => {
        const instances = get().formInstances;
        return Object.values(instances).filter((i) => i.folder_id === folderId);
    },
});
