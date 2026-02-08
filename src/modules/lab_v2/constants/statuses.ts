import type { LabV2DeviceStatus } from '../types/device.types';
import type { LabV2RunStatus, LabV2EvaluationResult } from '../types/run.types';
import type { LabV2ChemicalReceiptStatus } from '../types/chemical.types';

export const LAB_V2_DEVICE_STATUS_LABELS: Record<LabV2DeviceStatus, string> = {
  active: 'نشط',
  maintenance: 'صيانة',
  out_of_service: 'خارج الخدمة',
};

export const LAB_V2_RUN_STATUS_LABELS: Record<LabV2RunStatus, string> = {
  draft: 'مسودة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export const LAB_V2_EVALUATION_LABELS: Record<LabV2EvaluationResult, string> = {
  pass: 'مطابق',
  fail: 'غير مطابق',
  warning: 'تحذير',
  na: 'غير متاح',
};

export const LAB_V2_RECEIPT_STATUS_LABELS: Record<LabV2ChemicalReceiptStatus, string> = {
  available: 'متاح',
  depleted: 'منتهي',
  expired: 'منتهي الصلاحية',
  disposed: 'تم التخلص منه',
};

