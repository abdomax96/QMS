import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SystemSettings } from '../../types/ncr';
import {
    addDefect,
    addDepartment,
    addUser,
    fetchSystemSettings,
    removeDefect,
    removeDepartment,
    removeUser,
    removeUsersWithoutAccounts,
    addProduct,
    removeProduct,
    addLine,
    removeLine,
    addUnit,
    removeUnit,
    updateSystemSettings
} from '../../services/ncr/settingsService';

const SETTINGS_QUERY_KEY = ['ncr-settings'];

export function useNcrSettings() {
    const queryClient = useQueryClient();
    const query = useQuery<SystemSettings>({
        queryKey: SETTINGS_QUERY_KEY,
        queryFn: fetchSystemSettings
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });

    const addDepartmentMutation = useMutation({
        mutationFn: addDepartment,
        onSuccess: invalidate
    });

    const removeDepartmentMutation = useMutation({
        mutationFn: removeDepartment,
        onSuccess: invalidate
    });

    const addUserMutation = useMutation({
        mutationFn: addUser,
        onSuccess: invalidate
    });

    const removeSettingsUsersWithoutAccountsMutation = useMutation({
        mutationFn: removeUsersWithoutAccounts,
        onSuccess: invalidate
    });

    const removeUserMutation = useMutation({
        mutationFn: removeUser,
        onSuccess: invalidate
    });

    const addDefectMutation = useMutation({
        mutationFn: addDefect,
        onSuccess: invalidate
    });

    const addProductMutation = useMutation({ mutationFn: addProduct, onSuccess: invalidate });
    const removeProductMutation = useMutation({ mutationFn: removeProduct, onSuccess: invalidate });

    const addLineMutation = useMutation({ mutationFn: addLine, onSuccess: invalidate });
    const removeLineMutation = useMutation({ mutationFn: removeLine, onSuccess: invalidate });
    const addUnitMutation = useMutation({ mutationFn: addUnit, onSuccess: invalidate });
    const removeUnitMutation = useMutation({ mutationFn: removeUnit, onSuccess: invalidate });

    const removeDefectMutation = useMutation({
        mutationFn: removeDefect,
        onSuccess: invalidate
    });

    const updateSettingsMutation = useMutation({
        mutationFn: updateSystemSettings,
        onSuccess: invalidate
    });

    return {
        settings: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        addDepartment: addDepartmentMutation.mutateAsync,
        removeDepartment: removeDepartmentMutation.mutateAsync,
        addUser: addUserMutation.mutateAsync,
        removeUser: removeUserMutation.mutateAsync,
        addDefect: addDefectMutation.mutateAsync,
        removeDefect: removeDefectMutation.mutateAsync,
        addProduct: addProductMutation.mutateAsync,
        removeProduct: removeProductMutation.mutateAsync,
        addLine: addLineMutation.mutateAsync,
        removeLine: removeLineMutation.mutateAsync,
        addUnit: addUnitMutation.mutateAsync,
        removeUnit: removeUnitMutation.mutateAsync,
        removeUsersWithoutAccounts: removeSettingsUsersWithoutAccountsMutation.mutateAsync,
        updateSettings: updateSettingsMutation.mutateAsync
    };
}

export default useNcrSettings;
