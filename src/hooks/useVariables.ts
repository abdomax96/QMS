import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { variableService } from '../services/variableService';
import type { CreateVariableInput, UpdateVariableInput } from '../types/variables';
import { useToastStore } from '../store/toastStore';

export const useVariables = () => {
    return useQuery({
        queryKey: ['variables'],
        queryFn: variableService.getVariables,
    });
};

export const useCreateVariable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variable: CreateVariableInput) => variableService.createVariable(variable),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['variables'] });
            useToastStore.getState().success('Variable created successfully');
        },
        onError: (error: any) => {
            useToastStore.getState().error('Failed to create variable', error.message);
        },
    });
};

export const useUpdateVariable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: UpdateVariableInput }) =>
            variableService.updateVariable(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['variables'] });
            useToastStore.getState().success('Variable updated successfully');
        },
        onError: (error: any) => {
            useToastStore.getState().error('Failed to update variable', error.message);
        },
    });
};

export const useDeleteVariable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => variableService.deleteVariable(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['variables'] });
            useToastStore.getState().success('Variable deleted successfully');
        },
        onError: (error: any) => {
            useToastStore.getState().error('Failed to delete variable', error.message);
        },
    });
};
