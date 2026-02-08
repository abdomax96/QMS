export type LabV2DeviceStatus = 'active' | 'maintenance' | 'out_of_service';

export interface LabV2Device {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  status: LabV2DeviceStatus;
  calibration_due_date?: string | null; // DATE
  calibration_interval_days?: number | null;
  custom_fields?: Record<string, any> | null;
  notes?: string | null;

  company_id: string;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export type LabV2CalibrationResult = 'pass' | 'fail' | 'conditional';

export interface LabV2DeviceCalibration {
  id: string;
  device_id: string;
  calibration_date: string; // DATE
  next_due_date: string; // DATE
  result: LabV2CalibrationResult;
  performed_by?: string | null;
  certificate_number?: string | null;
  notes?: string | null;
  attachment_ids?: string[] | null;

  company_id: string;
  created_at: string;
  created_by?: string | null;
}

