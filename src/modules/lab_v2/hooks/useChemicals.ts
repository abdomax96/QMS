import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/toastStore';
import { labV2ChemicalService } from '../services/chemicalService';
import type { LabV2Chemical, LabV2ChemicalReceipt } from '../types/chemical.types';

export const useLabV2Chemicals = (filters?: { search?: string; activeOnly?: boolean }) => {
  return useQuery({
    queryKey: ['lab_v2', 'chemicals', filters],
    queryFn: () => labV2ChemicalService.listChemicals(filters),
  });
};

export const useCreateLabV2Chemical = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LabV2Chemical>) => labV2ChemicalService.createChemical(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'chemicals'] });
      useToastStore.getState().success('تمت إضافة المادة');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إضافة المادة', e?.message),
  });
};

export const useUpdateLabV2Chemical = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LabV2Chemical> }) => labV2ChemicalService.updateChemical(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'chemicals'] });
      useToastStore.getState().success('تم حفظ المادة');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حفظ المادة', e?.message),
  });
};

export const useDeleteLabV2Chemical = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labV2ChemicalService.deleteChemical(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'chemicals'] });
      useToastStore.getState().success('تم حذف المادة');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حذف المادة', e?.message),
  });
};

export const useLabV2Receipts = (chemical_id?: string) => {
  return useQuery({
    queryKey: ['lab_v2', 'chemical_receipts', chemical_id],
    queryFn: () => labV2ChemicalService.listReceipts(chemical_id),
  });
};

export const useCreateLabV2Receipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LabV2ChemicalReceipt> & { chemical_id: string }) => labV2ChemicalService.createReceipt(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'chemical_receipts', vars.chemical_id] });
      useToastStore.getState().success('تمت إضافة الاستلام');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إضافة الاستلام', e?.message),
  });
};

