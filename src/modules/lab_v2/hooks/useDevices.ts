import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/toastStore';
import { labV2DeviceService } from '../services/deviceService';
import type { LabV2Device, LabV2DeviceCalibration } from '../types/device.types';

export const useLabV2Devices = (filters?: { search?: string; status?: string }) => {
  return useQuery({
    queryKey: ['lab_v2', 'devices', filters],
    queryFn: () => labV2DeviceService.listDevices(filters),
  });
};

export const useLabV2Device = (deviceId: string | undefined) => {
  return useQuery({
    queryKey: ['lab_v2', 'device', deviceId],
    queryFn: () => (deviceId ? labV2DeviceService.getDeviceById(deviceId) : Promise.resolve(null)),
    enabled: Boolean(deviceId),
  });
};

export const useCreateLabV2Device = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LabV2Device>) => labV2DeviceService.createDevice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'devices'] });
      useToastStore.getState().success('تمت إضافة الجهاز');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إضافة الجهاز', e?.message),
  });
};

export const useUpdateLabV2Device = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LabV2Device> }) => labV2DeviceService.updateDevice(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'devices'] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'device', vars.id] });
      useToastStore.getState().success('تم حفظ الجهاز');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حفظ الجهاز', e?.message),
  });
};

export const useDeleteLabV2Device = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labV2DeviceService.deleteDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'devices'] });
      useToastStore.getState().success('تم حذف الجهاز');
    },
    onError: (e: any) => useToastStore.getState().error('فشل حذف الجهاز', e?.message),
  });
};

export const useAddLabV2Calibration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<LabV2DeviceCalibration, 'id' | 'company_id' | 'created_at'> & { device_id: string }) =>
      labV2DeviceService.addCalibration(input as any),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lab_v2', 'device', vars.device_id] });
      qc.invalidateQueries({ queryKey: ['lab_v2', 'devices'] });
      useToastStore.getState().success('تمت إضافة المعايرة');
    },
    onError: (e: any) => useToastStore.getState().error('فشل إضافة المعايرة', e?.message),
  });
};

