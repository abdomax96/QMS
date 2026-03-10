import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/toastStore';
import { labTestsService } from '../../../services/labTestsService';
import type {
  LabV2AcceptanceRule,
  LabV2Test,
  LabV2TestDeviceLink,
  LabV2TestParameter,
  LabV2TestProductLink,
  LabV2TestStep,
  LabV2TestStepDevicePlan,
  LabV2TestStepMaterialPlan,
} from '../types/test.types';

export const useLabV2Tests = (filters?: { search?: string; activeOnly?: boolean; family?: string; product_id?: string }) => {
  return useQuery({
    queryKey: ['lab_v2', 'tests', filters],
    queryFn: () => labTestsService.listTests(filters),
  });
};

export const useLabV2TestDefinition = (testId: string | undefined) => {
  return useQuery({
    queryKey: ['lab_v2', 'test_definition', testId],
    queryFn: () => (testId ? labTestsService.getTestDefinitionById(testId) : Promise.resolve(null)),
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
      product_links?: Array<Partial<LabV2TestProductLink> & Pick<LabV2TestProductLink, 'product_id'>>;
      steps?: Array<
        Partial<LabV2TestStep> &
        Pick<LabV2TestStep, 'title'> & {
          step_device_plans?: Array<Partial<LabV2TestStepDevicePlan> & Pick<LabV2TestStepDevicePlan, 'device_id'>>;
          step_material_plans?: Array<Partial<LabV2TestStepMaterialPlan> & Pick<LabV2TestStepMaterialPlan, 'chemical_id' | 'planned_quantity'>>;
        }
      >;
    }) => labTestsService.saveTestDefinition(payload as any),
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
    mutationFn: (id: string) => labTestsService.deleteTest(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'tests'] });
      if (result?.mode === 'deactivated') {
        useToastStore.getState().success('لا يمكن حذف الفحص لوجود تشغيلات مرتبطة. تم تعطيله بدلاً من الحذف.');
      } else {
        useToastStore.getState().success('تم حذف تعريف الفحص');
      }
    },
    onError: (e: any) => useToastStore.getState().error('فشل حذف تعريف الفحص', e?.message),
  });
};
