import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/toastStore';
import { labV2TestService } from '../services/testService';
import type { LabV2AcceptanceRule, LabV2Test, LabV2TestDeviceLink, LabV2TestParameter } from '../types/test.types';

export const useLabV2Tests = (filters?: { search?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: ['lab_v2', 'tests', filters],
    queryFn: () => labV2TestService.listTests(filters),
  });
};

export const useLabV2TestDefinition = (testId: string | undefined) => {
  return useQuery({
    queryKey: ['lab_v2', 'test_definition', testId],
    queryFn: () => (testId ? labV2TestService.getTestDefinitionById(testId) : Promise.resolve(null)),
    enabled: Boolean(testId),
  });
};

export const useSaveLabV2TestDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      test: Partial<LabV2Test> & { id?: string };
      parameters: Array<Partial<LabV2TestParameter> & Pick<LabV2TestParameter, 'param_key' | 'label' | 'data_type'>>;
      rules: Array<Partial<LabV2AcceptanceRule>>;
      device_links: Array<Partial<LabV2TestDeviceLink> & Pick<LabV2TestDeviceLink, 'device_id'>>;
    }) => labV2TestService.saveTestDefinition(payload as any),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'tests'] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'test_definition', data.test.id] });
      useToastStore.getState().success('تم حفظ تعريف الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حفظ تعريف الفحص', e?.message),
  });
};

export const useDeleteLabV2Test = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labV2TestService.deleteTest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'tests'] });
      useToastStore.getState().success('تم حذف تعريف الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حذف تعريف الفحص', e?.message),
  });
};

