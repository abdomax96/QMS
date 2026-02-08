import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NcrRecord } from '../../types/ncr';
import { fetchNcrs, createNcr, updateNcr, deleteNcr } from '../../services/ncr/ncrService';
import { useCompanyStore } from '../../store/companyStore';

const NCRS_QUERY_KEY = ['ncrs'];

export function useNcrs(companyIdOverride?: string | null) {
    const queryClient = useQueryClient();
    const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId);
    const effectiveCompanyId = companyIdOverride ?? selectedCompanyId;

    const query = useQuery<NcrRecord[]>({
        queryKey: [...NCRS_QUERY_KEY, effectiveCompanyId ?? 'no-company'],
        queryFn: () => fetchNcrs(effectiveCompanyId),
        enabled: !!effectiveCompanyId
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: NCRS_QUERY_KEY });

    const createMutation = useMutation({
        mutationFn: async (payload: Parameters<typeof createNcr>[0]) => {
            if (!effectiveCompanyId) {
                throw new Error('يجب اختيار الشركة قبل إنشاء تقرير NCR');
            }

            return createNcr({
                ...payload,
                companyId: effectiveCompanyId
            });
        },
        onSuccess: invalidate
    });

    const updateMutation = useMutation({
        mutationFn: (payload: Parameters<typeof updateNcr>[0]) =>
            updateNcr({
                ...payload,
                companyId: payload.companyId ?? effectiveCompanyId ?? undefined
            }),
        onSuccess: invalidate
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteNcr(id, effectiveCompanyId),
        onSuccess: invalidate
    });

    return {
        ncrs: effectiveCompanyId ? (query.data ?? []) : [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        createNcr: createMutation.mutateAsync,
        updateNcr: updateMutation.mutateAsync,
        deleteNcr: deleteMutation.mutateAsync,
        selectedCompanyId: effectiveCompanyId ?? null,
        requiresCompanySelection: !effectiveCompanyId
    };
}

export default useNcrs;
