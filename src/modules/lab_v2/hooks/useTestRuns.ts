import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/toastStore';
import { labTestRunsService } from '../../../services/labTestsService';

export const useLabV2Runs = (filters?: {
  status?: string;
  test_id?: string;
  batch_id?: string;
  product_id?: string;
  device_id?: string;
  evaluation_result?: string;
  created_from?: string;
  created_to?: string;
  limit?: number;
  include_snapshots?: boolean;
}) => {
  return useQuery({
    queryKey: ['lab_v2', 'runs', filters],
    queryFn: () => labTestRunsService.listRuns(filters),
  });
};

export const useLabV2Run = (runId: string | undefined) => {
  return useQuery({
    queryKey: ['lab_v2', 'run', runId],
    queryFn: () => (runId ? labTestRunsService.getRunById(runId) : Promise.resolve(null)),
    enabled: Boolean(runId),
  });
};

export const useLabV2ReportContextForProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: ['lab_v2', 'run_report_context', productId],
    queryFn: () => (productId ? labTestRunsService.getReportBatchShiftContextForProduct(productId) : Promise.resolve({
      availableBatches: [],
      availableShiftsByBatch: {},
      latestReportIdByBatchShift: {},
    })),
    enabled: Boolean(productId),
  });
};

export const useCreateLabV2Run = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof labTestRunsService.createRun>[0]) => labTestRunsService.createRun(input),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
      qc.setQueryData(['lab_v2', 'run', run.id], run);
      useToastStore.getState().success('تم إنشاء الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إنشاء الفحص', e?.message),
  });
};

export const useSaveLabV2RunValues = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof labTestRunsService.saveRunValues>[0]) => labTestRunsService.saveRunValues(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'run', vars.run_id] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
      useToastStore.getState().success('تم حفظ النتائج');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حفظ النتائج', e?.message),
  });
};

export const useCompleteLabV2Run = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ run_id, notes }: { run_id: string; notes?: string | null }) => labTestRunsService.completeRun(run_id, notes),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'run', run.id] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
      useToastStore.getState().success('تم إكمال الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إكمال الفحص', e?.message),
  });
};

export const useApproveLabV2Run = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ run_id, notes }: { run_id: string; notes?: string | null }) => labTestRunsService.approveRun(run_id, notes),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'run', run.id] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
      useToastStore.getState().success('تم اعتماد الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل اعتماد الفحص', e?.message),
  });
};

export const useRejectLabV2Run = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ run_id, reason }: { run_id: string; reason: string }) => labTestRunsService.rejectRun(run_id, reason),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'run', run.id] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'runs'] });
      useToastStore.getState().success('تم رفض الفحص');
    },
    onError: (e: any) => useToastStore.getState().error('فشل رفض الفحص', e?.message),
  });
};

export const useAddLabV2RunMaterial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof labTestRunsService.addRunMaterial>[0]) => labTestRunsService.addRunMaterial(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'run', vars.run_id] });
      useToastStore.getState().success('تمت إضافة المواد المستخدمة');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إضافة المواد', e?.message),
  });
};
