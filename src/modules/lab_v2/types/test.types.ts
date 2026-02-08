export type LabV2TestScope = 'global' | 'company' | 'product';

export interface LabV2Test {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  category?: string | null;
  description?: string | null;
  method_description?: string | null;
  method_standard?: string | null;
  sop_document_id?: string | null;
  scope: LabV2TestScope;
  linked_company_id?: string | null;
  linked_product_id?: string | null;
  estimated_duration_minutes?: number | null;
  requires_approval: boolean;
  is_active: boolean;

  company_id: string;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export type LabV2ParameterDataType = 'text' | 'number' | 'date' | 'time' | 'dropdown' | 'multi_select';

export interface LabV2TestParameter {
  id: string;
  test_id: string;
  param_key: string;
  label: string;
  label_ar?: string | null;
  data_type: LabV2ParameterDataType;
  is_required: boolean;
  display_order: number;
  unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  allowed_values?: any[] | null;
  default_value?: string | null;
  help_text?: string | null;
  created_at: string;
}

export type LabV2RuleType = 'numeric_range' | 'allowed_values' | 'multi_select' | 'custom';

export interface LabV2AcceptanceRule {
  id: string;
  test_id: string;
  parameter_id?: string | null;
  rule_type: LabV2RuleType;
  spec_min?: number | null;
  spec_max?: number | null;
  spec_unit?: string | null;
  allowed_values?: any[] | null;
  custom_note?: string | null;
  priority: number;
  created_at: string;
  created_by?: string | null;
}

export interface LabV2TestDeviceLink {
  id: string;
  test_id: string;
  device_id: string;
  is_default: boolean;
  setup_notes?: string | null;
  calibration_targets?: Record<string, any> | null;
  device_specific_params?: Record<string, any> | null;
  created_at: string;
  created_by?: string | null;
}

