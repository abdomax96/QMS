export type LabV2TestScope = 'global' | 'company' | 'product';
export type LabV2TestFamily =
  | 'ipc'
  | 'final_release'
  | 'environmental_monitoring'
  | 'utilities_water_air'
  | 'cip_cop_verification'
  | 'allergen_verification';

export const LAB_TEST_FAMILY_LABELS: Record<LabV2TestFamily, string> = {
  ipc: 'فحوصات أثناء التشغيل (IPC)',
  final_release: 'فحوصات الإفراج النهائي',
  environmental_monitoring: 'المراقبة البيئية الميكروبية',
  utilities_water_air: 'فحوصات المياه والخدمات',
  cip_cop_verification: 'التحقق من فعالية التنظيف والتطهير',
  allergen_verification: 'فحوصات مسببات الحساسية',
};

export const LAB_TEST_FAMILY_OPTIONS: Array<{ value: LabV2TestFamily; label: string }> = [
  { value: 'ipc', label: LAB_TEST_FAMILY_LABELS.ipc },
  { value: 'final_release', label: LAB_TEST_FAMILY_LABELS.final_release },
  { value: 'environmental_monitoring', label: LAB_TEST_FAMILY_LABELS.environmental_monitoring },
  { value: 'utilities_water_air', label: LAB_TEST_FAMILY_LABELS.utilities_water_air },
  { value: 'cip_cop_verification', label: LAB_TEST_FAMILY_LABELS.cip_cop_verification },
  { value: 'allergen_verification', label: LAB_TEST_FAMILY_LABELS.allergen_verification },
];

export interface LabV2Test {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  test_family: LabV2TestFamily;
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

export interface LabV2TestProductLink {
  id: string;
  test_id: string;
  product_id: string;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface LabV2TestStep {
  id: string;
  test_id: string;
  step_order: number;
  title: string;
  instructions?: string | null;
  expected_duration_min?: number | null;
  is_required: boolean;
  created_at: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  step_device_plans?: LabV2TestStepDevicePlan[];
  step_material_plans?: LabV2TestStepMaterialPlan[];
}

export interface LabV2TestStepDevicePlan {
  id: string;
  test_id: string;
  step_id: string;
  device_id: string;
  is_required: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface LabV2TestStepMaterialPlan {
  id: string;
  test_id: string;
  step_id: string;
  chemical_id: string;
  planned_quantity: number;
  unit?: string | null;
  is_required: boolean;
  selection_mode: 'lot_manual';
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}
