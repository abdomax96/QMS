export type LabV2RunStatus = 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected';
export type LabV2EvaluationResult = 'pass' | 'fail' | 'warning' | 'na';

export interface LabV2TestRun {
  id: string;
  run_number: string;
  test_id: string;
  batch_id?: string | null;
  batch_number_snapshot?: string | null;
  shift_snapshot?: string | null;
  source_report_instance_id?: string | null;
  product_id?: string | null;
  device_id?: string | null;
  status: LabV2RunStatus;

  operator_id?: string | null;
  operator_name?: string | null;
  approver_id?: string | null;
  approver_name?: string | null;

  started_at?: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;

  evaluation_result?: LabV2EvaluationResult | null;
  failed_params?: string[] | null;
  results_count?: number;

  test_snapshot?: Record<string, any> | null;
  params_snapshot?: any[] | null;
  rules_snapshot?: any[] | null;
  steps_snapshot?: any[] | null;
  materials_plan_snapshot?: any[] | null;

  notes?: string | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;

  company_id: string;
  department_id?: string | null;

  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export interface LabV2RunLaunchContext {
  test_id: string;
  product_id?: string | null;
  batch_number?: string | null;
  shift?: string | null;
  device_id: string;
  notes?: string | null;
  source_report_instance_id?: string | null;
}

export interface LabV2RunValue {
  id: string;
  run_id: string;
  measurement_id: string;
  parameter_id: string;
  param_key: string;
  value?: string | null;
  numeric_value?: number | null;
  evaluation_result?: LabV2EvaluationResult | null;
  out_of_spec: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabV2RunMeasurement {
  id: string;
  run_id: string;
  measurement_no: number;
  measured_at: string;
  notes?: string | null;
  evaluation_result?: LabV2EvaluationResult | null;
  failed_params?: string[] | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
  values?: LabV2RunValue[];
}

export interface LabV2RunMaterial {
  id: string;
  run_id: string;
  chemical_receipt_id: string;
  quantity_used?: number | null;
  unit?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface LabV2RunMaterialSelection {
  id: string;
  run_id: string;
  plan_material_id?: string | null;
  step_snapshot_key: string;
  chemical_id: string;
  chemical_receipt_id: string;
  planned_quantity: number;
  unit?: string | null;
  selection_notes?: string | null;
  consumption_posted_at?: string | null;
  consumed_quantity?: number | null;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}
