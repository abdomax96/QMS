export interface LabV2Chemical {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  supplier?: string | null;
  grade?: string | null;
  cas_number?: string | null;
  storage_conditions?: string | null;
  hazard_notes?: string | null;
  unit?: string | null;
  custom_fields?: Record<string, any> | null;
  is_active: boolean;

  company_id: string;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export type LabV2ChemicalReceiptStatus = 'available' | 'depleted' | 'expired' | 'disposed';
export type LabV2ChemicalReceiptType = 'raw_material' | 'reagent_for_test' | 'other';

export interface LabV2ChemicalReceipt {
  id: string;
  chemical_id: string;
  receipt_number: string;
  lot_number?: string | null;
  batch_number?: string | null;
  quantity: number;
  unit: string;
  received_date: string; // DATE
  expiry_date?: string | null; // DATE
  supplier_source?: string | null;
  type: LabV2ChemicalReceiptType;
  remaining_quantity?: number | null;
  status: LabV2ChemicalReceiptStatus;
  notes?: string | null;

  company_id: string;
  created_at: string;
  created_by?: string | null;
}

